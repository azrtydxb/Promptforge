# Kubernetes Deployment for Promptforge

Complete production-ready Kubernetes manifests for deploying Promptforge with SSL/TLS support.

## 📂 Directory Structure

```
k8s/
├── base/                          # Production manifests (NEW - use these!)
│   ├── 00-namespace.yaml          # Namespace definition
│   ├── 01-clusterissuer.yaml      # Let's Encrypt ClusterIssuer
│   ├── 03-deployment.yaml         # Application deployment with HA
│   ├── 04-service.yaml            # Internal service
│   └── 05-ingress.yaml            # External ingress with SSL
├── secrets-templates/             # Secret templates (DO NOT COMMIT ACTUAL SECRETS)
│   └── 02-secrets.template.yaml   # Secret template with instructions
├── QUICK_START.md                 # 5-minute deployment guide
└── README.md                      # This file (comprehensive guide)
```

**Legacy files** (deployment.yaml, service.yaml, ingress.yaml, etc.) are kept for reference but **use the `base/` directory** for new deployments.

## 🚀 Quick Links

- **New to Kubernetes?** → See [QUICK_START.md](./QUICK_START.md) for 5-minute deployment
- **Detailed deployment** → Continue reading below
- **Troubleshooting** → Jump to [Troubleshooting Section](#troubleshooting)

## Prerequisites

Before deploying, ensure you have:

1. **Kubernetes cluster** (1.23+) with kubectl access
2. **NGINX Ingress Controller** installed
3. **cert-manager** installed for automatic SSL certificates
4. **Docker registry access** to DigitalOcean Container Registry
5. **Domain DNS** configured for promptforge.directory

### Install Prerequisites

```bash
# Install NGINX Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.0/deploy/static/provider/cloud/deploy.yaml

# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

# Verify cert-manager is running
kubectl get pods -n cert-manager
```

## Deployment Steps

### Step 1: Create Secrets

1. Copy the secret template:
```bash
cd k8s
cp secrets-templates/02-secrets.template.yaml base/02-secrets.yaml
```

2. Generate required secrets:
```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Encode secrets to base64
echo -n "your-secret-value" | base64
```

3. Edit `base/02-secrets.yaml` and replace all `<PLACEHOLDER>` values with base64-encoded secrets:
   - `DATABASE_URL`: PostgreSQL connection string
   - `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
   - `NEXTAUTH_SECRET`: Generated secret from above
   - `NEXTAUTH_URL`: https://promptforge.directory

4. **IMPORTANT**: Add to `.gitignore`:
```bash
echo "k8s/base/02-secrets.yaml" >> ../.gitignore
```

### Step 2: Update Configuration

1. Edit `base/01-clusterissuer.yaml`:
   - Replace `admin@promptforge.directory` with your actual email

2. Review and adjust resource limits in `base/03-deployment.yaml`:
   - Memory requests/limits
   - CPU requests/limits
   - Replica count (default: 3)

### Step 3: Deploy to Kubernetes

Deploy in order (respects dependencies):

```bash
# Create namespace
kubectl apply -f base/00-namespace.yaml

# Create ClusterIssuer for SSL certificates
kubectl apply -f base/01-clusterissuer.yaml

# Create secrets
kubectl apply -f base/02-secrets.yaml

# Create deployment
kubectl apply -f base/03-deployment.yaml

# Create service
kubectl apply -f base/04-service.yaml

# Create ingress (triggers SSL certificate provisioning)
kubectl apply -f base/05-ingress.yaml
```

Or deploy all at once:
```bash
kubectl apply -f base/
```

### Step 4: Verify Deployment

```bash
# Check namespace
kubectl get ns promptforge

# Check all resources
kubectl get all -n promptforge

# Check pods are running
kubectl get pods -n promptforge

# Check services
kubectl get svc -n promptforge

# Check ingress
kubectl get ingress -n promptforge

# Check SSL certificate status
kubectl get certificate -n promptforge
kubectl describe certificate promptforge-tls-cert -n promptforge

# View logs
kubectl logs -f deployment/promptforge -n promptforge
```

### Step 5: DNS Configuration

Point your domain to the ingress controller's external IP:

```bash
# Get ingress external IP
kubectl get svc -n ingress-nginx ingress-nginx-controller

# Add DNS A records:
# promptforge.directory     → <EXTERNAL_IP>
# www.promptforge.directory → <EXTERNAL_IP>
```

### Step 6: Verify SSL Certificate

SSL certificates are automatically provisioned by cert-manager. This may take 2-5 minutes.

```bash
# Watch certificate status
kubectl get certificate -n promptforge -w

# Check certificate details
kubectl describe certificate promptforge-tls-cert -n promptforge

# Verify in browser
# Visit https://promptforge.directory (should show valid SSL)
```

## Configuration Details

### High Availability

- **Replicas**: 3 pods for redundancy
- **Anti-affinity**: Spreads pods across different nodes
- **Rolling updates**: Zero-downtime deployments
- **Health checks**: Liveness, readiness, and startup probes

### Resource Allocation

Default per pod:
- **Memory**: 512Mi request, 1Gi limit
- **CPU**: 250m (0.25 cores) request, 1000m (1 core) limit

Adjust based on your traffic:
```bash
# For higher traffic, scale replicas
kubectl scale deployment promptforge -n promptforge --replicas=5

# For higher resource needs, edit deployment
kubectl edit deployment promptforge -n promptforge
```

### SSL/TLS

- **Provider**: Let's Encrypt (free, auto-renewing)
- **Domains**: promptforge.directory, www.promptforge.directory
- **Renewal**: Automatic via cert-manager (every 60 days)
- **Redirect**: HTTP → HTTPS enforced

### Security Features

- **SSL redirect**: All HTTP traffic redirected to HTTPS
- **Security headers**: X-Frame-Options, X-Content-Type-Options, etc.
- **Rate limiting**: 100 requests/second per IP
- **Body size limit**: 10MB max upload
- **Secret management**: Environment variables from Kubernetes secrets

## Maintenance

### Update Application

```bash
# Update image tag in deployment
kubectl set image deployment/promptforge promptforge=registry.digitalocean.com/azrty/promptforge:v2.0.0 -n promptforge

# Or edit deployment
kubectl edit deployment promptforge -n promptforge

# Check rollout status
kubectl rollout status deployment/promptforge -n promptforge

# Rollback if needed
kubectl rollout undo deployment/promptforge -n promptforge
```

### View Logs

```bash
# All pods
kubectl logs -f -l app=promptforge -n promptforge

# Specific pod
kubectl logs -f <pod-name> -n promptforge

# Previous pod instance (if crashed)
kubectl logs <pod-name> -n promptforge --previous
```

### Scale Application

```bash
# Scale up
kubectl scale deployment promptforge -n promptforge --replicas=5

# Scale down
kubectl scale deployment promptforge -n promptforge --replicas=2

# Auto-scaling (HPA)
kubectl autoscale deployment promptforge -n promptforge --cpu-percent=70 --min=3 --max=10
```

### Update Secrets

```bash
# Edit secrets
kubectl edit secret promptforge-secrets -n promptforge

# Or delete and recreate
kubectl delete secret promptforge-secrets -n promptforge
kubectl apply -f base/02-secrets.yaml

# Restart pods to pick up new secrets
kubectl rollout restart deployment/promptforge -n promptforge
```

### Monitor Certificate Renewal

```bash
# Check certificate expiry
kubectl get certificate promptforge-tls-cert -n promptforge -o yaml

# Force renewal (if needed)
kubectl delete certificate promptforge-tls-cert -n promptforge
kubectl apply -f base/05-ingress.yaml
```

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n promptforge

# Describe pod for events
kubectl describe pod <pod-name> -n promptforge

# Check logs
kubectl logs <pod-name> -n promptforge

# Common issues:
# - Image pull errors: Check registry credentials
# - CrashLoopBackOff: Check application logs
# - Pending: Check resource availability
```

### SSL Certificate Issues

```bash
# Check certificate status
kubectl get certificate -n promptforge
kubectl describe certificate promptforge-tls-cert -n promptforge

# Check cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager

# Check challenges
kubectl get challenges -n promptforge

# Common issues:
# - DNS not pointing to ingress: Update DNS records
# - Rate limit: Wait 1 hour or use staging issuer
# - Firewall: Ensure port 80 is accessible for HTTP-01 challenge
```

### Ingress Not Working

```bash
# Check ingress
kubectl get ingress -n promptforge
kubectl describe ingress promptforge-ingress -n promptforge

# Check ingress controller
kubectl get pods -n ingress-nginx
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx

# Test service internally
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -n promptforge -- curl http://promptforge-service
```

### Database Connection Issues

```bash
# Verify secrets
kubectl get secret promptforge-secrets -n promptforge -o yaml

# Check DATABASE_URL is correct
# Test connection from pod
kubectl exec -it <pod-name> -n promptforge -- env | grep DATABASE_URL
```

## Cleanup

To remove the entire deployment:

```bash
# Delete all resources
kubectl delete -f base/

# Or delete namespace (removes everything)
kubectl delete namespace promptforge
```

## Production Checklist

Before going live, verify:

- [ ] Secrets are created and values are correct
- [ ] DNS records point to ingress IP
- [ ] SSL certificate is issued and valid
- [ ] Application is accessible via HTTPS
- [ ] HTTP redirects to HTTPS
- [ ] www subdomain works
- [ ] Database connection is working
- [ ] All pods are running and healthy
- [ ] Resource limits are appropriate
- [ ] Monitoring is configured
- [ ] Backups are configured
- [ ] Rate limiting is appropriate
- [ ] Security headers are present

## Support

For issues or questions:
1. Check pod logs: `kubectl logs -f -l app=promptforge -n promptforge`
2. Check events: `kubectl get events -n promptforge --sort-by='.lastTimestamp'`
3. Review configuration: `kubectl get all,ingress,certificate -n promptforge`

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
- [cert-manager Documentation](https://cert-manager.io/docs/)
- [Let's Encrypt](https://letsencrypt.org/)
