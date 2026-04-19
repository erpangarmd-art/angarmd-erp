import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function AddProject() {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    lat: null,
    lng: null,
    status: 'active',
    progress: 0 // НОВОЕ: стартовый процент выполнения
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const inputRef = useRef(null);
  const autoCompleteRef = useRef(null);

  useEffect(() => {
    if (window.google && inputRef.current) {
      autoCompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['geocode', 'establishment'],
        componentRestrictions: { country: 'md' }
      });

      autoCompleteRef.current.addListener('place_changed', () => {
        const place = autoCompleteRef.current.getPlace();
        if (place.geometry) {
          setFormData(prev => ({
            ...prev,
            address: place.formatted_address || place.name,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          }));
        }
      });
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'progress' ? Number(value) : value // Прогресс сохраняем как число
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await addDoc(collection(db, 'projects'), {
        name: formData.name,
        address: formData.address,
        lat: formData.lat,
        lng: formData.lng,
        status: formData.status,
        progress: formData.progress, // Сохраняем в базу
        createdAt: new Date()
      });
      
      setMessage('✅ Объект успешно добавлен!');
      setFormData({ name: '', address: '', lat: null, lng: null, status: 'active', progress: 0 });
    } catch (error) {
      console.error("Ошибка при добавлении: ", error);
      setMessage('❌ Ошибка при добавлении объекта');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '2px', borderLeft: '5px solid #e31e24', boxShadow: '0 5px 15px rgba(0,0,0,0.05)', marginBottom: '40px' }}>
      <h2 style={{ margin: '0 0 25px 0', fontSize: '22px', fontWeight: 'bold', color: '#1a1a1a' }}>📍 Регистрация нового объекта</h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
        
        <div style={{ display: 'grid', gap: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#555' }}>Название объекта</label>
          <input name="name" placeholder="Напр: Склад зерновых 1200м2" value={formData.name} onChange={handleChange} required style={{ padding: '12px', border: '1px solid #ccc', fontSize: '16px', borderRadius: '4px' }} />
        </div>
        
        <div style={{ display: 'grid', gap: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#555' }}>Местоположение (Поиск Google)</label>
          <input ref={inputRef} name="address" placeholder="Начните вводить адрес..." value={formData.address} onChange={handleChange} required style={{ padding: '12px', border: '1px solid #ccc', fontSize: '16px', borderRadius: '4px' }} />
        </div>

        {/* НОВОЕ ПОЛЕ: Ползунок прогресса */}
        <div style={{ display: 'grid', gap: '8px', backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '4px' }}>
          <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#555', display: 'flex', justifyContent: 'space-between' }}>
            <span>Стартовый процент выполнения:</span>
            <span style={{ color: '#e31e24', fontSize: '18px' }}>{formData.progress}%</span>
          </label>
          <input 
            type="range" 
            name="progress" 
            min="0" max="100" step="5" 
            value={formData.progress} 
            onChange={handleChange} 
            style={{ cursor: 'pointer' }}
          />
        </div>

        <div style={{ display: 'grid', gap: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#555' }}>Статус строительства</label>
          <select name="status" value={formData.status} onChange={handleChange} style={{ padding: '12px', border: '1px solid #ccc', fontSize: '16px', backgroundColor: '#fff', borderRadius: '4px' }}>
            <option value="active">В процессе</option>
            <option value="completed">Завершен</option>
            <option value="paused">Приостановлено</option>
          </select>
        </div>

        <button type="submit" disabled={loading} style={{ padding: '15px', backgroundColor: loading ? '#ccc' : '#1a1a1a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
          {loading ? 'ЗАГРУЗКА...' : 'ВНЕСТИ В РЕЕСТР'}
        </button>
        {message && <p style={{ textAlign: 'center', fontWeight: 'bold', color: message.includes('✅') ? '#2e7d32' : '#e31e24' }}>{message}</p>}
      </form>
    </div>
  );
}