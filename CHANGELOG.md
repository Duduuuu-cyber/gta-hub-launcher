# Changelog

## [1.1.0] - 2026-01-17

### 🛡️ Seguridad & Estabilidad (Security & Stability)
- **Subnet/Flood Authentication:** Solucionado el problema de IP Dinámica. El sistema ahora autoriza el rango completo `/24` de la IP del usuario, garantizando acceso instantáneo incluso si la IP varía entre el Launcher y el Servidor de Juego.
- **Anti-Bruteforce & Rate Limiting:** Implementado `express-rate-limit`.
    - **Login/Register:** Limitado estrictamente a 20 intentos por hora para prevenir ataques de fuerza bruta.
    - **API General:** Limitada a 300 peticiones por 15 minutos para prevenir spam/DoS.
- **Security Headers:** Implementado `helmet` para proteger contra ataques XSS, Clickjacking y Sniffing.
- **Connection Pooling:** Reemplazada la conexión simple MySQL por un `Pool` de conexiones. Esto elimina el error "Too many connections" y mejora drásticamente el rendimiento bajo carga.
- **Input Sanitization:** Validación estricta en endpoints de autenticación.

### ✨ Nuevas Funcionalidades (Features)
- **Inventario Visual:** Nueva sección en `Profile.jsx` que muestra:
    - Items equipados (Mano Izquierda, Derecha, Espalda) con iconos dinámicos.
    - Contenido de los bolsillos (9 slots) con nombres y cantidades.
    - Base de datos local de items (`items.js`) con categorización automática (Armas, Drogas, Alimentos, etc.).
- **Offline Blocker Nativo:** Reescrito desde cero. Ahora usa la API nativa de Windows (`navigator.onLine`) para detectar desconexiones de cable/WiFi con **CERO falsos positivos**. Eliminado el sistema de ping inestable.
- **Welcome Gift System:** Implementada lógica completa para detectar y otorgar regalos de bienvenida, incluyendo validación de `Character ID` para recompensas monetarias.

### 🐛 Correcciones de Errores (Bug Fixes)
- **Game Launch IP:** Corregido bug donde el juego iniciaba en `127.0.0.1`. Ahora detecta correctamente el entorno de producción.
- **Skills 0 Pts:** Corregido error en la consulta SQL que no traía las columnas `Habilidad1-8`, mostrando siempre 0 puntos en el perfil.
- **SSO Token Local:** Corregido error donde el token se registraba para `127.0.0.1` en desarrollo, impidiendo el login real.
- **CSP & Security Warnings:** Implementada una Política de Seguridad de Contenido (CSP) estricta en el Electron Renderer para silenciar advertencias de seguridad y restringir fuentes no autorizadas.
- **Backend Startup:** Corregida dependencia faltante `md5` que impedía el arranque del servidor de autenticación.

### 🔧 Mejoras Técnicas
- **Global Error Handling:** Añadidos manejadores para `uncaughtException` y `unhandledRejection` para evitar caídas silenciosas del servidor.
- **Schema Migration:** Implementada función `ensureSchema` que verifica y crea automáticamente columnas faltantes (`is_welcome_gift`, etc.) en la base de datos al iniciar.
