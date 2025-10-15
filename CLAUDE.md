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

### Agent Orchestration
When using multiple agents:
1. Spawn ALL agents in ONE message using Task tool
2. Include clear instructions in EVERY agent prompt
3. Batch all related operations together

### Agent Task Template
```javascript
Task("You are [type] agent. 
Your specific task: [detailed task description]
Requirements:
- [requirement 1]
- [requirement 2]
Output: [expected output]")
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
- Batch ALL related operations
- Use parallel execution always
- Clear task descriptions
- Monitor progress with TodoWrite
- Run tests before committing
- **FOLLOW USER INSTRUCTIONS EXACTLY** - Read and execute every step as written

### ❌ DON'T:
- Send sequential messages
- Update todos individually
- Spawn agents one by one
- Skip testing
- Create unnecessary files
- **NEVER make assumptions or skip steps in user instructions**
- **NEVER kill processes without explicit permission**

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

## Code Style

- Use functional components with TypeScript
- Prefer server components where possible
- Use Tailwind for styling
- Follow existing patterns in codebase
- Keep components small and focused

---

**Remember**: Batch operations for speed, test before committing!