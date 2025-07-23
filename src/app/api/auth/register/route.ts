import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { z } from "zod"
import { generateRandomUsername } from "@/lib/username-generator"
import { logger } from "@/lib/logger"
import { checkApiRateLimit } from "@/lib/rate-limit"

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export async function POST(request: NextRequest) {
  // Check rate limit for auth endpoints
  const rateLimitResponse = await checkApiRateLimit(request, 'auth');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let body: unknown;
  try {
    body = await request.json()
    const { name, email, password } = registerSchema.parse(body)

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      logger.warn("Registration attempt with existing email", { email })
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Generate unique username
    let username = generateRandomUsername();
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      const existingUser = await db.user.findUnique({
        where: { username },
      });
      
      if (!existingUser) {
        isUnique = true;
      } else {
        username = generateRandomUsername();
        attempts++;
      }
    }

    if (attempts >= 10) {
      logger.error("Failed to generate unique username after 10 attempts")
      return NextResponse.json(
        { error: "Failed to generate unique username" },
        { status: 500 }
      )
    }

    // Create user
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        username,
      },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
      }
    })

    logger.info("User created successfully", { userId: user.id, email: user.email })

    return NextResponse.json(
      { user, message: "User created successfully" },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn("Invalid registration input", { 
        errors: error.errors,
        body 
      })
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    logger.error("Registration error", { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}