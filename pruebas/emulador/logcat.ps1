# Captura de Logcat para las pruebas en Android (emulador zipa_android14 o celular por USB).
# Guarda en pruebas/emulador/registros/ (carpeta ignorada por Git: puede contener datos de prueba).
# Filtra lo útil para cierres y errores: JavaScript de React Native, Expo, excepciones de Android,
# cierres nativos y el administrador de memoria.
#   Uso:  powershell -File pruebas/emulador/logcat.ps1            (Ctrl+C para terminar)
#         powershell -File pruebas/emulador/logcat.ps1 -Todo      (sin filtro)
param([switch]$Todo)
$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
if (-not (Test-Path $adb)) { throw "No se encontró adb en $adb" }
$dispositivos = & $adb devices | Select-String "`tdevice$"
if (-not $dispositivos) { throw 'No hay ningún dispositivo o emulador conectado (adb devices).' }
$dir = Join-Path $PSScriptRoot 'registros'
New-Item -ItemType Directory -Force $dir | Out-Null
$archivo = Join-Path $dir ("logcat-{0:yyyyMMdd-HHmmss}.txt" -f (Get-Date))
& $adb logcat -c
Write-Host "Capturando en $archivo  (Ctrl+C para terminar)"
if ($Todo) {
  & $adb logcat -v time | Tee-Object -FilePath $archivo
} else {
  & $adb logcat -v time ReactNativeJS:V ReactNative:V ExpoModulesCore:V expo:V AndroidRuntime:E ActivityManager:I lowmemorykiller:I libc:F DEBUG:F '*:S' | Tee-Object -FilePath $archivo
}
