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
            Create, organize, and version your prompts — then share them privately with your
            team or publish to the Prompt Market.
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
        </div>

        <div className="relative text-[11px] text-rail-text-dim">
          © 2026 Promptforge
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[360px]">
          <h2 className="text-[21px] font-[660] tracking-[-0.02em] text-ink-900">Welcome back</h2>
          <p className="mt-1 text-[13px] text-ink-600">Sign in to your Promptforge workspace.</p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[12px] font-[550] text-ink-700">
                Email Address
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
              <Label htmlFor="password" className="text-[12px] font-[550] text-ink-700">
                Password
              </Label>
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
