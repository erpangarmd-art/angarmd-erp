import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { ShoppingCart, Check, X, Clock, Settings, Plus, Trash2, Download, Search, HardHat, ListPlus } from 'lucide-react';

export default function PTO({ user }) {
  const [requests, setRequests] = useState([]);
  const [projects, setProjects] = useState([]);
  
  const [materialsDB, setMaterialsDB] = useState([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [newMatName, setNewMatName] = useState('');
  const [newMatUnit, setNewMatUnit] = useState('buc'); 
  const [newMatPrice, setNewMatPrice] = useState('');

  const [selectedProject, setSelectedProject] = useState('');
  const [quantity, setQuantity] = useState('');
  const [urgency, setUrgency] = useState('Обычная');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const [materialSearch, setMaterialSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');

  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    const qReq = query(collection(db, 'pto_requests'), orderBy('timestamp', 'desc'));
    const unsubReq = onSnapshot(qReq, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubProj = onSnapshot(collection(db, 'projects'), (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qMat = query(collection(db, 'materials_db'), orderBy('name', 'asc'));
    const unsubMat = onSnapshot(qMat, (snapshot) => {
      setMaterialsDB(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubReq(); unsubProj(); unsubMat(); };
  }, []);

  const handleLoadStandardDB = async () => {
    if (!window.confirm("Загрузить стандартный список материалов для бескаркасных ангаров?")) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const standardMaterials = [
        { name: 'Oțel zincat în rulouri (Оцинковка рулон)', unit: 'tonă', price: 21000 },
        { name: 'Oțel prevopsit în rulouri (Крашеная сталь рулон)', unit: 'tonă', price: 24500 },
        { name: 'Spumă poliuretanică izolatoare (Пенополиуретан)', unit: 'kg', price: 85 },
        { name: 'Ciment M500 Lafarge (Цемент)', unit: 'sac', price: 120 },
        { name: 'Beton B250 (Бетон миксер)', unit: 'm3', price: 1450 },
        { name: 'Armătură Ø12mm (Арматура)', unit: 'tonă', price: 14000 }
      ];
      standardMaterials.forEach((mat) => {
        const matRef = doc(collection(db, 'materials_db'));
        batch.set(matRef, mat);
      });
      await batch.commit();
      alert("✅ Стандартная база материалов успешно загружена!");
    } catch (error) {
      alert("Ошибка загрузки базы: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaterialDB = async (e) => {
    e.preventDefault();
    if (!newMatName || !newMatPrice) return;
    try {
      await addDoc(collection(db, 'materials_db'), {
        name: newMatName, unit: newMatUnit, price: Number(newMatPrice)
      });
      setNewMatName(''); setNewMatPrice('');
    } catch (err) {
      alert("Ошибка добавления материала: " + err.message);
    }
  };

  const handleDeleteMaterialDB = async (id, name) => {
    if (window.confirm(`Удалить материал "${name}"?`)) {
      await deleteDoc(doc(db, 'materials_db', id));
    }
  };

  const filteredMaterials = materialsDB.filter(m => 
    m.name.toLowerCase().includes(materialSearch.toLowerCase())
  );

  const handleSelectMaterial = (mat) => {
    setSelectedMaterialId(mat.id);
    setMaterialSearch(mat.name);
    setShowDropdown(false);
  };

  const selectedMaterialData = materialsDB.find(m => m.id === selectedMaterialId);
  const calculatedTotal = selectedMaterialData && quantity ? (selectedMaterialData.price * Number(quantity)).toFixed(2) : 0;

  const handleAddToCart = () => {
    const searchText = materialSearch.trim();
    if (!searchText || !quantity) return;
    
    let name = searchText;
    let unit = 'шт';
    let price = 0;
    let total = 0;

    if (selectedMaterialData) {
      name = selectedMaterialData.name;
      unit = selectedMaterialData.unit;
      price = selectedMaterialData.price;
      total = Number(calculatedTotal);
    }

    const newItem = {
      id: Date.now(),
      name: name,
      unit: unit,
      price: price,
      qty: Number(quantity),
      total: total
    };

    setCartItems([...cartItems, newItem]);
    setSelectedMaterialId('');
    setMaterialSearch('');
    setQuantity('');
  };

  const handleRemoveFromCart = (idToRemove) => {
    setCartItems(cartItems.filter(item => item.id !== idToRemove));
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!selectedProject) return alert('Выберите объект!');
    if (cartItems.length === 0) return alert('Добавьте хотя бы одну позицию в список!');
    
    setLoading(true);
    try {
      const batch = writeBatch(db);
      
      cartItems.forEach(item => {
        const newReqRef = doc(collection(db, 'pto_requests'));
        batch.set(newReqRef, {
          projectName: selectedProject,
          materialName: item.name,
          unit: item.unit,
          pricePerUnit: item.price,
          quantity: item.qty,
          totalCost: item.total,
          urgency: urgency,
          comment: comment,
          status: 'Ожидает', 
          author: user.name,
          timestamp: new Date()
        });
      });
      
      await batch.commit();
      
      setCartItems([]); 
      setComment('');
      setUrgency('Обычная');
      alert("✅ Заявка отправлена в ПТО!");
    } catch (error) {
      alert("Ошибка: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, 'pto_requests', id), { status: newStatus });
    } catch (error) {
      alert("Ошибка обновления: " + error.message);
    }
  };

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "Data;Obiect;Urgență;Material;Cantitate;Un.;Preț(MDL);Total(MDL);Status;Autor;Comentariu\n";
    requests.forEach(req => {
      const date = req.timestamp ? req.timestamp.toDate().toLocaleDateString('ru-RU') : '';
      const safeComment = req.comment ? req.comment.replace(/"/g, '""') : ''; 
      const row = `"${date}";"${req.projectName}";"${req.urgency}";"${req.materialName}";"${req.quantity}";"${req.unit}";"${req.pricePerUnit}";"${req.totalCost}";"${req.status}";"${req.author}";"${safeComment}"`;
      csvContent += row + "\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Achizitii_PTO_${new Date().toLocaleDateString('ru-RU')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Ожидает': return { bg: '#fff3e0', text: '#e65100', icon: <Clock size={14} /> };
      case 'В работе': return { bg: '#e3f2fd', text: '#1565c0', icon: <ShoppingCart size={14} /> };
      case 'Доставлено': return { bg: '#e8f5e9', text: '#2e7d32', icon: <Check size={14} /> };
      case 'Отказ': return { bg: '#ffebee', text: '#c62828', icon: <X size={14} /> };
      default: return { bg: '#f5f5f5', text: '#666', icon: null };
    }
  };

  const cartTotal = cartItems.reduce((sum, item) => sum + item.total, 0);

  return (
    <div>
      {/* CSS-ПРАВИЛА ДЛЯ ИДЕАЛЬНОЙ МОБИЛЬНОЙ АДАПТАЦИИ */}
      <style>{`
        .pto-container { padding: 0; }
        .pto-card { background: #fff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); padding: 25px; margin-bottom: 30px; border: 1px solid #f0f0f0; }
        .pto-input-row { display: flex; gap: 12px; align-items: stretch; }
        .pto-search-col { flex: 1 1 60%; position: relative; }
        .pto-qty-col { flex: 0 0 100px; }
        .pto-add-btn { flex: 0 0 60px; padding: 0; display: flex; align-items: center; justify-content: center; }
        
        .pto-history-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; }
        .pto-status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; white-space: nowrap; }

        @media (max-width: 600px) {
          .pto-card { padding: 15px; border-radius: 8px; }
          .pto-header { flex-direction: column; align-items: flex-start; gap: 12px; margin-bottom: 15px; }
          
          /* На телефоне инпуты выстраиваются в столбик для удобства толстых пальцев */
          .pto-input-row { flex-direction: column; gap: 10px; }
          .pto-search-col, .pto-qty-col { flex: none; width: 100%; }
          .pto-add-btn { width: 100%; height: 50px; flex: none; }
          
          .pto-history-row { flex-direction: column; gap: 10px; }
          .pto-status-badge { align-self: flex-start; }
          
          .pto-action-buttons { flex-direction: column; }
          .pto-action-buttons button { width: 100%; margin-bottom: 8px; }
        }
      `}</style>

      <div className="pto-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: '#111827', fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {user.role === 'foreman' ? '📝 Заказ материалов' : '🛒 Снабжение (ПТО)'}
        </h2>
        
        {(user.role === 'admin' || user.role === 'pto') && (
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)} 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: isSettingsOpen ? '#fee2e2' : '#f3f4f6', color: isSettingsOpen ? '#ef4444' : '#374151', border: '1px solid', borderColor: isSettingsOpen ? '#fca5a5' : '#d1d5db', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' }}
          >
            <Settings size={16} /> {isSettingsOpen ? 'Закрыть базу' : 'База материалов'}
          </button>
        )}
      </div>

      {/* --- БАЗА МАТЕРИАЛОВ --- */}
      {isSettingsOpen && (user.role === 'admin' || user.role === 'pto') && (
        <div className="pto-card" style={{ borderTop: '4px solid #374151' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>⚙️ Справочник цен</h3>
            <button onClick={handleLoadStandardDB} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
              <HardHat size={16} /> Загрузить базу
            </button>
          </div>
          
          <form onSubmit={handleAddMaterialDB} style={{ display: 'flex', gap: '12px', marginBottom: '25px', flexWrap: 'wrap', backgroundColor: '#f9fafb', padding: '15px', borderRadius: '8px', border: '1px dashed #e5e7eb' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', marginBottom: '4px', display: 'block' }}>Название</label>
              <input type="text" value={newMatName} onChange={(e)=>setNewMatName(e.target.value)} required style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: '1 1 100px' }}>
              <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', marginBottom: '4px', display: 'block' }}>Ед. изм.</label>
              <select value={newMatUnit} onChange={(e)=>setNewMatUnit(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box', backgroundColor: '#fff' }}>
                <option value="buc">buc</option><option value="sac">sac</option><option value="kg">kg</option><option value="tonă">tonă</option><option value="m.l.">m.l.</option><option value="m2">m2</option><option value="m3">m3</option>
              </select>
            </div>
            <div style={{ flex: '1 1 100px' }}>
              <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', marginBottom: '4px', display: 'block' }}>Цена (MDL)</label>
              <input type="number" step="0.01" value={newMatPrice} onChange={(e)=>setNewMatPrice(e.target.value)} required style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box' }} />
            </div>
            <button type="submit" style={{ flex: '1 1 100%', padding: '12px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: '4px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} /> ДОБАВИТЬ В БАЗУ
            </button>
          </form>

          <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            {materialsDB.map((mat, i) => (
              <div key={mat.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 15px', borderBottom: i === materialsDB.length - 1 ? 'none' : '1px solid #f3f4f6', backgroundColor: i % 2 === 0 ? '#fff' : '#f9fafb', alignItems: 'center' }}>
                <div style={{ fontSize: '14px', color: '#111827' }}><b>{mat.name}</b> <span style={{ color: '#6b7280' }}>({mat.unit})</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ color: '#059669', fontWeight: '700', fontSize: '14px' }}>{mat.price} MDL</span>
                  <button onClick={() => handleDeleteMaterialDB(mat.id, mat.name)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}><Trash2 size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- ФОРМА СОЗДАНИЯ ЗАЯВКИ С КОРЗИНОЙ --- */}
      <div className="pto-card">
        <h3 style={{ margin: '0 0 20px 0', color: '#111827', fontSize: '18px', borderBottom: '2px solid #f3f4f6', paddingBottom: '10px' }}>📝 Составить заявку</h3>
        
        <form onSubmit={handleSubmitRequest} style={{ display: 'grid', gap: '20px' }}>
          
          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#4b5563', marginBottom: '6px', display: 'block' }}>Объект (Куда везти?)</label>
            <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} required style={{ padding: '14px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px', backgroundColor: '#f9fafb', width: '100%', boxSizing: 'border-box', color: '#111827', fontWeight: '500' }}>
              <option value="">-- Выберите объект --</option>
              {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>

          <div style={{ padding: '20px', border: '2px dashed #93c5fd', borderRadius: '12px', backgroundColor: '#eff6ff' }}>
            <label style={{ fontSize: '14px', fontWeight: '700', color: '#1e3a8a', marginBottom: '12px', display: 'block' }}>Что добавить в заявку?</label>
            
            <div className="pto-input-row">
              <div className="pto-search-col">
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0 12px', backgroundColor: '#fff', height: '52px', boxSizing: 'border-box' }}>
                  <Search size={20} color="#60a5fa" />
                  <input 
                    type="text" 
                    value={materialSearch} 
                    onChange={(e) => {
                      setMaterialSearch(e.target.value);
                      setSelectedMaterialId(''); 
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)} 
                    placeholder="Материал из базы или свой..." 
                    style={{ width: '100%', padding: '0 12px', border: 'none', fontSize: '16px', outline: 'none', height: '100%', boxSizing: 'border-box', color: '#111827' }} 
                  />
                </div>

                {showDropdown && materialSearch && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 10, maxHeight: '220px', overflowY: 'auto', marginTop: '6px' }}>
                    {filteredMaterials.length > 0 ? (
                      filteredMaterials.map(mat => (
                        <div 
                          key={mat.id} 
                          onClick={() => handleSelectMaterial(mat)}
                          style={{ padding: '14px 16px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', transition: 'background 0.2s' }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f0fdf4'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#fff'}
                        >
                          <span style={{ fontWeight: '600', fontSize: '15px', color: '#111827' }}>{mat.name}</span>
                          <span style={{ color: '#059669', fontSize: '14px', fontWeight: '600' }}>{mat.price} MDL</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '14px 16px', color: '#6b7280', fontStyle: 'italic', fontSize: '14px', backgroundColor: '#f9fafb' }}>Нет в базе. Нажмите +, чтобы добавить как новый.</div>
                    )}
                  </div>
                )}
              </div>

              <div className="pto-qty-col">
                <input 
                  type="number" 
                  min="0.1" step="0.1" 
                  value={quantity} 
                  onChange={(e) => setQuantity(e.target.value)} 
                  placeholder={selectedMaterialData ? `Кол-во (${selectedMaterialData.unit})` : 'Кол-во'}
                  disabled={!materialSearch.trim()}
                  style={{ width: '100%', height: '52px', padding: '0 12px', border: '1px solid #bfdbfe', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box', backgroundColor: '#fff', color: '#111827', fontWeight: '600' }} 
                />
              </div>

              <button 
                type="button" 
                className="pto-add-btn"
                onClick={handleAddToCart}
                disabled={!materialSearch.trim() || !quantity}
                style={{ height: '52px', backgroundColor: (!materialSearch.trim() || !quantity) ? '#d1d5db' : '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: (!materialSearch.trim() || !quantity) ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
              >
                <Plus size={26} />
              </button>
            </div>
            
            {selectedMaterialId && quantity && (
              <div style={{ marginTop: '10px', fontSize: '14px', color: '#059669', fontWeight: '700', textAlign: 'right' }}>
                Сумма позиции: {calculatedTotal} MDL
              </div>
            )}
          </div>

          {/* СПИСОК ДОБАВЛЕННЫХ ПОЗИЦИЙ (КОРЗИНА) */}
          {cartItems.length > 0 && (
            <div style={{ backgroundColor: '#fff', border: '2px solid #111827', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#111827', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ListPlus size={20} color="#e31e24" /> В заявке ({cartItems.length} поз.)
              </div>
              
              <div style={{ display: 'grid', gap: '10px' }}>
                {cartItems.map((item, index) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', backgroundColor: '#f9fafb', borderRadius: '8px', borderLeft: '4px solid #e31e24' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '15px', color: '#111827', marginBottom: '2px' }}>{index + 1}. {item.name}</div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>{item.qty} {item.unit} {item.price > 0 && `× ${item.price} MDL`}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      {item.total > 0 && <span style={{ fontWeight: '800', color: '#059669', fontSize: '15px' }}>{item.total} MDL</span>}
                      <button type="button" onClick={() => handleRemoveFromCart(item.id)} style={{ background: '#fee2e2', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex' }}><X size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
              
              {cartTotal > 0 && (
                <div style={{ textAlign: 'right', marginTop: '20px', paddingTop: '15px', borderTop: '2px dashed #e5e7eb', fontSize: '16px', color: '#4b5563' }}>
                  Итоговая сумма: <strong style={{ color: '#059669', fontSize: '24px', marginLeft: '10px' }}>{cartTotal} MDL</strong>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gap: '5px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#4b5563' }}>Срочность (Urgență)</label>
            <select value={urgency} onChange={(e) => setUrgency(e.target.value)} style={{ padding: '14px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px', width: '100%', boxSizing: 'border-box', backgroundColor: urgency === 'Срочно' ? '#fef2f2' : '#fff', color: urgency === 'Срочно' ? '#dc2626' : '#111827', fontWeight: urgency === 'Срочно' ? '700' : '500' }}>
              <option value="Обычная">Обычная (în rând)</option>
              <option value="Срочно">🔥 Срочно (Azi/Mâine)</option>
            </select>
          </div>

          <div style={{ display: 'grid', gap: '5px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: '#4b5563' }}>Комментарий (Opțional)</label>
            <input type="text" placeholder="Например: брать только у Supraten..." value={comment} onChange={(e) => setComment(e.target.value)} style={{ padding: '14px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '15px', width: '100%', boxSizing: 'border-box', backgroundColor: '#fff' }} />
          </div>

          <button type="submit" disabled={loading || cartItems.length === 0} style={{ padding: '18px', backgroundColor: cartItems.length > 0 ? '#111827' : '#9ca3af', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '800', cursor: cartItems.length > 0 ? 'pointer' : 'not-allowed', marginTop: '10px', width: '100%', letterSpacing: '0.5px', boxShadow: cartItems.length > 0 ? '0 10px 15px -3px rgba(0, 0, 0, 0.2)' : 'none', transition: 'all 0.2s' }}>
            {loading ? 'ОТПРАВКА...' : `ОТПРАВИТЬ В ПТО (${cartItems.length} ПОЗ.)`}
          </button>
        </form>
      </div>

      {/* --- ИСТОРИЯ ЗАЯВОК --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, color: '#111827', fontSize: '20px', fontWeight: '800' }}>📋 История (Istoric)</h3>
        
        {(user.role === 'admin' || user.role === 'pto') && (
          <button onClick={exportToCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)' }}>
            <Download size={16} /> Excel
          </button>
        )}
      </div>
      
      <div style={{ display: 'grid', gap: '16px' }}>
        {requests.map(req => {
          const statusStyle = getStatusColor(req.status);
          
          return (
            <div key={req.id} className="pto-card" style={{ padding: '20px', borderLeft: req.urgency === 'Срочно' ? '5px solid #ef4444' : '5px solid #e5e7eb' }}>
              
              <div className="pto-history-row">
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#111827', marginBottom: '4px' }}>{req.materialName}</div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    Объект: <b style={{ color: '#2563eb' }}>{req.projectName}</b><br/>
                    Автор: <span style={{ color: '#4b5563', fontWeight: '500' }}>{req.author}</span>
                  </div>
                </div>
                <div className="pto-status-badge" style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}>
                  {statusStyle.icon} {req.status}
                </div>
              </div>

              <div style={{ backgroundColor: '#f9fafb', padding: '14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', border: '1px solid #f3f4f6' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>Количество:</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#111827' }}>{req.quantity} {req.unit}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>Сумма ({req.pricePerUnit} MDL/{req.unit}):</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#059669' }}>{req.totalCost} MDL</div>
                </div>
              </div>

              {req.comment && <div style={{ fontSize: '13px', color: '#4b5563', fontStyle: 'italic', marginBottom: '16px', padding: '10px', backgroundColor: '#fef3c7', borderRadius: '6px', borderLeft: '3px solid #f59e0b' }}>💬 "{req.comment}"</div>}

              {(user.role === 'admin' || user.role === 'pto') && req.status !== 'Доставлено' && req.status !== 'Отказ' && (
                <div className="pto-action-buttons" style={{ display: 'flex', gap: '8px', borderTop: '1px solid #e5e7eb', paddingTop: '16px', flexWrap: 'nowrap' }}>
                  <button onClick={() => handleUpdateStatus(req.id, 'В работе')} style={{ flex: '1', padding: '12px', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}>
                    В РАБОТУ
                  </button>
                  <button onClick={() => handleUpdateStatus(req.id, 'Доставлено')} style={{ flex: '1', padding: '12px', backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '12px' }}>
                    ДОСТАВЛЕНО
                  </button>
                  <button onClick={() => handleUpdateStatus(req.id, 'Отказ')} style={{ flex: '0 0 auto', padding: '12px 16px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '12px', display: 'flex', justifyContent: 'center' }}>
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {requests.length === 0 && (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px', backgroundColor: '#fff', borderRadius: '12px', border: '1px dashed #d1d5db' }}>
            <ShoppingCart size={40} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
            <div>Нет активных заявок</div>
          </div>
        )}
      </div>

    </div>
  );
}