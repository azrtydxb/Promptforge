# Post-Migration Verification Checklist

After running the database migration, follow these steps to ensure everything works correctly:

## 1. Run Migration (REQUIRED FIRST)

```bash
# Apply database schema changes
npx prisma migrate dev --name add_ratings_and_drafts

# Generate updated Prisma client with new models
npx prisma generate
```

## 2. Verify Type Checking

After migration, run TypeScript type checking to verify all schema-related errors are resolved:

```bash
npx tsc --noEmit --skipLibCheck
```

**Expected Result**: Only 85 errors should remain (all in schema-related files that reference the new models).

**Current Status**: ~92 errors before migration, most related to:
- `db.promptRating` doesn't exist on PrismaClient
- `db.promptDraft` doesn't exist on PrismaClient
- `averageRating` and `ratingCount` fields don't exist on SharedPrompt

## 3. Run Linting

```bash
npm run lint
```

Fix any linting issues that appear.

## 4. Test New Features

### Rating System
1. Navigate to a shared prompt in the marketplace
2. Add a 1-5 star rating with optional review text
3. Verify average rating displays correctly
4. Check that rating count increments

### Auto-Save Drafts
1. Start creating a new prompt
2. Type content and wait 2 seconds
3. Verify "Saving..." status appears
4. Refresh the page and verify draft is restored
5. Check draft management in settings/drafts page

### Collections
1. Create a new collection
2. Add prompts to the collection
3. View collection details
4. Test public/private visibility toggle

### User Following
1. Visit another user's profile
2. Click Follow button
3. Verify follower/following counts update
4. Check Following tab shows correct users

### Badges & Reputation
1. Create your first prompt (should award CREATOR badge)
2. Get likes/views to trigger other badges
3. Check badge display on profile
4. Verify reputation score calculation

### Content Moderation (Admin/Moderator only)
1. Navigate to /admin/moderation
2. View pending and flagged content queues
3. Test approve/reject/flag actions
4. Create moderation rules (Admin only)
5. View moderation logs

## 5. Database Verification

Check that new tables were created:

```bash
npx prisma studio
```

Verify these tables exist:
- PromptRating
- PromptDraft
- UserFollow
- UserBadge
- Collection
- CollectionItem
- ModerationRule
- ModerationLog

## 6. Verify Schema Fields

Check SharedPrompt model has new fields:
- `averageRating` (Float?)
- `ratingCount` (Int)

## 7. Known Issues After Migration

### Type Errors to Monitor

After migration completes, watch for these potential issues:

**badges.actions.ts (lines 57, 76-82, 92-93, etc.)**
- Missing include for `publishedPrompts` relation
- Missing include for `followers` relation
- Missing include for `badges` relation

**Fix**: Add proper includes to User queries:
```typescript
const user = await db.user.findUnique({
  where: { id: userId },
  include: {
    badges: true,
    publishedPrompts: { where: { status: 'APPROVED' } },
    followers: true,
    _count: {
      select: {
        prompts: true,
        // ... other counts
      }
    }
  }
});
```

**collections.actions.ts (line 82, 450)**
- References to `likes` count should be `ratings`

**keyword-search.actions.ts (line 124)**
- References to prompt `likes` - may need to update to use ratings

## 8. Start Development Server

```bash
npm run dev
```

Navigate through the application and test:
- Marketplace page loads
- Search functionality works
- Collections page displays
- Profile pages render
- Dashboard shows correct data

## 9. Check Console for Errors

Monitor browser console and terminal for:
- Database query errors
- Type mismatches
- Missing relations
- API failures

## 10. Test API Endpoints

Test the new server actions work:
```bash
# Rating actions
- ratePrompt()
- getUserRating()
- getPromptRatings()
- getTopRatedPrompts()

# Draft actions
- saveDraft()
- getDrafts()
- getDraft()
- deleteDraft()

# Collections actions
- createCollection()
- updateCollection()
- deleteCollection()
- addToCollection()

# Following actions
- followUser()
- unfollowUser()
- getFollowers()
- getFollowing()

# Badges actions
- checkAndAwardBadges()
- updateReputationScore()
- getBadgeProgress()

# Moderation actions
- getPendingModeration()
- moderatePrompt()
- getModerationRules()
- createModerationRule()
```

## 11. Performance Check

Monitor for any performance issues:
- Slow queries with new rating/draft tables
- N+1 query problems with new relations
- Indexing efficiency

## 12. Success Criteria

✅ Migration completes without errors
✅ Prisma client generates successfully
✅ TypeScript type checking passes (or only expected errors)
✅ All new features accessible and functional
✅ No console errors during normal usage
✅ All database tables created correctly
✅ Server actions return expected data
✅ UI displays new features properly

## Issues to Report

If you encounter any errors after migration, please note:
1. The exact error message
2. Which feature was being tested
3. Browser console errors
4. Server terminal errors

Common issues:
- **Missing includes**: Some queries may need additional `include` statements
- **Type mismatches**: Prisma types may need regeneration
- **Relation errors**: Check that all relations in schema match code usage
