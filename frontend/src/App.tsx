import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Catalog } from './pages/Catalog';
import { Bookings } from './pages/Bookings';
import { MechanicPanel } from './pages/MechanicPanel';
import { AdminReports } from './pages/AdminReports';
import './App.css';

function App() {
  const navigate = useNavigate();
  const token = localStorage.getItem('access_token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="app-dark-layout">
      <nav className="navbar">
        <div className="nav-brand">Автосервис</div>
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
            <Route path="/bookings" element={<Bookings />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['mechanic']} />}>
            <Route path="/mechanic" element={<MechanicPanel />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['administrator']} />}>
            <Route path="/admin" element={<AdminReports />} />
          </Route>
        </Routes>
      </main>
    </div>
  );
}

export default App;
