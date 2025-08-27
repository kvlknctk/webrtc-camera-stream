@echo off
cls
echo ========================================
echo    WebRTC Camera Stream + PTZ Control
echo    Windows Baslatma Script'i
echo ========================================
echo.

REM FFmpeg kontrolu
where ffmpeg >nul 2>&1
if %errorlevel% neq 0 (
    echo [HATA] FFmpeg bulunamadi!
    echo.
    echo FFmpeg kurulum adimlari:
    echo 1. https://www.gyan.dev/ffmpeg/builds/ adresinden Full Build'i indirin
    echo 2. ZIP dosyasini bir klasore cikartin
    echo 3. ffmpeg.exe'yi bu projenin klasorune kopyalayin
    echo    VEYA
    echo    ffmpeg/bin klasorunu Windows PATH'e ekleyin
    echo.
    pause
    exit /b 1
)

echo [OK] FFmpeg bulundu
echo.

REM Node.js kontrolu
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [HATA] Node.js bulunamadi!
    echo Lutfen https://nodejs.org adresinden Node.js'i yukleyin.
    pause
    exit /b 1
)

echo [OK] Node.js bulundu
echo.

REM Bagimlilik kontrolu
if not exist "node_modules" (
    echo [INFO] Node modulleri yukleniyor...
    call npm install
    if %errorlevel% neq 0 (
        echo [HATA] NPM install basarisiz!
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo    Sunucular Baslatiliyor...
echo ========================================
echo.

REM PTZ kontrol sunucusunu arka planda baslat
echo [1/2] PTZ Control Server baslatiliyor...
start /min cmd /c "node camera-ptz-api.js server"
timeout /t 2 /nobreak >nul

REM Ana WebRTC sunucusunu baslat
echo [2/2] WebRTC Stream Server baslatiliyor...
echo.
node webrtc-server.js

pause