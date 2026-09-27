const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 1. Trade lekérdezése naptárhoz / dashboardhoz
app.get('/api/trades/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query('SELECT * FROM trades WHERE user_id = $1 ORDER BY trade_date DESC', [userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Új Trade vagy No Trade Day rögzítése
app.post('/api/trades', async (req, res) => {
  try {
    const {
      user_id, trade_date, is_no_trade_day, currency_pair,
      lot_size, sl_pips, r_multiple, profit_eur,
      setup_type, followed_rules, had_news_event,
      broke_news_rule, screenshot_url, psychology_notes
    } = req.body;

    const query = `
      INSERT INTO trades (
        user_id, trade_date, is_no_trade_day, currency_pair,
        lot_size, sl_pips, r_multiple, profit_eur,
        setup_type, followed_rules, had_news_event,
        broke_news_rule, screenshot_url, psychology_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *;
    `;
    
    const values = [
      user_id, trade_date, is_no_trade_day || false, currency_pair,
      lot_size, sl_pips, r_multiple, profit_eur,
      setup_type, followed_rules, had_news_event,
      broke_news_rule, screenshot_url, psychology_notes
    ];

    const newTrade = await pool.query(query, values);
    res.json(newTrade.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Statisztikák (Dashboard adatok számítása)
app.get('/api/analytics/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const trades = await pool.query('SELECT * FROM trades WHERE user_id = $1 AND is_no_trade_day = false', [userId]);
    
    const rows = trades.rows;
    const totalTrades = rows.length;
    const winningTrades = rows.filter(t => Number(t.profit_eur) > 0);
    const losingTrades = rows.filter(t => Number(t.profit_eur) < 0);
    
    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
    const totalProfit = rows.reduce((acc, t) => acc + Number(t.profit_eur), 0);
    
    res.json({
      totalTrades,
      winRate: winRate.toFixed(2),
      totalProfit: totalProfit.toFixed(2),
      winningCount: winningTrades.length,
      losingCount: losingTrades.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Trading Journal Server fut a ${PORT}-es porton`));