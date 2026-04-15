import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function AddProject() {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    status: 'active'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
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
        status: formData.status,
        createdAt: new Date()
      });
      
      setMessage('✅ Объект успешно добавлен!');
      setFormData({ name: '', address: '', status: 'active' });
    } catch (error) {
      console.error("Ошибка при добавлении: ", error);
      setMessage('❌ Ошибка при добавлении объекта');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      backgroundColor: '#fff', 
      padding: '30px', 
      borderRadius: '2px', 
      borderLeft: '5px solid #e31e24', 
      boxShadow: '0 5px 15px rgba(0,0,0,0.05)',
      marginBottom: '40px'
    }}>
      <h2 style={{ margin: '0 0 25px 0', fontSize: '22px', fontWeight: 'bold', color: '#1a1a1a' }}>
        Регистрация нового объекта
      </h2>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
        <div style={{ display: 'grid', gap: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#555' }}>Название объекта</label>
          <input
            name="name"
            placeholder="Напр: Склад зерновых 1200м2"
            value={formData.name}
            onChange={handleChange}
            required
            style={{ padding: '12px', border: '1px solid #ccc', fontSize: '16px' }}
          />
        </div>
        
        <div style={{ display: 'grid', gap: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#555' }}>Местоположение</label>
          <input
            name="address"
            placeholder="Район, населенный пункт"
            value={formData.address}
            onChange={handleChange}
            required
            style={{ padding: '12px', border: '1px solid #ccc', fontSize: '16px' }}
          />
        </div>

        <div style={{ display: 'grid', gap: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#555' }}>Статус строительства</label>
          <select 
            name="status" 
            value={formData.status} 
            onChange={handleChange} 
            style={{ padding: '12px', border: '1px solid #ccc', fontSize: '16px', backgroundColor: '#fff' }}
          >
            <option value="active">В процессе</option>
            <option value="completed">Завершен</option>
            <option value="paused">Приостановлено</option>
          </select>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            padding: '15px', 
            backgroundColor: loading ? '#ccc' : '#1a1a1a', 
            color: '#fff', 
            border: 'none', 
            fontSize: '16px', 
            fontWeight: 'bold',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          {loading ? 'ЗАГРУЗКА...' : 'ВНЕСТИ В РЕЕСТР'}
        </button>
        {message && <p style={{ textAlign: 'center', fontWeight: 'bold' }}>{message}</p>}
      </form>
    </div>
  );
}