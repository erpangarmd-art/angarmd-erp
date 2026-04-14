import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';

export default function ProjectList() {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    // Подписываемся на обновления базы в реальном времени
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProjects(projectsData);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div style={{ marginTop: '40px', textAlign: 'left' }}>
      <h2 style={{ borderBottom: '2px solid #333', paddingBottom: '10px' }}>Список объектов</h2>
      <div style={{ display: 'grid', gap: '15px', marginTop: '20px' }}>
        {projects.map(project => (
          <div key={project.id} style={{ 
            padding: '15px', 
            border: '1px solid #ddd', 
            borderRadius: '8px', 
            backgroundColor: 'white',
            boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
          }}>
            <strong style={{ fontSize: '18px', display: 'block' }}>{project.name}</strong>
            <span style={{ color: '#666' }}>📍 {project.address}</span>
            <div style={{ marginTop: '10px' }}>
              <span style={{ 
                fontSize: '12px', 
                padding: '3px 8px', 
                borderRadius: '12px', 
                backgroundColor: project.status === 'active' ? '#e8f5e9' : '#f5f5f5',
                color: project.status === 'active' ? '#2e7d32' : '#666',
                border: '1px solid'
              }}>
                {project.status === 'active' ? 'В работе' : 'Архив'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}