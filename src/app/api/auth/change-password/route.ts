import { NextResponse } from 'next/server';
import { getSession, verifyPassword, hashPassword } from '@/lib/auth';
import { queryOne, query } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters.' }, { status: 400 });
    }

    const user = await queryOne<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = $1',
      [session.userId]
    );
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const valid = await verifyPassword(currentPassword, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
    }

    const newHash = await hashPassword(newPassword);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, session.userId]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[change-password]', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
