#!/bin/bash

# Kamera Stream ve PTZ Kontrol Başlatma Script'i

echo "======================================"
echo "📷 IP Kamera Kontrol Sistemi"
echo "======================================"

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# PID dosyaları
PID_DIR="./pids"
mkdir -p $PID_DIR

# Eski process'leri temizle
cleanup() {
    echo -e "${YELLOW}Temizlik yapılıyor...${NC}"
    
    # PID dosyalarından process'leri kapat
    if [ -f "$PID_DIR/stream.pid" ]; then
        kill $(cat "$PID_DIR/stream.pid") 2>/dev/null
        rm "$PID_DIR/stream.pid"
    fi
    
    if [ -f "$PID_DIR/ptz.pid" ]; then
        kill $(cat "$PID_DIR/ptz.pid") 2>/dev/null
        rm "$PID_DIR/ptz.pid"
    fi
    
    # Port kontrolü
    lsof -ti:8080 | xargs kill 2>/dev/null
    lsof -ti:3001 | xargs kill 2>/dev/null
    
    echo -e "${GREEN}✓ Temizlik tamamlandı${NC}"
}

# Ctrl+C ile kapatma
trap cleanup EXIT

# Başlangıçta temizlik
cleanup

echo ""
echo "📦 Bağımlılıklar kontrol ediliyor..."

# Node.js kontrolü
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js bulunamadı! Lütfen yükleyin.${NC}"
    exit 1
fi

# FFmpeg kontrolü
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${RED}❌ FFmpeg bulunamadı! Lütfen yükleyin.${NC}"
    exit 1
fi

# npm paketleri kontrolü
if [ ! -d "node_modules" ]; then
    echo "📦 NPM paketleri yükleniyor..."
    npm install
fi

echo ""
echo "🚀 Servisler başlatılıyor..."
echo ""

# Video Stream Sunucusu
echo -e "${GREEN}[1/2]${NC} Video Stream başlatılıyor..."
node webrtc-server.js &
STREAM_PID=$!
echo $STREAM_PID > "$PID_DIR/stream.pid"
sleep 2

# PTZ API Sunucusu
echo -e "${GREEN}[2/2]${NC} PTZ Kontrol API başlatılıyor..."
node camera-ptz-api.js server &
PTZ_PID=$!
echo $PTZ_PID > "$PID_DIR/ptz.pid"
sleep 2

# Başarı kontrolü
if ps -p $STREAM_PID > /dev/null && ps -p $PTZ_PID > /dev/null; then
    echo ""
    echo -e "${GREEN}======================================"
    echo "✅ Sistem Başarıyla Başlatıldı!"
    echo "======================================"
    echo ""
    echo "📺 Video Stream: http://localhost:8080"
    echo "🎮 PTZ API: http://localhost:3001"
    echo ""
    echo "Klavye Kontrolleri:"
    echo "  W/A/S/D veya Ok Tuşları - Kamera hareketi"
    echo "  H - Home pozisyonu"
    echo ""
    echo -e "${YELLOW}Kapatmak için: Ctrl+C${NC}"
    echo "======================================${NC}"
    
    # Process'leri ön planda tut
    wait $STREAM_PID $PTZ_PID
else
    echo -e "${RED}❌ Servisler başlatılamadı!${NC}"
    cleanup
    exit 1
fi