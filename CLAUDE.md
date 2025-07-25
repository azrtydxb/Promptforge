# Project-Specific Information for PromptForge

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