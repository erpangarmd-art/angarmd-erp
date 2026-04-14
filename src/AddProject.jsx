// ... (начало кода оставляем прежним: импорты и логика handleSubmit) ...
  return (
    <div style={{ 
      backgroundColor: '#fff', 
      padding: '25px', 
      borderRadius: '4px', 
      borderTop: '4px solid #e31e24', // Красная линия как акцент
      boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
      marginBottom: '30px'
    }}>
      <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', color: '#1a1a1a' }}>Новый заказ</h2>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px' }}>
        <input
          name="name"
          placeholder="Название объекта (например: Ангар 500м2)"
          value={formData.name}
          onChange={handleChange}
          required
          style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px' }}
        />
        <input
          name="address"
          placeholder="Местоположение / Район"
          value={formData.address}
          onChange={handleChange}
          required
          style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px' }}
        />
        <select 
          name="status" 
          value={formData.status} 
          onChange={handleChange} 
          style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px', backgroundColor: '#fff' }}
        >
          <option value="active">В процессе строительства</option>
          <option value="completed">Сдан в эксплуатацию</option>
          <option value="paused">Заморожен</option>
        </select>
        <button 
          type="submit" 
          disabled={loading} 
          style={{ 
            padding: '15px', 
            backgroundColor: loading ? '#ccc' : '#1a1a1a', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '4px', 
            fontSize: '16px', 
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background 0.3s'
          }}
        >
          {loading ? 'СОХРАНЕНИЕ...' : 'ДОБАВИТЬ В БАЗУ'}
        </button>
        {message && <p style={{ textAlign: 'center', fontWeight: 'bold', color: message.includes('✅') ? 'green' : 'red' }}>{message}</p>}
      </form>
    </div>
  );
}