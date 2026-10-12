@echo off
echo ========================================================
echo   Lancement du serveur web local AWS Certif Quiz
echo ========================================================
cd /d "%~dp0"
start "" http://localhost:8000
python -m http.server 8000
pause
