@echo off
setlocal
cd /d "%~dp0"
echo ============================================
echo    Nalu - Subir cambios a GitHub
echo ============================================
echo.
set /p msg="Mensaje del commit (Enter = usar fecha y hora): "
if "%msg%"=="" set "msg=Update %date% %time%"
echo.
echo --- Guardando cambios ---
git add -A
git commit -m "%msg%"
echo.
echo --- Subiendo a GitHub ---
git push
echo.
echo ============================================
echo    Listo. Si hubo cambios, Vercel redeploya
echo    solo en unos segundos.
echo ============================================
echo.
pause
