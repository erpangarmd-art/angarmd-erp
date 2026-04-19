import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { User, Lock, KeyRound } from 'lucide-react';

export default function Login({ onLogin }) {
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'workers'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setWorkers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (selectedWorker.pin === pin) {
      // Передаем весь объект пользователя в систему
      onLogin(selectedWorker);
    } else {
      setError('❌ Неверный ПИН-код!');
      setPin('');
    }
  };

  // Перевод системных ролей для красивого отображения
  const getRoleLabel = (role) => {
    switch(role) {
      case 'admin': return <span style={{color: '#e31e24', fontWeight: 'bold'}}>(Директор)</span>;
      case 'foreman': return <span style={{color: '#673ab7', fontWeight: 'bold'}}>(Прораб)</span>;
      case 'pto': return <span style={{color: '#ff9800', fontWeight: 'bold'}}>(Отдел ПТО)</span>;
      case 'driver': return <span style={{color: '#007bff'}}>(Водитель)</span>;
      default: return <span style={{color: '#888'}}>(Рабочий)</span>;
    }
  };

  if (loading) return <div style={{textAlign: 'center', marginTop: '50px'}}>Загрузка профилей...</div>;

  // Экран ввода ПИН-кода
  if (selectedWorker) {
    return (
      <div style={{ maxWidth: '350px', margin: '50px auto', padding: '20px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        <button onClick={() => {setSelectedWorker(null); setError(''); setPin('');}} style={{ background: 'none', border: 'none', color: '#007bff', marginBottom: '20px', cursor: 'pointer', fontSize: '14px' }}>
          ← Выбрать другой профиль
        </button>
        
        <div style={{ marginBottom: '20px' }}>
          <div style={{ width: '60px', height: '60px', backgroundColor: '#f0f0f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px auto' }}>
            <User size={30} color="#1a1a1a" />
          </div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#1a1a1a' }}>{selectedWorker.name}</h2>
          <div style={{ fontSize: '14px', marginTop: '5px' }}>{getRoleLabel(selectedWorker.role)}</div>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ position: 'relative', marginBottom: '15px' }}>
            <KeyRound size={20} color="#666" style={{ position: 'absolute', left: '15px', top: '15px' }} />
            <input 
              type="password" 
              placeholder="Введите 4 цифры ПИН" 
              maxLength="4"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              autoFocus
              style={{ width: '100%', padding: '15px 15px 15px 45px', border: '2px solid #ccc', borderRadius: '4px', fontSize: '18px', boxSizing: 'border-box', letterSpacing: '4px', textAlign: 'center' }}
            />
          </div>
          {error && <div style={{ color: '#e31e24', marginBottom: '15px', fontSize: '14px', fontWeight: 'bold' }}>{error}</div>}
          <button type="submit" disabled={pin.length !== 4} style={{ width: '100%', padding: '15px', backgroundColor: pin.length === 4 ? '#2e7d32' : '#ccc', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold', cursor: pin.length === 4 ? 'pointer' : 'not-allowed' }}>
            ВОЙТИ
          </button>
        </form>
      </div>
    );
  }

  // Экран выбора пользователя
  return (
    <div style={{ maxWidth: '400px', margin: '40px auto', padding: '0 20px' }}>
      <h2 style={{ textAlign: 'center', color: '#1a1a1a', marginBottom: '30px' }}>Выберите профиль</h2>
      <div style={{ display: 'grid', gap: '10px' }}>
        {workers.map(worker => (
          <button 
            key={worker.id}
            onClick={() => setSelectedWorker(worker)}
            style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '20px', backgroundColor: '#fff', border: '1px solid #eee', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', textAlign: 'left' }}
          >
            <div style={{ backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '50%' }}>
              <User size={20} color="#555" />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1a1a1a' }}>{worker.name}</div>
              <div style={{ fontSize: '13px', marginTop: '2px' }}>{getRoleLabel(worker.role)}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}