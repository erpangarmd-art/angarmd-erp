import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { Wrench, Tractor, Camera, Clock, ShoppingCart, Check, X, AlertTriangle, ExternalLink, Loader2, PenTool } from 'lucide-react';

export default function Mechanics({ user }) {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('all'); // all, pending, process, done
  
  // Поля формы
  const [equipment, setEquipment] = useState('');
  const [problem, setProblem] = useState('');
  const [urgency, setUrgency] = useState('Обычная');
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  const photoInputRef = useRef(null);

  // Список частой техники
  const equipmentList = ['Renault Captur', 'Dacia Duster', 'Ford Transit', 'Mercedes Sprinter', 'Экскаватор JCB', 'Кран-манипулятор', 'Генератор 50кВт', 'Профилегибочный стан'];

  useEffect(() => {
    const q = query(collection(db, 'mechanic_requests'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handlePhotoCapture = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setCapturedPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!equipment || !problem) return;

    setLoading(true);
    try {
      let photoUrl = "";
      if (capturedPhoto) {
        const storageRef = ref(storage, `mechanics/${Date.now()}_${user.name}.jpg`);
        await uploadString(storageRef, capturedPhoto, 'data_url');
        photoUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, 'mechanic_requests'), {
        author: user.name,
        equipment: equipment,
        problem: problem,
        urgency: urgency,
        photoUrl: photoUrl,
        status: 'Ожидает', 
        timestamp: new Date()
      });

      setEquipment('');
      setProblem('');
      setUrgency('Обычная');
      setCapturedPhoto(null);
      alert('✅ Заявка на ремонт/запчасть отправлена!');
    } catch (error) {
      alert('Ошибка отправки: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, 'mechanic_requests', id), { status: newStatus });
    } catch (error) {
      alert("Ошибка обновления: " + error.message);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Ожидает': return { bg: '#fffbeb', text: '#d97706', icon: <Clock size={14} /> };
      case 'В закупке': return { bg: '#eff6ff', text: '#2563eb', icon: <ShoppingCart size={14} /> };
      case 'Готово': return { bg: '#f0fdf4', text: '#059669', icon: <Check size={14} /> };
      case 'Отказ': return { bg: '#fef2f2', text: '#dc2626', icon: <X size={14} /> };
      default: return { bg: '#f3f4f6', text: '#6b7280', icon: null };
    }
  };

  const filteredRequests = requests.filter(req => {
    if (filter === 'all') return true;
    if (filter === 'pending') return req.status === 'Ожидает';
    if (filter === 'process') return req.status === 'В закупке';
    if (filter === 'done') return req.status === 'Готово' || req.status === 'Отказ';
    return true;
  });

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      
      <style>{`
        @keyframes pulse-red { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(220, 38, 38, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); } }
        .filter-btn { transition: all 0.2s ease-out; }
        .filter-btn:hover { transform: translateY(-2px); }
        .mechanic-card { transition: transform 0.2s ease; }
        .mechanic-card:hover { transform: translateY(-3px); }
      `}</style>

      {/* КРАСИВАЯ ШАПКА */}
      <div style={{ backgroundColor: '#111827', borderRadius: '24px', padding: '30px 24px', color: '#fff', marginBottom: '30px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.1, transform: 'scale(1.5)' }}>
          <Wrench size={150} />
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ margin: '0 0 6px 0', fontSize: '28px', fontWeight: '900', color: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <PenTool size={28} color="#3b82f6" /> Техника и Ремонт
          </h2>
          <p style={{ margin: 0, color: '#9ca3af', fontSize: '15px', fontWeight: '500' }}>Обслуживание автопарка и спецтехники</p>
        </div>
      </div>

      {/* ФОРМА СОЗДАНИЯ (Видят все, кроме ПТО) */}
      {user.role !== 'pto' && (
        <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', marginBottom: '40px', border: '1px solid #f1f5f9' }}>
          <h3 style={{ margin: '0 0 24px 0', color: '#1e293b', fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
            🔧 Новая заявка на ремонт
          </h3>
          
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
            
            <div style={{ display: 'grid', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Выбор техники</label>
              <input 
                type="text" list="equip-list" placeholder="Например: Экскаватор JCB" 
                value={equipment} onChange={(e) => setEquipment(e.target.value)} required 
                style={{ width: '100%', padding: '16px', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '16px', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: '600', outline: 'none', boxSizing: 'border-box' }} 
              />
              <datalist id="equip-list">
                {equipmentList.map(eq => <option key={eq} value={eq} />)}
              </datalist>
            </div>

            <div style={{ display: 'grid', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Что сломалось / Какая запчасть нужна?</label>
              <textarea 
                rows="3" placeholder="Укажите деталь или опишите симптомы поломки..." 
                value={problem} onChange={(e) => setProblem(e.target.value)} required 
                style={{ width: '100%', padding: '16px', border: '2px solid #e2e8f0', borderRadius: '12px', fontSize: '15px', resize: 'vertical', backgroundColor: '#f8fafc', outline: 'none', boxSizing: 'border-box' }} 
              />
            </div>

            <div style={{ display: 'grid', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Срочность</label>
              <select value={urgency} onChange={(e) => setUrgency(e.target.value)} style={{ width: '100%', padding: '16px', border: '2px solid', borderColor: urgency === 'КРИТИЧНО! Простой' ? '#fca5a5' : '#e2e8f0', borderRadius: '12px', fontSize: '16px', backgroundColor: urgency === 'КРИТИЧНО! Простой' ? '#fef2f2' : '#f8fafc', color: urgency === 'КРИТИЧНО! Простой' ? '#dc2626' : '#0f172a', fontWeight: urgency === 'КРИТИЧНО! Простой' ? '800' : '600', outline: 'none', boxSizing: 'border-box' }}>
                <option value="Обычная">Плановое ТО / Не горит</option>
                <option value="КРИТИЧНО! Простой">🔥 КРИТИЧНО! Техника стоит (Простой)</option>
              </select>
            </div>

            {/* Загрузка фото */}
            <div style={{ marginTop: '10px' }}>
              {capturedPhoto ? (
                <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                  <img src={capturedPhoto} alt="Превью" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '16px', border: '4px solid #10b981' }} />
                  <button type="button" onClick={() => setCapturedPhoto(null)} style={{ position: 'absolute', top: '15px', right: '15px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.4)' }}><X size={18}/></button>
                </div>
              ) : (
                <div 
                  onClick={() => photoInputRef.current.click()}
                  style={{ padding: '30px', border: '2px dashed #cbd5e1', borderRadius: '16px', cursor: 'pointer', backgroundColor: '#f8fafc', color: '#64748b', fontWeight: '800', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.color = '#2563eb'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.color = '#64748b'; }}
                >
                  <Camera size={36} />
                  <span>ПРИКРЕПИТЬ ФОТО ПОЛОМКИ / ЗАПЧАСТИ</span>
                </div>
              )}
              <input type="file" accept="image/*" capture="environment" ref={photoInputRef} onChange={handlePhotoCapture} style={{ display: 'none' }} />
            </div>

            <button type="submit" disabled={loading} style={{ width: '100%', padding: '18px', backgroundColor: '#1e293b', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '900', cursor: 'pointer', marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', boxShadow: '0 10px 20px -5px rgba(0,0,0,0.2)' }}>
              {loading ? <Loader2 className="spin-animation" size={20} /> : 'ОТПРАВИТЬ ЗАЯВКУ В РЕМОНТ'}
            </button>
          </form>
        </div>
      )}

      {/* --- ЛЕНТА ЗАЯВОК НА ТЕХНИКУ --- */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '22px', fontWeight: '900' }}>📋 Статус заявок</h3>
        
        {/* Фильтры (Pills) */}
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', scrollbarWidth: 'none' }}>
          <button className="filter-btn" onClick={() => setFilter('all')} style={{ padding: '8px 20px', borderRadius: '100px', border: 'none', backgroundColor: filter==='all' ? '#1e293b' : '#f1f5f9', color: filter==='all' ? '#fff' : '#64748b', cursor: 'pointer', fontSize: '14px', fontWeight: '800', whiteSpace: 'nowrap' }}>Все</button>
          <button className="filter-btn" onClick={() => setFilter('pending')} style={{ padding: '8px 20px', borderRadius: '100px', border: 'none', backgroundColor: filter==='pending' ? '#f59e0b' : '#f1f5f9', color: filter==='pending' ? '#fff' : '#64748b', cursor: 'pointer', fontSize: '14px', fontWeight: '800', whiteSpace: 'nowrap' }}>Новые ({requests.filter(r=>r.status==='Ожидает').length})</button>
          <button className="filter-btn" onClick={() => setFilter('process')} style={{ padding: '8px 20px', borderRadius: '100px', border: 'none', backgroundColor: filter==='process' ? '#3b82f6' : '#f1f5f9', color: filter==='process' ? '#fff' : '#64748b', cursor: 'pointer', fontSize: '14px', fontWeight: '800', whiteSpace: 'nowrap' }}>В закупке</button>
          <button className="filter-btn" onClick={() => setFilter('done')} style={{ padding: '8px 20px', borderRadius: '100px', border: 'none', backgroundColor: filter==='done' ? '#10b981' : '#f1f5f9', color: filter==='done' ? '#fff' : '#64748b', cursor: 'pointer', fontSize: '14px', fontWeight: '800', whiteSpace: 'nowrap' }}>Закрытые</button>
        </div>
      </div>
      
      {/* Карточки Заявок */}
      <div style={{ display: 'grid', gap: '20px' }}>
        {filteredRequests.map(req => {
          const statusStyle = getStatusColor(req.status);
          const isCritical = req.urgency === 'КРИТИЧНО! Простой';
          
          return (
            <div key={req.id} className="mechanic-card" style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '24px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9', position: 'relative', overflow: 'hidden' }}>
              
              {/* Левая полоска для критичных */}
              {isCritical && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px', backgroundColor: '#ef4444' }}></div>}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <div style={{ backgroundColor: isCritical ? '#fef2f2' : '#f1f5f9', padding: '8px', borderRadius: '10px', color: isCritical ? '#dc2626' : '#475569' }}>
                      <Tractor size={20} />
                    </div>
                    {req.equipment}
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#3b82f6' }}>👤 {req.author}</span>
                    <span>•</span>
                    <span>{req.timestamp?.toDate().toLocaleString('ru-RU', {day:'2-digit', month:'long', hour:'2-digit', minute:'2-digit'})}</span>
                  </div>
                  
                  {isCritical && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#fef2f2', color: '#dc2626', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '900', marginTop: '12px', animation: 'pulse-red 2s infinite' }}>
                      <AlertTriangle size={14} /> ТЕХНИКА ПРОСТАИВАЕТ
                    </div>
                  )}
                </div>

                {/* Бейдж Статуса */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: statusStyle.bg, color: statusStyle.text, padding: '8px 14px', borderRadius: '12px', fontSize: '13px', fontWeight: '800' }}>
                  {statusStyle.icon} {req.status}
                </div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px', fontSize: '15px', color: '#1e293b', fontWeight: '500', lineHeight: '1.5' }}>
                {req.problem}
              </div>

              {req.photoUrl && (
                <div style={{ marginBottom: '20px' }}>
                  <a href={req.photoUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '2px solid #e2e8f0' }}>
                    <img src={req.photoUrl} alt="Фото поломки" style={{ width: '100px', height: '100px', objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', bottom: '6px', right: '6px', backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: '8px', padding: '6px', backdropFilter: 'blur(4px)' }}>
                      <ExternalLink size={16} color="#0f172a" />
                    </div>
                  </a>
                </div>
              )}

              {/* УПРАВЛЕНИЕ СТАТУСАМИ (Видят только Админ и ПТО) */}
              {(user.role === 'admin' || user.role === 'pto') && req.status !== 'Готово' && req.status !== 'Отказ' && (
                <div style={{ display: 'flex', gap: '12px', borderTop: '2px dashed #e2e8f0', paddingTop: '20px' }}>
                  
                  {req.status === 'Ожидает' && (
                    <button onClick={() => handleUpdateStatus(req.id, 'В закупке')} style={{ flex: 1, padding: '14px', backgroundColor: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '900', fontSize: '14px', transition: 'all 0.2s' }}>
                      ЗАКАЗАТЬ ДЕТАЛЬ
                    </button>
                  )}

                  {req.status === 'В закупке' && (
                    <button onClick={() => handleUpdateStatus(req.id, 'Готово')} style={{ flex: 1, padding: '14px', backgroundColor: '#f0fdf4', color: '#059669', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '900', fontSize: '14px', transition: 'all 0.2s' }}>
                      ПОЧИНЕНО / ВЫДАНО
                    </button>
                  )}

                  <button onClick={() => handleUpdateStatus(req.id, 'Отказ')} style={{ padding: '14px 20px', backgroundColor: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '900', fontSize: '14px', transition: 'all 0.2s' }}>
                    <X size={20} />
                  </button>
                </div>
              )}
              
            </div>
          );
        })}
        {filteredRequests.length === 0 && (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px', backgroundColor: '#fff', borderRadius: '24px', border: '2px dashed #e2e8f0', fontWeight: '700', fontSize: '15px' }}>
            <Wrench size={40} style={{ margin: '0 auto 12px auto', opacity: 0.3 }} />
            В этой категории пусто
          </div>
        )}
      </div>
    </div>
  );
}