# Project-Specific Information for PromptForge

## MANDATORY: Always Use Specialized Agents

### Agent Usage Requirements
**CRITICAL**: You MUST use the appropriate specialized agent for EVERY task. Direct implementation without using agents is FORBIDDEN.

#### Available Agents and Their Purposes:

1. **fullstack-nodejs-engineer**
   - Use for: ALL implementation tasks involving Node.js, Next.js, React, TypeScript
   - Includes: Component creation, API endpoints, database operations, UI implementation
   - DO NOT write code directly - delegate to this agent

2. **security-vulnerability-scanner**
   - Use for: Code security reviews, authentication checks, vulnerability assessments
   - Run after: Implementing auth features, handling user data, API endpoints

3. **git-workflow-manager**
   - Use for: ALL Git operations including commits, branches, PRs
   - NEVER use git commands directly - always delegate to this agent

4. **test-automation-engineer**
   - Use for: Creating unit tests, integration tests, E2E tests
   - Run after: Implementing new features or fixing bugs

5. **project-orchestrator** (PLANNER ONLY - NO CODE)
   - Use for: Planning and coordinating complete workflows
   - ONLY ALLOWED TO: Create plans, delegate tasks, coordinate agents
   - STRICTLY FORBIDDEN: Writing ANY code, using Edit/Write tools, implementing features
   - MUST DELEGATE ALL CODE TO: fullstack-nodejs-engineer
   - Example: "Plan task → Delegate coding to fullstack-nodejs-engineer → Coordinate testing"

6. **docs-architect**
   - Use for: Creating/updating documentation, API docs, README files
   - Run after: Implementing new features or changing APIs

7. **code-quality-inspector**
   - Use for: Code review, quality checks, best practices validation
   - Run after: Writing new code or making significant changes

### Enforcement Rules:
1. **NO DIRECT IMPLEMENTATION** - You must NEVER write code directly
2. **ALWAYS DELEGATE** - Use the appropriate agent for every task
3. **PROJECT-ORCHESTRATOR CANNOT CODE** - This agent is ONLY for planning and delegation
4. **ALL CODE GOES TO FULLSTACK-NODEJS-ENGINEER** - Every single line of code
5. **QUALITY GATES** - Use code-quality-inspector after implementations
6. **DOCUMENTATION** - Use docs-architect after feature completion
7. **TESTING** - Use test-automation-engineer for all test creation

### RED FLAGS - When project-orchestrator is doing it WRONG:
- Using Edit, Write, or MultiEdit tools
- Writing TypeScript, JavaScript, React code
- Creating or modifying files directly
- Implementing features instead of delegating

### Example Workflow:
```
User Request → project-orchestrator:
  1. PLANS the task (no coding)
  2. DELEGATES implementation → fullstack-nodejs-engineer
  3. WAITS for completion
  4. DELEGATES testing → test-automation-engineer
  5. COORDINATES review → code-quality-inspector
  6. ENSURES documentation → docs-architect
  7. MANAGES Git workflow → git-workflow-manager

If project-orchestrator writes even ONE line of code = VIOLATION
```

### Correct project-orchestrator behavior:
✅ "I'll delegate the implementation to fullstack-nodejs-engineer"
✅ "Let me create a plan and assign tasks to specialized agents"
✅ "I'll coordinate between the agents to ensure quality"

### WRONG project-orchestrator behavior:
❌ "Let me implement this feature"
❌ "I'll create this component"
❌ "Here's the code for that"
❌ Using any code editing tools

## Test Credentials
- **Email**: pascal@watteel.com
- **Password**: Jbz49teq01!

Use these credentials when testing the application or taking screenshots of authenticated pages.

## MANDATORY Testing Requirements

### After EVERY code change:
1. **TEST YOUR CHANGES IMMEDIATELY** - Use Playwright to verify the changes work
2. **CHECK FOR ERRORS** - Always check console logs for errors using `mcp__playwright__playwright_console_logs`
3. **TAKE SCREENSHOTS** - Capture visual proof that changes are working correctly
4. **VERIFY NO REGRESSIONS** - Ensure existing functionality still works

### Testing Checklist:
- [ ] Run the code and navigate to affected pages
- [ ] Check browser console for any errors (especially hydration errors)
- [ ] Verify visual appearance matches requirements
- [ ] Test in both light and dark modes
- [ ] Confirm no TypeScript or build errors
- [ ] Validate responsive behavior if applicable

### Common Issues to Check:
- Hydration mismatches (Next.js SSR issues)
- Console errors (500 errors, failed resources)
- Visual regressions
- Dark mode color inconsistencies
- Component functionality breaks

**IMPORTANT**: Never mark a task as complete without thorough testing. If you make changes and don't test them, you MUST go back and test before proceeding to the next task.

## CRITICAL SERVER RULES

### NEVER START THE DEV SERVER
- **DO NOT** run `npm run dev`, `npm start`, `yarn dev`, or any command that starts a server
- **DO NOT** attempt to restart the development server
- **ALWAYS** ask the user to start/restart the server when needed
- If you encounter server errors, build errors, or need a restart, inform the user and ask them to restart

### When Server Restart is Needed:
1. After clearing `.next` cache
2. After major configuration changes
3. When encountering build manifest errors
4. After installing new dependencies

**Example**: "I've cleared the build cache. Please restart your development server by running `npm run dev`"