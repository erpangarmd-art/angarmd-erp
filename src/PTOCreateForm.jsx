import React, { useState, useMemo } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { Search, Trash2, Package, Loader2, Layers, Hammer, Droplet, Square } from 'lucide-react';

const CATEGORIES = ['Фундамент', 'Монтаж каркаса', 'Обшивка', 'Кровля', 'Расходники'];

const getCategoryIcon = (category) => {
  switch(category) {
    case 'Фундамент': return <Droplet size={24} />;
    case 'Монтаж каркаса': return <Square size={24} />;
    case 'Обшивка': return <Layers size={24} />;
    case 'Кровля': return <Layers size={24} />;
    case 'Расходники': return <Hammer size={24} />;
    default: return <Package size={24} />;
  }
};

const urgencyColors = {
  'Обычная': { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
  'Средняя': { bg: '#fef3c7', color: '#d97706', border: '#fde68a' },
  'Срочная': { bg: '#ffedd5', color: '#ea580c', border: '#fed7aa' },
  'Критическая': { bg: '#fef2f2', color: '#e31e24', border: '#fecaca' }
};

export default function PTOCreateForm({ projects, materials, user }) {
  const [selectedProject, setSelectedProject] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Все');
  const [urgency, setUrgency] = useState('Обычная');
  const [notes, setNotes] = useState('');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);

  const filteredMaterials = useMemo(() => {
    const queryStr = searchQuery.toLowerCase().trim();
    return materials.filter(m => {
      const matchSearch = m.name.toLowerCase().includes(queryStr) || (m.category && m.category.toLowerCase().includes(queryStr));
      const matchCat = activeCategory === 'Все' || m.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [materials, searchQuery, activeCategory]);

  const addToCart = (material) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === material.id);
      if (existing) return prev.map(item => item.id === material.id ? { ...item, qty: item.qty + 1 } : item);
      return [...prev, { ...material, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));

  const totalItems = cart.reduce((acc, item) => acc + item.qty, 0);
  const totalCost = cart.reduce((acc, item) => acc + ((Number(item.price)||0) * item.qty), 0);

  const handleSubmit = async () => {
    if (!selectedProject) return alert('Выберите объект!');
    if (cart.length === 0) return alert('Корзина пуста!');

    setLoading(true);
    try {
      const newRequest = {
        projectName: selectedProject, items: cart, totalItems, totalCost, urgency, notes,
        status: 'В работе', createdAt: serverTimestamp(), createdBy: user.name
      };
      await addDoc(collection(db, 'pto_requests'), newRequest);
      
      setCart([]); setNotes(''); setSelectedProject(''); setUrgency('Обычная');
      alert('✅ Заявка успешно отправлена!');
    } catch (error) { alert('Ошибка: ' + error.message); } 
    finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginBottom: '40px' }}>
      
      {/* КАТАЛОГ */}
      <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#1e293b' }}>Составить заявку</h3>
          <div className="custom-scroll" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', maxWidth: '100%' }}>
            {['Все', ...CATEGORIES].map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding: '8px 14px', borderRadius: '20px', border: activeCategory === cat ? '2px solid #e31e24' : '1px solid #e2e8f0', backgroundColor: activeCategory === cat ? '#fef2f2' : '#fff', color: activeCategory === cat ? '#e31e24' : '#64748b', fontSize: '13px', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Объект (Куда везти?)</label>
          <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '2px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '15px', fontWeight: '600', color: '#1e293b', outline: 'none', cursor: 'pointer' }}>
            <option value="">-- Выберите объект --</option>
            {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            <option value="База / Склад">База / Склад (Общее)</option>
          </select>
        </div>

        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={20} />
          <input type="text" placeholder="Поиск по складу..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '15px', outline: 'none', boxSizing: 'border-box', fontWeight: '600' }} />
        </div>

        <div className="custom-scroll" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px', marginBottom: '24px' }}>
          {filteredMaterials.map(mat => (
            <div key={mat.id} onClick={() => addToCart(mat)} className="material-card" style={{ border: '2px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', cursor: 'pointer', backgroundColor: '#fff', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: '90px', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', borderBottom: '1px solid #e2e8f0' }}>
                {getCategoryIcon(mat.category)}
              </div>
              <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b', marginBottom: '8px', lineHeight: '1.3' }}>{mat.name}</div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Склад: <span style={{color: mat.stock > 10 ? '#059669' : '#e31e24'}}>{mat.stock} {mat.unit}</span></div>
                  <div style={{ fontSize: '14px', color: '#3b82f6', fontWeight: '900', marginTop: '4px' }}>{Number(mat.price).toLocaleString('ru-RU')} MDL</div>
                </div>
              </div>
            </div>
          ))}
          {filteredMaterials.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontWeight: '600' }}>
              {materials.length === 0 ? "База пуста. Добавьте материалы в Управлении Базой." : "Материал не найден."}
            </div>
          )}
        </div>

        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Срочность доставки</label>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {Object.keys(urgencyColors).map(level => (
            <button key={level} onClick={() => setUrgency(level)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: `2px solid ${urgency === level ? urgencyColors[level].color : urgencyColors[level].border}`, backgroundColor: urgency === level ? urgencyColors[level].bg : '#fff', color: urgency === level ? urgencyColors[level].color : '#64748b', fontSize: '13px', fontWeight: '800', cursor: 'pointer', minWidth: '100px' }}>
              {level}
            </button>
          ))}
        </div>

        <textarea placeholder="Уточнения для снабженца..." value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '15px', boxSizing: 'border-box', outline: 'none', resize: 'vertical', minHeight: '100px', marginBottom: '16px', fontFamily: 'inherit', fontWeight: '500' }} />
      </div>

      {/* КОРЗИНА */}
      <div style={{ backgroundColor: '#f8fafc', borderRadius: '24px', padding: '24px', border: '2px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '900', color: '#1e293b' }}>Корзина заявки</h3>
        
        <div className="custom-scroll" style={{ flex: 1, overflowY: 'auto', display: 'grid', gap: '12px', alignContent: 'start', minHeight: '300px' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '60px 20px', fontWeight: '600', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Package size={64} style={{ opacity: 0.2, marginBottom: '16px' }} />
              Кликните по материалу слева, чтобы добавить его
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ width: '48px', height: '48px', backgroundColor: '#f1f5f9', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                  {getCategoryIcon(item.category)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b', marginBottom: '6px' }}>{item.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <button onClick={() => updateQty(item.id, -1)} style={{ padding: '6px 12px', border: 'none', background: 'none', color: '#475569', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>-</button>
                      <span style={{ fontSize: '14px', fontWeight: '900', width: '36px', textAlign: 'center' }}>{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} style={{ padding: '6px 12px', border: 'none', background: 'none', color: '#475569', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>+</button>
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '700' }}>x {item.price} MDL</div>
                  </div>
                </div>
                <button onClick={() => removeFromCart(item.id)} style={{ padding: '12px', backgroundColor: '#fef2f2', color: '#e31e24', border: 'none', borderRadius: '12px', cursor: 'pointer' }}>
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>

        <div style={{ borderTop: '2px dashed #cbd5e1', paddingTop: '24px', marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '15px', color: '#64748b', fontWeight: '600' }}>
            <span>Всего позиций:</span>
            <span style={{ color: '#1e293b', fontWeight: '800' }}>{totalItems} ед.</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
            <span style={{ fontSize: '15px', color: '#64748b', fontWeight: '600' }}>Ориентировочная сумма:</span>
            <span style={{ fontSize: '32px', fontWeight: '900', color: '#1e293b', lineHeight: '1' }}>{totalCost.toLocaleString('ru-RU')} MDL</span>
          </div>

          <button onClick={handleSubmit} disabled={loading || cart.length === 0} style={{ width: '100%', padding: '20px', backgroundColor: cart.length > 0 ? '#10b981' : '#cbd5e1', color: '#fff', border: 'none', borderRadius: '16px', fontSize: '16px', fontWeight: '900', cursor: cart.length > 0 ? 'pointer' : 'not-allowed', boxShadow: cart.length > 0 ? '0 10px 20px -5px rgba(16, 185, 129, 0.4)' : 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
            {loading ? <Loader2 className="spin-animation" size={20} /> : 'ОТПРАВИТЬ ЗАЯВКУ'}
          </button>
        </div>
      </div>
    </div>
  );
}