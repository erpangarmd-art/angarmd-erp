import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { Plus, Building, FolderKanban, FileSpreadsheet, ArrowDownWideNarrow, MapPinned } from 'lucide-react';
import ProjectCard from './ProjectCard';
import { AddProjectModal, EditProjectModal } from './ProjectModals';
import ProjectMap from './ProjectMap';

export default function Objects({ user }) {
  const [projects, setProjects] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false); 
  const [showMap, setShowMap] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState({});
  const [activeTab, setActiveTab] = useState('all'); 
  const [sortBy, setSortBy] = useState('newest'); 

  // Состояния для модалки Добавления
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectAddress, setNewProjectAddress] = useState('');
  const [newProjectLat, setNewProjectLat] = useState(null); 
  const [newProjectLng, setNewProjectLng] = useState(null); 
  const [newProjectManager, setNewProjectManager] = useState('');
  const [newProjectManagerPhone, setNewProjectManagerPhone] = useState(''); // НОВОЕ: Телефон прораба
  const [newProjectDeadline, setNewProjectDeadline] = useState(''); 
  const [projectPhoto, setProjectPhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editPhoto, setEditPhoto] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleAddProject = async (e) => {
    e.preventDefault();
    if (!newProjectName) return;

    setLoading(true);
    try {
      let imageUrl = "";
      if (projectPhoto) {
        const storageRef = ref(storage, `projects/${Date.now()}_${newProjectName}.jpg`);
        await uploadString(storageRef, projectPhoto, 'data_url');
        imageUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, 'projects'), {
        name: newProjectName, address: newProjectAddress, lat: newProjectLat, lng: newProjectLng,
        manager: newProjectManager, managerPhone: newProjectManagerPhone, deadline: newProjectDeadline, imageUrl: imageUrl, 
        status: 'Активен', progress: 0, checklist: {}, 
        createdAt: serverTimestamp(), createdBy: user.name
      });
      
      setNewProjectName(''); setNewProjectAddress(''); setNewProjectLat(null); setNewProjectLng(null); 
      setNewProjectManager(''); setNewProjectManagerPhone(''); setNewProjectDeadline(''); setProjectPhoto(null);
      setIsAddModalOpen(false);
    } catch (error) { alert("Ошибка при создании: " + error.message); } 
    finally { setLoading(false); }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let newImageUrl = editingProject.imageUrl || "";
      if (editPhoto) {
        const storageRef = ref(storage, `projects/${Date.now()}_${editingProject.name}.jpg`);
        await uploadString(storageRef, editPhoto, 'data_url');
        newImageUrl = await getDownloadURL(storageRef);
      }

      await updateDoc(doc(db, 'projects', editingProject.id), {
        name: editingProject.name, address: editingProject.address, manager: editingProject.manager, 
        managerPhone: editingProject.managerPhone || '', deadline: editingProject.deadline || '', imageUrl: newImageUrl 
      });
      
      setIsEditModalOpen(false); setEditingProject(null); setEditPhoto(null);
    } catch (error) { alert("Ошибка обновления: " + error.message); } 
    finally { setLoading(false); }
  };

  const handleToggleArchive = async (e, project) => {
    e.stopPropagation();
    const newStatus = project.status === 'Архив' ? 'Активен' : 'Архив';
    if (window.confirm(`Отправить "${project.name}" в ${newStatus === 'Архив' ? 'архив' : 'работу'}?`)) {
      await updateDoc(doc(db, 'projects', project.id), { status: newStatus });
    }
  };

  const handleDeleteProject = async (e, id, name) => {
    e.stopPropagation();
    if (window.confirm(`⚠️ Удалить объект "${name}" навсегда?`)) {
      await deleteDoc(doc(db, 'projects', id));
    }
  };

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFFНазвание,Адрес,Прораб,Готовность %,Дедлайн,Статус\n";
    projects.forEach(p => {
      const deadline = p.deadline ? new Date(p.deadline).toLocaleDateString('ru-RU') : 'Нет';
      csvContent += `"${p.name}","${p.address || ''}","${p.manager || ''}","${p.progress || 0}","${deadline}","${p.status}"\n`;
    });
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `Objects_${new Date().toLocaleDateString('ru-RU')}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  let filteredProjects = projects.filter(p => showArchived ? p.status === 'Архив' : p.status !== 'Архив');
  
  if (!showArchived) {
    if (activeTab === 'in_progress') filteredProjects = filteredProjects.filter(p => (p.progress || 0) < 100);
    if (activeTab === 'ready') filteredProjects = filteredProjects.filter(p => (p.progress || 0) === 100);
    if (activeTab === 'urgent') {
      filteredProjects = filteredProjects.filter(p => {
        if (!p.deadline || p.progress === 100) return false;
        return ((new Date(p.deadline) - new Date()) / (1000 * 60 * 60 * 24)) <= 30; 
      });
    }
  }

  if (sortBy === 'deadline_asc') {
    filteredProjects.sort((a, b) => (!a.deadline ? 1 : !b.deadline ? -1 : new Date(a.deadline) - new Date(b.deadline)));
  } else if (sortBy === 'progress_asc') {
    filteredProjects.sort((a, b) => (a.progress || 0) - (b.progress || 0));
  } else if (sortBy === 'progress_desc') {
    filteredProjects.sort((a, b) => (b.progress || 0) - (a.progress || 0));
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <style>{`
        .action-btn { background: #f3f4f6; color: #374151; border: none; border-radius: 20px; padding: 6px 14px; font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 6px; cursor: pointer; transition: all 0.2s; }
        .action-btn:hover { background: #e5e7eb; transform: translateY(-1px); }
        .nav-tab { background: none; border: none; padding: 10px 0; margin-right: 24px; font-size: 15px; font-weight: 700; cursor: pointer; position: relative; color: #6b7280; transition: color 0.2s; }
        .nav-tab.active { color: #111827; }
        .nav-tab.active::after { content: ''; position: absolute; bottom: -2px; left: 0; width: 100%; height: 3px; background-color: #e31e24; border-radius: 3px; }
        @media (max-width: 768px) { .sort-select { width: 100%; margin-top: 10px; } }
      `}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ margin: 0, color: '#111827', fontSize: '26px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Building size={28} color="#e31e24" /> {showArchived ? 'Архив объектов' : 'Объекты в работе'}
        </h2>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => setShowMap(!showMap)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: showMap ? '#e0e7ff' : '#f8fafc', color: showMap ? '#3b82f6' : '#475569', border: '1px solid #cbd5e1', borderRadius: '12px', cursor: 'pointer', fontWeight: '800', fontSize: '14px', transition: 'all 0.2s' }}>
            <MapPinned size={18} /> Карта
          </button>
          
          {user.role === 'admin' && (
            <button onClick={exportToCSV} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>
              <FileSpreadsheet size={18} /> Excel
            </button>
          )}
          <button onClick={() => setShowArchived(!showArchived)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: 'transparent', color: '#4b5563', border: '1px solid #d1d5db', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>
            <FolderKanban size={18} /> {showArchived ? 'Активные' : 'Архив'}
          </button>
          {user.role === 'admin' && (
            <button onClick={() => setIsAddModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#111827', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '800', fontSize: '14px', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}>
              <Plus size={18} /> НОВЫЙ ОБЪЕКТ
            </button>
          )}
        </div>
      </div>

      {showMap && !showArchived && (
        <ProjectMap projects={projects} />
      )}

      {!showArchived && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e5e7eb', marginBottom: '30px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', overflowX: 'auto', whiteSpace: 'nowrap' }}>
            <button className={`nav-tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>Все объекты</button>
            <button className={`nav-tab ${activeTab === 'in_progress' ? 'active' : ''}`} onClick={() => setActiveTab('in_progress')}>В работе</button>
            <button className={`nav-tab ${activeTab === 'ready' ? 'active' : ''}`} onClick={() => setActiveTab('ready')}>Готовые</button>
            <button className={`nav-tab ${activeTab === 'urgent' ? 'active' : ''}`} onClick={() => setActiveTab('urgent')}>Срочные</button>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '10px' }} className="sort-select">
            <ArrowDownWideNarrow size={18} color="#6b7280" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ border: 'none', backgroundColor: 'transparent', fontSize: '14px', fontWeight: '600', color: '#4b5563', outline: 'none', cursor: 'pointer' }}>
              <option value="newest">Сначала новые</option>
              <option value="deadline_asc">По дедлайну (Ближайшие)</option>
              <option value="progress_asc">Меньше готовность (%)</option>
              <option value="progress_desc">Больше готовность (%)</option>
            </select>
          </div>
        </div>
      )}

      <AddProjectModal 
        isOpen={isAddModalOpen} 
        onClose={() => { setIsAddModalOpen(false); setProjectPhoto(null); }} 
        onSubmit={handleAddProject} 
        loading={loading}
        name={newProjectName} setName={setNewProjectName}
        address={newProjectAddress} setAddress={setNewProjectAddress}
        manager={newProjectManager} setManager={setNewProjectManager}
        managerPhone={newProjectManagerPhone} setManagerPhone={setNewProjectManagerPhone}
        deadline={newProjectDeadline} setDeadline={setNewProjectDeadline}
        lat={newProjectLat} setLat={setNewProjectLat}
        lng={newProjectLng} setLng={setNewProjectLng}
        photo={projectPhoto} setPhoto={setProjectPhoto}
      />

      <EditProjectModal 
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setEditingProject(null); setEditPhoto(null); }}
        onSubmit={handleEditSubmit}
        loading={loading}
        project={editingProject} setProject={setEditingProject}
        photo={editPhoto} setPhoto={setEditPhoto}
      />

      <div style={{ display: 'grid', gap: '24px' }}>
        {filteredProjects.map((project, index) => (
          <ProjectCard 
            key={project.id} project={project} index={index} user={user}
            isExpanded={expandedProjects[project.id]}
            onToggleExpand={() => setExpandedProjects(prev => ({ ...prev, [project.id]: !prev[project.id] }))}
            onEdit={(e) => { e.stopPropagation(); setEditingProject({ ...project }); setEditPhoto(null); setIsEditModalOpen(true); }}
            onToggleArchive={handleToggleArchive} onDelete={handleDeleteProject}
          />
        ))}
        {filteredProjects.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280', backgroundColor: '#fff', borderRadius: '24px', border: '2px dashed #e5e7eb', fontSize: '16px', fontWeight: '600' }}>
            Нет объектов в данной категории.
          </div>
        )}
      </div>
    </div>
  );
}