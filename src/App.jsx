import AddProject from './AddProject';
import ProjectList from './ProjectList';

function App() {
  return (
    <div style={{ 
      backgroundColor: '#f4f6f8', 
      minHeight: '100vh',
      fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    }}>
      {/* Шапка в стиле Angar.md */}
      <header style={{ 
        backgroundColor: '#1a1a1a', 
        padding: '15px 20px', 
        display: 'flex', 
        alignItems: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
      }}>
        <div style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          color: '#fff', 
          letterSpacing: '1px' 
        }}>
          ANGAR<span style={{ color: '#e31e24' }}>.</span>MD
        </div>
        <div style={{ 
          marginLeft: '20px', 
          paddingLeft: '20px', 
          borderLeft: '1px solid #444', 
          color: '#aaa',
          fontSize: '14px',
          textTransform: 'uppercase'
        }}>
          Система управления объектами
        </div>
      </header>

      <main style={{ 
        padding: '30px 20px', 
        maxWidth: '900px', 
        margin: '0 auto' 
      }}>
        <AddProject />
        <ProjectList />
      </main>
    </div>
  );
}

export default App;