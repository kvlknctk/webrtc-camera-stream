# WebRTC Stream Server

Merkezi WebRTC tabanlı kamera akış sunucusu. Kamera uygulamaları bu sunucuya bağlanır, kullanıcılar da sunucu üzerinden canlı yayınları izleyebilir.

## 🚀 Özellikler

- **WebRTC Tabanlı**: Düşük gecikmeli, yüksek kaliteli video streaming
- **Çoklu Stream Desteği**: Aynı anda birden fazla kamera yayını
- **Otomatik Yeniden Bağlanma**: Bağlantı kopması durumunda otomatik yeniden bağlanma
- **TURN/STUN Desteği**: NAT arkasındaki cihazlar için bağlantı desteği
- **Docker Tabanlı**: Kolay kurulum ve yönetim
- **Nginx Reverse Proxy**: Güvenli ve ölçeklenebilir yapı
- **Redis Cache**: Performans optimizasyonu (opsiyonel)

## 📋 Gereksinimler

- Docker ve Docker Compose
- Açık portlar: 80, 443, 3478 (TURN), 5349 (TURN TLS)
- Domain (opsiyonel, Cloudflare proxy olmadan)
- Minimum 2GB RAM, 2 CPU

## 🔧 Kurulum

### 1. Repository'yi Klonlayın

```bash
cd server
```

### 2. Ortam Değişkenlerini Ayarlayın

```bash
cp .env.example .env
```

`.env` dosyasını düzenleyin:

```env
# Temel Ayarlar
SERVER_DOMAIN=your-domain.com  # Domain adresiniz
SERVER_IP=x.x.x.x              # Sunucu public IP adresi

# Güvenlik
JWT_SECRET=your-secret-key-here
REDIS_PASSWORD=strong-password

# TURN Server
WEBRTC_TURN_PASSWORD=turn-password
```

### 3. SSL Sertifikası (HTTPS için - Opsiyonel)

Let's Encrypt ile otomatik SSL:

```bash
# Certbot kurulumu
docker run -it --rm \
  -v ./nginx/ssl:/etc/letsencrypt \
  -v ./nginx/ssl:/var/lib/letsencrypt \
  -p 80:80 \
  certbot/certbot certonly \
  --standalone \
  -d your-domain.com \
  --agree-tos \
  --email your-email@example.com
```

### 4. Docker Container'ları Başlatın

```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

### 5. Logları Kontrol Edin

```bash
# Tüm servisler
docker-compose logs -f

# Sadece uygulama
docker-compose logs -f app

# Nginx
docker-compose logs -f nginx
```

## 💻 Kullanım

### Sunucu Arayüzü

Tarayıcınızdan sunucuya bağlanın:
- HTTP: `http://your-domain.com` veya `http://server-ip`
- HTTPS: `https://your-domain.com`

### Kamera Uygulaması Bağlantısı

Kamera uygulamanızı sunucuya bağlamak için Socket.IO kullanın:

```javascript
const io = require('socket.io-client');

const socket = io('http://your-domain.com');

// Yayıncı olarak kayıt ol
socket.emit('register-publisher', {
  metadata: {
    name: 'Kamera 1',
    location: 'Ofis',
    resolution: '1920x1080'
  }
});

// Stream ID'yi al
socket.on('stream-created', (data) => {
  console.log('Stream ID:', data.streamId);
  // WebRTC peer connection kurulumu...
});
```

### API Endpoints

- `GET /api/health` - Sunucu durumu
- `GET /api/streams` - Aktif yayın listesi
- `GET /api/stats` - Sunucu istatistikleri

## 🔒 Güvenlik Ayarları

### Firewall Kuralları

```bash
# HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# TURN
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 5349/tcp
sudo ufw allow 5349/udp
```

### Nginx Rate Limiting

`nginx/nginx.conf` dosyasında rate limiting ayarları yapabilirsiniz.

## 📊 Monitoring (Opsiyonel)

Production docker-compose Grafana dashboard içerir:

- Grafana: `http://your-domain.com:3030`
- Kullanıcı: `admin`
- Şifre: `.env` dosyasındaki `GRAFANA_PASSWORD`

## 🛠️ Bakım

### Container Yönetimi

```bash
# Durdur
docker-compose down

# Yeniden başlat
docker-compose restart

# Güncelle ve yeniden başlat
docker-compose pull
docker-compose up -d

# Temizle (dikkatli kullanın)
docker-compose down -v
```

### Log Rotasyonu

Loglar `/var/log` klasöründe tutulur. Otomatik rotasyon için:

```bash
# logrotate yapılandırması ekleyin
sudo nano /etc/logrotate.d/webrtc-server
```

İçerik:
```
/path/to/server/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
```

## 🐛 Sorun Giderme

### Container'lar başlamıyor
```bash
docker-compose logs
docker ps -a
```

### WebRTC bağlantı sorunu
- TURN server'ın çalıştığından emin olun
- Firewall kurallarını kontrol edin
- `.env` dosyasındaki IP/Domain ayarlarını kontrol edin

### Yüksek CPU/Memory kullanımı
- Redis cache'i aktif edin
- `MAX_CLIENTS_PER_STREAM` değerini azaltın
- Production docker-compose kullanın (resource limitleri var)

## 📝 Notlar

- Cloudflare proxy **kullanmayın** (WebRTC ile uyumlu değil)
- TURN server NAT arkasındaki cihazlar için gerekli
- SSL sertifikası production ortamı için önerilir
- Redis opsiyoneldir ama performans için önerilir

## 🤝 Destek

Sorunlar için issue açabilir veya log dosyalarını kontrol edebilirsiniz.