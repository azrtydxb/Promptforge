import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ModalProvider } from "@/components/providers/modal-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { GlobalErrorBoundary } from "@/components/error-boundary/global-error-boundary";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

// Use system monospace font to avoid Turbopack font loading issues
const systemMono = {
  variable: "--font-jetbrains-mono",
  className: "font-mono",
};

export const metadata: Metadata = {
  title: "Prompt Manager",
  description: "Organize your AI Prompts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("antialiased", inter.className, systemMono.variable)}>
        {/* Skip navigation links for accessibility */}
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-primary text-primary-foreground px-4 py-2 rounded-md">
          Skip to main content
        </a>
        <a href="#main-navigation" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-48 focus:z-50 bg-primary text-primary-foreground px-4 py-2 rounded-md">
          Skip to navigation
        </a>
        <GlobalErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              <ModalProvider />
              {children}
              <Toaster />
              <Sonner 
                theme="system"
                toastOptions={{
                  style: {
                    background: 'hsl(var(--card))',
                    color: 'hsl(var(--card-foreground))',
                    border: '1px solid hsl(var(--border))',
                  },
                }}
              />
            </AuthProvider>
          </ThemeProvider>
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
