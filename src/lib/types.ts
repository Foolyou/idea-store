// ==========================================
// API 响应
// ==========================================

export interface ApiOk<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: string;
}

export type ApiResponse<T = void> = ApiOk<T> | ApiError;

// ==========================================
// 分页
// ==========================================

export interface PaginatedResponse<T> {
  items: T[];
  next_cursor: string | null;
}

// ==========================================
// 用户
// ==========================================

export interface UserPublic {
  id: string;
  nickname: string;
  avatar_url: string | null;
}

export interface UserMe extends UserPublic {
  last_visibility: "public" | "circle" | "private";
  last_circle_id: string | null;
  created_at: string;
}

// ==========================================
// 灵感
// ==========================================

export type Visibility = "public" | "circle" | "private";

export interface InspirationFeedItem {
  id: string;
  content: string;
  images: string[];
  visibility: "public" | "circle";
  circle_id: string | null;
  circle_name: string | null;
  author: UserPublic;
  like_count: number;
  bookmark_count: number;
  is_liked: boolean;
  is_bookmarked: boolean;
  created_at: string;
}

export interface InspirationDetail {
  id: string;
  content: string;
  images: string[];
  visibility: Visibility;
  circle_id: string | null;
  circle_name: string | null;
  author: UserPublic;
  like_count: number;
  bookmark_count: number;
  is_liked: boolean;
  is_bookmarked: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateInspirationInput {
  content: string;
  images?: string[];
  visibility: Visibility;
  circle_id?: string;
}

export interface UpdateInspirationInput {
  content?: string;
  images?: string[];
  visibility?: Visibility;
  circle_id?: string | null;
}

// ==========================================
// 圈子
// ==========================================

export interface CircleItem {
  id: string;
  name: string;
  description: string;
  creator: UserPublic;
  member_count: number;
  is_joined: boolean;
  created_at: string;
}

export interface CreateCircleInput {
  name: string;
  description?: string;
}

// ==========================================
// 认证
// ==========================================

export interface AuthRegisterInput {
  nickname: string;
  password: string;
}

export interface AuthLoginInput {
  nickname: string;
  password: string;
}

// ==========================================
// 互动
// ==========================================

export interface ToggleResult {
  liked?: boolean;
  bookmarked?: boolean;
  like_count?: number;
  bookmark_count?: number;
}

// ==========================================
// 统计
// ==========================================

export interface UserStats {
  total_likes_received: number;
  total_bookmarks_received: number;
  total_inspirations: number;
  total_circles: number;
}

// ==========================================
// 设置
// ==========================================

export interface UpdateSettingsInput {
  nickname?: string;
  avatar_url?: string;
  password?: {
    old: string;
    new: string;
  };
}
