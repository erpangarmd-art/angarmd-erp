import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { MapPin, HardHat, Edit2, Trash2, Archive, AlertTriangle, Phone, MessageCircle, MessageSquare, Send, ListChecks, Truck } from 'lucide-react';
import ProjectChecklist from './ProjectChecklist';

const defaultImages = [
  "https://images.unsplash.com/photo-1587293852726-692b55405e8c?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?q=80&w=800&auto=format&fit=crop"
];

const getStageBadge = (progress) => {
  if (progress === 100) return { label: 'Сдан', bg: '#dcfce7', color: '#059669' };
  if (progress >= 70) return { label: 'Обшивка', bg: '#dcfce7', color: '#059669' };
  if (progress >= 30) return { label: 'Монтаж каркаса', bg: '#fee2e2', color: '#dc2626' };
  return { label: 'Фундамент', bg: '#ffedd5', color: '#d97706' };
};

export default function ProjectCard({ 
  project, index, user, isExpanded, onToggleExpand, 
  onEdit, onToggleArchive, onDelete 
}) {
  const progress = project.progress || 0;
  const isArchived = project.status === 'Архив';
  const imgUrl = project.imageUrl || defaultImages[index % defaultImages.length];

  const [liveWorkers, setLiveWorkers] = useState(0);
  const [todayMachines, setTodayMachines] = useState(0);

  useEffect(() => {
    if (!project.name || isArchived) return;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const qAtt = query(collection(db, 'attendance'), where('projectName', '==', project.name));
    const unsubAtt = onSnapshot(qAtt, (snapshot) => {
      const workersSet = new Set();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.timestamp && data.timestamp.toDate() >= startOfToday && data.type === 'start') {
          workersSet.add(data.workerName);
        }
      });
      setLiveWorkers(workersSet.size);
    });

    const qTrans = query(collection(db, 'transport_logs'), where('routeEnd', '==', project.name));
    const unsubTrans = onSnapshot(qTrans, (snapshot) => {
      let machineCount = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.timestamp && data.timestamp.toDate() >= startOfToday) {
          machineCount++;
        }
      });
      setTodayMachines(machineCount);
    });

    return () => { unsubAtt(); unsubTrans(); };
  }, [project.name, isArchived]);

  let isLagging = false;
  if (project.createdAt && project.deadline && progress < 100) {
    const start = project.createdAt.toDate().getTime();
    const end = new Date(project.deadline).getTime();
    const now = new Date().getTime();
    if (now > start && end > start) {
      const timePassedPercent = ((now - start) / (end - start)) * 100;
      if (timePassedPercent - progress > 20) isLagging = true;
    }
  }

  let isOverdue = false;
  let deadlineText = 'Дата не указана';
  let deadlineBg = '#f3f4f6', deadlineColor = '#374151';
  
  if (project.deadline) {
    const deadlineDate = new Date(project.deadline);
    deadlineDate.setHours(23, 59, 59, 999);
    const now = new Date();
    
    if (progress === 100) {
      deadlineText = `Сдано: ${new Date(project.deadline).toLocaleDateString('ru-RU')}`;
      deadlineBg = '#dcfce7'; deadlineColor = '#059669';
    } else if (now > deadlineDate) {
      isOverdue = true;
      const overdueDays = Math.floor((now - deadlineDate) / (1000 * 60 * 60 * 24));
      deadlineText = `Просрочено на ${overdueDays} дн.`;
      deadlineBg = '#e31e24'; deadlineColor = '#fff';
    } else {
      const leftDays = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
      deadlineText = `Сдача: ${deadlineDate.toLocaleDateString('ru-RU')} (Осталось ${leftDays} дн.)`;
      deadlineBg = leftDays < 15 ? '#e31e24' : '#111827'; 
      deadlineColor = '#fff';
    }
  }

  const stage = getStageBadge(progress);
  const progressColor = progress > 70 ? '#059669' : (progress > 30 ? '#e31e24' : '#d97706');

  // ФОРМАТИРОВАНИЕ ТЕЛЕФОНА
  let cleanPhone = (project.managerPhone || '').replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) cleanPhone = '373' + cleanPhone.slice(1);
  const hasPhone = cleanPhone.length >= 8;

  const bigBtnStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '40px', height: '40px', borderRadius: '50%', textDecoration: 'none',
    boxShadow: '0 2px 5px rgba(0,0,0,0.05)', transition: 'transform 0.2s',
  };

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.06)', opacity: isArchived ? 0.7 : 1, border: isLagging && !isArchived ? '2px solid #fca5a5' : '1px solid #f1f5f9' }}>
      
      {/* СТИЛИ ДЛЯ АДАПТИВНОСТИ КАРТИНКИ */}
      <style>{`
        .project-layout { display: flex; flex-direction: column; gap: 20px; }
        .project-image-box { 
          width: 100%; 
          height: 220px; 
          border-radius: 16px; 
          overflow: hidden; 
          flex-shrink: 0; 
          border: 1px solid #e2e8f0;
          background-color: #f8fafc;
          position: relative;
        }
        .project-image-box img { 
          width: 100%; 
          height: 100%; 
          object-fit: cover; 
          display: block; 
          transition: transform 0.4s ease; 
        }
        .project-image-box:hover img { transform: scale(1.05); }
        
        /* На компьютерах и планшетах картинка слева, текст справа */
        @media (min-width: 800px) {
          .project-layout { flex-direction: row; }
          .project-image-box { width: 320px; height: auto; min-height: 260px; }
        }
      `}</style>

      {isLagging && !isArchived && !isOverdue && (
        <div style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '8px 16px', borderRadius: '12px 12px 0 0', margin: '-20px -20px 20px -20px', fontSize: '13px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #fecaca' }}>
          <AlertTriangle size={16} /> ВНИМАНИЕ: Объект отстает от графика строительства!
        </div>
      )}

      {/* НОВАЯ АДАПТИВНАЯ СТРУКТУРА */}
      <div className="project-layout">
        
        {/* КАРТИНКА С РАМКАМИ */}
        <div className="project-image-box">
          <img src={imgUrl} alt={project.name} />
          <div style={{ position: 'absolute', top: '12px', right: '12px', backgroundColor: stage.bg, color: stage.color, padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '900', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            {stage.label}
          </div>
        </div>

        {/* ТЕКСТОВАЯ ЧАСТЬ */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#111827', lineHeight: '1.2' }}>{project.name}</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4b5563', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>
            <MapPin size={16} /> {project.address || 'Адрес не указан'}
          </div>
            
          {/* БЛОК ПРОРАБА И КНОПОК */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#f8fafc', padding: '6px 16px 6px 6px', borderRadius: '30px', border: '1px solid #e2e8f0', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#111827', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>
              {project.manager ? project.manager.charAt(0).toUpperCase() : 'И'}
            </div>
            <span style={{ fontSize: '15px', fontWeight: '800', color: '#111827' }}>{project.manager || 'Прораб'}</span>
            
            {hasPhone ? (
              <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
                <a href={`tel:+${cleanPhone}`} style={{ ...bigBtnStyle, color: '#2563eb', backgroundColor: '#eff6ff' }} title="Позвонить"><Phone size={18} /></a>
                <a href={`sms:+${cleanPhone}`} style={{ ...bigBtnStyle, color: '#475569', backgroundColor: '#f1f5f9' }} title="Написать SMS"><MessageSquare size={18} /></a>
                <a href={`viber://chat?number=%2B${cleanPhone}`} style={{ ...bigBtnStyle, color: '#7c3aed', backgroundColor: '#f3e8ff' }} title="Написать в Viber"><MessageCircle size={18} /></a>
                <a href={`https://t.me/+${cleanPhone}`} target="_blank" rel="noopener noreferrer" style={{ ...bigBtnStyle, color: '#0ea5e9', backgroundColor: '#e0f2fe' }} title="Написать в Telegram"><Send size={18} /></a>
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#94a3b8', marginLeft: 'auto', fontWeight: '600' }}>Телефон не указан</div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#111827', fontSize: '14px', fontWeight: '800', backgroundColor: '#ecfdf5', padding: '8px 12px', borderRadius: '10px' }}>
              <HardHat size={18} color={liveWorkers > 0 ? "#059669" : "#d97706"} /> {liveWorkers} рабочих (сегодня)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#111827', fontSize: '14px', fontWeight: '800', backgroundColor: '#eff6ff', padding: '8px 12px', borderRadius: '10px' }}>
              <Truck size={18} color={todayMachines > 0 ? "#2563eb" : "#d97706"} /> {todayMachines} рейсов (сегодня)
            </div>
          </div>

          <div style={{ marginTop: 'auto', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
              <span style={{ fontSize: '15px', fontWeight: '800', color: '#475569' }}>Готовность объекта:</span>
              <span style={{ fontSize: '24px', fontWeight: '900', color: progressColor }}>{progress}%</span>
            </div>
            <div style={{ width: '100%', height: '12px', backgroundColor: '#f3f4f6', borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', backgroundColor: progressColor, transition: 'width 0.5s ease-out' }}></div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ backgroundColor: deadlineBg, color: deadlineColor, padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '800' }}>
              {deadlineText}
            </div>

            {user.role === 'admin' && (
              <div className="action-buttons-container" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flex: 1 }}>
                <button onClick={(e) => onEdit(e, project)} className="action-btn"><Edit2 size={14} /> Edit</button>
                <button onClick={() => onToggleExpand(project.id)} className="action-btn" style={{ backgroundColor: isExpanded ? '#111827' : '#f3f4f6', color: isExpanded ? '#fff' : '#374151' }}><ListChecks size={14} /> Чек-лист</button>
                <button onClick={(e) => onToggleArchive(e, project)} className="action-btn"><Archive size={14} /> Архив</button>
                <button onClick={(e) => onDelete(e, project.id, project.name)} className="action-btn" style={{ color: '#dc2626', backgroundColor: '#fef2f2' }}><Trash2 size={14} /> Delete</button>
              </div>
            )}
          </div>

        </div>
      </div>

      {isExpanded && (
        <div style={{ marginTop: '24px', borderTop: '2px solid #f3f4f6', paddingTop: '24px', animation: 'fadeIn 0.3s' }}>
          {['admin', 'foreman', 'pto'].includes(user.role) ? (
            <ProjectChecklist project={project} user={user} />
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f9fafb', borderRadius: '12px', color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>
              🔒 Просмотр этапов доступен только руководству.
            </div>
          )}
        </div>
      )}
    </div>
  );
}