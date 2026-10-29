import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../context/AuthContext";
import { ToastProvider } from "../context/ToastContext";
import { App } from "../App";
import { authService, vacationService } from "../services";

vi.mock("../services", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services")>();
  return {
    ...actual,
    authService: { login: vi.fn(), register: vi.fn(), me: vi.fn() },
    vacationService: { ...actual.vacationService, list: vi.fn() },
    reportService: { likes: vi.fn().mockResolvedValue([]), downloadCsv: vi.fn() },
  };
});

const user = { id: "u1", firstName: "Maya", lastName: "Cohen", email: "maya@test.dev", role: "USER" as const };

function renderApp(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(vacationService.list).mockResolvedValue({ items: [], page: 1, limit: 9, total: 0, totalPages: 1 });
});

describe("routing and authentication flows", () => {
  it("redirects guests from protected pages to the login page", async () => {
    renderApp("/vacations");
    expect(await screen.findByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
  });

  it("validates the login form before calling the API", async () => {
    renderApp("/login");
    await userEvent.click(await screen.findByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Email is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
    expect(authService.login).not.toHaveBeenCalled();
  });

  it("shows the server error for invalid credentials", async () => {
    vi.mocked(authService.login).mockRejectedValueOnce(
      Object.assign(new Error("401"), { isAxiosError: true, response: { status: 401, data: { error: { message: "Incorrect email or password" } } } }),
    );
    renderApp("/login");
    await userEvent.type(await screen.findByLabelText("Email"), "maya@test.dev");
    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password");
  });

  it("logs in and lands on the vacations page with user navigation", async () => {
    vi.mocked(authService.login).mockResolvedValueOnce({ user, token: "jwt" });
    renderApp("/login");
    await userEvent.type(await screen.findByLabelText("Email"), "maya@test.dev");
    await userEvent.type(screen.getByLabelText("Password"), "pass");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText(/Discover places worth/)).toBeInTheDocument();
    expect(localStorage.getItem("voyage.token")).toBe("jwt");
    expect(screen.getAllByText("Maya Cohen").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "AI Concierge" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "Add Vacation" })).not.toBeInTheDocument();
    await waitFor(() => expect(vacationService.list).toHaveBeenCalledWith({ filter: "all", page: 1, limit: 9 }));
  });

  it("redirects a page number past the end to the last page", async () => {
    localStorage.setItem("voyage.token", "jwt");
    vi.mocked(authService.me).mockResolvedValueOnce(user);
    vi.mocked(vacationService.list).mockImplementation(async ({ page }) => ({ items: [], page, limit: 9, total: 14, totalPages: 2 }));
    renderApp("/vacations?page=5");
    await waitFor(() => expect(vacationService.list).toHaveBeenCalledWith({ filter: "all", page: 2, limit: 9 }));
  });

  it("keeps regular users out of admin pages", async () => {
    localStorage.setItem("voyage.token", "jwt");
    vi.mocked(authService.me).mockResolvedValueOnce(user);
    renderApp("/admin/reports");
    expect(await screen.findByText(/Discover places worth/)).toBeInTheDocument();
  });

  it("shows admin navigation and dashboard for admins", async () => {
    localStorage.setItem("voyage.token", "jwt");
    vi.mocked(authService.me).mockResolvedValueOnce({ ...user, role: "ADMIN" });
    renderApp("/vacations");
    expect(await screen.findByRole("heading", { name: "Vacation dashboard" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Reports" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("radio", { name: /favourites/i })).not.toBeInTheDocument();
  });
});
