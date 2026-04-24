import React, { useEffect, useRef } from 'react';

export default function ProjectMap({ projects }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    // Ждем, пока загрузится Google Maps API
    if (!window.google) return;

    // Инициализируем карту один раз
    if (!mapInstance.current) {
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 47.0105, lng: 28.8638 }, // Центр Молдовы (Кишинев)
        zoom: 7,
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
          // Легкий светлый стиль для премиального вида
          { featureType: "water", elementType: "geometry", stylers: [{ color: "#e9e9e9" }, { lightness: 17 }] },
          { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f5f5f5" }, { lightness: 20 }] },
          { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: "#ffffff" }, { lightness: 17 }] },
          { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#ffffff" }, { lightness: 29 }, { weight: 0.2 }] },
          { featureType: "poi", elementType: "geometry", stylers: [{ color: "#f5f5f5" }, { lightness: 21 }] },
          { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#dedede" }, { lightness: 21 }] },
          { elementType: "labels.text.stroke", stylers: [{ visibility: "on" }, { color: "#ffffff" }, { lightness: 16 }] },
          { elementType: "labels.text.fill", stylers: [{ saturation: 36 }, { color: "#333333" }, { lightness: 40 }] },
          { elementType: "labels.icon", stylers: [{ visibility: "off" }] }
        ]
      });
    }

    // Очищаем старые маркеры при обновлении данных
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const infoWindow = new window.google.maps.InfoWindow();

    // Добавляем маркеры для активных объектов с GPS
    projects.forEach(project => {
      if (project.lat && project.lng && project.status !== 'Архив') {
        const isFinished = (project.progress || 0) === 100;
        
        const marker = new window.google.maps.Marker({
          position: { lat: project.lat, lng: project.lng },
          map: mapInstance.current,
          title: project.name,
          // Зеленый пин для готовых, красный для тех, что в работе
          icon: isFinished 
            ? 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' 
            : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
        });

        // Всплывающее окно при клике на пин
        marker.addListener('click', () => {
          infoWindow.setContent(`
            <div style="padding: 8px; font-family: sans-serif; min-width: 150px;">
              <div style="font-size: 15px; font-weight: 900; color: #111827; margin-bottom: 4px;">${project.name}</div>
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">👷 Прораб: <b>${project.manager || 'Не указан'}</b></div>
              <div style="display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: bold; background-color: ${isFinished ? '#dcfce7' : '#fee2e2'}; color: ${isFinished ? '#059669' : '#dc2626'};">
                Готовность: ${project.progress || 0}%
              </div>
            </div>
          `);
          infoWindow.open(mapInstance.current, marker);
        });

        markersRef.current.push(marker);
      }
    });
  }, [projects]);

  return (
    <div style={{ width: '100%', height: '400px', borderRadius: '24px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', marginBottom: '30px', animation: 'fadeIn 0.4s ease-out' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}