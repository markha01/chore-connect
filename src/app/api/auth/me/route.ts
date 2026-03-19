import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { queryOne } from '@/lib/db';

interface HouseholdRow {
  id: number;
  name: string;
  invite_code: string;
  role: string;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }

    const household = await queryOne<HouseholdRow>(
      `SELECT h.id, h.name, h.invite_code, hm.role
       FROM households h
       JOIN household_members hm ON hm.household_id = h.id
       WHERE hm.user_id = $1
       ORDER BY hm.joined_at ASC
       LIMIT 1`,
      [session.userId]
    );

    return NextResponse.json({
      userId: session.userId,
      username: session.username,
      displayName: session.displayName,
      household: household ?? null,
    });
  } catch (err) {
    console.error('[me]', err);
    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    );
  }
}
