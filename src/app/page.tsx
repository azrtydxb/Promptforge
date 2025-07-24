"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

export default function Home() {
  const { status } = useSession();
  const router = useRouter();
  const [userCount, setUserCount] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/prompts");
    }
  }, [status, router]);

  // Animate user count on load
  useEffect(() => {
    const interval = setInterval(() => {
      setUserCount(prev => {
        if (prev < 1247) {
          return prev + Math.floor(Math.random() * 25) + 1;
        }
        clearInterval(interval);
        return 1247;
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  // Handle scroll effects
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 w-32 bg-white/10 rounded mb-4"></div>
          <div className="h-4 w-48 bg-white/10 rounded"></div>
        </div>
      </div>
    );
  }

  // Don't render for authenticated users (they're being redirected)
  if (status === "authenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden relative">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
      </div>

      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? "backdrop-blur-md bg-gray-900/80 border-b border-white/10"
          : "bg-transparent"
      }`}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-wide">PromptForge</span>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                className="text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                onClick={() => router.push("/sign-in")}
              >
                Sign In
              </Button>
              <Button
                className="bg-white/20 hover:bg-white/30 text-white border border-white/30 hover:border-white/40 transition-all duration-200"
                onClick={() => router.push("/sign-up")}
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative">
        {/* Gradient Orbs */}
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-[hsl(var(--accent))]/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-[hsl(var(--accent))]/10 rounded-full blur-3xl"></div>
        
        <div className="container mx-auto text-center relative z-10">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-sm text-gray-300 mb-8">
              <Sparkles className="w-4 h-4" />
              Welcome to the future of prompt management
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300">
              Craft Perfect
            </span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              AI Prompts
            </span>
          </h1>
          
          <p className="text-xl text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed">
            Transform scattered prompts into an organized knowledge base. Create, manage, 
            and version your AI prompts with professional-grade tools designed for creators.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button
              size="lg"
              className="w-full sm:w-auto text-base px-8 py-4 bg-white/20 hover:bg-white/30 text-white border border-white/30 hover:border-white/40 transition-all duration-200 hover:scale-105 group"
              onClick={() => router.push("/sign-up")}
            >
              Start Building
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="w-full sm:w-auto text-base text-gray-300 hover:text-white hover:bg-white/10"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Explore Features
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">
                {userCount.toLocaleString()}+
              </div>
              <p className="text-gray-400">Prompts Organized</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">500+</div>
              <p className="text-gray-400">Active Users</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">99.9%</div>
              <p className="text-gray-400">Uptime</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 relative">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              Everything you need for
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                {" "}prompt mastery
              </span>
            </h2>
            <p className="text-gray-300 text-xl max-w-3xl mx-auto leading-relaxed">
              Built for prompt engineers, researchers, and AI enthusiasts who demand 
              organization, efficiency, and professional-grade tools.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            {/* Feature Card 1 */}
            <Card className="backdrop-blur-sm bg-white/10 border-white/20 p-8 hover:bg-white/15 transition-all duration-300 hover:scale-105 group">
              <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-4 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform">
                <Folder className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4 text-white">Smart Organization</h3>
              <p className="text-gray-300 leading-relaxed">
                Organize prompts into folders, tag them intelligently, and find what you need 
                instantly with powerful semantic search capabilities.
              </p>
            </Card>

            {/* Feature Card 2 */}
            <Card className="backdrop-blur-sm bg-white/10 border-white/20 p-8 hover:bg-white/15 transition-all duration-300 hover:scale-105 group">
              <div className="bg-gradient-to-br from-green-500 to-teal-500 p-4 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform">
                <History className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4 text-white">Version Control</h3>
              <p className="text-gray-300 leading-relaxed">
                Track changes, compare versions, and never lose a great prompt iteration. 
                Full history tracking with rollback capabilities.
              </p>
            </Card>

            {/* Feature Card 3 */}
            <Card className="backdrop-blur-sm bg-white/10 border-white/20 p-8 hover:bg-white/15 transition-all duration-300 hover:scale-105 group">
              <div className="bg-gradient-to-br from-orange-500 to-red-500 p-4 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform">
                <Search className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4 text-white">Advanced Search</h3>
              <p className="text-gray-300 leading-relaxed">
                Find any prompt instantly with semantic search, intelligent tagging, and 
                advanced filters. Your entire prompt library at your fingertips.
              </p>
            </Card>
          </div>

          {/* Additional Features */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-6 backdrop-blur-sm bg-white/5 rounded-xl border border-white/10">
              <Users className="h-8 w-8 text-blue-400 mx-auto mb-4" />
              <h4 className="font-semibold text-white mb-2">Team Collaboration</h4>
              <p className="text-gray-400 text-sm">Share and collaborate on prompts with your team</p>
            </div>
            <div className="text-center p-6 backdrop-blur-sm bg-white/5 rounded-xl border border-white/10">
              <Target className="h-8 w-8 text-green-400 mx-auto mb-4" />
              <h4 className="font-semibold text-white mb-2">Performance Analytics</h4>
              <p className="text-gray-400 text-sm">Track prompt performance and effectiveness</p>
            </div>
            <div className="text-center p-6 backdrop-blur-sm bg-white/5 rounded-xl border border-white/10">
              <Layers className="h-8 w-8 text-purple-400 mx-auto mb-4" />
              <h4 className="font-semibold text-white mb-2">Template Library</h4>
              <p className="text-gray-400 text-sm">Access curated prompt templates and examples</p>
            </div>
            <div className="text-center p-6 backdrop-blur-sm bg-white/5 rounded-xl border border-white/10">
              <CheckCircle className="h-8 w-8 text-orange-400 mx-auto mb-4" />
              <h4 className="font-semibold text-white mb-2">Quality Assurance</h4>
              <p className="text-gray-400 text-sm">Built-in validation and optimization tools</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
        <div className="container mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            Ready to master your prompts?
          </h2>
          <p className="text-gray-300 text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            Join thousands of AI enthusiasts who have transformed their prompt workflow 
            with PromptForge&apos;s professional-grade tools.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="w-full sm:w-auto text-base px-8 py-4 bg-white/20 hover:bg-white/30 text-white border border-white/30 hover:border-white/40 transition-all duration-200 hover:scale-105 group"
              onClick={() => router.push("/sign-up")}
            >
              Start Your Journey
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="w-full sm:w-auto text-base text-gray-300 hover:text-white hover:bg-white/10"
              onClick={() => router.push("/sign-in")}
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10 relative">
        <div className="container mx-auto">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-wide">PromptForge</span>
            </div>
            <p className="text-gray-400 mb-6">
              Empowering creative workflows with professional prompt management.
            </p>
            <div className="border-t border-white/10 pt-6">
              <p className="text-gray-500 text-sm">
                © 2024 PromptForge. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
