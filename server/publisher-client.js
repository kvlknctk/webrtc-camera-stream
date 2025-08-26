// Kamera Uygulaması Publisher Client Örneği
// Bu dosya kamera tarafında çalışacak ve sunucuya video stream gönderecek

const io = require('socket.io-client');
const { spawn } = require('child_process');

// Konfigürasyon
const SERVER_URL = process.env.SERVER_URL || 'http://localhost';
const RTSP_URL = process.env.RTSP_URL || 'rtsp://admin:admin@192.168.1.187:554/12';
const CAMERA_NAME = process.env.CAMERA_NAME || 'Kamera 1';
const CAMERA_LOCATION = process.env.CAMERA_LOCATION || 'Ofis';

class CameraPublisher {
    constructor() {
        this.socket = null;
        this.peerConnection = null;
        this.streamId = null;
        this.mediaStream = null;
        this.ffmpegProcess = null;
    }

    async connect() {
        console.log(`📹 Sunucuya bağlanılıyor: ${SERVER_URL}`);
        
        this.socket = io(SERVER_URL, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: Infinity
        });

        this.setupSocketEvents();
    }

    setupSocketEvents() {
        this.socket.on('connect', () => {
            console.log('✅ Sunucuya bağlandı');
            this.registerAsPublisher();
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Sunucu bağlantısı koptu');
            this.cleanup();
        });

        this.socket.on('stream-created', async (data) => {
            console.log(`🎬 Stream oluşturuldu: ${data.streamId}`);
            this.streamId = data.streamId;
            await this.setupWebRTC(data.iceServers);
            this.startStreaming();
        });

        this.socket.on('answer', async (data) => {
            console.log('📝 Answer alındı');
            if (this.peerConnection) {
                await this.peerConnection.setRemoteDescription(data.answer);
            }
        });

        this.socket.on('ice-candidate', async (data) => {
            if (this.peerConnection && data.candidate) {
                await this.peerConnection.addIceCandidate(data.candidate);
            }
        });

        this.socket.on('error', (error) => {
            console.error('❌ Hata:', error);
        });
    }

    registerAsPublisher() {
        console.log('📝 Publisher olarak kaydolunuyor...');
        this.socket.emit('register-publisher', {
            metadata: {
                name: CAMERA_NAME,
                location: CAMERA_LOCATION,
                rtspUrl: RTSP_URL,
                resolution: '1920x1080',
                fps: 30
            }
        });
    }

    async setupWebRTC(iceServers) {
        console.log('🔧 WebRTC bağlantısı kuruluyor...');
        
        // RTCPeerConnection oluştur
        this.peerConnection = new RTCPeerConnection(iceServers);

        // ICE candidate handler
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('ice-candidate', {
                    streamId: this.streamId,
                    candidate: event.candidate
                });
            }
        };

        // Connection state handler
        this.peerConnection.onconnectionstatechange = () => {
            console.log(`📡 Bağlantı durumu: ${this.peerConnection.connectionState}`);
            if (this.peerConnection.connectionState === 'failed') {
                this.reconnect();
            }
        };

        // Media stream ekle (placeholder - gerçek uygulamada FFmpeg'den gelecek)
        await this.setupMediaStream();
        
        // Offer oluştur ve gönder
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        
        this.socket.emit('offer', {
            streamId: this.streamId,
            offer: offer
        });
    }

    async setupMediaStream() {
        // Bu örnekte basit bir test stream oluşturuyoruz
        // Gerçek uygulamada FFmpeg'den gelen stream kullanılacak
        
        try {
            // Canvas tabanlı test stream (gerçek uygulamada RTSP'den gelecek)
            const canvas = document.createElement('canvas');
            canvas.width = 1920;
            canvas.height = 1080;
            const ctx = canvas.getContext('2d');
            
            // Test pattern çiz
            const drawFrame = () => {
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#fff';
                ctx.font = '48px Arial';
                ctx.fillText(`${CAMERA_NAME} - ${new Date().toLocaleTimeString()}`, 50, 100);
                requestAnimationFrame(drawFrame);
            };
            drawFrame();
            
            // Canvas'tan stream al
            this.mediaStream = canvas.captureStream(30);
            
            // Stream'i peer connection'a ekle
            this.mediaStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.mediaStream);
            });
            
            console.log('✅ Media stream hazır');
        } catch (error) {
            console.error('❌ Media stream hatası:', error);
        }
    }

    startStreaming() {
        console.log('🎥 Streaming başlatılıyor...');
        
        // FFmpeg ile RTSP'den stream al ve WebRTC'ye aktar
        // Bu kısım gerçek uygulamada FFmpeg entegrasyonu gerektirir
        
        /*
        this.ffmpegProcess = spawn('ffmpeg', [
            '-rtsp_transport', 'tcp',
            '-i', RTSP_URL,
            '-c:v', 'libvpx',
            '-b:v', '1M',
            '-c:a', 'libopus',
            '-f', 'webm',
            'pipe:1'
        ]);
        
        this.ffmpegProcess.stdout.on('data', (data) => {
            // WebRTC üzerinden gönder
            // Bu kısım daha karmaşık implementasyon gerektirir
        });
        */
        
        console.log('📡 Stream aktif');
    }

    cleanup() {
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        
        if (this.ffmpegProcess) {
            this.ffmpegProcess.kill();
            this.ffmpegProcess = null;
        }
    }

    reconnect() {
        console.log('🔄 Yeniden bağlanılıyor...');
        this.cleanup();
        setTimeout(() => {
            this.registerAsPublisher();
        }, 5000);
    }

    disconnect() {
        console.log('👋 Bağlantı kesiliyor...');
        this.cleanup();
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Kullanım
const publisher = new CameraPublisher();

// Başlat
publisher.connect();

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Uygulama kapatılıyor...');
    publisher.disconnect();
    process.exit(0);
});

process.on('SIGTERM', () => {
    publisher.disconnect();
    process.exit(0);
});

// NOT: Bu örnek kod browser ortamında çalışmaz, Node.js + WebRTC kütüphanesi gerektirir
// Gerçek implementasyon için 'wrtc' veya 'node-webrtc' paketleri kullanılmalıdır