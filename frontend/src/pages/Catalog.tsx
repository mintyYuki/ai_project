import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { Service, Mechanic } from '../types';

export function Catalog() {
  const [services, setServices] = useState<Service[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [error, setError] = useState('');
  const [warningMessage, setWarningMessage] = useState('');

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  useEffect(() => {
    let isMounted = true;
    const loadCatalog = async () => {
      try {
        const [servicesRes, mechanicsRes] = await Promise.all([
          apiClient.get('/services'),
          apiClient.get('/mechanics'),
        ]);
        if (isMounted) {
          setServices(servicesRes.data);
          setMechanics(mechanicsRes.data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.response?.data?.detail || 'Не удалось загрузить каталог');
        }
      }
    };
    loadCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="page-container">
      <div className="catalog-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Каталог услуг</h2>
        {user?.role === 'client' && (
          <Link to="/bookings/new" className="btn-primary" style={{ padding: '0.5rem 1rem', textDecoration: 'none', display: 'inline-block' }}>
            Создать бронирование
          </Link>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}
      {warningMessage && <div className="error-banner" style={{ backgroundColor: 'rgba(247, 186, 90, 0.15)', color: '#f7ba5a' }}>{warningMessage}</div>}

      <div className="grid">
        <div className="card-list">
          <h3>Доступные услуги</h3>
          {services.map((s) => (
            <div
              key={s.id}
              className="item-card clickable"
              style={{ cursor: user?.role === 'client' ? 'pointer' : 'default' }}
              onClick={() => {
                console.log('[Catalog] Service card clicked:', s);
                if (!user) {
                  setWarningMessage('Пожалуйста, войдите в систему как клиент, чтобы создавать бронирования.');
                } else if (user.role !== 'client') {
                  setWarningMessage(`Действие недоступно для вашей роли (${user.role}). Только клиенты могут создавать бронирования.`);
                } else {
                  window.location.href = `/bookings/new?service_id=${s.id}`;
                }
              }}
            >
              <h4>{s.name}</h4>
              {s.description && <p>{s.description}</p>}
              <p>Длительность: {s.duration_minutes} мин.</p>
              <p className="price">Цена: {s.price} ₽</p>
              {user?.role === 'client' && (
                <span style={{ fontSize: '0.8rem', color: '#00b37e', marginTop: '0.5rem', display: 'inline-block' }}>
                  Нажмите, чтобы записаться →
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="card-list">
          <h3>Наши механики</h3>
          {mechanics.map((m) => (
            <div key={m.id} className="item-card" style={{ cursor: 'default' }}>
              <h4>Механик #{m.id}</h4>
              <p>Специализация: {m.specialization}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
