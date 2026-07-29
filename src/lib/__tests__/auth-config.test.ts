import type { AuthOptions } from "next-auth"

jest.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}))

const ENV_KEYS = ["ZITADEL_ISSUER", "ZITADEL_CLIENT_ID", "ZITADEL_CLIENT_SECRET"] as const

async function loadAuthOptions(): Promise<AuthOptions> {
  let authConfigModule: typeof import("@/lib/auth-config")
  jest.isolateModules(() => {
    authConfigModule = require("@/lib/auth-config")
  })
  return authConfigModule!.authOptions
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
