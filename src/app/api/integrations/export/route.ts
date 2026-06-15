import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Service-to-service read endpoint for NovaCRM to sync Promptforge users & teams.
// Protected by a shared bearer token (INTEGRATION_SERVICE_TOKEN).
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const expected = process.env.INTEGRATION_SERVICE_TOKEN;
  const provided =
    req.headers.get('x-service-token') ||
    (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');

  if (!expected || provided !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const [users, teams] = await Promise.all([
      db.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          role: true,
          createdAt: true,
          _count: { select: { teamMemberships: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 2000,
      }),
      db.team.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          createdAt: true,
          createdBy: { select: { name: true, email: true } },
          _count: { select: { members: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 2000,
      }),
    ]);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        username: u.username,
        role: u.role,
        createdAt: u.createdAt,
        teams: u._count.teamMemberships,
      })),
      teams: teams.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        active: t.isActive,
        owner: t.createdBy?.name || t.createdBy?.email || '',
        members: t._count.members,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'export failed' },
      { status: 500 },
    );
  }
}
