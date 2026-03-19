import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { verifyPassword, createSession } from '@/lib/auth';

interface UserRow {
  id: number;
  username: string;
  display_name: string;
  password_hash: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body as {
      username?: string;
      password?: string;
    };

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Please enter your username and password.' },
        { status: 400 }
      );
    }

    const user = await queryOne<UserRow>(
      'SELECT id, username, display_name, password_hash FROM users WHERE username = $1',
      [username.trim().toLowerCase()]
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Incorrect username or password.' },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: 'Incorrect username or password.' },
        { status: 401 }
      );
    }

    await createSession({
      userId: user.id,
      username: user.username,
      displayName: user.display_name,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[login]', err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
