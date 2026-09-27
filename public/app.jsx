import React, { useState, useEffect } from 'react';

function App() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [trades, setTrades] = useState([]);
  const [analytics, setAnalytics] = useState({});
  
  // Kalkulátor statek
  const [balance, setBalance] = useState(10000);
  const [riskPercent, setRiskPercent] = useState(1);
  const [slPips, setSlPips] = useState(20);

  const userId = 1; // Teszt felhasználó ID

  useEffect(() => {
    fetch(`http://localhost:5001/api/trades/${userId}`)
      .then(res => res.json())
      .then(data => setTrades(data))
      .catch(err => console.log('Szerver kapcsolat hiba:', err));

    fetch(`http://localhost:5001/api/analytics/${userId}`)
      .then(res => res.json())
      .then(data => setAnalytics(data))
      .catch(err => console.log('Szerver kapcsolat hiba:', err));
  }, []);

  // Lot méret számítás
  const riskAmount = (balance * (riskPercent / 100)).toFixed(2);
  const calculatedLot = (riskAmount / (slPips * 10)).toFixed(2);

  return (
    <div style={{ backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif', padding: '20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '15px', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', color: '#38bdf8' }}>⚡ Pro Trading Journal</h1>
        <nav style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setActiveTab('calendar')} style={btnStyle(activeTab === 'calendar')}>📅 Naptár & Napló</button>
          <button onClick={() => setActiveTab('calculator')} style={btnStyle(activeTab === 'calculator')}>🧮 Lot Kalkulátor</button>
          <button onClick={() => setActiveTab('analytics')} style={btnStyle(activeTab === 'analytics')}>📊 Kimutatások</button>
          <button onClick={() => setActiveTab('playbook')} style={btnStyle(activeTab === 'playbook')}>📜 Playbook</button>
        </nav>
      </header>

      {/* 1. NAPTÁR & NAPLÓ NÉZET */}
      {activeTab === 'calendar' && (
        <div>
          <h2>Havi Naptár & Trade Napló</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', marginTop: '20px' }}>
            {['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'].map(day => (
              <div key={day} style={{ textAlign: 'center', fontWeight: 'bold', color: '#94a3b8' }}>{day}</div>
            ))}
            {[...Array(31)].map((_, i) => {
              const dayNum = i + 1;
              const trade = trades.find(t => new Date(t.trade_date).getDate() === dayNum);
              let bg = '#1e293b';
              if (trade) {
                if (trade.is_no_trade_day) bg = '#475569';
                else if (Number(trade.profit_eur) > 0) bg = '#065f46';
                else bg = '#7f1d1d';
              }
              return (
                <div key={i} style={{ backgroundColor: bg, padding: '15px', borderRadius: '8px', minHeight: '80px', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{dayNum}</div>
                  {trade && (
                    <div style={{ fontSize: '12px', marginTop: '5px' }}>
                      {trade.is_no_trade_day ? 'No Trade' : `${trade.profit_eur} €`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. KALKULÁTOR NÉZET */}
      {activeTab === 'calculator' && (
        <div style={{ maxWidth: '400px', background: '#1e293b', padding: '20px', borderRadius: '8px', border: '1px solid #334155' }}>
          <h2>Kockázat & Lot Kalkulátor</h2>
          <div style={{ marginBottom: '15px' }}>
            <label>Számlaegyenleg (€):</label>
            <input type="number" value={balance} onChange={e => setBalance(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label>Kockázat (%):</label>
            <input type="number" value={riskPercent} onChange={e => setRiskPercent(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label>Stop Loss (pips):</label>
            <input type="number" value={slPips} onChange={e => setSlPips(e.target.value)} style={inputStyle} />
          </div>
          <hr style={{ borderColor: '#334155' }} />
          <p>Kockáztatott összeg: <strong>{riskAmount} €</strong></p>
          <p>Ajánlott Lot méret: <strong style={{ color: '#38bdf8', fontSize: '18px' }}>{calculatedLot} Lot</strong></p>
        </div>
      )}

      {/* 3. KIMUTATÁSOK NÉZET */}
      {activeTab === 'analytics' && (
        <div>
          <h2>Teljesítmény Kimutatások</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginTop: '20px' }}>
            <Card title="Összes Kötés" value={analytics.totalTrades || 0} />
            <Card title="Win Rate" value={`${analytics.winRate || 0}%`} />
            <Card title="Nettó Profit" value={`${analytics.totalProfit || 0} €`} color={analytics.totalProfit >= 0 ? '#34d399' : '#f87171'} />
          </div>
        </div>
      )}

      {/* 4. PLAYBOOK NÉZET */}
      {activeTab === 'playbook' && (
        <div>
          <h2>Stratégia & Playbook</h2>
          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '8px', border: '1px solid #334155' }}>
            <h3>Hard Rules (Szigorú Szabályok)</h3>
            <ul>
              <li>Max 1 Trade / Nap</li>
              <li>Hírmentes zónák szigorú betartása (15 perces hír-ablak tilalom)</li>
              <li>Havi -5% hard stop limit</li>
            </ul>
            <h3>Setup Mátrix</h3>
            <p>1. Sima Continuation | 2. Retracement | 3. Deep Retracement | 4. Sima Fordulás | 5. Sweep Fordulás</p>
          </div>
        </div>
      )}
    </div>
  );
}

const btnStyle = (active) => ({
  backgroundColor: active ? '#0284c7' : '#334155',
  color: '#fff',
  border: 'none',
  padding: '10px 15px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: 'bold'
});

const inputStyle = {
  width: '100%',
  padding: '8px',
  marginTop: '5px',
  borderRadius: '4px',
  border: '1px solid #475569',
  backgroundColor: '#0f172a',
  color: '#fff'
};

function Card({ title, value, color = '#fff' }) {
  return (
    <div style={{ background: '#1e293b', padding: '20px', borderRadius: '8px', border: '1px solid #334155' }}>
      <div style={{ color: '#94a3b8', fontSize: '14px' }}>{title}</div>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color, marginTop: '10px' }}>{value}</div>
    </div>
  );
}

export default App;