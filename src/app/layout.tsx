import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ModalProvider } from "@/components/providers/modal-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { GlobalErrorBoundary } from "@/components/error-boundary/global-error-boundary";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "sonner";
import NextTopLoader from "nextjs-toploader";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

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
      <body className={cn("antialiased", inter.variable, jetbrainsMono.variable, "font-sans")}>
        <NextTopLoader
          color="#546ee5"
          height={3}
          showSpinner={false}
          easing="ease"
          speed={200}
        />
        {/* Skip navigation links for accessibility */}
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-primary text-white px-4 py-2 rounded-md">
          Skip to main content
        </a>
        <a href="#main-navigation" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-48 focus:z-50 bg-primary text-white px-4 py-2 rounded-md">
          Skip to navigation
        </a>
        <GlobalErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            forcedTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            <AuthProvider>
              <ModalProvider />
              {children}
              <Toaster
                theme="light"
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
