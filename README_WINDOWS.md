# Windows Kurulum ve Kullanım Kılavuzu

## 🔧 Gereksinimler

1. **Node.js** - [nodejs.org](https://nodejs.org) adresinden indirin
2. **FFmpeg** - Video streaming için gerekli

## 📥 FFmpeg Kurulumu (ÖNEMLİ)

### Yöntem 1: Proje Klasörüne Kopyalama (Kolay)
1. [gyan.dev/ffmpeg/builds](https://www.gyan.dev/ffmpeg/builds/) adresine gidin
2. **"release full"** versiyonunu indirin (yaklaşık 100MB)
3. ZIP dosyasını açın
4. `bin` klasöründeki `ffmpeg.exe` dosyasını proje ana klasörüne kopyalayın

### Yöntem 2: PATH'e Ekleme (Önerilen)
1. FFmpeg'i indirip bir klasöre çıkartın (örn: `C:\ffmpeg`)
2. Windows Sistem Ayarları → Gelişmiş → Ortam Değişkenleri
3. PATH değişkenine `C:\ffmpeg\bin` ekleyin
4. Komut istemini yeniden başlatın

### FFmpeg Kontrolü
```cmd
ffmpeg -version
```

## 🚀 Hızlı Başlangıç

### 1. Bağımlılıkları Yükleyin
```cmd
npm install
```

### 2. Kamera IP Ayarı
`.env` dosyasını düzenleyin:
```env
CAMERA_IP=192.168.1.41
CAMERA_USER=admin
CAMERA_PASS=admin
```

### 3. Uygulamayı Başlatın

#### Sadece Stream:
```cmd
start.bat
```
veya
```cmd
node webrtc-server.js
```

#### Stream + PTZ Kontrol:
```cmd
start-with-ptz.bat
```

## 🎥 Kullanım

1. Tarayıcınızı açın
2. `http://localhost:8080` adresine gidin
3. Kamera görüntüsü otomatik olarak yüklenecektir

### PTZ Kontrol (Kamera Hareketi)
- **Klavye:** W, A, S, D veya Ok tuşları
- **Fare:** Ekrandaki butonlar
- **H tuşu:** Merkeze dön

## ❗ Sorun Giderme

### "FFmpeg ENOENT" Hatası
- FFmpeg kurulu değil veya PATH'de yok
- Çözüm: `ffmpeg.exe`'yi proje klasörüne kopyalayın

### Stream Açılmıyor
1. Kamera IP'sini kontrol edin
2. Kullanıcı adı/şifre doğru mu?
3. RTSP portu (554) açık mı?

### Windows Defender Uyarısı
- Node.js'e ağ erişimi izni verin

## 📁 Dosya Yapısı

```
waha/
├── config.js           # Merkezi ayarlar
├── webrtc-server.js    # Ana stream sunucusu
├── camera-ptz-api.js   # PTZ kontrol API'si
├── webrtc-client.html  # Web arayüzü
├── .env               # Kamera IP ve şifre ayarları
├── start.bat          # Windows başlatma scripti
├── start-with-ptz.bat # PTZ'li başlatma
└── ffmpeg.exe         # (Opsiyonel) FFmpeg executable
```

## 🔐 Güvenlik Notları

- `.env` dosyasındaki şifreleri güvende tutun
- Production'da HTTPS kullanın
- Kamera şifrelerini varsayılandan değiştirin

## 📞 Destek

Sorun yaşarsanız:
1. `ffmpeg -version` çıktısını kontrol edin
2. `.env` dosyasındaki IP'yi kontrol edin
3. Windows Güvenlik Duvarı'nı kontrol edin