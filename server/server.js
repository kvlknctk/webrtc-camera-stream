require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { Server: SocketIO } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

// Logger yapılandırması
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.simple()
        }),
        new winston.transports.File({ 
            filename: process.env.LOG_FILE || '/var/log/stream-server.log' 
        })
    ]
});

// Express app
const app = express();
const server = http.createServer(app);

// Middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors({
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: 100 // limit her IP için 100 istek
});
app.use('/api/', limiter);

// WebSocket sunucusu
const wss = new WebSocket.Server({ 
    server,
    path: '/stream'
});

// Socket.IO sunucusu (signaling için)
const io = new SocketIO(server, {
    cors: {
        origin: process.env.CORS_ORIGINS?.split(',') || '*',
        methods: ['GET', 'POST']
    }
});

// Stream yönetimi
class StreamManager {
    constructor() {
        this.streams = new Map(); // streamId -> stream bilgisi
        this.publishers = new Map(); // publisherId -> WebRTC bağlantısı
        this.viewers = new Map(); // viewerId -> stream listesi
    }

    createStream(publisherId, metadata) {
        const streamId = uuidv4();
        const stream = {
            id: streamId,
            publisherId: publisherId,
            metadata: metadata,
            viewers: new Set(),
            createdAt: new Date(),
            bitrate: process.env.STREAM_BITRATE || '1000k',
            fps: process.env.STREAM_FPS || 30
        };
        
        this.streams.set(streamId, stream);
        logger.info(`Stream oluşturuldu: ${streamId}`);
        return stream;
    }

    addViewer(streamId, viewerId) {
        const stream = this.streams.get(streamId);
        if (stream) {
            if (stream.viewers.size >= (process.env.MAX_CLIENTS_PER_STREAM || 50)) {
                return { success: false, error: 'Stream kapasitesi dolu' };
            }
            stream.viewers.add(viewerId);
            logger.info(`İzleyici eklendi: ${viewerId} -> ${streamId}`);
            return { success: true };
        }
        return { success: false, error: 'Stream bulunamadı' };
    }

    removeViewer(streamId, viewerId) {
        const stream = this.streams.get(streamId);
        if (stream) {
            stream.viewers.delete(viewerId);
            logger.info(`İzleyici çıkarıldı: ${viewerId} <- ${streamId}`);
        }
    }

    removeStream(streamId) {
        const stream = this.streams.get(streamId);
        if (stream) {
            // Tüm izleyicileri bilgilendir
            stream.viewers.forEach(viewerId => {
                const viewer = io.sockets.sockets.get(viewerId);
                if (viewer) {
                    viewer.emit('stream-ended', { streamId });
                }
            });
            this.streams.delete(streamId);
            logger.info(`Stream sonlandırıldı: ${streamId}`);
        }
    }

    getActiveStreams() {
        return Array.from(this.streams.values()).map(stream => ({
            id: stream.id,
            metadata: stream.metadata,
            viewerCount: stream.viewers.size,
            createdAt: stream.createdAt
        }));
    }
}

const streamManager = new StreamManager();

// WebRTC Signaling
io.on('connection', (socket) => {
    logger.info(`Yeni bağlantı: ${socket.id}`);

    // Yayıncı kaydı (kamera uygulaması)
    socket.on('register-publisher', (data) => {
        const stream = streamManager.createStream(socket.id, data.metadata);
        socket.emit('stream-created', { 
            streamId: stream.id,
            iceServers: getIceServers()
        });
        
        // Tüm kullanıcılara yeni stream bildirimi
        socket.broadcast.emit('new-stream', {
            streamId: stream.id,
            metadata: stream.metadata
        });
    });

    // İzleyici kaydı (web kullanıcıları)
    socket.on('join-stream', (data) => {
        const result = streamManager.addViewer(data.streamId, socket.id);
        if (result.success) {
            socket.join(`stream-${data.streamId}`);
            socket.emit('joined-stream', { 
                streamId: data.streamId,
                iceServers: getIceServers()
            });
        } else {
            socket.emit('error', result.error);
        }
    });

    // WebRTC signaling mesajları
    socket.on('offer', (data) => {
        socket.to(`stream-${data.streamId}`).emit('offer', {
            offer: data.offer,
            from: socket.id
        });
    });

    socket.on('answer', (data) => {
        socket.to(data.to).emit('answer', {
            answer: data.answer,
            from: socket.id
        });
    });

    socket.on('ice-candidate', (data) => {
        if (data.to) {
            socket.to(data.to).emit('ice-candidate', {
                candidate: data.candidate,
                from: socket.id
            });
        } else {
            socket.to(`stream-${data.streamId}`).emit('ice-candidate', {
                candidate: data.candidate,
                from: socket.id
            });
        }
    });

    // Stream listesi
    socket.on('get-streams', () => {
        socket.emit('streams-list', streamManager.getActiveStreams());
    });

    // Bağlantı koptuğunda
    socket.on('disconnect', () => {
        logger.info(`Bağlantı koptu: ${socket.id}`);
        
        // Eğer yayıncıysa stream'i kaldır
        streamManager.streams.forEach((stream, streamId) => {
            if (stream.publisherId === socket.id) {
                streamManager.removeStream(streamId);
            } else {
                // İzleyiciyse listeden çıkar
                streamManager.removeViewer(streamId, socket.id);
            }
        });
    });
});

// ICE sunucu yapılandırması
function getIceServers() {
    const servers = {
        iceServers: []
    };
    
    // STUN sunucuları
    if (process.env.WEBRTC_STUN_SERVERS) {
        process.env.WEBRTC_STUN_SERVERS.split(',').forEach(server => {
            servers.iceServers.push({ urls: server.trim() });
        });
    }
    
    // TURN sunucusu
    if (process.env.WEBRTC_TURN_SERVER) {
        servers.iceServers.push({
            urls: process.env.WEBRTC_TURN_SERVER,
            username: process.env.WEBRTC_TURN_USERNAME,
            credential: process.env.WEBRTC_TURN_PASSWORD
        });
    }
    
    return servers;
}

// API Endpoints
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date()
    });
});

app.get('/api/streams', (req, res) => {
    res.json({
        streams: streamManager.getActiveStreams(),
        totalStreams: streamManager.streams.size
    });
});

app.get('/api/stats', (req, res) => {
    const stats = {
        totalStreams: streamManager.streams.size,
        totalViewers: Array.from(streamManager.streams.values())
            .reduce((acc, stream) => acc + stream.viewers.size, 0),
        uptime: process.uptime(),
        memory: process.memoryUsage()
    };
    res.json(stats);
});

// Sunucuyu başlat
const PORT = process.env.SERVER_PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 WebRTC Stream Server başlatıldı`);
    logger.info(`📡 HTTP Port: ${PORT}`);
    logger.info(`🌐 WebSocket: ws://localhost:${PORT}/stream`);
    logger.info(`⚡ Socket.IO: ws://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM sinyali alındı, sunucu kapatılıyor...');
    server.close(() => {
        logger.info('Sunucu kapatıldı');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT sinyali alındı, sunucu kapatılıyor...');
    server.close(() => {
        logger.info('Sunucu kapatıldı');
        process.exit(0);
    });
});