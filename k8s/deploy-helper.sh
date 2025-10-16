#!/bin/bash
# Promptforge Kubernetes Deployment Helper Script
# This script assists with deploying Promptforge to Kubernetes with SSL support

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  ${1}${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}\n"
}

# Function to check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    local all_ok=true

    # Check kubectl
    if command -v kubectl &> /dev/null; then
        print_success "kubectl is installed"
    else
        print_error "kubectl is not installed"
        all_ok=false
    fi

    # Check cluster connection
    if kubectl cluster-info &> /dev/null; then
        print_success "Connected to Kubernetes cluster"
        kubectl cluster-info | head -1
    else
        print_error "Not connected to Kubernetes cluster"
        all_ok=false
    fi

    # Check NGINX Ingress Controller
    if kubectl get pods -n ingress-nginx &> /dev/null; then
        print_success "NGINX Ingress Controller detected"
    else
        print_warning "NGINX Ingress Controller not found"
        echo "  Install: kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.0/deploy/static/provider/cloud/deploy.yaml"
    fi

    # Check cert-manager
    if kubectl get pods -n cert-manager &> /dev/null; then
        print_success "cert-manager detected"
    else
        print_warning "cert-manager not found"
        echo "  Install: kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml"
    fi

    # Check if secrets file exists
    if [ -f "base/02-secrets.yaml" ]; then
        print_success "Secrets file found (base/02-secrets.yaml)"
    else
        print_warning "Secrets file not found"
        echo "  Create: cp secrets-templates/02-secrets.template.yaml base/02-secrets.yaml"
        echo "  Then edit base/02-secrets.yaml with your actual values"
    fi

    if [ "$all_ok" = false ]; then
        print_error "Prerequisites check failed. Please fix the issues above."
        exit 1
    fi

    echo ""
}

# Function to generate secrets template
generate_secrets() {
    print_header "Secrets Generation Helper"

    if [ -f "base/02-secrets.yaml" ]; then
        print_warning "base/02-secrets.yaml already exists"
        read -p "Overwrite? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Skipping secrets generation"
            return
        fi
    fi

    print_info "Copying template..."
    cp secrets-templates/02-secrets.template.yaml base/02-secrets.yaml

    print_success "Template copied to base/02-secrets.yaml"
    echo ""
    print_info "Generating NEXTAUTH_SECRET..."
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    echo "Generated: ${NEXTAUTH_SECRET}"
    echo ""

    print_warning "IMPORTANT: Edit base/02-secrets.yaml and replace all <PLACEHOLDER> values"
    print_warning "Remember to encode values in base64: echo -n 'value' | base64"
    echo ""
    print_info "Required values:"
    echo "  - DATABASE_URL (PostgreSQL connection string)"
    echo "  - NEXT_PUBLIC_SUPABASE_URL (Supabase project URL)"
    echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY (Supabase anon key)"
    echo "  - SUPABASE_SERVICE_ROLE_KEY (Supabase service role key)"
    echo "  - NEXTAUTH_SECRET (use generated value above)"
    echo "  - NEXTAUTH_URL (https://promptforge.directory)"
    echo ""

    read -p "Press Enter when you've finished editing base/02-secrets.yaml..."
}

# Function to deploy to Kubernetes
deploy() {
    print_header "Deploying to Kubernetes"

    # Check if secrets file exists
    if [ ! -f "base/02-secrets.yaml" ]; then
        print_error "base/02-secrets.yaml not found. Run this script with --setup first."
        exit 1
    fi

    # Deploy in order
    print_info "Creating namespace..."
    kubectl apply -f base/00-namespace.yaml
    print_success "Namespace created"

    print_info "Creating ClusterIssuer..."
    kubectl apply -f base/01-clusterissuer.yaml
    print_success "ClusterIssuer created"

    print_info "Creating secrets..."
    kubectl apply -f base/02-secrets.yaml
    print_success "Secrets created"

    print_info "Creating deployment..."
    kubectl apply -f base/03-deployment.yaml
    print_success "Deployment created"

    print_info "Creating service..."
    kubectl apply -f base/04-service.yaml
    print_success "Service created"

    print_info "Creating ingress..."
    kubectl apply -f base/05-ingress.yaml
    print_success "Ingress created"

    echo ""
    print_success "Deployment complete!"
    echo ""
}

# Function to check deployment status
status() {
    print_header "Deployment Status"

    print_info "Namespace:"
    kubectl get namespace promptforge 2>/dev/null || print_warning "Namespace not found"
    echo ""

    print_info "Pods:"
    kubectl get pods -n promptforge 2>/dev/null || print_warning "No pods found"
    echo ""

    print_info "Services:"
    kubectl get svc -n promptforge 2>/dev/null || print_warning "No services found"
    echo ""

    print_info "Ingress:"
    kubectl get ingress -n promptforge 2>/dev/null || print_warning "No ingress found"
    echo ""

    print_info "Certificates:"
    kubectl get certificate -n promptforge 2>/dev/null || print_warning "No certificates found"
    echo ""

    print_info "Ingress External IP:"
    kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null && echo "" || print_warning "Ingress controller not found or external IP not assigned"
    echo ""
}

# Function to view logs
logs() {
    print_header "Application Logs"
    print_info "Following logs from all promptforge pods..."
    echo ""
    kubectl logs -f -l app=promptforge -n promptforge
}

# Function to cleanup deployment
cleanup() {
    print_header "Cleanup Deployment"
    print_warning "This will delete ALL Promptforge resources from the cluster"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Cleanup cancelled"
        exit 0
    fi

    print_info "Deleting resources..."
    kubectl delete -f base/ 2>/dev/null || true

    print_info "Deleting namespace..."
    kubectl delete namespace promptforge 2>/dev/null || true

    print_success "Cleanup complete"
}

# Function to show usage
usage() {
    cat << EOF
Promptforge Kubernetes Deployment Helper

Usage: $0 [COMMAND]

Commands:
    check       Check prerequisites (kubectl, ingress, cert-manager, etc.)
    setup       Generate secrets template and helper
    deploy      Deploy Promptforge to Kubernetes
    status      Show deployment status
    logs        View application logs (follows)
    cleanup     Remove all Promptforge resources
    help        Show this help message

Quick deployment:
    $0 check        # Check prerequisites
    $0 setup        # Generate and edit secrets
    $0 deploy       # Deploy to cluster
    $0 status       # Verify deployment

Examples:
    $0 check        Check if prerequisites are installed
    $0 deploy       Deploy using manifests in base/
    $0 status       Check current deployment status
    $0 logs         View live application logs
    $0 cleanup      Remove everything from cluster

EOF
}

# Main script logic
case "${1:-help}" in
    check)
        check_prerequisites
        ;;
    setup)
        check_prerequisites
        generate_secrets
        ;;
    deploy)
        check_prerequisites
        deploy
        status
        echo ""
        print_info "Next steps:"
        echo "  1. Configure DNS A records pointing to ingress IP"
        echo "  2. Wait 2-5 minutes for SSL certificate provisioning"
        echo "  3. Visit https://promptforge.directory"
        echo ""
        print_info "Monitor certificate: kubectl get certificate -n promptforge -w"
        ;;
    status)
        status
        ;;
    logs)
        logs
        ;;
    cleanup)
        cleanup
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        usage
        exit 1
        ;;
esac
