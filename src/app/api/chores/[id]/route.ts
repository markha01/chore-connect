import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { getSession } from '@/lib/auth';

async function getHouseholdId(userId: number): Promise<number | null> {
  const row = await queryOne<{ id: number }>(
    `SELECT h.id FROM households h
     JOIN household_members hm ON hm.household_id = h.id
     WHERE hm.user_id = $1 LIMIT 1`,
    [userId]
  );
  return row?.id ?? null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }

    const choreId = parseInt(params.id, 10);
    if (isNaN(choreId)) {
      return NextResponse.json({ error: 'Invalid chore ID.' }, { status: 400 });
    }

    const householdId = await getHouseholdId(session.userId);
    if (!householdId) {
      return NextResponse.json({ error: 'You are not in a household.' }, { status: 403 });
    }

    const chore = await queryOne<{ id: number; household_id: number; is_complete: boolean }>(
      'SELECT id, household_id, is_complete FROM chores WHERE id = $1',
      [choreId]
    );

    if (!chore || chore.household_id !== householdId) {
      return NextResponse.json({ error: 'Chore not found.' }, { status: 404 });
    }

    const body = await req.json();
    const { action, assignedTo, title, description } = body as {
      action?: string;
      assignedTo?: number | null;
      title?: string;
      description?: string;
    };

    if (action === 'complete') {
      await query(
        `UPDATE chores SET is_complete = true, completed_at = NOW(), completed_by = $1 WHERE id = $2`,
        [session.userId, choreId]
      );
    } else if (action === 'uncomplete') {
      await query(
        `UPDATE chores SET is_complete = false, completed_at = NULL, completed_by = NULL WHERE id = $1`,
        [choreId]
      );
    } else if (action === 'assign') {
      if (assignedTo !== undefined) {
        if (assignedTo !== null) {
          const validMember = await queryOne(
            'SELECT id FROM household_members WHERE household_id = $1 AND user_id = $2',
            [householdId, assignedTo]
          );
          if (!validMember) {
            return NextResponse.json(
              { error: 'That person is not in your household.' },
              { status: 400 }
            );
          }
        }
        await query('UPDATE chores SET assigned_to = $1 WHERE id = $2', [
          assignedTo,
          choreId,
        ]);
      }
    } else if (action === 'edit') {
      if (!title || title.trim().length < 2) {
        return NextResponse.json(
          { error: 'Chore name must be at least 2 characters.' },
          { status: 400 }
        );
      }
      await query(
        'UPDATE chores SET title = $1, description = $2 WHERE id = $3',
        [title.trim(), description?.trim() || null, choreId]
      );
    } else {
      return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[chores PATCH]', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }

    const choreId = parseInt(params.id, 10);
    if (isNaN(choreId)) {
      return NextResponse.json({ error: 'Invalid chore ID.' }, { status: 400 });
    }

    const householdId = await getHouseholdId(session.userId);
    if (!householdId) {
      return NextResponse.json({ error: 'You are not in a household.' }, { status: 403 });
    }

    const chore = await queryOne<{ id: number; household_id: number }>(
      'SELECT id, household_id FROM chores WHERE id = $1',
      [choreId]
    );

    if (!chore || chore.household_id !== householdId) {
      return NextResponse.json({ error: 'Chore not found.' }, { status: 404 });
    }

    await query('DELETE FROM chores WHERE id = $1', [choreId]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[chores DELETE]', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
