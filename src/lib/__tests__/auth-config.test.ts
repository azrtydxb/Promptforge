/* eslint-disable @typescript-eslint/no-require-imports -- jest.isolateModules requires require() to re-load the module with mutated env per test */
import type { AuthOptions, Account, Profile, User } from "next-auth"

jest.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}))

type MockDb = {
  user: {
    findUnique: jest.Mock
    create: jest.Mock
    update: jest.Mock
  }
}

const ENV_KEYS = ["ZITADEL_ISSUER", "ZITADEL_CLIENT_ID", "ZITADEL_CLIENT_SECRET"] as const

async function loadAuthOptions(): Promise<AuthOptions> {
  let authConfigModule: typeof import("@/lib/auth-config")
  jest.isolateModules(() => {
    authConfigModule = require("@/lib/auth-config")
  })
  return authConfigModule!.authOptions
}

// Loads auth-config and the exact `db` mock instance it resolved via
// `@/lib/db`, from within the same isolated module registry, so mock
// call assertions line up regardless of how jest.isolateModules
// re-executes (or reuses) the jest.mock factory.
async function loadAuthOptionsWithDb(): Promise<{ authOptions: AuthOptions; db: MockDb }> {
  let authConfigModule: typeof import("@/lib/auth-config")
  let dbModule: { db: MockDb }
  jest.isolateModules(() => {
    authConfigModule = require("@/lib/auth-config")
    dbModule = require("@/lib/db")
  })
  return { authOptions: authConfigModule!.authOptions, db: dbModule!.db }
}

describe("auth-config Zitadel OIDC provider", () => {
  const originalEnv: Record<string, string | undefined> = {}

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key]
      delete process.env[key]
    }
  })

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = originalEnv[key]
      }
    }
  })

  it("does not include a zitadel provider when the env is unset", async () => {
    const authOptions = await loadAuthOptions()
    const zitadel = authOptions.providers.find((p) => p.id === "zitadel")
    expect(zitadel).toBeUndefined()
    // Credentials provider is always present.
    expect(authOptions.providers).toHaveLength(1)
  })

  it("includes a zitadel provider when ZITADEL_ISSUER and ZITADEL_CLIENT_ID are set", async () => {
    process.env.ZITADEL_ISSUER = "https://id.azrty.com"
    process.env.ZITADEL_CLIENT_ID = "test-client-id"
    process.env.ZITADEL_CLIENT_SECRET = "test-client-secret"

    const authOptions = await loadAuthOptions()
    const zitadel = authOptions.providers.find((p) => p.id === "zitadel") as
      | (AuthOptions["providers"][number] & {
          wellKnown?: string
          profile?: (profile: { sub: string; email?: string; name?: string }) => {
            id: string
            email?: string
            name?: string
          }
        })
      | undefined

    expect(zitadel).toBeDefined()
    expect(zitadel?.name).toBe("Kryton SSO")
    expect(zitadel?.type).toBe("oauth")
    expect(zitadel?.wellKnown).toBe(
      "https://id.azrty.com/.well-known/openid-configuration"
    )
    expect(authOptions.providers).toHaveLength(2)
  })

  it("maps a zitadel profile (sub/email/name) to {id,email,name}", async () => {
    process.env.ZITADEL_ISSUER = "https://id.azrty.com"
    process.env.ZITADEL_CLIENT_ID = "test-client-id"
    process.env.ZITADEL_CLIENT_SECRET = "test-client-secret"

    const authOptions = await loadAuthOptions()
    const zitadel = authOptions.providers.find((p) => p.id === "zitadel") as
      | {
          profile: (profile: { sub: string; email?: string; name?: string }) => {
            id: string
            email?: string
            name?: string
          }
        }
      | undefined

    expect(zitadel).toBeDefined()
    const mapped = zitadel!.profile({
      sub: "218812305343418723",
      email: "user@example.com",
      name: "Jane Doe",
    })

    expect(mapped).toEqual({
      id: "218812305343418723",
      email: "user@example.com",
      name: "Jane Doe",
    })
  })
})

describe("auth-config signIn callback (Zitadel email-verification gate)", () => {
  process.env.ZITADEL_ISSUER = "https://id.azrty.com"
  process.env.ZITADEL_CLIENT_ID = "test-client-id"
  process.env.ZITADEL_CLIENT_SECRET = "test-client-secret"

  const zitadelAccount: Account = {
    provider: "zitadel",
    type: "oauth",
    providerAccountId: "218812305343418723",
  }

  function zitadelProfile(overrides: Partial<Profile> & { email_verified?: boolean }): Profile {
    return {
      sub: "218812305343418723",
      email: "user@example.com",
      name: "Jane Doe",
      ...overrides,
    } as Profile
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("reuses the existing local user's id when the SSO email is verified and already registered", async () => {
    const { authOptions, db } = await loadAuthOptionsWithDb()
    db.user.findUnique.mockResolvedValueOnce({
      id: "existing-local-user-id",
      email: "user@example.com",
      name: "Jane Doe",
      username: "JaneDoe1",
    })

    const user: User = { id: "218812305343418723", email: "user@example.com", name: "Jane Doe" }
    const profile = zitadelProfile({ email_verified: true })

    const result = await authOptions.callbacks!.signIn!({
      user,
      account: zitadelAccount,
      profile,
    } as never)

    expect(result).toBe(true)
    expect(user.id).toBe("existing-local-user-id")
    expect(db.user.create).not.toHaveBeenCalled()
  })

  it("rejects the SSO sign-in when email_verified is false", async () => {
    const { authOptions, db } = await loadAuthOptionsWithDb()

    const user: User = { id: "218812305343418723", email: "user@example.com", name: "Jane Doe" }
    const profile = zitadelProfile({ email_verified: false })

    const result = await authOptions.callbacks!.signIn!({
      user,
      account: zitadelAccount,
      profile,
    } as never)

    expect(result).toBe(false)
    expect(db.user.findUnique).not.toHaveBeenCalled()
    expect(db.user.create).not.toHaveBeenCalled()
  })

  it("rejects the SSO sign-in when email_verified is absent", async () => {
    const { authOptions, db } = await loadAuthOptionsWithDb()

    const user: User = { id: "218812305343418723", email: "user@example.com", name: "Jane Doe" }
    const profile = zitadelProfile({})
    delete (profile as { email_verified?: boolean }).email_verified

    const result = await authOptions.callbacks!.signIn!({
      user,
      account: zitadelAccount,
      profile,
    } as never)

    expect(result).toBe(false)
    expect(db.user.findUnique).not.toHaveBeenCalled()
  })

  it("creates a new local user when the SSO email is verified and not yet registered", async () => {
    const { authOptions, db } = await loadAuthOptionsWithDb()
    db.user.findUnique
      .mockResolvedValueOnce(null) // no existing user by email
      .mockResolvedValueOnce(null) // generated username is unique
    db.user.create.mockResolvedValueOnce({
      id: "new-local-user-id",
      email: "new-user@example.com",
      name: "New User",
      username: "SomeUsername1",
    })

    const user: User = { id: "999999999999999999", email: "new-user@example.com", name: "New User" }
    const profile = zitadelProfile({
      sub: "999999999999999999",
      email: "new-user@example.com",
      name: "New User",
      email_verified: true,
    })

    const result = await authOptions.callbacks!.signIn!({
      user,
      account: zitadelAccount,
      profile,
    } as never)

    expect(result).toBe(true)
    expect(db.user.create).toHaveBeenCalledTimes(1)
    expect(db.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "new-user@example.com",
          password: null,
        }),
      })
    )
    expect(user.id).toBe("new-local-user-id")
  })
})
