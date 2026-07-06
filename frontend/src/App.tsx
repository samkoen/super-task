import { lazy, Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
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
const EmployeeTasksPage = lazy(() => import("./pages/employee/EmployeeTasksPage"));

function PageLoader() {
  return (
    <Box display="flex" justifyContent="center" py={8}>
      <CircularProgress />
    </Box>
  );
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getHomePath(user.role)} replace />;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<HomeRedirect />} />
          <Route element={<ProtectedRoute roles={["admin"]} />}>
            <Route path="/admin" element={<PlaceholderPage title="ניהול מערכת" />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/invitations" element={<InvitationsPage />} />
            <Route path="/admin/networks" element={<AdminNetworkPage />} />
            <Route path="/admin/branches" element={<AdminBranchPage />} />
            <Route path="/admin/departments" element={<AdminDepartmentsPage />} />
            <Route path="/admin/products" element={<AdminProductsPage />} />
            <Route path="/admin/tasks" element={<ManagerTasksPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={["network_manager", "branch_manager"]} />}>
            <Route path="/manager" element={<ManagerDashboardPage />} />
            <Route path="/manager/invitations" element={<InvitationsPage />} />
            <Route path="/manager/tasks" element={<ManagerTasksPage />} />
            <Route path="/manager/branches" element={<AdminBranchPage />} />
            <Route path="/manager/departments" element={<AdminDepartmentsPage />} />
            <Route path="/manager/products" element={<AdminProductsPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={["employee"]} />}>
            <Route path="/employee" element={<EmployeeTasksPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
