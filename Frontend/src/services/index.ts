import { api, unwrap } from "./api";
import type {
  AuthResponse,
  LikeReportRow,
  LikeState,
  Paginated,
  QuestionAnswer,
  RecommendationResult,
  User,
  Vacation,
  VacationFilter,
} from "../types";

export const authService = {
  register: async (input: { firstName: string; lastName: string; email: string; password: string }) =>
    unwrap<AuthResponse>(await api.post("/auth/register", input)),
  login: async (input: { email: string; password: string }) => unwrap<AuthResponse>(await api.post("/auth/login", input)),
  me: async () => unwrap<{ user: User }>(await api.get("/auth/me")).user,
};

export interface VacationFormValues {
  destination: string;
  description: string;
  startDate: string;
  endDate: string;
  price: number;
  image?: File | null;
}

function toFormData(values: VacationFormValues): FormData {
  const form = new FormData();
  form.append("destination", values.destination);
  form.append("description", values.description);
  form.append("startDate", values.startDate);
  form.append("endDate", values.endDate);
  form.append("price", String(values.price));
  if (values.image) form.append("image", values.image);
  return form;
}

export const vacationService = {
  list: async (params: { filter: VacationFilter; page: number; limit?: number }) =>
    unwrap<Paginated<Vacation>>(await api.get("/vacations", { params })),
  get: async (id: string) => unwrap<Vacation>(await api.get(`/vacations/${id}`)),
  create: async (values: VacationFormValues) => unwrap<Vacation>(await api.post("/vacations", toFormData(values))),
  update: async (id: string, values: VacationFormValues) => unwrap<Vacation>(await api.put(`/vacations/${id}`, toFormData(values))),
  remove: async (id: string) => {
    await api.delete(`/vacations/${id}`);
  },
  like: async (id: string) => unwrap<LikeState>(await api.post(`/vacations/${id}/likes`)),
  unlike: async (id: string) => unwrap<LikeState>(await api.delete(`/vacations/${id}/likes`)),
};

export const reportService = {
  likes: async () => unwrap<LikeReportRow[]>(await api.get("/reports/likes")),
  downloadCsv: async () => {
    const response = await api.get<Blob>("/reports/likes/csv", { responseType: "blob" });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = "vacation-likes.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};

export const assistantService = {
  recommend: async (destination: string) => unwrap<RecommendationResult>(await api.post("/ai/recommendations", { destination })),
  ask: async (question: string) => unwrap<QuestionAnswer>(await api.post("/mcp/ask", { question })),
};
