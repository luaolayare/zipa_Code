# Zipa lo tiene

Dos apps móviles hechas con Expo (React Native) y Supabase:

| App | Carpeta | Para quién |
| --- | --- | --- |
| Zipa lo tiene Negocios | `apps/negocios` | Restaurantes y emprendimientos: registro y panel |
| Zipa lo tiene | `apps/clientes` | Turistas y clientes: explorar, ver en 3D y calificar |

## Requisitos

- [Node.js](https://nodejs.org) LTS
- [Git](https://git-scm.com)
- La app **Expo Go** en tu celular (App Store o Play Store)

## Cómo correr las apps

```bash
npm install          # una sola vez, desde la raíz
npm run negocios     # inicia la app de negocios
npm run clientes     # inicia la app de clientes
```

Escanea el QR que aparece en la terminal con la cámara (iPhone) o con Expo Go (Android).
Tu computador y tu celular deben estar en la misma red wifi.

Sin configurar Supabase, las apps funcionan con **datos de ejemplo**.

## Conectar Supabase

1. Crea un proyecto gratis en [supabase.com](https://supabase.com).
2. En el editor SQL, ejecuta `supabase/migrations/0001_esquema_inicial.sql`.
3. En cada app copia `.env.example` a `.env` y pon la URL y la anon key del proyecto
   (Project Settings > API).

## Estructura

```
apps/
  negocios/src/app/     pantallas de la app del negocio
    index.tsx           inicio
    registro/           cuenta, datos, verificacion, productos, vista-previa
    panel.tsx           panel del negocio
  clientes/src/app/     pantallas de la app de clientes
    index.tsx           bienvenida
    login.tsx           inicio de sesión
    (tabs)/             explorar y perfil
    negocio/[id].tsx    detalle del negocio
    producto/[id].tsx   visor 3D (fase 1)
    calificar/[id].tsx  dejar reseña
packages/shared/src/    tema, tipos, datos, sesión y componentes comunes
supabase/migrations/    esquema de base de datos
```

## Hoja de ruta

1. **Prueba del 3D:** validar que un video de celular produce un modelo 3D aceptable de comida y artesanías.
2. **App de negocios:** registro completo con fotos, video y verificación; panel con reseñas y QR.
3. **Primeros negocios:** registrar entre 30 y 50 negocios en una sola zona.
4. **App de clientes:** visor 3D, realidad aumentada y lanzamiento en las tiendas.
