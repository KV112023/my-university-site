@echo off
title 液态玻璃服务器 - 别关我！
echo ============================================
echo    液态玻璃 Liquid Glass   启动中...
echo ============================================
echo.
echo  [1/3] 正在进入项目目录...
cd /d D:\WORK\liquid-glass-webgl || ( echo [错误] 找不到项目目录 D:\WORK\liquid-glass-webgl ！ & pause & exit /b )
echo        目录OK： %cd%
echo.
echo  [2/3] 约 10 秒后将自动打开浏览器
echo        若浏览器打开是白屏/打不开，请等本窗口出现 Ready 后，在浏览器按 F5 刷新
echo        想停止服务器：直接关闭本窗口，或按 Ctrl+C
echo.
start "" cmd /c "timeout /t 10 /nobreak >nul & start http://localhost:3000"
echo  [3/3] 正在启动服务器（首次约 10~30 秒，看到 Ready 即成功）...
echo  --------------------------------------------
bunx next dev -p 3000
echo.
echo  服务器已停止。如果是你主动关的，忽略下面这行；否则请把上面的红字截图。
pause