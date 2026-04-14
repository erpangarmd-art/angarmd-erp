import AddProject from './AddProject';
import ProjectList from './ProjectList';

function App() {
  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '600px', 
      margin: '0 auto', 
      fontFamily: 'sans-serif' 
    }}>
      <h1 style={{ textAlign: 'center' }}>SmartCoffee ERP</h1>
      {/* Форма добавления */}
      <AddProject /> 
      {/* Список объектов */}
      <ProjectList /> 
    </div>
  );
}

export default App;