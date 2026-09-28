import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Redirects to the appropriate dashboard based on the authenticated user's role. */
export default function RootRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'HR') return <Navigate to="/hr/dashboard" replace />;
  if (user?.role === 'MANAGER') return <Navigate to="/manager/dashboard" replace />;
  return <Navigate to="/employee/dashboard" replace />;
}
