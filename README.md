# Sistema de Recepción de Equipos - Innova Schools

Sistema web profesional para la gestión y registro de recepción de equipos tecnológicos en las diferentes sedes de Innova Schools Colombia.

---

## Descripción

Este sistema permite a los colaboradores de Innova Schools registrar la recepción y devolución de equipos tecnológicos (carros de portátiles, tablets y otros dispositivos) en las distintas sedes de la institución. El sistema incluye verificación de correo institucional, control de disponibilidad de equipos y captura de firmas digitales.

---

## Características

### Gestión de Sedes
- **7 ubicaciones activas**: Zipaquirá, Niza, Usaquén, Cota, Mosquera, Tunja y Barranquilla
- Interfaz intuitiva de selección de sede con tarjetas animadas
- Diseño responsive para acceso desde cualquier dispositivo

### Formulario de Recepción
- **Paso 1 - Recepción**: Captura de datos del usuario (nombre, cédula, correo institucional verificado)
- **Paso 2 - Estado**: Registro del estado del equipo, novedades, daños y solicitudes de cambio
- **Paso 3 - Firma**: Captura de firma digital y confirmación final

### Verificación de Correo
- Validación de dominio institucional `@innovaschools.edu.co`
- Sistema de código de verificación de 6 dígitos
- Tiempo de expiración de 10 minutos
- Máximo 3 intentos por código

### Gestión de Equipos
- Carros dinámicos cargados desde Google Sheets
- Verificación de disponibilidad en tiempo real
- Soporte para rangos numéricos de equipos
- Visualización de equipos por carro seleccionado

### Captura de Firma
- Canvas interactivo para firma digital
- Soporte para dispositivos táctiles (móviles/tablets)
- Exportación en formato Base64

### Integración con Google
- Almacenamiento en Google Sheets via Google Apps Script
- Actualización en tiempo real de la disponibilidad de equipos
- Sistema de respaldo con modo demo

---

## Tecnologías Utilizadas

### Frontend
- **HTML5** - Estructura semántica del proyecto
- **CSS3** - Estilos con variables CSS customizadas
  - [`css/index.css`](css/index.css) - Estilos de la página principal
  - [`css/style.css`](css/style.css) - Estilos de los formularios
- **JavaScript (ES6+)** - Lógica de aplicación
  - [`js/script.js`](js/script.js) - Funcionalidad principal
  - [`js/verify.js`](js/verify.js) - Sistema de verificación de correo

### Librerías Externas
- **Google Fonts** - Tipografía Inter (300-800 weights)
- **Font Awesome 6.4.0** - Iconografía vectorial

### Backend
- **Google Apps Script** - API para conexión con Google Sheets
- **Google Sheets** - Almacenamiento de datos

---

## Estructura del Proyecto

```
sistema-recepcion/
├── index.html                  # Página principal de selección de sede
├── README.md                   # Documentación del proyecto
├── requerimientos.txt          # Lista de mejoras y funcionalidades pendientes
│
├── css/
│   ├── index.css              # Estilos homepage (paleta verde/azul)
│   └── style.css             # Estilos formularios (diseño moderno)
│
├── img/
│   └── Innova_Schools_escudo.webp  # Logo institucional
│
├── js/
│   ├── script.js             # Lógica de formularios y Canvas
│   └── verify.js             # Sistema de verificación de email
│
└── view/
    ├── Fzipa.html            # Formulario sede Zipaquirá
    ├── Fniza.html            # Formulario sede Niza
    ├── Fusa.html             # Formulario sede Usaquén
    ├── Fcota.html            # Formulario sede Cota
    ├── Fmosquera.html        # Formulario sede Mosquera
    ├── Ftunja.html           # Formulario sede Tunja
    ├── Fbarranquilla.html    # Formulario sede Barranquilla
    └── terminos.html         # Términos y condiciones
```

---

## Instalación

### Requisitos Previos
- Navegador web moderno (Chrome, Firefox, Edge, Safari)
- Servidor web local o hosting (XAMPP, WAMP, VS Code Live Server, etc.)
- Acceso a internet para cargar fuentes e iconos

### Pasos para Ejecución Local

1. **Clonar o descargar el proyecto**
   ```bash
   git clone <repositorio>
   cd sistema-recepcion
   ```

2. **Iniciar servidor local**
   
   Opción A - VS Code Live Server:
   ```bash
   # Instalar extensión "Live Server" en VS Code
   # Click derecho en index.html > "Open with Live Server"
   ```
   
   Opción B - Python:
   ```bash
   python -m http.server 8000
   ```
   
   Opción C - Node.js:
   ```bash
   npx serve
   ```

3. **Acceder al sistema**
   ```
   http://localhost:8000
   ```

### Configuración de Google Apps Script

Para conectar con Google Sheets, actualiza la URL en [`js/script.js:2`](js/script.js:2):

```javascript
const URL_GOOGLE_SCRIPT = "https://script.google.com/macros/s/TU_ID_DE_SCRIPT/exec";
```

---

## Uso

### Flujo de Usuario

1. **Seleccionar Sede**: En la página principal, elegir la ubicación correspondiente
2. **Completar Formulario**:
   - Ingresar datos personales (nombre, cédula)
   - Verificar correo institucional `@innovaschools.edu.co`
   - Seleccionar carro o equipos a recibir
   - Verificar disponibilidad del equipo
   - Registrar novedades si las hay
   - Firmar digitalmente la recepción
3. **Confirmar**: Revisar datos y enviar formulario

### Navegación entre Pasos

El formulario cuenta con 3 pasos que se avanzan secuencialmente:
- **Paso 1**: Recepción - Datos del colaborador y equipo
- **Paso 2**: Estado - Condición del equipo y novedades
- **Paso 3**: Firma - Firma digital y envío

### Verificación de Correo

1. Ingresar correo institucional
2. Hacer clic en "Verificar"
3. Recibir código de 6 dígitos por email
4. Ingresar código en el modal de verificación
5. El correo se marcará como verificado

---

## Ver en GitHub Pages

Para publicar el sistema en GitHub Pages:

1. **Crear repositorio en GitHub**
2. **Subir todos los archivos** del proyecto
3. **Configurar GitHub Pages**:
   - Ir a Settings > Pages
   - En "Source", seleccionar "main" branch
   - Click en "Save"
4. **Acceder** a `https://tu-usuario.github.io/nombre-repositorio`

> **Nota**: GitHub Pages funciona directamente con archivos HTML estáticos. No requiere build process.

---

## Requerimientos Pendientes

Según [`requerimientos.txt`](requerimientos.txt), las mejoras en desarrollo son:

- Sistema de notificaciones por correo electrónico
- Mejoras adicionales al sistema

---

## Autor

**Innova Schools Colombia**  
Sistema de gestión de recepción de equipos tecnológicos para instituciones educativas.

---

## Licencia

Copyright © 2026 Innova Schools. Todos los derechos reservados.
