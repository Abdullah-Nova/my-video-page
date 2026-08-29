const express = require('express');
const fs = require('fs');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.post('/collect', (req, res) => {
    const data = req.body;
    const logEntry = {
        timestamp: new Date().toISOString(),
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        ...data
    };
    // حفظ في ملف TXT بصيغة واضحة
    const logLine = JSON.stringify(logEntry, null, 2) + '\n---\n';
    fs.appendFileSync('data.log', logLine);
    console.log('Data received:', logEntry);
    res.sendStatus(200);
});

app.get('/view', (req, res) => {
    if (fs.existsSync('data.log')) {
        const content = fs.readFileSync('data.log', 'utf8');
        res.send(`<pre>${content}</pre>`);
    } else {
        res.send('No data yet.');
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});