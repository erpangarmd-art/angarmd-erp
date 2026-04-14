import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase'; // Убедись, что путь к твоему файлу firebase.js правильный

export default function AddProject() {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    status: 'active'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Добавляем новый документ в коллекцию projects
      const docRef = await addDoc(collection(db, 'projects'), {
        name: formData.name,
        address: formData.address,
        status: formData.status,
        createdAt: new Date() // Сразу добавим дату создания для порядка
      });
      
      setMessage('✅ Объект успешно добавлен!');
      // Очищаем форму
      setFormData({ name: '', address: '', status: 'active' });
    } catch (error) {
      console.error("Ошибка при добавлении: ", error);
      setMessage('❌ Ошибка при добавлении объекта');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md border">
      <h2 className="text-2xl font-bold mb-6">Добавить новый объект</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Название объекта
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Например: Ангар Северный"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Адрес
          </label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Город, улица..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Статус
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="active">В работе</option>
            <option value="completed">Завершен</option>
            <option value="paused">Приостановлен</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 px-4 text-white font-bold rounded-md transition-colors ${
            loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? 'Сохранение...' : 'Добавить объект'}
        </button>

        {message && (
          <p className="mt-4 text-center text-sm font-medium text-gray-800">
            {message}
          </p>
        )}
      </form>
    </div>
  );
}