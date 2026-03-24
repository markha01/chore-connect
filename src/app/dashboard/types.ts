export interface Member {
  user_id: number;
  display_name: string;
  username: string;
  role: string;
  avatar_url?: string | null;
}

export interface Household {
  id: number;
  name: string;
  inviteCode: string;
  ownerId: number;
  members: Member[];
}

export interface Chore {
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
  due_date: string | null;
}

export interface Me {
  userId: number;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  household: { id: number; name: string; inviteCode: string; role: string } | null;
}

export interface Message {
  id: number;
  user_id: number;
  display_name: string;
  content: string;
  created_at: string;
  like_count: number;
  liked_by_me: boolean;
  is_edited: boolean;
}
