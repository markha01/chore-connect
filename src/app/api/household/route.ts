import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getSession } from '@/lib/auth';

interface MemberRow {
  user_id: number;
  display_name: string;
  username: string;
  role: string;
  joined_at: string;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }

    const household = await queryOne<{
      id: number;
      name: string;
      invite_code: string;
      owner_id: number;
    }>(
      `SELECT h.id, h.name, h.invite_code, h.owner_id
       FROM households h
       JOIN household_members hm ON hm.household_id = h.id
       WHERE hm.user_id = $1
       ORDER BY hm.joined_at ASC
       LIMIT 1`,
      [session.userId]
    );

    if (!household) {
      return NextResponse.json({ household: null });
    }

    const members = await query<MemberRow>(
      `SELECT u.id as user_id, u.display_name, u.username, hm.role, hm.joined_at
       FROM household_members hm
       JOIN users u ON u.id = hm.user_id
       WHERE hm.household_id = $1
       ORDER BY hm.joined_at ASC`,
      [household.id]
    );

    return NextResponse.json({
      household: {
        id: household.id,
        name: household.name,
        inviteCode: household.invite_code,
        ownerId: household.owner_id,
        members,
      },
    });
  } catch (err) {
    console.error('[household]', err);
    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    );
  }
}
