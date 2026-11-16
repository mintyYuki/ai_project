import { useState } from 'react';
import { apiClient, API_BASE_URL } from '../api/client';

export function AdminReports() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [error, setError] = useState('');

  const handleFetchReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const params: any = {};
      if (dateFrom) {
        const [y, m, d] = dateFrom.split('-');
        params.date_from = `${d}-${m}-${y}`;
      }
      if (dateTo) {
        const [y, m, d] = dateTo.split('-');
        params.date_to = `${d}-${m}-${y}`;
      }

      const res = await apiClient.get('/admin/reports', { params });
      setReportData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка загрузки отчетов');
    }
  };

  const handleExportCsv = () => {
    let url = `${API_BASE_URL}/admin/reports/export-csv?`;
    const queryParams = new URLSearchParams();
    if (dateFrom) {
      const [y, m, d] = dateFrom.split('-');
      queryParams.append('date_from', `${d}-${m}-${y}`);
    }
    if (dateTo) {
      const [y, m, d] = dateTo.split('-');
      queryParams.append('date_to', `${d}-${m}-${y}`);
    }
    const token = localStorage.getItem('access_token');
    window.open(`${url}${queryParams.toString()}&token=${token}`, '_blank');
  };

  return (
    <div className="page-container">
      <h2>Панель администратора - Отчеты</h2>
      {error && <div className="error-banner">{error}</div>}
      <form onSubmit={handleFetchReport} className="filter-form">
        <div className="form-group">
          <label>Дата с</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Дата по</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary">Сформировать отчет</button>
        <button type="button" onClick={handleExportCsv} className="btn-secondary">Экспорт в CSV</button>
      </form>

      {reportData && (
        <div className="report-results">
          <pre>{JSON.stringify(reportData, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
