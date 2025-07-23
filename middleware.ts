import { withAuth } from "next-auth/middleware"

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
})

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