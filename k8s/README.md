# PromptForge Kubernetes Deployment

This directory contains Kubernetes manifests for deploying PromptForge to your cluster.

## Prerequisites

1. **Kubernetes cluster** with kubectl configured
2. **cert-manager** installed in the cluster
3. **Nginx Ingress Controller** installed
4. **PostgreSQL database** (external or in-cluster)
5. **DNS configured** for promptforge.directory and www.promptforge.directory

## Setup Instructions

### 1. Update Secrets

Edit `secret.yaml` and replace the placeholder values:

```bash
# Generate a secure NextAuth secret
openssl rand -base64 32

# Update secret.yaml with:
# - DATABASE_URL (PostgreSQL connection string)
# - NEXTAUTH_SECRET (generated above)
# - OPENAI_API_KEY (if using AI features)
# - REDIS_PASSWORD (if using password-protected Redis)
```

### 2. Build and Push Docker Image

```bash
# Build the Docker image
docker build -t your-registry/promptforge:latest .

# Push to your container registry
docker push your-registry/promptforge:latest

# Update deployment.yaml with your image name
```

### 3. Deploy to Kubernetes

```bash
# Apply all manifests
kubectl apply -f k8s/

# Or apply in order:
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
```

### 4. Run Database Migrations

```bash
# Get a pod name
POD=$(kubectl get pods -n promptforge -l app=promptforge -o jsonpath='{.items[0].metadata.name}')

# Run migrations
kubectl exec -n promptforge $POD -- npx prisma migrate deploy

# Seed the database (optional)
kubectl exec -n promptforge $POD -- npm run seed
```

### 5. Verify Deployment

```bash
# Check pod status
kubectl get pods -n promptforge

# Check ingress
kubectl get ingress -n promptforge

# Check certificate status
kubectl get certificate -n promptforge

# View logs
kubectl logs -n promptforge -l app=promptforge --tail=100 -f
```

## SSL Certificate

The ingress is configured with cert-manager to automatically provision Let's Encrypt SSL certificates for:
- promptforge.directory
- www.promptforge.directory

The certificate will be automatically created and renewed by cert-manager.

## Monitoring

```bash
# Check pod health
kubectl get pods -n promptforge -w

# View application logs
kubectl logs -n promptforge -l app=promptforge --tail=200 -f

# Check resource usage
kubectl top pods -n promptforge
```

## Scaling

```bash
# Scale replicas
kubectl scale deployment promptforge -n promptforge --replicas=3

# Or edit deployment.yaml and apply
```

## Troubleshooting

### Certificate Issues

```bash
# Check certificate status
kubectl describe certificate promptforge-tls -n promptforge

# Check cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager
```

### Pod Issues

```bash
# Describe pod
kubectl describe pod -n promptforge -l app=promptforge

# Get pod events
kubectl get events -n promptforge --sort-by='.lastTimestamp'
```

### Database Connection

```bash
# Test database connectivity from pod
kubectl exec -n promptforge $POD -- npx prisma db execute --stdin <<< "SELECT 1"
```

## Updating

```bash
# Build new image
docker build -t your-registry/promptforge:v2 .
docker push your-registry/promptforge:v2

# Update deployment
kubectl set image deployment/promptforge promptforge=your-registry/promptforge:v2 -n promptforge

# Or edit deployment.yaml and apply
kubectl apply -f k8s/deployment.yaml

# Rollback if needed
kubectl rollout undo deployment/promptforge -n promptforge
```

## Cleanup

```bash
# Delete all resources
kubectl delete -f k8s/

# Or delete namespace
kubectl delete namespace promptforge
```
