const express = require('express');
const { spawn } = require('child_process');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const config = require('./config');

const app = express();
const PORT = config.server.port;

// RTSP URL merkezi config'den alınıyor
const RTSP_URL = config.getRtspUrl();

// Static files
app.use(express.static('.'));

// Home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'webrtc-client.html'));
});

// FFmpeg kontrolü
function checkFFmpeg() {
    const { exec } = require('child_process');
    const ffmpegCmd = config.ffmpeg.path;
    
    return new Promise((resolve) => {
        exec(`${ffmpegCmd} -version`, (error) => {
            if (error) {
                console.error('⚠️  FFmpeg bulunamadı!');
                console.log('📥 FFmpeg kurulum bilgisi:');
                if (config.platform.isWindows) {
                    console.log('   Windows: https://www.gyan.dev/ffmpeg/builds/');
                    console.log('   1. Full build\'i indirin');
                    console.log('   2. ffmpeg.exe\'yi bu klasöre kopyalayın veya PATH\'e ekleyin');
                } else if (config.platform.isMac) {
                    console.log('   Mac: brew install ffmpeg');
                } else {
                    console.log('   Linux: sudo apt-get install ffmpeg');
                }
                resolve(false);
            } else {
                console.log('✅ FFmpeg bulundu');
                resolve(true);
            }
        });
    });
}

// WebSocket server
const server = app.listen(PORT, async () => {
    config.printConfig();
    
    const ffmpegOk = await checkFFmpeg();
    if (!ffmpegOk && !config.platform.isWindows) {
        console.log('⚠️  FFmpeg olmadan stream çalışmayacak!');
    }
    
    console.log(`🚀 WebRTC server başlatıldı: http://localhost:${PORT}`);
});

const wss = new WebSocket.Server({ server });

// FFmpeg process for each client
const clients = new Map();

wss.on('connection', (ws) => {
    console.log('✅ Yeni client bağlandı');

    // FFmpeg process'i güvenli başlat
    let ffmpeg;
    
    try {
        const ffmpegPath = config.ffmpeg.path;
        const args = config.getFFmpegArgs(RTSP_URL);
        
        console.log(`🎬 FFmpeg başlatılıyor: ${ffmpegPath}`);
        
        ffmpeg = spawn(ffmpegPath, args, {
            windowsHide: true, // Windows'ta konsol penceresi açılmasını engelle
            shell: false
        });
    } catch (error) {
        console.error('❌ FFmpeg başlatma hatası:', error.message);
        ws.send(JSON.stringify({ 
            error: 'FFmpeg başlatılamadı. Lütfen FFmpeg kurulumunu kontrol edin.' 
        }));
        ws.close();
        return;
    }

    clients.set(ws, ffmpeg);

    // Send FFmpeg output to WebSocket
    ffmpeg.stdout.on('data', (data) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
        }
    });

    ffmpeg.stderr.on('data', (data) => {
        // FFmpeg loglarını sadece hata durumunda göster
        const log = data.toString();
        if (log.includes('error') || log.includes('Error')) {
            console.error(`FFmpeg Hata: ${log}`);
        }
    });

    ffmpeg.on('error', (error) => {
        console.error('❌ FFmpeg process hatası:', error.message);
        if (error.code === 'ENOENT') {
            console.log('💡 FFmpeg bulunamadı. Kurulum için:');
            console.log('   https://www.gyan.dev/ffmpeg/builds/');
        }
    });

    // When client disconnects
    ws.on('close', () => {
        console.log('❌ Client disconnected');
        const ffmpeg = clients.get(ws);
        if (ffmpeg) {
            ffmpeg.kill('SIGTERM');
            clients.delete(ws);
        }
    });

    ws.on('error', (err) => {
        console.error('WebSocket error:', err);
    });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Server shutting down...');
    clients.forEach((ffmpeg, ws) => {
        ffmpeg.kill('SIGTERM');
        ws.close();
    });
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});
