# Agent-Specific Instructions

## Code-Analyzer Agent

### Priority Tasks:
1. **Examine buildTranslationPrompt() method** (lines 251-292)
   - Look for instructions that encourage AI to add information
   - Find where "convert it into SMART format" language is used
   - Check if there are constraints against adding new information

2. **Trace confidence calculation flow**:
   - Start at parseAIResponse() (line 392)
   - Follow to where confidence values are set
   - Check if there's any validation of confidence vs actual input

3. **Search for default timeframe logic**:
   - Check if there are any default values for deadlines
   - Look for "2 years", "24 months" patterns
   - Examine timeBound handling in smartCriteria

### Expected Deliverables:
- Code flow diagram showing where augmentation happens
- List of all prompt templates that need modification
- Confidence calculation algorithm analysis

---

## Pattern-Detective Agent

### Search Patterns to Use:
```bash
# Timeframe patterns
grep -r "2.*year\|24.*month\|default.*timeframe" --include="*.ts" --include="*.js"

# Confidence patterns  
grep -r "confidence.*0\.9\|0\.9.*confidence\|90.*percent" --include="*.ts" --include="*.js"

# Augmentation patterns
grep -r "improve\|enhance\|convert\|refine\|transform" --include="*.ts" services/goal-strategy/
```

### Focus Areas:
1. OpenAI prompt templates
2. Default values in code
3. Mock data patterns
4. Test expectations vs reality

### Expected Deliverables:
- List of all files containing problematic patterns
- Specific line numbers and code snippets
- Pattern frequency analysis

---

## Test-Auditor Agent

### Test Files to Analyze:
1. `/testing/goal-strategy-test/tests/e2e/interactive-smart-goal-flow.spec.ts`
2. `/testing/goal-strategy-test/tests/e2e/automated-user-testing.spec.ts`
3. `/testing/goal-strategy-test/tests/e2e/fixtures/test-data.ts`

### Key Questions:
1. Do tests verify that goals aren't automatically augmented?
2. Are there tests for confidence score validation?
3. Do mock responses set unrealistic expectations?
4. What test coverage is missing?

### Expected Deliverables:
- Test coverage report for augmentation scenarios
- List of tests that should exist but don't
- Mock data issues and recommendations

---

## Phase 2 Agents (When Activated)

### AI-Prompt-Analyst:
- Deep dive into all OpenAI prompts
- Identify language that encourages augmentation
- Suggest prompt rewrites

### Confidence-Calculator:
- Mathematical analysis of confidence scoring
- Correlation between user input and confidence
- Validation logic recommendations

### Timeframe-Investigator:
- Trace exact source of 2-year additions
- OpenAI response patterns
- User input validation gaps

---

## Communication Protocol

1. Store all findings in: `/memory/data/swarm-auto-centralized-1750974337538/[agent-name]/`
2. Update status after each task completion
3. Flag any blockers immediately
4. Use these formats:
   - Findings: `findings.json` or `findings.md`
   - Code analysis: `code-analysis.json`
   - Recommendations: `recommendations.md`

## Critical Success Factors

1. **Identify exact code locations** causing the issues
2. **Provide concrete evidence** (code snippets, line numbers)
3. **Suggest specific fixes** not just problem identification
4. **Consider user experience** in all recommendations

---

*Remember: The goal is to ensure the system respects user input and doesn't make assumptions about what users want.*