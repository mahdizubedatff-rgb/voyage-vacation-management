import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { MainLayout } from "./layouts/MainLayout";
import { GuestRoute, ProtectedRoute } from "./components/ProtectedRoute";
import { PageLoader } from "./components/ui/Spinner";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { VacationsPage } from "./pages/VacationsPage";
import { AboutPage } from "./pages/AboutPage";
import { NotFoundPage } from "./pages/NotFoundPage";

// Role-specific pages load on demand (Recharts alone is a large dependency).
const AddVacationPage = lazy(() => import("./pages/VacationEditorPages").then((m) => ({ default: m.AddVacationPage })));
const EditVacationPage = lazy(() => import("./pages/VacationEditorPages").then((m) => ({ default: m.EditVacationPage })));
const ReportsPage = lazy(() => import("./pages/ReportsPage").then((m) => ({ default: m.ReportsPage })));
const AiRecommendationPage = lazy(() => import("./pages/AiRecommendationPage").then((m) => ({ default: m.AiRecommendationPage })));
const McpQuestionsPage = lazy(() => import("./pages/McpQuestionsPage").then((m) => ({ default: m.McpQuestionsPage })));

function HomeRedirect() {
  const { user, initializing } = useAuth();
  if (initializing) return <PageLoader />;
  return <Navigate to={user ? "/vacations" : "/login"} replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />

      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<MainLayout />}>
        <Route path="/about" element={<AboutPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/vacations" element={<VacationsPage />} />
        </Route>

        <Route element={<ProtectedRoute role="USER" />}>
          <Route path="/recommendations" element={<AiRecommendationPage />} />
          <Route path="/ask" element={<McpQuestionsPage />} />
        </Route>

        <Route element={<ProtectedRoute role="ADMIN" />}>
          <Route path="/admin/vacations/new" element={<AddVacationPage />} />
          <Route path="/admin/vacations/:id/edit" element={<EditVacationPage />} />
          <Route path="/admin/reports" element={<ReportsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
