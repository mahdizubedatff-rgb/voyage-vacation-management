export type Role = "USER" | "ADMIN";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Vacation {
  id: string;
  destination: string;
  description: string;
  startDate: string;
  endDate: string;
  price: number;
  imageName: string;
  imageUrl: string;
  likesCount: number;
  isLiked: boolean;
}

export type VacationFilter = "all" | "liked" | "upcoming" | "active";

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface LikeState {
  vacationId: string;
  isLiked: boolean;
  likesCount: number;
}

export interface LikeReportRow {
  vacationId: string;
  destination: string;
  likes: number;
}

export interface Recommendation {
  destination: string;
  tagline: string;
  overview: string;
  bestTimeToVisit: string;
  attractions: Array<{ name: string; description: string }>;
  activities: Array<{ name: string; description: string }>;
  itinerary: Array<{ day: number; title: string; description: string }>;
  tips: string[];
}

export interface RecommendationResult {
  recommendation: Recommendation;
  provider: string;
  model: string;
  generatedAt: string;
}

export interface QuestionAnswer {
  question: string;
  answer: string;
  mode: "ai" | "rules";
  model?: string;
  notice?: string;
  toolCalls: Array<{ tool: string; arguments: Record<string, unknown> }>;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}
