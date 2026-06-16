"use client"

import { useState } from "react"
import { signIn, getSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { LoadingButton } from "@/components/ui/loading-button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Mail, Lock, ArrowRight } from "lucide-react"

export default function SignInPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({ email: "", password: "" })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email or password")
      } else {
        await getSession()
        router.push("/dashboard")
        router.refresh()
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  return (
    <div className="flex min-h-screen bg-surface-card">
      {/* Brand panel */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-[#15171D] p-12 lg:flex">
        <div
          className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, #5E6AD2 0%, transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, #7C87E8 0%, transparent 70%)" }}
        />

        <div className="relative flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-accent-500">
            <span className="block h-3 w-3 rotate-45 rounded-[2px] bg-white" />
          </span>
          <span className="text-[15px] font-[640] text-[#EEF0F3]">Promptforge</span>
        </div>

        <div className="relative">
          <h1 className="max-w-md text-[30px] font-[680] leading-[1.12] tracking-[-0.025em] text-white">
            Your team&apos;s prompt library, versioned and shared.
          </h1>
          <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-rail-text">
            Organize, version and collaborate on AI prompts — with a marketplace to discover
            what works.
          </p>
          <div className="mt-10 flex gap-10">
            {[
              ["12k+", "shared prompts"],
              ["3.4k", "teams"],
              ["99.9%", "uptime"],
            ].map(([n, l]) => (
              <div key={l}>
                <div className="text-[22px] font-[680] tabular-nums text-white">{n}</div>
                <div className="text-[11px] text-rail-text-dim">{l}</div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-[11px] text-rail-text-dim">
            Trusted by product, marketing &amp; eng teams
          </p>
        </div>

        <div className="relative text-[11px] text-rail-text-dim">
          © 2026 Promptforge
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[360px]">
          <h2 className="text-[21px] font-[660] tracking-[-0.02em] text-ink-900">Welcome back</h2>
          <p className="mt-1 text-[13px] text-ink-600">Sign in to your workspace to continue.</p>

          {/* Google OAuth */}
          <div className="mt-7">
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="flex h-10 w-full items-center justify-center gap-2.5 rounded-[7px] border border-line-200 bg-white text-[13px] font-[500] text-ink-900 shadow-sm transition-colors hover:bg-surface-muted"
            >
              {/* Google G logo */}
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2045C17.64 8.5663 17.5827 7.952 17.4764 7.3636H9V10.845H13.8436C13.635 11.97 13.0009 12.9231 12.0477 13.5613V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.2045Z" fill="#4285F4"/>
                <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5613C11.2418 14.1013 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8372 3.96409 10.71H0.957275V13.0418C2.43818 15.9831 5.48182 18 9 18Z" fill="#34A853"/>
                <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.5936 3.68182 9C3.68182 8.4063 3.78409 7.83 3.96409 7.29V4.9581H0.957275C0.347727 6.1731 0 7.5477 0 9C0 10.4522 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
                <path d="M9 3.5795C10.3214 3.5795 11.5077 4.0336 12.4405 4.9254L15.0218 2.344C13.4632 0.8917 11.4259 0 9 0C5.48182 0 2.43818 2.0168 0.957275 4.9581L3.96409 7.29C4.67182 5.1627 6.65591 3.5795 9 3.5795Z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="mt-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-line-200" />
              <span className="text-sm text-ink-400">or</span>
              <div className="h-px flex-1 bg-line-200" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[12px] font-[550] text-ink-700">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  data-testid="email-input"
                  className="h-10 border-line-200 bg-surface-muted pl-9 text-[13px] text-ink-900 placeholder:text-ink-300 focus-visible:ring-accent-500/30"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[12px] font-[550] text-ink-700">
                  Password
                </Label>
                <a href="#" className="text-sm text-accent-700 hover:text-accent-500">
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  data-testid="password-input"
                  className="h-10 border-line-200 bg-surface-muted pl-9 text-[13px] text-ink-900 placeholder:text-ink-300 focus-visible:ring-accent-500/30"
                />
              </div>
            </div>

            {error && (
              <div
                className="rounded-[8px] border border-danger-surface bg-danger-surface px-3 py-2 text-[12px] text-danger"
                data-testid="error-message"
              >
                {error}
              </div>
            )}

            <LoadingButton
              type="submit"
              data-testid="submit-button"
              className="group h-10 w-full bg-accent-500 text-[12.5px] font-[550] text-white shadow-[0_1px_2px_rgba(94,106,210,0.35)] hover:bg-[#4F5AC4]"
              loading={isLoading}
              loadingText="Signing in…"
            >
              Sign in
              <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </LoadingButton>
          </form>

          <p className="mt-6 text-center text-[12.5px] text-ink-600">
            New to Promptforge?{" "}
            <Link href="/sign-up" className="font-[550] text-accent-700 hover:text-accent-500">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
