import AddProject from './AddProject';
import ProjectList from './ProjectList';

function App() {
  return (
    <div style={{ 
      backgroundColor: '#f4f6f8', 
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif',
      margin: 0
    }}>
      {/* Фирменный Header Angar.md */}
      <header style={{ 
        backgroundColor: '#1a1a1a', 
        padding: '15px 40px', 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
      }}>
        <div style={{ 
          fontSize: '26px', 
          fontWeight: '900', 
          color: '#fff', 
          letterSpacing: '1px' 
        }}>
          ANGAR<span style={{ color: '#e31e24' }}>.</span>MD
        </div>
        <div style={{ color: '#888', fontSize: '12px', textTransform: 'uppercase' }}>
          Панель управления проектами
        </div>
      </header>

      <main style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
        <AddProject />
        <ProjectList />
      </main>
    </div>
  );
}

export default App;