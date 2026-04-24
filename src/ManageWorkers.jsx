import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, addDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { X, Edit2, Trash2, UserPlus, DollarSign, Briefcase, Search, Shield, HardHat, Truck, Users as UsersIcon, Phone, Camera, Loader2, ChevronLeft, Building2 } from 'lucide-react';

export default function ManageWorkers({ user }) {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // НОВОЕ: Состояние для "Режима руководителя" (какой отдел сейчас открыт)
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);
  
  // Поля формы
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPin, setEditPin] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editRole, setEditRole] = useState('worker');
  const [editSalaryRate, setEditSalaryRate] = useState('');
  const [editSalaryType, setEditSalaryType] = useState('hourly');
  const [editPhoto, setEditPhoto] = useState(null); 
  const [existingPhotoUrl, setExistingPhotoUrl] = useState('');

  const photoInputRef = useRef(null);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const q = query(collection(db, 'workers'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setWorkers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const openAddDialog = () => {
    if (!isAdmin) return;
    setIsAddMode(true);
    setSelectedWorkerId(null);
    setEditName(''); setEditPhone(''); setEditPin(''); setEditPosition(''); setEditRole('worker'); setEditSalaryRate(''); setEditSalaryType('hourly');
    setEditPhoto(null); setExistingPhotoUrl('');
    setIsModalOpen(true);
  };

  const openEditDialog = (worker) => {
    if (!isAdmin) return; 
    setIsAddMode(false);
    setSelectedWorkerId(worker.id);
    setEditName(worker.name); 
    setEditPhone(worker.phone || ''); 
    setEditPin(worker.pin); 
    setEditPosition(worker.position || 'Рабочий'); 
    setEditRole(worker.role || 'worker'); 
    setEditSalaryRate(worker.salaryRate || ''); 
    setEditSalaryType(worker.salaryType || 'hourly');
    setExistingPhotoUrl(worker.photoUrl || '');
    setEditPhoto(null);
    setIsModalOpen(true);
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEditPhoto(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editName.trim() || editPin.length !== 4) return alert("Заполните имя и ПИН-код (4 цифры)!");
    
    setIsSaving(true);
    try {
      let finalPhotoUrl = existingPhotoUrl;
      
      if (editPhoto) {
        const storageRef = ref(storage, `workers/${Date.now()}_${editName.trim()}.jpg`);
        await uploadString(storageRef, editPhoto, 'data_url');
        finalPhotoUrl = await getDownloadURL(storageRef);
      }

      const workerData = {
        name: editName.trim(), 
        phone: editPhone.trim(), 
        pin: editPin, 
        position: editPosition.trim() || 'Рабочий', 
        role: editRole, 
        salaryRate: Number(editSalaryRate) || 0, 
        salaryType: editSalaryType,
        photoUrl: finalPhotoUrl
      };

      if (isAddMode) await addDoc(collection(db, 'workers'), workerData);
      else await updateDoc(doc(db, 'workers', selectedWorkerId), workerData);
      
      setIsModalOpen(false);
    } catch (error) {
      alert("Ошибка: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Удалить сотрудника ${editName}?`)) {
      try {
        await deleteDoc(doc(db, 'workers', selectedWorkerId));
        setIsModalOpen(false);
      } catch (error) { alert("Ошибка удаления: " + error.message); }
    }
  };

  // КОНФИГУРАЦИЯ ОТДЕЛОВ
  const ROLE_CONFIG = {
    admin: { id: 'admin', title: 'Руководство', icon: <Shield size={32}/>, color: '#e31e24', bg: '#fef2f2' },
    pto: { id: 'pto', title: 'Снабжение (ПТО)', icon: <Briefcase size={32}/>, color: '#f59e0b', bg: '#fffbeb' }, 
    foreman: { id: 'foreman', title: 'Прорабы', icon: <HardHat size={32}/>, color: '#673ab7', bg: '#f3e8ff' },
    driver: { id: 'driver', title: 'Транспорт', icon: <Truck size={32}/>, color: '#3b82f6', bg: '#eff6ff' },
    worker: { id: 'worker', title: 'Строители', icon: <HardHat size={32}/>, color: '#10b981', bg: '#ecfdf5' },
  };

  const groupedWorkers = { admin: [], foreman: [], pto: [], driver: [], worker: [] };
  let totalFixedSalary = 0;

  workers.forEach(w => {
    if (groupedWorkers[w.role]) groupedWorkers[w.role].push(w);
    else groupedWorkers.worker.push(w);
    
    if (w.salaryType === 'fixed') {
      totalFixedSalary += (Number(w.salaryRate) || 0);
    }
  });

  const isSearching = searchQuery.trim().length > 0;
  const filteredWorkers = isSearching 
    ? workers.filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase()) || (w.position && w.position.toLowerCase().includes(searchQuery.toLowerCase())))
    : [];

  if (loading) return <div style={{padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 'bold'}}>Загрузка команды...</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', animation: 'fadeIn 0.3s ease-out', paddingBottom: '60px' }}>
      
      <style>{`
        .worker-card { transition: all 0.2s ease; }
        .worker-card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); border-color: #cbd5e1 !important; }
        .dept-card { transition: all 0.2s ease; cursor: pointer; }
        .dept-card:hover { transform: translateY(-4px); box-shadow: 0 15px 25px -5px rgba(0,0,0,0.08); border-color: #94a3b8 !important; }
        .avatar-hover:hover .avatar-overlay { opacity: 1 !important; }
      `}</style>

      {/* ШАПКА РУКОВОДИТЕЛЯ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e293b', fontSize: '28px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '12px' }}>
            Управление персоналом
          </h2>
          <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '600', marginTop: '4px' }}>
            ANGAR.MD • В штате: {workers.length} чел.
          </div>
        </div>
        
        {isAdmin && (
          <button onClick={openAddDialog} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: '#e31e24', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '800', fontSize: '15px', boxShadow: '0 4px 15px rgba(227, 30, 36, 0.3)', transition: 'transform 0.2s' }}>
            <UserPlus size={20} /> НОВЫЙ СОТРУДНИК
          </button>
        )}
      </div>

      {/* ГЛОБАЛЬНЫЙ ПОИСК */}
      <div style={{ marginBottom: '30px', position: 'relative' }}>
        <Search style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={22} />
        <input 
          type="text" 
          placeholder="Глобальный поиск по имени или должности..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '18px 20px 18px 56px', borderRadius: '16px', border: '2px solid #e2e8f0', backgroundColor: '#fff', fontSize: '16px', boxSizing: 'border-box', outline: 'none', fontWeight: '600', color: '#0f172a', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', transition: 'border-color 0.2s' }}
          onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
          onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
        />
      </div>

      {/* ЛОГИКА ОТОБРАЖЕНИЯ ЭКРАНОВ */}
      
      {isSearching ? (
        /* ЭКРАН 1: РЕЗУЛЬТАТЫ ПОИСКА */
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#64748b', marginBottom: '16px', textTransform: 'uppercase' }}>
            Результаты поиска ({filteredWorkers.length})
          </h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {filteredWorkers.map(worker => <WorkerRow key={worker.id} worker={worker} config={ROLE_CONFIG[worker.role] || ROLE_CONFIG.worker} isAdmin={isAdmin} openEdit={openEditDialog} />)}
            {filteredWorkers.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontWeight: '600' }}>Сотрудники не найдены</div>}
          </div>
        </div>
      ) : !selectedDepartment ? (
        /* ЭКРАН 2: ДАШБОРД ОТДЕЛОВ (ГЛАВНЫЙ) */
        <div style={{ animation: 'fadeIn 0.2s' }}>
          
          {/* Сводка для Директора */}
          {isAdmin && (
            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px', backgroundColor: '#fff', padding: '24px', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}><UsersIcon size={16}/> Численность</div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: '#1e293b' }}>{workers.length} <span style={{ fontSize: '16px', color: '#94a3b8' }}>чел.</span></div>
              </div>
              <div style={{ flex: 1, minWidth: '200px', backgroundColor: '#fff', padding: '24px', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.03)' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}><Building2 size={16}/> ФОТ (Фиксированные оклады)</div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: '#047857' }}>{totalFixedSalary.toLocaleString('ru-RU')} <span style={{ fontSize: '16px', color: '#94a3b8' }}>MDL / мес.</span></div>
              </div>
            </div>
          )}

          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#64748b', marginBottom: '16px', textTransform: 'uppercase' }}>Структура компании</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {Object.values(ROLE_CONFIG).map(config => {
              const count = groupedWorkers[config.id].length;
              return (
                <div 
                  key={config.id} 
                  className="dept-card"
                  onClick={() => setSelectedDepartment(config.id)}
                  style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ backgroundColor: config.bg, color: config.color, width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {config.icon}
                    </div>
                    <div style={{ backgroundColor: '#f8fafc', color: '#475569', padding: '6px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: '800' }}>
                      {count} чел.
                    </div>
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '900', color: '#1e293b' }}>{config.title}</h3>
                    <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '600' }}>Нажмите, чтобы открыть список</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ЭКРАН 3: СПИСОК СОТРУДНИКОВ ВЫБРАННОГО ОТДЕЛА */
        <div style={{ animation: 'slideUp 0.2s ease-out' }}>
          <button 
            onClick={() => setSelectedDepartment(null)} 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#64748b', fontSize: '15px', fontWeight: '800', cursor: 'pointer', padding: '0', marginBottom: '20px', transition: 'color 0.2s' }}
            onMouseEnter={e=>e.currentTarget.style.color='#1e293b'}
            onMouseLeave={e=>e.currentTarget.style.color='#64748b'}
          >
            <ChevronLeft size={20} /> Назад к отделам
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: ROLE_CONFIG[selectedDepartment].bg, color: ROLE_CONFIG[selectedDepartment].color, padding: '12px', borderRadius: '14px', display: 'flex' }}>
              {ROLE_CONFIG[selectedDepartment].icon}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#1e293b' }}>{ROLE_CONFIG[selectedDepartment].title}</h2>
              <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '600' }}>Сотрудников: {groupedWorkers[selectedDepartment].length}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {groupedWorkers[selectedDepartment].map(worker => (
              <WorkerRow key={worker.id} worker={worker} config={ROLE_CONFIG[selectedDepartment]} isAdmin={isAdmin} openEdit={openEditDialog} />
            ))}
            {groupedWorkers[selectedDepartment].length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#fff', borderRadius: '16px', border: '1px dashed #cbd5e1', color: '#94a3b8', fontWeight: '600' }}>
                В этом отделе пока нет сотрудников.
              </div>
            )}
          </div>
        </div>
      )}

      {/* МОДАЛКА РЕДАКТИРОВАНИЯ/ДОБАВЛЕНИЯ (Осталась без изменений) */}
      {isModalOpen && isAdmin && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', backdropFilter: 'blur(8px)' }}>
          <div style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '24px', width: '100%', maxWidth: '480px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'slideUp 0.3s ease-out', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: '#0f172a' }}>{isAddMode ? 'Новый сотрудник' : 'Профиль сотрудника'}</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer', display: 'flex', color: '#64748b', transition: 'background 0.2s' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
                <input type="file" accept="image/*" ref={photoInputRef} onChange={handlePhotoSelect} style={{ display: 'none' }} />
                <div 
                  className="avatar-hover"
                  onClick={() => photoInputRef.current.click()} 
                  style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#f1f5f9', border: '3px solid #e2e8f0', cursor: 'pointer', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {(editPhoto || existingPhotoUrl) ? (
                    <img src={editPhoto || existingPhotoUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Camera size={32} color="#94a3b8" />
                  )}
                  <div className="avatar-overlay" style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}>
                    <Camera size={24} color="#fff" />
                  </div>
                </div>
                {editPhoto && (
                  <button type="button" onClick={() => setEditPhoto(null)} style={{ marginTop: '8px', fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}>Удалить новое фото</button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Имя и Фамилия</label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: '100%', padding: '16px', border: '2px solid #e2e8f0', borderRadius: '12px', boxSizing: 'border-box', fontSize: '16px', outline: 'none', backgroundColor: '#f8fafc', fontWeight: '600', color: '#0f172a' }} required />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Телефон</label>
                  <input type="text" value={editPhone} placeholder="069..." onChange={(e) => setEditPhone(e.target.value)} style={{ width: '100%', padding: '16px', border: '2px solid #e2e8f0', borderRadius: '12px', boxSizing: 'border-box', fontSize: '16px', outline: 'none', backgroundColor: '#f8fafc', fontWeight: '600', color: '#0f172a' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>ПИН (4 цифры)</label>
                  <input type="text" maxLength="4" value={editPin} onChange={(e) => setEditPin(e.target.value.replace(/\D/g, ''))} style={{ width: '100%', padding: '16px', border: '2px solid #e2e8f0', borderRadius: '12px', boxSizing: 'border-box', letterSpacing: '6px', fontWeight: '900', fontSize: '18px', textAlign: 'center', outline: 'none', backgroundColor: '#f8fafc', color: '#0f172a' }} required />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '800', color: '#475569', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Должность</label>
                  <input type="text" value={editPosition} onChange={(e) => setEditPosition(e.target.value)} style={{ width: '100%', padding: '16px', border: '2px solid #e2e8f0', borderRadius: '12px', boxSizing: 'border-box', fontSize: '15px', outline: 'none', backgroundColor: '#f8fafc', fontWeight: '600', color: '#0f172a' }} />
                </div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'grid', gap: '16px', marginTop: '4px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Доступ в системе</label>
                  <select value={editRole} onChange={(e) => setEditRole(e.target.value)} style={{ width: '100%', padding: '14px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '15px', outline: 'none', backgroundColor: '#fff', fontWeight: '600', color: '#0f172a', cursor: 'pointer' }}>
                    <option value="worker">Строитель (Только смены)</option>
                    <option value="driver">Водитель (Путевые листы)</option>
                    <option value="foreman">Прораб (Объекты + Снабжение)</option>
                    <option value="pto">Начальник ПТО (Объекты + Закупки)</option> 
                    <option value="admin">Директор (Полный доступ)</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Ставка (MDL)</label>
                    <input type="number" value={editSalaryRate} onChange={(e) => setEditSalaryRate(e.target.value)} placeholder="0" style={{ width: '100%', padding: '14px', border: '1px solid #cbd5e1', borderRadius: '10px', boxSizing: 'border-box', fontSize: '15px', outline: 'none', backgroundColor: '#fff', fontWeight: '700', color: '#047857' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Тип оплаты</label>
                    <select value={editSalaryType} onChange={(e) => setEditSalaryType(e.target.value)} style={{ width: '100%', padding: '14px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '15px', outline: 'none', backgroundColor: '#fff', fontWeight: '600', color: '#0f172a', cursor: 'pointer' }}>
                      <option value="hourly">в час</option>
                      <option value="fixed">в месяц</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="submit" disabled={isSaving} style={{ flex: 1, padding: '18px', backgroundColor: '#1e293b', color: '#fff', border: 'none', borderRadius: '14px', cursor: isSaving ? 'not-allowed' : 'pointer', fontWeight: '900', fontSize: '16px', boxShadow: '0 10px 20px -5px rgba(30, 41, 59, 0.4)', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                  {isSaving ? <Loader2 className="spin-animation" /> : (isAddMode ? 'ДОБАВИТЬ В КОМАНДУ' : 'СОХРАНИТЬ')}
                </button>
                {!isAddMode && (
                  <button type="button" onClick={handleDelete} style={{ padding: '18px', backgroundColor: '#fff', color: '#ef4444', border: '2px solid #fecaca', borderRadius: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <Trash2 size={22} />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Отдельный компонент для рендера строки сотрудника (чтобы не дублировать код)
function WorkerRow({ worker, config, isAdmin, openEdit }) {
  return (
    <div 
      className="worker-card"
      onClick={() => openEdit(worker)}
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', backgroundColor: '#fff', borderRadius: '16px', cursor: isAdmin ? 'pointer' : 'default', border: '1px solid #e2e8f0', gap: '16px' }}
    >
      <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: config.bg, color: config.color, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, border: `2px solid ${config.bg}` }}>
        {worker.photoUrl ? <img src={worker.photoUrl} alt={worker.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : config.icon}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '900', fontSize: '16px', color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {worker.name}
          {isAdmin && (
            <span style={{ backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '8px', fontSize: '11px', color: '#475569', letterSpacing: '1px', fontWeight: '800' }}>
              ПИН: <span style={{color: '#1e293b'}}>{worker.pin}</span>
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ display:'flex', alignItems:'center', gap: '6px', fontSize: '13px', color: '#64748b', fontWeight: '600', backgroundColor: '#f8fafc', padding: '4px 10px', borderRadius: '8px' }}>
            <Briefcase size={14} color={config.color}/> {worker.position}
          </span>
          
          {worker.phone && (
            <a href={`tel:${worker.phone}`} onClick={e => e.stopPropagation()} style={{ display:'flex', alignItems:'center', gap: '6px', fontSize: '13px', color: '#2563eb', fontWeight: '600', backgroundColor: '#eff6ff', padding: '4px 10px', borderRadius: '8px', textDecoration: 'none' }}>
              <Phone size={14}/> {worker.phone}
            </a>
          )}

          {isAdmin && (
            <span style={{ display:'flex', alignItems:'center', gap: '6px', fontSize: '13px', color: '#047857', fontWeight: '700', backgroundColor: '#ecfdf5', padding: '4px 10px', borderRadius: '8px' }}>
              <DollarSign size={14}/> {worker.salaryRate || 0} {worker.salaryType === 'hourly' ? 'MDL/ч' : 'MDL/мес'}
            </span>
          )}
        </div>
      </div>
      {isAdmin && <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '12px', color: '#94a3b8' }}><Edit2 size={18} /></div>}
    </div>
  );
}