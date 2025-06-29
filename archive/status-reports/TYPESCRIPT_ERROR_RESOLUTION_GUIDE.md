# TypeScript Error Resolution Guide

## Best Practices for Resolving TypeScript Errors in Large Codebases

### 1. Systematic Approach

#### Step 1: Categorize Errors
- **Type mismatches** (TS2322, TS2345)
- **Missing properties** (TS2339, TS2353)
- **Module resolution** (TS2307)
- **Function signature issues** (TS2554, TS2555)
- **Interface/Type conflicts** (TS2561)

#### Step 2: Prioritize Fixes
1. **Build-blocking errors** first (module resolution, missing types)
2. **Type safety errors** second (incorrect types, missing properties)
3. **Warnings and linting** last

### 2. Common Error Patterns & Solutions

#### Type Mismatches (TS2322)
**Problem**: Type 'X' is not assignable to type 'Y'
**Solutions**:
- Verify actual vs expected types
- Add type assertions when safe
- Update type definitions to match usage
- Use union types for flexible values

#### Missing Properties (TS2339)
**Problem**: Property 'X' does not exist on type 'Y'
**Solutions**:
- Add property to interface/type
- Use optional chaining (?.)
- Type guards to narrow types
- Update Prisma schema if database-related

#### Module Resolution (TS2307)
**Problem**: Cannot find module 'X'
**Solutions**:
- Check import paths and aliases
- Verify tsconfig paths configuration
- Install missing @types packages
- Create declaration files for untyped modules

### 3. Tooling & Automation

#### Use TypeScript Compiler Options
```json
{
  "compilerOptions": {
    "noImplicitAny": false,  // Temporarily during migration
    "strictNullChecks": true,
    "skipLibCheck": true,    // Skip type checking of dependencies
    "allowJs": true,         // Allow gradual migration
  }
}
```

#### Automated Tools
- `npx tsc --noEmit` - Check types without building
- `npx tsc --listFiles` - Find all included files
- `npx tsc --generateTrace` - Performance debugging
- `npx @typescript-eslint/typescript-estree` - AST analysis

### 4. Migration Strategy

#### Phase 1: Stop the Bleeding
1. Fix module resolution errors
2. Add missing type declarations
3. Use `any` temporarily for complex issues
4. Document TODOs for proper fixes

#### Phase 2: Type Safety
1. Replace `any` with proper types
2. Fix type mismatches
3. Add missing properties
4. Enable stricter compiler options

#### Phase 3: Optimization
1. Remove unnecessary type assertions
2. Improve type inference
3. Add generic constraints
4. Document complex types

### 5. Prisma-Specific Issues

#### Common Problems:
- Schema drift between Prisma and code
- Generated types not matching usage
- Missing relations in queries

#### Solutions:
1. Run `npx prisma generate` after schema changes
2. Use `include` for relations in queries
3. Keep schema and code synchronized
4. Use Prisma's type utilities

### 6. Testing Strategy

#### Type Testing
```typescript
// Type tests
type _Test1 = AssertEqual<ActualType, ExpectedType>;
type _Test2 = AssertExtends<ChildType, ParentType>;
```

#### Runtime Validation
- Use zod for runtime type validation
- Add type guards for external data
- Validate API responses

### 7. Documentation

#### Type Documentation
```typescript
/**
 * Represents a SMART goal with validation
 * @param T - The type of metadata attached
 */
interface SmartGoal<T = unknown> {
  // ...
}
```

### 8. CI/CD Integration

#### Pre-commit Hooks
```bash
# .husky/pre-commit
npx tsc --noEmit
```

#### GitHub Actions
```yaml
- name: Type Check
  run: npm run typecheck
```

### 9. Common Fixes Reference

| Error Code | Common Fix |
|------------|------------|
| TS2322 | Update type definition or add type assertion |
| TS2339 | Add property to interface or use type guard |
| TS2345 | Fix function arguments or update signature |
| TS2307 | Fix import path or install types |
| TS2561 | Use correct property name or update interface |

### 10. Emergency Fixes

When you need to ship quickly:
1. Use `// @ts-ignore` sparingly with TODO comments
2. Cast to `any` as temporary fix
3. Create tech debt tickets
4. Plan proper fixes in next sprint

Remember: The goal is to have zero TypeScript errors while maintaining type safety and developer experience.