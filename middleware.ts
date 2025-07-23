import { withAuth } from "next-auth/middleware"
import { NextRequest, NextResponse } from 'next/server'
import { rateLimitMiddleware, applyRateLimitHeaders } from './src/lib/rate-limit'

// Protected routes that require authentication
const protectedPaths = [
  '/dashboard',
  '/profile',
  '/admin-monitoring',
  '/prompts',
  '/shared-prompts',
  '/group-by-tags',
  '/tags',
]

// Main middleware function
export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Apply rate limiting first
  const rateLimitResponse = await rateLimitMiddleware(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }
  
  // Check if path requires authentication
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
  
  if (isProtectedPath) {
    // Use withAuth for protected routes
    const authMiddleware = withAuth({
      callbacks: {
        authorized: ({ token }) => !!token,
      },
    })
    
    // Run auth middleware
    const response = await authMiddleware(request as any, NextResponse.next() as any)
    
    // Apply rate limit headers to the response
    if (response instanceof NextResponse) {
      return await applyRateLimitHeaders(request, response)
    }
    
    return response
  }
  
  // For non-protected routes, just apply rate limit headers
  const response = NextResponse.next()
  return await applyRateLimitHeaders(request, response)
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /_next/* (Next.js internals)
     * - /favicon.ico, /robots.txt, /sitemap.xml
     * - Static files (images, fonts, etc.)
     */
    '/((?!_next|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf)).*)',
  ],
}