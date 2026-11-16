import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { Service, Mechanic } from '../types';

export function CreateBooking() {
  const [services, setServices] = useState<Service[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [selectedService, setSelectedService] = useState<number | ''>('');
  const [selectedMechanic, setSelectedMechanic] = useState<number | ''>('');
  const [startAt, setStartAt] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
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
          setError(err.response?.data?.detail || 'Не удалось загрузить данные для бронирования');
        }
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (selectedService === '' || selectedMechanic === '' || !startAt) {
      setError('Пожалуйста, заполните все поля');
      setLoading(false);
      return;
    }

    try {
      const formattedStart = new Date(startAt).toISOString();
      const response = await apiClient.post('/bookings', {
        service_id: Number(selectedService),
        mechanic_id: Number(selectedMechanic),
        start_at: formattedStart,
      });

      if (response.status === 201) {
        navigate('/bookings');
      }
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError(err.response?.data?.detail || 'Выбранный механик уже занят в указанное время. Пожалуйста, выберите другое время или другого механика.');
      } else {
        setError(err.response?.data?.detail || 'Произошла ошибка при создании бронирования.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h2>Создать бронирование</h2>
      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={handleSubmit} className="booking-form" style={{ maxWidth: '600px', backgroundColor: '#202024', padding: '2rem', borderRadius: '8px' }}>
        <div className="form-group">
          <label>Выберите услугу</label>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value ? Number(e.target.value) : '')}
            required
            style={{ padding: '0.75rem', backgroundColor: '#121214', border: '1px solid #29292e', borderRadius: '4px', color: '#e1e1e6', fontSize: '1rem' }}
          >
            <option value="">-- Выберите услугу --</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.duration_minutes} мин. — {s.price} ₽)
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Выберите механика</label>
          <select
            value={selectedMechanic}
            onChange={(e) => setSelectedMechanic(e.target.value ? Number(e.target.value) : '')}
            required
            style={{ padding: '0.75rem', backgroundColor: '#121214', border: '1px solid #29292e', borderRadius: '4px', color: '#e1e1e6', fontSize: '1rem' }}
          >
            <option value="">-- Выберите механика --</option>
            {mechanics.map((m) => (
              <option key={m.id} value={m.id}>
                Механик #{m.id} ({m.specialization})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Дата и время начала</label>
          <input
            type="datetime-local"
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Создание...' : 'Забронировать'}
        </button>
      </form>
    </div>
  );
}
