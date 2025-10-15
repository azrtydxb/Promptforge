#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 PromptForge Kubernetes Deployment${NC}"
echo "======================================"

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl not found. Please install kubectl first.${NC}"
    exit 1
fi

# Check if cert-manager is installed
echo -e "\n${YELLOW}Checking cert-manager...${NC}"
if ! kubectl get namespace cert-manager &> /dev/null; then
    echo -e "${RED}❌ cert-manager namespace not found. Please install cert-manager first.${NC}"
    echo "Install with: kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml"
    exit 1
fi

# Apply namespace
echo -e "\n${YELLOW}Creating namespace...${NC}"
kubectl apply -f namespace.yaml

# Check if secrets need to be updated
echo -e "\n${YELLOW}⚠️  Please ensure you have updated the secrets in secret.yaml${NC}"
read -p "Have you updated the secrets? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Please update secret.yaml before deploying.${NC}"
    exit 1
fi

# Apply secrets and config
echo -e "\n${YELLOW}Applying secrets and config...${NC}"
kubectl apply -f secret.yaml
kubectl apply -f configmap.yaml

# Deploy Redis
echo -e "\n${YELLOW}Deploying Redis...${NC}"
kubectl apply -f redis-deployment.yaml

# Wait for Redis to be ready
echo -e "\n${YELLOW}Waiting for Redis to be ready...${NC}"
kubectl wait --for=condition=available --timeout=60s deployment/redis -n promptforge

# Deploy application
echo -e "\n${YELLOW}Deploying PromptForge...${NC}"
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml

# Wait for deployment to be ready
echo -e "\n${YELLOW}Waiting for PromptForge to be ready...${NC}"
kubectl wait --for=condition=available --timeout=120s deployment/promptforge -n promptforge

# Run database migrations
echo -e "\n${YELLOW}Running database migrations...${NC}"
POD=$(kubectl get pods -n promptforge -l app=promptforge -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n promptforge $POD -- npx prisma migrate deploy

# Apply ingress
echo -e "\n${YELLOW}Applying ingress...${NC}"
kubectl apply -f ingress.yaml

# Show deployment status
echo -e "\n${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Deployment status:"
kubectl get deployments -n promptforge
echo ""
echo "Pods:"
kubectl get pods -n promptforge
echo ""
echo "Services:"
kubectl get services -n promptforge
echo ""
echo "Ingress:"
kubectl get ingress -n promptforge
echo ""
echo -e "${YELLOW}Certificate status:${NC}"
kubectl get certificate -n promptforge

echo ""
echo -e "${GREEN}🎉 PromptForge is deployed!${NC}"
echo "Access at: https://promptforge.directory"
echo ""
echo "To view logs:"
echo "  kubectl logs -n promptforge -l app=promptforge --tail=100 -f"
echo ""
echo "To check certificate status:"
echo "  kubectl describe certificate promptforge-tls -n promptforge"
