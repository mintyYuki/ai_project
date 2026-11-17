import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Catalog } from './pages/Catalog';
import { CreateBooking } from './pages/CreateBooking';
import { ClientBookings } from './pages/ClientBookings';
import { MechanicDashboard } from './pages/MechanicDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import './App.css';

import { useEffect, useState } from 'react';

function App() {
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [user, setUser] = useState(() => {
    const userStr = localStorage.getItem('user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  });

  // Sync token and user state on storage changes or route navigation
  useEffect(() => {
    const handleStorageChange = () => {
      const t = localStorage.getItem('access_token');
      const uStr = localStorage.getItem('user');
      setToken(t);
      try {
        setUser(uStr ? JSON.parse(uStr) : null);
      } catch {
        setUser(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    // Custom event for immediate login/logout triggers within the same tab
    window.addEventListener('auth-changed', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-changed', handleStorageChange);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    window.dispatchEvent(new Event('auth-changed'));
    navigate('/login');
  };

  return (
    <div className="app-dark-layout">
      <nav className="navbar">
        <div className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>Автосервис</span>
          {user && (
            <span style={{ fontSize: '0.8rem', backgroundColor: '#29292e', padding: '0.2rem 0.5rem', borderRadius: '4px', color: '#00b37e' }}>
              Роль: {user.role}
            </span>
          )}
        </div>
        <div className="nav-links">
          <Link to="/">Каталог (Услуги)</Link>
          {token && user?.role === 'client' && <Link to="/bookings">Мои бронирования</Link>}
          {token && user?.role === 'mechanic' && <Link to="/mechanic">Панель механика</Link>}
          {token && user?.role === 'administrator' && <Link to="/admin">Отчеты (Админ)</Link>}
          {token ? (
            <button onClick={handleLogout} className="btn-link">Выйти</button>
          ) : (
            <>
              <Link to="/login">Вход</Link>
              <Link to="/register">Регистрация</Link>
            </>
          )}
        </div>
      </nav>

      <main className="main-content">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Catalog />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['client']} />}>
            <Route path="/bookings" element={<ClientBookings />} />
            <Route path="/bookings/new" element={<CreateBooking />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['mechanic']} />}>
            <Route path="/mechanic" element={<MechanicDashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['administrator']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        </Routes>
      </main>
    </div>
  );
}

export default App;
