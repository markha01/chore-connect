import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getSession } from '@/lib/auth';

async function ensureTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS message_likes (
      message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      PRIMARY KEY (message_id, user_id)
    )
  `);
}

interface MessageRow {
  id: number;
  user_id: number;
  display_name: string;
  content: string;
  created_at: string;
  like_count: string;
  liked_by_me: boolean | null;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }

    await ensureTables();

    const household = await queryOne<{ id: number }>(
      `SELECT h.id FROM households h
       JOIN household_members hm ON hm.household_id = h.id
       WHERE hm.user_id = $1
       LIMIT 1`,
      [session.userId]
    );

    if (!household) {
      return NextResponse.json({ error: 'You are not in a household.' }, { status: 403 });
    }

    const rows = await query<MessageRow>(
      `SELECT
         m.id,
         m.user_id,
         u.display_name,
         m.content,
         m.created_at,
         COUNT(ml.user_id)::text AS like_count,
         COALESCE(BOOL_OR(ml.user_id = $2), false) AS liked_by_me
       FROM messages m
       JOIN users u ON u.id = m.user_id
       LEFT JOIN message_likes ml ON ml.message_id = m.id
       WHERE m.household_id = $1
       GROUP BY m.id, u.display_name
       ORDER BY m.created_at ASC`,
      [household.id, session.userId]
    );

    const messages = rows.map(r => ({
      ...r,
      like_count: Number(r.like_count),
      liked_by_me: r.liked_by_me ?? false,
    }));

    return NextResponse.json({ messages });
  } catch (err) {
    console.error('[messages GET]', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }

    const body = await req.json();
    const content = String(body.content ?? '').trim();

    if (!content || content.length > 500) {
      return NextResponse.json(
        { error: 'Message must be 1–500 characters.' },
        { status: 400 }
      );
    }

    await ensureTables();

    const household = await queryOne<{ id: number }>(
      `SELECT h.id FROM households h
       JOIN household_members hm ON hm.household_id = h.id
       WHERE hm.user_id = $1
       LIMIT 1`,
      [session.userId]
    );

    if (!household) {
      return NextResponse.json({ error: 'You are not in a household.' }, { status: 403 });
    }

    const rows = await query<{ id: number }>(
      'INSERT INTO messages (household_id, user_id, content) VALUES ($1, $2, $3) RETURNING id',
      [household.id, session.userId, content]
    );

    return NextResponse.json({ success: true, messageId: rows[0].id }, { status: 201 });
  } catch (err) {
    console.error('[messages POST]', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
