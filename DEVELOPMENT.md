# Guía de Desarrollo: Control de Versiones y Despliegues en Balance Pro

Este documento define la regla estricta para el manejo de versiones, actualizaciones Over-The-Air (OTA) y compilaciones nativas de Android (APK) en el proyecto. 

Cualquier desarrollador o agente de IA que trabaje en esta base de datos debe leer, respetar y seguir estas reglas al pie de la letra antes de publicar cambios.

---

## 1. Esquema de Versiones (SemVer)

La versión de la aplicación sigue el formato `X.Y.Z` (ej. `1.2.0`), donde:
*   `X` = Versión Mayor (Major)
*   `Y` = Versión Menor / Rebuild (Minor)
*   `Z` = Versión de Parche / Actualización OTA (Patch)

---

## 2. Reglas de Incremento e Integridad

### Caso A: Actualización OTA (EAS Update) — Solo cambios JS/CSS
*   **Cuándo aplica:** Cambios que no involucran paquetes nativos nuevos ni modificaciones en la configuración nativa de Android/iOS (ej. arreglos en vistas, lógica de negocio, estilos).
*   **Regla de Versión:**
    1.  Incrementar el **tercer número (`Z`)** de la versión en `package.json` y `app.json` (ej: de `1.2.0` a `1.2.1`).
    2.  **NO** modificar el `versionCode` en `app.json`.
    3.  **NO** requiere compilar en EAS (rebuild). Se despliega usando `eas update`.

### Caso B: Compilación Completa (EAS Build) — Requiere nuevo APK
*   **Cuándo aplica:** Cuando se instalan librerías con código nativo (como `react-native-view-shot` o `expo-splash-screen`), se configuran plugins nativos en `app.json`, o cambios mayores de arquitectura.
*   **Regla de Versión:**
    1.  Incrementar el **segundo número (`Y`)** de la versión en `package.json` y `app.json` (ej: de `1.2.0` a `1.3.0`).
    2.  Reiniciar el tercer número (`Z`) estrictamente a **`0`**.
    3.  Incrementar de forma obligatoria el **`versionCode`** dentro de `"android"` en `app.json` (ej: de `10` a `11`). Esto es indispensable para que Android reconozca el nuevo APK como una actualización.
    4.  Subir cambios a GitHub y compilar con `eas build --platform android --profile production`.

---

## 3. Registro de Actualizaciones de la App (`version.json`)

Para que el actualizador inteligente integrado en la aplicación reconozca la existencia del nuevo APK:
*   Inmediatamente después de finalizar una compilación nativa exitosa en EAS, se debe actualizar el archivo [version.json](file:///e:/PROYECTOS%20VICTOR/APPS/ADMINISTRADOR%20DE%20DINERO/version.json) en la raíz del proyecto.
*   **latestVersion:** La nueva versión `X.Y.0` creada.
*   **apkUrl:** El enlace de descarga directo del APK generado por Expo (o el enlace de la release correspondiente en GitHub).
*   **changelog:** Breve resumen de los cambios añadidos.
