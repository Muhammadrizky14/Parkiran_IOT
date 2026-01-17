import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';

function App() {
  const [parkirData, setParkirData] = useState({
    carMasuk: 0,
    carKeluar: 0,
    slotTersisa: 10
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [dailyOffset, setDailyOffset] = useState(() => {
    const saved = localStorage.getItem('dailyOffset');
    return saved ? JSON.parse(saved) : { carMasuk: 0, carKeluar: 0, date: new Date().toDateString() };
  });

  const ANTARES_URL = "/~/antares-cse/antares-id/ParkiranSistem/slotParkir/la";
  const ANTARES_KEY = "cdc0fa731b316a1f:2a78b6b9b4ab366f";
  const MAX_SLOT = 10;

  // Fetch data dari Antares
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(ANTARES_URL, {
        headers: {
          'X-M2M-Origin': ANTARES_KEY,
          'Accept': 'application/json'
        }
      });

      // Parse data dari response
      const content = response.data['m2m:cin'].con;
      const data = JSON.parse(content);

      // Cek apakah sudah ganti hari
      const currentDate = new Date().toDateString();
      let newOffset = dailyOffset;
      
      if (currentDate !== dailyOffset.date) {
        // Reset counter di hari baru
        newOffset = {
          carMasuk: data.carMasuk || 0,
          carKeluar: data.carKeluar || 0,
          date: currentDate
        };
        setDailyOffset(newOffset);
        localStorage.setItem('dailyOffset', JSON.stringify(newOffset));
      }

      // Hitung nilai relatif dari awal hari
      const carMasukToday = (data.carMasuk || 0) - newOffset.carMasuk;
      const carKeluarToday = (data.carKeluar || 0) - newOffset.carKeluar;

      setParkirData({
        carMasuk: Math.max(0, carMasukToday),
        carKeluar: Math.max(0, carKeluarToday),
        slotTersisa: data.slotTersisa || MAX_SLOT
      });

      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Gagal mengambil data dari Antares');
    } finally {
      setLoading(false);
    }
  };

  // Auto refresh setiap 3 detik
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const slotTerpakai = parkirData.carMasuk - parkirData.carKeluar;
  const slotTersedia = MAX_SLOT - slotTerpakai;
  const persentaseTerpakai = (slotTerpakai / MAX_SLOT) * 100;
  const isFull = slotTerpakai >= MAX_SLOT;

  return (
    <div className="App">
      <header className="header">
        <h1>🚗 Sistem Parkir Pintar</h1>
        <p className="subtitle">Monitoring Real-time via Antares IoT</p>
      </header>

      {error && (
        <div className="error-banner">
          ⚠️ {error}
        </div>
      )}

      <div className="container">
        {/* Status Parkir */}
        <div className={`status-card ${isFull ? 'full' : 'available'}`} 
             style={{ 
               backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(/baground.jpg)`,
               backgroundSize: '100% 100%',
               backgroundPosition: 'center',
               backgroundRepeat: 'no-repeat',
               height: '350px'
             }}>
          <div className="status-icon">
            {isFull ? '🔴' : '🟢'}
          </div>
          <h2>{isFull ? 'PARKIR PENUH' : 'PARKIR TERSEDIA'}</h2>
          <div className="slot-info">
            <span className="slot-number">{slotTersedia}</span>
            <span className="slot-label">Slot Parkir Tersedia</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-label">
            <span>Kapasitas Parkir</span>
            <span>{slotTerpakai} / {MAX_SLOT}</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: `${persentaseTerpakai}%`,
                backgroundColor: isFull ? '#ef4444' : '#3B82F6'
              }}
            >
              <span className="progress-text">{Math.round(persentaseTerpakai)}%</span>
            </div>
          </div>
        </div>

        {/* Cards Info */}
        <div className="cards-grid">
          <div className="info-card green">
            <div className="card-icon">🚙</div>
            <div className="card-content">
              <h3>Total Kendaraan Masuk</h3>
              <p className="card-number">{parkirData.carMasuk}</p>
            </div>
          </div>

          <div className="info-card blue">
            <div className="card-icon">🚙</div>
            <div className="card-content">
              <h3>Total Kendaraan Keluar</h3>
              <p className="card-number">{parkirData.carKeluar}</p>
            </div>
          </div>

          <div className="info-card orange">
            <div className="card-icon">🚙</div>
            <div className="card-content">
              <h3>Terpakai</h3>
              <p className="card-number">{slotTerpakai}</p>
            </div>
          </div>

          <div className="info-card purple">
            <div className="card-icon">🅿️</div>
            <div className="card-content">
              <h3>Parkir Tersedia</h3>
              <p className="card-number">{slotTersedia}</p>
            </div>
          </div>
        </div>

        {/* Last Update */}
        <div className="footer-info">
          {loading && <span className="loading">🔄 Memperbarui data...</span>}
          {lastUpdate && !loading && (
            <span className="last-update">
              ⏱️ Terakhir update: {lastUpdate.toLocaleTimeString('id-ID')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;