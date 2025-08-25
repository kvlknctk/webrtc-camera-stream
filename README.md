# 📷 IP Camera Control System

## 🚀 Quick Start

### Start the System:
```bash
./start.sh
```

### Stop the System:
```bash
./stop.sh
```

### Web Interface:
Open in browser: `http://localhost:8080`

## 📦 Requirements

- Node.js
- FFmpeg
- Chrome/Firefox/Safari

## 🎮 Controls

**Keyboard:**
- `W/A/S/D` or `Arrow Keys` - Camera movement
- `H` - Home (center) position

**Mouse:**
- PTZ buttons in the bottom right corner

## 🏗️ System Architecture

```
[IP Camera] --RTSP--> [webrtc-server.js:8080] --WebSocket--> [Browser]
     ↑                                                            ↓
     └──---- [camera-ptz-api.js:3001] <--HTTP-- PTZ Controls ────┘
```

## 📁 File Structure

```
waha/
├── start.sh              # Start script
├── stop.sh               # Stop script
├── webrtc-server.js      # Video stream server
├── camera-ptz-api.js     # PTZ control API
├── webrtc-client.html    # Web interface
├── styles.css            # CSS styles
├── jsmpeg.min.js         # Video codec
└── node_modules/         # Dependencies
```

## 🔧 Camera Information

- **IP:** 192.168.1.187
- **Username:** admin
- **Password:** admin
- **RTSP URL:** rtsp://admin:admin@192.168.1.187:554/12

## 🛠️ Manual Start

If scripts don't work:

**Terminal 1:**
```bash
node webrtc-server.js
```

**Terminal 2:**
```bash
node camera-ptz-api.js server
```

## ❌ Troubleshooting

### Port already in use error:
```bash
# Clear ports
lsof -ti:8080 | xargs kill
lsof -ti:3001 | xargs kill
```

### Camera not connecting:
- Check camera IP: `ping 192.168.1.187`
- Verify RTSP URL

### PTZ not working:
- Ensure camera supports PTZ
- Check API server is running: `lsof -i:3001`

## 📞 Contact

**Author:** Volkan Catak  
**Email:** iletisim@volkancatak.com.tr  
**Website:** https://volkancatak.com.tr

---
© 2025 Volkan Catak | IP Camera Control System v1.0