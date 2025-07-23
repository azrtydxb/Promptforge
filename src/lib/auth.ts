import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth-config"
import { getUserByEmail } from "@/app/actions/user.actions"
import { logger } from "@/lib/logger"

export async function getCurrentUser() {
  try {
    logger.debug("Getting current user session")
    const session = await getServerSession(authOptions)
    
    logger.debug("Session data retrieved", { 
      hasSession: !!session,
      hasEmail: !!session?.user?.email 
    })
    
    if (!session?.user?.email) {
      logger.debug("No session or email found")
      return null
    }

    logger.debug("Fetching user by email", { email: session.user.email })
    const user = await getUserByEmail(session.user.email)
    logger.debug("User lookup completed", { 
      userId: user?.id,
      found: !!user 
    })
    return user
  } catch (error) {
    logger.error("Error getting current user", error)
    return null
  }
}

export async function requireAuth() {
  logger.debug("Requiring authentication")
  const user = await getCurrentUser()
  
  if (!user) {
    logger.warn("User not authenticated - throwing error")
    throw new Error("User not authenticated")
  }
  
  logger.debug("User authenticated successfully", { userId: user.id })
  return user
}