import { useState } from 'react';
import { apiClient } from '../api/client';
import type { Booking } from '../types';

export function MechanicPanel() {
  const [date, setDate] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const [year, month, day] = date.split('-');
      const formattedDate = `${day}-${month}-${year}`;

      const res = await apiClient.get(`/mechanics/bookings?date=${formattedDate}`);
      setBookings(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка при загрузке расписания');
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await apiClient.post(`/bookings/${id}/status`, { status });
      const [year, month, day] = date.split('-');
      const formattedDate = `${day}-${month}-${year}`;
      const res = await apiClient.get(`/mechanics/bookings?date=${formattedDate}`);
      setBookings(res.data);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Ошибка обновления статуса');
    }
  };

  return (
    <div className="page-container">
      <h2>Панель механика</h2>
      <form onSubmit={handleSearch} className="filter-form">
        <div className="form-group">
          <label>Выберите дату</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn-primary">Показать расписание</button>
      </form>

      {error && <div className="error-banner">{error}</div>}

      <div className="bookings-list">
        {bookings.map((b) => (
          <div key={b.id} className="booking-item">
            <div>
              <strong>Бронь #{b.id}</strong>
              <p>Статус: <span className={`status ${b.status}`}>{b.status}</span></p>
              <p>Время: {new Date(b.start_at).toLocaleTimeString()} - {new Date(b.end_at).toLocaleTimeString()}</p>
            </div>
            <div className="action-buttons">
              <button onClick={() => updateStatus(b.id, 'confirmed')} className="btn-secondary">Подтвердить</button>
              <button onClick={() => updateStatus(b.id, 'completed')} className="btn-success">Завершить</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
