const express = require('express');
const { spawn } = require('child_process');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const PORT = 8080;

// RTSP information
const RTSP_URL = 'rtsp://admin:admin@192.168.1.187:554/12';

// Static files
app.use(express.static('.'));

// Home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'webrtc-client.html'));
});

// WebSocket server
const server = app.listen(PORT, () => {
    console.log(`🚀 WebRTC server started: http://localhost:${PORT}`);
    console.log(`📷 RTSP URL: ${RTSP_URL}`);
});

const wss = new WebSocket.Server({ server });

// FFmpeg process for each client
const clients = new Map();

wss.on('connection', (ws) => {
    console.log('✅ New client connected');

    // Stream from RTSP to WebSocket with FFmpeg
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

    // Send FFmpeg output to WebSocket
    ffmpeg.stdout.on('data', (data) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
        }
    });

    ffmpeg.stderr.on('data', (data) => {
        // FFmpeg logs (for debug)
        console.log(`FFmpeg: ${data}`);
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
