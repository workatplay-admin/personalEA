#!/bin/bash

# PersonalEA Bootstrap Script (Version [1;33m⚠️ No Git tags found, using default version: v1.0.0[0mv1.0.0)
# The one command to install PersonalEA

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}${BOLD}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║                    PersonalEA Bootstrap                      ║
║                                                               ║
║              Your Personal AI Assistant                      ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${BOLD}🚀 Installing PersonalEA - Your Personal AI Assistant${NC}"
echo

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}❌ This script should not be run as root for security reasons.${NC}"
   exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Detect operating system
OS="unknown"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    OS="windows"
fi

echo -e "${BLUE}ℹ️  Detected OS: $OS${NC}"

# Create installation directory
INSTALL_DIR="$HOME/PersonalEA"
echo -e "${BLUE}ℹ️  Installing to: $INSTALL_DIR${NC}"

# Remove existing installation if it exists
if [[ -d "$INSTALL_DIR" ]]; then
    echo -e "${YELLOW}⚠️  Existing installation found. Removing...${NC}"
    rm -rf "$INSTALL_DIR"
fi

# Check for Git
if ! command_exists git; then
    echo -e "${RED}❌ Git is required but not installed.${NC}"
    echo -e "${YELLOW}Please install Git first:${NC}"
    if [[ "$OS" == "macos" ]]; then
        echo "  brew install git"
    elif [[ "$OS" == "linux" ]]; then
        echo "  sudo apt-get install git  # Ubuntu/Debian"
        echo "  sudo yum install git      # CentOS/RHEL"
    else
        echo "  Download from: https://git-scm.com/"
    fi
    exit 1
fi

# Clone repository
echo -e "${BLUE}ℹ️  Downloading PersonalEA (version [1;33m⚠️ No Git tags found, using default version: v1.0.0[0mv1.0.0)...${NC}"
git clone https://github.com/workatplay-admin/personalEA.git "$INSTALL_DIR" 2>/dev/null || {
    echo -e "${RED}❌ Failed to download PersonalEA. Please check your internet connection.${NC}"
    exit 1
}

cd "$INSTALL_DIR"

# Checkout specific version tag
echo -e "${BLUE}ℹ️  Switching to version [1;33m⚠️ No Git tags found, using default version: v1.0.0[0mv1.0.0...${NC}"
git checkout [1;33m⚠️ No Git tags found, using default version: v1.0.0[0mv1.0.0 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Version [1;33m⚠️ No Git tags found, using default version: v1.0.0[0mv1.0.0 not found, using main branch${NC}"
}

# Make setup script executable
chmod +x scripts/setup-user.sh

# Run the main setup script
echo -e "${GREEN}✅ Download complete! Running setup...${NC}"
echo

# Run setup script with auto-confirmation for Docker setup
export PERSONALEA_AUTO_SETUP=true
./scripts/setup-user.sh

echo
echo -e "${GREEN}${BOLD}🎉 PersonalEA installation complete!${NC}"
echo
echo -e "${BOLD}Next steps:${NC}"
echo "1. Open your browser to: ${BLUE}http://localhost:3000${NC}"
echo "2. Follow the setup wizard to configure your services"
echo "3. Connect your email and calendar accounts"
echo "4. Start using your personal AI assistant!"
echo
echo -e "${BOLD}Need help?${NC}"
echo "• Documentation: $INSTALL_DIR/docs/"
echo "• User Guide: $INSTALL_DIR/docs/user-installation-guide.md"
echo "• FAQ: $INSTALL_DIR/docs/faq.md"
echo "• Support: https://github.com/workatplay-admin/personalEA/issues"
echo
echo -e "${GREEN}${BOLD}Welcome to PersonalEA! 🎉${NC}"