# Schemathesis v4 Migration Guide

This document outlines the changes made to migrate the PersonalEA project from Schemathesis v3 to v4 compatibility.

## Overview

Schemathesis v4 introduced breaking changes that required updates to CLI commands and configuration. The migration was triggered by a GitHub notification about incompatible CLI options when installing Schemathesis v4.

## Changes Made

### 1. Package.json Script Updates

**Before (v3 syntax):**
```bash
schemathesis run docs/email-service-api-v1.yaml --base-url http://localhost:8083 --hypothesis-max-examples=50
```

**After (v4 syntax):**
```bash
schemathesis run docs/email-service-api-v1.yaml --url http://localhost:8083 --max-examples=50
```

### 2. CLI Option Migrations

| v3 Option | v4 Option | Status |
|-----------|-----------|---------|
| `--base-url` | `--url` | ✅ Updated |
| `--hypothesis-max-examples` | `--max-examples` | ✅ Updated |
| `--validate-schema` | Removed | ⚠️ No longer needed (validation improved) |
| `--verbosity` | Removed | ⚠️ No longer needed |

### 3. Documentation Updates

Updated [`docs/contract-testing.md`](contract-testing.md) to reflect v4 syntax:
- CLI examples now use `--url` instead of `--base-url`
- Configuration section updated with v4 parameters
- Removed references to deprecated options

## Key v4 Improvements

### Default Behavior Changes
- **All data generation modes run by default** (examples, fuzzing, coverage)
- **All available checks run by default** (no need to specify `--checks=all`)
- **Improved schema validation** (no need for `--validate-schema`)

### New Features
- **Test Phases Control**: Use `--phases=examples,fuzzing,coverage,stateful`
- **Better Reporting**: New `--report` option for multiple output formats
- **Enhanced Coverage**: Deterministic boundary value testing

## Testing the Migration

### Verify v4 Compatibility
```bash
# Test individual services
npm run test:contract:schemathesis

# Test with mock servers
npm run mock:docker
npm run test:contract:api
npm run mock:docker:stop
```

### Expected Behavior
- Commands should run without deprecation warnings
- Test coverage should be equivalent or better than v3
- All existing functionality should work as expected

## Rollback Plan

If issues arise, you can temporarily pin to Schemathesis v3:

```bash
# Install specific v3 version
pip install schemathesis==3.19.7

# Or add to requirements if using Python package management
echo "schemathesis==3.19.7" >> requirements.txt
```

Then revert the CLI syntax changes in [`package.json`](../package.json).

## Additional Resources

- [Official Schemathesis v4 Migration Guide](https://github.com/schemathesis/schemathesis/blob/master/MIGRATION.md)
- [Schemathesis v4 Release Notes](https://github.com/schemathesis/schemathesis/releases)
- [PersonalEA Contract Testing Guide](contract-testing.md)

## Migration Checklist

- [x] Update CLI commands in package.json
- [x] Update documentation examples
- [x] Remove deprecated configuration options
- [x] Test migration with mock servers
- [ ] Update CI/CD pipeline if needed
- [ ] Train team on new v4 features

## Notes

- The migration maintains backward compatibility for test results
- v4 provides better error reporting and test coverage
- No changes needed for Dredd or Pact configurations
- Mock server setup remains unchanged