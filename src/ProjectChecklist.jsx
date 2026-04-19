import React, { useState, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { CheckCircle2, Circle, LayoutList, Camera, Loader2, Image as ImageIcon } from 'lucide-react';

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
      // Загружаем в папку checklists / id_проекта
      const storageRef = ref(storage, `checklists/${project.id}/${uploadingTask}_${Date.now()}.jpg`);
      await uploadBytes(storageRef, file);
      const photoUrl = await getDownloadURL(storageRef);

      // Обновляем статус задачи в базе (сохраняем ссылку на фото)
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
      newChecklist[taskName] = photoUrl; // Сохраняем ссылку на фото
    } else {
      delete newChecklist[taskName]; // Удаляем, если сняли галочку
    }

    const allTasks = stages.flatMap(s => s.items);
    // Считаем только те этапы, где есть фото (значение - строка URL)
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
    <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
        <LayoutList size={20} color="#1a1a1a" />
        <h4 style={{ margin: 0 }}>Технологический чек-лист с фотоотчетом</h4>
      </div>

      {/* Скрытый инпут для включения камеры телефона */}
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        ref={fileInputRef} 
        onChange={handlePhotoUpload} 
        style={{ display: 'none' }} 
      />

      {stages.map(stage => (
        <div key={stage.id} style={{ marginBottom: '15px' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#666', marginBottom: '8px', textTransform: 'uppercase' }}>
            {stage.title}
          </div>
          <div style={{ display: 'grid', gap: '8px' }}>
            {stage.items.map(task => {
              const isCompleted = !!currentChecklist[task];
              const isUploading = uploadingTask === task;

              return (
                <div 
                  key={task} 
                  style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#fff', borderRadius: '6px', border: isCompleted ? '1px solid #2e7d32' : '1px solid #eee', overflow: 'hidden' }}
                >
                  {/* Основная строка с галочкой */}
                  <div 
                    onClick={() => handleTaskClick(task)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {isUploading ? (
                        <Loader2 size={18} color="#007bff" className="spin-animation" /> // Требуется CSS анимация для вращения, но иконка будет видна
                      ) : isCompleted ? (
                        <CheckCircle2 size={18} color="#2e7d32" />
                      ) : (
                        <Circle size={18} color="#ccc" />
                      )}
                      
                      <span style={{ fontSize: '14px', color: isCompleted ? '#2e7d32' : '#333', fontWeight: isCompleted ? 'bold' : 'normal' }}>
                        {task}
                      </span>
                    </div>

                    {/* Иконка камеры, если еще не сделано */}
                    {!isCompleted && !isUploading && (
                      <Camera size={16} color="#888" />
                    )}
                  </div>

                  {/* Если есть фото — показываем его */}
                  {isCompleted && (
                    <div style={{ padding: '10px', backgroundColor: '#f0fdf4', borderTop: '1px solid #c8e6c9', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <ImageIcon size={16} color="#2e7d32" />
                      <a href={currentChecklist[task]} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#2e7d32', textDecoration: 'underline' }}>
                        Смотреть фотоотчет этапа
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}