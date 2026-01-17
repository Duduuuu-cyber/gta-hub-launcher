
# Guía de Despliegue del Backend (GTA Seoul)

Para que el launcher y los usuarios puedan iniciar sesión, el **Backend** (`backend/server.js`) debe estar ejecutándose en tu servidor VPS, no en tu PC.

Sigue estos pasos para subirlo y encenderlo:

## 1. Validar Archivos Locales
Asegúrate de tener la carpeta `backend` con:
- `server.js`
- `package.json`
- `.env` (si usas variables de entorno)

## 2. Subir Archivos al VPS
Usa FileZilla o SCP para subir la carpeta `backend` a tu VPS.
- **Ruta recomendada:** `/home/gta-server/backend` o `/root/launcher-backend`

## 3. Conectarse al VPS (SSH)
Abre PowerShell o Terminal y conecta:
```bash
ssh usuario@192.99.245.207
```

## 4. Instalar Dependencias
Ve a la carpeta donde subiste el backend:
```bash
cd /ruta/donde/subiste/backend
npm install
```

## 5. Configurar Base de Datos
Asegúrate de editar `server.js` o usar variables de entorno en el VPS para que la conexión a MySQL sea correcta (usuario `samp`, contraseña `...`).
*Si la DB está en el mismo VPS, usa `localhost` o `127.0.0.1` en la config del backend allá.*

## 6. Encender el Servidor
Usa **PM2** para mantener el servidor encendido siempre (incluso si cierras la consola).

Instalar PM2 (si no lo tienes):
```bash
npm install -g pm2
```

Iniciar Backend:
```bash
pm2 start server.js --name "launcher-api"
```

Guardar para reinicios:
```bash
pm2 save
pm2 startup
```

## 7. Verificar
Intenta entrar a `http://192.99.245.207:3001` desde tu navegador. Si ves "Cannot GET /" o similar, ¡funciona!
Si no carga, revisa el Firewall del VPS:
```bash
ufw allow 3001
```

---
**Nota:** Ahora, cuando compiles el Launcher (`npm run electron:build`), este se conectará automáticamente a la IP/Dominio configurado en `src/api/config.js`.
