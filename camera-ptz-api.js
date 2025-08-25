const axios = require('axios');

// Kamera bilgileri
const CAMERA_IP = '192.168.1.187';
const USERNAME = 'admin';
const PASSWORD = 'admin';
const BASE_URL = `http://${CAMERA_IP}`;

// Basic auth header
const auth = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');
const headers = {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/x-www-form-urlencoded'
};

// PTZ Kontrol Fonksiyonları
class CameraPTZ {
    constructor() {
        this.baseUrl = BASE_URL;
        this.headers = headers;
    }


    // Hi3510 PTZ kontrolü (Gerçek çalışan metod)
    async hi3510Control(direction, speed = 45) {
        const actions = {
            'left': 'left',
            'right': 'right',
            'up': 'up',
            'down': 'down',
            'stop': 'stop',
            'home': 'home',
        };

        const action = actions[direction] || 'stop';
        
        try {
            const url = `${this.baseUrl}/web/cgi-bin/hi3510/ptzctrl.cgi?-step=0&-act=${action}&-speed=${speed}`;
            const response = await axios.get(url, { headers: this.headers, timeout: 2000 });
            console.log(`✅ Hi3510 control: ${direction}`);
            return true;
        } catch (error) {
            console.log(`❌ Hi3510 control hatası: ${error.message}`);
            return false;
        }
    }
    

    // Hareket kontrolü
    async move(direction, duration = 500) {
        const success = await this.hi3510Control(direction);
        
        if (success && duration > 0 && direction !== 'stop' && direction !== 'home') {
            // Belirtilen süre sonra dur
            setTimeout(async () => {
                await this.hi3510Control('stop');
            }, duration);
        }
        
        return success ? 'hi3510' : null;
    }
}


// Express API sunucusu (Web arayüzü için)
const express = require('express');
const cors = require('cors');

function startServer() {
    const app = express();
    const PORT = 3001;
    
    app.use(cors());
    app.use(express.json());
    
    const ptz = new CameraPTZ();
    
    // PTZ hareket endpoint'i
    app.post('/ptz/move', async (req, res) => {
        const { direction, duration = 500 } = req.body;
        console.log(`📹 PTZ Hareket isteği: ${direction} (${duration}ms)`);
        
        try {
            const result = await ptz.move(direction, duration);
            res.json({ success: !!result, method: result });
        } catch (error) {
            console.error('PTZ Hata:', error);
            res.status(500).json({ error: error.message });
        }
    });
    
    app.listen(PORT, () => {
        console.log(`\n🚀 PTZ API Sunucusu başlatıldı: http://localhost:${PORT}`);
        console.log('📝 Endpoint: POST /ptz/move - Kamera hareketi\n');
    });
}

// Ana program
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args[0] === 'server') {
        startServer();
    } else {
        console.log('Kullanım: node camera-ptz-api.js server');
    }
}

module.exports = { CameraPTZ };