# Testing Guide

This guide covers how to write and run tests for the Promptforge application.

## Testing Stack

- **Jest**: Unit and integration testing framework
- **React Testing Library**: Testing React components
- **Playwright**: End-to-end testing
- **TypeScript**: Type safety in tests

## Project Structure

```
src/
├── __tests__/
│   ├── unit/          # Unit tests for utilities, helpers, etc.
│   └── components/    # Component tests
e2e/                   # End-to-end tests
```

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Debug E2E tests
npm run test:e2e:debug
```

### Run All Tests

```bash
npm run test:all
```

## Writing Tests

### Unit Tests

Unit tests should test individual functions or modules in isolation.

```typescript
// Example: Testing a utility function
import { validateUsername } from '@/lib/username-generator'

describe('validateUsername', () => {
  it('should validate correct usernames', () => {
    expect(validateUsername('john123')).toEqual({ valid: true })
  })

  it('should reject empty username', () => {
    expect(validateUsername('')).toEqual({
      valid: false,
      error: 'Username is required'
    })
  })
})
```

### Component Tests

Component tests verify that React components render correctly and handle user interactions.

```typescript
// Example: Testing a React component
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'

describe('Button Component', () => {
  it('should handle click events', async () => {
    const handleClick = jest.fn()
    const user = userEvent.setup()
    
    render(<Button onClick={handleClick}>Click me</Button>)
    
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### E2E Tests

E2E tests simulate real user interactions across the entire application.

```typescript
// Example: E2E test with Playwright
import { test, expect } from '@playwright/test'

test('user can sign in', async ({ page }) => {
  await page.goto('/sign-in')
  
  await page.getByLabel('Email').fill('user@example.com')
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: 'Sign In' }).click()
  
  await expect(page).toHaveURL('/dashboard')
})
```

## Best Practices

### 1. Test Organization

- Group related tests using `describe` blocks
- Use descriptive test names that explain what is being tested
- Keep tests focused on a single behavior

### 2. Test Data

- Use realistic test data
- Create test data factories for complex objects
- Clean up test data after tests complete

### 3. Mocking

- Mock external dependencies (APIs, databases)
- Use Jest mocks for server actions
- Keep mocks simple and focused

### 4. Assertions

- Use specific assertions that match the test intent
- Test both positive and negative cases
- Verify error handling

### 5. Performance

- Keep unit tests fast (< 100ms each)
- Use `beforeEach` and `afterEach` for setup/cleanup
- Avoid unnecessary waits in E2E tests

## Testing Server Actions

Server actions require special handling since they interact with the database:

```typescript
// Mock the database
jest.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}))

// Test the server action
import { createUser } from '@/app/actions/user.actions'

test('should create a new user', async () => {
  const mockUser = { id: '1', email: 'test@example.com' }
  ;(db.user.create as jest.Mock).mockResolvedValue(mockUser)
  
  const result = await createUser({ email: 'test@example.com' })
  expect(result).toEqual(mockUser)
})
```

## Coverage Goals

While 100% coverage isn't always necessary, aim for:

- **Functions**: 80%+ coverage
- **Branches**: 75%+ coverage
- **Lines**: 80%+ coverage

Focus coverage on:
- Business logic
- Data transformations
- Error handling
- User interactions

## Continuous Integration

Tests run automatically on:
- Push to main/develop branches
- Pull requests
- Can be triggered manually

The CI pipeline includes:
1. Unit tests with coverage reporting
2. E2E tests on multiple browsers
3. Linting and type checking

## Debugging Tests

### Jest Tests

```bash
# Run a specific test file
npm test -- button.test.tsx

# Run tests matching a pattern
npm test -- --testNamePattern="should render"

# Debug with VS Code
# Add breakpoints and use the Jest extension
```

### Playwright Tests

```bash
# Debug mode with browser
npm run test:e2e:debug

# Run specific test file
npx playwright test auth.spec.ts

# Run with headed browser
npx playwright test --headed
```

## Common Issues

### Module Resolution

If you encounter module resolution errors:
- Check that paths in `tsconfig.json` match test imports
- Ensure `jest.config.js` has correct moduleNameMapper

### Async Testing

Always use `async/await` or return promises:

```typescript
// Good
it('should load data', async () => {
  const data = await fetchData()
  expect(data).toBeDefined()
})

// Bad - might pass before async completes
it('should load data', () => {
  fetchData().then(data => {
    expect(data).toBeDefined()
  })
})
```

### Component State

For components with state, wait for updates:

```typescript
import { waitFor } from '@testing-library/react'

await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument()
})
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)