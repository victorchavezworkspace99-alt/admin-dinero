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
    5.  **Compilaciones Canceladas o Fallidas:** Si una compilación se cancela o falla en EAS antes de ser publicada oficialmente como una Release en GitHub, **NO** es necesario volver a incrementar la versión ni el `versionCode` para el siguiente intento. Se debe mantener la misma versión planificada, ya que nunca llegó a lanzarse públicamente.

---

## 3. Registro de Actualizaciones de la App (`version.json`) y GitHub Releases

Para que el actualizador inteligente integrado en la aplicación reconozca la existencia del nuevo APK y permita la descarga e instalación automática desde GitHub:
1.  **Etiqueta de Release en GitHub:** Debe ser exactamente **`vX.Y.Z`** (con la "v" en minúscula). Ejemplo: `v1.3.0`.
2.  **Nombre del Archivo APK Adjunto:** Debe renombrarse y subirse a la Release exactamente como **`BalancePro-vX.Y.Z.apk`** (ejemplo: `BalancePro-v1.3.0.apk`).
3.  **Actualizar [version.json](file:///e:/PROYECTOS%20VICTOR/APPS/ADMINISTRADOR%20DE%20DINERO/version.json):** Inmediatamente después de iniciar la build nativa, actualiza el archivo en la raíz del proyecto con la siguiente estructura exacta:
    *   **latestVersion:** La nueva versión del build (ej. `"1.3.0"`).
    *   **apkUrl:** El enlace de descarga de la release en GitHub, formateado como:
        `https://github.com/victorchavezworkspace99-alt/admin-dinero/releases/download/vX.Y.Z/BalancePro-vX.Y.Z.apk`
        (Reemplazando `X.Y.Z` por la versión correspondiente).
    *   **changelog:** Breve resumen de los cambios añadidos.
