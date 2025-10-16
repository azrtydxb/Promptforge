# Quick Start - Promptforge Kubernetes Deployment

Fast-track deployment guide for getting Promptforge running on Kubernetes with SSL.

## Prerequisites Check

```bash
# Verify kubectl is configured
kubectl cluster-info

# Verify NGINX Ingress Controller
kubectl get pods -n ingress-nginx

# Verify cert-manager
kubectl get pods -n cert-manager
```

**Missing prerequisites?** Install them:
```bash
# NGINX Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.0/deploy/static/provider/cloud/deploy.yaml

# cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml
```

## 5-Minute Deployment

### 1. Create Secrets File (2 min)

```bash
cd k8s
cp secrets-templates/02-secrets.template.yaml base/02-secrets.yaml
```

**Edit** `base/02-secrets.yaml` with your values:

```bash
# Generate NEXTAUTH_SECRET
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Your values (replace these)
DATABASE_URL="postgresql://user:password@host:5432/promptforge"
SUPABASE_URL="https://xxxxx.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_KEY="your-service-key"

# Encode to base64 and update file
echo -n "$DATABASE_URL" | base64
echo -n "$SUPABASE_URL" | base64
echo -n "$SUPABASE_ANON_KEY" | base64
echo -n "$SUPABASE_SERVICE_KEY" | base64
echo -n "$NEXTAUTH_SECRET" | base64
echo -n "https://promptforge.directory" | base64
```

### 2. Update Email in ClusterIssuer (30 sec)

Edit `base/01-clusterissuer.yaml`:
```yaml
email: your-email@example.com  # Change this line
```

### 3. Deploy Everything (1 min)

```bash
# Deploy all manifests
kubectl apply -f base/

# Watch deployment
kubectl get pods -n promptforge -w
```

### 4. Configure DNS (1 min)

```bash
# Get ingress IP
kubectl get svc -n ingress-nginx ingress-nginx-controller

# Add these DNS A records to your domain:
# promptforge.directory     → <EXTERNAL_IP>
# www.promptforge.directory → <EXTERNAL_IP>
```

### 5. Verify Deployment (30 sec)

```bash
# Check all resources
kubectl get all,ingress,certificate -n promptforge

# Wait for certificate (2-5 minutes)
kubectl get certificate -n promptforge -w

# Test in browser
open https://promptforge.directory
```

## One-Line Deployment (After Secrets Setup)

```bash
kubectl apply -f base/ && kubectl get pods -n promptforge -w
```

## Common Issues

### Pods Not Starting?
```bash
kubectl logs -f -l app=promptforge -n promptforge
kubectl describe pods -n promptforge
```

### Certificate Not Issuing?
```bash
# Check certificate status
kubectl describe certificate promptforge-tls-cert -n promptforge

# Check cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager

# Verify DNS is pointing to ingress
nslookup promptforge.directory
```

### Can't Access Application?
```bash
# Check ingress
kubectl get ingress -n promptforge

# Check service
kubectl get svc -n promptforge

# Test internally
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -n promptforge -- curl http://promptforge-service
```

## Quick Commands Reference

```bash
# View logs
kubectl logs -f -l app=promptforge -n promptforge

# Restart deployment
kubectl rollout restart deployment/promptforge -n promptforge

# Scale up/down
kubectl scale deployment promptforge -n promptforge --replicas=5

# Update image
kubectl set image deployment/promptforge promptforge=registry.digitalocean.com/azrty/promptforge:v2.0.0 -n promptforge

# Delete everything
kubectl delete namespace promptforge
```

## What Was Deployed?

- **Namespace**: `promptforge`
- **Deployment**: 3 replicas with health checks
- **Service**: Internal ClusterIP on port 80
- **Ingress**: NGINX with SSL redirect
- **Certificate**: Let's Encrypt auto-provisioned
- **Domains**: promptforge.directory + www.promptforge.directory

## Next Steps

1. ✅ Monitor application: `kubectl logs -f -l app=promptforge -n promptforge`
2. ✅ Set up monitoring/alerting (Prometheus, Grafana)
3. ✅ Configure backup strategy
4. ✅ Set up CI/CD pipeline for automated deployments
5. ✅ Review resource limits based on actual usage

For detailed information, see [README.md](./README.md)
