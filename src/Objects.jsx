import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { MapPin, Plus, HardHat, Building, ChevronDown, ChevronUp } from 'lucide-react'; // Добавили иконки стрелочек
import ProjectChecklist from './ProjectChecklist'; 

export default function Objects({ user }) {
  const [projects, setProjects] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Состояние для хранения открытых карточек (какие чек-листы развернуты)
  const [expandedProjects, setExpandedProjects] = useState({});

  // Поля для нового объекта
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectAddress, setNewProjectAddress] = useState('');
  const [newProjectManager, setNewProjectManager] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!newProjectName) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'projects'), {
        name: newProjectName,
        address: newProjectAddress,
        manager: newProjectManager,
        status: 'Активен',
        progress: 0, 
        checklist: {}, 
        createdAt: serverTimestamp(),
        createdBy: user.name
      });
      
      setNewProjectName('');
      setNewProjectAddress('');
      setNewProjectManager('');
      setIsModalOpen(false);
    } catch (error) {
      alert("Ошибка при создании объекта: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Функция для открытия/закрытия конкретного чек-листа
  const toggleProject = (projectId) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#1a1a1a', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Building size={28} color="#e31e24" /> Объекты в работе
        </h2>
        
        {user.role === 'admin' && (
          <button 
            onClick={() => setIsModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px', backgroundColor: '#e31e24', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            <Plus size={18} /> Новый объект
          </button>
        )}
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', width: '100%', maxWidth: '400px', position: 'relative' }}>
            <h3 style={{ margin: '0 0 20px 0' }}>🏗️ Добавить новую стройку</h3>
            <form onSubmit={handleAddProject} style={{ display: 'grid', gap: '15px' }}>
              
              <div>
                <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Название объекта</label>
                <input type="text" value={newProjectName} onChange={(e)=>setNewProjectName(e.target.value)} required style={{ width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box', marginTop: '5px' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Адрес (Опционально)</label>
                <input type="text" value={newProjectAddress} onChange={(e)=>setNewProjectAddress(e.target.value)} placeholder="ул. Лесная 12" style={{ width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box', marginTop: '5px' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Ответственный прораб</label>
                <input type="text" value={newProjectManager} onChange={(e)=>setNewProjectManager(e.target.value)} placeholder="Ион" style={{ width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box', marginTop: '5px' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '12px', backgroundColor: '#eee', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Отмена</button>
                <button type="submit" disabled={loading} style={{ flex: 1, padding: '12px', backgroundColor: '#e31e24', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>{loading ? 'Создаем...' : 'Создать'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* СПИСОК ОБЪЕКТОВ */}
      <div style={{ display: 'grid', gap: '20px' }}>
        {projects.map(project => {
          const progress = project.progress || 0;
          const isExpanded = expandedProjects[project.id]; // Проверяем, открыта ли карточка
          
          return (
            <div key={project.id} style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderTop: '4px solid #1a1a1a', transition: 'all 0.3s ease' }}>
              
              {/* ШАПКА КАРТОЧКИ (Сделали кликабельной) */}
              <div 
                onClick={() => toggleProject(project.id)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px', cursor: 'pointer', userSelect: 'none' }}
              >
                <div>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '20px', color: '#1a1a1a' }}>{project.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: '#666', fontSize: '14px' }}>
                    {project.address && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14}/> {project.address}</span>}
                    {project.manager && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><HardHat size={14}/> Прораб: {project.manager}</span>}
                  </div>
                </div>
                
                {/* Бейдж статуса + Стрелочка */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ backgroundColor: progress === 100 ? '#e8f5e9' : '#e3f2fd', color: progress === 100 ? '#2e7d32' : '#1565c0', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold' }}>
                    {progress === 100 ? 'Завершен' : 'В работе'}
                  </div>
                  <div style={{ backgroundColor: '#f4f6f8', borderRadius: '50%', padding: '5px', display: 'flex' }}>
                    {isExpanded ? <ChevronUp size={20} color="#666" /> : <ChevronDown size={20} color="#666" />}
                  </div>
                </div>
              </div>

              {/* ПРОГРЕСС-БАР (Виден всегда, чтобы легко оценивать общую картину) */}
              <div style={{ marginBottom: isExpanded ? '20px' : '0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 'bold', color: '#1a1a1a', marginBottom: '5px' }}>
                  <span>Готовность ангара:</span>
                  <span>{progress}%</span>
                </div>
                <div style={{ width: '100%', height: '10px', backgroundColor: '#eee', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', backgroundColor: progress === 100 ? '#2e7d32' : '#e31e24', transition: 'width 0.5s ease-in-out' }}></div>
                </div>
              </div>

              {/* СКРЫВАЕМЫЙ ЧЕК-ЛИСТ */}
              {isExpanded && (
                <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px', animation: 'fadeIn 0.3s' }}>
                  {['admin', 'foreman'].includes(user.role) ? (
                    <ProjectChecklist project={project} user={user} />
                  ) : (
                    <p style={{ fontSize: '13px', color: '#888', fontStyle: 'italic', textAlign: 'center' }}>
                      Просмотр и редактирование этапов доступно только руководству и прорабам.
                    </p>
                  )}
                </div>
              )}
              
            </div>
          );
        })}

        {projects.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#888', backgroundColor: '#fff', borderRadius: '8px', border: '1px dashed #ccc' }}>
            У вас пока нет активных объектов. Нажмите "Новый объект", чтобы начать.
          </div>
        )}
      </div>
    </div>
  );
}