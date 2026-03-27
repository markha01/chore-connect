import { NextResponse } from 'next/server';
import { getSession, createSession, clearSession } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';

interface HouseholdRow {
  id: number;
  name: string;
  invite_code: string;
  role: string;
}

// Ensure avatar_url column exists (idempotent)
async function ensureAvatarColumn() {
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`);
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }

    await ensureAvatarColumn();

    const [household, userRow] = await Promise.all([
      queryOne<HouseholdRow>(
        `SELECT h.id, h.name, h.invite_code, hm.role
         FROM households h
         JOIN household_members hm ON hm.household_id = h.id
         WHERE hm.user_id = $1
         ORDER BY hm.joined_at ASC
         LIMIT 1`,
        [session.userId]
      ),
      queryOne<{ avatar_url: string | null }>(
        `SELECT avatar_url FROM users WHERE id = $1`,
        [session.userId]
      ),
    ]);

    return NextResponse.json({
      userId: session.userId,
      username: session.username,
      displayName: session.displayName,
      avatarUrl: userRow?.avatar_url ?? null,
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

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }

    const body = await request.json();
    const { displayName, avatarUrl } = body as {
      displayName?: string;
      avatarUrl?: string | null;
    };

    if (displayName !== undefined) {
      if (!displayName.trim()) {
        return NextResponse.json({ error: 'Name cannot be empty.' }, { status: 400 });
      }
      if (displayName.trim().length > 40) {
        return NextResponse.json({ error: 'Name too long.' }, { status: 400 });
      }
    }

    if (avatarUrl !== undefined && avatarUrl !== null) {
      if (typeof avatarUrl !== 'string' || !avatarUrl.startsWith('data:image/')) {
        return NextResponse.json({ error: 'Invalid avatar format.' }, { status: 400 });
      }
      if (avatarUrl.length > 200000) {
        return NextResponse.json({ error: 'Avatar image is too large.' }, { status: 400 });
      }
    }

    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (displayName !== undefined) {
      updates.push(`display_name = $${idx}`);
      params.push(displayName.trim());
      idx++;
    }

    if (avatarUrl !== undefined) {
      await ensureAvatarColumn();
      updates.push(`avatar_url = $${idx}`);
      params.push(avatarUrl);
      idx++;
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
    }

    params.push(session.userId);
    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`, params);

    // Refresh session if display name changed
    if (displayName !== undefined) {
      await createSession({
        userId: session.userId,
        username: session.username,
        displayName: displayName.trim(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[me PUT]', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }

    const household = await queryOne<{ id: number; owner_id: number; member_count: string }>(
      `SELECT h.id, h.owner_id, COUNT(hm2.user_id)::text AS member_count
       FROM households h
       JOIN household_members hm ON hm.household_id = h.id
       JOIN household_members hm2 ON hm2.household_id = h.id
       WHERE hm.user_id = $1
       GROUP BY h.id, h.owner_id`,
      [session.userId]
    );

    if (household) {
      const memberCount = parseInt(household.member_count, 10);
      if (household.owner_id === session.userId && memberCount > 1) {
        return NextResponse.json(
          { error: 'You are the owner of a household with other members. Please remove them or leave before deleting your account.' },
          { status: 400 }
        );
      }

      if (household.owner_id === session.userId) {
        // Solo owner — delete household and all its data
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
    }

    await query(`DELETE FROM users WHERE id = $1`, [session.userId]);
    clearSession();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[me DELETE]', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
