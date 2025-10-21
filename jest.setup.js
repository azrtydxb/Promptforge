// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Polyfill setImmediate for Jest environment
global.setImmediate = global.setTimeout

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      prefetch: () => null,
      push: jest.fn(),
      replace: jest.fn(),
      refresh: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
    }
  },
  usePathname() {
    return ''
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock Next Auth core module to avoid ESM dependency chain
jest.mock('next-auth', () => ({
  default: jest.fn(),
}))

// Mock Next Auth React hooks
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  SessionProvider: ({ children }) => children,
}))

// Mock jose to avoid ESM/Browser build issues
jest.mock('jose')

// Mock @panva/hkdf to avoid ESM module issues
jest.mock('@panva/hkdf')

// Mock preact and preact-render-to-string to avoid ESM module issues
jest.mock('preact', () => ({
  h: jest.fn(),
  Fragment: jest.fn(),
  options: {},
}))

jest.mock('preact-render-to-string', () => ({
  render: jest.fn(() => ''),
  renderToStaticMarkup: jest.fn(() => ''),
}))

// Mock environment variables
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.NEXTAUTH_SECRET = 'test-secret'

// Suppress console errors in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})