"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Zap,
  Folder,
  Search,
  History,
  ArrowRight,
  Sparkles,
  Users,
  Target,
  Layers,
  CheckCircle
} from "lucide-react";

export function HomeClient() {
  const { status } = useSession();
  const router = useRouter();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 w-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 w-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Don't render for authenticated users (they're being redirected)
  if (status === "authenticated") {
    return null;
  }

  const handleSignIn = () => router.push("/sign-in");
  const handleSignUp = () => router.push("/sign-up");
  const handleScrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden relative">
      {/* Hyper Hero Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--primary))]/5 via-background to-[hsl(var(--primary))]/3"></div>

      {/* Hero Section with Hyper Gradient (includes navbar) */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#6379c3] to-[#546ee5]">
        {/* Navigation */}
        <nav className="absolute top-0 w-full z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white dark:bg-card shadow-[0_2px_0_rgba(0,0,0,0.045)] dark:shadow-none">
                  <Zap className="h-6 w-6 text-[hsl(var(--primary))]" />
                </div>
                <span className="text-xl font-bold text-white tracking-wide">PromptForge</span>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  className="text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                  onClick={handleSignIn}
                >
                  Sign In
                </Button>
                <Button
                  className="bg-white hover:bg-white/90 text-[hsl(var(--primary))] shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200 font-semibold"
                  onClick={handleSignUp}
                >
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        </nav>

        <div className="relative pt-16 pb-8 px-6">

        <div className="container mx-auto relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-sm text-white mb-8">
                  <Sparkles className="w-4 h-4" />
                  Welcome to the future of prompt management
                </div>
              </div>

              <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 leading-tight text-white">
                Craft Perfect AI Prompts
              </h1>

              <p className="text-lg text-white/90 mb-8 leading-relaxed">
                Transform scattered prompts into an organized knowledge base. Create, manage,
                and version your AI prompts with professional-grade tools designed for creators.
              </p>

              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Button
                  size="lg"
                  className="w-full sm:w-auto text-base px-8 py-4 bg-white hover:bg-white/90 text-[#546ee5] shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200 hover:scale-105 group font-semibold"
                  onClick={handleSignUp}
                >
                  Start Building
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className="w-full sm:w-auto text-base text-white/80 hover:text-white hover:bg-white/10 backdrop-blur-sm border border-white/20"
                  onClick={handleScrollToFeatures}
                >
                  Explore Features
                </Button>
              </div>
            </div>

            <div className="text-center md:text-end mt-4 md:mt-0">
              <Image
                src="/images/svg/startup.svg"
                alt="Team collaboration on laptops"
                width={384}
                height={384}
                className="w-full max-w-xs mx-auto md:max-w-sm h-auto"
                priority
              />
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 relative">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
              Everything you need for
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                {" "}prompt mastery
              </span>
            </h2>
            <p className="text-muted-foreground text-xl max-w-3xl mx-auto leading-relaxed">
              Built for prompt engineers, researchers, and AI enthusiasts who demand
              organization, efficiency, and professional-grade tools.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            {/* Feature Card 1 */}
            <Card className="bg-card border-border p-8 hover:shadow-lg transition-all duration-300 hover:scale-105 group shadow-[var(--box-shadow)]">
              <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-4 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform">
                <Folder className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4 text-card-foreground">Smart Organization</h3>
              <p className="text-muted-foreground leading-relaxed">
                Organize prompts into folders, tag them intelligently, and find what you need
                instantly with powerful semantic search capabilities.
              </p>
            </Card>

            {/* Feature Card 2 */}
            <Card className="bg-card border-border p-8 hover:shadow-lg transition-all duration-300 hover:scale-105 group shadow-[var(--box-shadow)]">
              <div className="bg-gradient-to-br from-green-500 to-teal-500 p-4 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform">
                <History className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4 text-card-foreground">Version Control</h3>
              <p className="text-muted-foreground leading-relaxed">
                Track changes, compare versions, and never lose a great prompt iteration.
                Full history tracking with rollback capabilities.
              </p>
            </Card>

            {/* Feature Card 3 */}
            <Card className="bg-card border-border p-8 hover:shadow-lg transition-all duration-300 hover:scale-105 group shadow-[var(--box-shadow)]">
              <div className="bg-gradient-to-br from-orange-500 to-red-500 p-4 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform">
                <Search className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4 text-card-foreground">Advanced Search</h3>
              <p className="text-muted-foreground leading-relaxed">
                Find any prompt instantly with semantic search, intelligent tagging, and
                advanced filters. Your entire prompt library at your fingertips.
              </p>
            </Card>
          </div>

          {/* Additional Features */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-6 bg-card rounded-xl border border-border shadow-[var(--box-shadow)] hover:shadow-lg transition-shadow">
              <Users className="h-8 w-8 text-[hsl(var(--primary))] mx-auto mb-4" />
              <h4 className="font-semibold text-card-foreground mb-2">Team Collaboration</h4>
              <p className="text-muted-foreground text-sm">Share and collaborate on prompts with your team</p>
            </div>
            <div className="text-center p-6 bg-card rounded-xl border border-border shadow-[var(--box-shadow)] hover:shadow-lg transition-shadow">
              <Target className="h-8 w-8 text-green-400 mx-auto mb-4" />
              <h4 className="font-semibold text-card-foreground mb-2">Performance Analytics</h4>
              <p className="text-muted-foreground text-sm">Track prompt performance and effectiveness</p>
            </div>
            <div className="text-center p-6 bg-card rounded-xl border border-border shadow-[var(--box-shadow)] hover:shadow-lg transition-shadow">
              <Layers className="h-8 w-8 text-purple-400 mx-auto mb-4" />
              <h4 className="font-semibold text-card-foreground mb-2">Template Library</h4>
              <p className="text-muted-foreground text-sm">Access curated prompt templates and examples</p>
            </div>
            <div className="text-center p-6 bg-card rounded-xl border border-border shadow-[var(--box-shadow)] hover:shadow-lg transition-shadow">
              <CheckCircle className="h-8 w-8 text-orange-400 mx-auto mb-4" />
              <h4 className="font-semibold text-card-foreground mb-2">Quality Assurance</h4>
              <p className="text-muted-foreground text-sm">Built-in validation and optimization tools</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#6379c3] to-[#546ee5]"></div>
        <div className="container mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            Ready to master your prompts?
          </h2>
          <p className="text-white/90 text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            Join thousands of AI enthusiasts who have transformed their prompt workflow
            with PromptForge&apos;s professional-grade tools.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="w-full sm:w-auto text-base px-8 py-4 bg-white hover:bg-white/90 text-[#727cf5] shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200 hover:scale-105 group font-semibold"
              onClick={handleSignUp}
            >
              Start Your Journey
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="w-full sm:w-auto text-base text-white/80 hover:text-white hover:bg-white/10 backdrop-blur-sm border border-white/20"
              onClick={handleSignIn}
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border bg-background relative">
        <div className="container mx-auto">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-white dark:bg-card shadow-[0_2px_0_rgba(0,0,0,0.045)] dark:shadow-none">
                <Zap className="h-6 w-6 text-[hsl(var(--primary))]" />
              </div>
              <span className="text-xl font-bold text-foreground tracking-wide">PromptForge</span>
            </div>
            <p className="text-muted-foreground mb-6">
              Empowering creative workflows with professional prompt management.
            </p>
            <div className="border-t border-border pt-6">
              <p className="text-muted-foreground text-sm">
                © 2024 PromptForge. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
