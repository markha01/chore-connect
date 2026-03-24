import { Member } from './types';

// ── Date helpers ────────────────────────────────────────────────────────────────

export function dateToStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getTodayStr(): string {
  return dateToStr(new Date());
}

export function formatDisplayDate(dateStr: string): string {
  const today = getTodayStr();
  if (dateStr === today) return 'Today';
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  if (dateStr === dateToStr(tomorrowDate)) return 'Tomorrow';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatGroupDate(dateStr: string): string {
  const today = getTodayStr();
  if (dateStr === today) return 'Today';
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  if (dateStr === dateToStr(tomorrowDate)) return 'Tomorrow';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function formatHistoryGroupDate(dateStr: string): string {
  const today = getTodayStr();
  if (dateStr === today) return 'Today';
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  if (dateStr === dateToStr(yesterdayDate)) return 'Yesterday';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return dateToStr(d);
}

// Offsets (in days) for each frequency beyond the base occurrence
export const FREQUENCY_OFFSETS: Record<string, number[]> = {
  once: [],
  daily: [1, 2, 3, 4, 5, 6, 7],
  'every-other-day': [2, 4, 6, 8, 10, 12, 14],
  weekly: [7, 14, 21, 28],
  'every-other-week': [14, 28, 42, 56],
  monthly: [30, 60, 90],
};

export function formatMessageTime(createdAt: string): string {
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Avatar helpers ──────────────────────────────────────────────────────────────

export const AVATAR_COLORS = [
  ['#BC9BF3', '#ec4899'],
  ['#14b8a6', '#6366f1'],
  ['#f59e0b', '#ec4899'],
  ['#6366f1', '#14b8a6'],
  ['#ec4899', '#f59e0b'],
  ['#14b8a6', '#BC9BF3'],
];

export function getAvatarGradient(_index: number): string {
  return '#8DB654';
}

export function getInitials(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

export function getMembersLabel(members: Member[]): string {
  if (members.length === 0) return '';
  if (members.length === 1) return members[0].display_name;
  if (members.length === 2) return `${members[0].display_name} and ${members[1].display_name}`;
  if (members.length === 3) return `${members[0].display_name}, ${members[1].display_name}, and ${members[2].display_name}`;
  return `${members[0].display_name}, ${members[1].display_name}, and ${members.length - 2} others`;
}

export function getMemberColorIndex(members: Member[], userId: number): number {
  const idx = members.findIndex(m => m.user_id === userId);
  return idx >= 0 ? idx : 0;
}
