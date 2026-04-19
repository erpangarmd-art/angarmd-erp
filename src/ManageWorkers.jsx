import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { X, Edit2, Trash2, UserPlus, DollarSign, Briefcase, Lock } from 'lucide-react';

export default function ManageWorkers() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);
  
  // Поля формы
  const [editName, setEditName] = useState('');
  const [editPin, setEditPin] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editRole, setEditRole] = useState('worker');
  const [editSalaryRate, setEditSalaryRate] = useState('');
  const [editSalaryType, setEditSalaryType] = useState('hourly'); // hourly или fixed

  useEffect(() => {
    const q = query(collection(db, 'workers'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setWorkers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const openAddDialog = () => {
    setIsAddMode(true);
    setSelectedWorkerId(null);
    setEditName('');
    setEditPin('');
    setEditPosition('');
    setEditRole('worker');
    setEditSalaryRate('');
    setEditSalaryType('hourly');
    setIsModalOpen(true);
  };

  const openEditDialog = (worker) => {
    setIsAddMode(false);
    setSelectedWorkerId(worker.id);
    setEditName(worker.name);
    setEditPin(worker.pin);
    setEditPosition(worker.position || 'Рабочий');
    setEditRole(worker.role || 'worker');
    setEditSalaryRate(worker.salaryRate || '');
    setEditSalaryType(worker.salaryType || 'hourly');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editName.trim() || editPin.length !== 4) {
      alert("Заполните имя и ПИН-код (4 цифры)!");
      return;
    }
    
    const workerData = {
      name: editName.trim(),
      pin: editPin,
      position: editPosition.trim() || 'Рабочий',
      role: editRole,
      salaryRate: Number(editSalaryRate) || 0,
      salaryType: editSalaryType
    };

    try {
      if (isAddMode) {
        await addDoc(collection(db, 'workers'), workerData);
      } else {
        await updateDoc(doc(db, 'workers', selectedWorkerId), workerData);
      }
      setIsModalOpen(false);
    } catch (error) {
      alert("Ошибка: " + error.message);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Удалить сотрудника ${editName}?`)) {
      try {
        await deleteDoc(doc(db, 'workers', selectedWorkerId));
        setIsModalOpen(false);
      } catch (error) {
        alert("Ошибка удаления: " + error.message);
      }
    }
  };

  const roleLabels = {
    admin: { label: 'Директор', color: '#e31e24' },
    foreman: { label: 'Прораб', color: '#673ab7' },
    pto: { label: 'ПТО', color: '#ff9800' },
    driver: { label: 'Водитель', color: '#007bff' },
    worker: { label: 'Рабочий', color: '#666' }
  };

  if (loading) return <div style={{padding: '40px', textAlign: 'center'}}>Загрузка...</div>;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Users size={28} /> Персонал
        </h2>
        <button onClick={openAddDialog} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          <UserPlus size={18} /> Добавить
        </button>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        {workers.map(worker => (
          <div 
            key={worker.id} 
            onClick={() => openEditDialog(worker)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', cursor: 'pointer', border: '1px solid #eee' }}
          >
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                {worker.name} 
                <span style={{ marginLeft: '8px', color: roleLabels[worker.role]?.color, fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {roleLabels[worker.role]?.label}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#666', marginTop: '4px', display: 'flex', gap: '15px' }}>
                <span style={{display:'flex', alignItems:'center', gap: '4px'}}><Briefcase size={14}/> {worker.position}</span>
                <span style={{display:'flex', alignItems:'center', gap: '4px'}}><DollarSign size={14}/> {worker.salaryRate || 0} {worker.salaryType === 'hourly' ? 'MDL/ч' : 'MDL/мес'}</span>
              </div>
            </div>
            <Edit2 size={18} color="#ccc" />
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '15px' }}>
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '12px', width: '100%', maxWidth: '420px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>{isAddMode ? 'Новый сотрудник' : 'Профиль сотрудника'}</h3>
              <X onClick={() => setIsModalOpen(false)} style={{ cursor: 'pointer' }} color="#666" />
            </div>

            <div style={{ display: 'grid', gap: '15px' }}>
              {/* Блок Основное */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Имя и Фамилия</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', marginTop: '5px', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>ПИН (4 цифры)</label>
                  <input type="text" maxLength="4" value={editPin} onChange={(e) => setEditPin(e.target.value.replace(/\D/g, ''))} style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', marginTop: '5px', boxSizing: 'border-box', letterSpacing: '4px', fontWeight: 'bold' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>Должность</label>
                  <input type="text" value={editPosition} onChange={(e) => setEditPosition(e.target.value)} style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', marginTop: '5px', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Блок Роль и Зарплата */}
              <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #eee', display: 'grid', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#1a1a1a' }}>Доступ в системе</label>
                  <select value={editRole} onChange={(e) => setEditRole(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', marginTop: '5px' }}>
                    <option value="worker">Строитель (Только смены)</option>
                    <option value="driver">Водитель (Путевые листы)</option>
                    <option value="foreman">Прораб (Объекты + Снабжение)</option>
                    <option value="pto">ПТО (Закупки)</option>
                    <option value="admin">Директор (Полный доступ)</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#1a1a1a' }}>Ставка (MDL)</label>
                    <input type="number" value={editSalaryRate} onChange={(e) => setEditSalaryRate(e.target.value)} placeholder="0" style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', marginTop: '5px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#1a1a1a' }}>Тип оплаты</label>
                    <select value={editSalaryType} onChange={(e) => setEditSalaryType(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', marginTop: '5px' }}>
                      <option value="hourly">в час</option>
                      <option value="fixed">в месяц</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button onClick={handleSave} style={{ flex: 1, padding: '14px', backgroundColor: '#1a1a1a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                  {isAddMode ? 'ДОБАВИТЬ' : 'СОХРАНИТЬ'}
                </button>
                {!isAddMode && (
                  <button onClick={handleDelete} style={{ padding: '14px', backgroundColor: '#fff', color: '#e31e24', border: '1px solid #e31e24', borderRadius: '6px', cursor: 'pointer' }}>
                    <Trash2 size={20} />
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}