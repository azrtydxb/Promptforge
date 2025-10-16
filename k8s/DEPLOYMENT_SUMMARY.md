# Kubernetes Deployment Summary - Promptforge

## What Was Created

Complete production-ready Kubernetes deployment infrastructure for Promptforge with automatic SSL/TLS certificate provisioning.

### Manifest Files (Ready to Deploy)

**Location**: `/k8s/base/`

1. **00-namespace.yaml** - Dedicated namespace for isolation
2. **01-clusterissuer.yaml** - Let's Encrypt certificate issuer
3. **02-secrets.template.yaml** - Secret template (in `secrets-templates/`)
4. **03-deployment.yaml** - High-availability application deployment
5. **04-service.yaml** - Internal ClusterIP service
6. **05-ingress.yaml** - NGINX ingress with SSL termination

### Helper Files

1. **README.md** - Comprehensive deployment guide
2. **QUICK_START.md** - 5-minute fast-track deployment
3. **deploy-helper.sh** - Interactive deployment script
4. **DEPLOYMENT_SUMMARY.md** - This file

## Key Features

### High Availability Configuration
- **3 replicas** with pod anti-affinity for node distribution
- **Rolling updates** for zero-downtime deployments
- **Health probes**: startup, liveness, and readiness checks
- **Resource limits**: 512Mi-1Gi memory, 250m-1000m CPU per pod

### SSL/TLS Security
- **Automatic certificate** provisioning via cert-manager
- **Let's Encrypt** free SSL certificates
- **Auto-renewal** every 60 days
- **Force HTTPS** redirect on all traffic
- **Dual domain support**: promptforge.directory + www.promptforge.directory

### Security Features
- **Security headers**: X-Frame-Options, X-Content-Type-Options, etc.
- **Rate limiting**: 100 requests/second per IP
- **Body size limit**: 10MB upload maximum
- **Secret management**: Kubernetes secrets for sensitive data
- **SSL redirect**: All HTTP traffic forced to HTTPS

### Application Configuration
- **Container**: registry.digitalocean.com/azrty/promptforge:latest
- **Port**: 3000 (internal), 80 (service), 443 (ingress)
- **Environment**: All secrets injected from Kubernetes secret
- **Multi-platform**: Supports amd64 + arm64

## Quick Deployment Guide

### Option 1: Using Helper Script (Recommended)

```bash
cd k8s

# Check prerequisites
./deploy-helper.sh check

# Generate and edit secrets
./deploy-helper.sh setup

# Deploy everything
./deploy-helper.sh deploy

# Check status
./deploy-helper.sh status
```

### Option 2: Manual Deployment

```bash
cd k8s

# 1. Create secrets
cp secrets-templates/02-secrets.template.yaml base/02-secrets.yaml
# Edit base/02-secrets.yaml with your values (base64 encoded)

# 2. Deploy in order
kubectl apply -f base/00-namespace.yaml
kubectl apply -f base/01-clusterissuer.yaml
kubectl apply -f base/02-secrets.yaml
kubectl apply -f base/03-deployment.yaml
kubectl apply -f base/04-service.yaml
kubectl apply -f base/05-ingress.yaml

# 3. Verify
kubectl get all,ingress,certificate -n promptforge
```

## Required Secrets

You must provide these environment variables (base64 encoded):

1. **DATABASE_URL** - PostgreSQL connection string
   ```
   Format: postgresql://user:password@host:5432/database
   ```

2. **NEXT_PUBLIC_SUPABASE_URL** - Supabase project URL
   ```
   Format: https://xxxxx.supabase.co
   ```

3. **NEXT_PUBLIC_SUPABASE_ANON_KEY** - Supabase anonymous key

4. **SUPABASE_SERVICE_ROLE_KEY** - Supabase service role key (private!)

5. **NEXTAUTH_SECRET** - NextAuth session encryption key
   ```bash
   Generate: openssl rand -base64 32
   ```

6. **NEXTAUTH_URL** - Application URL
   ```
   Value: https://promptforge.directory
   ```

### How to Encode Secrets

```bash
# Encode a value to base64
echo -n "your-actual-value" | base64

# Example
echo -n "postgresql://user:pass@localhost:5432/db" | base64
```

## DNS Configuration

After deployment, configure DNS A records:

```
promptforge.directory     → <INGRESS_EXTERNAL_IP>
www.promptforge.directory → <INGRESS_EXTERNAL_IP>
```

Get the ingress IP:
```bash
kubectl get svc -n ingress-nginx ingress-nginx-controller
```

## Verification Steps

### 1. Check Pods Running
```bash
kubectl get pods -n promptforge
# Expected: 3 pods in Running state
```

### 2. Check Services
```bash
kubectl get svc -n promptforge
# Expected: promptforge-service with ClusterIP
```

### 3. Check Ingress
```bash
kubectl get ingress -n promptforge
# Expected: promptforge-ingress with ADDRESS
```

### 4. Check SSL Certificate
```bash
kubectl get certificate -n promptforge
# Expected: promptforge-tls-cert with READY=True
```

### 5. Test Application
```bash
# Wait 2-5 minutes for certificate provisioning
curl -I https://promptforge.directory
# Expected: HTTP/2 200 with valid SSL
```

## Monitoring Commands

```bash
# View logs from all pods
kubectl logs -f -l app=promptforge -n promptforge

# Check pod status
kubectl get pods -n promptforge -w

# View recent events
kubectl get events -n promptforge --sort-by='.lastTimestamp'

# Check resource usage
kubectl top pods -n promptforge

# Describe deployment
kubectl describe deployment promptforge -n promptforge
```

## Common Operations

### Scale Application
```bash
# Scale up to 5 replicas
kubectl scale deployment promptforge -n promptforge --replicas=5

# Scale down to 2 replicas
kubectl scale deployment promptforge -n promptforge --replicas=2
```

### Update Image
```bash
# Update to new version
kubectl set image deployment/promptforge \
  promptforge=registry.digitalocean.com/azrty/promptforge:v2.0.0 \
  -n promptforge

# Check rollout status
kubectl rollout status deployment/promptforge -n promptforge
```

### Rollback Deployment
```bash
# Rollback to previous version
kubectl rollout undo deployment/promptforge -n promptforge

# Rollback to specific revision
kubectl rollout undo deployment/promptforge -n promptforge --to-revision=2
```

### Restart Pods
```bash
# Restart all pods (e.g., after secret update)
kubectl rollout restart deployment/promptforge -n promptforge
```

### Update Secrets
```bash
# Edit secrets directly
kubectl edit secret promptforge-secrets -n promptforge

# Or delete and recreate
kubectl delete secret promptforge-secrets -n promptforge
kubectl apply -f base/02-secrets.yaml

# Restart pods to pick up new secrets
kubectl rollout restart deployment/promptforge -n promptforge
```

## Troubleshooting Quick Reference

### Pods Not Starting
```bash
# Check pod events
kubectl describe pod <pod-name> -n promptforge

# Check logs
kubectl logs <pod-name> -n promptforge

# Common causes:
# - Wrong image or image pull errors
# - Missing or invalid secrets
# - Insufficient cluster resources
```

### Certificate Not Provisioning
```bash
# Check certificate status
kubectl describe certificate promptforge-tls-cert -n promptforge

# Check cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager

# Common causes:
# - DNS not pointing to ingress IP
# - Firewall blocking port 80 (needed for HTTP-01 challenge)
# - Let's Encrypt rate limits
```

### Application Not Accessible
```bash
# Check ingress
kubectl describe ingress promptforge-ingress -n promptforge

# Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx

# Test service internally
kubectl run -it --rm debug --image=curlimages/curl \
  --restart=Never -n promptforge -- \
  curl http://promptforge-service
```

### Database Connection Issues
```bash
# Verify DATABASE_URL is set correctly
kubectl exec -it <pod-name> -n promptforge -- env | grep DATABASE

# Check if pods can reach database
kubectl exec -it <pod-name> -n promptforge -- \
  nc -zv <database-host> 5432
```

## Production Checklist

Before going live:

- [ ] All secrets created with correct values (base64 encoded)
- [ ] Email updated in ClusterIssuer (01-clusterissuer.yaml)
- [ ] DNS A records configured for both domains
- [ ] NGINX Ingress Controller installed and running
- [ ] cert-manager installed and running
- [ ] All 3 pods running and healthy
- [ ] Service has ClusterIP assigned
- [ ] Ingress has external ADDRESS
- [ ] SSL certificate issued (READY=True)
- [ ] HTTPS redirect working (HTTP → HTTPS)
- [ ] Application accessible at https://promptforge.directory
- [ ] WWW subdomain working (www.promptforge.directory)
- [ ] Database connection successful
- [ ] Resource limits appropriate for traffic
- [ ] Monitoring configured (optional but recommended)
- [ ] Backup strategy in place
- [ ] .gitignore includes k8s/base/02-secrets.yaml

## Resource Requirements

### Per Pod
- Memory: 512Mi request, 1Gi limit
- CPU: 250m request, 1000m limit

### Cluster Minimum (for 3 replicas)
- Memory: ~2Gi available
- CPU: ~1 core available
- Storage: ~5Gi for container images

### Recommendations
- Production: 3-5 replicas
- High traffic: 5-10 replicas with autoscaling
- Resource limits: Adjust based on monitoring data

## Cleanup

To remove everything:

```bash
# Using helper script
./deploy-helper.sh cleanup

# Or manually
kubectl delete namespace promptforge

# This deletes:
# - All pods, deployments, services
# - Ingress and certificates
# - Secrets and config
# - The namespace itself
```

## Next Steps After Deployment

1. **Monitor application**
   - Set up logging aggregation (e.g., ELK, Loki)
   - Configure metrics (Prometheus/Grafana)
   - Set up alerting for critical issues

2. **Implement CI/CD**
   - Automate image builds
   - Deploy new versions automatically
   - Run tests before deployment

3. **Database backups**
   - Set up automated PostgreSQL backups
   - Test restore procedures
   - Configure point-in-time recovery

4. **Performance tuning**
   - Monitor resource usage
   - Adjust replica count based on traffic
   - Implement auto-scaling (HPA)

5. **Security hardening**
   - Regular security updates
   - Implement network policies
   - Set up secrets rotation
   - Enable pod security policies

## Support Resources

- **Documentation**: See README.md for detailed guide
- **Quick Start**: See QUICK_START.md for fast deployment
- **Kubernetes Docs**: https://kubernetes.io/docs/
- **NGINX Ingress**: https://kubernetes.github.io/ingress-nginx/
- **cert-manager**: https://cert-manager.io/docs/
- **Let's Encrypt**: https://letsencrypt.org/

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│ Internet (HTTPS traffic)                        │
└─────────────────────────┬───────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────┐
│ NGINX Ingress Controller                        │
│ - SSL/TLS termination (cert-manager)            │
│ - Load balancing                                │
│ - Rate limiting                                 │
└─────────────────────────┬───────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────┐
│ Kubernetes Service (ClusterIP)                  │
│ - Internal load balancing                       │
│ - Service discovery                             │
└─────────────────────────┬───────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────┐
│ Deployment (3 replicas)                         │
│ ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│ │  Pod 1  │  │  Pod 2  │  │  Pod 3  │          │
│ │Next.js  │  │Next.js  │  │Next.js  │          │
│ │App:3000 │  │App:3000 │  │App:3000 │          │
│ └─────────┘  └─────────┘  └─────────┘          │
│ - Health checks                                 │
│ - Resource limits                               │
│ - Rolling updates                               │
└─────────────────────────┬───────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────┐
│ External Services                               │
│ - PostgreSQL (Supabase)                         │
│ - Supabase Auth                                 │
└─────────────────────────────────────────────────┘
```

---

**Created**: October 2024
**Container**: registry.digitalocean.com/azrty/promptforge:latest
**Domains**: promptforge.directory, www.promptforge.directory
**Namespace**: promptforge
**Replicas**: 3 (configurable)
