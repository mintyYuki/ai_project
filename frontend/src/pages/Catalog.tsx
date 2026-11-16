import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import type { Service, Mechanic } from '../types';

export function Catalog() {
  const [services, setServices] = useState<Service[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [selectedMechanic, setSelectedMechanic] = useState<number | null>(null);
  const [startAt, setStartAt] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  useEffect(() => {
    apiClient.get('/services').then((res) => setServices(res.data));
    apiClient.get('/mechanics').then((res) => setMechanics(res.data));
  }, []);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!selectedService || !selectedMechanic || !startAt) {
      setError('Заполните все поля для записи');
      return;
    }

    try {
      const formattedStart = new Date(startAt).toISOString();

      await apiClient.post('/bookings', {
        service_id: selectedService,
        mechanic_id: selectedMechanic,
        start_at: formattedStart,
      });

      setMessage('Услуга успешно забронирована!');
      setSelectedService(null);
      setSelectedMechanic(null);
      setStartAt('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка при создании бронирования');
    }
  };

  return (
    <div className="page-container">
      <h2>Каталог услуг</h2>
      {message && <div className="success-banner">{message}</div>}
      {error && <div className="error-banner">{error}</div>}

      <div className="grid">
        <div className="card-list">
          <h3>Доступные услуги</h3>
          {services.map((s) => (
            <div key={s.id} className={`item-card ${selectedService === s.id ? 'selected' : ''}`} onClick={() => setSelectedService(s.id)}>
              <h4>{s.name}</h4>
              <p>Длительность: {s.duration_minutes} мин.</p>
              <p className="price">Цена: {s.price} ₽</p>
            </div>
          ))}
        </div>

        <div className="card-list">
          <h3>Механики</h3>
          {mechanics.map((m) => (
            <div key={m.id} className={`item-card ${selectedMechanic === m.id ? 'selected' : ''}`} onClick={() => setSelectedMechanic(m.id)}>
              <h4>Механик #{m.id}</h4>
              <p>Специализация: {m.specialization}</p>
            </div>
          ))}
        </div>
      </div>

      {user?.role === 'client' && (
        <form onSubmit={handleBook} className="booking-form">
          <h3>Записаться на обслуживание</h3>
          <div className="form-group">
            <label>Дата и время начала</label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary">Забронировать</button>
        </form>
      )}
    </div>
  );
}
