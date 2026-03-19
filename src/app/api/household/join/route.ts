import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getSession } from '@/lib/auth';

interface HouseholdRow {
  id: number;
  name: string;
  invite_code: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }

    const body = await req.json();
    const { inviteCode } = body as { inviteCode?: string };

    if (!inviteCode || inviteCode.trim().length === 0) {
      return NextResponse.json(
        { error: 'Please enter an invite code.' },
        { status: 400 }
      );
    }

    const code = inviteCode.trim().toUpperCase();

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

    const household = await queryOne<HouseholdRow>(
      'SELECT id, name, invite_code FROM households WHERE invite_code = $1',
      [code]
    );

    if (!household) {
      return NextResponse.json(
        { error: 'That invite code does not match any household. Double-check and try again.' },
        { status: 404 }
      );
    }

    await query(
      'INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, $3)',
      [household.id, session.userId, 'member']
    );

    return NextResponse.json({
      success: true,
      household: { id: household.id, name: household.name, inviteCode: household.invite_code },
    });
  } catch (err) {
    console.error('[household/join]', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
