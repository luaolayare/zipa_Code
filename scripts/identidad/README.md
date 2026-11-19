# Identidad visual provisional

La identidad de las apps sale de esta carpeta: íconos, pantalla de inicio e ícono del panel. Hoy es **provisional**: usa el mismo símbolo que `<Logo />` (una tienda dentro de un cuadro mostaza) y los colores de la marca. El logo definitivo está pendiente de diseño.

| Archivo | Para qué sirve |
|---|---|
| `marca.svg` | El símbolo, en una cuadrícula de 24×24 con trazos |
| `config.json` | Colores de cada app. **Clientes:** fondo verde petróleo y cuadro mostaza. **Negocios:** los mismos colores, invertidos. **Panel:** cuadro mostaza |
| `generar.cjs` | Dibuja y escribe los recursos |

## Recursos que genera

- `apps/clientes/assets/` y `apps/negocios/assets/`:
  - `icon.png`
  - `android-icon-foreground.png`, `android-icon-background.png` y `android-icon-monochrome.png`
  - `splash-icon.png`
  - `favicon.png`
- `apps/admin/src/app/icon.svg` y `apps/admin/src/app/favicon.ico`

Los `app.json` ya apuntan a estos archivos. También definen el color de fondo del ícono adaptativo y de la pantalla de inicio, que debe coincidir con `fondo` en `config.json`.

## Cómo cambiarla (cuando llegue el logo definitivo)

1. Reemplaza `marca.svg` por el símbolo nuevo, o ajusta los colores en `config.json`.
2. Si cambias `fondo`, actualiza también `android.adaptiveIcon.backgroundColor` y el `backgroundColor` de `expo-splash-screen` en `apps/*/app.json`.
3. Ejecuta, desde la raíz:

   ```powershell
   $env:PLAYWRIGHT_CORE = "<ruta>\node_modules\playwright-core"   # si no está instalado en el proyecto
   node scripts/identidad/generar.cjs
   ```

4. Revisa las imágenes y genera un APK nuevo: los íconos y la pantalla de inicio solo cambian con un build nuevo.

Si el logo definitivo es una imagen y no un símbolo de trazos, se puede reemplazar directamente cada PNG con las mismas medidas. En el primer plano adaptativo, deja el dibujo dentro del 66 % central.
