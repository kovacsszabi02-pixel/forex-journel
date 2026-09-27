let supabase = null;
let currentDate = new Date();
let tradesData = [];
let backtestsData = [];

// App inicializálása és Supabase kapcsolat
async function initApp() {
    try {
        const res = await fetch('/api/config');
        const config = await res.json();
        supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);

        await loadTrades();
        await loadBacktests();
        renderCalendar();
        initCharts();
    } catch (err) {
        console.error('Hiba az app indításakor:', err);
    }
}

// Fülek közötti váltás
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');
    if (event && event.target) event.target.classList.add('active');
}

// Trade-ek betöltése Supabase-ből
async function loadTrades() {
    const { data, error } = await supabase.from('trades').select('*');
    if (!error) {
        tradesData = data || [];
        updateDrawdownAndStats();
    } else {
        console.error('Hiba a trade-ek betöltésekor:', error);
    }
}

// Naptár kirajzolása
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthDisplay = document.getElementById('current-month-display');
    if (monthDisplay) monthDisplay.innerText = `${year}. ${month + 1}. Hónap`;

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTrade = tradesData.find(t => t.trade_date === dateStr);

        const cell = document.createElement('div');
        cell.className = 'day-cell';
        cell.onclick = () => openModal(dateStr, dayTrade);

        let statusHtml = `<strong>${day}</strong>`;
        if (dayTrade) {
            if (dayTrade.is_no_trade_day) {
                cell.classList.add('no-trade');
                statusHtml += `<br><small style="color: #94a3b8;">No Trade</small>`;
            } else {
                const isProfit = dayTrade.profit_eur >= 0;
                cell.classList.add(isProfit ? 'profit' : 'loss');
                statusHtml += `<br><span style="color:${isProfit ? '#22c55e' : '#ef4444'}">${dayTrade.profit_eur} €</span><br><small>${dayTrade.r_multiple}R</small>`;
            }
        }

        cell.innerHTML = statusHtml;
        grid.appendChild(cell);
    }
}

function changeMonth(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    renderCalendar();
}

// Trade Rögzítő Modal Kezelése
function openModal(dateStr, trade) {
    document.getElementById('modal-date').value = dateStr;
    document.getElementById('modal-date-title').innerText = `${dateStr} - Trade Rögzítése`;
    
    if (trade) {
        document.getElementById('is-no-trade').checked = trade.is_no_trade_day || false;
        document.getElementById('trade-pair').value = trade.pair || '';
        document.getElementById('trade-lot').value = trade.lot_size || '';
        document.getElementById('trade-sl').value = trade.sl_points || '';
        document.getElementById('trade-r').value = trade.r_multiple || '';
        document.getElementById('trade-profit').value = trade.profit_eur || '';
        document.getElementById('trade-setup').value = trade.setup_type || '1. Sima Continuation';
        document.getElementById('trade-rule').checked = trade.rule_followed !== false;
        document.getElementById('trade-news').checked = trade.has_high_impact_news || false;
        document.getElementById('trade-news-violation').checked = trade.traded_during_news || false;
        document.getElementById('trade-note').value = trade.note || '';
    } else {
        document.getElementById('trade-form').reset();
    }
    toggleNoTrade(document.getElementById('is-no-trade'));
    document.getElementById('trade-modal').style.display = 'block';
}

function closeModal() { 
    document.getElementById('trade-modal').style.display = 'none'; 
}

function toggleNoTrade(cb) {
    const fields = document.getElementById('trade-fields');
    if (fields) fields.style.display = cb.checked ? 'none' : 'block';
}

// Mentés Supabase Adatbázisba és Storage-ba
async function saveTrade(e) {
    e.preventDefault();
    const dateStr = document.getElementById('modal-date').value;
    const isNoTrade = document.getElementById('is-no-trade').checked;
    const fileInput = document.getElementById('trade-image');

    let imageUrl = null;
    if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fileName = `${dateStr}_${Date.now()}`;
        const { data, error } = await supabase.storage.from('trade-screenshots').upload(fileName, file);
        if (!error) {
            const { data: urlData } = supabase.storage.from('trade-screenshots').getPublicUrl(fileName);
            imageUrl = urlData.publicUrl;
        }
    }

    const payload = {
        trade_date: dateStr,
        is_no_trade_day: isNoTrade,
        pair: document.getElementById('trade-pair').value,
        lot_size: parseFloat(document.getElementById('trade-lot').value) || 0,
        sl_points: parseFloat(document.getElementById('trade-sl').value) || 0,
        r_multiple: parseFloat(document.getElementById('trade-r').value) || 0,
        profit_eur: parseFloat(document.getElementById('trade-profit').value) || 0,
        setup_type: document.getElementById('trade-setup').value,
        rule_followed: document.getElementById('trade-rule').checked,
        has_high_impact_news: document.getElementById('trade-news').checked,
        traded_during_news: document.getElementById('trade-news-violation').checked,
        note: document.getElementById('trade-note').value,
        ...(imageUrl && { image_url: imageUrl })
    };

    await supabase.from('trades').upsert(payload, { onConflict: 'trade_date' });
    closeModal();
    await loadTrades();
    renderCalendar();
}

// Kockázat és Lot Kalkulátor
function calculateLot() {
    const acc = parseFloat(document.getElementById('calc-account').value) || 0;
    const riskPct = parseFloat(document.getElementById('calc-risk-percent').value) || 0;
    const slPoints = parseFloat(document.getElementById('calc-sl-points').value) || 1;

    const riskEur = acc * (riskPct / 100);
    const lotSize = riskEur / (slPoints * 10);

    document.getElementById('calc-risk-eur').innerText = `${riskEur.toFixed(2)} €`;
    document.getElementById('calc-lot-output').innerText = `${lotSize.toFixed(2)} Lot`;
}

// Statisztika & Bővített Kiszámítások
function updateDrawdownAndStats() {
    let totalProfit = 0;
    let totalR = 0;
    let winCount = 0;
    let lossCount = 0;
    let totalTrades = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let totalLots = 0;

    tradesData.forEach(t => {
        if (!t.is_no_trade_day) {
            totalTrades++;
            totalProfit += (t.profit_eur || 0);
            totalR += (t.r_multiple || 0);
            totalLots += (t.lot_size || 0);

            if (t.profit_eur > 0) {
                winCount++;
                grossProfit += t.profit_eur;
            } else if (t.profit_eur < 0) {
                lossCount++;
                grossLoss += Math.abs(t.profit_eur);
            }
        }
    });

    const winRate = totalTrades ? ((winCount / totalTrades) * 100).toFixed(2) : '0.00';
    const avgProfit = winCount ? (grossProfit / winCount).toFixed(2) : '0.00';
    const avgLoss = lossCount ? (grossLoss / lossCount).toFixed(2) : '0.00';
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : (grossProfit > 0 ? '∞' : '0.00');
    const expectancy = totalTrades ? (totalProfit / totalTrades).toFixed(2) : '0.00';

    const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    };

    const initialAccount = 10000;
    const currentBalance = initialAccount + totalProfit;

    setTxt('stat-balance', `${currentBalance.toFixed(2)} €`);
    setTxt('stat-winrate', `${winRate}%`);
    setTxt('stat-avg-profit', `+${avgProfit} €`);
    setTxt('stat-avg-loss', `-${avgLoss} €`);
    setTxt('stat-num-trades', totalTrades);
    setTxt('stat-profit-factor', profitFactor);
    setTxt('stat-expectancy', `${expectancy} €`);
    setTxt('stat-total-lots', totalLots.toFixed(2));
    setTxt('stat-total-r', `${totalR.toFixed(1)} R`);

    // Havi Drawdown Figyelés (-5% Limit)
    const monthlyDD = (totalProfit / initialAccount) * 100;
    const ddElem = document.getElementById('monthly-dd-val');
    if (ddElem) {
        ddElem.innerText = `${monthlyDD.toFixed(2)}%`;
        ddElem.style.color = monthlyDD <= -5 ? '#ef4444' : '#f8fafc';
    }
}

// Diagramok Frissítése (Chart.js)
function initCharts() {
    const chartElem = document.getElementById('equityChart');
    if (!chartElem) return;

    const ctxEquity = chartElem.getContext('2d');
    new Chart(ctxEquity, {
        type: 'line',
        data: {
            labels: tradesData.map(t => t.trade_date),
            datasets: [{
                label: 'Equity Curve (€)',
                data: tradesData.map(t => t.profit_eur),
                borderColor: '#3b82f6',
                tension: 0.1
            }]
        }
    });
}

// Backtest Funkciók
async function loadBacktests() {
    const { data } = await supabase.from('backtests').select('*');
    backtestsData = data || [];
    renderBacktests();
}

function renderBacktests() {
    const tbody = document.getElementById('backtest-list');
    if (!tbody) return;
    tbody.innerHTML = backtestsData.map(b => `
        <tr>
            <td>${b.test_year}</td>
            <td>${b.test_week}</td>
            <td>${b.pair}</td>
            <td>${b.r_multiple}R</td>
            <td><span class="badge ${b.is_win ? 'green' : 'red'}">${b.is_win ? 'WIN' : 'LOSS'}</span></td>
        </tr>
    `).join('');
}

async function saveBacktest(e) {
    e.preventDefault();
    const payload = {
        test_year: parseInt(document.getElementById('bt-year').value),
        test_week: parseInt(document.getElementById('bt-week').value),
        pair: document.getElementById('bt-pair').value,
        r_multiple: parseFloat(document.getElementById('bt-r').value),
        is_win: document.getElementById('bt-win').value === 'true'
    };
    await supabase.from('backtests').insert(payload);
    await loadBacktests();
}

// Alkalmazás Indítása
window.onload = initApp;