import { useState } from 'react';
import { apiClient, API_BASE_URL } from '../api/client';

export function AdminDashboard() {
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
      if (res.data && res.data.report) {
        res.data.report.sort((a: any, b: any) => Number(a.service_id) - Number(b.service_id));
      }
      setReportData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка загрузки отчетов');
    }
  };

  const handleExportCsv = async () => {
    setError('');
    console.log('[AdminReports] Exporting CSV via authenticated blob download with params:', { dateFrom, dateTo });
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

      // Use apiClient so Bearer Authorization header is attached automatically (preventing "Not authenticated")
      const response = await apiClient.get('/admin/reports/export-csv', {
        params,
        responseType: 'blob',
      });
      console.log('[AdminReports] CSV export blob received successfully:', response);

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${dateFrom || 'all'}_to_${dateTo || 'all'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('[AdminReports] Failed to export CSV:', err, err.response);
      setError(err.response?.data?.detail || 'Не удалось экспортировать отчет в CSV');
    }
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

      {reportData && reportData.report && (
        <div className="report-results" style={{ backgroundColor: '#202024', padding: '1.5rem', borderRadius: '8px' }}>
          <h3>Результаты отчета</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #29292e', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem' }}>ID</th>
                <th style={{ padding: '0.75rem' }}>Услуга</th>
                <th style={{ padding: '0.75rem' }}>Цена</th>
                <th style={{ padding: '0.75rem' }}>Всего броней</th>
                <th style={{ padding: '0.75rem' }}>Доход</th>
              </tr>
            </thead>
            <tbody>
              {reportData.report.map((row: any) => (
                <tr key={row.service_id} style={{ borderBottom: '1px solid #29292e' }}>
                  <td style={{ padding: '0.75rem' }}>{row.service_id}</td>
                  <td style={{ padding: '0.75rem' }}>{row.service_name}</td>
                  <td style={{ padding: '0.75rem' }}>{row.service_price} ₽</td>
                  <td style={{ padding: '0.75rem' }}>{row.total_bookings}</td>
                  <td style={{ padding: '0.75rem' }}>{row.total_revenue} ₽</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
