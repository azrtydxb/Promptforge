# Security Guidelines for Promptforge

## Overview

This document outlines the security best practices and authorization patterns that must be followed when developing server actions and API endpoints in the Promptforge application.

## Table of Contents

1. [Core Security Principles](#core-security-principles)
2. [Authorization Patterns](#authorization-patterns)
3. [Implementation Guidelines](#implementation-guidelines)
4. [Common Vulnerabilities](#common-vulnerabilities)
5. [Testing Checklist](#testing-checklist)

## Core Security Principles

### 1. Authentication First

Every server action that accesses user data MUST verify authentication:

```typescript
import { requireAuth } from "@/lib/auth";

export async function myAction() {
  const user = await requireAuth(); // Throws if not authenticated
  // ... rest of the function
}
```

### 2. Authorization Second

After authentication, verify the user has permission to perform the action:

```typescript
import { requirePromptOwnership } from "@/lib/auth-helpers";

export async function updatePrompt(promptId: string, data: UpdateData) {
  const { user, prompt } = await requirePromptOwnership(promptId);
  // Now we know the user owns this prompt
  // ... perform update
}
```

### 3. Principle of Least Privilege

Users should only have access to the minimum resources necessary:

- Regular users can only modify their own resources
- Team members can only access team resources based on their role
- Moderators can only access moderation features
- Admins have elevated privileges but with safeguards

## Authorization Patterns

### Pattern 1: Resource Ownership

For user-owned resources (prompts, folders, collections):

```typescript
// ✅ CORRECT: Verify ownership in WHERE clause
export async function deletePrompt(id: string) {
  const user = await requireAuth();

  await db.prompt.delete({
    where: {
      id,
      userId: user.id // CRITICAL: Include userId in WHERE
    },
  });
}

// ❌ WRONG: Missing ownership check
export async function deletePrompt(id: string) {
  await db.prompt.delete({
    where: { id }, // VULNERABILITY: Any user can delete any prompt!
  });
}
```

### Pattern 2: Team-Based Access

For team resources, verify membership and role:

```typescript
import { requireTeamRole, TeamRole } from "@/lib/auth-helpers";

export async function updateTeamSettings(teamId: string, settings: Settings) {
  // Only admins and owners can update settings
  const { user, member } = await requireTeamRole(teamId, TeamRole.ADMIN);

  // ... perform update
}
```

### Pattern 3: Role-Based Access Control

For system-wide features:

```typescript
import { requireModeratorRole, requireAdminRole } from "@/lib/auth-helpers";

export async function moderateContent(contentId: string) {
  const user = await requireModeratorRole(); // Throws if not moderator/admin
  // ... moderate content
}

export async function systemAdminAction() {
  const user = await requireAdminRole(); // Throws if not admin
  // ... perform admin action
}
```

### Pattern 4: Public vs Private Resources

Some resources may be public but still require ownership for modification:

```typescript
export async function getCollection(collectionId: string) {
  const user = await requireAuth();

  // Can read if owned OR public
  const collection = await db.collection.findFirst({
    where: {
      id: collectionId,
      OR: [
        { userId: user.id },      // User owns it
        { isPublic: true }         // OR it's public
      ],
    },
  });

  if (!collection) {
    throw new Error("Collection not found or unauthorized");
  }

  return collection;
}

export async function updateCollection(collectionId: string, data: UpdateData) {
  // But only owner can update, regardless of public status
  const { user, collection } = await requireCollectionOwnership(collectionId);
  // ... perform update
}
```

## Implementation Guidelines

### 1. Use Helper Functions

Always use the helper functions from `/lib/auth-helpers.ts`:

```typescript
// Available helpers:
requirePromptOwnership(promptId)
requireFolderOwnership(folderId)
requireCollectionOwnership(collectionId)
requireTemplateOwnership(templateId)
requireDraftOwnership(draftId)
requireCommentOwnership(commentId)
requireShareLinkPermission(shareLinkId)
requireTeamRole(teamId, role)
requireTeamOwnership(teamId)
requireTeamAdmin(teamId)
requireTeamMembership(teamId)
requireTeamPromptPermission(promptId)
requireModeratorRole()
requireAdminRole()
requireUserModificationPermission(userId)
```

### 2. Validate Input

Always validate and sanitize input data:

```typescript
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().max(10000),
});

export async function updatePrompt(id: string, input: unknown) {
  const user = await requireAuth();
  const validated = updateSchema.parse(input); // Throws if invalid

  // ... use validated data
}
```

### 3. Log Security Events

Log all security-relevant events:

```typescript
import { logger } from "@/lib/logger";
import { logSecurityEvent } from "@/lib/auth-helpers";

// Log failed authorization attempts
if (!authorized) {
  await logSecurityEvent('ACCESS_DENIED', {
    userId: user.id,
    resource: 'prompt',
    resourceId: promptId,
    action: 'delete'
  });
  throw new Error("Unauthorized");
}
```

### 4. Handle Errors Securely

Don't leak sensitive information in error messages:

```typescript
// ❌ WRONG: Leaks information
throw new Error(`User ${userId} doesn't own prompt ${promptId}`);

// ✅ CORRECT: Generic message
throw new Error("Prompt not found or unauthorized");
```

## Common Vulnerabilities

### 1. Missing Authorization Checks

**Vulnerability**: Functions that modify data without checking ownership

**Example**:
```typescript
// ❌ VULNERABLE
export async function updateUser(userId: string, data: any) {
  return db.user.update({
    where: { id: userId },
    data
  });
}
```

**Fix**:
```typescript
// ✅ SECURE
export async function updateUser(userId: string, data: any) {
  const user = await requireAuth();

  if (user.id !== userId) {
    throw new Error("You can only update your own profile");
  }

  return db.user.update({
    where: { id: userId },
    data
  });
}
```

### 2. Insufficient WHERE Clauses

**Vulnerability**: Not including userId in database queries

**Example**:
```typescript
// ❌ VULNERABLE
const prompt = await db.prompt.update({
  where: { id: promptId }, // Missing userId check!
  data: updateData
});
```

**Fix**:
```typescript
// ✅ SECURE
const prompt = await db.prompt.update({
  where: {
    id: promptId,
    userId: user.id // Include ownership check
  },
  data: updateData
});
```

### 3. Privilege Escalation

**Vulnerability**: Allowing users to change their own roles

**Example**:
```typescript
// ❌ VULNERABLE
export async function updateProfile(data: { role?: UserRole }) {
  const user = await requireAuth();

  return db.user.update({
    where: { id: user.id },
    data // User could set role: 'ADMIN'!
  });
}
```

**Fix**:
```typescript
// ✅ SECURE
export async function updateProfile(data: ProfileUpdate) {
  const user = await requireAuth();

  // Explicitly exclude role from updates
  const { role, ...safeData } = data;

  return db.user.update({
    where: { id: user.id },
    data: safeData
  });
}
```

### 4. IDOR (Insecure Direct Object References)

**Vulnerability**: Using user-provided IDs without verification

**Example**:
```typescript
// ❌ VULNERABLE
export async function getPrompt(promptId: string) {
  // User could access any prompt by guessing IDs
  return db.prompt.findUnique({
    where: { id: promptId }
  });
}
```

**Fix**:
```typescript
// ✅ SECURE
export async function getPrompt(promptId: string) {
  const user = await requireAuth();

  return db.prompt.findFirst({
    where: {
      id: promptId,
      userId: user.id // Ensure user owns the prompt
    }
  });
}
```

## Testing Checklist

When implementing or reviewing server actions, verify:

### Authentication & Authorization

- [ ] Function calls `requireAuth()` or appropriate auth helper
- [ ] Ownership is verified before any modifications
- [ ] WHERE clauses include userId/ownership checks
- [ ] Team permissions are verified for team resources
- [ ] Role-based access is properly enforced

### Input Validation

- [ ] All input is validated using Zod or similar
- [ ] String lengths are limited
- [ ] Numeric values are within expected ranges
- [ ] Arrays have maximum size limits
- [ ] No SQL injection possibilities

### Error Handling

- [ ] Errors don't leak sensitive information
- [ ] Failed auth attempts are logged
- [ ] Generic error messages for unauthorized access
- [ ] Proper HTTP status codes returned

### Data Access

- [ ] Only necessary fields are selected from database
- [ ] Sensitive fields are excluded from responses
- [ ] Pagination is implemented for list endpoints
- [ ] No N+1 query problems

### Security Patterns

- [ ] Helper functions used instead of manual checks
- [ ] No direct user deletion without proper flow
- [ ] Admin actions have additional safeguards
- [ ] Audit trail for sensitive operations

## Code Review Guidelines

When reviewing code, look for:

1. **Missing `requireAuth()`** - Every server action should authenticate
2. **Missing ownership checks** - Updates/deletes must verify ownership
3. **Overly permissive WHERE clauses** - Should include userId
4. **Direct role updates** - Users shouldn't change their own roles
5. **Information leakage** - Error messages shouldn't reveal details
6. **Unvalidated input** - All input should be validated
7. **Missing rate limiting** - Consider adding for expensive operations

## Enforcement

1. **Pre-commit hooks** should run linting and basic security checks
2. **Code reviews** must include security verification
3. **Automated tests** should include authorization tests
4. **Regular security audits** should be performed quarterly

## Contact

For security concerns or questions:
- Create an issue with the `security` label
- For sensitive issues, contact the security team directly
- Document any new patterns in this guide

---

*Last updated: [Current Date]*
*Version: 1.0*