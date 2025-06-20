# Version Alignment System

## Overview

PersonalEA implements an automated version alignment system that ensures all documentation, scripts, and configuration files reference the correct version tags. This prevents the common problem where documentation becomes outdated and references non-existent files or container images.

## How It Works

### 1. Version Placeholders

All documentation and configuration files use placeholder variables:

- `{{VERSION}}` - The current version tag (e.g., `v1.2.3`)
- `{{LATEST_TAG}}` - Same as VERSION, used for Git tag references
- `{{COMMIT_HASH}}` - Short commit hash for the current version

### 2. Automatic Updates

When a new Git tag is created, the system automatically:

1. **Detects the new tag** via GitHub Actions workflow
2. **Updates all placeholders** in documentation and config files
3. **Commits the changes** back to the repository
4. **Creates release notes** with proper version references

### 3. Files That Get Updated

The version alignment system updates these files:

- `docs/user-installation-guide.md` - Installation instructions
- `README.md` - Main project documentation
- `scripts/bootstrap.sh` - One-command installer
- `docker-compose.user.yml` - Production Docker configuration
- `docker-compose.user.yml.example` - Template configuration
- `.github/workflows/user-installation-test.yml` - CI/CD pipeline

## Usage

### Manual Version Update

To manually update version references:

```bash
# Update all version placeholders
npm run update-versions

# Check current version
npm run version:check
```

### Creating a New Release

1. **Create and push a new tag:**
   ```bash
   git tag v1.2.3
   git push origin v1.2.3
   ```

2. **Automatic process triggers:**
   - GitHub Actions detects the new tag
   - Version alignment workflow runs
   - All documentation is updated
   - Changes are committed back to main branch
   - Release notes are generated

### Version Alignment Workflow

The `.github/workflows/version-sync.yml` workflow:

- **Triggers:** On new Git tags (`v*`)
- **Actions:**
  - Checks out the repository
  - Runs the version update script
  - Commits changes if any files were modified
  - Creates or updates GitHub release with proper notes

## Benefits

### 1. Always Valid References

- Documentation always points to existing files
- Container images reference actual tagged versions
- Download URLs never return 404 errors

### 2. Consistent User Experience

- Users get stable, tested versions
- Installation commands work reliably
- No confusion about which version to use

### 3. Automated Maintenance

- No manual updates required
- Reduces human error
- Ensures consistency across all files

## Implementation Details

### Version Update Script

The `scripts/update-version-tags.sh` script:

```bash
# Get latest Git tag
LATEST_TAG=$(git describe --tags --abbrev=0)

# Update placeholders in files
sed -i "s/{{VERSION}}/$LATEST_TAG/g" file.md
sed -i "s/{{LATEST_TAG}}/$LATEST_TAG/g" file.md

# Update GitHub URLs to use specific version
sed -i "s|/main/|/$LATEST_TAG/|g" file.md
```

### Placeholder Examples

**Before (with placeholders):**
```bash
curl -sL https://raw.githubusercontent.com/workatplay-admin/personalEA/{{LATEST_TAG}}/scripts/bootstrap.sh | bash
```

**After (version v1.2.3):**
```bash
curl -sL https://raw.githubusercontent.com/workatplay-admin/personalEA/v1.2.3/scripts/bootstrap.sh | bash
```

## Best Practices

### 1. Use Placeholders in New Files

When creating new documentation or scripts, always use version placeholders:

```markdown
# Good
Download: https://raw.githubusercontent.com/workatplay-admin/personalEA/{{LATEST_TAG}}/file.txt

# Bad
Download: https://raw.githubusercontent.com/workatplay-admin/personalEA/main/file.txt
```

### 2. Test Before Tagging

Always test the version update process before creating official releases:

```bash
# Test the update script
npm run update-versions

# Check what would change
git diff

# Restore if needed
git checkout -- .
```

### 3. Semantic Versioning

Use semantic versioning for tags:

- `v1.0.0` - Major release
- `v1.1.0` - Minor release with new features
- `v1.1.1` - Patch release with bug fixes

## Troubleshooting

### Version Update Fails

If the version update script fails:

1. **Check Git tags exist:**
   ```bash
   git tag -l
   ```

2. **Manually run the script:**
   ```bash
   ./scripts/update-version-tags.sh
   ```

3. **Check for sed errors:**
   - Ensure no special characters in version tags
   - Verify file permissions

### Workflow Not Triggering

If the GitHub Actions workflow doesn't run:

1. **Check tag format:** Must start with `v` (e.g., `v1.0.0`)
2. **Verify workflow file:** Check `.github/workflows/version-sync.yml`
3. **Check repository permissions:** Ensure Actions can write to repository

### Inconsistent Versions

If some files have different versions:

1. **Run manual update:**
   ```bash
   npm run update-versions
   ```

2. **Check for merge conflicts:**
   ```bash
   git status
   git diff
   ```

3. **Restore and retry:**
   ```bash
   git checkout -- .
   npm run update-versions
   ```

## Security Considerations

### 1. Stable References

Version alignment ensures users download from stable, tested releases rather than potentially unstable main branch.

### 2. Integrity Verification

Each version is tied to a specific Git commit, allowing verification of file integrity.

### 3. Controlled Updates

Users can choose when to update to newer versions rather than automatically getting latest changes.

## Safe Deployment for Home Users

### Upgrade Path (Roll Forward)
```bash
# Pull latest images and restart - your data stays safe
docker compose pull && docker compose up -d
```

### Rollback Path
```bash
# If something goes wrong, roll back to a specific version
docker compose down && docker compose -f docker-compose.user.yml up -d v1.2.3
```

This approach ensures home users can confidently update their live setup without fear of breaking their PersonalEA installation. Your data and configuration remain intact during both upgrades and rollbacks.

## Future Enhancements

### 1. Version Badges

Add dynamic version badges to README:

```markdown
![Version](https://img.shields.io/github/v/tag/workatplay-admin/personalEA)
```

### 2. Changelog Generation

Automatically generate changelogs from Git commits and pull requests.

### 3. Multi-Environment Support

Support different version references for development, staging, and production environments.

---

This version alignment system ensures PersonalEA maintains professional, reliable documentation that always works for end users, regardless of when they discover and install the project.