// Merkezi Konfigürasyon Dosyası
// Tüm ayarlar buradan yönetilir

const os = require('os');
const path = require('path');

// .env dosyasını yükle
require('dotenv').config();

const config = {
    // Kamera Ayarları
    camera: {
        ip: process.env.CAMERA_IP || '192.168.1.41',
        username: process.env.CAMERA_USER || 'admin',
        password: process.env.CAMERA_PASS || 'admin',
        rtspPort: process.env.RTSP_PORT || '554',
        rtspPath: process.env.RTSP_PATH || '/12',
        httpPort: '80'
    },

    // Sunucu Ayarları
    server: {
        port: process.env.SERVER_PORT || 8080,
        ptzPort: process.env.PTZ_PORT || 3001
    },

    // FFmpeg Ayarları
    ffmpeg: {
        // Windows için ffmpeg yolu
        path: process.env.FFMPEG_PATH || (os.platform() === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'),
        
        // RTSP ayarları
        rtspTransport: 'tcp',
        
        // Video encoding ayarları
        videoCodec: 'mpeg1video',
        videoBitrate: '1000k',
        videoFps: '30',
        bufferSize: '0',
        
        // Audio encoding ayarları
        audioCodec: 'mp2',
        audioSampleRate: '44100',
        audioChannels: '1',
        audioBitrate: '128k'
    },

    // Platform özgü ayarlar
    platform: {
        isWindows: os.platform() === 'win32',
        isMac: os.platform() === 'darwin',
        isLinux: os.platform() === 'linux'
    }
};

// Dinamik URL oluşturucular
config.getRtspUrl = () => {
    const { ip, username, password, rtspPort, rtspPath } = config.camera;
    return `rtsp://${username}:${password}@${ip}:${rtspPort}${rtspPath}`;
};

config.getCameraHttpUrl = () => {
    const { ip, httpPort } = config.camera;
    return `http://${ip}:${httpPort}`;
};

config.getPtzControlUrl = (action, speed = 45) => {
    const baseUrl = config.getCameraHttpUrl();
    return `${baseUrl}/web/cgi-bin/hi3510/ptzctrl.cgi?-step=0&-act=${action}&-speed=${speed}`;
};

// FFmpeg komut parametrelerini oluştur
config.getFFmpegArgs = (inputUrl) => {
    const { ffmpeg } = config;
    return [
        '-rtsp_transport', ffmpeg.rtspTransport,
        '-fflags', 'nobuffer',
        '-flags', 'low_delay',
        '-i', inputUrl,
        '-f', 'mpegts',
        '-codec:v', ffmpeg.videoCodec,
        '-b:v', ffmpeg.videoBitrate,
        '-r', ffmpeg.videoFps,
        '-bf', ffmpeg.bufferSize,
        '-codec:a', ffmpeg.audioCodec,
        '-ar', ffmpeg.audioSampleRate,
        '-ac', ffmpeg.audioChannels,
        '-b:a', ffmpeg.audioBitrate,
        'pipe:1'
    ];
};

// Konfigürasyon bilgilerini yazdır
config.printConfig = () => {
    console.log('\n📋 Konfigürasyon Bilgileri:');
    console.log('================================');
    console.log(`📷 Kamera IP: ${config.camera.ip}`);
    console.log(`🔗 RTSP URL: ${config.getRtspUrl()}`);
    console.log(`🌐 HTTP Port: ${config.server.port}`);
    console.log(`🎮 PTZ Port: ${config.server.ptzPort}`);
    console.log(`💻 Platform: ${process.platform}`);
    console.log(`🎬 FFmpeg Path: ${config.ffmpeg.path}`);
    console.log('================================\n');
};

module.exports = config;