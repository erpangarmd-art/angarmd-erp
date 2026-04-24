import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, getDocs, deleteDoc, doc, where } from 'firebase/firestore';
import { db } from './firebase';
import { Activity, ShoppingCart, Truck, Users, Building, MapPin, DollarSign, ChevronRight, X, FileText, HardHat, Clock, Trash2 } from 'lucide-react';

export default function Reports({ user }) {
  const [projects, setProjects] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [transport, setTransport] = useState([]);
  const [pto, setPto] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Состояние для открытого детального отчета
  const [selectedProject, setSelectedProject] = useState(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const unsubProjects = onSnapshot(query(collection(db, 'projects')), snapshot => 
      setProjects(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsubAtt = onSnapshot(query(collection(db, 'attendance'), orderBy('timestamp', 'asc')), snapshot => 
      setAttendance(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsubTrans = onSnapshot(query(collection(db, 'transport_logs')), snapshot => 
      setTransport(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsubPto = onSnapshot(query(collection(db, 'pto_requests')), snapshot => 
      setPto(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsubWorkers = onSnapshot(query(collection(db, 'workers')), snapshot => 
      setWorkers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    setTimeout(() => setLoading(false), 800);
    return () => { unsubProjects(); unsubAtt(); unsubTrans(); unsubPto(); unsubWorkers(); };
  }, []);

  // ФУНКЦИЯ ЖЕСТКОГО УДАЛЕНИЯ ИСТОРИИ ОБЪЕКТА
  const handleDeleteProjectData = async (e, projectName) => {
    e.stopPropagation(); // Чтобы не открывалась карточка детализации
    
    if (!isAdmin) return alert('Удаление доступно только Директору.');
    
    const confirmMessage = `ВНИМАНИЕ!\n\nВы собираетесь ПОЛНОСТЬЮ удалить объект "${projectName}" и всю его финансовую историю (закупки, путевые листы, зарплаты).\n\nЭто действие необратимо. Сумма общих затрат компании уменьшится. Вы уверены?`;
    
    if (window.confirm(confirmMessage)) {
      setIsDeleting(true);
      try {
        // 1. Удаляем сам проект (если он еще существует в базе проектов)
        const projQ = query(collection(db, 'projects'), where('name', '==', projectName));
        const projSnap = await getDocs(projQ);
        const projDeletes = projSnap.docs.map(d => deleteDoc(doc(db, 'projects', d.id)));

        // 2. Удаляем все заявки ПТО
        const ptoQ = query(collection(db, 'pto_requests'), where('projectName', '==', projectName));
        const ptoSnap = await getDocs(ptoQ);
        const ptoDeletes = ptoSnap.docs.map(d => deleteDoc(doc(db, 'pto_requests', d.id)));

        // 3. Удаляем транспорт
        const transQ = query(collection(db, 'transport_logs'), where('routeEnd', '==', projectName));
        const transSnap = await getDocs(transQ);
        const transDeletes = transSnap.docs.map(d => deleteDoc(doc(db, 'transport_logs', d.id)));

        // 4. Удаляем учет времени (смены)
        const attQ = query(collection(db, 'attendance'), where('projectName', '==', projectName));
        const attSnap = await getDocs(attQ);
        const attDeletes = attSnap.docs.map(d => deleteDoc(doc(db, 'attendance', d.id)));

        await Promise.all([...projDeletes, ...ptoDeletes, ...transDeletes, ...attDeletes]);
        
        if (selectedProject?.name === projectName) setSelectedProject(null);
        alert(`Все данные по объекту "${projectName}" успешно удалены.`);
      } catch (error) {
        alert('Ошибка при удалении: ' + error.message);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const stats = useMemo(() => {
    const data = {};
    const workerMap = {};
    let totalFixedSalaries = 0; 

    workers.forEach(w => {
      workerMap[w.name] = { rate: Number(w.salaryRate) || 0, type: w.salaryType || 'hourly' };
      if (w.salaryType === 'fixed') totalFixedSalaries += (Number(w.salaryRate) || 0);
    });

    // 1. Инициализация объектов
    projects.forEach(p => {
      data[p.name] = { 
        matCost: 0, fuelCost: 0, hours: 0, laborCost: 0, liveWorkers: 0, address: p.address || '📍 Адрес не указан',
        lists: { pto: [], transport: [], live: [], payroll: {} } 
      };
    });
    
    // Специальная категория для общих трат
    const GENERAL_EXPENSES = 'Общие расходы (База/Офис)';
    data[GENERAL_EXPENSES] = { 
      matCost: 0, fuelCost: 0, hours: 0, laborCost: 0, liveWorkers: 0, address: 'Внепроектные расходы компании',
      lists: { pto: [], transport: [], live: [], payroll: {} } 
    };

    const initProjectIfNeeded = (pName) => {
      let name = pName || GENERAL_EXPENSES;
      if (name === 'Не указан') name = GENERAL_EXPENSES;
      
      if (!data[name]) {
        data[name] = { 
          matCost: 0, fuelCost: 0, hours: 0, laborCost: 0, liveWorkers: 0, address: '📍 Объект переименован или удален',
          lists: { pto: [], transport: [], live: [], payroll: {} } 
        };
      }
      return name;
    };

    // 2. Закупки (ПТО)
    pto.forEach(req => {
      if (req.status !== 'Отказ') {
        const pName = initProjectIfNeeded(req.projectName);
        const cost = Number(req.totalCost) || 0;
        data[pName].matCost += cost;
        data[pName].lists.pto.push(req);
      }
    });

    // 3. Транспорт
    transport.forEach(log => {
      const pName = initProjectIfNeeded(log.routeEnd);
      const cost = Number(log.cost) || 0;
      data[pName].fuelCost += cost;
      data[pName].lists.transport.push(log);
    });

    // 4. Учет рабочего времени
    const ongoing = {};
    attendance.forEach(log => {
      if (!log.timestamp) return;
      const pName = initProjectIfNeeded(log.projectName);

      if (log.type === 'start') {
        if (ongoing[log.workerName]) {
          const oldPName = initProjectIfNeeded(ongoing[log.workerName].projectName);
          if (data[oldPName].liveWorkers > 0) {
            data[oldPName].liveWorkers -= 1;
            data[oldPName].lists.live = data[oldPName].lists.live.filter(w => w.name !== log.workerName);
          }
        }
        ongoing[log.workerName] = log;
        data[pName].liveWorkers += 1;
        data[pName].lists.live.push({ name: log.workerName, time: log.timestamp });

      } else if (log.type === 'end') {
        const start = ongoing[log.workerName];
        if (start) {
          const startPName = initProjectIfNeeded(start.projectName);
          const durationMs = log.timestamp.toMillis() - start.timestamp.toMillis();
          const hours = durationMs / (1000 * 60 * 60);
          
          data[startPName].hours += hours;
          const wInfo = workerMap[log.workerName] || { rate: 0, type: 'hourly' };
          let earned = 0;
          
          if (wInfo.type === 'hourly') {
            earned = hours * wInfo.rate;
            data[startPName].laborCost += earned;
          }

          if (!data[startPName].lists.payroll[log.workerName]) {
            data[startPName].lists.payroll[log.workerName] = { hours: 0, earned: 0, type: wInfo.type };
          }
          data[startPName].lists.payroll[log.workerName].hours += hours;
          data[startPName].lists.payroll[log.workerName].earned += earned;

          if (data[startPName].liveWorkers > 0) {
            data[startPName].liveWorkers -= 1;
            data[startPName].lists.live = data[startPName].lists.live.filter(w => w.name !== log.workerName);
          }
          delete ongoing[log.workerName];
        }
      }
    });

    return { projectData: data, totalFixedSalaries };
  }, [projects, pto, transport, attendance, workers]);

  let totalMat = 0; let totalFuel = 0; let totalHourlyLabor = 0; let liveWorkersTotal = 0;
  Object.values(stats.projectData).forEach(s => {
    totalMat += s.matCost; totalFuel += s.fuelCost; totalHourlyLabor += s.laborCost; liveWorkersTotal += s.liveWorkers;
  });

  const companySpend = totalMat + totalFuel + totalHourlyLabor + stats.totalFixedSalaries;

  if (loading || isDeleting) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', fontWeight: 'bold', color: '#6366f1', fontSize: '18px' }}><Activity className="spin-animation" size={24} style={{marginRight: '10px'}} /> АНАЛИЗ ДАННЫХ...</div>;

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', paddingBottom: '100px' }}>
      <style>{`
        @keyframes pulse-green { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); } }
        .card-hover:hover { transform: translateY(-5px); box-shadow: 0 25px 30px -5px rgba(0,0,0,0.1) !important; border-color: #cbd5e1 !important; }
        .detail-row:hover { background-color: #f1f5f9; }
        .trash-btn:hover { background-color: #fecaca !important; color: #dc2626 !important; }
      `}</style>

      {/* ШАПКА */}
      <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', padding: '40px 24px', borderRadius: '0 0 32px 32px', marginBottom: '30px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: '800', margin: 0 }}>Панель управления</h1>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '12px', backdropFilter: 'blur(10px)', color: '#fff', fontSize: '14px', fontWeight: '600' }}>
              {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
            </div>
          </div>
          
          <div style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>Общие затраты компании</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <span style={{ fontSize: '56px', fontWeight: '900', color: '#fff', letterSpacing: '-2px' }}>{companySpend.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}</span>
            <span style={{ fontSize: '24px', color: '#ef4444', fontWeight: '800' }}>MDL</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 20px' }}>
        
        {/* KPI СЕТКА */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          {[
            { label: 'На объектах', val: liveWorkersTotal, icon: <Activity />, color: '#22c55e', bg: '#f0fdf4' },
            { label: 'Закупки', val: totalMat.toLocaleString('ru-RU', { maximumFractionDigits: 0 }), icon: <ShoppingCart />, color: '#f59e0b', bg: '#fffbeb' },
            { label: 'Транспорт', val: totalFuel.toLocaleString('ru-RU', { maximumFractionDigits: 0 }), icon: <Truck />, color: '#3b82f6', bg: '#eff6ff' },
            { label: 'ФОТ', val: (totalHourlyLabor + stats.totalFixedSalaries).toLocaleString('ru-RU', { maximumFractionDigits: 0 }), icon: <Users />, color: '#6366f1', bg: '#f5f3ff' }
          ].map((item, idx) => (
            <div key={idx} style={{ background: '#fff', padding: '20px', borderRadius: '20px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' }}>
              <div style={{ color: item.color, marginBottom: '12px' }}>{item.icon}</div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#1e293b' }}>{item.val}</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748b' }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* ОБЪЕКТЫ */}
        <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Building size={20} /> Финансовая аналитика по объектам
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {Object.entries(stats.projectData).map(([name, data]) => {
            const total = data.matCost + data.fuelCost + data.laborCost;
            if (total === 0 && data.liveWorkers === 0) return null;

            const isGeneral = name === 'Общие расходы (База/Офис)';

            return (
              <div 
                key={name} 
                className="card-hover" 
                onClick={() => setSelectedProject({ name, ...data, total })}
                style={{ background: '#fff', borderRadius: '24px', padding: '24px', boxShadow: '0 10px 20px rgba(0,0,0,0.03)', border: '2px solid #f1f5f9', position: 'relative', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                {/* БЛОК КНОПОК В ПРАВОМ ВЕРХНЕМ УГЛУ */}
                <div style={{ position: 'absolute', top: '24px', right: '24px', display: 'flex', gap: '8px', zIndex: 10 }}>
                  {data.liveWorkers > 0 && (
                    <div style={{ backgroundColor: '#22c55e', color: '#fff', padding: '6px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', animation: 'pulse-green 2s infinite' }}>
                      LIVE: {data.liveWorkers}
                    </div>
                  )}
                  {/* КНОПКА УДАЛЕНИЯ */}
                  {isAdmin && !isGeneral && (
                    <button 
                      onClick={(e) => handleDeleteProjectData(e, name)}
                      className="trash-btn"
                      style={{ backgroundColor: '#fef2f2', color: '#ef4444', border: 'none', padding: '6px 10px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
                      title="Удалить всю историю объекта"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '900', color: isGeneral ? '#475569' : '#1e293b', maxWidth: '65%', lineHeight: '1.2' }}>{name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px', fontWeight: '600', marginBottom: '24px' }}>
                  <MapPin size={14} color={isGeneral ? '#94a3b8' : '#e31e24'} /> {data.address}
                </div>

                <div style={{ background: isGeneral ? '#f1f5f9' : '#f8fafc', borderRadius: '20px', padding: '20px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Всего вложено</div>
                  <div style={{ fontSize: '32px', fontWeight: '900', color: '#1e293b' }}>
                    {total.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} <span style={{ fontSize: '16px', color: '#94a3b8' }}>MDL</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
                  <StatRow label="Материалы" val={data.matCost} total={total} color="#f59e0b" icon={<ShoppingCart size={14}/>} />
                  <StatRow label="Транспорт" val={data.fuelCost} total={total} color="#3b82f6" icon={<Truck size={14}/>} />
                  <StatRow label="Зарплата" val={data.laborCost} total={total} color="#10b981" icon={<Users size={14}/>} />
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#3b82f6', fontSize: '14px', fontWeight: '800', gap: '6px' }}>
                  Смотреть детализацию <ChevronRight size={18} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* МОДАЛЬНОЕ ОКНО ДЕТАЛИЗАЦИИ */}
      {selectedProject && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '24px', width: '100%', maxWidth: '800px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.3s ease-out', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            
            {/* Шапка модалки */}
            <div style={{ padding: '24px 30px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: '24px 24px 0 0' }}>
              <div>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '22px', fontWeight: '900', color: '#0f172a' }}>{selectedProject.name}</h2>
                <div style={{ fontSize: '14px', color: '#64748b', fontWeight: '600' }}>Всего: {selectedProject.total.toLocaleString('ru-RU')} MDL</div>
              </div>
              <button onClick={() => setSelectedProject(null)} style={{ background: '#e2e8f0', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer', color: '#475569' }}><X size={20}/></button>
            </div>

            {/* Контент модалки со скроллом */}
            <div style={{ padding: '30px', overflowY: 'auto', flex: 1 }}>
              
              {/* РАЗДЕЛ: ЗАКУПКИ */}
              {selectedProject.lists.pto.length > 0 && (
                <div style={{ marginBottom: '40px' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShoppingCart color="#f59e0b" /> История закупок
                  </h3>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
                    {selectedProject.lists.pto.map((item, i) => (
                      <div key={i} className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', borderBottom: i < selectedProject.lists.pto.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                        <div>
                          <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '15px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                             {item.items ? item.items.map(i => `${i.name} (${i.qty} ${i.unit})`).join(', ') : `${item.itemName} (${item.quantity} ${item.unit})`}
                          </div>
                          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{item.createdBy || 'Снабженец'} | {item.createdAt?.toDate().toLocaleDateString('ru-RU')}</div>
                        </div>
                        <div style={{ fontWeight: '900', color: '#1e293b', fontSize: '16px', flexShrink: 0, marginLeft: '10px' }}>{Number(item.totalCost).toLocaleString('ru-RU')} MDL</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* РАЗДЕЛ: ТРАНСПОРТ */}
              {selectedProject.lists.transport.length > 0 && (
                <div style={{ marginBottom: '40px' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Truck color="#3b82f6" /> Транспорт и Механизмы
                  </h3>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
                    {selectedProject.lists.transport.map((log, i) => (
                      <div key={i} className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', borderBottom: i < selectedProject.lists.transport.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                        <div>
                          <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '15px' }}>{log.workerName || log.driverName} ({log.car || log.vehicle})</div>
                          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Маршрут: {log.routeStart} ➔ {log.routeEnd}</div>
                        </div>
                        <div style={{ fontWeight: '900', color: '#1e293b', fontSize: '16px' }}>{Number(log.cost).toLocaleString('ru-RU')} MDL</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* РАЗДЕЛ: ЛЮДИ СЕЙЧАС */}
              {selectedProject.lists.live.length > 0 && (
                <div style={{ marginBottom: '40px' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity color="#22c55e" /> Сейчас на объекте ({selectedProject.liveWorkers} чел.)
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {selectedProject.lists.live.map((w, i) => (
                      <div key={i} style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '8px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', backgroundColor: '#10b981', borderRadius: '50%', animation: 'pulse-green 2s infinite' }}></div>
                        {w.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* РАЗДЕЛ: ФОТ (Зарплаты) */}
              {Object.keys(selectedProject.lists.payroll).length > 0 && (
                <div>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '800', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users color="#6366f1" /> Начисленная зарплата (ФОТ)
                  </h3>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
                    {Object.entries(selectedProject.lists.payroll).map(([workerName, info], i) => (
                      <div key={workerName} className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: i < Object.keys(selectedProject.lists.payroll).length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '40px', height: '40px', backgroundColor: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#475569' }}>
                            {workerName.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '15px' }}>{workerName}</div>
                            {info.type === 'hourly' ? (
                              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12}/> Отработано: {info.hours.toFixed(1)} ч.</div>
                            ) : (
                              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>Оклад (Фиксированный)</div>
                            )}
                          </div>
                        </div>
                        <div style={{ fontWeight: '900', color: '#10b981', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {info.type === 'hourly' ? `+${info.earned.toLocaleString('ru-RU')} MDL` : 'Ставка'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedProject.total === 0 && selectedProject.liveWorkers === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '15px', fontWeight: '600' }}>
                  По этому объекту еще нет проведенных затрат.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function StatRow({ label, val, total, color, icon }) {
  const percent = total > 0 ? (val / total) * 100 : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', fontWeight: '700' }}>
        <span style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>{icon} {label}</span>
        <span style={{ color: '#1e293b' }}>{val.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} MDL</span>
      </div>
      <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${percent}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 1s ease' }}></div>
      </div>
    </div>
  );
}