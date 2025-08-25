const express = require('express');
const { spawn } = require('child_process');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const PORT = 8080;

// RTSP bilgileri
const RTSP_URL = 'rtsp://admin:admin@192.168.1.187:554/12';

// Static dosyalar
app.use(express.static('.'));

// Ana sayfa
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'webrtc-client.html'));
});

// WebSocket sunucusu
const server = app.listen(PORT, () => {
    console.log(`🚀 WebRTC sunucu başlatıldı: http://localhost:${PORT}`);
    console.log(`📷 RTSP URL: ${RTSP_URL}`);
});

const wss = new WebSocket.Server({ server });

// Her client için FFmpeg process'i
const clients = new Map();

wss.on('connection', (ws) => {
    console.log('✅ Yeni client bağlandı');

    // FFmpeg ile RTSP'den WebSocket'e stream
    const ffmpeg = spawn('ffmpeg', [
        '-rtsp_transport', 'tcp',
        '-fflags', 'nobuffer',
        '-flags', 'low_delay',
        '-i', RTSP_URL,
        '-f', 'mpegts',
        '-codec:v', 'mpeg1video',
        '-b:v', '1000k',
        '-r', '30',
        '-bf', '0',
        '-codec:a', 'mp2',
        '-ar', '44100',
        '-ac', '1',
        '-b:a', '128k',
        'pipe:1'
    ]);

    clients.set(ws, ffmpeg);

    // FFmpeg çıktısını WebSocket'e gönder
    ffmpeg.stdout.on('data', (data) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
        }
    });

    ffmpeg.stderr.on('data', (data) => {
        // FFmpeg log'ları (debug için)
        console.log(`FFmpeg: ${data}`);
    });

    // Client bağlantısı kesildiğinde
    ws.on('close', () => {
        console.log('❌ Client bağlantısı kesildi');
        const ffmpeg = clients.get(ws);
        if (ffmpeg) {
            ffmpeg.kill('SIGTERM');
            clients.delete(ws);
        }
    });

    ws.on('error', (err) => {
        console.error('WebSocket hatası:', err);
    });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Sunucu kapatılıyor...');
    clients.forEach((ffmpeg, ws) => {
        ffmpeg.kill('SIGTERM');
        ws.close();
    });
    server.close(() => {
        console.log('✅ Sunucu kapatıldı');
        process.exit(0);
    });
});
