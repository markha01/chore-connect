import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getSession } from '@/lib/auth';

interface ChoreRow {
  id: number;
  title: string;
  description: string | null;
  assigned_to: number | null;
  assigned_display_name: string | null;
  is_complete: boolean;
  created_by: number;
  created_by_name: string;
  created_at: string;
  completed_at: string | null;
  completed_by: number | null;
  completed_by_name: string | null;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }

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

    const chores = await query<ChoreRow>(
      `SELECT
         c.id,
         c.title,
         c.description,
         c.assigned_to,
         au.display_name as assigned_display_name,
         c.is_complete,
         c.created_by,
         cu.display_name as created_by_name,
         c.created_at,
         c.completed_at,
         c.completed_by,
         du.display_name as completed_by_name
       FROM chores c
       LEFT JOIN users au ON au.id = c.assigned_to
       LEFT JOIN users cu ON cu.id = c.created_by
       LEFT JOIN users du ON du.id = c.completed_by
       WHERE c.household_id = $1
       ORDER BY c.is_complete ASC, c.created_at DESC`,
      [household.id]
    );

    return NextResponse.json({ chores });
  } catch (err) {
    console.error('[chores GET]', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, assignedTo } = body as {
      title?: string;
      description?: string;
      assignedTo?: number | null;
    };

    if (!title || title.trim().length < 2) {
      return NextResponse.json(
        { error: 'Chore name must be at least 2 characters.' },
        { status: 400 }
      );
    }

    if (title.trim().length > 100) {
      return NextResponse.json(
        { error: 'Chore name is too long (max 100 characters).' },
        { status: 400 }
      );
    }

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

    if (assignedTo) {
      const validMember = await queryOne(
        'SELECT id FROM household_members WHERE household_id = $1 AND user_id = $2',
        [household.id, assignedTo]
      );
      if (!validMember) {
        return NextResponse.json(
          { error: 'That person is not in your household.' },
          { status: 400 }
        );
      }
    }

    const rows = await query<{ id: number }>(
      `INSERT INTO chores (household_id, title, description, assigned_to, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        household.id,
        title.trim(),
        description?.trim() || null,
        assignedTo || null,
        session.userId,
      ]
    );

    return NextResponse.json({ success: true, choreId: rows[0].id }, { status: 201 });
  } catch (err) {
    console.error('[chores POST]', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
