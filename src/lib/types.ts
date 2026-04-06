export type School = "yonsei" | "korea";
export type PhotoStatus = "pending" | "approved" | "rejected";

export interface PhotoEntry {
  id: string;
  image_url: string;
  thumb_url?: string;
  nickname: string;
  club?: string;
  school: School;
  aspect_ratio: number;
  votes: number;
  status?: PhotoStatus;
  location?: string;
}

export interface PhotoRow {
  id: string;
  image_url: string;
  thumb_url: string | null;
  nickname: string;
  club: string | null;
  school: School;
  aspect_ratio: number;
  status: PhotoStatus;
  created_at: string;
}

export interface PhotoWithVotesRow extends PhotoRow {
  votes: number;
}

export interface VotingPeriod {
  start: string;
  end: string;
}

export interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  created_at: string;
}
