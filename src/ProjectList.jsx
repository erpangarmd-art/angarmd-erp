import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Trash2, Edit2, Check, X } from 'lucide-react';

export default function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Состояния для режима редактирования названия
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'projects'), (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Сохранение нового имени объекта
  const handleSaveEdit = async (id) => {
    if (!editName.trim()) {
      alert("Название не может быть пустым!");
      return;
    }
    try {
      await updateDoc(doc(db, 'projects', id), {
        name: editName.trim()
      });
      setEditingId(null); // Закрываем режим редактирования
    } catch (error) {
      alert("Ошибка при переименовании: " + error.message);
    }
  };

  // Отмена редактирования
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  // Изменение процента готовности
  const handleProgressChange = async (projectId, newValue) => {
    try {
      await updateDoc(doc(db, 'projects', projectId), {
        progress: Number(newValue)
      });
    } catch (error) {
      console.error("Ошибка обновления прогресса:", error);
    }
  };

  // Удаление объекта
  const handleDelete = async (id, name) => {
    if (window.confirm(`Точно удалить объект "${name}"? Это действие необратимо.`)) {
      try {
        await deleteDoc(doc(db, 'projects', id));
      } catch (error) {
        alert("Ошибка при удалении");
      }
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>Загрузка объектов...</div>;

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#1a1a1a', margin: '0 0 10px 0' }}>🏗️ Активные объекты</h2>
      
      {projects.length === 0 ? (
        <p style={{ color: '#666' }}>Нет добавленных объектов.</p>
      ) : (
        projects.map(project => (
          <div key={project.id} style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', position: 'relative' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, marginRight: '15px' }}>
                
                {/* РЕЖИМ РЕДАКТИРОВАНИЯ ИЛИ ОБЫЧНЫЙ ТЕКСТ */}
                {editingId === project.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                    <input 
                      type="text" 
                      value={editName} 
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                      style={{ flex: 1, padding: '8px', border: '2px solid #007bff', borderRadius: '4px', fontSize: '16px' }}
                    />
                    <button onClick={() => handleSaveEdit(project.id)} style={{ background: '#2e7d32', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', display: 'flex' }}>
                      <Check size={18} />
                    </button>
                    <button onClick={handleCancelEdit} style={{ background: '#e31e24', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', display: 'flex' }}>
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {project.name}
                    <button 
                      onClick={() => { setEditingId(project.id); setEditName(project.name); }} 
                      style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', padding: '0', display: 'flex' }}
                      title="Переименовать"
                    >
                      <Edit2 size={16} />
                    </button>
                  </h3>
                )}

                <p style={{ margin: '0', fontSize: '13px', color: '#666', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  📍 {project.address}
                </p>
              </div>
              
              <button onClick={() => handleDelete(project.id, project.name)} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer' }} title="Удалить">
                <Trash2 size={20} />
              </button>
            </div>

            {/* ШКАЛА ПРОГРЕССА */}
            <div style={{ marginTop: '20px', backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', textTransform: 'uppercase' }}>Готовность объекта</span>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: project.progress === 100 ? '#2e7d32' : '#e31e24' }}>
                  {project.progress || 0}%
                </span>
              </div>
              
              {/* Визуальная полоска */}
              <div style={{ width: '100%', height: '8px', backgroundColor: '#e0e0e0', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                <div style={{ 
                  width: `${project.progress || 0}%`, 
                  height: '100%', 
                  backgroundColor: project.progress === 100 ? '#2e7d32' : '#e31e24',
                  transition: 'width 0.3s ease'
                }}></div>
              </div>

              {/* Ползунок для управления */}
              <input 
                type="range" 
                min="0" max="100" step="5"
                value={project.progress || 0}
                onChange={(e) => handleProgressChange(project.id, e.target.value)}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

          </div>
        ))
      )}
    </div>
  );
}