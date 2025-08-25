#!/bin/bash

# Sistemi Durdurma Script'i

echo "======================================"
echo "🛑 Sistem Durduruluyor..."
echo "======================================"

# PID dosyalarından process'leri kapat
PID_DIR="./pids"

if [ -f "$PID_DIR/stream.pid" ]; then
    kill $(cat "$PID_DIR/stream.pid") 2>/dev/null
    rm "$PID_DIR/stream.pid"
    echo "✓ Video stream durduruldu"
fi

if [ -f "$PID_DIR/ptz.pid" ]; then
    kill $(cat "$PID_DIR/ptz.pid") 2>/dev/null
    rm "$PID_DIR/ptz.pid"
    echo "✓ PTZ API durduruldu"
fi

# Port temizliği
lsof -ti:8080 | xargs kill 2>/dev/null
lsof -ti:3001 | xargs kill 2>/dev/null

# Node process'lerini temizle
pkill -f "webrtc-server.js"
pkill -f "camera-ptz-api.js"

echo ""
echo "✅ Sistem durduruldu!"
echo "======================================="