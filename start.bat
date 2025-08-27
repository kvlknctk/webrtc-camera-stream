@echo off
cls
echo ========================================
echo    WebRTC Camera Stream Server
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
    echo Alternatif: ffmpeg.exe'yi bu klasore koyun
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
    echo.
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
echo    Sunucu Baslatiliyor...
echo ========================================
echo.

REM Ortam degiskenleri (opsiyonel)
REM set CAMERA_IP=192.168.1.41
REM set FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe

REM Ana sunucuyu baslat
node webrtc-server.js

pause