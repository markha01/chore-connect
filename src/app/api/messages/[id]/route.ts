import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }

    const messageId = Number(params.id);
    if (!messageId) {
      return NextResponse.json({ error: 'Invalid message ID.' }, { status: 400 });
    }

    const rows = await query(
      'DELETE FROM messages WHERE id = $1 AND user_id = $2 RETURNING id',
      [messageId, session.userId]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Message not found or not yours.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[messages DELETE]', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }

    const messageId = Number(params.id);
    if (!messageId) {
      return NextResponse.json({ error: 'Invalid message ID.' }, { status: 400 });
    }

    const { content } = await req.json();
    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required.' }, { status: 400 });
    }

    const rows = await query(
      'UPDATE messages SET content = $1, is_edited = TRUE WHERE id = $2 AND user_id = $3 RETURNING id',
      [content.trim(), messageId, session.userId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Message not found or not yours.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[messages PUT]', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }

    const messageId = Number(params.id);
    if (!messageId) {
      return NextResponse.json({ error: 'Invalid message ID.' }, { status: 400 });
    }

    const existing = await queryOne(
      'SELECT 1 FROM message_likes WHERE message_id = $1 AND user_id = $2',
      [messageId, session.userId]
    );

    if (existing) {
      await query(
        'DELETE FROM message_likes WHERE message_id = $1 AND user_id = $2',
        [messageId, session.userId]
      );
    } else {
      await query(
        'INSERT INTO message_likes (message_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [messageId, session.userId]
      );
    }

    return NextResponse.json({ success: true, liked: !existing });
  } catch (err) {
    console.error('[messages PATCH]', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
