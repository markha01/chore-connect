import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }

    const household = await queryOne<{ id: number; owner_id: number }>(
      `SELECT h.id, h.owner_id
       FROM households h
       JOIN household_members hm ON hm.household_id = h.id
       WHERE hm.user_id = $1
       LIMIT 1`,
      [session.userId]
    );

    if (!household) {
      return NextResponse.json({ error: 'You are not in a household.' }, { status: 404 });
    }

    if (household.owner_id === session.userId) {
      // Check how many members remain
      const rows = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM household_members WHERE household_id = $1`,
        [household.id]
      );
      const memberCount = parseInt(rows[0]?.count ?? '0', 10);

      if (memberCount > 1) {
        return NextResponse.json(
          { error: 'You are the owner. Remove other members or transfer ownership before leaving.' },
          { status: 400 }
        );
      }

      // Last member — delete household and all its data
      await query(`DELETE FROM household_members WHERE household_id = $1`, [household.id]);
      await query(`DELETE FROM chores WHERE household_id = $1`, [household.id]);
      await query(`DELETE FROM messages WHERE household_id = $1`, [household.id]);
      await query(`DELETE FROM households WHERE id = $1`, [household.id]);
    } else {
      await query(
        `DELETE FROM household_members WHERE household_id = $1 AND user_id = $2`,
        [household.id, session.userId]
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[household/leave]', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
