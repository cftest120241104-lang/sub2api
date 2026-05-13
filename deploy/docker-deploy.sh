#!/bin/bash
# =============================================================================
# Pragmatic Play Admin Docker Deployment Preparation Script
# =============================================================================
# This script prepares deployment files for the project-local admin service:
#   - Generates secure secrets (JWT_SECRET, TOTP_ENCRYPTION_KEY, POSTGRES_PASSWORD, ADMIN_PASSWORD)
#   - Creates necessary data directories
#
# After running this script, you can start services with:
#   docker compose -f docker-compose.local.yml up -d --build
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored message
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Generate random secret
generate_secret() {
    openssl rand -hex 32
}

generate_admin_password() {
    printf "Adm1n!"
    openssl rand -hex 16
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Main installation function
main() {
    echo ""
    echo "=========================================="
    echo "  Sub2API Deployment Preparation"
    echo "=========================================="
    echo ""

    # Check if openssl is available
    if ! command_exists openssl; then
        print_error "openssl is not installed. Please install openssl first."
        exit 1
    fi

    # Check if deployment already exists
    if [ -f "docker-compose.yml" ] && [ -f ".env" ]; then
        print_warning "Deployment .env already exists in current directory."
        read -p "Overwrite existing files? (y/N): " -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Cancelled."
            exit 0
        fi
    fi

    if [ ! -f "docker-compose.local.yml" ] || [ ! -f ".env.example" ]; then
        print_error "docker-compose.local.yml and .env.example must exist in the current deploy directory."
        print_error "Run this script from pragmaticplay_games/admin/deploy."
        exit 1
    fi

    # Generate .env file with auto-generated secrets
    print_info "Generating secure secrets..."
    echo ""

    # Generate secrets
    JWT_SECRET=$(generate_secret)
    TOTP_ENCRYPTION_KEY=$(generate_secret)
    POSTGRES_PASSWORD=$(generate_secret)
    ADMIN_PASSWORD=$(generate_admin_password)

    # Create .env from .env.example
    cp .env.example .env

    # Update .env with generated secrets (cross-platform compatible)
    if sed --version >/dev/null 2>&1; then
        # GNU sed (Linux)
        sed -i "s/^JWT_SECRET=.*/JWT_SECRET=${JWT_SECRET}/" .env
        sed -i "s/^TOTP_ENCRYPTION_KEY=.*/TOTP_ENCRYPTION_KEY=${TOTP_ENCRYPTION_KEY}/" .env
        sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=${POSTGRES_PASSWORD}/" .env
        sed -i "s/^ADMIN_PASSWORD=.*/ADMIN_PASSWORD=${ADMIN_PASSWORD}/" .env
    else
        # BSD sed (macOS)
        sed -i '' "s/^JWT_SECRET=.*/JWT_SECRET=${JWT_SECRET}/" .env
        sed -i '' "s/^TOTP_ENCRYPTION_KEY=.*/TOTP_ENCRYPTION_KEY=${TOTP_ENCRYPTION_KEY}/" .env
        sed -i '' "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=${POSTGRES_PASSWORD}/" .env
        sed -i '' "s/^ADMIN_PASSWORD=.*/ADMIN_PASSWORD=${ADMIN_PASSWORD}/" .env
    fi

    # Create data directories
    print_info "Creating data directories..."
    mkdir -p data postgres_data redis_data
    print_success "Created data directories"

    # Set secure permissions for .env file (readable/writable only by owner)
    chmod 600 .env
    echo ""

    # Display completion message
    echo "=========================================="
    echo "  Preparation Complete!"
    echo "=========================================="
    echo ""
    echo "Generated secure credentials:"
    echo "  POSTGRES_PASSWORD:     ${POSTGRES_PASSWORD}"
    echo "  ADMIN_PASSWORD:        ${ADMIN_PASSWORD}"
    echo "  JWT_SECRET:            ${JWT_SECRET}"
    echo "  TOTP_ENCRYPTION_KEY:   ${TOTP_ENCRYPTION_KEY}"
    echo ""
    print_warning "These credentials have been saved to .env file."
    print_warning "Please keep them secure and do not share publicly!"
    echo ""
    echo "Directory structure:"
    echo "  docker-compose.local.yml  - Docker Compose configuration"
    echo "  .env                      - Environment variables (generated secrets)"
    echo "  .env.example              - Example template (for reference)"
    echo "  data/                     - Application data (will be created on first run)"
    echo "  postgres_data/            - PostgreSQL data"
    echo "  redis_data/               - Redis data"
    echo ""
    echo "Next steps:"
    echo "  1. (Optional) Edit .env to customize configuration"
    echo "  2. Verify env and compose:"
    echo "     ./verify-production-env.ps1 -EnvFile .env"
    echo "     ./verify-compose.ps1 -ComposeFile docker-compose.local.yml -EnvFile .env"
    echo ""
    echo "  3. Start services:"
    echo "     docker compose -f docker-compose.local.yml up -d --build"
    echo ""
    echo "  4. View logs:"
    echo "     docker compose -f docker-compose.local.yml logs -f admin-web"
    echo ""
    echo "  5. Access Web UI:"
    echo "     http://localhost:8090"
    echo ""
    print_info "Use ADMIN_EMAIL and ADMIN_PASSWORD from .env to sign in."
    echo ""
}

# Run main function
main "$@"
