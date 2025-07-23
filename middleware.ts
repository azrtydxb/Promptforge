import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { randomUUID } from "crypto"
import { requestContext, logger } from "@/lib/logger"

// Generate or retrieve request ID
function getRequestId(request: NextRequest): string {
  return request.headers.get('x-request-id') || randomUUID()
}

// Custom middleware that adds request tracking
function withRequestTracking(middleware: any) {
  return async (request: NextRequest, event: any) => {
    const requestId = getRequestId(request)
    const startTime = Date.now()
    
    // Create request context
    const context = {
      requestId,
      method: request.method,
      path: request.nextUrl.pathname,
      query: Object.fromEntries(request.nextUrl.searchParams),
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    }
    
    // Log incoming request
    logger.info('Incoming request', {
      ...context,
      url: request.url,
    })
    
    // Run the middleware with context
    const response = await requestContext.run(context, async () => {
      const result = await middleware(request, event)
      return result || NextResponse.next()
    })
    
    // Add request ID to response headers
    response.headers.set('x-request-id', requestId)
    
    // Log response
    const duration = Date.now() - startTime
    logger.info('Request completed', {
      ...context,
      duration,
      status: response.status,
    })
    
    return response
  }
}

// Combine auth and request tracking
export default withRequestTracking(
  withAuth({
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  })
)

export const config = {
  matcher: [
    /*
     * Protected routes that require authentication:
     * - /dashboard (all dashboard routes)
     * - /profile (all profile routes)
     * - /admin-monitoring (admin dashboard)
     * - /prompts (prompt management)
     * - /shared-prompts (marketplace - requires auth)
     * - /group-by-tags (tag grouping)
     * - /tags (tag management)
     * 
     * Public routes (not in matcher):
     * - / (home page)
     * - /sign-in
     * - /sign-up
     * - /api/auth/* (auth endpoints)
     * - /_next/* (Next.js internals)
     * - /favicon.ico
     */
    '/dashboard/:path*',
    '/profile/:path*',
    '/admin-monitoring/:path*',
    '/prompts/:path*',
    '/shared-prompts/:path*',
    '/group-by-tags/:path*',
    '/tags/:path*',
  ],
};