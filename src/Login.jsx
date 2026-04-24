import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { Search, ChevronDown, Lock, ShieldCheck } from 'lucide-react';

const roleConfig = {
  admin: { text: 'Директор', color: '#e31e24', bg: '#fef2f2' },
  foreman: { text: 'Прораб', color: '#059669', bg: '#ecfdf5' },
  pto: { text: 'Начальник ПТО', color: '#d97706', bg: '#fffbeb' },
  driver: { text: 'Водитель', color: '#2563eb', bg: '#eff6ff' },
  worker: { text: 'Рабочий', color: '#ea580c', bg: '#fff7ed' }
};

export default function Login({ onLogin }) {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'workers'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // МАГИЯ АВТОВХОДА: Срабатывает ровно на 4-й цифре
  useEffect(() => {
    if (pin.length === 4 && selectedUserId) {
      const user = users.find(u => u.id === selectedUserId);
      if (user && user.pin === pin) {
        onLogin(user); // ПИН верный -> мгновенно пускаем в систему
      } else {
        setError('Неверный ПИН-код!');
        setPin(''); // ПИН неверный -> стираем цифры, чтобы можно было сразу ввести заново
      }
    }
  }, [pin, selectedUserId, users, onLogin]);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (roleConfig[u.role]?.text || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f8fafc', color: '#64748b', fontSize: '20px', fontWeight: '800' }}>
        Загрузка...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* ЛОГОТИП */}
      <div style={{ margin: '40px 0', textAlign: 'center', animation: 'fadeInDown 0.5s ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '8px' }}>
          <ShieldCheck size={56} color="#e31e24" />
          <h1 style={{ margin: 0, fontSize: '56px', fontWeight: '900', color: '#1e293b', letterSpacing: '-1px' }}>
            ANGAR<span style={{ color: '#e31e24' }}>.MD</span>
          </h1>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: '800px', animation: 'fadeInUp 0.5s ease-out' }}>
        
        {/* ПОИСК */}
        <div style={{ position: 'relative', marginBottom: '32px' }}>
          <Search style={{ position: 'absolute', left: '24px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={32} />
          <input 
            type="text" 
            placeholder="Поиск сотрудника..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '28px 28px 28px 76px', borderRadius: '24px', border: 'none', backgroundColor: '#fff', fontSize: '22px', fontWeight: '700', color: '#1e293b', outline: 'none', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.05)', boxSizing: 'border-box' }}
          />
        </div>

        {/* СПИСОК ПРОФИЛЕЙ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filteredUsers.map(u => {
            const isSelected = selectedUserId === u.id;
            const role = roleConfig[u.role] || roleConfig.worker;
            const initial = u.name.charAt(0).toUpperCase();

            return (
              <div 
                key={u.id} 
                style={{ backgroundColor: '#fff', borderRadius: '28px', overflow: 'hidden', boxShadow: isSelected ? '0 25px 50px -12px rgba(0,0,0,0.15)' : '0 6px 15px rgba(0,0,0,0.03)', transition: 'all 0.2s', border: isSelected ? `3px solid ${role.color}` : '3px solid transparent' }}
              >
                {/* ШАПКА КАРТОЧКИ (ОГРОМНАЯ) */}
                <div 
                  onClick={() => { setSelectedUserId(isSelected ? null : u.id); setError(''); setPin(''); }}
                  style={{ display: 'flex', alignItems: 'center', padding: '30px', cursor: 'pointer', backgroundColor: isSelected ? '#f8fafc' : '#fff' }}
                >
                  {/* ГИГАНТСКАЯ АВАТАРКА */}
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: role.bg, color: role.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: '900', flexShrink: 0 }}>
                    {u.photoUrl ? <img src={u.photoUrl} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : initial}
                  </div>

                  {/* ИМЯ И ДОЛЖНОСТЬ (КРУПНЫМ ШРИФТОМ) */}
                  <div style={{ flex: 1, marginLeft: '24px', textAlign: 'left' }}>
                    <div style={{ fontSize: '28px', fontWeight: '900', color: '#1e293b', marginBottom: '8px' }}>{u.name}</div>
                    <div style={{ display: 'inline-block', padding: '8px 16px', backgroundColor: role.bg, color: role.color, borderRadius: '10px', fontSize: '16px', fontWeight: '800' }}>
                      {role.text}
                    </div>
                  </div>

                  <div style={{ transform: isSelected ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s', color: '#94a3b8' }}>
                    <ChevronDown size={40} />
                  </div>
                </div>

                {/* ВВОД ПИН-КОДА */}
                {isSelected && (
                  <div style={{ padding: '40px 20px', backgroundColor: '#fff', borderTop: '2px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#475569', fontWeight: '900', fontSize: '20px' }}>
                        <Lock size={28} color="#3b82f6" /> ВВЕДИТЕ 4 ЦИФРЫ
                      </div>

                      {/* ПОЛЕ ВВОДА (Звездочки) */}
                      <input 
                        type="password" 
                        inputMode="numeric" 
                        pattern="[0-9]*"
                        maxLength="4" 
                        autoFocus
                        value={pin} 
                        onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setError(''); }}
                        style={{ 
                          width: '280px', 
                          padding: '24px', 
                          fontSize: '56px', 
                          letterSpacing: '28px', 
                          textAlign: 'center', 
                          borderRadius: '24px', 
                          border: error ? '4px solid #ef4444' : '4px solid #cbd5e1', 
                          backgroundColor: '#f8fafc', 
                          color: '#1e293b', 
                          fontWeight: '900', 
                          outline: 'none',
                          paddingLeft: '56px' 
                        }} 
                      />

                      {error && (
                        <div style={{ color: '#ef4444', fontWeight: '900', fontSize: '20px', backgroundColor: '#fef2f2', padding: '16px 32px', borderRadius: '16px', marginTop: '10px' }}>
                          {error}
                        </div>
                      )}

                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}