import { Navigate, Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const token = localStorage.getItem('access_token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  let userRole = null;
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      userRole = user.role;
    } catch {
      // fallback
    }
  }

  if (!userRole) {
    const decoded = parseJwt(token);
    if (decoded && decoded.role) {
      userRole = decoded.role;
    }
  }

  let isAuthorized = true;
  if (allowedRoles) {
    if (!userRole || !allowedRoles.includes(userRole)) {
      isAuthorized = false;
    }
  }

  if (!isAuthorized) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
