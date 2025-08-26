#!/bin/bash

# WebRTC Stream Server Kurulum Script'i

set -e

echo "🚀 WebRTC Stream Server Kurulumu Başlıyor..."

# Renk tanımlamaları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Docker kontrolü
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker bulunamadı! Lütfen önce Docker'ı kurun.${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose bulunamadı! Lütfen önce Docker Compose'u kurun.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker ve Docker Compose mevcut${NC}"

# .env dosyası oluştur
if [ ! -f .env ]; then
    echo "📝 .env dosyası oluşturuluyor..."
    cp .env.example .env
    
    # Sunucu IP'sini otomatik al
    SERVER_IP=$(curl -s ifconfig.me)
    sed -i "s/SERVER_IP=0.0.0.0/SERVER_IP=$SERVER_IP/g" .env
    
    # Rastgele şifreler oluştur
    JWT_SECRET=$(openssl rand -base64 32)
    REDIS_PASSWORD=$(openssl rand -base64 16)
    TURN_PASSWORD=$(openssl rand -base64 16)
    
    sed -i "s/JWT_SECRET=your-secret-key-here/JWT_SECRET=$JWT_SECRET/g" .env
    sed -i "s/REDIS_PASSWORD=/REDIS_PASSWORD=$REDIS_PASSWORD/g" .env
    sed -i "s/WEBRTC_TURN_PASSWORD=/WEBRTC_TURN_PASSWORD=$TURN_PASSWORD/g" .env
    
    echo -e "${GREEN}✓ .env dosyası oluşturuldu${NC}"
else
    echo -e "${YELLOW}! .env dosyası zaten mevcut${NC}"
fi

# Domain sorgusu
read -p "Domain kullanacak mısınız? (E/h): " use_domain
if [[ $use_domain =~ ^[Ee]$ ]]; then
    read -p "Domain adresinizi girin: " domain
    sed -i "s/SERVER_DOMAIN=your-domain.com/SERVER_DOMAIN=$domain/g" .env
    
    # SSL sertifikası sorgusu
    read -p "SSL sertifikası oluşturmak ister misiniz? (Let's Encrypt) (E/h): " use_ssl
    if [[ $use_ssl =~ ^[Ee]$ ]]; then
        read -p "Email adresinizi girin: " email
        
        echo "📜 SSL sertifikası oluşturuluyor..."
        mkdir -p nginx/ssl
        
        docker run -it --rm \
            -v $(pwd)/nginx/ssl:/etc/letsencrypt \
            -v $(pwd)/nginx/ssl:/var/lib/letsencrypt \
            -p 80:80 \
            certbot/certbot certonly \
            --standalone \
            -d $domain \
            --agree-tos \
            --email $email \
            --non-interactive
        
        # Nginx config'de SSL'i aktifleştir
        sed -i "s|# ssl_certificate|ssl_certificate|g" nginx/nginx.conf
        sed -i "s|# ssl_certificate_key|ssl_certificate_key|g" nginx/nginx.conf
        sed -i "s|your-domain.com|$domain|g" nginx/nginx.conf
        
        echo -e "${GREEN}✓ SSL sertifikası oluşturuldu${NC}"
    fi
fi

# Klasörleri oluştur
echo "📁 Gerekli klasörler oluşturuluyor..."
mkdir -p logs nginx/logs nginx/ssl monitoring

# Docker imajlarını indir
echo "📥 Docker imajları indiriliyor..."
docker-compose pull

# Production mı development mı?
read -p "Production modunda başlatmak ister misiniz? (E/h): " prod_mode
if [[ $prod_mode =~ ^[Ee]$ ]]; then
    echo "🏭 Production modunda başlatılıyor..."
    docker-compose -f docker-compose.prod.yml up -d
else
    echo "🔧 Development modunda başlatılıyor..."
    docker-compose up -d
fi

# Durumu kontrol et
echo "⏳ Servisler başlatılıyor, lütfen bekleyin..."
sleep 10

if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Kurulum başarıyla tamamlandı!${NC}"
    echo ""
    echo "📊 Servis Durumu:"
    docker-compose ps
    echo ""
    echo "🌐 Erişim Adresleri:"
    
    if [[ ! -z "$domain" ]]; then
        if [[ $use_ssl =~ ^[Ee]$ ]]; then
            echo "   Web Arayüzü: https://$domain"
        else
            echo "   Web Arayüzü: http://$domain"
        fi
    else
        echo "   Web Arayüzü: http://$SERVER_IP"
    fi
    
    echo "   API Health: http://$SERVER_IP/api/health"
    echo ""
    echo "📝 Logları görüntülemek için: docker-compose logs -f"
    echo "🛑 Durdurmak için: docker-compose down"
else
    echo -e "${RED}❌ Kurulum başarısız! Logları kontrol edin:${NC}"
    docker-compose logs
    exit 1
fi

echo ""
echo -e "${YELLOW}⚠️  Önemli Notlar:${NC}"
echo "1. Firewall'da 80, 443, 3478, 5349 portlarının açık olduğundan emin olun"
echo "2. Cloudflare proxy kullanmayın (WebRTC ile uyumlu değil)"
echo "3. .env dosyasındaki ayarları kontrol edin"
echo "4. TURN server NAT arkasındaki cihazlar için gereklidir"