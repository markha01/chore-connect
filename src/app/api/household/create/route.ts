import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getSession } from '@/lib/auth';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }

    const body = await req.json();
    const { name } = body as { name?: string };

    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Give your household a name (at least 2 characters).' },
        { status: 400 }
      );
    }

    if (name.trim().length > 60) {
      return NextResponse.json(
        { error: 'Household name is too long (max 60 characters).' },
        { status: 400 }
      );
    }

    // Check if user already has a household
    const existing = await queryOne(
      `SELECT h.id FROM households h
       JOIN household_members hm ON hm.household_id = h.id
       WHERE hm.user_id = $1`,
      [session.userId]
    );

    if (existing) {
      return NextResponse.json(
        { error: 'You already belong to a household.' },
        { status: 409 }
      );
    }

    // Generate unique invite code
    let inviteCode: string;
    let attempts = 0;
    do {
      inviteCode = generateInviteCode();
      const taken = await queryOne(
        'SELECT id FROM households WHERE invite_code = $1',
        [inviteCode]
      );
      if (!taken) break;
      attempts++;
    } while (attempts < 10);

    const rows = await query<{ id: number; invite_code: string }>(
      'INSERT INTO households (name, invite_code, owner_id) VALUES ($1, $2, $3) RETURNING id, invite_code',
      [name.trim(), inviteCode!, session.userId]
    );

    const household = rows[0];

    await query(
      'INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, $3)',
      [household.id, session.userId, 'owner']
    );

    return NextResponse.json(
      { success: true, household: { id: household.id, name: name.trim(), inviteCode: household.invite_code } },
      { status: 201 }
    );
  } catch (err) {
    console.error('[household/create]', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
