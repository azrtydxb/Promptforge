# Claude Code Configuration - Development Environment

## 🚨 Critical: Parallel Execution Rules

**GOLDEN RULE**: Always batch ALL operations in ONE message, never sequential.

### Mandatory Concurrent Patterns:
- **TodoWrite**: Batch 5-10+ todos in ONE call
- **Task spawning**: ALL agents in ONE message  
- **File operations**: Batch ALL reads/writes/edits
- **Bash commands**: Group ALL terminal operations

### ✅ Correct (Parallel):
```javascript
[Single Message]:
  - TodoWrite { todos: [10+ todos] }
  - Task("Agent 1", "full instructions", "type")
  - Task("Agent 2", "full instructions", "type")
  - Read("file1.js"), Read("file2.js")
  - Write("output1.js"), Write("output2.js")
  - Bash("npm install"), Bash("npm test")
```

### ❌ Wrong (Sequential):
```javascript
Message 1: TodoWrite { single todo }
Message 2: Task("Agent 1")
Message 3: Read("file1.js")
// 3x slower, breaks coordination!
```

## Project Overview

Next.js application with TypeScript, Tailwind CSS, PostgreSQL (Supabase), and Prisma ORM.

### Core Commands
```bash
npm run dev      # Start development server
npm run build    # Build project
npm run test     # Run tests
npm run lint     # Linting
npm run typecheck # Type checking
```

## Key Principles

### 🚨 MANDATORY: Agent-First Approach

**CRITICAL RULE**: ALWAYS delegate tasks to specialized agents. NEVER execute changes directly in the main conversation.

**Why**: Direct execution pollutes the context window and reduces efficiency. Agents work in isolated contexts and report back concisely.

**When to use agents**:
- ✅ ALL code changes (use `coder`, `fullstack-nodejs-engineer`, etc.)
- ✅ ALL UI changes (use `ux-ui-designer`, `coder`)
- ✅ ALL testing tasks (use `qa-test-automation-engineer`, `tester`)
- ✅ ALL documentation (use `docs-architect`)
- ✅ ALL refactoring (use `code-analyzer`, `coder`)
- ✅ ALL bug fixes (use appropriate specialized agent)
- ✅ Even "simple" one-file changes (delegate to maintain clean context)

**When NOT to use agents**:
- ❌ Simple file reads for information gathering
- ❌ Running linting/type checking commands
- ❌ Creating GitHub issues
- ❌ Git operations (commit, push)

### Agent Orchestration
When using multiple agents:
1. **ALWAYS spawn ALL agents in ONE message** using Task tool
2. Include clear instructions in EVERY agent prompt
3. Batch all related operations together
4. Launch agents in parallel whenever possible

### Agent Task Template
```javascript
Task("You are [type] agent.
Your specific task: [detailed task description]
Requirements:
- [requirement 1]
- [requirement 2]
Context: [relevant context about the codebase]
Files to modify: [list specific files]
Validation: [how to verify the change works]
Output: [expected output format]")
```

### Parallel Agent Launch Example
```javascript
// ✅ CORRECT: Launch all agents in ONE message
[Single Message]:
  - Task("coder", "Fix authentication in login.tsx...", "coder")
  - Task("tester", "Create tests for authentication...", "qa-test-automation-engineer")
  - Task("docs", "Update auth documentation...", "docs-architect")

// ❌ WRONG: Sequential agent launches
Message 1: Task("coder", "Fix authentication...")
Message 2: Task("tester", "Create tests...")
Message 3: Task("docs", "Update docs...")
```

## Available Agents (54 Total)

### Core Development
`coder`, `reviewer`, `tester`, `planner`, `researcher`

### Specialized Development
`backend-dev`, `mobile-dev`, `ml-developer`, `cicd-engineer`, `api-docs`, `system-architect`, `code-analyzer`, `base-template-generator`

### Testing & Validation
`qa-test-automation-engineer`, `tdd-london-swarm`, `production-validator`

### Performance & Optimization
`perf-analyzer`, `performance-benchmarker`, `task-orchestrator`

### Security & Quality
`security-analyst`, `code-analyzer`, `reviewer`

### Design & Architecture
`ux-ui-designer`, `system-architect`, `architecture`

### Product & Planning
`product-manager`, `planner`, `specification`

## Dynamic Agent Selection

### Rules:
1. **Simple tasks** (1-3 components): 1-2 agents
2. **Medium tasks** (4-6 components): 3-4 agents  
3. **Complex tasks** (7+ components): 5-8 agents

### Task Examples:
- **Bug fix**: 1 agent (coder)
- **New feature**: 2-3 agents (planner, coder, tester)
- **Full system**: 5-8 agents (architect, backend-dev, frontend-dev, tester, reviewer)

## Visual Progress Format

```
📊 Progress Overview
├── Total: X | ✅ Complete: X | 🔄 Active: X | ⭕ Todo: X
└── Priority: 🔴 HIGH | 🟡 MEDIUM | 🟢 LOW

🔄 In Progress:
├── Task 1 [HIGH] ▶
└── Task 2 [MEDIUM] ↳ 2 deps

✅ Completed:
└── Task 3 ✓
```

## Best Practices

### ✅ DO:
- **ALWAYS delegate code changes to agents** - Never execute directly in main conversation
- **Launch ALL agents in parallel** in ONE message whenever possible
- Batch ALL related operations
- Use parallel execution always
- Clear task descriptions with full context for agents
- Monitor progress with TodoWrite
- Run tests before committing
- **FOLLOW USER INSTRUCTIONS EXACTLY** - Read and execute every step as written
- **ALWAYS validate UI changes with Chrome DevTools MCP** before confirming completion
- Use DevTools to inspect computed styles, colors, layouts, and verify visual changes
- Never claim a UI change is "done" or "working" without DevTools validation

### ❌ DON'T:
- **NEVER execute code changes directly** - Always use agents to avoid context pollution
- **NEVER launch agents sequentially** - Always batch in one message
- Send sequential messages
- Update todos individually
- Spawn agents one by one
- Skip testing
- Create unnecessary files
- **NEVER make assumptions or skip steps in user instructions**
- **NEVER kill processes without explicit permission**
- **NEVER claim UI changes work without DevTools validation**
- **NEVER pollute context window** with direct code execution

## UI Validation Requirements

**CRITICAL**: All UI changes MUST be validated using Chrome DevTools MCP before reporting completion.

### Validation Workflow:
1. Make the code change
2. Use `mcp__chrome-devtools__navigate_page` to load the page
3. Use `mcp__chrome-devtools__take_snapshot` or `mcp__chrome-devtools__take_screenshot` to inspect
4. Use `mcp__chrome-devtools__evaluate_script` to check computed styles if needed
5. Verify the change visually matches requirements
6. Only then report the change as complete

### What to Validate:
- Colors and backgrounds (check actual RGB/HSL values)
- Element visibility (opacity, display, z-index)
- Layout and positioning
- Responsive behavior
- Hover/focus states
- Border and shadow styles

### Example:
```javascript
// After changing a divider color:
1. Navigate to page: mcp__chrome-devtools__navigate_page
2. Take snapshot: mcp__chrome-devtools__take_snapshot
3. Evaluate style: mcp__chrome-devtools__evaluate_script
   // Check: getComputedStyle(element).backgroundColor
4. Verify color matches expectation
5. Report: "Validated with DevTools - divider now rgb(200, 206, 218)"
```

## 🚨 CRITICAL: Follow User Instructions Exactly

**ABSOLUTE RULE**: When a user gives multi-step instructions, follow EVERY step in order:
1. Read the COMPLETE instruction before acting
2. Execute EACH step exactly as written
3. Do NOT skip steps or make assumptions
4. Do NOT take actions the user didn't explicitly request
5. If unsure, ASK before taking action

**Example**: If user says "check if X, if NOT X then do Y":
- ✅ CORRECT: Check X → Verify result → Only do Y if condition met
- ❌ WRONG: Assume and do Y without checking
- ❌ WRONG: Do something else not mentioned

## Project Structure

```
/src
  /app           # Next.js app router
  /components    # React components
    /ui          # UI components
    /teams       # Team-related components
    /dashboard   # Dashboard components
  /lib           # Utilities and helpers
  /hooks         # Custom React hooks
  /types         # TypeScript types
/prisma          # Database schema
/public          # Static assets
```

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Auth**: Supabase Auth
- **Deployment**: Vercel

## Database Commands

```bash
npx prisma generate    # Generate Prisma client
npx prisma db push    # Push schema changes
npx prisma migrate dev # Create migration
npx prisma studio     # Open database GUI
```

### Current Migration Status
After implementing rating/draft features, run migration to apply schema changes:
```bash
npx prisma migrate dev --name add_ratings_and_drafts
npx prisma generate
```

This creates:
- PromptRating table (1-5 star ratings with reviews)
- PromptDraft table (auto-save drafts)
- averageRating/ratingCount fields on SharedPrompt

TypeScript errors (~92) are schema-related and will resolve after migration.

## Code Style

- Use functional components with TypeScript
- Prefer server components where possible
- Use Tailwind for styling
- Follow existing patterns in codebase
- Keep components small and focused

---

**Remember**: Batch operations for speed, test before committing!