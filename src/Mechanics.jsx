import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { Wrench, Tractor, Camera, Clock, ShoppingCart, Check, X, AlertTriangle, ExternalLink } from 'lucide-react';

export default function Mechanics({ user }) {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('all'); // all, pending, process, done
  
  // Поля формы
  const [equipment, setEquipment] = useState('');
  const [problem, setProblem] = useState('');
  const [urgency, setUrgency] = useState('Обычная'); // Новое поле
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
        // Уникальное имя файла
        const storageRef = ref(storage, `mechanics/${Date.now()}_${user.name}.jpg`);
        await uploadString(storageRef, capturedPhoto, 'data_url');
        photoUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, 'mechanic_requests'), {
        author: user.name,
        equipment: equipment,
        problem: problem,
        urgency: urgency, // Сохраняем срочность
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
      case 'Ожидает': return { bg: '#fff3e0', text: '#e65100', icon: <Clock size={14} /> };
      case 'В закупке': return { bg: '#e3f2fd', text: '#1565c0', icon: <ShoppingCart size={14} /> };
      case 'Готово': return { bg: '#e8f5e9', text: '#2e7d32', icon: <Check size={14} /> };
      case 'Отказ': return { bg: '#ffebee', text: '#c62828', icon: <X size={14} /> };
      default: return { bg: '#f5f5f5', text: '#666', icon: null };
    }
  };

  // Фильтрация заявок
  const filteredRequests = requests.filter(req => {
    if (filter === 'all') return true;
    if (filter === 'pending') return req.status === 'Ожидает';
    if (filter === 'process') return req.status === 'В закупке';
    if (filter === 'done') return req.status === 'Готово' || req.status === 'Отказ';
    return true;
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#1a1a1a', padding: '8px', borderRadius: '8px', display: 'flex' }}>
          <Wrench size={24} color="#fff" />
        </div>
        <h2 style={{ margin: 0, color: '#1a1a1a', fontSize: '24px' }}>Техника и Ремонт</h2>
      </div>

      {/* ФОРМА СОЗДАНИЯ (Видят все, кроме ПТО, если им не нужно) */}
      {user.role !== 'pto' && (
        <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '30px', borderTop: '4px solid #1a1a1a' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#1a1a1a', fontSize: '18px' }}>🔧 Новая заявка на обслуживание</h3>
          
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px' }}>
            
            <div style={{ display: 'grid', gap: '5px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#666' }}>🚜 Выберите технику</label>
              <input 
                type="text" 
                list="equip-list" 
                placeholder="Например: Экскаватор JCB" 
                value={equipment} 
                onChange={(e) => setEquipment(e.target.value)} 
                required 
                style={{ padding: '12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '16px' }} 
              />
              <datalist id="equip-list">
                {equipmentList.map(eq => <option key={eq} value={eq} />)}
              </datalist>
            </div>

            <div style={{ display: 'grid', gap: '5px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#666' }}>⚙️ Что сломалось / Какая запчасть нужна?</label>
              <textarea 
                rows="3"
                placeholder="Укажите деталь или опишите симптомы поломки..." 
                value={problem} 
                onChange={(e) => setProblem(e.target.value)} 
                required 
                style={{ padding: '12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px', resize: 'vertical' }} 
              />
            </div>

            <div style={{ display: 'grid', gap: '5px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#666' }}>⚡ Срочность</label>
              <select value={urgency} onChange={(e) => setUrgency(e.target.value)} style={{ padding: '12px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '16px', backgroundColor: urgency === 'КРИТИЧНО! Простой' ? '#ffebee' : '#fff', color: urgency === 'КРИТИЧНО! Простой' ? '#c62828' : '#333', fontWeight: urgency === 'КРИТИЧНО! Простой' ? 'bold' : 'normal' }}>
                <option value="Обычная">Плановое ТО / Не горит</option>
                <option value="КРИТИЧНО! Простой">🔥 КРИТИЧНО! Техника стоит (Простой)</option>
              </select>
            </div>

            {/* Загрузка фото */}
            <div style={{ textAlign: 'center', marginTop: '5px' }}>
              {capturedPhoto ? (
                <div style={{ position: 'relative' }}>
                  <img src={capturedPhoto} alt="Превью" style={{ width: '100%', maxHeight: '250px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #2e7d32' }} />
                  <button type="button" onClick={() => setCapturedPhoto(null)} style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: '#e31e24', color: '#fff', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16}/></button>
                </div>
              ) : (
                <div 
                  onClick={() => photoInputRef.current.click()}
                  style={{ padding: '20px', border: '2px dashed #ccc', borderRadius: '8px', cursor: 'pointer', backgroundColor: '#fafafa', color: '#666', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#1a1a1a'; e.currentTarget.style.color = '#1a1a1a'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#ccc'; e.currentTarget.style.color = '#666'; }}
                >
                  <Camera size={32} />
                  <span>ПРИКРЕПИТЬ ФОТО ПОЛОМКИ / ЗАПЧАСТИ</span>
                </div>
              )}
              <input type="file" accept="image/*" capture="environment" ref={photoInputRef} onChange={handlePhotoCapture} style={{ display: 'none' }} />
            </div>

            <button type="submit" disabled={loading} style={{ padding: '15px', backgroundColor: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
              {loading ? 'ОТПРАВКА...' : 'ОТПРАВИТЬ ЗАЯВКУ'}
            </button>
          </form>
        </div>
      )}

      {/* --- ЛЕНТА ЗАЯВОК НА ТЕХНИКУ --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, color: '#1a1a1a', fontSize: '18px' }}>📋 Статус заявок</h3>
      </div>

      {/* Фильтры */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '5px' }}>
        <button onClick={() => setFilter('all')} style={{ padding: '6px 14px', borderRadius: '20px', border: filter==='all' ? 'none' : '1px solid #ccc', backgroundColor: filter==='all' ? '#1a1a1a' : '#fff', color: filter==='all' ? '#fff' : '#666', cursor: 'pointer', fontSize: '13px' }}>Все</button>
        <button onClick={() => setFilter('pending')} style={{ padding: '6px 14px', borderRadius: '20px', border: filter==='pending' ? 'none' : '1px solid #ff9800', backgroundColor: filter==='pending' ? '#ff9800' : '#fff', color: filter==='pending' ? '#fff' : '#ff9800', cursor: 'pointer', fontSize: '13px' }}>Новые ({requests.filter(r=>r.status==='Ожидает').length})</button>
        <button onClick={() => setFilter('process')} style={{ padding: '6px 14px', borderRadius: '20px', border: filter==='process' ? 'none' : '1px solid #2196f3', backgroundColor: filter==='process' ? '#2196f3' : '#fff', color: filter==='process' ? '#fff' : '#2196f3', cursor: 'pointer', fontSize: '13px' }}>В закупке</button>
        <button onClick={() => setFilter('done')} style={{ padding: '6px 14px', borderRadius: '20px', border: filter==='done' ? 'none' : '1px solid #4caf50', backgroundColor: filter==='done' ? '#4caf50' : '#fff', color: filter==='done' ? '#fff' : '#4caf50', cursor: 'pointer', fontSize: '13px' }}>Закрытые</button>
      </div>
      
      <div style={{ display: 'grid', gap: '15px' }}>
        {filteredRequests.map(req => {
          const statusStyle = getStatusColor(req.status);
          const isCritical = req.urgency === 'КРИТИЧНО! Простой';
          
          return (
            <div key={req.id} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderLeft: isCritical ? '5px solid #e31e24' : '5px solid #1a1a1a' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Tractor size={20} color={isCritical ? "#e31e24" : "#1a1a1a"} /> {req.equipment}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '6px' }}>
                    От: <b>{req.author}</b> | {req.timestamp?.toDate().toLocaleString('ru-RU', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'})}
                  </div>
                  {isCritical && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#ffebee', color: '#c62828', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', marginTop: '6px' }}>
                      <AlertTriangle size={12} /> ТЕХНИКА ПРОСТАИВАЕТ
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: statusStyle.bg, color: statusStyle.text, padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                  {statusStyle.icon} {req.status}
                </div>
              </div>

              <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '6px', border: '1px solid #eee', marginBottom: '15px', fontSize: '14px', color: '#333' }}>
                {req.problem}
              </div>

              {req.photoUrl && (
                <div style={{ marginBottom: '15px' }}>
                  <a href={req.photoUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', position: 'relative' }}>
                    <img src={req.photoUrl} alt="Фото поломки" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '2px solid #ddd' }} />
                    <div style={{ position: 'absolute', bottom: '-8px', right: '-8px', backgroundColor: '#fff', borderRadius: '50%', padding: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                      <ExternalLink size={14} color="#666" />
                    </div>
                  </a>
                </div>
              )}

              {/* УПРАВЛЕНИЕ СТАТУСАМИ (Видят только Админ и ПТО) */}
              {(user.role === 'admin' || user.role === 'pto') && req.status !== 'Готово' && req.status !== 'Отказ' && (
                <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                  
                  {req.status === 'Ожидает' && (
                    <button onClick={() => handleUpdateStatus(req.id, 'В закупке')} style={{ flex: 1, padding: '10px', backgroundColor: '#e3f2fd', color: '#1565c0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                      ЗАКАЗАТЬ ДЕТАЛЬ
                    </button>
                  )}

                  {req.status === 'В закупке' && (
                    <button onClick={() => handleUpdateStatus(req.id, 'Готово')} style={{ flex: 1, padding: '10px', backgroundColor: '#e8f5e9', color: '#2e7d32', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                      ПОЧИНЕНО / ВЫДАНО
                    </button>
                  )}

                  <button onClick={() => handleUpdateStatus(req.id, 'Отказ')} style={{ padding: '10px 15px', backgroundColor: '#ffebee', color: '#c62828', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                    ОТКАЗ
                  </button>
                </div>
              )}
              
            </div>
          );
        })}
        {filteredRequests.length === 0 && <div style={{ textAlign: 'center', color: '#888', padding: '30px', backgroundColor: '#fff', borderRadius: '8px' }}>В этой категории пусто.</div>}
      </div>
    </div>
  );
}