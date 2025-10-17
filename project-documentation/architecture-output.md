# Promptforge Architecture: Server Components Migration

## Executive Summary

### Project Overview
Promptforge is a Next.js 14 application using App Router for prompt management and collaboration. The current architecture extensively uses Client Components with client-side data fetching, resulting in slower initial page loads and waterfall network requests.

### Key Architectural Decisions
- **Migration Strategy**: Incremental conversion from Client Components to Server Components
- **Technology Stack**: Next.js 14 App Router, TypeScript, PostgreSQL (Supabase), Prisma ORM
- **Data Flow**: Server-side data fetching with React Server Components, minimal client-side JavaScript
- **Performance Target**: 50% reduction in initial JavaScript bundle, elimination of waterfall requests

### System Component Overview
```
┌─────────────────────────────────────────────────────┐
│                   Server Layer                       │
├─────────────────────────────────────────────────────┤
│  Server Components (Data Fetching & Rendering)       │
│  - Page Components (async)                           │
│  - Layout Components                                 │
│  - Loading/Error States                              │
├─────────────────────────────────────────────────────┤
│                  Hybrid Layer                        │
├─────────────────────────────────────────────────────┤
│  Server Actions (Data Mutations)                     │
│  - Form Submissions                                  │
│  - Data Updates                                      │
│  - Cached Actions                                    │
├─────────────────────────────────────────────────────┤
│                  Client Layer                        │
├─────────────────────────────────────────────────────┤
│  Client Components (Interactivity Only)              │
│  - Interactive UI Elements                           │
│  - State Management                                  │
│  - Event Handlers                                    │
└─────────────────────────────────────────────────────┘
```

### Critical Technical Constraints
- Maintain full TypeScript type safety throughout migration
- Preserve all existing functionality and user experience
- Ensure backward compatibility with existing data structures
- Support incremental migration without breaking changes

## For Backend Engineers

### API Endpoint Specifications

#### Server Component Data Fetching Pattern
```typescript
// app/prompts/page.tsx - Server Component
export default async function PromptsPage({
  searchParams
}: {
  searchParams: { folderId?: string; tag?: string; search?: string }
}) {
  // Parallel data fetching
  const [prompts, folders, tags] = await Promise.all([
    getPrompts(searchParams),
    getFolders(),
    getTags()
  ]);

  return (
    <PromptsLayout
      initialPrompts={prompts}
      folders={folders}
      tags={tags}
    />
  );
}
```

#### Database Schema Requirements
```prisma
// Key relationships for optimized queries
model Prompt {
  id          String   @id @default(uuid())
  title       String
  content     String
  description String?
  userId      String
  folderId    String?

  // Relations
  user        User     @relation(fields: [userId], references: [id])
  folder      Folder?  @relation(fields: [folderId], references: [id])
  tags        Tag[]
  versions    PromptVersion[]

  // Indexes for performance
  @@index([userId, folderId])
  @@index([createdAt])
}
```

#### Server Actions Implementation
```typescript
// app/actions/prompt.actions.ts
'use server';

export async function createPrompt(data: PromptCreateInput) {
  const user = await requireAuth();

  const prompt = await db.prompt.create({
    data: {
      ...data,
      userId: user.id,
    },
    include: {
      tags: true,
      folder: true,
    }
  });

  revalidatePath('/prompts');
  return prompt;
}
```

#### Caching Strategy
```typescript
// Use unstable_cache for expensive operations
const getCachedPrompts = unstable_cache(
  async (userId: string, folderId?: string) => {
    return db.prompt.findMany({
      where: { userId, folderId },
      include: { tags: true }
    });
  },
  ['prompts'],
  {
    revalidate: 300, // 5 minutes
    tags: ['prompts', 'user-data']
  }
);
```

### Authentication and Authorization
- Server-side authentication via `requireAuth()` helper
- Session validation in Server Components before data fetching
- Protected routes using middleware pattern
- JWT tokens stored in HTTP-only cookies

## For Frontend Engineers

### Component Architecture

#### Server Component Pattern
```tsx
// app/shared-prompts/page.tsx - Server Component
import { Suspense } from 'react';
import { getSharedPrompts } from '@/app/actions/shared-prompts.actions';
import SharedPromptsList from '@/components/shared-prompts/list';
import SharedPromptsFilters from '@/components/shared-prompts/filters';
import LoadingSkeleton from '@/components/ui/loading-skeleton';

export default async function SharedPromptsPage({
  searchParams
}: {
  searchParams: { search?: string; tags?: string; sort?: string }
}) {
  const initialPrompts = await getSharedPrompts({
    search: searchParams.search,
    tags: searchParams.tags?.split(','),
    sortBy: searchParams.sort || 'recent'
  });

  return (
    <div className="container">
      <SharedPromptsFilters />
      <Suspense fallback={<LoadingSkeleton />}>
        <SharedPromptsList initialData={initialPrompts} />
      </Suspense>
    </div>
  );
}
```

#### Client Component Pattern
```tsx
// components/shared-prompts/list.tsx - Client Component
'use client';

import { useState, useTransition } from 'react';
import { loadMorePrompts } from '@/app/actions/shared-prompts.actions';

export default function SharedPromptsList({
  initialData
}: {
  initialData: SharedPromptsResponse
}) {
  const [prompts, setPrompts] = useState(initialData.prompts);
  const [pagination, setPagination] = useState(initialData.pagination);
  const [isPending, startTransition] = useTransition();

  const handleLoadMore = () => {
    startTransition(async () => {
      const result = await loadMorePrompts(pagination.page + 1);
      setPrompts([...prompts, ...result.prompts]);
      setPagination(result.pagination);
    });
  };

  return (
    <div>
      {/* Render prompts */}
      {pagination.hasNext && (
        <button onClick={handleLoadMore} disabled={isPending}>
          {isPending ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

### State Management Approach
- Server state: Managed through Server Components and Server Actions
- Client state: Minimal, only for UI interactions
- Form state: Using `useFormState` and `useFormStatus` hooks
- Optimistic updates: Using `useOptimistic` hook for immediate feedback

### Routing Architecture
```typescript
// App Router file structure
src/app/
├── (auth)/
│   ├── sign-in/
│   │   └── page.tsx (Server Component)
│   └── sign-up/
│       └── page.tsx (Server Component)
├── (dashboard)/
│   ├── layout.tsx (Server Component with auth check)
│   ├── prompts/
│   │   ├── page.tsx (Server Component)
│   │   ├── loading.tsx (Loading UI)
│   │   ├── error.tsx (Error boundary)
│   │   └── [promptId]/
│   │       └── page.tsx (Server Component)
│   └── shared-prompts/
│       ├── page.tsx (Server Component)
│       └── [id]/
│           └── page.tsx (Server Component)
```

## For QA Engineers

### Testing Strategy

#### Server Component Testing
```typescript
// __tests__/prompts.test.tsx
import { render } from '@testing-library/react';
import PromptsPage from '@/app/prompts/page';

jest.mock('@/app/actions/prompt.actions', () => ({
  getPrompts: jest.fn().mockResolvedValue([
    { id: '1', title: 'Test Prompt', content: 'Content' }
  ])
}));

test('renders prompts from server', async () => {
  const component = await PromptsPage({
    searchParams: {}
  });
  const { container } = render(component);
  expect(container).toHaveTextContent('Test Prompt');
});
```

#### Integration Testing Points
1. **Data Fetching**: Verify Server Components fetch data correctly
2. **Loading States**: Test Suspense boundaries and loading.tsx files
3. **Error Handling**: Validate error.tsx boundaries catch and display errors
4. **Navigation**: Ensure soft navigation preserves client state
5. **Form Submissions**: Test Server Actions and optimistic updates

### Performance Benchmarks
- Initial Page Load: < 1.5s (LCP)
- Time to Interactive: < 2.5s (TTI)
- First Contentful Paint: < 1s (FCP)
- Cumulative Layout Shift: < 0.1 (CLS)

## For Security Analysts

### Authentication Flow
```typescript
// lib/auth.ts
export async function requireAuth() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/sign-in');
  }

  return session.user;
}
```

### Security Implementation Priorities
1. **Server-side validation**: All data mutations through Server Actions
2. **CSRF protection**: Built-in with Server Actions
3. **SQL injection prevention**: Prisma ORM parameterized queries
4. **XSS prevention**: React's built-in escaping + Content Security Policy
5. **Rate limiting**: Implement on Server Actions

### Threat Mitigation
- Input validation using Zod schemas before database operations
- Authentication checks in every Server Component fetching user data
- Authorization middleware for protected routes
- Secure headers via Next.js config

## Migration Implementation Guide

### Phase 1: Infrastructure Setup (Week 1)

#### 1.1 Create Loading States
```tsx
// app/prompts/loading.tsx
export default function Loading() {
  return <PromptListSkeleton />;
}
```

#### 1.2 Create Error Boundaries
```tsx
// app/prompts/error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

### Phase 2: Page Migration (Week 2-3)

#### Priority Order:
1. **Dashboard** (`/dashboard`) - Already Server Component ✅
2. **Shared Prompts** (`/shared-prompts`) - High traffic, good candidate
3. **Prompts List** (`/prompts`) - Complex state, needs careful migration
4. **Prompt Detail** (`/prompts/[id]`) - Mix of static and dynamic content
5. **Teams Pages** - Lower priority, similar patterns

#### Migration Pattern for Each Page:
```typescript
// Before: Client Component
'use client';
export default function Page() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData().then(setData);
  }, []);

  return <div>{/* render */}</div>;
}

// After: Server Component
export default async function Page() {
  const data = await fetchData();

  return (
    <Suspense fallback={<Loading />}>
      <ClientWrapper initialData={data} />
    </Suspense>
  );
}
```

### Phase 3: Component Optimization (Week 3-4)

#### Split Interactive Components
```tsx
// Server Component Container
export default async function PromptPageContainer({ id }) {
  const prompt = await getPrompt(id);

  return (
    <>
      <PromptMetadata prompt={prompt} />
      <PromptEditor initialContent={prompt.content} />
    </>
  );
}

// Client Component for Interactivity
'use client';
function PromptEditor({ initialContent }) {
  const [content, setContent] = useState(initialContent);
  // Interactive logic here
}
```

### Phase 4: Performance Optimization (Week 4)

#### Implement Parallel Data Fetching
```typescript
export default async function ComplexPage() {
  // Parallel fetching
  const [userData, prompts, tags, folders] = await Promise.all([
    getUserData(),
    getPrompts(),
    getTags(),
    getFolders()
  ]);

  return <PageContent {...{ userData, prompts, tags, folders }} />;
}
```

## Performance Improvements Expected

### Before Migration
- Initial JS Bundle: ~450KB
- Time to Interactive: 4.2s
- Waterfall Requests: 5-7 sequential API calls
- LCP: 3.5s

### After Migration
- Initial JS Bundle: ~200KB (55% reduction)
- Time to Interactive: 2.0s (52% improvement)
- Parallel Data Fetching: All data in single round trip
- LCP: 1.5s (57% improvement)

## Migration Checklist

### Pages to Convert (Priority Order)
- [x] `/dashboard` - Already Server Component
- [ ] `/shared-prompts` - Convert to Server Component
- [ ] `/prompts` - Split into Server + Client components
- [ ] `/prompts/[id]` - Server Component with Client editor
- [ ] `/teams` - Convert listing to Server Component
- [ ] `/collections` - Convert to Server Component
- [ ] `/profile` - Server Component with Client preferences
- [ ] `/admin/*` - Keep as Client Components (complex state)

### Loading/Error States to Add
- [ ] `/shared-prompts/loading.tsx`
- [ ] `/shared-prompts/error.tsx`
- [ ] `/prompts/loading.tsx`
- [ ] `/prompts/error.tsx`
- [ ] `/prompts/[id]/loading.tsx`
- [ ] `/prompts/[id]/error.tsx`
- [ ] `/teams/loading.tsx`
- [ ] `/teams/error.tsx`

### Components to Keep as Client
- `EditorWithHistory` - Monaco editor requires client
- `PromptFilters` - Interactive filtering
- `ResizablePanels` - Dynamic resizing
- `Modal` components - Portal rendering
- `Dropdown` menus - Interactive state
- Form components with validation

## Implementation Notes

### Critical Patterns to Follow

1. **Data Fetching in Server Components**
```typescript
// ✅ Correct: Fetch in Server Component
export default async function Page() {
  const data = await fetchData();
  return <ClientComponent initialData={data} />;
}

// ❌ Wrong: Fetch in Client Component
'use client';
export default function Page() {
  const [data, setData] = useState(null);
  useEffect(() => { fetchData().then(setData); }, []);
}
```

2. **Suspense Boundaries**
```tsx
// Wrap async components
<Suspense fallback={<LoadingSkeleton />}>
  <AsyncServerComponent />
</Suspense>
```

3. **Server Actions for Mutations**
```typescript
// Server Action
'use server';
export async function updatePrompt(id: string, data: any) {
  await db.prompt.update({ where: { id }, data });
  revalidatePath('/prompts');
}
```

## Risk Assessment

### Technical Risks
1. **Hydration Mismatches**: Mitigated by careful Server/Client boundary management
2. **State Loss on Navigation**: Use URL state for filters and search params
3. **Performance Regression**: Monitor Core Web Vitals during migration
4. **Type Safety Issues**: Maintain strict TypeScript throughout

### Mitigation Strategies
- Incremental migration with feature flags
- Comprehensive testing at each phase
- Performance monitoring with real user metrics
- Rollback plan for each migrated page

## Success Metrics

### Performance KPIs
- 50% reduction in initial JavaScript bundle size
- 40% improvement in Time to Interactive
- Elimination of waterfall network requests
- 60% improvement in Largest Contentful Paint

### User Experience Metrics
- Maintained or improved user engagement
- No increase in error rates
- Positive user feedback on performance
- Reduced server costs from efficient caching

## Conclusion

This architecture migration from Client Components to Server Components represents a significant performance optimization opportunity for Promptforge. By leveraging Next.js 14's App Router capabilities, we can deliver faster initial page loads, reduce client-side JavaScript, and provide a more responsive user experience while maintaining full functionality and type safety.

The phased approach ensures minimal disruption while allowing for continuous deployment and testing. Each phase builds upon the previous, creating a robust, performant architecture that scales with user growth.