import { Navigate, Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const token = localStorage.getItem('access_token');
  const userStr = localStorage.getItem('user');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  let isAuthorized = true;

  if (allowedRoles && userStr) {
    try {
      const user = JSON.parse(userStr);
      if (!allowedRoles.includes(user.role)) {
        isAuthorized = false;
      }
    } catch {
      return <Navigate to="/login" replace />;
    }
  }

  if (!isAuthorized) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
