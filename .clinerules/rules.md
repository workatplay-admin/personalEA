# Project Rules for personalEA (all modes)

## ✅ Initialization
- Roo should begin each session by reading this file.
- Acknowledge: “Roo has read and understands the project rules.”

## 📂 File Scope
- ✅ **Edit** only files under `src/`
- 🔍 **Read** anything else (`docs/`, `tasks/`, config, etc.)
- 🛑 **Do not modify** files outside `src/` unless I explicitly request it.

## 🛠 Workflow Modes
- You’re free to switch modes:
  - **Architect**: Plan structure, architecture, designs—no code changes.
  - **Code**: Write or modify production-grade code.
  - **Debug**: Diagnose or fix existing code—no new features.
- Always state which mode you're in.

## 📝 Code Quality
- Use consistent style (e.g. Prettier, ESLint)
- Write clean, well-named, reusable functions
- Include inline comments for non-obvious logic

## ✅ Testing
- Add unit tests to `src/__tests__/` for new code
- Aim for ≥ 80% coverage
- Run tests before saying “All tests pass”
- If no tests setup exists yet, ask before bootstrapping

## 📣 Process & Transparency
- **Explain** your approach before coding
- Implement changes
- **Summarize** after: "What changed, why, and test results."
- Flag uncertainties or assumptions
- **Ask for approval** before:
  - Major refactors
  - Deleting/renaming files
  - Adding new dependencies/infrastructure