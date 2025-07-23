import { withAuth } from "next-auth/middleware"
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from "crypto"
import { requestContext, logger } from "@/lib/logger"
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

// Generate or retrieve request ID
function getRequestId(request: NextRequest): string {
  return request.headers.get('x-request-id') || randomUUID()
}

// Main middleware function combining rate limiting, logging, and auth
export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const requestId = getRequestId(request)
  const startTime = Date.now()
  
  // Create request context for logging
  const context = {
    requestId,
    method: request.method,
    path: pathname,
    query: Object.fromEntries(request.nextUrl.searchParams),
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
  }
  
  // Run the rest of the middleware with logging context
  const response = await requestContext.run(context, async () => {
    // Log incoming request
    logger.info('Incoming request', {
      ...context,
      url: request.url,
    })
    
    // Apply rate limiting first
    const rateLimitResponse = await rateLimitMiddleware(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }
    
    // Check if path requires authentication
    const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
    
    let finalResponse: NextResponse
    
    if (isProtectedPath) {
      // Use withAuth for protected routes
      const authMiddleware = withAuth({
        callbacks: {
          authorized: ({ token }) => !!token,
        },
      })
      
      // Run auth middleware
      const authResponse = await authMiddleware(request as any, NextResponse.next() as any)
      finalResponse = authResponse instanceof NextResponse ? authResponse : NextResponse.next()
    } else {
      // For non-protected routes, just continue
      finalResponse = NextResponse.next()
    }
    
    // Apply rate limit headers
    finalResponse = await applyRateLimitHeaders(request, finalResponse)
    
    // Add request ID to response headers
    finalResponse.headers.set('x-request-id', requestId)
    
    // Log response
    const duration = Date.now() - startTime
    logger.info('Request completed', {
      ...context,
      duration,
      status: finalResponse.status,
    })
    
    return finalResponse
  })
  
  return response
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