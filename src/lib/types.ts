export type School = "yonsei" | "korea";

export interface PhotoEntry {
  id: string;
  image_url: string;
  nickname: string;
  club?: string;
  school: School;
  aspect_ratio: number;
  votes: number;
}

// DB row from photos table (without votes)
export interface PhotoRow {
  id: string;
  image_url: string;
  nickname: string;
  club: string | null;
  school: School;
  aspect_ratio: number;
  created_at: string;
}

// DB row from photos_with_votes view
export interface PhotoWithVotesRow extends PhotoRow {
  votes: number;
}
