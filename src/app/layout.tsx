import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ModalProvider } from "@/components/providers/modal-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { GlobalErrorBoundary } from "@/components/error-boundary/global-error-boundary";

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
        <GlobalErrorBoundary>
          <AuthProvider>
            <ModalProvider />
            {children}
          </AuthProvider>
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
