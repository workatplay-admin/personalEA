# TypeScript Fix Plan

## Error Analysis Summary

### Error Categories:
1. **Return Type Mismatches (TS2322)** - 13 occurrences
   - Routes returning Response when declared as void
   
2. **Prisma Model Issues (TS2339, TS2353)** - 20 occurrences
   - Missing `goalConversation` model
   - Missing `include` relations (goal, tasks, progress)
   - Missing properties (conversationId, confidence)

3. **Module Resolution (TS2307, TS2305)** - 4 occurrences
   - Module '../types/smart-goals' not found
   - ConversationMessage not exported

4. **Property Name Mismatches (TS2551, TS2561)** - 5 occurrences
   - `predecessorId` should be `predecessorTaskId`
   - `successorId` should be `successorTaskId`

5. **Type Compatibility (TS2345)** - 2 occurrences
   - Optional properties when required

## Fix Priority Order

### Phase 1: Build Blockers (Immediate)
1. Fix module resolution issues
2. Create missing type files
3. Fix Prisma schema alignment

### Phase 2: Type Safety (Next)
1. Fix return type mismatches
2. Fix property name mismatches
3. Fix type compatibility issues

### Phase 3: Clean Up (Final)
1. Remove unnecessary type assertions
2. Add proper type exports
3. Update tests

## Detailed Fix Plan

### 1. Module Resolution Fixes

**Issue**: `../types/smart-goals` module not found
**Solution**: 
- Check if file exists at correct path
- If not, create it with proper exports
- Update import paths if needed

**Issue**: `ConversationMessage` not exported from goal.ts
**Solution**:
- Add export to goal.ts
- Or create in smart-goals.ts if more appropriate

### 2. Prisma Schema Fixes

**Issue**: Missing `goalConversation` model
**Solution**:
```prisma
model GoalConversation {
  id            String   @id @default(cuid())
  conversationId String  @unique
  goalId        String?
  messages      Json
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  goal          Goal?    @relation(fields: [goalId], references: [id])
}
```

**Issue**: Missing relations in queries
**Solution**:
```typescript
// Add include to queries
const milestone = await prisma.milestone.findUnique({
  where: { id },
  include: {
    goal: true,
    tasks: true,
    progress: true
  }
});
```

### 3. Return Type Fixes

**Issue**: Functions returning Response when declared as void
**Solution**:
```typescript
// Change function signatures from:
async function handler(req: Request, res: Response): Promise<void> {
  return res.status(400).json({ error }); // Error!
}

// To:
async function handler(req: Request, res: Response): Promise<Response> {
  return res.status(400).json({ error }); // OK!
}
```

### 4. Property Name Fixes

**Issue**: `predecessorId` vs `predecessorTaskId`
**Solution**:
```typescript
// Change all occurrences from:
predecessorId: validatedDependency.predecessorId

// To:
predecessorTaskId: validatedDependency.predecessorTaskId
```

### 5. Type Compatibility Fixes

**Issue**: Optional properties when required
**Solution**:
```typescript
// Filter and ensure required properties
const validMessages = messages
  .filter((msg): msg is { role: string; content: string } => 
    msg.role !== undefined && msg.content !== undefined
  );
```

## Execution Steps

### Step 1: Create Missing Types (5 min)
```bash
# Create smart-goals types if missing
touch services/goal-strategy/src/types/smart-goals.ts
```

### Step 2: Update Prisma Schema (10 min)
```bash
# Update schema
# Run prisma generate
cd services/goal-strategy && npx prisma generate
```

### Step 3: Fix Route Return Types (15 min)
- Update all route handlers to return Promise<Response>
- Remove Promise<void> declarations

### Step 4: Fix Property Names (10 min)
- Global find/replace for predecessorId -> predecessorTaskId
- Fix successorId references

### Step 5: Fix Prisma Queries (20 min)
- Add proper includes to all queries
- Fix property references

### Step 6: Verify Fixes (10 min)
```bash
# Run type check
cd services/goal-strategy && npx tsc --noEmit
```

## Expected Outcome
- Zero TypeScript errors
- Successful build
- Type-safe codebase
- Aligned Prisma schema

Total Estimated Time: 70 minutes