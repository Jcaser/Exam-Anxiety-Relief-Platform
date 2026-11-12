@echo off
chcp 65001 >nul
REM 清绪之屿 · 本地离线语音识别服务
REM 首次使用若缺模型，会从国内镜像下载（约 42MB）
cd /d "%~dp0.."
set PY=C:\Users\Juelyn\.workbuddy\binaries\python\envs\default\Scripts\python.exe
if not exist "C:\Users\Juelyn\vosk-cn\am" (
  echo [1/2] 下载中文语音模型...
  "%PY%" scripts\setup_model.py
)
echo [2/2] 启动识别服务...
"%PY%" scripts\asr_server.py
pause
