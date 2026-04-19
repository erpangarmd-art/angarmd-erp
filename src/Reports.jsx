import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { TrendingUp, Users, Truck, ShoppingCart, Clock, MapPin, Building } from 'lucide-react';

export default function Reports() {
  const [projects, setProjects] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [transport, setTransport] = useState([]);
  const [pto, setPto] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Подтягиваем 5 коллекций
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
    // Подтягиваем базу персонала со ставками
    const unsubWorkers = onSnapshot(query(collection(db, 'workers')), snapshot => 
      setWorkers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    setTimeout(() => setLoading(false), 800);

    return () => { unsubProjects(); unsubAtt(); unsubTrans(); unsubPto(); unsubWorkers(); };
  }, []);

  // --- ЯДРО АНАЛИТИКИ С УЧЕТОМ ИНДИВИДУАЛЬНЫХ СТАВОК ---
  const stats = useMemo(() => {
    const data = {};
    
    // 1. Создаем быстрый справочник работников { "Иван": { rate: 150, type: "hourly" } }
    const workerMap = {};
    let totalFixedSalaries = 0; // Считаем общую сумму окладов

    workers.forEach(w => {
      workerMap[w.name] = { 
        rate: Number(w.salaryRate) || 0, 
        type: w.salaryType || 'hourly' 
      };
      if (w.salaryType === 'fixed') {
        totalFixedSalaries += (Number(w.salaryRate) || 0);
      }
    });

    // Инициализируем объекты
    projects.forEach(p => {
      data[p.name] = { matCost: 0, fuelCost: 0, hours: 0, laborCost: 0, liveWorkers: 0 };
    });
    data['Не указан'] = { matCost: 0, fuelCost: 0, hours: 0, laborCost: 0, liveWorkers: 0 };

    // 2. Считаем материалы (Только те, где нет отказа)
    pto.forEach(req => {
      if (req.status !== 'Отказ') {
        const pName = req.projectName || 'Не указан';
        if (!data[pName]) data[pName] = { matCost: 0, fuelCost: 0, hours: 0, laborCost: 0, liveWorkers: 0 };
        data[pName].matCost += (req.totalCost || 0);
      }
    });

    // 3. Считаем топливо
    transport.forEach(log => {
      const pName = log.routeEnd || 'Не указан';
      if (!data[pName]) data[pName] = { matCost: 0, fuelCost: 0, hours: 0, laborCost: 0, liveWorkers: 0 };
      data[pName].fuelCost += (log.cost || 0);
    });

    // 4. Считаем часы работы, живых людей И ТОЧНУЮ ЗАРПЛАТУ
    const ongoing = {};
    attendance.forEach(log => {
      if (!log.timestamp) return;
      
      if (log.type === 'start') {
        ongoing[log.workerName] = log;
        const pName = log.projectName || 'Не указан';
        if (data[pName]) data[pName].liveWorkers += 1;
      } 
      else if (log.type === 'end') {
        const start = ongoing[log.workerName];
        if (start) {
          const durationMs = log.timestamp.toMillis() - start.timestamp.toMillis();
          const hours = durationMs / (1000 * 60 * 60);
          const pName = start.projectName || 'Не указан';
          
          if (!data[pName]) data[pName] = { matCost: 0, fuelCost: 0, hours: 0, laborCost: 0, liveWorkers: 0 };
          data[pName].hours += hours;
          
          // Достаем ставку конкретного рабочего
          const wInfo = workerMap[log.workerName] || { rate: 0, type: 'hourly' };
          if (wInfo.type === 'hourly') {
            data[pName].laborCost += (hours * wInfo.rate); // Умножаем его часы на его ставку
          }

          if (data[pName].liveWorkers > 0) data[pName].liveWorkers -= 1;
          delete ongoing[log.workerName];
        }
      }
    });

    return { projectData: data, totalFixedSalaries };
  }, [projects, pto, transport, attendance, workers]);

  // Глобальные суммы компании
  let totalMat = 0; let totalFuel = 0; let totalHours = 0; let totalHourlyLaborCost = 0;
  
  Object.values(stats.projectData).forEach(s => {
    totalMat += s.matCost; 
    totalFuel += s.fuelCost; 
    totalHours += s.hours; 
    totalHourlyLaborCost += s.laborCost;
  });

  // Итоговый расход = Материалы + ГСМ + Почасовая ЗП рабочим + Оклады руководству
  const companyTotalSpend = totalMat + totalFuel + totalHourlyLaborCost + stats.totalFixedSalaries;

  if (loading) return <div style={{ textAlign: 'center', padding: '50px', fontSize: '18px', color: '#666' }}>Анализируем экономику объектов...</div>;

  return (
    <div style={{ display: 'grid', gap: '25px' }}>
      
      <div style={{ borderBottom: '2px solid #ccc', paddingBottom: '15px' }}>
        <h2 style={{ fontSize: '24px', margin: '0 0 5px 0', color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <TrendingUp size={28} color="#e31e24" /> Финансовая сводка
        </h2>
        <span style={{ color: '#666', fontSize: '14px' }}>Сквозной учет затрат с учетом индивидуальных ставок</span>
      </div>

      {/* --- ГЛОБАЛЬНЫЕ МЕТРИКИ КОМПАНИИ --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        
        <div style={{ backgroundColor: '#1a1a1a', color: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
          <div style={{ fontSize: '13px', color: '#aaa', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '1px' }}>Всего расходов (MDL)</div>
          <div style={{ fontSize: '28px', fontWeight: '900', color: '#ff4d4d' }}>
            {companyTotalSpend.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
          </div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '5px' }}>Мат. + ГСМ + ФОТ (Часы + Оклады)</div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #ff9800', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#666', marginBottom: '5px' }}>
            <ShoppingCart size={16} /> Снабжение
          </div>
          <div style={{ fontSize: '22px', fontWeight: 'bold' }}>{totalMat.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}</div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #007bff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#666', marginBottom: '5px' }}>
            <Truck size={16} /> Транспорт (ГСМ)
          </div>
          <div style={{ fontSize: '22px', fontWeight: 'bold' }}>{totalFuel.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}</div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '15px 20px', borderRadius: '8px', borderLeft: '4px solid #2e7d32', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#666', marginBottom: '5px' }}>
            <Users size={16} /> Фонд Оплаты Труда
          </div>
          <div style={{ fontSize: '22px', fontWeight: 'bold' }}>
            {(totalHourlyLaborCost + stats.totalFixedSalaries).toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
          </div>
          <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: '#888', marginTop: '4px' }}>
            <span title="Почасовая рабочим">⏱ {totalHourlyLaborCost.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}</span>
            <span title="Оклады руководству">💼 {stats.totalFixedSalaries.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}</span>
          </div>
        </div>

      </div>

      {/* --- СВОДКА ПО ОБЪЕКТАМ --- */}
      <h3 style={{ marginTop: '15px', marginBottom: '5px', color: '#1a1a1a', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Building size={20} color="#1a1a1a" /> Себестоимость объектов
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {Object.entries(stats.projectData).map(([projectName, data]) => {
          if (data.matCost === 0 && data.fuelCost === 0 && data.hours === 0 && data.liveWorkers === 0) return null;
          
          const totalObj = data.matCost + data.fuelCost + data.laborCost;

          const matPercent = totalObj > 0 ? (data.matCost / totalObj) * 100 : 0;
          const fuelPercent = totalObj > 0 ? (data.fuelCost / totalObj) * 100 : 0;
          const laborPercent = totalObj > 0 ? (data.laborCost / totalObj) * 100 : 0;

          return (
            <div key={projectName} style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', position: 'relative', overflow: 'hidden' }}>
              
              {data.liveWorkers > 0 && (
                <div style={{ position: 'absolute', top: 0, right: 0, backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '4px 12px', borderBottomLeftRadius: '8px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', backgroundColor: '#2e7d32', borderRadius: '50%', display: 'inline-block', animation: 'pulse 2s infinite' }}></span>
                  {data.liveWorkers} на смене
                </div>
              )}

              <h4 style={{ margin: '0 0 15px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', color: '#1a1a1a' }}>
                <MapPin size={20} color="#e31e24" /> {projectName}
              </h4>

              <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Реальная себестоимость:</div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#1a1a1a' }}>{totalObj.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} <span style={{fontSize:'14px', color:'#888'}}>MDL</span></div>
                
                {totalObj > 0 && (
                  <div style={{ display: 'flex', height: '6px', width: '100%', borderRadius: '3px', overflow: 'hidden', marginTop: '10px' }}>
                    <div style={{ width: `${matPercent}%`, backgroundColor: '#ff9800' }} title="Материалы"></div>
                    <div style={{ width: `${fuelPercent}%`, backgroundColor: '#007bff' }} title="Транспорт"></div>
                    <div style={{ width: `${laborPercent}%`, backgroundColor: '#2e7d32' }} title="Зарплата"></div>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderBottom: '1px dashed #eee', paddingBottom: '5px' }}>
                  <span style={{ color: '#666', display: 'flex', alignItems: 'center', gap: '5px' }}><ShoppingCart size={14}/> Материалы</span>
                  <strong style={{ color: '#ff9800' }}>{data.matCost.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}</strong>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderBottom: '1px dashed #eee', paddingBottom: '5px' }}>
                  <span style={{ color: '#666', display: 'flex', alignItems: 'center', gap: '5px' }}><Truck size={14}/> Транспорт</span>
                  <strong style={{ color: '#007bff' }}>{data.fuelCost.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: '#666', display: 'flex', alignItems: 'center', gap: '5px' }}><Clock size={14}/> ЗП рабочих ({data.hours.toFixed(1)}ч)</span>
                  <strong style={{ color: '#2e7d32' }}>{data.laborCost.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}</strong>
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}