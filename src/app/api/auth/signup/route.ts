import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { hashPassword, createSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, displayName, password } = body as {
      username?: string;
      displayName?: string;
      password?: string;
    };

    if (!username || !displayName || !password) {
      return NextResponse.json(
        { error: 'Please fill in all fields.' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanDisplay = displayName.trim();

    if (cleanUsername.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters.' },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      return NextResponse.json(
        { error: 'Username can only contain letters, numbers, and underscores.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    if (cleanDisplay.length < 1 || cleanDisplay.length > 50) {
      return NextResponse.json(
        { error: 'Display name must be between 1 and 50 characters.' },
        { status: 400 }
      );
    }

    const existing = await queryOne(
      'SELECT id FROM users WHERE username = $1',
      [cleanUsername]
    );

    if (existing) {
      return NextResponse.json(
        { error: 'That username is already taken. Try another one.' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const rows = await query<{ id: number }>(
      'INSERT INTO users (username, display_name, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [cleanUsername, cleanDisplay, passwordHash]
    );

    const userId = rows[0].id;

    await createSession({ userId, username: cleanUsername, displayName: cleanDisplay });

    return NextResponse.json({ success: true, userId }, { status: 201 });
  } catch (err) {
    console.error('[signup]', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
