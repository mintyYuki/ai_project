import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import type { Booking } from '../types';

export function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const loadBookings = async () => {
      try {
        const res = await apiClient.get('/bookings/my');
        if (isMounted) {
          setBookings(res.data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.response?.data?.detail || 'Не удалось загрузить бронирования');
        }
      }
    };
    loadBookings();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCancel = async (id: number) => {
    try {
      await apiClient.post(`/bookings/${id}/cancel`);
      fetchBookings();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Не удалось отменить бронирование');
    }
  };

  return (
    <div className="page-container">
      <h2>Мои бронирования</h2>
      {error && <div className="error-banner">{error}</div>}
      <div className="bookings-list">
        {bookings.length === 0 ? (
          <p>У вас пока нет бронирований.</p>
        ) : (
          bookings.map((b) => (
            <div key={b.id} className="booking-item">
              <div>
                <strong>Бронь #{b.id}</strong>
                <p>Статус: <span className={`status ${b.status}`}>{b.status}</span></p>
                <p>Начало: {new Date(b.start_at).toLocaleString()}</p>
                <p>Конец: {new Date(b.end_at).toLocaleString()}</p>
              </div>
              {b.status !== 'cancelled' && b.status !== 'completed' && (
                <button onClick={() => handleCancel(b.id)} className="btn-danger">
                  Отменить
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
