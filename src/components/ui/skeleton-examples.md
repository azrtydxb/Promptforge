# Skeleton Component Usage Examples

This document demonstrates how to use the reusable skeleton loading components.

## PromptCardSkeleton

Displays loading state for prompt cards. Perfect for prompt list views.

```tsx
import { PromptCardSkeleton } from "@/components/ui/prompt-card-skeleton";

// Show single loading card
<PromptCardSkeleton />

// Show multiple loading cards (common for list views)
<PromptCardSkeleton count={6} />

// With custom styling
<PromptCardSkeleton count={3} className="opacity-75" />
```

**Use Cases:**
- Prompt library loading state
- Search results loading
- Favorites list loading
- Dashboard prompt cards

## FormSkeleton

Generic form loading state with configurable fields.

```tsx
import { FormSkeleton, FormFieldSkeleton, FormTextareaSkeleton } from "@/components/ui/form-skeleton";

// Simple form with 3 fields and submit button
<FormSkeleton fields={3} showButton />

// Form without submit button
<FormSkeleton fields={5} showButton={false} />

// Custom form composition
<div className="space-y-4">
  <FormFieldSkeleton />
  <FormTextareaSkeleton />
  <FormFieldSkeleton />
  <FormFieldSkeleton />
</div>
```

**Use Cases:**
- Form loading states
- Modal dialogs
- Settings pages
- Create/edit forms

## ListSkeleton

Flexible list loading with multiple layout variants.

```tsx
import { ListSkeleton, ListItemSkeleton } from "@/components/ui/list-skeleton";

// Card variant (default) - items with avatar and description
<ListSkeleton items={5} variant="card" />

// Simple list variant - minimal list items
<ListSkeleton items={10} variant="list" />

// Grid variant - card items in grid layout
<ListSkeleton items={9} variant="grid" />

// Single list item
<ListItemSkeleton showAvatar showAction />
```

**Use Cases:**
- User lists
- Team member lists
- Activity feeds
- Notification lists
- Search results

## TableSkeleton

Table loading state with rows and columns.

```tsx
import { TableSkeleton, CompactTableSkeleton, TableRowSkeleton } from "@/components/ui/table-skeleton";

// Standard table
<TableSkeleton rows={5} columns={4} />

// Table without header
<TableSkeleton rows={10} columns={6} showHeader={false} />

// Compact table (data-dense)
<CompactTableSkeleton rows={20} columns={8} />

// Single row (for incremental loading)
<TableRowSkeleton columns={5} />
```

**Use Cases:**
- Data tables
- Analytics dashboards
- Reports
- Admin panels
- Log viewers

## Design Patterns

### 1. Conditional Rendering

```tsx
{isLoading ? (
  <PromptCardSkeleton count={6} />
) : (
  prompts.map(prompt => <PromptCard key={prompt.id} prompt={prompt} />)
)}
```

### 2. Suspense Boundaries

```tsx
<Suspense fallback={<PromptCardSkeleton count={4} />}>
  <PromptList />
</Suspense>
```

### 3. Incremental Loading

```tsx
{prompts.map(prompt => <PromptCard key={prompt.id} prompt={prompt} />)}
{hasMore && isLoadingMore && <PromptCardSkeleton count={2} />}
```

### 4. Grid Layouts

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {isLoading ? (
    <PromptCardSkeleton count={6} />
  ) : (
    prompts.map(prompt => <PromptCard key={prompt.id} prompt={prompt} />)
  )}
</div>
```

## Styling Notes

- All skeleton components use the base `Skeleton` component which includes:
  - `animate-pulse` for loading animation
  - `bg-muted` for consistent background color
  - Automatic light/dark mode support

- Components accept `className` prop for custom styling:
  ```tsx
  <PromptCardSkeleton className="border-2 border-blue-200" />
  ```

- Skeleton components match the visual layout of their corresponding real components to minimize layout shift during loading.
