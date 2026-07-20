import { lazy, Suspense } from "react";
import { Box } from "@mui/material";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import ListSkeleton from "./components/ui/ListSkeleton";
import { getHomePath } from "./config/routes";
import { useAuth } from "./context/AuthContext";

const LoginPage = lazy(() => import("./pages/Login/Login"));
const AcceptInvitePage = lazy(() => import("./pages/AcceptInvite/AcceptInvite"));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmail/VerifyEmail"));
const ManagerDashboardPage = lazy(() => import("./pages/manager/ManagerDashboardPage"));
const PlaceholderPage = lazy(() => import("./pages/PlaceholderPage"));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));
const InvitationsPage = lazy(() => import("./pages/Invitations/InvitationsPage"));
const AdminNetworkPage = lazy(() => import("./pages/admin/AdminNetworkPage"));
const AdminBranchPage = lazy(() => import("./pages/admin/AdminBranchPage"));
const AdminDepartmentsPage = lazy(() => import("./pages/admin/AdminDepartmentsPage"));
const AdminProductsPage = lazy(() => import("./pages/admin/AdminProductsPage"));
const ManagerTasksPage = lazy(() => import("./pages/manager/ManagerTasksPage"));
const ManagerIssuesPage = lazy(() => import("./pages/manager/ManagerIssuesPage"));
const ManagerTaskGalleryPage = lazy(() => import("./pages/manager/ManagerTaskGalleryPage"));
const ManagerEmployeesPage = lazy(() => import("./pages/manager/ManagerEmployeesPage"));
const EmployeeTasksPage = lazy(() => import("./pages/employee/EmployeeTasksPage"));

function PageLoader() {
  return (
    <Box py={4} px={{ xs: 1.5, sm: 3 }}>
      <ListSkeleton variant="dashboard" />
    </Box>
  );
}

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getHomePath(user.role)} replace />;
}

/**
 * Pas de Suspense autour de Layout : sinon le menu/FAB disparaît pendant
 * le lazy-load de משימות (bug WebView Android très visible).
 */
export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <LazyPage>
            <LoginPage />
          </LazyPage>
        }
      />
      <Route
        path="/accept-invite"
        element={
          <LazyPage>
            <AcceptInvitePage />
          </LazyPage>
        }
      />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route
        path="/verify-email"
        element={
          <LazyPage>
            <VerifyEmailPage />
          </LazyPage>
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<HomeRedirect />} />
        <Route element={<ProtectedRoute roles={["admin"]} />}>
          <Route
            path="/admin"
            element={
              <LazyPage>
                <PlaceholderPage title="ניהול מערכת" />
              </LazyPage>
            }
          />
          <Route
            path="/admin/users"
            element={
              <LazyPage>
                <AdminUsersPage />
              </LazyPage>
            }
          />
          <Route
            path="/admin/invitations"
            element={
              <LazyPage>
                <InvitationsPage />
              </LazyPage>
            }
          />
          <Route
            path="/admin/networks"
            element={
              <LazyPage>
                <AdminNetworkPage />
              </LazyPage>
            }
          />
          <Route
            path="/admin/branches"
            element={
              <LazyPage>
                <AdminBranchPage />
              </LazyPage>
            }
          />
          <Route
            path="/admin/departments"
            element={
              <LazyPage>
                <AdminDepartmentsPage />
              </LazyPage>
            }
          />
          <Route
            path="/admin/products"
            element={
              <LazyPage>
                <AdminProductsPage />
              </LazyPage>
            }
          />
          <Route
            path="/admin/tasks"
            element={
              <LazyPage>
                <ManagerTasksPage />
              </LazyPage>
            }
          />
          <Route
            path="/admin/gallery"
            element={
              <LazyPage>
                <ManagerTaskGalleryPage />
              </LazyPage>
            }
          />
        </Route>
        <Route element={<ProtectedRoute roles={["network_manager", "branch_manager"]} />}>
          <Route
            path="/manager"
            element={
              <LazyPage>
                <ManagerDashboardPage />
              </LazyPage>
            }
          />
          <Route
            path="/manager/employees"
            element={
              <LazyPage>
                <ManagerEmployeesPage />
              </LazyPage>
            }
          />
          <Route
            path="/manager/invitations"
            element={
              <LazyPage>
                <InvitationsPage />
              </LazyPage>
            }
          />
          <Route
            path="/manager/tasks"
            element={
              <LazyPage>
                <ManagerTasksPage />
              </LazyPage>
            }
          />
          <Route
            path="/manager/gallery"
            element={
              <LazyPage>
                <ManagerTaskGalleryPage />
              </LazyPage>
            }
          />
          <Route
            path="/manager/issues"
            element={
              <LazyPage>
                <ManagerIssuesPage />
              </LazyPage>
            }
          />
          <Route
            path="/manager/departments"
            element={
              <LazyPage>
                <AdminDepartmentsPage />
              </LazyPage>
            }
          />
          <Route
            path="/manager/products"
            element={
              <LazyPage>
                <AdminProductsPage />
              </LazyPage>
            }
          />
        </Route>
        <Route element={<ProtectedRoute roles={["network_manager"]} />}>
          <Route
            path="/manager/branches"
            element={
              <LazyPage>
                <AdminBranchPage />
              </LazyPage>
            }
          />
        </Route>
        <Route element={<ProtectedRoute roles={["employee"]} />}>
          <Route
            path="/employee"
            element={
              <LazyPage>
                <EmployeeTasksPage />
              </LazyPage>
            }
          />
        </Route>
      </Route>
    </Routes>
  );
}
