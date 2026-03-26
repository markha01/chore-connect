'use client';

import { useState, FormEvent } from 'react';
import { CalendarDays } from 'lucide-react';
import { Chore, Member } from './types';
import { getInitials, getAvatarGradient, formatDisplayDate, getTodayStr } from './helpers';
import DatePickerCalendar from './DatePickerCalendar';

interface ChoreCardProps {
  chore: Chore;
  members: Member[];
  currentUserId: number;
  onComplete: () => void;
  onAssign: (assignedTo: number | null) => void;
  onEdit: (updates: { title: string; description: string | null; dueDate: string | null }) => void;
  onDelete: () => void;
}

export default function ChoreCard({
  chore,
  members,
  currentUserId,
  onComplete,
  onAssign,
  onEdit,
  onDelete,
}: ChoreCardProps) {
  const [completing, setCompleting] = useState(false);
  const [collapsing, setCollapsing] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [closingAssign, setClosingAssign] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [closingEdit, setClosingEdit] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);

  function openEdit() {
    setEditTitle(chore.title);
    setEditDesc(chore.description ?? '');
    setEditDueDate(chore.due_date ?? '');
    setShowEdit(true);
  }

  function closeEdit() {
    setClosingEdit(true);
    setTimeout(() => { setShowEdit(false); setClosingEdit(false); }, 180);
  }

  async function submitEdit(e: FormEvent) {
    e.preventDefault();
    if (!editTitle.trim() || editTitle.trim().length < 2) return;
    setEditSaving(true);
    await onEdit({ title: editTitle.trim(), description: editDesc.trim() || null, dueDate: editDueDate || null });
    setEditSaving(false);
    closeEdit();
  }

  function closeAssign() {
    setClosingAssign(true);
    setTimeout(() => { setShowAssign(false); setClosingAssign(false); }, 180);
  }

  const assignedMemberIndex = members.findIndex(m => m.user_id === chore.assigned_to);
  const assignedMember = assignedMemberIndex >= 0 ? members[assignedMemberIndex] : null;

  function handleCompleteClick() {
    if (chore.is_complete) {
      onComplete();
      return;
    }
    setCompleting(true);
    setTimeout(() => {
      setCollapsing(true);
      onComplete();
    }, 380);
  }

  return (
    <div
      style={{
        overflow: 'hidden',
        ...(collapsing ? {
          animation: 'choreCollapseHeight 0.35s cubic-bezier(0.4, 0, 0.8, 0.2) forwards',
        } : {}),
      }}
    >
    <div
      className="card-sm"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        opacity: chore.is_complete ? 0.65 : 1,
        transition: 'opacity 0.2s',
        position: 'relative',
        ...(collapsing ? {
          animation: 'choreCollapseFade 0.28s ease-in forwards',
        } : {}),
      }}
    >
      <button
        onClick={handleCompleteClick}
        style={{
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          border: (chore.is_complete || completing) ? 'none' : '2px solid var(--border)',
          background: (chore.is_complete || completing) ? '#8DB654' : 'transparent',
          cursor: 'pointer',
          flexShrink: 0,
          marginTop: '1px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '0.65rem',
          fontWeight: '700',
          transition: 'border 0.1s, background 0.1s',
          ...(completing && !chore.is_complete ? {
            animation: 'checkCircleFill 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          } : {}),
        }}
        title={chore.is_complete ? 'Mark as not done' : 'Mark as done'}
      >
        {(chore.is_complete || completing) ? (
          <span style={{
            display: 'inline-block',
            ...(completing && !chore.is_complete ? {
              animation: 'checkmarkPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            } : {}),
          }}>✓</span>
        ) : null}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <span
            style={{
              fontWeight: '600',
              fontSize: '0.9rem',
              textDecoration: chore.is_complete ? 'line-through' : 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: chore.is_complete ? 'var(--text-muted)' : 'var(--text-primary)',
            }}
          >
            {chore.title}
          </span>
          <button
            onClick={openEdit}
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: '0.72rem',
              fontWeight: '500',
              padding: '0.1rem 0.45rem',
              lineHeight: 1.4,
              flexShrink: 0,
              opacity: 0.7,
              transition: 'opacity 0.2s, border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#BC9BF3'; (e.currentTarget as HTMLButtonElement).style.color = '#BC9BF3'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.7'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
            title="Edit chore"
          >
            Edit
          </button>
        </div>

        {chore.description && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem', lineHeight: 1.4 }}>
            {chore.description}
          </p>
        )}

        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
            {chore.assigned_to ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: getAvatarGradient(assignedMemberIndex >= 0 ? assignedMemberIndex : 0),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.55rem',
                    fontWeight: '700',
                    color: 'white',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  {assignedMember?.avatar_url
                    ? <img src={assignedMember.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    : chore.assigned_display_name?.[0]?.toUpperCase() ?? '?'
                  }
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {chore.assigned_to === currentUserId ? 'You' : chore.assigned_display_name}
                </span>
              </div>
            ) : (
              <span className="badge" style={{ background: 'rgba(180,83,9,0.08)', color: '#92400e', border: '1px solid rgba(180,83,9,0.2)' }}>
                Unassigned
              </span>
            )}

            {!chore.is_complete && (
              <button
                onClick={() => setShowAssign(true)}
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  padding: '0.15rem 0.5rem',
                  transition: 'border-color 0.2s, color 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#BC9BF3';
                  (e.currentTarget as HTMLButtonElement).style.color = '#BC9BF3';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                }}
              >
                Reassign
              </button>
            )}

            {chore.due_date && (() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const due = new Date(chore.due_date + 'T00:00:00');
              const diffDays = Math.floor((today.getTime() - due.getTime()) / 86400000);
              const isOverdue = !chore.is_complete && diffDays > 0;
              const formattedDate = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return (
                <span style={{ fontSize: '0.78rem', color: isOverdue ? '#ef4444' : 'var(--text-muted)' }}>
                  Due {formattedDate}{isOverdue ? ` · ${diffDays} ${diffDays === 1 ? 'day' : 'days'} overdue` : ''}
                </span>
              );
            })()}

            {chore.is_complete && chore.completed_by_name && (
              <span style={{ fontSize: '0.78rem', color: '#0d7d72', fontWeight: '500' }}>
                ✓ Done by {chore.completed_by === currentUserId ? 'you' : chore.completed_by_name}
              </span>
            )}
          </div>

          {/* Reassign popup */}
          {showAssign && (
            <>
              {/* Backdrop */}
              <div
                onClick={closeAssign}
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 200,
                  background: 'rgba(0,0,0,0.6)',
                  animation: closingAssign ? 'backdropFadeOut 0.18s ease-in forwards' : 'backdropFade 0.15s ease',
                }}
              />
              {/* Floating centered card */}
              <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 201,
                background: '#252535',
                borderRadius: '20px',
                width: 'min(340px, calc(100vw - 2rem))',
                boxShadow: '0 24px 64px rgba(0,0,0,0.75)',
                overflow: 'hidden',
                animation: closingAssign ? 'popOut 0.18s ease-in forwards' : 'popIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}>
                {/* Header */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem 1rem 0.875rem' }}>
                  <span style={{ fontWeight: '700', fontSize: '1rem', color: '#f1f1f8' }}>Reassign</span>
                  <button
                    type="button"
                    onClick={closeAssign}
                    style={{
                      position: 'absolute',
                      right: '1rem',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.1)',
                      border: 'none',
                      color: '#9b9bb8',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Options list */}
                <div style={{ padding: '0 0.5rem 1rem', borderTop: '1px solid rgba(255,255,255,0.07)', overflowY: 'auto', maxHeight: '50vh' }}>
                  {/* Unassign option */}
                  <button
                    type="button"
                    onClick={() => { onAssign(null); closeAssign(); }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 0.625rem',
                      background: !chore.assigned_to ? 'rgba(188,155,243,0.15)' : 'transparent',
                      border: 'none',
                      borderRadius: '10px',
                      color: !chore.assigned_to ? '#BC9BF3' : '#8b8ba8',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: !chore.assigned_to ? '600' : '400',
                      textAlign: 'left',
                      transition: 'background 0.12s',
                      marginTop: '0.5rem',
                    }}
                    onMouseEnter={e => { if (chore.assigned_to) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
                    onMouseLeave={e => { if (chore.assigned_to) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: 'rgba(255,255,255,0.06)', border: '1.5px dashed rgba(255,255,255,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.9rem', color: '#8b8ba8', flexShrink: 0,
                    }}>
                      —
                    </div>
                    <span>Unassigned</span>
                    {!chore.assigned_to && <span style={{ marginLeft: 'auto', color: '#BC9BF3', fontSize: '1rem' }}>✓</span>}
                  </button>

                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '0.25rem 0.625rem' }} />

                  {/* Member options */}
                  {members.map((m, i) => {
                    const isActive = chore.assigned_to === m.user_id;
                    return (
                      <button
                        key={m.user_id}
                        type="button"
                        onClick={() => { onAssign(m.user_id); closeAssign(); }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem 0.625rem',
                          background: isActive ? 'rgba(188,155,243,0.15)' : 'transparent',
                          border: 'none',
                          borderRadius: '10px',
                          color: isActive ? '#BC9BF3' : '#f1f1f8',
                          cursor: 'pointer',
                          fontSize: '0.95rem',
                          fontWeight: isActive ? '600' : '400',
                          textAlign: 'left',
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
                        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                      >
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: getAvatarGradient(i),
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.75rem', fontWeight: '700', color: 'white', flexShrink: 0,
                          overflow: 'hidden',
                        }}>
                          {m.avatar_url
                            ? <img src={m.avatar_url} alt={m.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            : getInitials(m.display_name)
                          }
                        </div>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.display_name}{m.user_id === currentUserId ? ' (you)' : ''}
                        </span>
                        {isActive && <span style={{ marginLeft: 'auto', color: '#BC9BF3', fontSize: '1rem', flexShrink: 0 }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

    {/* Edit modal */}
      {showEdit && (
        <>
          <div
            onClick={closeEdit}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 200,
              background: 'rgba(0,0,0,0.6)',
              animation: closingEdit ? 'backdropFadeOut 0.18s ease-in forwards' : 'backdropFade 0.15s ease',
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 201,
            background: '#252535',
            borderRadius: '20px',
            width: 'min(360px, calc(100vw - 2rem))',
            boxShadow: '0 24px 64px rgba(0,0,0,0.75)',
            overflow: 'hidden',
            animation: closingEdit ? 'popOut 0.18s ease-in forwards' : 'popIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}>
            {/* Header */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem 1rem 0.875rem' }}>
              <span style={{ fontWeight: '700', fontSize: '1rem', color: '#f1f1f8' }}>Edit task</span>
              <button
                type="button"
                onClick={closeEdit}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: '#9b9bb8',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={submitEdit} style={{ padding: '0 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ marginTop: '0.875rem' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#9b9bb8', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Task name
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  maxLength={100}
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1.5px solid rgba(255,255,255,0.12)',
                    borderRadius: '10px',
                    color: '#f1f1f8',
                    fontSize: '0.9rem',
                    padding: '0.6rem 0.75rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#9b9bb8', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  maxLength={200}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1.5px solid rgba(255,255,255,0.12)',
                    borderRadius: '10px',
                    color: '#f1f1f8',
                    fontSize: '0.9rem',
                    padding: '0.6rem 0.75rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#9b9bb8', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Due date
                </label>
                <button
                  type="button"
                  onClick={() => setShowEditDatePicker(true)}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1.5px solid rgba(255,255,255,0.12)',
                    borderRadius: '10px',
                    color: editDueDate ? '#f1f1f8' : '#9b9bb8',
                    fontSize: '0.9rem',
                    padding: '0.6rem 0.75rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxSizing: 'border-box',
                  }}
                >
                  <CalendarDays size={15} color="#ef4444" strokeWidth={1.75} />
                  <span>{editDueDate ? formatDisplayDate(editDueDate) : 'No due date'}</span>
                  {editDueDate && (
                    <span
                      onClick={e => { e.stopPropagation(); setEditDueDate(''); }}
                      style={{ marginLeft: 'auto', color: '#9b9bb8', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      ✕
                    </span>
                  )}
                </button>
                {showEditDatePicker && (
                  <DatePickerCalendar
                    value={editDueDate || getTodayStr()}
                    onChange={val => { setEditDueDate(val); setShowEditDatePicker(false); }}
                    onClose={() => setShowEditDatePicker(false)}
                  />
                )}
              </div>

              <button
                type="submit"
                disabled={editSaving || !editTitle.trim() || editTitle.trim().length < 2}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#8DB654',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  cursor: editSaving ? 'not-allowed' : 'pointer',
                  opacity: editSaving ? 0.7 : 1,
                  marginTop: '0.25rem',
                }}
              >
                {editSaving ? 'Saving…' : 'Save changes'}
              </button>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '0.25rem 0' }} />

              <button
                type="button"
                onClick={() => { closeEdit(); setTimeout(onDelete, 200); }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1.5px solid rgba(239,68,68,0.25)',
                  borderRadius: '12px',
                  color: '#ef4444',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Delete task
              </button>
            </form>
          </div>
        </>
      )}
    </div>
    </div>
  );
}
