"use client"

import { useState } from "react"
import { signIn, getSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Zap, Mail, Lock, ArrowRight, Loader2 } from "lucide-react"

export default function SignInPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

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
        // Wait for session to be updated
        await getSession()
        router.push("/dashboard")
        router.refresh()
      }
    } catch {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-gradient-to-b from-[#6379c3] to-[#546ee5]">
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo/Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-white shadow-[0_2px_0_rgba(0,0,0,0.045)]">
              <Zap className="h-8 w-8 text-[#6379c3]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-wide">PromptForge</h1>
              <p className="text-white/80 text-sm">Craft Your Perfect Prompts</p>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-2xl">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl text-center text-gray-800 font-semibold">
              Welcome Back
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    className="pl-10 bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]/20 shadow-sm"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    className="pl-10 bg-input border-border text-foreground placeholder:text-muted-foreground focus:border-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]/20 shadow-sm"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-[hsl(var(--destructive))]/10 border border-[hsl(var(--destructive))]/20 text-[hsl(var(--destructive))] px-4 py-3 rounded-lg text-sm text-center shadow-sm">
                  {error}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-[#6379c3] hover:bg-[#546ee5] text-white shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200 font-medium py-3 group"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground">
              New to PromptForge?
            </div>

            <div className="text-center">
              <Link 
                href="/sign-up" 
                className="inline-flex items-center gap-2 text-[#6379c3] hover:text-[#546ee5] transition-colors duration-200 font-medium group"
              >
                Create an account
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-white/70 text-sm">
          <p>© 2024 PromptForge. Empowering creative workflows.</p>
        </div>
      </div>
    </div>
  )
}