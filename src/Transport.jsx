import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase'; 
import { Truck, MapPin, Droplet, Camera, FileSpreadsheet, Image as ImageIcon, Loader2, Navigation, Navigation2, Gauge, CheckCircle2, ArrowRight, Clock, PlayCircle, StopCircle } from 'lucide-react';

const CARS = ['Renault Captur', 'Dacia Duster', 'Ford Transit', 'Mercedes Sprinter', 'Экскаватор JCB', 'Кран-манипулятор'];
const PURPOSES = ['Доставка материалов', 'Перевозка рабочих / прораба', 'Перегон техники', 'Осмотр / сдача ангара', 'Другое'];

export default function Transport({ user }) {
  // Базовые данные
  const [projects, setProjects] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // СОСТОЯНИЕ ПРИЛОЖЕНИЯ (Конечный автомат)
  // 'history' | 'create' | 'active' | 'finish' | 'summary'
  const [view, setView] = useState('history'); 
  
  // Текущая поездка (из базы)
  const [activeTrip, setActiveTrip] = useState(null);

  // Форма: Создание
  const [car, setCar] = useState('');
  const [routeStart, setRouteStart] = useState('Кишинев (Офис)');
  const [routeEnd, setRouteEnd] = useState('');
  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [odoStart, setOdoStart] = useState('');
  const [liters, setLiters] = useState('');
  const [cost, setCost] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [dashboardFile, setDashboardFile] = useState(null);

  // Форма: Завершение
  const [odoEnd, setOdoEnd] = useState('');
  const [endComment, setEndComment] = useState('');

  const receiptInputRef = useRef(null);
  const dashboardInputRef = useRef(null);

  // 1. ЗАГРУЗКА ОБЪЕКТОВ
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'projects'), (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(p => p.status !== 'Архив'));
    });
    return () => unsubscribe();
  }, []);

  // 2. ОТСЛЕЖИВАНИЕ АКТИВНОЙ ПОЕЗДКИ И ИСТОРИИ
  useEffect(() => {
    // Ищем, есть ли у водителя незавершенная поездка
    const qActive = query(collection(db, 'transport_logs'), where('workerName', '==', user.name), where('status', '==', 'В пути'));
    const unsubActive = onSnapshot(qActive, (snapshot) => {
      if (!snapshot.empty) {
        setActiveTrip({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
        if (view === 'history' || view === 'create') setView('active');
      } else {
        setActiveTrip(null);
        if (view === 'active') setView('history');
      }
    });

    // Загрузка истории
    let qHistory;
    if (user.role === 'admin' || user.role === 'foreman' || user.role === 'pto') {
      qHistory = query(collection(db, 'transport_logs'), orderBy('createdAt', 'desc'));
    } else {
      qHistory = query(collection(db, 'transport_logs'), where('workerName', '==', user.name), orderBy('createdAt', 'desc'));
    }
    
    const unsubHistory = onSnapshot(qHistory, (snapshot) => {
      setHistoryLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubActive(); unsubHistory(); };
  }, [user.name, user.role, view]);

  // ХЕЛПЕРЫ ФОТО И GPS
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

  const getGpsLocation = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) resolve(null);
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        (error) => resolve(null),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  };

  // ШАГ 4: НАЧАТЬ ПОЕЗДКУ
  const handleStartTrip = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const location = await getGpsLocation();
      const receiptUrl = await uploadImage(receiptFile, 'receipt');
      const dashboardUrl = await uploadImage(dashboardFile, 'dashboard');

      await addDoc(collection(db, 'transport_logs'), {
        workerName: user.name,
        car, routeStart, routeEnd, purpose,
        odoStart: Number(odoStart),
        liters: Number(liters) || 0,
        cost: Number(cost) || 0,
        receiptPhoto: receiptUrl,
        dashboardStartPhoto: dashboardUrl,
        startLocation: location,
        status: 'В пути',
        createdAt: serverTimestamp()
      });
      
      // Очистка формы (состояние само переключится на 'active' через useEffect)
      setCar(''); setRouteEnd(''); setOdoStart(''); setLiters(''); setCost(''); setReceiptFile(null); setDashboardFile(null);
    } catch (error) { alert("Ошибка: " + error.message); } 
    finally { setLoading(false); }
  };

  // ШАГ 6: ЗАВЕРШИТЬ ПОЕЗДКУ (Переход к Summary)
  const handleFinishTripClick = () => {
    if (!odoEnd || Number(odoEnd) <= activeTrip.odoStart) {
      return alert('Введите корректный одометр (он должен быть больше стартового)!');
    }
    setView('summary');
  };

  // ШАГ 7: ПОДТВЕРДИТЬ И ОТПРАВИТЬ
  const handleConfirmFinish = async () => {
    setLoading(true);
    try {
      const location = await getGpsLocation();
      const distance = Number(odoEnd) - activeTrip.odoStart;

      await updateDoc(doc(db, 'transport_logs', activeTrip.id), {
        odoEnd: Number(odoEnd),
        distance: distance,
        endComment: endComment,
        endLocation: location,
        status: 'Завершен',
        endedAt: serverTimestamp()
      });
      
      setOdoEnd(''); setEndComment('');
      setView('history');
      alert('✅ Путевой лист успешно закрыт!');
    } catch (error) { alert("Ошибка: " + error.message); } 
    finally { setLoading(false); }
  };

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFFДата,Водитель,Авто,Откуда,Куда,Цель,Пробег(км),Литры,Сумма,Статус,Комментарий\n";
    historyLogs.forEach(log => {
      const date = log.createdAt ? log.createdAt.toDate().toLocaleDateString('ru-RU') : '';
      csvContent += `"${date}","${log.workerName}","${log.car}","${log.routeStart}","${log.routeEnd}","${log.purpose || ''}","${log.distance || 0}","${log.liters || 0}","${log.cost || 0}","${log.status}","${log.endComment || ''}"\n`;
    });
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `Transport_${new Date().toLocaleDateString('ru-RU')}.csv`;
    link.click();
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', animation: 'fadeIn 0.3s ease-out', paddingBottom: '60px' }}>
      
      {/* ШАПКА */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ margin: 0, color: '#1e293b', fontSize: '28px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Truck size={32} color="#3b82f6" /> Транспорт
        </h2>
      </div>

      {/* --- ЭКРАН 1: ИСТОРИЯ И КНОПКА "НОВЫЙ ЛИСТ" --- */}
      {view === 'history' && (
        <div style={{ animation: 'slideUp 0.3s ease-out' }}>
          <button onClick={() => setView('create')} style={{ width: '100%', padding: '20px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '20px', fontSize: '18px', fontWeight: '900', cursor: 'pointer', marginBottom: '30px', boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', transition: 'transform 0.2s' }}>
            <PlayCircle size={24} /> + НОВЫЙ ПУТЕВОЙ ЛИСТ
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '20px', fontWeight: '900' }}>История поездок</h3>
            {(user.role === 'admin' || user.role === 'pto') && (
              <button onClick={exportToCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
                <FileSpreadsheet size={16} /> Excel
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            {historyLogs.filter(l => l.status === 'Завершен').map(log => (
              <div key={log.id} style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '16px' }}>{log.workerName}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700' }}>{log.createdAt?.toDate().toLocaleDateString('ru-RU')}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#3b82f6', fontWeight: '700', marginBottom: '16px' }}>
                  <Truck size={16} /> {log.car}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', marginBottom: '16px' }}>
                  <div style={{ flex: 1, fontSize: '14px', fontWeight: '600', color: '#475569' }}>{log.routeStart}</div>
                  <ArrowRight size={16} color="#94a3b8" />
                  <div style={{ flex: 1, fontSize: '15px', fontWeight: '800', color: '#1e293b', textAlign: 'right' }}>{log.routeEnd}</div>
                </div>
                <div style={{ display: 'flex', gap: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '800' }}>Пробег</div>
                    <div style={{ fontSize: '16px', fontWeight: '900', color: '#1e293b' }}>{log.distance} <span style={{ fontSize: '12px', color: '#64748b' }}>км</span></div>
                  </div>
                  {log.liters > 0 && (
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '800' }}>Заправка</div>
                      <div style={{ fontSize: '16px', fontWeight: '900', color: '#059669' }}>{log.cost} <span style={{ fontSize: '12px', color: '#64748b' }}>MDL</span></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- ЭКРАН 2: СОЗДАНИЕ ПУТЕВОГО ЛИСТА --- */}
      {view === 'create' && (
        <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', animation: 'slideUp 0.3s ease-out' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#1e293b' }}>Оформление выезда</h3>
            <button onClick={() => setView('history')} style={{ background: 'none', border: 'none', color: '#94a3b8', fontWeight: '700', cursor: 'pointer' }}>Отмена</button>
          </div>

          <form onSubmit={handleStartTrip} style={{ display: 'grid', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#475569', marginBottom: '8px' }}>Автомобиль *</label>
              <select value={car} onChange={(e) => setCar(e.target.value)} required style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '2px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '16px', fontWeight: '700', color: '#1e293b', outline: 'none' }}>
                <option value="">-- Выберите машину --</option>
                {CARS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gap: '12px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#64748b', marginBottom: '4px' }}>Откуда (Авто: Офис)</label>
                <input type="text" value={routeStart} onChange={(e) => setRouteStart(e.target.value)} required style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '15px', fontWeight: '600', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#3b82f6', marginBottom: '4px' }}>Куда едем? *</label>
                <input type="text" list="projects-list" value={routeEnd} onChange={(e) => setRouteEnd(e.target.value)} placeholder="Выберите объект или введите адрес" required style={{ width: '100%', padding: '14px', borderRadius: '10px', border: '2px solid #3b82f6', fontSize: '16px', fontWeight: '800', color: '#1e293b', boxSizing: 'border-box', outline: 'none' }} />
                <datalist id="projects-list">
                  {projects.map(p => <option key={p.id} value={p.name} />)}
                </datalist>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#475569', marginBottom: '8px' }}>Цель поездки *</label>
              <select value={purpose} onChange={(e) => setPurpose(e.target.value)} required style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '15px', fontWeight: '600', color: '#1e293b', outline: 'none' }}>
                {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '800', color: '#475569', marginBottom: '8px' }}>
                <Gauge size={16} /> Одометр ПЕРЕД выездом (км) *
              </label>
              <input type="number" value={odoStart} onChange={(e) => setOdoStart(e.target.value)} placeholder="Напр: 154000" required style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '18px', fontWeight: '900', boxSizing: 'border-box', outline: 'none' }} />
            </div>

            <div style={{ padding: '16px', backgroundColor: '#ecfdf5', borderRadius: '16px', border: '1px dashed #10b981' }}>
              <div style={{ fontWeight: '800', color: '#059669', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><Droplet size={18} /> Была заправка?</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#047857', marginBottom: '4px' }}>Литры</label>
                  <input type="number" value={liters} onChange={(e) => setLiters(e.target.value)} placeholder="0" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #6ee7b7', fontSize: '16px', fontWeight: '800', boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#047857', marginBottom: '4px' }}>Сумма (MDL)</label>
                  <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #6ee7b7', fontSize: '16px', fontWeight: '800', boxSizing: 'border-box', outline: 'none', color: '#059669' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div onClick={() => receiptInputRef.current.click()} style={{ flex: 1, padding: '16px 10px', border: receiptFile ? '2px solid #10b981' : '2px dashed #cbd5e1', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', backgroundColor: receiptFile ? '#f0fdf4' : '#f8fafc', color: receiptFile ? '#059669' : '#64748b' }}>
                <Camera size={24} style={{ margin: '0 auto 8px auto', display: 'block' }} />
                <div style={{ fontSize: '12px', fontWeight: '800' }}>{receiptFile ? 'Чек загружен ✅' : 'Фото чека'}</div>
              </div>
              <input type="file" accept="image/*" capture="environment" ref={receiptInputRef} onChange={(e) => handleFileSelect(e, setReceiptFile)} style={{ display: 'none' }} />

              <div onClick={() => dashboardInputRef.current.click()} style={{ flex: 1, padding: '16px 10px', border: dashboardFile ? '2px solid #3b82f6' : '2px dashed #cbd5e1', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', backgroundColor: dashboardFile ? '#eff6ff' : '#f8fafc', color: dashboardFile ? '#2563eb' : '#64748b' }}>
                <Gauge size={24} style={{ margin: '0 auto 8px auto', display: 'block' }} />
                <div style={{ fontSize: '12px', fontWeight: '800' }}>{dashboardFile ? 'Приборка загружена ✅' : 'Фото приборки'}</div>
              </div>
              <input type="file" accept="image/*" capture="environment" ref={dashboardInputRef} onChange={(e) => handleFileSelect(e, setDashboardFile)} style={{ display: 'none' }} />
            </div>

            <button type="submit" disabled={loading} style={{ width: '100%', padding: '20px', backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '16px', fontSize: '18px', fontWeight: '900', cursor: 'pointer', marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', boxShadow: '0 10px 25px -5px rgba(34, 197, 94, 0.4)' }}>
              {loading ? <Loader2 className="spin-animation" size={24} /> : <><Navigation size={24} /> НАЧАТЬ ПОЕЗДКУ</>}
            </button>
          </form>
        </div>
      )}

      {/* --- ЭКРАН 3: АКТИВНАЯ ПОЕЗДКА (В ПУТИ) --- */}
      {view === 'active' && activeTrip && (
        <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '30px 24px', border: '2px solid #3b82f6', boxShadow: '0 15px 35px rgba(59, 130, 246, 0.15)', animation: 'slideUp 0.3s ease-out', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', backgroundColor: '#eff6ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', color: '#3b82f6', animation: 'pulse-blue 2s infinite' }}>
            <Truck size={40} />
          </div>
          
          <div style={{ fontSize: '14px', fontWeight: '800', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>СТАТУС: В пути</div>
          <h3 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: '900', color: '#1e293b' }}>{activeTrip.routeStart} ➔ {activeTrip.routeEnd}</h3>

          <div style={{ backgroundColor: '#f8fafc', borderRadius: '16px', padding: '16px', marginBottom: '30px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>Автомобиль:</span>
              <span style={{ color: '#1e293b', fontSize: '14px', fontWeight: '800' }}>{activeTrip.car}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>Одометр (Старт):</span>
              <span style={{ color: '#1e293b', fontSize: '14px', fontWeight: '800' }}>{activeTrip.odoStart} км</span>
            </div>
          </div>

          <button onClick={() => setView('finish')} style={{ width: '100%', padding: '20px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '16px', fontSize: '18px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', transition: 'transform 0.2s' }}>
            <StopCircle size={24} /> ЗАВЕРШИТЬ ПОЕЗДКУ
          </button>
        </div>
      )}

      {/* --- ЭКРАН 4: ЗАВЕРШЕНИЕ ПОЕЗДКИ (Ввод финиша) --- */}
      {view === 'finish' && activeTrip && (
        <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#1e293b' }}>Фиксация прибытия</h3>
            <button onClick={() => setView('active')} style={{ background: 'none', border: 'none', color: '#94a3b8', fontWeight: '700', cursor: 'pointer' }}>Назад</button>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '800', color: '#e31e24', marginBottom: '8px' }}>
              <Gauge size={18} /> Одометр ПОСЛЕ приезда (км) *
            </label>
            <input type="number" value={odoEnd} onChange={(e) => setOdoEnd(e.target.value)} placeholder={`Больше чем ${activeTrip.odoStart}`} required style={{ width: '100%', padding: '18px', borderRadius: '12px', border: '2px solid #fca5a5', backgroundColor: '#fef2f2', fontSize: '20px', fontWeight: '900', color: '#7f1d1d', boxSizing: 'border-box', outline: 'none' }} />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#475569', marginBottom: '8px' }}>Комментарий (Необязательно)</label>
            <textarea value={endComment} onChange={(e) => setEndComment(e.target.value)} placeholder="Например: 'Выгрузили трубы', 'Ждали кран 2 часа'..." style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '15px', boxSizing: 'border-box', outline: 'none', minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          <button onClick={handleFinishTripClick} disabled={!odoEnd} style={{ width: '100%', padding: '20px', backgroundColor: odoEnd ? '#111827' : '#cbd5e1', color: '#fff', border: 'none', borderRadius: '16px', fontSize: '18px', fontWeight: '900', cursor: odoEnd ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
            ДАЛЕЕ
          </button>
        </div>
      )}

      {/* --- ЭКРАН 5: SUMMARY (ПОДТВЕРЖДЕНИЕ) --- */}
      {view === 'summary' && activeTrip && (
        <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', animation: 'slideUp 0.2s ease-out' }}>
          <h3 style={{ margin: '0 0 24px 0', fontSize: '22px', fontWeight: '900', color: '#1e293b', textAlign: 'center' }}>Проверка отчета</h3>
          
          <div style={{ backgroundColor: '#f8fafc', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '16px' }}>
              <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>Маршрут</div>
              <div style={{ color: '#1e293b', fontSize: '15px', fontWeight: '800', textAlign: 'right' }}>{activeTrip.routeStart}<br/>➔ {activeTrip.routeEnd}</div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '16px' }}>
              <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>Пройдено</div>
              <div style={{ color: '#3b82f6', fontSize: '20px', fontWeight: '900' }}>{Number(odoEnd) - activeTrip.odoStart} км</div>
            </div>

            {activeTrip.liters > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '16px' }}>
                <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>Заправка</div>
                <div style={{ color: '#059669', fontSize: '18px', fontWeight: '900' }}>{activeTrip.liters} л. ({activeTrip.cost} MDL)</div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600' }}>Автомобиль</div>
              <div style={{ color: '#1e293b', fontSize: '14px', fontWeight: '800' }}>{activeTrip.car}</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => setView('finish')} disabled={loading} style={{ flex: 1, padding: '20px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: '800', cursor: 'pointer' }}>
              НАЗАД
            </button>
            <button onClick={handleConfirmFinish} disabled={loading} style={{ flex: 2, padding: '20px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: '900', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)' }}>
              {loading ? <Loader2 className="spin-animation" size={20} /> : <><CheckCircle2 size={20} /> ОТПРАВИТЬ ОТЧЕТ</>}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-blue { 0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); } 70% { box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); } 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); } }
      `}</style>
    </div>
  );
}