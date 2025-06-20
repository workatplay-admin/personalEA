#!/bin/bash

# PersonalEA Version Tag Updater
# Automatically updates version tags in documentation to match Git tags

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Get the latest Git tag
get_latest_tag() {
    # Try to get the latest tag
    local latest_tag=$(git describe --tags --abbrev=0 2>/dev/null | tr -d '\n' || echo "")
    
    if [ -z "$latest_tag" ]; then
        # If no tags exist, create a default version
        latest_tag="v1.0.0"
        log_warning "No Git tags found, using default version: $latest_tag"
        echo "$latest_tag"
    else
        log_info "Latest Git tag found: $latest_tag"
        echo "$latest_tag"
    fi
}

# Get current commit hash (short)
get_commit_hash() {
    git rev-parse --short HEAD 2>/dev/null | tr -d '\n' || echo "unknown"
}

# Update version in file
update_version_in_file() {
    local file=$1
    local version=$2
    local commit_hash=$3
    
    if [ ! -f "$file" ]; then
        log_warning "File not found: $file"
        return 1
    fi
    
    log_info "Updating versions in $file"
    
    # Create backup
    cp "$file" "$file.bak"
    
    # Clean version strings (remove any newlines or whitespace)
    local clean_version=$(echo "$version" | tr -d '\n\r' | xargs)
    local clean_commit=$(echo "$commit_hash" | tr -d '\n\r' | xargs)
    
    # Replace version placeholders
    sed -i.bak "s/{{VERSION}}/$clean_version/g" "$file"
    sed -i.bak "s/{{LATEST_TAG}}/$clean_version/g" "$file"
    sed -i.bak "s/{{COMMIT_HASH}}/$clean_commit/g" "$file"
    
    # Replace GitHub URLs with versioned ones
    sed -i.bak "s|https://raw.githubusercontent.com/workatplay-admin/personalEA/main/|https://raw.githubusercontent.com/workatplay-admin/personalEA/$clean_version/|g" "$file"
    
    # Replace Docker image tags
    sed -i.bak "s|personalea:latest|personalea:$clean_version|g" "$file"
    sed -i.bak "s|personalea/web:latest|personalea/web:$clean_version|g" "$file"
    
    # Remove backup file
    rm -f "$file.bak"
    
    log_success "Updated $file with version $version"
}

# Restore file from backup
restore_file() {
    local file=$1
    if [ -f "$file.bak" ]; then
        mv "$file.bak" "$file"
        log_info "Restored $file from backup"
    fi
}

# Main function
main() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║              PersonalEA Version Tag Updater                  ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # Get version information
    local latest_tag=$(get_latest_tag)
    local commit_hash=$(get_commit_hash)
    
    log_info "Version: $latest_tag"
    log_info "Commit: $commit_hash"
    
    # Files to update
    local files_to_update=(
        "docs/user-installation-guide.md"
        "README.md"
        "scripts/bootstrap.sh"
        "docker-compose.user.yml"
        "docker-compose.user.yml.example"
        ".github/workflows/user-installation-test.yml"
    )
    
    # Update each file
    local updated_files=()
    local failed_files=()
    
    for file in "${files_to_update[@]}"; do
        if update_version_in_file "$file" "$latest_tag" "$commit_hash"; then
            updated_files+=("$file")
        else
            failed_files+=("$file")
        fi
    done
    
    # Report results
    echo
    if [ ${#updated_files[@]} -gt 0 ]; then
        log_success "Successfully updated ${#updated_files[@]} files:"
        for file in "${updated_files[@]}"; do
            echo "  ✅ $file"
        done
    fi
    
    if [ ${#failed_files[@]} -gt 0 ]; then
        log_warning "Failed to update ${#failed_files[@]} files:"
        for file in "${failed_files[@]}"; do
            echo "  ❌ $file"
        done
    fi
    
    echo
    log_info "Version alignment complete!"
    log_info "All documentation now references version: $latest_tag"
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "PersonalEA Version Tag Updater"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --dry-run, -n  Show what would be updated without making changes"
        echo "  --restore, -r  Restore files from backup"
        echo ""
        echo "This script updates version placeholders in documentation to match Git tags."
        exit 0
        ;;
    --dry-run|-n)
        log_info "DRY RUN MODE - No files will be modified"
        # Override update function to just show what would be done
        update_version_in_file() {
            local file=$1
            local version=$2
            echo "Would update $file with version $version"
        }
        ;;
    --restore|-r)
        log_info "Restoring files from backup..."
        files_to_restore=(
            "docs/user-installation-guide.md"
            "README.md"
            "scripts/bootstrap.sh"
            "docker-compose.user.yml"
            "docker-compose.user.yml.example"
            ".github/workflows/user-installation-test.yml"
        )
        for file in "${files_to_restore[@]}"; do
            restore_file "$file"
        done
        exit 0
        ;;
esac

# Run main function
main