import React, { useRef, useEffect } from 'react';
import { X, Camera, Loader2 } from 'lucide-react';

export function AddProjectModal({ 
  isOpen, onClose, onSubmit, loading, 
  name, setName, address, setAddress, 
  manager, setManager, managerPhone, setManagerPhone, deadline, setDeadline, 
  lat, setLat, lng, setLng, 
  photo, setPhoto 
}) {
  const addressInputRef = useRef(null);
  const autoCompleteRef = useRef(null);
  const photoInputRef = useRef(null);

  useEffect(() => {
    if (isOpen && window.google && addressInputRef.current) {
      autoCompleteRef.current = new window.google.maps.places.Autocomplete(addressInputRef.current, {
        types: ['geocode', 'establishment'],
        componentRestrictions: { country: 'md' }
      });
      autoCompleteRef.current.addListener('place_changed', () => {
        const place = autoCompleteRef.current.getPlace();
        if (place.geometry) {
          setAddress(place.formatted_address || place.name);
          setLat(place.geometry.location.lat());
          setLng(place.geometry.location.lng());
        }
      });
    }
  }, [isOpen, setAddress, setLat, setLng]);

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhoto(reader.result);
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '460px', position: 'relative', animation: 'slideUp 0.3s ease-out', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#111827' }}>🏗️ Новая стройка</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={24}/></button>
        </div>
        
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <input type="file" accept="image/*" ref={photoInputRef} onChange={handlePhotoSelect} style={{ display: 'none' }} />
            {photo ? (
              <div style={{ position: 'relative' }}>
                <img src={photo} alt="Превью" style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '12px', border: '2px solid #e5e7eb' }} />
                <button type="button" onClick={() => setPhoto(null)} style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={16}/></button>
              </div>
            ) : (
              <div onClick={() => photoInputRef.current.click()} style={{ padding: '20px', border: '2px dashed #cbd5e1', borderRadius: '12px', cursor: 'pointer', backgroundColor: '#f8fafc', color: '#64748b', fontWeight: '700', fontSize: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <Camera size={28} />
                <span>Загрузить рендер/фото ангара</span>
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: '13px', color: '#4b5563', fontWeight: 'bold' }}>Название объекта *</label>
            <input type="text" value={name} onChange={(e)=>setName(e.target.value)} required style={{ width: '100%', padding: '14px', border: '2px solid #e5e7eb', borderRadius: '10px', boxSizing: 'border-box', marginTop: '6px', fontSize: '15px' }} />
          </div>
          
          <div>
            <label style={{ fontSize: '13px', color: '#4b5563', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
              <span>Местоположение (Google) *</span>
              {lat && <span style={{ color: '#059669', fontSize: '11px' }}>GPS ✅</span>}
            </label>
            <input 
              type="text" ref={addressInputRef} value={address} 
              onChange={(e) => { setAddress(e.target.value); setLat(null); setLng(null); }} 
              placeholder="Адрес..." required 
              style={{ width: '100%', padding: '14px', border: lat ? '2px solid #10b981' : '2px solid #e5e7eb', borderRadius: '10px', boxSizing: 'border-box', marginTop: '6px', fontSize: '15px' }} 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', color: '#4b5563', fontWeight: 'bold' }}>Прораб</label>
              <input type="text" value={manager} onChange={(e)=>setManager(e.target.value)} style={{ width: '100%', padding: '14px', border: '2px solid #e5e7eb', borderRadius: '10px', boxSizing: 'border-box', marginTop: '6px', fontSize: '15px' }} />
            </div>
            <div>
              <label style={{ fontSize: '13px', color: '#4b5563', fontWeight: 'bold' }}>Телефон (069...)</label>
              <input type="text" value={managerPhone} onChange={(e)=>setManagerPhone(e.target.value)} placeholder="069000000" style={{ width: '100%', padding: '14px', border: '2px solid #e5e7eb', borderRadius: '10px', boxSizing: 'border-box', marginTop: '6px', fontSize: '15px' }} />
            </div>
          </div>
          
          <div>
            <label style={{ fontSize: '13px', color: '#4b5563', fontWeight: 'bold' }}>Дедлайн</label>
            <input type="date" value={deadline} onChange={(e)=>setDeadline(e.target.value)} required style={{ width: '100%', padding: '14px', border: '2px solid #e5e7eb', borderRadius: '10px', boxSizing: 'border-box', marginTop: '6px', fontSize: '15px' }} />
          </div>

          <button type="submit" disabled={loading || !lat} style={{ width: '100%', padding: '16px', backgroundColor: (!lat) ? '#9ca3af' : '#111827', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '16px', cursor: (!lat) ? 'not-allowed' : 'pointer', marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
            {loading ? <Loader2 className="spin-animation" size={20}/> : (!lat ? 'ВЫБЕРИТЕ АДРЕС' : 'СОЗДАТЬ')}
          </button>
        </form>
      </div>
    </div>
  );
}

export function EditProjectModal({ isOpen, onClose, onSubmit, loading, project, setProject, photo, setPhoto }) {
  const photoInputRef = useRef(null);

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhoto(reader.result);
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen || !project) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
      <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '460px', position: 'relative', animation: 'slideUp 0.3s ease-out', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#3b82f6' }}>Редактировать</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={24}/></button>
        </div>
        
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <input type="file" accept="image/*" ref={photoInputRef} onChange={handlePhotoSelect} style={{ display: 'none' }} />
            {(photo || project.imageUrl) ? (
              <div style={{ position: 'relative' }}>
                <img src={photo || project.imageUrl} alt="Превью" style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '12px', border: '2px solid #e5e7eb' }} />
                <button type="button" onClick={() => { setPhoto(null); setProject({...project, imageUrl: ''}); }} style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={16}/></button>
              </div>
            ) : (
              <div onClick={() => photoInputRef.current.click()} style={{ padding: '20px', border: '2px dashed #cbd5e1', borderRadius: '12px', cursor: 'pointer', backgroundColor: '#f8fafc', color: '#64748b', fontWeight: '700', fontSize: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <Camera size={28} /><span>Изменить фото ангара</span>
              </div>
            )}
          </div>
          <input type="text" value={project.name} onChange={(e)=>setProject({...project, name: e.target.value})} required style={{ width: '100%', padding: '14px', border: '2px solid #e5e7eb', borderRadius: '10px', boxSizing: 'border-box' }} />
          <input type="text" value={project.address || ''} onChange={(e)=>setProject({...project, address: e.target.value})} style={{ width: '100%', padding: '14px', border: '2px solid #e5e7eb', borderRadius: '10px', boxSizing: 'border-box' }} />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <input type="text" value={project.manager || ''} placeholder="Имя прораба" onChange={(e)=>setProject({...project, manager: e.target.value})} style={{ width: '100%', padding: '14px', border: '2px solid #e5e7eb', borderRadius: '10px', boxSizing: 'border-box' }} />
            <input type="text" value={project.managerPhone || ''} placeholder="Телефон прораба" onChange={(e)=>setProject({...project, managerPhone: e.target.value})} style={{ width: '100%', padding: '14px', border: '2px solid #e5e7eb', borderRadius: '10px', boxSizing: 'border-box' }} />
          </div>

          <input type="date" value={project.deadline || ''} onChange={(e)=>setProject({...project, deadline: e.target.value})} required style={{ width: '100%', padding: '14px', border: '2px solid #e5e7eb', borderRadius: '10px', boxSizing: 'border-box' }} />

          <button type="submit" disabled={loading} style={{ width: '100%', padding: '16px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
            {loading ? <Loader2 className="spin-animation" size={20}/> : 'СОХРАНИТЬ'}
          </button>
        </form>
      </div>
    </div>
  );
}