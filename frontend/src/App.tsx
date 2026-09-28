import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { RequireAuth, RequireRole } from './components/auth/RequireAuth';
import { AppShell } from './components/layout/AppShell';
import LoginPage from './pages/LoginPage';
import RootRedirect from './pages/RootRedirect';

// Employee pages
const EmployeeDashboard = lazy(() => import('./pages/employee/EmployeeDashboard'));
const ApplyLeave = lazy(() => import('./pages/employee/ApplyLeave'));
const MyRequests = lazy(() => import('./pages/employee/MyRequests'));
const RequestDetail = lazy(() => import('./pages/employee/RequestDetail'));
const CoverageInbox = lazy(() => import('./pages/employee/CoverageInbox'));
const PayImpact = lazy(() => import('./pages/employee/PayImpact'));

// Manager pages
const ManagerDashboard = lazy(() => import('./pages/manager/ManagerDashboard'));
const ManagerQueue = lazy(() => import('./pages/manager/ManagerQueue'));
const RequestReview = lazy(() => import('./pages/manager/RequestReview'));
const TeamCalendar = lazy(() => import('./pages/manager/TeamCalendar'));

// HR pages
const HrDashboard = lazy(() => import('./pages/hr/HrDashboard'));
const HrQueue = lazy(() => import('./pages/hr/HrQueue'));
const HrRequestReview = lazy(() => import('./pages/hr/HrRequestReview'));
const AllRequests = lazy(() => import('./pages/hr/AllRequests'));
const Employees = lazy(() => import('./pages/hr/Employees'));
const HrPayroll = lazy(() => import('./pages/hr/HrPayroll'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <span className="w-6 h-6 border-2 border-[#0B6E6E] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />

            {/* Auth-required shell */}
            <Route
              element={
                <RequireAuth>
                  <AppShell />
                </RequireAuth>
              }
            >
              {/* Root → role-based redirect */}
              <Route index element={<RootRedirect />} />

              {/* ── Employee Routes ─────────────────────────────────── */}
              <Route
                path="employee/dashboard"
                element={
                  <RequireRole role={['EMPLOYEE', 'MANAGER', 'HR']}>
                    <Lazy><EmployeeDashboard /></Lazy>
                  </RequireRole>
                }
              />
              <Route
                path="employee/apply"
                element={
                  <RequireRole role={['EMPLOYEE', 'MANAGER', 'HR']}>
                    <Lazy><ApplyLeave /></Lazy>
                  </RequireRole>
                }
              />
              <Route
                path="employee/requests"
                element={
                  <RequireRole role={['EMPLOYEE', 'MANAGER', 'HR']}>
                    <Lazy><MyRequests /></Lazy>
                  </RequireRole>
                }
              />
              <Route
                path="employee/requests/:id"
                element={
                  <RequireRole role={['EMPLOYEE', 'MANAGER', 'HR']}>
                    <Lazy><RequestDetail /></Lazy>
                  </RequireRole>
                }
              />
              <Route
                path="employee/coverage"
                element={
                  <RequireRole role={['EMPLOYEE', 'MANAGER', 'HR']}>
                    <Lazy><CoverageInbox /></Lazy>
                  </RequireRole>
                }
              />
              <Route
                path="employee/payroll"
                element={
                  <RequireRole role={['EMPLOYEE', 'MANAGER', 'HR']}>
                    <Lazy><PayImpact /></Lazy>
                  </RequireRole>
                }
              />

              {/* ── Manager Routes ───────────────────────────────────── */}
              <Route
                path="manager/dashboard"
                element={
                  <RequireRole role={['MANAGER', 'HR']}>
                    <Lazy><ManagerDashboard /></Lazy>
                  </RequireRole>
                }
              />
              <Route
                path="manager/queue"
                element={
                  <RequireRole role={['MANAGER', 'HR']}>
                    <Lazy><ManagerQueue /></Lazy>
                  </RequireRole>
                }
              />
              <Route
                path="manager/queue/:id"
                element={
                  <RequireRole role={['MANAGER', 'HR']}>
                    <Lazy><RequestReview /></Lazy>
                  </RequireRole>
                }
              />
              <Route
                path="manager/calendar"
                element={
                  <RequireRole role={['MANAGER', 'HR']}>
                    <Lazy><TeamCalendar /></Lazy>
                  </RequireRole>
                }
              />

              {/* ── HR Routes ───────────────────────────────────────── */}
              <Route
                path="hr/dashboard"
                element={
                  <RequireRole role="HR">
                    <Lazy><HrDashboard /></Lazy>
                  </RequireRole>
                }
              />
              <Route
                path="hr/queue"
                element={
                  <RequireRole role="HR">
                    <Lazy><HrQueue /></Lazy>
                  </RequireRole>
                }
              />
              <Route
                path="hr/queue/:id"
                element={
                  <RequireRole role="HR">
                    <Lazy><HrRequestReview /></Lazy>
                  </RequireRole>
                }
              />
              <Route
                path="hr/requests"
                element={
                  <RequireRole role="HR">
                    <Lazy><AllRequests /></Lazy>
                  </RequireRole>
                }
              />
              <Route
                path="hr/employees"
                element={
                  <RequireRole role="HR">
                    <Lazy><Employees /></Lazy>
                  </RequireRole>
                }
              />
              <Route
                path="hr/payroll"
                element={
                  <RequireRole role="HR">
                    <Lazy><HrPayroll /></Lazy>
                  </RequireRole>
                }
              />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
