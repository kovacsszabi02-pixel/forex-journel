import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Statikus fájlok kiszolgálása
app.use(express.static(path.join(__dirname, 'public')));

// Egészségügyi ellenőrző végpont
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Forex Journal Server fut a Renderen!' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});