import React, { useState, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { CheckCircle2, Circle, LayoutList, Camera, Loader2, Image as ImageIcon, Trash2, ExternalLink } from 'lucide-react';

export default function ProjectChecklist({ project, user }) {
  const [uploadingTask, setUploadingTask] = useState(null);
  const fileInputRef = useRef(null);

  // Список этапов (мировой стандарт)
  const stages = [
    { id: 'prep', title: '1. Мобилизация', items: ['Разметка участка', 'Обустройство площадки', 'Приемка металла'] },
    { id: 'found', title: '2. Фундамент', items: ['Земляные работы', 'Армирование', 'Установка закладных', 'Бетонирование'] },
    { id: 'prod', title: '3. Производство', items: ['Настройка станка', 'Прокатка панелей', 'Формирование секций'] },
    { id: 'mount', title: '4. Монтаж оболочки', items: ['Подъем первой арки', 'Сшивка арок', 'Фиксация в фундаменте'] },
    { id: 'walls', title: '5. Торцы и проемы', items: ['Монтаж торцевых стенок', 'Монтаж ворот', 'Окна и двери'] },
    { id: 'finish', title: '6. Финал', items: ['Герметизация', 'Демобилизация', 'Подписание акта'] }
  ];

  const currentChecklist = project.checklist || {};

  // Клик по этапу
  const handleTaskClick = (taskName) => {
    // Если галочка уже стоит (есть фото) - можем предложить удалить
    if (currentChecklist[taskName]) {
      const confirmDelete = window.confirm(`Отменить выполнение этапа "${taskName}" и удалить фото?`);
      if (confirmDelete) {
        updateTaskStatus(taskName, null);
      }
      return;
    }

    // Если галочки нет, запускаем процесс фотофиксации
    setUploadingTask(taskName);
    fileInputRef.current.click();
  };

  // Обработка загрузки фото
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !uploadingTask) return;

    try {
      const storageRef = ref(storage, `checklists/${project.id}/${uploadingTask}_${Date.now()}.jpg`);
      await uploadBytes(storageRef, file);
      const photoUrl = await getDownloadURL(storageRef);

      await updateTaskStatus(uploadingTask, photoUrl);
    } catch (error) {
      alert("Ошибка при загрузке фото: " + error.message);
    } finally {
      setUploadingTask(null);
      e.target.value = null; // Очищаем инпут
    }
  };

  // Пересчет процентов и запись в базу
  const updateTaskStatus = async (taskName, photoUrl) => {
    const newChecklist = { ...currentChecklist };
    
    if (photoUrl) {
      newChecklist[taskName] = photoUrl;
    } else {
      delete newChecklist[taskName]; 
    }

    const allTasks = stages.flatMap(s => s.items);
    const completedTasks = allTasks.filter(t => newChecklist[t]);
    const progress = Math.round((completedTasks.length / allTasks.length) * 100);

    try {
      const projectRef = doc(db, 'projects', project.id);
      await updateDoc(projectRef, {
        checklist: newChecklist,
        progress: progress
      });
    } catch (e) {
      console.error("Ошибка обновления базы:", e);
    }
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#111827', padding: '10px', borderRadius: '12px', display: 'flex' }}>
          <LayoutList size={22} color="#fff" />
        </div>
        <div>
          <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#111827' }}>Технологический чек-лист</h4>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>Обязательная фотофиксация каждого этапа</div>
        </div>
      </div>

      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        ref={fileInputRef} 
        onChange={handlePhotoUpload} 
        style={{ display: 'none' }} 
      />

      <div style={{ display: 'grid', gap: '24px' }}>
        {stages.map(stage => {
          // Проверяем, завершен ли весь этап целиком
          const isStageComplete = stage.items.every(t => currentChecklist[t]);
          
          return (
            <div key={stage.id} style={{ opacity: isStageComplete ? 0.7 : 1, transition: 'opacity 0.3s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: '900', color: isStageComplete ? '#059669' : '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {stage.title}
                </div>
                {isStageComplete && <div style={{ height: '2px', flex: 1, backgroundColor: '#dcfce7', borderRadius: '2px' }}></div>}
              </div>

              <div style={{ display: 'grid', gap: '10px' }}>
                {stage.items.map(task => {
                  const isCompleted = !!currentChecklist[task];
                  const isUploading = uploadingTask === task;

                  return (
                    <div 
                      key={task} 
                      style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#fff', borderRadius: '12px', border: isCompleted ? '2px solid #10b981' : '1px solid #e2e8f0', overflow: 'hidden', transition: 'all 0.2s', boxShadow: isCompleted ? '0 4px 10px rgba(16, 185, 129, 0.1)' : '0 2px 4px rgba(0,0,0,0.02)' }}
                    >
                      <div 
                        onClick={() => handleTaskClick(task)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', cursor: 'pointer' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {isUploading ? (
                            <Loader2 size={22} color="#3b82f6" className="spin-animation" /> 
                          ) : isCompleted ? (
                            <CheckCircle2 size={22} color="#10b981" />
                          ) : (
                            <Circle size={22} color="#cbd5e1" />
                          )}
                          
                          <span style={{ fontSize: '15px', color: isCompleted ? '#065f46' : '#1e293b', fontWeight: isCompleted ? '800' : '600' }}>
                            {task}
                          </span>
                        </div>

                        {!isCompleted && !isUploading && (
                          <div style={{ backgroundColor: '#f1f5f9', padding: '8px', borderRadius: '8px', display: 'flex', color: '#64748b' }}>
                            <Camera size={18} />
                          </div>
                        )}
                        {isCompleted && (
                          <div style={{ color: '#ef4444', padding: '8px', display: 'flex', cursor: 'pointer' }} title="Отменить выполнение">
                            <Trash2 size={16} />
                          </div>
                        )}
                      </div>

                      {/* Если есть фото — показываем его */}
                      {isCompleted && (
                        <div style={{ padding: '12px 16px', backgroundColor: '#ecfdf5', borderTop: '1px solid #d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#047857', fontWeight: '700', fontSize: '13px' }}>
                            <ImageIcon size={16} />
                            <span>Фото-подтверждение загружено</span>
                          </div>
                          <a href={currentChecklist[task]} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#10b981', fontWeight: '800', textDecoration: 'none', backgroundColor: '#fff', padding: '4px 10px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                            Смотреть <ExternalLink size={14} />
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}