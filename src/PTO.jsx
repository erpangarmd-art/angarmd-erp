import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Database, X, Edit2, Trash2 } from 'lucide-react';
import PTOCreateForm from './PTOCreateForm';
import PTOHistory from './PTOHistory';

const CATEGORIES = ['Фундамент', 'Монтаж каркаса', 'Обшивка', 'Кровля', 'Расходники', 'Без категории'];

export default function Pto({ user }) {
  const [projects, setProjects] = useState([]);
  const [requests, setRequests] = useState([]);
  const [materials, setMaterials] = useState([]);

  // Состояния для модалки управления базой
  const [isBaseModalOpen, setIsBaseModalOpen] = useState(false);
  const [matName, setMatName] = useState('');
  const [matCategory, setMatCategory] = useState(CATEGORIES[0]);
  const [matUnit, setMatUnit] = useState('шт');
  const [matPrice, setMatPrice] = useState('');
  const [matStock, setMatStock] = useState('');
  const [editingMatId, setEditingMatId] = useState(null);

  const canManageBase = user?.role === 'admin' || user?.role === 'pto';

  useEffect(() => {
    const unsubProjects = onSnapshot(query(collection(db, 'projects'), orderBy('createdAt', 'desc')), (snapshot) => {
      setProjects(snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.status !== 'Архив'));
    });
    const unsubReqs = onSnapshot(query(collection(db, 'pto_requests'), orderBy('createdAt', 'desc')), (snapshot) => {
      setRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    // БЕРЕМ ИЗ ВАШЕЙ КОЛЛЕКЦИИ materials_db
    const unsubMaterials = onSnapshot(query(collection(db, 'materials_db'), orderBy('name', 'asc')), (snapshot) => {
      setMaterials(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubProjects(); unsubReqs(); unsubMaterials(); };
  }, []);

  const handleSaveMaterial = async (e) => {
    e.preventDefault();
    if (!matName || !matPrice) return alert("Заполните название и цену!");

    const matData = {
      name: matName.trim(), category: matCategory, unit: matUnit,
      price: Number(matPrice) || 0, stock: Number(matStock) || 0
    };

    try {
      if (editingMatId) await updateDoc(doc(db, 'materials_db', editingMatId), matData);
      else await addDoc(collection(db, 'materials_db'), matData);
      resetMatForm();
    } catch (error) { alert("Ошибка сохранения: " + error.message); }
  };

  const editMaterial = (mat) => {
    setEditingMatId(mat.id); setMatName(mat.name || ''); setMatCategory(mat.category || 'Без категории');
    setMatUnit(mat.unit || 'шт'); setMatPrice(mat.price || ''); setMatStock(mat.stock || 0);
  };

  const deleteMaterial = async (id, name) => {
    if (window.confirm(`Удалить материал "${name}" из базы?`)) {
      try { await deleteDoc(doc(db, 'materials_db', id)); } 
      catch (error) { alert("Ошибка: " + error.message); }
    }
  };

  const resetMatForm = () => {
    setEditingMatId(null); setMatName(''); setMatPrice(''); setMatStock(''); setMatUnit('шт'); setMatCategory(CATEGORIES[0]);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.3s ease-out', paddingBottom: '50px' }}>
      
      {/* ГЛАВНАЯ ШАПКА */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ margin: 0, color: '#1e293b', fontSize: '28px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#e31e24' }}>ANGAR</span> Снабжение (ПТО)
        </h2>
        {canManageBase && (
          <button onClick={() => setIsBaseModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#111827', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
            <Database size={18} /> Управление Базой
          </button>
        )}
      </div>

      {/* ФОРМА И КОРЗИНА */}
      <PTOCreateForm projects={projects} materials={materials} user={user} />

      {/* ИСТОРИЯ ЗАЯВОК */}
      <PTOHistory requests={requests} />

      {/* МОДАЛКА: УПРАВЛЕНИЕ БАЗОЙ МАТЕРИАЛОВ */}
      {isBaseModalOpen && canManageBase && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '24px', width: '100%', maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.3s ease-out', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '24px 30px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: '24px 24px 0 0' }}>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}><Database size={24} color="#3b82f6" /> Склад и цены</h2>
              <button onClick={() => { setIsBaseModalOpen(false); resetMatForm(); }} style={{ background: '#e2e8f0', border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer', color: '#475569' }}><X size={20}/></button>
            </div>
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              <div style={{ width: '320px', borderRight: '1px solid #e2e8f0', padding: '24px', overflowY: 'auto', backgroundColor: '#f8fafc' }}>
                <h4 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>{editingMatId ? 'Редактировать материал' : 'Добавить новый'}</h4>
                <form onSubmit={handleSaveMaterial} style={{ display: 'grid', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Название материала *</label>
                    <input type="text" required value={matName} onChange={e=>setMatName(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontWeight: '600', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Категория</label>
                    <select value={matCategory} onChange={e=>setMatCategory(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontWeight: '600', boxSizing: 'border-box' }}>
                      {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Цена (MDL) *</label>
                      <input type="number" required value={matPrice} onChange={e=>setMatPrice(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontWeight: '700', boxSizing: 'border-box', color: '#3b82f6' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Остаток</label>
                      <input type="number" value={matStock} onChange={e=>setMatStock(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontWeight: '700', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Ед. измерения</label>
                    <select value={matUnit} onChange={e=>setMatUnit(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontWeight: '600', boxSizing: 'border-box' }}>
                      <option value="шт">Штука (шт)</option>
                      <option value="м">Метр (м)</option>
                      <option value="м²">Квадрат (м²)</option>
                      <option value="м³">Куб (м³)</option>
                      <option value="т">Тонна (т)</option>
                      <option value="tonă">tonă (Тонна рум.)</option>
                      <option value="кг">Килограмм (кг)</option>
                      <option value="упак">Упаковка (упак)</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button type="submit" style={{ flex: 1, padding: '14px', backgroundColor: '#1e293b', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' }}>{editingMatId ? 'ОБНОВИТЬ' : 'ДОБАВИТЬ'}</button>
                    {editingMatId && <button type="button" onClick={resetMatForm} style={{ padding: '14px', backgroundColor: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' }}>Отмена</button>}
                  </div>
                </form>
              </div>
              <div className="custom-scroll" style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
                <h4 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '800', color: '#1e293b' }}>Материалы в системе ({materials.length})</h4>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {materials.map(mat => (
                    <div key={mat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                      <div>
                        <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '15px', marginBottom: '4px' }}>{mat.name}</div>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#64748b', fontWeight: '600' }}>
                          <span>Кат: {mat.category || 'Без категории'}</span><span style={{ color: '#3b82f6' }}>{mat.price || 0} MDL/{mat.unit || 'шт'}</span><span style={{ color: (mat.stock||0) > 10 ? '#059669' : '#e31e24' }}>Остаток: {mat.stock || 0}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => editMaterial(mat)} style={{ padding: '8px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer' }}><Edit2 size={16}/></button>
                        <button onClick={() => deleteMaterial(mat.id, mat.name)} style={{ padding: '8px', backgroundColor: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer' }}><Trash2 size={16}/></button>
                      </div>
                    </div>
                  ))}
                  {materials.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontWeight: '600' }}>База материалов пуста.</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}