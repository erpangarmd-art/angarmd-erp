import React from 'react';
import { MapPin, FileSpreadsheet } from 'lucide-react';

const urgencyColors = {
  'Обычная': { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
  'Средняя': { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
  'Срочная': { bg: '#ffedd5', color: '#ea580c', border: '#fed7aa' },
  'Критическая': { bg: '#fef2f2', color: '#e31e24', border: '#fecaca' }
};

export default function PTOHistory({ requests }) {
  const exportToExcel = () => {
    let csv = "data:text/csv;charset=utf-8,\uFEFFДата,Объект,Срочность,Сумма,Статус,Создатель\n";
    requests.forEach(r => {
      const date = r.createdAt ? r.createdAt.toDate().toLocaleDateString('ru-RU') : '';
      csv += `"${date}","${r.projectName}","${r.urgency}","${r.totalCost}","${r.status}","${r.createdBy}"\n`;
    });
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `Snabzhenie_${new Date().toLocaleDateString('ru-RU')}.csv`;
    link.click();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ margin: 0, color: '#1e293b', fontSize: '22px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileSpreadsheet size={24} color="#64748b" /> История заявок
        </h2>
        <button onClick={exportToExcel} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)' }}>
          Экспорт в Excel
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {requests.map(req => {
          const dateStr = req.createdAt ? req.createdAt.toDate().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '...';
          const isDone = req.status === 'Выполнена';
          const urgencyStyle = urgencyColors[req.urgency] || urgencyColors['Обычная'];

          return (
            <div key={req.id} style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '20px', borderLeft: `6px solid ${urgencyStyle.color}`, boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '12px', fontWeight: '800', color: '#64748b' }}>
                <span>Заявка #{req.id.slice(-5).toUpperCase()}</span>
                <span style={{ color: isDone ? '#059669' : '#d97706' }}>Статус: {req.status}</span>
              </div>
              <div style={{ fontWeight: '800', fontSize: '15px', color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={14} color="#64748b" /> Объект: {req.projectName}
              </div>
              
              {/* Превью материалов из корзины */}
              <div style={{ fontSize: '13px', color: '#475569', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {req.items && req.items.map(i => i.name).join(', ')}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Позиций: {req.totalItems}</div>
                  <div style={{ fontSize: '15px', color: '#e31e24', fontWeight: '900', marginTop: '2px' }}>Сумма: {Number(req.totalCost).toLocaleString('ru-RU')} MDL</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-block', backgroundColor: urgencyStyle.bg, color: urgencyStyle.color, padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', marginBottom: '6px' }}>
                    {req.urgency}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>{dateStr}</div>
                </div>
              </div>
            </div>
          );
        })}
        {requests.length === 0 && (
          <div style={{ color: '#94a3b8', padding: '20px', fontWeight: '600' }}>Заявок пока нет.</div>
        )}
      </div>
    </div>
  );
}