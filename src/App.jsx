import React, { useState } from 'react';
import { LayoutDashboard, Users, Truck, FileText, UserCog, Menu, X, LogOut, ShoppingCart, Wrench, ClipboardList } from 'lucide-react'; 
import Attendance from './Attendance';
import Login from './Login'; 
import Reports from './Reports';
import ManageWorkers from './ManageWorkers';
import Transport from './Transport';
import PTO from './PTO'; 
import Objects from './Objects'; 
import Mechanics from './Mechanics'; 

function App() {
  const [activeTab, setActiveTab] = useState('attendance');
  const [user, setUser] = useState(null); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // ==========================================
  // ГЛАВНЫЙ ЭКРАН (ВЫБОР ПРОФИЛЯ)
  // ==========================================
  if (!user) {
    return (
      <Login onLogin={(loggedInUser) => {
        setUser(loggedInUser);
        if (loggedInUser.role === 'admin') setActiveTab('reports');
        else if (loggedInUser.role === 'pto') setActiveTab('pto');
        else if (loggedInUser.role === 'foreman') setActiveTab('objects'); 
        else if (loggedInUser.role === 'driver') setActiveTab('transport');
        else if (loggedInUser.role === 'mechanic') setActiveTab('mechanics');
        else setActiveTab('attendance');
      }} />
    );
  }

  // --- ДИНАМИЧЕСКИЕ НАЗВАНИЯ ВКЛАДОК ---
  const ptoLabel = user.role === 'foreman' ? 'Заявки' : 'Снабжение';
  const ptoIcon = user.role === 'foreman' ? <ClipboardList size={22} /> : <ShoppingCart size={22} />;

  // --- НАСТРОЙКА МЕНЮ ДЛЯ РАЗНЫХ ДОЛЖНОСТЕЙ ---
  const adminMenuItems = [
    { id: 'reports', label: 'Аналитика', icon: <FileText size={20} /> },
    { id: 'objects', label: 'Объекты', icon: <LayoutDashboard size={20} /> },
    { id: 'pto', label: ptoLabel, icon: <ShoppingCart size={20} /> },
    { id: 'mechanics', label: 'Механика', icon: <Wrench size={20} /> },
    { id: 'personnel', label: 'Персонал', icon: <UserCog size={20} /> },
    { id: 'transport', label: 'Транспорт', icon: <Truck size={20} /> },
  ];

  const foremanMenuItems = [
    { id: 'objects', label: 'Объекты', icon: <LayoutDashboard size={22} /> },
    { id: 'pto', label: ptoLabel, icon: ptoIcon }, 
    { id: 'transport', label: 'Транспорт', icon: <Truck size={22} /> },
    { id: 'personnel', label: 'Команда', icon: <Users size={22} /> }, 
    { id: 'attendance', label: 'Смена', icon: <Users size={22} /> },
  ];

  // ИСПРАВЛЕНИЕ: Добавили ПТО доступ к объектам
  const ptoMenuItems = [
    { id: 'objects', label: 'Объекты', icon: <LayoutDashboard size={22} /> },
    { id: 'pto', label: 'Закупки', icon: <ShoppingCart size={22} /> },
    { id: 'mechanics', label: 'Запчасти', icon: <Wrench size={22} /> },
    { id: 'attendance', label: 'Смена', icon: <Users size={22} /> },
  ];

  const driverMenuItems = [
    { id: 'transport', label: 'Маршрут', icon: <Truck size={22} /> },
    { id: 'mechanics', label: 'Ремонт', icon: <Wrench size={22} /> },
    { id: 'attendance', label: 'Смена', icon: <Users size={22} /> },
  ];

  const mechanicMenuItems = [
    { id: 'mechanics', label: 'Техника', icon: <Wrench size={22} /> },
    { id: 'attendance', label: 'Смена', icon: <Users size={22} /> },
  ];

  const workerMenuItems = [
    { id: 'attendance', label: 'Моя смена', icon: <Users size={22} /> }
  ];

  // Логика выбора нижнего меню
  let bottomMenu = workerMenuItems;
  if (user.role === 'pto') bottomMenu = ptoMenuItems;
  if (user.role === 'foreman') bottomMenu = foremanMenuItems;
  if (user.role === 'driver') bottomMenu = driverMenuItems;
  if (user.role === 'mechanic') bottomMenu = mechanicMenuItems;

  const handleLogout = () => {
    setUser(null);
    setActiveTab('attendance');
    setIsMenuOpen(false);
  };

  const roleNames = {
    'admin': 'Директор',
    'foreman': 'Прораб',
    'pto': 'Начальник ПТО', // Обновили название здесь для шапки
    'driver': 'Водитель',
    'mechanic': 'Механик',
    'worker': 'Рабочий'
  };

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', position: 'relative' }}>
      
      {/* ХЕДЕР ПРЕМИУМ */}
      <header style={{ backgroundColor: '#111827', padding: '16px 24px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, borderBottom: '3px solid #e31e24' }}>
        
        {/* ЛОГОТИП ВНУТРИ ПРИЛОЖЕНИЯ ИСПРАВЛЕН НА /favicon.png */}
        <div style={{ backgroundColor: '#fff', padding: '4px 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
          <img src="/favicon.png" alt="ANGAR.MD" style={{ height: '24px', objectFit: 'contain' }} />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {user.role !== 'admin' && (
            <div style={{ fontSize: '13px', color: '#9ca3af', textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ color: '#fff', fontWeight: '600' }}>{user.name}</div>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold', marginTop: '4px', color: '#fbbf24', textTransform: 'uppercase' }}>
                {roleNames[user.role]}
              </div>
            </div>
          )}

          {user.role === 'admin' ? (
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', transition: 'transform 0.2s' }}>
              {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          ) : (
            <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid rgba(227, 30, 36, 0.5)', color: '#e31e24', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', transition: 'all 0.2s' }}>
              ВЫЙТИ
            </button>
          )}
        </div>
      </header>

      {/* МЕНЮ АДМИНА (Боковое) */}
      {isMenuOpen && user.role === 'admin' && (
        <>
          <div onClick={() => setIsMenuOpen(false)} style={{ position: 'fixed', top: '65px', left: 0, width: '100%', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)', zIndex: 98, transition: 'opacity 0.3s' }}></div>
          <div style={{ position: 'fixed', top: '65px', right: 0, width: '280px', height: 'calc(100vh - 65px)', backgroundColor: '#fff', boxShadow: '-10px 0 25px rgba(0,0,0,0.1)', zIndex: 99, borderTopLeftRadius: '16px', overflowY: 'auto' }}>
            
            <div style={{ padding: '25px 20px', borderBottom: '1px solid #f3f4f6', backgroundColor: '#f9fafb' }}>
              <div style={{ fontWeight: 'bold', color: '#111827', fontSize: '18px' }}>👤 {user.name}</div>
              <div style={{ fontSize: '12px', color: '#e31e24', marginTop: '6px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Панель Управления</div>
            </div>
            
            <div style={{ padding: '10px 0' }}>
              {adminMenuItems.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => { setActiveTab(item.id); setIsMenuOpen(false); }} 
                  style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '15px', color: activeTab === item.id ? '#e31e24' : '#4b5563', backgroundColor: activeTab === item.id ? '#fef2f2' : 'transparent', cursor: 'pointer', fontWeight: activeTab === item.id ? 'bold' : '500', transition: 'all 0.2s', borderLeft: activeTab === item.id ? '4px solid #e31e24' : '4px solid transparent' }}
                >
                  {item.icon} <span style={{ fontSize: '16px' }}>{item.label}</span>
                </div>
              ))}
            </div>

            <div style={{ padding: '20px', borderTop: '1px solid #f3f4f6', marginTop: 'auto' }}>
              <div onClick={handleLogout} style={{ padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#ef4444', backgroundColor: '#fef2f2', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'background 0.2s' }}>
                <LogOut size={18} /> ВЫЙТИ ИЗ СИСТЕМЫ
              </div>
            </div>
          </div>
        </>
      )}

      {/* ОСНОВНОЙ КОНТЕНТ */}
      <main style={{ padding: '24px 20px', maxWidth: '800px', margin: '0 auto', paddingBottom: user.role === 'admin' ? '60px' : '100px' }}>
        
        {activeTab === 'reports' && user.role === 'admin' && <Reports />}
        
        {/* ИСПРАВЛЕНИЕ: Добавили 'pto' в список ролей, которым доступны Объекты */}
        {activeTab === 'objects' && ['admin', 'foreman', 'pto'].includes(user.role) && <Objects user={user} />}
        
        {activeTab === 'personnel' && ['admin', 'foreman'].includes(user.role) && <ManageWorkers user={user} />}
        {activeTab === 'pto' && ['admin', 'pto', 'foreman'].includes(user.role) && <PTO user={user} />}
        {activeTab === 'transport' && ['admin', 'foreman', 'driver'].includes(user.role) && <Transport user={user} />}
        {activeTab === 'mechanics' && ['admin', 'pto', 'mechanic', 'driver', 'foreman'].includes(user.role) && <Mechanics user={user} />}
        {activeTab === 'attendance' && user.role !== 'admin' && <Attendance user={user} />}
        
      </main>

      {/* НИЖНЯЯ ПАНЕЛЬ (ДЛЯ ВСЕХ КРОМЕ АДМИНА) - СТИЛЬ iOS */}
      {user.role !== 'admin' && (
        <nav style={{ display: 'flex', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', padding: '12px 10px 24px 10px', borderTop: '1px solid #e5e7eb', position: 'fixed', bottom: 0, width: '100%', left: 0, zIndex: 90, boxShadow: '0 -4px 15px rgba(0,0,0,0.05)' }}>
          {bottomMenu.map(item => {
            const isActive = activeTab === item.id;
            return (
              <div 
                key={item.id} 
                onClick={() => setActiveTab(item.id)} 
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: isActive ? '#e31e24' : '#9ca3af', cursor: 'pointer', flex: 1, position: 'relative' }}
              >
                <div style={{ marginBottom: '6px', transform: isActive ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                  {item.icon}
                </div>
                <span style={{ fontSize: '11px', fontWeight: isActive ? '700' : '500', transition: 'all 0.2s' }}>{item.label}</span>
                
                {/* Индикатор активного таба снизу */}
                {isActive && (
                  <div style={{ position: 'absolute', bottom: '-12px', width: '20px', height: '4px', backgroundColor: '#e31e24', borderRadius: '4px' }}></div>
                )}
              </div>
            );
          })}
        </nav>
      )}
    </div>
  );
}

export default App;