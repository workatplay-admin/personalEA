#!/bin/bash

# PersonalEA User Setup Script
# This script helps non-technical users set up PersonalEA easily

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Banner
echo -e "${BLUE}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║                    PersonalEA Setup                          ║
║                                                               ║
║              Your Personal AI Assistant                      ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

log_info "Welcome! This script will help you set up PersonalEA on your computer."
echo

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   log_error "This script should not be run as root for security reasons."
   exit 1
fi

# Detect operating system
OS="unknown"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    OS="windows"
fi

log_info "Detected operating system: $OS"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install Node.js
install_nodejs() {
    log_info "Installing Node.js..."
    
    if [[ "$OS" == "macos" ]]; then
        if command_exists brew; then
            brew install node
        else
            log_warning "Homebrew not found. Please install Node.js manually from https://nodejs.org/"
            read -p "Press Enter after installing Node.js..."
        fi
    elif [[ "$OS" == "linux" ]]; then
        # Try to detect package manager
        if command_exists apt-get; then
            sudo apt-get update
            sudo apt-get install -y nodejs npm
        elif command_exists yum; then
            sudo yum install -y nodejs npm
        elif command_exists dnf; then
            sudo dnf install -y nodejs npm
        else
            log_warning "Package manager not detected. Please install Node.js manually from https://nodejs.org/"
            read -p "Press Enter after installing Node.js..."
        fi
    else
        log_warning "Please install Node.js manually from https://nodejs.org/"
        read -p "Press Enter after installing Node.js..."
    fi
}

# Function to install Docker
install_docker() {
    log_info "Docker installation required for easy setup..."
    
    if [[ "$OS" == "macos" ]] || [[ "$OS" == "windows" ]]; then
        log_info "Please download and install Docker Desktop from:"
        log_info "https://www.docker.com/products/docker-desktop/"
        read -p "Press Enter after installing Docker Desktop..."
    elif [[ "$OS" == "linux" ]]; then
        log_info "Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        log_warning "Please log out and log back in for Docker permissions to take effect."
        read -p "Press Enter to continue..."
    fi
}

# Check prerequisites
log_info "Checking prerequisites..."

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    log_success "Node.js found: $NODE_VERSION"
    
    # Check if version is 18 or higher
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [[ $NODE_MAJOR -lt 18 ]]; then
        log_warning "Node.js version 18 or higher is recommended. Current: $NODE_VERSION"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
else
    log_warning "Node.js not found."
    read -p "Would you like to install Node.js automatically? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
        install_nodejs
    else
        log_error "Node.js is required. Please install it from https://nodejs.org/"
        exit 1
    fi
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    log_success "npm found: $NPM_VERSION"
else
    log_error "npm not found. Please reinstall Node.js."
    exit 1
fi

# Check Git
if command_exists git; then
    GIT_VERSION=$(git --version)
    log_success "Git found: $GIT_VERSION"
else
    log_warning "Git not found. Installing Git..."
    if [[ "$OS" == "macos" ]]; then
        if command_exists brew; then
            brew install git
        else
            log_error "Please install Git from https://git-scm.com/"
            exit 1
        fi
    elif [[ "$OS" == "linux" ]]; then
        if command_exists apt-get; then
            sudo apt-get install -y git
        elif command_exists yum; then
            sudo yum install -y git
        elif command_exists dnf; then
            sudo dnf install -y git
        fi
    fi
fi

# Check Docker (optional but recommended)
if command_exists docker; then
    DOCKER_VERSION=$(docker --version)
    log_success "Docker found: $DOCKER_VERSION"
    DOCKER_AVAILABLE=true
else
    log_warning "Docker not found."
    echo "Docker makes setup much easier and is highly recommended."
    read -p "Would you like to install Docker? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
        install_docker
        DOCKER_AVAILABLE=true
    else
        DOCKER_AVAILABLE=false
        log_info "Continuing without Docker (manual setup required)."
    fi
fi

echo
log_info "Prerequisites check complete!"
echo

# Setup method selection
if [[ "${PERSONALEA_AUTO_SETUP:-}" == "true" ]]; then
    # Auto-setup mode (called from bootstrap script)
    SETUP_METHOD="docker"
    log_info "Auto-setup mode: Using Docker setup (recommended)"
else
    # Interactive mode
    echo "Choose your setup method:"
    echo "1. Easy Setup (Docker - Recommended)"
    echo "2. Manual Setup (Local installation)"
    echo "3. Development Setup (For developers)"
    echo

    read -p "Enter your choice (1-3): " -n 1 -r
    echo
    echo

    case $REPLY in
        1)
            SETUP_METHOD="docker"
            ;;
        2)
            SETUP_METHOD="manual"
            ;;
        3)
            SETUP_METHOD="development"
            ;;
        *)
            log_error "Invalid choice. Exiting."
            exit 1
            ;;
    esac
fi

# Create installation directory
INSTALL_DIR="$HOME/PersonalEA"
log_info "PersonalEA will be installed in: $INSTALL_DIR"

if [[ -d "$INSTALL_DIR" ]]; then
    log_warning "Directory already exists."
    read -p "Remove existing installation? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$INSTALL_DIR"
        log_success "Removed existing installation."
    else
        log_error "Installation cancelled."
        exit 1
    fi
fi

# Clone repository
log_info "Downloading PersonalEA..."
git clone https://github.com/your-repo/personalEA.git "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Setup based on method
case $SETUP_METHOD in
    "docker")
        log_info "Setting up PersonalEA with Docker..."
        
        if [[ ! $DOCKER_AVAILABLE ]]; then
            log_error "Docker is required for easy setup but was not found."
            exit 1
        fi
        
        # Copy user configuration template
        cp docker-compose.user.yml.example docker-compose.user.yml
        cp .env.user.example .env.user
        
        log_info "Starting PersonalEA services..."
        docker-compose -f docker-compose.user.yml up -d
        
        log_success "PersonalEA is starting up!"
        log_info "Please wait 30-60 seconds for all services to be ready."
        
        # Wait for services
        log_info "Waiting for services to start..."
        sleep 30
        
        # Check if services are running
        if docker-compose -f docker-compose.user.yml ps | grep -q "Up"; then
            log_success "Services are running!"
            log_info "You can access PersonalEA at: http://localhost:3000"
            log_info "Follow the setup wizard to configure your assistant."
        else
            log_error "Services failed to start. Check logs with:"
            log_error "docker-compose -f docker-compose.user.yml logs"
        fi
        ;;
        
    "manual")
        log_info "Setting up PersonalEA manually..."
        
        # Install dependencies
        log_info "Installing dependencies..."
        npm install
        
        # Copy configuration templates
        cp .env.example .env
        
        # Build the application
        log_info "Building PersonalEA..."
        npm run build
        
        # Setup database (SQLite for simplicity)
        log_info "Setting up database..."
        npm run db:setup
        
        log_success "PersonalEA installed successfully!"
        log_info "To start PersonalEA, run: npm start"
        log_info "Then visit: http://localhost:3000"
        ;;
        
    "development")
        log_info "Setting up development environment..."
        
        # Run development setup
        ./scripts/setup-dev.sh
        
        log_success "Development environment ready!"
        log_info "To start development server: npm run dev"
        log_info "Visit: http://localhost:3000"
        ;;
esac

echo
log_success "Setup complete! 🎉"
echo
echo "Next steps:"
echo "1. Open your web browser to http://localhost:3000"
echo "2. Follow the setup wizard to configure your services"
echo "3. Connect your email and calendar accounts"
echo "4. Start using your personal AI assistant!"
echo
echo "Need help?"
echo "- Documentation: $INSTALL_DIR/docs/"
echo "- User Guide: $INSTALL_DIR/docs/user-installation-guide.md"
echo "- Support: https://github.com/your-repo/personalEA/issues"
echo

# Create desktop shortcut (optional)
read -p "Create desktop shortcut? (Y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
    if [[ "$OS" == "linux" ]]; then
        cat > "$HOME/Desktop/PersonalEA.desktop" << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=PersonalEA
Comment=Personal AI Assistant
Exec=xdg-open http://localhost:3000
Icon=$INSTALL_DIR/assets/icon.png
Terminal=false
Categories=Office;Productivity;
EOF
        chmod +x "$HOME/Desktop/PersonalEA.desktop"
        log_success "Desktop shortcut created!"
    elif [[ "$OS" == "macos" ]]; then
        log_info "You can bookmark http://localhost:3000 in your browser."
    fi
fi

log_success "Welcome to PersonalEA! Your personal AI assistant is ready to help you manage emails, goals, and calendar more efficiently."