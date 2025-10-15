import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    console.log('[TEST-AUTH] Request received:', { email });

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    // Find user
    const user = await db.user.findUnique({
      where: { email }
    });

    console.log('[TEST-AUTH] User found:', {
      exists: !!user,
      hasPassword: !!user?.password,
      passwordLength: user?.password?.length
    });

    if (!user || !user.password) {
      return NextResponse.json({ error: 'User not found or no password' }, { status: 404 });
    }

    // Test password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('[TEST-AUTH] Password comparison result:', isPasswordValid);

    return NextResponse.json({
      success: isPasswordValid,
      user: isPasswordValid ? {
        id: user.id,
        email: user.email,
        name: user.name
      } : null
    });
  } catch (error) {
    console.error('[TEST-AUTH] Error:', error);
    return NextResponse.json({ error: 'Internal error', details: String(error) }, { status: 500 });
  }
}
