import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { MapPin, Camera, ShieldAlert } from 'lucide-react';

// Функция высчитывания дистанции между двумя GPS координатами (в метрах)
const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Радиус Земли в метрах
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c); 
};

export default function Attendance({ workerName }) {
  const [status, setStatus] = useState('offline'); 
  const [loading, setLoading] = useState(true); 
  const [logs, setLogs] = useState([]);
  
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState(null);

  useEffect(() => {
    const qStatus = query(
      collection(db, 'attendance'),
      where('workerName', '==', workerName),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    const unsubStatus = onSnapshot(qStatus, (snapshot) => {
      if (!snapshot.empty) {
        const lastAction = snapshot.docs[0].data();
        setStatus(lastAction.type === 'start' ? 'online' : 'offline');
      } else {
        setStatus('offline'); 
      }
      setLoading(false); 
    });

    const qLogs = query(collection(db, 'attendance'), orderBy('timestamp', 'desc'), limit(5));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qProjects = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    const unsubProjects = onSnapshot(qProjects, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubStatus();
      unsubLogs();
      unsubProjects();
    };
  }, [workerName]);

  const handlePhotoCapture = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setCapturedPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const handleClockAction = async (actionType) => {
    if (actionType === 'start' && !selectedProject) {
      alert("Пожалуйста, выберите объект (стройку) из списка!");
      return;
    }
    
    // ЗАЩИТА: Фото обязательно и при старте, и при завершении
    if (!capturedPhoto) {
      alert("Сделайте фото с объекта! Без фото отметка не принимается.");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      
      // ЗАЩИТА: Гео-забор (Проверка дистанции до объекта)
      if (actionType === 'start') {
        const currentProject = projects.find(p => p.name === selectedProject);
        // Если у объекта в базе есть координаты
        if (currentProject && currentProject.lat && currentProject.lng) {
          const distance = getDistanceInMeters(latitude, longitude, currentProject.lat, currentProject.lng);
          
          // Радиус 500 метров (можешь уменьшить до 200, если нужно жестче)
          if (distance > 500) {
            alert(`🛑 ВЫ СЛИШКОМ ДАЛЕКО ОТ ОБЪЕКТА!\n\nДистанция до стройки: ${distance} метров. Подойдите ближе, чтобы начать смену.`);
            setLoading(false);
            return; // Блокируем отправку данных
          }
        }
      }

      try {
        let photoUrl = "";
        if (capturedPhoto) {
          const storageRef = ref(storage, `attendance/${Date.now()}_${workerName}.jpg`);
          await uploadString(storageRef, capturedPhoto, 'data_url');
          photoUrl = await getDownloadURL(storageRef);
        }

        await addDoc(collection(db, 'attendance'), {
          workerName,
          type: actionType,
          projectName: actionType === 'start' ? selectedProject : 'Завершение',
          timestamp: new Date(),
          location: { lat: latitude, lng: longitude },
          photoUrl
        });

        setCapturedPhoto(null);
        if (actionType === 'end') setSelectedProject('');
      } catch (e) {
        alert('Ошибка сохранения: ' + e.message);
      } finally {
        setLoading(false);
      }
    }, () => {
      alert('Включите GPS на устройстве! Без геолокации отметка не работает.');
      setLoading(false);
    }, { enableHighAccuracy: true }); // Требуем точный GPS
  };

  return (
    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <h2 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: 'bold', color: '#1a1a1a' }}>
        Смена: {workerName}
      </h2>

      {status === 'offline' && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' }}>
            📍 На каком вы объекте?
          </label>
          <select 
            value={selectedProject} 
            onChange={(e) => setSelectedProject(e.target.value)}
            style={{ width: '100%', padding: '15px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px', backgroundColor: '#f9f9f9' }}
          >
            <option value="">-- Выберите стройку --</option>
            {projects.map(proj => (
              <option key={proj.id} value={proj.name}>{proj.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* БЛОК ФОТО И ПРЕДУПРЕЖДЕНИЙ */}
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        
        {/* Предупреждение для рабочих */}
        {!capturedPhoto && (
          <div style={{ backgroundColor: '#fff3e0', border: '1px solid #ffcc80', color: '#e65100', padding: '12px', borderRadius: '4px', marginBottom: '15px', fontSize: '13px', lineHeight: '1.4', textAlign: 'left', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <ShieldAlert size={24} style={{ flexShrink: 0 }} />
            <span><b>Анти-чит контроль:</b> Селфи нужно делать строго <b>на фоне объекта</b>. Система также проверяет вашу GPS-позицию.</span>
          </div>
        )}

        {capturedPhoto ? (
          <div>
            <img src={capturedPhoto} alt="Превью" style={{ width: '100%', borderRadius: '8px', border: '3px solid #2e7d32', marginBottom: '10px' }} />
            <div style={{ color: '#2e7d32', fontWeight: 'bold' }}>✅ Фото загружено.</div>
            <button onClick={() => setCapturedPhoto(null)} style={{ background: 'none', border: 'none', color: '#007bff', textDecoration: 'underline', marginTop: '10px', cursor: 'pointer' }}>Переснять фото</button>
          </div>
        ) : (
          <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block', width: '100%' }}>
            <button style={{ width: '100%', padding: '20px', backgroundColor: '#f0f0f0', color: '#1a1a1a', border: '2px dashed #ccc', fontWeight: 'bold', fontSize: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <Camera size={32} color="#666" />
              СДЕЛАТЬ ФОТО ДЛЯ {status === 'online' ? 'УХОДА' : 'ПРИХОДА'}
            </button>
            <input type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gap: '15px' }}>
        <button 
          onClick={() => handleClockAction('start')} 
          disabled={loading || status === 'online'} 
          style={{ padding: '20px', backgroundColor: '#2e7d32', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '18px', cursor: status === 'online' ? 'not-allowed' : 'pointer', borderRadius: '4px', opacity: status === 'online' ? 0.5 : 1 }}
        >
          {loading && status === 'offline' ? 'ОТПРАВКА...' : '▶ НАЧАТЬ СМЕНУ'}
        </button>

        <button 
          onClick={() => handleClockAction('end')} 
          disabled={loading || status === 'offline'} 
          style={{ padding: '20px', backgroundColor: '#e31e24', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '18px', cursor: status === 'offline' ? 'not-allowed' : 'pointer', borderRadius: '4px', opacity: status === 'offline' ? 0.5 : 1 }}
        >
          {loading && status === 'online' ? 'ОТПРАВКА...' : '■ ЗАВЕРШИТЬ СМЕНУ'}
        </button>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '10px', textAlign: 'left', color: '#1a1a1a' }}>Последние действия:</h4>
        {logs.map(log => (
          <div key={log.id} style={{ padding: '12px 0', borderBottom: '1px solid #eee', fontSize: '14px', textAlign: 'left', display: 'flex', gap: '15px', alignItems: 'center' }}>
            {log.photoUrl && <img src={log.photoUrl} style={{ width: '60px', height: '60px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #ccc' }} alt="Снимок" />}
            <div>
              <strong>{log.type === 'start' ? '✅ Приход' : '🛑 Уход'}</strong> 
              {log.projectName && log.projectName !== 'Завершение' && <span style={{ color: '#e31e24', fontWeight: 'bold' }}> ({log.projectName})</span>}
              <br/>{log.timestamp?.toDate().toLocaleString('ru-RU')}
              <div style={{ color: '#555', fontWeight: 'bold', marginTop: '2px' }}>👤 {log.workerName}</div>
              {/* Исправленная ссылка на Google Карты */}
              <a href={`https://www.google.com/maps?q=${log.location?.lat},${log.location?.lng}`} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff', textDecoration: 'none', fontSize: '12px', display: 'block', marginTop: '3px' }}>
                <MapPin size={12} /> Посмотреть на карте
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}