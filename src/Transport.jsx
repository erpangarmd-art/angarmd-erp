import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase'; 
import { Truck, MapPin, Droplet, Camera, FileSpreadsheet, Image as ImageIcon, Loader2, Navigation } from 'lucide-react'; // Добавили иконку Navigation

export default function Transport({ user }) {
  const [car, setCar] = useState('');
  const [routeStart, setRouteStart] = useState('Кишинев (Офис)'); 
  const [routeEnd, setRouteEnd] = useState('');
  const [mileage, setMileage] = useState('');
  const [liters, setLiters] = useState('');
  const [cost, setCost] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [dashboardFile, setDashboardFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [projects, setProjects] = useState([]);
  const [logs, setLogs] = useState([]);

  const receiptInputRef = useRef(null);
  const dashboardInputRef = useRef(null);

  const cars = ['Renault Captur', 'Dacia Duster', 'Ford Transit', 'Mercedes Sprinter', 'Экскаватор JCB', 'Кран-манипулятор'];

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'projects'), (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user.role !== 'admin' && user.role !== 'foreman') return;
    
    const q = query(collection(db, 'transport_logs'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user.role]);

  const handleFileSelect = (e, setFileState) => {
    const file = e.target.files[0];
    if (file) setFileState(file);
  };

  const uploadImage = async (file, pathPrefix) => {
    if (!file) return null;
    const storageRef = ref(storage, `transport/${pathPrefix}_${Date.now()}.jpg`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  // --- НОВАЯ ФУНКЦИЯ ЗАХВАТА GPS ---
  const getGpsLocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null); // Если браузер старый и не поддерживает
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn("GPS ошибка:", error.message);
          resolve(null); // Если водитель нажал "Запретить доступ к геопозиции"
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // 1. Захватываем GPS перед отправкой
      const location = await getGpsLocation();

      // 2. Загружаем фотки (если есть)
      const receiptUrl = await uploadImage(receiptFile, 'receipt');
      const dashboardUrl = await uploadImage(dashboardFile, 'dashboard');

      // 3. Пишем в базу вместе с координатами
      await addDoc(collection(db, 'transport_logs'), {
        workerName: user.name,
        car: car,
        routeStart: routeStart, 
        routeEnd: routeEnd,     
        mileage: Number(mileage),
        liters: Number(liters),
        cost: Number(cost),
        receiptPhoto: receiptUrl,
        dashboardPhoto: dashboardUrl,
        location: location, // Сохраняем {lat, lng} или null
        timestamp: new Date()
      });
      
      setMessage('✅ Отчет успешно сохранен!');
      setCar(''); setRouteEnd(''); setMileage(''); setLiters(''); setCost('');
      setReceiptFile(null); setDashboardFile(null);
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Ошибка:", error);
      setMessage('❌ Ошибка при отправке. Проверьте интернет.');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "Дата,Водитель,Автомобиль,Маршрут,Одометр,Литры,Сумма (MDL),Цена за литр,Координаты\n";

    logs.forEach(log => {
      const date = log.timestamp ? log.timestamp.toDate().toLocaleDateString('ru-RU') : '';
      const route = `${log.routeStart} -> ${log.routeEnd}`;
      const pricePerLiter = log.liters > 0 ? (log.cost / log.liters).toFixed(2) : 0;
      const gpsString = log.location ? `${log.location.lat}, ${log.location.lng}` : 'Нет данных';
      
      const row = `"${date}","${log.workerName}","${log.car}","${route}","${log.mileage}","${log.liters}","${log.cost}","${pricePerLiter}","${gpsString}"`;
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Transport_${new Date().toLocaleDateString('ru-RU')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#1a1a1a', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Truck size={28} color="#007bff" /> Транспорт и ГСМ
        </h2>
        
        {(user.role === 'admin' || user.role === 'foreman') && (
          <button onClick={exportToCSV} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 15px', backgroundColor: '#2e7d32', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
            <FileSpreadsheet size={16} /> Скачать отчет
          </button>
        )}
      </div>

      {['driver', 'admin', 'foreman'].includes(user.role) && (
        <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '30px', borderTop: '4px solid #007bff' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#1a1a1a', fontSize: '18px' }}>⛽ Заполнить путевой лист</h3>
          
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px' }}>
            
            <div style={{ display: 'grid', gap: '5px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#666' }}>Автомобиль</label>
              <select value={car} onChange={(e) => setCar(e.target.value)} required style={{ padding: '12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '16px', backgroundColor: '#fff' }}>
                <option value="">-- Выберите машину --</option>
                {cars.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px', border: '1px solid #e9ecef' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#333', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <MapPin size={16} color="#e31e24" /> Маршрут
              </div>
              
              <div style={{ display: 'grid', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#888', width: '60px', fontSize: '14px' }}>Откуда:</span>
                  <input type="text" value={routeStart} onChange={(e) => setRouteStart(e.target.value)} required style={{ flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }} />
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#1a1a1a', width: '60px', fontSize: '14px', fontWeight: 'bold' }}>Куда:</span>
                  <input type="text" list="projects-list-transport" placeholder="Объект или адрес" value={routeEnd} onChange={(e) => setRouteEnd(e.target.value)} required style={{ flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontWeight: 'bold' }} />
                  <datalist id="projects-list-transport">
                    {projects.map(p => <option key={p.id} value={p.name} />)}
                  </datalist>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '5px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#666' }}>Одометр (Пробег в км)</label>
              <input type="number" placeholder="Напр: 154000" value={mileage} onChange={(e) => setMileage(e.target.value)} required style={{ padding: '12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '16px' }} />
            </div>
            
            <div style={{ padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '6px', border: '1px solid #bbdefb' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#1565c0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Droplet size={16} /> Заправка
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1, display: 'grid', gap: '5px' }}>
                  <label style={{ fontSize: '12px', color: '#1565c0' }}>Литры (L)</label>
                  <input type="number" step="0.1" placeholder="0" value={liters} onChange={(e) => setLiters(e.target.value)} style={{ padding: '10px', border: '1px solid #90caf9', borderRadius: '4px', fontSize: '16px' }} />
                </div>
                <div style={{ flex: 1, display: 'grid', gap: '5px' }}>
                  <label style={{ fontSize: '12px', color: '#1565c0' }}>Сумма (MDL)</label>
                  <input type="number" placeholder="0" value={cost} onChange={(e) => setCost(e.target.value)} style={{ padding: '10px', border: '1px solid #90caf9', borderRadius: '4px', fontSize: '16px' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
              <div onClick={() => receiptInputRef.current.click()} style={{ flex: 1, padding: '12px', border: receiptFile ? '2px solid #2e7d32' : '2px dashed #ccc', borderRadius: '6px', textAlign: 'center', cursor: 'pointer', backgroundColor: receiptFile ? '#e8f5e9' : '#fafafa', color: receiptFile ? '#2e7d32' : '#666', fontSize: '13px', fontWeight: 'bold' }}>
                <Camera size={20} style={{ marginBottom: '5px', display: 'block', margin: '0 auto' }} />
                {receiptFile ? 'Чек прикреплен ✅' : 'Фото чека'}
              </div>
              <input type="file" accept="image/*" capture="environment" ref={receiptInputRef} onChange={(e) => handleFileSelect(e, setReceiptFile)} style={{ display: 'none' }} />

              <div onClick={() => dashboardInputRef.current.click()} style={{ flex: 1, padding: '12px', border: dashboardFile ? '2px solid #2e7d32' : '2px dashed #ccc', borderRadius: '6px', textAlign: 'center', cursor: 'pointer', backgroundColor: dashboardFile ? '#e8f5e9' : '#fafafa', color: dashboardFile ? '#2e7d32' : '#666', fontSize: '13px', fontWeight: 'bold' }}>
                <Truck size={20} style={{ marginBottom: '5px', display: 'block', margin: '0 auto' }} />
                {dashboardFile ? 'Одометр прикреплен ✅' : 'Фото приборки'}
              </div>
              <input type="file" accept="image/*" capture="environment" ref={dashboardInputRef} onChange={(e) => handleFileSelect(e, setDashboardFile)} style={{ display: 'none' }} />
            </div>

            <button type="submit" disabled={loading} style={{ padding: '15px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
              {loading ? <Loader2 className="spin-animation" size={20} /> : 'ОТПРАВИТЬ ОТЧЕТ (С GPS)'}
            </button>
            {message && <div style={{ textAlign: 'center', padding: '10px', backgroundColor: message.includes('✅') ? '#e8f5e9' : '#ffebee', color: message.includes('✅') ? '#2e7d32' : '#c62828', borderRadius: '4px', fontWeight: 'bold' }}>{message}</div>}
          </form>
        </div>
      )}

      {(user.role === 'admin' || user.role === 'foreman') && (
        <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#1a1a1a', fontSize: '18px' }}>📋 История поездок (с геолокацией)</h3>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', textAlign: 'left' }}>
                  <th style={{ padding: '12px 15px', borderBottom: '2px solid #dee2e6', color: '#495057' }}>Дата / Водитель</th>
                  <th style={{ padding: '12px 15px', borderBottom: '2px solid #dee2e6', color: '#495057' }}>Маршрут / GPS</th>
                  <th style={{ padding: '12px 15px', borderBottom: '2px solid #dee2e6', color: '#495057' }}>Пробег</th>
                  <th style={{ padding: '12px 15px', borderBottom: '2px solid #dee2e6', color: '#495057' }}>Заправка</th>
                  <th style={{ padding: '12px 15px', borderBottom: '2px solid #dee2e6', color: '#495057', textAlign: 'center' }}>Фото</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const pricePerLiter = log.liters > 0 ? (log.cost / log.liters).toFixed(2) : 0;
                  // Ссылка на Google Maps, если GPS есть
                  const mapLink = log.location ? `https://www.google.com/maps/search/?api=1&query=${log.location.lat},${log.location.lng}` : null;
                  
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid #eee', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <td style={{ padding: '15px' }}>
                        <div style={{ fontWeight: 'bold', color: '#1a1a1a', marginBottom: '4px' }}>{log.timestamp?.toDate().toLocaleDateString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
                        <div style={{ fontSize: '13px', color: '#007bff', fontWeight: 'bold' }}>{log.car}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>👤 {log.workerName}</div>
                      </td>
                      <td style={{ padding: '15px' }}>
                        <div style={{ fontSize: '12px', color: '#888' }}>Из: {log.routeStart}</div>
                        <div style={{ fontWeight: 'bold', color: '#333', marginTop: '2px', marginBottom: '8px' }}>В: {log.routeEnd}</div>
                        
                        {/* КНОПКА КАРТЫ */}
                        {mapLink ? (
                          <a href={mapLink} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#e31e24', textDecoration: 'none', backgroundColor: '#ffeeee', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                            <Navigation size={12} /> Открыто с точки на карте
                          </a>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#999' }}>GPS не определен</span>
                        )}
                      </td>
                      <td style={{ padding: '15px', fontWeight: 'bold', color: '#495057', fontSize: '15px' }}>
                        {log.mileage} км
                      </td>
                      <td style={{ padding: '15px' }}>
                        {log.liters > 0 ? (
                          <>
                            <div style={{ fontWeight: 'bold', color: '#2e7d32', fontSize: '15px' }}>{log.cost} MDL</div>
                            <div style={{ fontSize: '12px', color: '#666' }}>{log.liters} л. ({pricePerLiter} MDL/л)</div>
                          </>
                        ) : (
                          <span style={{ color: '#ccc', fontStyle: 'italic' }}>Без заправки</span>
                        )}
                      </td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          {log.receiptPhoto ? (
                            <a href={log.receiptPhoto} target="_blank" rel="noopener noreferrer" title="Фото чека" style={{ color: '#2e7d32', backgroundColor: '#e8f5e9', padding: '6px', borderRadius: '4px' }}>
                              <ImageIcon size={18} />
                            </a>
                          ) : <span style={{ width: '30px' }}></span>}
                          
                          {log.dashboardPhoto ? (
                            <a href={log.dashboardPhoto} target="_blank" rel="noopener noreferrer" title="Фото одометра" style={{ color: '#1565c0', backgroundColor: '#e3f2fd', padding: '6px', borderRadius: '4px' }}>
                              <Truck size={18} />
                            </a>
                          ) : <span style={{ width: '30px' }}></span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {logs.length === 0 && <tr><td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#888', fontStyle: 'italic' }}>Пока нет данных о поездках</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}