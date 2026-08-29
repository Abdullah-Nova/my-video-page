const express = require('express');
const fs = require('fs');
const app = express();
const port = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

app.post('/collect', (req, res) => {
    const data = req.body;
    const logEntry = {
        timestamp: new Date().toISOString(),
        ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        ...data
    };
    fs.appendFileSync('data.log', JSON.stringify(logEntry, null, 2) + '\n' + '='.repeat(80) + '\n');
    console.log('Data received at', new Date().toISOString());
    res.sendStatus(200);
});

app.get('/view', (req, res) => {
    if (fs.existsSync('data.log')) {
        const content = fs.readFileSync('data.log', 'utf8');
        res.send(`<pre style="font-size:12px;background:#0a0a0a;color:#00ff88;padding:20px;border-radius:10px;max-width:100%;overflow-x:auto;">${content}</pre>`);
    } else {
        res.send('No data yet.');
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
