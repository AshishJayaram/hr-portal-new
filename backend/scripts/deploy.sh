#!/bin/bash

# HR Portal Backend Deployment Script
# This script handles the complete deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="hr-portal-backend"
DOCKER_IMAGE="hr-portal-backend:latest"
CONTAINER_NAME="hr-portal-backend"
PORT=8080
HEALTH_CHECK_URL="http://localhost:${PORT}/health"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    log_info "Checking dependencies..."
    
    local missing_deps=()
    
    if ! command -v docker &> /dev/null; then
        missing_deps+=("docker")
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        missing_deps+=("docker-compose")
    fi
    
    if ! command -v go &> /dev/null; then
        missing_deps+=("go")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        log_error "Please install the missing dependencies and try again."
        exit 1
    fi
    
    log_success "All dependencies are installed"
}

# Build the application
build_app() {
    log_info "Building application..."
    
    # Build Go binary
    log_info "Building Go binary..."
    CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -ldflags="-w -s" -o bin/${APP_NAME} cmd/server/main.go
    
    if [ $? -eq 0 ]; then
        log_success "Go binary built successfully"
    else
        log_error "Failed to build Go binary"
        exit 1
    fi
    
    # Build Docker image
    log_info "Building Docker image..."
    docker build -t ${DOCKER_IMAGE} .
    
    if [ $? -eq 0 ]; then
        log_success "Docker image built successfully"
    else
        log_error "Failed to build Docker image"
        exit 1
    fi
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    # Check if .env file exists
    if [ ! -f .env ]; then
        log_warning ".env file not found, copying from env.example"
        cp env.example .env
        log_warning "Please update .env file with your configuration"
    fi
    
    # Source environment variables
    source .env
    
    # Run migrations using migrate tool
    if command -v migrate &> /dev/null; then
        migrate -path migrations -database "postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=${DB_SSLMODE}" up
        log_success "Database migrations completed"
    else
        log_warning "migrate tool not found, skipping migrations"
        log_warning "Please run migrations manually: make migrate-up"
    fi
}

# Start services with Docker Compose
start_services() {
    log_info "Starting services with Docker Compose..."
    
    # Start PostgreSQL and Redis
    docker-compose up -d postgres redis
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 10
    
    # Check if services are running
    if docker-compose ps postgres | grep -q "Up" && docker-compose ps redis | grep -q "Up"; then
        log_success "Services started successfully"
    else
        log_error "Failed to start services"
        exit 1
    fi
}

# Deploy the application
deploy_app() {
    log_info "Deploying application..."
    
    # Stop existing container if running
    if docker ps -q -f name=${CONTAINER_NAME} | grep -q .; then
        log_info "Stopping existing container..."
        docker stop ${CONTAINER_NAME}
        docker rm ${CONTAINER_NAME}
    fi
    
    # Run new container
    docker run -d \
        --name ${CONTAINER_NAME} \
        --env-file .env \
        -p ${PORT}:8080 \
        --restart unless-stopped \
        ${DOCKER_IMAGE}
    
    if [ $? -eq 0 ]; then
        log_success "Application deployed successfully"
    else
        log_error "Failed to deploy application"
        exit 1
    fi
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s ${HEALTH_CHECK_URL} > /dev/null 2>&1; then
            log_success "Health check passed"
            return 0
        fi
        
        log_info "Health check attempt $attempt/$max_attempts failed, retrying in 5 seconds..."
        sleep 5
        ((attempt++))
    done
    
    log_error "Health check failed after $max_attempts attempts"
    return 1
}

# Show application status
show_status() {
    log_info "Application Status:"
    echo "=================="
    
    # Container status
    if docker ps -q -f name=${CONTAINER_NAME} | grep -q .; then
        log_success "Container is running"
        docker ps -f name=${CONTAINER_NAME} --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    else
        log_error "Container is not running"
    fi
    
    # Service status
    echo ""
    log_info "Service Status:"
    docker-compose ps
    
    # Application URL
    echo ""
    log_info "Application URLs:"
    echo "  API: http://localhost:${PORT}/api"
    echo "  Swagger: http://localhost:${PORT}/swagger/index.html"
    echo "  Health: http://localhost:${PORT}/health"
    echo "  Metrics: http://localhost:${PORT}/metrics"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up..."
    
    # Stop and remove container
    if docker ps -q -f name=${CONTAINER_NAME} | grep -q .; then
        docker stop ${CONTAINER_NAME}
        docker rm ${CONTAINER_NAME}
    fi
    
    # Stop services
    docker-compose down
    
    log_success "Cleanup completed"
}

# Main deployment function
deploy() {
    log_info "Starting deployment process..."
    
    check_dependencies
    build_app
    start_services
    run_migrations
    deploy_app
    
    if health_check; then
        show_status
        log_success "Deployment completed successfully!"
    else
        log_error "Deployment failed health check"
        exit 1
    fi
}

# Development setup
dev_setup() {
    log_info "Setting up development environment..."
    
    check_dependencies
    
    # Copy environment file
    if [ ! -f .env ]; then
        cp env.example .env
        log_warning "Please update .env file with your configuration"
    fi
    
    # Start services
    start_services
    
    # Run migrations
    run_migrations
    
    # Install Go dependencies
    log_info "Installing Go dependencies..."
    go mod tidy
    
    # Install development tools
    log_info "Installing development tools..."
    go install github.com/golang-migrate/migrate/v4/cmd/migrate@latest
    go install github.com/swaggo/swag/cmd/swag@latest
    go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
    go install github.com/cosmtrek/air@latest
    
    log_success "Development environment setup completed!"
    log_info "Run 'make run' to start the development server"
}

# Show usage
usage() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  deploy     Deploy the application to production"
    echo "  dev-setup  Set up development environment"
    echo "  build      Build the application"
    echo "  start      Start services with Docker Compose"
    echo "  stop       Stop all services"
    echo "  status     Show application status"
    echo "  logs       Show application logs"
    echo "  cleanup    Clean up containers and services"
    echo "  help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 deploy      # Deploy to production"
    echo "  $0 dev-setup   # Set up development environment"
    echo "  $0 status      # Check application status"
}

# Handle command line arguments
case "${1:-deploy}" in
    deploy)
        deploy
        ;;
    dev-setup)
        dev_setup
        ;;
    build)
        check_dependencies
        build_app
        ;;
    start)
        start_services
        ;;
    stop)
        docker-compose down
        ;;
    status)
        show_status
        ;;
    logs)
        docker logs -f ${CONTAINER_NAME}
        ;;
    cleanup)
        cleanup
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        log_error "Unknown command: $1"
        usage
        exit 1
        ;;
esac
