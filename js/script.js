// Configuración
const URL_GOOGLE_SCRIPT_DOMAIN = "https://script.google.com/a/macros/innovaschools.edu.co/s/AKfycbw8vPL4YVR1m5tVTvcX0NmnBmakPy_EVz5zrCUKyXVVnKIB779kmqDSPljdkCUnHUPkDg/exec";
const URL_GOOGLE_SCRIPT_PUBLIC = "https://script.google.com/macros/s/AKfycbw8vPL4YVR1m5tVTvcX0NmnBmakPy_EVz5zrCUKyXVVnKIB779kmqDSPljdkCUnHUPkDg/exec";
const URL_GOOGLE_SCRIPT = URL_GOOGLE_SCRIPT_DOMAIN;
let currentRecord = null;
let currentStep = 1;
const totalSteps = 3;

function getAppsScriptFallbackUrl(url) {
    if (url.startsWith(URL_GOOGLE_SCRIPT_DOMAIN)) {
        return url.replace(URL_GOOGLE_SCRIPT_DOMAIN, URL_GOOGLE_SCRIPT_PUBLIC);
    }
    if (url.startsWith(URL_GOOGLE_SCRIPT_PUBLIC)) {
        return url.replace(URL_GOOGLE_SCRIPT_PUBLIC, URL_GOOGLE_SCRIPT_DOMAIN);
    }
    return null;
}

function jsonpRequest(url, timeoutMs = 15000, allowFallback = true) {
    return new Promise((resolve, reject) => {
        const callbackName = `jsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const separator = url.includes('?') ? '&' : '?';
        const script = document.createElement('script');
        const timer = setTimeout(() => {
            cleanup();
            const fallbackUrl = allowFallback ? getAppsScriptFallbackUrl(url) : null;
            if (fallbackUrl) {
                jsonpRequest(fallbackUrl, timeoutMs, false).then(resolve).catch(reject);
                return;
            }
            reject(new Error('Tiempo de espera agotado'));
        }, timeoutMs);


        function cleanup() {
            clearTimeout(timer);
            delete window[callbackName];
            script.remove();
        }

        window[callbackName] = (data) => {
            cleanup();
            resolve(data);
        };

        script.onerror = () => {
            cleanup();
            const fallbackUrl = allowFallback ? getAppsScriptFallbackUrl(url) : null;
            if (fallbackUrl) {
                jsonpRequest(fallbackUrl, timeoutMs, false).then(resolve).catch(reject);
                return;
            }
            reject(new Error('No se pudo conectar con Google Apps Script'));
        };

        script.src = `${url}${separator}callback=${encodeURIComponent(callbackName)}`;
        document.head.appendChild(script);
    });
}

function insertarAvisoCuentaInnova() {
    if (!document.getElementById('form') || document.getElementById('innovaAccountNotice')) return;

    const formHeader = document.querySelector('.form-header');
    if (!formHeader) return;

    formHeader.insertAdjacentHTML('afterend', `
        <div class="innova-account-notice" id="innovaAccountNotice">
            <div class="innova-account-copy">
                <i class="fas fa-circle-user"></i>
                <span>Antes de pedir carros, selecciona una cuenta Google <strong>@innovaschools.edu.co</strong>. Solo se permiten cuentas Innova.</span>
            </div>
            <button type="button" class="innova-account-btn" onclick="abrirSelectorCuentaInnova()">
                <i class="fas fa-right-to-bracket"></i>
                Elegir cuenta Innova
            </button>
        </div>
    `);
}

async function postToAppsScript(payload) {
    return new Promise((resolve, reject) => {
        const id = `appsScriptPost_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const iframe = document.createElement('iframe');
        const form = document.createElement('form');
        const input = document.createElement('textarea');
        let submitted = false;
        
        // Timer de 30 segundos
        const timer = setTimeout(() => {
            cleanup();
            reject(new Error('Tiempo de espera agotado al conectar con el servidor'));
        }, 30000);

        function cleanup() {
            clearTimeout(timer);
            if (form && form.parentNode) form.remove();
            if (iframe && iframe.parentNode) iframe.remove();
        }

        iframe.name = id;
        iframe.style.display = 'none';
        // IMPORTANTE: Añadimos evento de error al iframe
        iframe.onerror = () => {
            cleanup();
            reject(new Error('Error de carga (CORS o Red). Verifica que uses la función postToAppsScript y NO fetch.'));
        };

        // Cuando el iframe termina de cargar
        iframe.onload = () => {
            if (!submitted) return;

            setTimeout(() => {
                try {
                    const iframeHref = iframe.contentWindow && iframe.contentWindow.location
                        ? iframe.contentWindow.location.href
                        : '';

                    if (iframeHref === 'about:blank') {
                        return;
                    }

                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    const responseText = (iframeDoc.body && iframeDoc.body.innerText || '').trim();

                    if (!responseText) {
                        // Google Apps Script a veces devuelve body vacío en POST exitoso
                        cleanup();
                        resolve({ status: 'ok' });
                        return;
                    }

                    if (/Sign in - Google Accounts|accounts\.google\.com|AccountChooser/i.test(responseText)) {
                        cleanup();
                        reject(new Error('Apps Script está pidiendo iniciar sesión. Revisa el deployment: debe permitir acceso al formulario o estar abierto para Anyone.'));
                        return;
                    }

                    const data = JSON.parse(responseText);
                    cleanup();
                    resolve(data);

                } catch (err) {
                    const isCrossOriginReadBlock =
                        err && (
                            err.name === 'SecurityError' ||
                            /cross-origin|Permission denied|Blocked a frame|denied/i.test(err.message || '')
                        );

                    if (isCrossOriginReadBlock) {
                        cleanup();
                        resolve({ status: 'ok', message: 'Operación enviada correctamente' });
                        return;
                    }

                    console.error("Error parseando respuesta del servidor:", err);
                    cleanup();
                    reject(new Error('El servidor devolvió un error inesperado. Revisa el log de Apps Script.'));
                }
            }, 300);
        };

        form.method = 'POST';
        form.action = URL_GOOGLE_SCRIPT;
        form.target = id;
        form.style.display = 'none';

        input.name = 'payload';
        input.value = JSON.stringify(payload);
        form.appendChild(input);

        document.body.appendChild(iframe);
        document.body.appendChild(form);
        submitted = true;
        form.submit();
    });
}

window.postToAppsScript = postToAppsScript;

function dispararProcesamientoDocumentosPendientes() {
    try {
        const url = `${URL_GOOGLE_SCRIPT}?action=procesarDocumentosPendientes&t=${Date.now()}`;
        const beacon = new Image();
        beacon.referrerPolicy = 'no-referrer';
        beacon.src = url;
    } catch (err) {
        console.warn("No se pudo disparar procesamiento de documentos:", err);
    }
}

async function assertAppsScriptDisponible() {
    try {
        const result = await jsonpRequest(`${URL_GOOGLE_SCRIPT}?action=getSedesSoporte`, 8000, true);
        if (result && (Array.isArray(result) || result.status === 'ok' || result.error !== undefined)) {
            return true;
        }
    } catch (err) {
        throw new Error('Apps Script no está disponible como API. Abre el deployment y revisa permisos/acceso: ' + err.message);
    }

    throw new Error('Apps Script respondió algo inesperado. Revisa que la URL sea del deployment activo.');
}

// Variables para el canvas de firma
let signatureCanvas, ctx;
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let metodoFirmaRecepcion = "";
let metodoFirmaDevolucion = "";
let contextoModalFirma = "recepcion";
// Variables globales para equipos
let equiposZipaquira = [];
let carrosDisponibles = [];
let carrosOcupados = [];
let solicitudDevolucionSeleccionada = null;
let equiposBodegaTI = [];
let equiposAdicionalesSeleccionados = [];
let disponibilidadCarrosCache = {
    sede: '',
    fecha: '',
    ocupados: {},
    loadedAt: 0
};
const EQUIPOS_CACHE_TTL_MS = 10 * 60 * 1000;
let equiposPrecarga = {
    key: '',
    promise: null,
    data: null,
    disponibilidad: null
};

function validarCorreoInstitucional(email) {
    return /^[^\s@]+@innovaschools\.edu\.co$/i.test(String(email || '').trim());
}

function obtenerCorreoInnovaActual() {
    const correoFormulario = document.getElementById('correo')?.value || '';
    const correoGuardado = localStorage.getItem('innovaAccountEmail') || '';
    const correoSoporte = localStorage.getItem('emailSoporte') || '';
    return String(correoFormulario || correoGuardado || correoSoporte || '').trim().toLowerCase();
}

function requiereVerificarCorreoParaCargar() {
    return Boolean(document.getElementById('form') && document.getElementById('correo') && document.getElementById('btnVerificar'));
}

function puedeCargarEquiposConCorreoVerificado() {
    if (!requiereVerificarCorreoParaCargar()) return true;

    const correo = obtenerCorreoInnovaActual();
    if (!validarCorreoInstitucional(correo)) return false;

    if (typeof correoEstaVerificado === 'function') {
        return correoEstaVerificado(correo);
    }

    return false;
}

function normalizarClave(valor) {
    return String(valor || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function obtenerFechaLocalISO() {
    const ahora = new Date();
    const year = ahora.getFullYear();
    const month = String(ahora.getMonth() + 1).padStart(2, '0');
    const day = String(ahora.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function obtenerClaveCacheEquipos(sede) {
    return `equipos_${normalizarClave(sede)}_${obtenerFechaLocalISO()}`;
}

function prepararCarrosDesdeEquipos(data) {
    equiposZipaquira = Array.isArray(data)
        ? data.filter(e => String(e?.carro || '').trim().toLowerCase() !== 'bodega ti')
        : [];

    const carrosSet = new Set();
    equiposZipaquira.forEach(e => {
        if (e && e.carro) carrosSet.add(String(e.carro));
    });

    try {
        carrosDisponibles = [...carrosSet].sort((a, b) => {
            const strA = String(a);
            const strB = String(b);
            const matchA = strA.match(/\d+/);
            const matchB = strB.match(/\d+/);
            const numA = matchA ? parseInt(matchA[0]) : 999;
            const numB = matchB ? parseInt(matchB[0]) : 999;
            return numA - numB;
        });
    } catch (e) {
        carrosDisponibles = [...carrosSet];
    }

    return carrosDisponibles;
}

function renderizarCarrosSelect() {
    const select = document.getElementById('carroSelect');
    if (!select) {
        console.warn("No se encontró el elemento #carroSelect en el DOM.");
        return false;
    }

    select.innerHTML = '<option value="">Seleccione un carro...</option>';
    select.disabled = false;

    carrosDisponibles.forEach(carro => {
        const option = document.createElement('option');
        option.value = carro;
        option.textContent = carro;
        select.appendChild(option);
    });

    aplicarDisponibilidadAlSelect();
    return true;
}

function guardarEquiposCache(sede, data) {
    if (!Array.isArray(data)) return;

    try {
        localStorage.setItem(obtenerClaveCacheEquipos(sede), JSON.stringify({
            savedAt: Date.now(),
            data
        }));
    } catch (err) {
        console.warn("No se pudo guardar caché de equipos:", err);
    }
}

function cargarEquiposCache(sede) {
    try {
        const raw = localStorage.getItem(obtenerClaveCacheEquipos(sede));
        if (!raw) return null;

        const cached = JSON.parse(raw);
        if (!cached || !Array.isArray(cached.data)) return null;
        if ((Date.now() - Number(cached.savedAt || 0)) > EQUIPOS_CACHE_TTL_MS) return null;

        return cached.data;
    } catch (err) {
        console.warn("No se pudo leer caché de equipos:", err);
        return null;
    }
}

function obtenerSedeActualNormalizada() {
    const sedeInput = document.getElementById('sede');
    if (sedeInput?.value) return normalizarClave(sedeInput.value);

    const params = new URLSearchParams(window.location.search);
    return normalizarClave(params.get('sede') || '');
}

function obtenerClavePrecargaEquipos(sede, correo) {
    return `${normalizarClave(sede)}_${String(correo || '').trim().toLowerCase()}_${obtenerFechaLocalISO()}`;
}

function guardarPrecargaEquipos(sede, correo, data, disponibilidad) {
    const key = obtenerClavePrecargaEquipos(sede, correo);
    equiposPrecarga = {
        key,
        promise: null,
        data: Array.isArray(data) ? data : null,
        disponibilidad: disponibilidad || null
    };
}

function consumirPrecargaEquipos(sede, correo) {
    const key = obtenerClavePrecargaEquipos(sede, correo);
    if (equiposPrecarga.key !== key || !Array.isArray(equiposPrecarga.data)) return null;
    return {
        data: equiposPrecarga.data,
        disponibilidad: equiposPrecarga.disponibilidad
    };
}

function precargarEquiposPorSede(correo) {
    const sedeParaURL = obtenerSedeActualNormalizada();
    const correoLimpio = String(correo || obtenerCorreoInnovaActual()).trim().toLowerCase();
    if (!sedeParaURL || !validarCorreoInstitucional(correoLimpio)) return null;

    const cached = cargarEquiposCache(sedeParaURL);
    if (Array.isArray(cached) && cached.length > 0) {
        guardarPrecargaEquipos(sedeParaURL, correoLimpio, cached, disponibilidadCarrosCache);
        return Promise.resolve(cached);
    }

    const key = obtenerClavePrecargaEquipos(sedeParaURL, correoLimpio);
    if (equiposPrecarga.key === key && equiposPrecarga.promise) {
        return equiposPrecarga.promise;
    }

    const select = document.getElementById('carroSelect');
    if (select && select.disabled) {
        select.innerHTML = '<option value="">Preparando carros...</option>';
    }

    const url = `${URL_GOOGLE_SCRIPT}?action=getEquipos&sede=${encodeURIComponent(sedeParaURL)}&correo=${encodeURIComponent(correoLimpio)}`;
    const disponibilidadUrl = `${URL_GOOGLE_SCRIPT}?action=getDisponibilidadSede&sede=${encodeURIComponent(sedeParaURL)}&fecha=${encodeURIComponent(obtenerFechaLocalISO())}&correo=${encodeURIComponent(correoLimpio)}`;

    const promise = Promise.all([
        jsonpRequest(url),
        jsonpRequest(disponibilidadUrl).catch(err => {
            console.warn("No se pudo precargar disponibilidad:", err);
            return null;
        })
    ]).then(([data, disponibilidad]) => {
        if (data && data.error) throw new Error(data.error);
        guardarPrecargaEquipos(sedeParaURL, correoLimpio, data, disponibilidad);
        guardarEquiposCache(sedeParaURL, data);
        return data;
    }).catch(err => {
        console.warn("No se pudo precargar equipos:", err);
        if (equiposPrecarga.key === key) equiposPrecarga.promise = null;
        return null;
    });

    equiposPrecarga = {
        key,
        promise,
        data: null,
        disponibilidad: null
    };

    return promise;
}

window.precargarEquiposPorSede = precargarEquiposPorSede;

function obtenerUrlPreviewDrive(url) {
    const texto = String(url || '').trim();
    if (!texto) return '';
    const match = texto.match(/\/d\/([^/]+)/) || texto.match(/[?&]id=([^&]+)/);
    if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
    return texto;
}

function esValorSi(valor) {
    const limpio = String(valor || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    return limpio.startsWith('si');
}
// Cargar equipos al iniciar
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM cargado, inicializando...");
    if (typeof mostrarModalCuentaInnova === 'function') {
        mostrarModalCuentaInnova();
    }
    if (typeof insertarAvisoCuentaInnova === 'function') {
        insertarAvisoCuentaInnova();
    }
    if (typeof aplicarCuentaInnovaGuardada === 'function') {
        aplicarCuentaInnovaGuardada();
    }

    if (document.getElementById('form')) {
        initializeEventListeners();
    }

    if (document.querySelector('.progress-bar')) {
        updateProgressBar();
    }

    if (document.getElementById('recordsGrid')) {
        loadRecords();
    }

    if (document.getElementById('fecha')) {
        setDefaultDate();
    }

    if (document.getElementById('enCursoTableBody')) {
        cargarSolicitudesEnCurso();
    }

    if (document.getElementById('signatureCanvasDevolucion')) {
        initSignatureDevolucion();
    }

    asegurarSelectorMetodoFirma();

    inicializarEquiposAdicionales();
    if (document.getElementById('carroSelect') && (document.getElementById('sede') || window.location.search.includes('sede='))) {
        cargarEquiposPorSede();
        setTimeout(() => {
            cargarEquiposAdicionalesBodega();
        }, 100); 
    }
});

// Función general para cargar equipos según la sede
// Función mejorada para cargar equipos según la sede
async function cargarEquiposPorSede() {
    // 1. Intentar obtener el valor del input hidden
    let sedeInput = document.getElementById('sede');
    let sedeNombre = "";

    // Si el input no existe, intentar obtenerlo de la URL directamente
    if (!sedeInput) {
        const params = new URLSearchParams(window.location.search);
        sedeNombre = params.get('sede') || "";
        console.log("Input #sede no encontrado, usando valor de URL:", sedeNombre);
    } else {
        sedeNombre = sedeInput.value;
    }

    if (!sedeNombre) {
        console.warn("No se pudo determinar la sede. Cargado cancelado.");
        return;
    }

    const correoSoporte = obtenerCorreoInnovaActual();
    // Normalizar nombre para URL (quitar tildes, minúsculas)
    const sedeParaURL = normalizarClave(sedeNombre);

    if (!puedeCargarEquiposConCorreoVerificado()) {
        const select = document.getElementById('carroSelect');
        if (select) {
            select.innerHTML = '<option value="">Verifica tu correo Innova para cargar los carros</option>';
            select.disabled = true;
        }
        return;
    }

    console.log(`=== INICIANDO CARGA DE EQUIPOS ===`);
    console.log(`Sede detectada: ${sedeNombre}`);
    console.log(`Sede para URL: ${sedeParaURL}`);

    const equiposCache = cargarEquiposCache(sedeParaURL);
    const tieneCache = Array.isArray(equiposCache) && equiposCache.length > 0;

    if (tieneCache) {
        prepararCarrosDesdeEquipos(equiposCache);
        renderizarCarrosSelect();
        console.log(`? Carros cargados desde caché para ${sedeNombre}`);
    }

    const precargaLista = consumirPrecargaEquipos(sedeParaURL, correoSoporte);
    if (!tieneCache && precargaLista) {
        prepararCarrosDesdeEquipos(precargaLista.data);
        guardarDisponibilidadCache(sedeParaURL, precargaLista.disponibilidad);
        renderizarCarrosSelect();
        console.log(`Carros cargados desde precarga para ${sedeNombre}`);
        return;
    }

    const keyPrecarga = obtenerClavePrecargaEquipos(sedeParaURL, correoSoporte);
    if (!tieneCache && equiposPrecarga.key === keyPrecarga && equiposPrecarga.promise) {
        await equiposPrecarga.promise;
        const precargaTerminada = consumirPrecargaEquipos(sedeParaURL, correoSoporte);
        if (precargaTerminada) {
            prepararCarrosDesdeEquipos(precargaTerminada.data);
            guardarDisponibilidadCache(sedeParaURL, precargaTerminada.disponibilidad);
            renderizarCarrosSelect();
            console.log(`Carros cargados desde precarga finalizada para ${sedeNombre}`);
            return;
        }
    }

    try {
        // Construir URL de petición
        const url = `${URL_GOOGLE_SCRIPT}?action=getEquipos&sede=${encodeURIComponent(sedeParaURL)}&correo=${encodeURIComponent(correoSoporte)}`;
        const disponibilidadUrl = `${URL_GOOGLE_SCRIPT}?action=getDisponibilidadSede&sede=${encodeURIComponent(sedeParaURL)}&fecha=${encodeURIComponent(obtenerFechaLocalISO())}&correo=${encodeURIComponent(correoSoporte)}`;
        
        const [data, disponibilidad] = await Promise.all([
            jsonpRequest(url),
            jsonpRequest(disponibilidadUrl).catch(err => {
                console.warn("No se pudo precargar disponibilidad:", err);
                return null;
            })
        ]);

        if (data.error) {
            console.error("Error del servidor al cargar equipos:", data.error);
            const select = document.getElementById('carroSelect');
            if(select) {
                select.innerHTML = '<option value="">Error: ' + data.error + '</option>';
                select.disabled = true;
            }
            return;
        }

        prepararCarrosDesdeEquipos(data);
        guardarEquiposCache(sedeParaURL, data);
        guardarDisponibilidadCache(sedeParaURL, disponibilidad);
        renderizarCarrosSelect();

        console.log(`? ÉXITO: Cargados ${carrosDisponibles.length} carros para la sede ${sedeNombre}`);

    } catch (error) {
        console.error("Error crítico cargando equipos:", error);
        if (tieneCache) {
            showToast('Mostrando carros guardados. No se pudo refrescar con Google.', 'warning');
            return;
        }

        const select = document.getElementById('carroSelect');
        if(select) {
            select.innerHTML = '<option value="">Error de conexión</option>';
            select.disabled = true;
        }
    }
}

function inicializarEquiposAdicionales() {
    if (!document.getElementById('form') || document.getElementById('equiposAdicionalesToggle')) return;
    asegurarEstilosEquiposAdicionales();

    const otrosBox = document.getElementById('otrosEquiposBox');
    const anchor = otrosBox || document.getElementById('equiposContainer');
    if (!anchor) return;

    const html = `
        <div class="input-group full-width additional-equipment-entry">
            <label class="additional-toggle-card" for="equiposAdicionalesToggle">
                <span class="additional-toggle-copy">
                    <strong><i class="fas fa-laptop-medical"></i> ¿Desea agregar equipos adicionales?</strong>
                    <small>Selecciona equipos disponibles de BODEGA TI uno por uno.</small>
                </span>
                <span class="additional-switch">
                    <input type="checkbox" id="equiposAdicionalesToggle" onchange="toggleEquiposAdicionales()">
                    <span></span>
                </span>
            </label>
            <div class="additional-summary" id="equiposAdicionalesResumen" hidden>
                <div>
                    <strong id="equiposAdicionalesCount">0 equipos adicionales</strong>
                    <p id="equiposAdicionalesDetalle">Sin equipos seleccionados</p>
                </div>
                <button type="button" class="btn-additional-open" onclick="abrirModalEquiposAdicionales()">
                    <i class="fas fa-box-open"></i> Gestionar
                </button>
            </div>
        </div>
    `;
    anchor.insertAdjacentHTML('afterend', html);

    if (!document.getElementById('equiposAdicionalesModal')) {
        document.body.insertAdjacentHTML('beforeend', crearModalEquiposAdicionales());
    }
}

function asegurarEstilosEquiposAdicionales() {
    if (document.getElementById('equiposAdicionalesStyles')) return;
    const style = document.createElement('style');
    style.id = 'equiposAdicionalesStyles';
    style.textContent = `
        .additional-equipment-entry { margin-top: 1rem; }
        .additional-toggle-card {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            padding: 1rem;
            border: 1px solid rgba(15, 23, 42, 0.10);
            border-radius: 12px;
            background: linear-gradient(135deg, rgba(255,255,255,0.96), rgba(248,250,252,0.96));
            cursor: pointer;
            box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
        }
        .additional-toggle-copy { display: grid; gap: 0.25rem; color: #0f172a; }
        .additional-toggle-copy small { color: #64748b; font-weight: 600; }
        .additional-switch input { display: none; }
        .additional-switch span {
            position: relative;
            display: block;
            width: 54px;
            height: 30px;
            border-radius: 999px;
            background: #cbd5e1;
            transition: background 0.2s ease;
        }
        .additional-switch span::after {
            content: '';
            position: absolute;
            width: 24px;
            height: 24px;
            top: 3px;
            left: 3px;
            border-radius: 999px;
            background: #fff;
            box-shadow: 0 2px 8px rgba(15, 23, 42, 0.18);
            transition: transform 0.2s ease;
        }
        .additional-switch input:checked + span { background: #16a34a; }
        .additional-switch input:checked + span::after { transform: translateX(24px); }
        .additional-summary {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
            margin-top: 0.75rem;
            padding: 0.9rem;
            border-radius: 12px;
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
        }
        .additional-summary p { margin: 0.2rem 0 0; color: #166534; font-size: 0.86rem; }
        .additional-return-panel {
            margin: 1rem 0;
            padding: 1rem;
            border: 1px solid #bbf7d0;
            border-radius: 12px;
            background: #f0fdf4;
        }
        .additional-return-panel h3 {
            margin: 0 0 0.35rem;
            color: #14532d;
            font-size: 1rem;
        }
        .additional-return-panel p {
            margin: 0 0 0.75rem;
            color: #166534;
            font-size: 0.86rem;
        }
        .additional-return-list {
            display: grid;
            gap: 0.55rem;
        }
        .additional-return-item {
            display: flex;
            align-items: flex-start;
            gap: 0.65rem;
            padding: 0.75rem;
            border: 1px solid #dcfce7;
            border-radius: 10px;
            background: #fff;
            cursor: pointer;
        }
        .additional-return-item input {
            margin-top: 0.15rem;
            width: 18px;
            height: 18px;
            accent-color: #16a34a;
        }
        .additional-return-item strong {
            color: #0f172a;
        }
        .additional-return-item span {
            display: block;
            margin-top: 0.15rem;
            color: #64748b;
            font-size: 0.8rem;
            line-height: 1.35;
        }
        .btn-additional-open,
        .additional-modal-close,
        .additional-modal-refresh,
        .additional-done {
            border: 0;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 800;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.45rem;
        }
        .btn-additional-open,
        .additional-done {
            padding: 0.7rem 0.95rem;
            color: #fff;
            background: linear-gradient(135deg, #16a34a, #0f766e);
        }
        .additional-modal {
            position: fixed;
            inset: 0;
            z-index: 10020;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            background: rgba(15, 23, 42, 0.58);
            backdrop-filter: blur(8px);
        }
        .additional-modal.active { display: flex; }
        .additional-dialog {
            width: min(980px, 100%);
            max-height: min(760px, 92vh);
            display: flex;
            flex-direction: column;
            border-radius: 16px;
            background: #fff;
            overflow: hidden;
            box-shadow: 0 28px 80px rgba(15, 23, 42, 0.3);
        }
        .additional-modal-header,
        .additional-modal-footer {
            padding: 1rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            border-bottom: 1px solid #e2e8f0;
        }
        .additional-modal-footer { border-top: 1px solid #e2e8f0; border-bottom: 0; }
        .additional-modal-header h3 { margin: 0; color: #0f172a; }
        .additional-modal-header p { margin: 0.25rem 0 0; color: #64748b; font-size: 0.9rem; }
        .additional-modal-close,
        .additional-modal-refresh {
            min-width: 38px;
            min-height: 38px;
            color: #334155;
            background: #f1f5f9;
        }
        .additional-toolbar {
            display: grid;
            grid-template-columns: minmax(180px, 260px) 1fr auto;
            gap: 0.75rem;
            padding: 1rem;
            border-bottom: 1px solid #e2e8f0;
        }
        .additional-toolbar input,
        .additional-toolbar select {
            width: 100%;
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            padding: 0.8rem 0.9rem;
            font-weight: 600;
            background: #fff;
        }
        .additional-list {
            padding: 1rem;
            overflow: auto;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
            gap: 0.75rem;
        }
        .additional-item {
            text-align: left;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 0.85rem;
            background: #fff;
            cursor: pointer;
            transition: border 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
        }
        .additional-item:hover:not(:disabled) {
            transform: translateY(-1px);
            border-color: #86efac;
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
        }
        .additional-item.selected { border-color: #16a34a; background: #f0fdf4; }
        .additional-item:disabled { opacity: 0.55; cursor: not-allowed; background: #f8fafc; }
        .additional-item-head { display: flex; justify-content: space-between; gap: 0.5rem; align-items: flex-start; }
        .additional-item-title { margin: 0; font-weight: 900; color: #0f172a; }
        .additional-item-meta { margin: 0.45rem 0 0; color: #64748b; font-size: 0.82rem; line-height: 1.45; }
        .stock-badge { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.72rem; font-weight: 900; padding: 0.25rem 0.45rem; border-radius: 999px; white-space: nowrap; }
        .stock-badge.available { color: #166534; background: #dcfce7; }
        .stock-badge.busy { color: #991b1b; background: #fee2e2; }
        @media (max-width: 640px) {
            .additional-toggle-card,
            .additional-summary,
            .additional-modal-header,
            .additional-modal-footer { align-items: stretch; flex-direction: column; }
            .additional-toolbar { grid-template-columns: 1fr; }
            .additional-list { grid-template-columns: 1fr; }
            .btn-additional-open,
            .additional-done { width: 100%; }
        }
    `;
    document.head.appendChild(style);
}

function crearModalEquiposAdicionales() {
    return `
        <div class="additional-modal" id="equiposAdicionalesModal" aria-hidden="true">
            <div class="additional-dialog" role="dialog" aria-modal="true" aria-labelledby="equiposAdicionalesTitle">
                <div class="additional-modal-header">
                    <div>
                        <h3 id="equiposAdicionalesTitle">Equipos disponibles en BODEGA TI</h3>
                        <p>Selecciona uno por uno. Los ocupados aparecen bloqueados.</p>
                    </div>
                    <button type="button" class="additional-modal-close" onclick="cerrarModalEquiposAdicionales()" aria-label="Cerrar">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="additional-toolbar">
                    <select id="filtroEquipoAdicional" class="form-input" onchange="renderizarEquiposAdicionales()">
                        <option value="">Todos los equipos adicionales</option>
                    </select>
                    <input type="search" id="buscarEquipoAdicional" placeholder="Buscar por nombre, placa o serial..." oninput="renderizarEquiposAdicionales()">
                    <button type="button" class="additional-modal-refresh" onclick="cargarEquiposAdicionalesBodega(true)" title="Actualizar disponibilidad">
                        <i class="fas fa-rotate"></i>
                    </button>
                </div>
                <div class="additional-list" id="equiposAdicionalesLista">
                    <div class="table-empty">Cargando inventario...</div>
                </div>
                <div class="additional-modal-footer">
                    <span id="equiposAdicionalesModalCount">0 seleccionados</span>
                    <button type="button" class="additional-done" onclick="cerrarModalEquiposAdicionales()">
                        <i class="fas fa-check"></i> Listo
                    </button>
                </div>
            </div>
        </div>
    `;
}

function toggleEquiposAdicionales() {
    const checked = document.getElementById('equiposAdicionalesToggle')?.checked;
    const resumen = document.getElementById('equiposAdicionalesResumen');
    if (resumen) resumen.hidden = !checked;
    if (checked) {
        cargarEquiposAdicionalesBodega();
        abrirModalEquiposAdicionales();
    } else {
        equiposAdicionalesSeleccionados = [];
        actualizarResumenEquiposAdicionales();
    }
}

async function cargarEquiposAdicionalesBodega(force = false) {
    if (!document.getElementById('equiposAdicionalesToggle') && !force) return;
    const sedeInput = document.getElementById('sede');
    const sede = sedeInput ? sedeInput.value : obtenerSedeDesdeURL();
    if (!sede) return;

    if (!puedeCargarEquiposConCorreoVerificado()) {
        const lista = document.getElementById('equiposAdicionalesLista');
        if (lista) lista.innerHTML = '<div class="table-empty">Verifica tu correo Innova para cargar BODEGA TI</div>';
        return;
    }

    if (!force && equiposBodegaTI.length) {
        renderizarEquiposAdicionales();
        return;
    }

    const lista = document.getElementById('equiposAdicionalesLista');
    if (lista) lista.innerHTML = '<div class="table-empty">Cargando inventario...</div>';

    try {
        const correoSoporte = obtenerCorreoInnovaActual();
        const data = await jsonpRequest(`${URL_GOOGLE_SCRIPT}?action=getEquiposBodega&sede=${encodeURIComponent(sede)}&correo=${encodeURIComponent(correoSoporte)}`);
        if (data && data.status === 'error') throw new Error(data.error || 'Error cargando BODEGA TI');
        equiposBodegaTI = Array.isArray(data) ? data : [];
        equiposAdicionalesSeleccionados = equiposAdicionalesSeleccionados.filter(sel =>
            equiposBodegaTI.some(eq => getEquipoAdicionalKey(eq) === getEquipoAdicionalKey(sel) && eq.disponible)
        );
        poblarFiltroEquiposAdicionales();
        renderizarEquiposAdicionales();
        actualizarResumenEquiposAdicionales();
    } catch (err) {
        console.error(err);
        if (lista) lista.innerHTML = '<div class="table-empty">No se pudo cargar BODEGA TI</div>';
    }
}

function abrirModalEquiposAdicionales() {
    const modal = document.getElementById('equiposAdicionalesModal');
    if (!modal) return;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    renderizarEquiposAdicionales();
}

function cerrarModalEquiposAdicionales() {
    const modal = document.getElementById('equiposAdicionalesModal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
}

function getEquipoAdicionalKey(eq) {
    return String(eq?.serial || eq?.placa || eq?.id || '').trim().toLowerCase();
}

function poblarFiltroEquiposAdicionales() {
    const filtro = document.getElementById('filtroEquipoAdicional');
    if (!filtro) return;
    const valorActual = filtro.value;
    const opciones = [...new Set(equiposBodegaTI.map(eq => eq.equipo || eq.nombre || '').filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'es'));
    filtro.innerHTML = '<option value="">Todos los equipos adicionales</option>' +
        opciones.map(nombre => `<option value="${nombre}">${nombre}</option>`).join('');
    if (opciones.includes(valorActual)) filtro.value = valorActual;
}

function normalizarEquipoAdicional(eq, responsable = '') {
    return {
        equipo: eq.equipo || eq.nombre || 'Equipo adicional',
        cantidad: Number(eq.cantidad || 1),
        serial: eq.serial || '',
        placa: eq.placa || '',
        estado: eq.estado || 'Activo',
        sede: eq.sede || document.getElementById('sede')?.value || '',
        responsable: responsable || '',
        devuelto: eq.devuelto === true,
        fecha_devolucion: eq.fecha_devolucion || '',
        hora_devolucion: eq.hora_devolucion || '',
        observacion: eq.observacion || ''
    };
}

function parseEquiposAdicionales(valor) {
    const texto = String(valor || '').trim();
    if (!texto) return [];
    try {
        const parsed = JSON.parse(texto);
        if (Array.isArray(parsed)) return parsed.map(eq => normalizarEquipoAdicional(eq));
    } catch (err) {
        // Puede venir de registros antiguos en texto plano.
    }

    return texto
        .split('\n')
        .filter(linea => /Adicional\s+\d+|Placa:|Serial:/i.test(linea))
        .map(linea => {
            const serialMatch = linea.match(/Serial:\s*([^\s-]+)/i);
            const placaMatch = linea.match(/Placa:\s*([^\s-]+)/i);
            const estadoMatch = linea.match(/Estado:\s*([^-]+)/i);
            const sedeMatch = linea.match(/Sede:\s*([^-]+)/i);
            const responsableMatch = linea.match(/Responsable:\s*(.+)$/i);
            const nombreMatch = linea.match(/Adicional\s+\d+\.\s*(.*?)\s*-\s*Placa:/i) ||
                linea.match(/Equipo:\s*(.*?)\s*-\s*Serial:/i);
            return normalizarEquipoAdicional({
                equipo: nombreMatch ? nombreMatch[1].trim() : 'Equipo adicional',
                serial: serialMatch ? serialMatch[1].trim() : '',
                placa: placaMatch ? placaMatch[1].trim() : '',
                estado: estadoMatch ? estadoMatch[1].trim() : 'Activo',
                sede: sedeMatch ? sedeMatch[1].trim() : '',
                responsable: responsableMatch ? responsableMatch[1].trim() : ''
            });
        });
}

function stringifyEquiposAdicionales(equipos) {
    return JSON.stringify((equipos || []).map(eq => normalizarEquipoAdicional(eq)));
}

function textoEquiposAdicionales(equipos) {
    return (equipos || []).map((eq, i) => {
        const item = normalizarEquipoAdicional(eq);
        return `Adicional ${i + 1}. ${item.equipo} - Cantidad: ${item.cantidad} - Placa: ${item.placa || '-'} - Serial: ${item.serial || '-'} - Estado: ${item.estado || 'Activo'} - Sede: ${item.sede || '-'} - Responsable: ${item.responsable || '-'}`;
    }).join('\n');
}

function renderizarEquiposAdicionales() {
    const lista = document.getElementById('equiposAdicionalesLista');
    if (!lista) return;
    const q = (document.getElementById('buscarEquipoAdicional')?.value || '').toLowerCase();
    const filtroEquipo = (document.getElementById('filtroEquipoAdicional')?.value || '').toLowerCase();
    const filtrados = equiposBodegaTI.filter(eq => {
        const texto = [eq.equipo, eq.placa, eq.serial, eq.estado, eq.motivo, eq.carro].join(' ').toLowerCase();
        const coincideEquipo = !filtroEquipo || String(eq.equipo || '').toLowerCase() === filtroEquipo;
        return coincideEquipo && (!q || texto.includes(q));
    });

    if (!filtrados.length) {
        lista.innerHTML = '<div class="table-empty">No hay equipos de BODEGA TI para mostrar</div>';
        return;
    }

    lista.innerHTML = '';
    filtrados.forEach(eq => {
        const key = getEquipoAdicionalKey(eq);
        const selected = equiposAdicionalesSeleccionados.some(item => getEquipoAdicionalKey(item) === key);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `additional-item ${selected ? 'selected' : ''}`;
        btn.disabled = !eq.disponible;
        btn.innerHTML = `
            <div class="additional-item-head">
                <p class="additional-item-title">${eq.equipo || 'Equipo'}</p>
                <span class="stock-badge ${eq.disponible ? 'available' : 'busy'}">
                    <i class="fas fa-circle"></i> ${eq.disponible ? 'Disponible' : 'No disponible'}
                </span>
            </div>
            <p class="additional-item-meta">
                Ubicación: <strong>${eq.carro || 'BODEGA TI'}</strong><br>
                Placa: <strong>${eq.placa || '-'}</strong><br>
                Serial: <strong>${eq.serial || '-'}</strong><br>
                Estado: ${eq.estado || eq.motivo || '-'}
            </p>
        `;
        btn.addEventListener('click', () => toggleSeleccionEquipoAdicional(eq));
        lista.appendChild(btn);
    });

    const count = document.getElementById('equiposAdicionalesModalCount');
    if (count) count.textContent = `${equiposAdicionalesSeleccionados.length} seleccionados`;
}

function toggleSeleccionEquipoAdicional(eq) {
    if (!eq?.disponible) {
        showToast('Este equipo no está disponible', 'error');
        return;
    }
    const key = getEquipoAdicionalKey(eq);
    const exists = equiposAdicionalesSeleccionados.some(item => getEquipoAdicionalKey(item) === key);
    equiposAdicionalesSeleccionados = exists
        ? equiposAdicionalesSeleccionados.filter(item => getEquipoAdicionalKey(item) !== key)
        : [...equiposAdicionalesSeleccionados, eq];
    const toggle = document.getElementById('equiposAdicionalesToggle');
    if (toggle) toggle.checked = equiposAdicionalesSeleccionados.length > 0;
    const resumen = document.getElementById('equiposAdicionalesResumen');
    if (resumen) resumen.hidden = equiposAdicionalesSeleccionados.length === 0;
    renderizarEquiposAdicionales();
    actualizarResumenEquiposAdicionales();
}

function actualizarResumenEquiposAdicionales() {
    const count = document.getElementById('equiposAdicionalesCount');
    const detail = document.getElementById('equiposAdicionalesDetalle');
    const modalCount = document.getElementById('equiposAdicionalesModalCount');
    const total = equiposAdicionalesSeleccionados.length;
    if (count) count.textContent = `${total} equipo${total === 1 ? '' : 's'} adicional${total === 1 ? '' : 'es'}`;
    if (detail) {
        detail.textContent = total
            ? equiposAdicionalesSeleccionados.map(eq => eq.placa || eq.serial || eq.equipo).join(', ')
            : 'Sin equipos seleccionados';
    }
    if (modalCount) modalCount.textContent = `${total} seleccionados`;
}

// Función para alternar entre carros y otros equipos
function toggleOtrosEquipos() {
    const esOtros = Boolean(document.getElementById('otrosEquipos')?.checked);
    const selectCarro = document.getElementById('carroSelect');
    const equiposContainer = document.getElementById('equiposContainer');
    const otrosBox = document.getElementById('otrosEquiposBox');
    const disponibilidadMsg = document.getElementById('disponibilidadMsg');
    if (!selectCarro || !equiposContainer || !otrosBox) return;
    
    if (esOtros) {
        selectCarro.required = false;
        selectCarro.disabled = true;
        selectCarro.value = "";
        equiposContainer.style.display = 'none';
        otrosBox.classList.remove('hidden');
        disponibilidadMsg.innerHTML = '';
        if (document.getElementById('rangoInicio')) document.getElementById('rangoInicio').required = true;
        if (document.getElementById('rangoFin')) document.getElementById('rangoFin').required = true;
    } else {
        selectCarro.required = true;
        selectCarro.disabled = false;
        otrosBox.classList.add('hidden');
        if (document.getElementById('rangoInicio')) document.getElementById('rangoInicio').required = false;
        if (document.getElementById('rangoFin')) document.getElementById('rangoFin').required = false;
        if (document.getElementById('rangoInicio')) document.getElementById('rangoInicio').value = '';
        if (document.getElementById('rangoFin')) document.getElementById('rangoFin').value = '';
    }
}

// Validar rango numérico
function validarRango() {
    const inicio = parseInt(document.getElementById('rangoInicio')?.value) || 0;
    const fin = parseInt(document.getElementById('rangoFin')?.value) || 0;
    const errorMsg = document.getElementById('rangoError');
    const totalLabel = document.getElementById('totalOtrosEquipos');
    if (!errorMsg || !totalLabel) return true;
    
    if (inicio > 0 && fin > 0) {
        const total = fin - inicio + 1;
        if (fin < inicio || total > 500) {
            errorMsg.style.display = 'block';
            totalLabel.textContent = '0';
            return false;
        } else {
            errorMsg.style.display = 'none';
            totalLabel.textContent = total;
            if (total > 100) {
                totalLabel.innerHTML = total + ' <span style="color: #f59e0b;"><i class="fas fa-exclamation-triangle"></i> Muchos equipos</span>';
            }
            return true;
        }
    }
    return false;
}

// Validar hora máxima (3pm)
function validarHora() {
    const horaInput = document.getElementById('horaDevolucion');
    const hora = horaInput.value;
    const errorMsg = document.getElementById('horaError');
    
    const horaMin = "07:00";
    const horaMax = "15:00";

    if (hora < horaMin || hora > horaMax) {
        errorMsg.style.display = 'block';
        errorMsg.textContent = "La hora debe estar entre 7:00 AM y 3:00 PM";
        
        horaInput.value = ""; // limpiar
        
        setTimeout(() => {
            errorMsg.style.display = 'none';
        }, 8000);
        
        return false;
    }

    errorMsg.style.display = 'none';
    return true;
}

function guardarDisponibilidadCache(sede, data) {
    if (!data || data.status === 'error') return;
    disponibilidadCarrosCache = {
        sede: normalizarClave(data.sede || sede),
        fecha: data.fecha || obtenerFechaLocalISO(),
        ocupados: data.ocupados || {},
        loadedAt: Date.now()
    };
}

function obtenerDisponibilidadLocal(carro, sede) {
    const mismaSede = normalizarClave(sede) === normalizarClave(disponibilidadCarrosCache.sede);
    const mismaFecha = disponibilidadCarrosCache.fecha === obtenerFechaLocalISO();
    if (!mismaSede || !mismaFecha) return null;
    return disponibilidadCarrosCache.ocupados[carro] || null;
}

function aplicarDisponibilidadAlSelect() {
    const select = document.getElementById('carroSelect');
    if (!select) return;

    Array.from(select.options).forEach(option => {
        if (!option.value) return;
        const info = disponibilidadCarrosCache.ocupados[option.value];
        option.disabled = Boolean(info);
        option.textContent = info ? `${option.value} (Ocupado)` : option.value;
    });
}

function pintarDisponibilidad(data) {
    const msgDiv = document.getElementById('disponibilidadMsg');
    const btnNext = document.querySelector('.btn-next');
    if (!msgDiv) return;

    if (data && data.ocupado) {
        msgDiv.innerHTML = `
            <div style="background: #fee2e2; border: 1px solid #ef4444; border-radius: 6px; padding: 10px; margin-top: 5px;">
                <span style="color: #dc2626; font-weight: 600;">
                    <i class="fas fa-ban"></i> CARRO NO DISPONIBLE
                </span><br>
                <span style="color: #7f1d1d; font-size: 0.9rem;">
                    Este carro está ocupado hasta las <strong>${data.hora_devolucion || '15:00'}</strong><br>
                    Por: ${data.usuario || 'Usuario no especificado'}
                </span>
            </div>
        `;
        if (btnNext) {
            btnNext.disabled = true;
            btnNext.style.opacity = '0.5';
            btnNext.style.cursor = 'not-allowed';
        }
        return;
    }

    msgDiv.innerHTML = `
        <div style="background: #dcfce7; border: 1px solid #22c55e; border-radius: 6px; padding: 8px; margin-top: 5px;">
            <span style="color: #16a34a; font-weight: 600;">
                <i class="fas fa-check-circle"></i> CARRO DISPONIBLE
            </span>
        </div>
    `;
    if (btnNext) {
        btnNext.disabled = false;
        btnNext.style.opacity = '1';
        btnNext.style.cursor = 'pointer';
    }
}

async function verificarDisponibilidad() {
    const carro = document.getElementById('carroSelect')?.value || '';
    const sede = document.getElementById('sede')?.value || '';
    const msgDiv = document.getElementById('disponibilidadMsg');
    const btnNext = document.querySelector('.btn-next');
    
    console.log("=== VERIFICANDO EN FRONTEND ===");
    console.log("Carro seleccionado:", carro);
    console.log("Sede:", sede);
    
    if (!carro || Boolean(document.getElementById('otrosEquipos')?.checked)) {
        if (msgDiv) msgDiv.innerHTML = '';
        if(btnNext) {
            btnNext.disabled = false;
            btnNext.style.opacity = '1';
            btnNext.style.cursor = 'pointer';
        }
        return;
    }

    const local = obtenerDisponibilidadLocal(carro, sede);
    if (local) {
        pintarDisponibilidad({ ocupado: true, ...local });
        return;
    }

    if (normalizarClave(sede) === normalizarClave(disponibilidadCarrosCache.sede)) {
        pintarDisponibilidad({ ocupado: false });
        return;
    }
    
    try {
        const fechaHoy = obtenerFechaLocalISO();
        
        // ??? AQUÍ ESTÁ EL CAMBIO IMPORTANTE
        const url = `${URL_GOOGLE_SCRIPT}?action=verificarDisponibilidad&carro=${encodeURIComponent(carro)}&fecha=${fechaHoy}&sede=${encodeURIComponent(sede)}`;
        
        console.log("URL de consulta:", url);
        
        const data = await jsonpRequest(url);
        pintarDisponibilidad(data);
        return;
        
        console.log("Respuesta del servidor:", data);
        
        if (data.ocupado) {
            console.log("🔴 Carro OCUPADO");
            msgDiv.innerHTML = `
                <div style="background: #fee2e2; border: 1px solid #ef4444; border-radius: 6px; padding: 10px; margin-top: 5px;">
                    <span style="color: #dc2626; font-weight: 600;">
                        <i class="fas fa-ban"></i> CARRO NO DISPONIBLE
                    </span><br>
                    <span style="color: #7f1d1d; font-size: 0.9rem;">
                        Este carro está ocupado hasta las <strong>${data.hora_devolucion || '15:00'}</strong><br>
                        Por: ${data.usuario || 'Usuario no especificado'}
                    </span>
                </div>
            `;
            if(btnNext) {
                btnNext.disabled = true;
                btnNext.style.opacity = '0.5';
                btnNext.style.cursor = 'not-allowed';
            }
        } else {
            console.log("🟢 Carro DISPONIBLE");
            msgDiv.innerHTML = `
                <div style="background: #dcfce7; border: 1px solid #22c55e; border-radius: 6px; padding: 8px; margin-top: 5px;">
                    <span style="color: #16a34a; font-weight: 600;">
                        <i class="fas fa-check-circle"></i> CARRO DISPONIBLE
                    </span>
                </div>
            `;
            if(btnNext) {
                btnNext.disabled = false;
                btnNext.style.opacity = '1';
                btnNext.style.cursor = 'pointer';
            }
        }
    } catch (e) {
        console.error("Error verificando disponibilidad:", e);
        msgDiv.innerHTML = `
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 8px; margin-top: 5px;">
                <span style="color: #d97706;">
                    <i class="fas fa-exclamation-triangle"></i> Error al verificar disponibilidad
                </span>
            </div>
        `;
    }
}

// Función para mostrar equipos del carro seleccionado
function cargarEquiposCarro() {
    const carroSeleccionado = document.getElementById('carroSelect').value;
    const container = document.getElementById('equiposContainer');
    const tbody = document.getElementById('equiposTableBody');
    const totalLabel = document.getElementById('totalEquipos');
    
    if (!carroSeleccionado) {
        container.style.display = 'none';
        return;
    }
    
    // Filtrar equipos del carro seleccionado
    const equiposCarro = equiposZipaquira.filter(e => e.carro === carroSeleccionado);
    
    // Llenar tabla
    tbody.innerHTML = equiposCarro.map((equipo, index) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 10px;">${index + 1}</td>
            <td style="padding: 8px 10px; font-weight: 600;">${equipo.placa}</td>
            <td style="padding: 8px 10px; font-family: monospace; font-size: 0.85rem;">${equipo.serial}</td>
        </tr>
    `).join('');
    
    totalLabel.textContent = equiposCarro.length;
    container.style.display = 'block';
    
    // Guardar en variable global para usar al enviar
    window.equiposSeleccionados = equiposCarro;
}
// Datos de ejemplo para demostración
let records = [
    {
        id: 1,
        fecha: "2024-01-15",
        nombre: "Juan Pérez",
        cedula: "80720145",        // ? NUEVO
        correo: "juan@ejemplo.com", // ? NUEVO
        equipo: "Carro 1",
        cantidad: "2",
        cargador: "Sí",
        novedad: "No",
        descripcion: "",
        foto_dano: "",
        solicita_cambio: "No",
        serial_cambio: "",
        foto_cambio: "",
        equipos_adicionales: "Sí",
        cant_adicional: "1",
        serial_adicional: "SN123456",
        observacion: "Equipo adicional para proyecto especial",
        autoriza: "Sí",
        firma: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    }
];

// Inicialización

function setDefaultDate() {
    const fechaInput = document.getElementById('fecha');
    const hoy = new Date();

    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');
    const hours = String(hoy.getHours()).padStart(2, '0');
    const minutes = String(hoy.getMinutes()).padStart(2, '0');

    // Para input datetime-local
    fechaInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
    fechaInput.disabled = true;
}

function initializeEventListeners() {
    console.log("Inicializando event listeners...");
    // Filtrar cédula para que solo acepte números
    const cedulaInput = document.getElementById('cedula');
    if (cedulaInput) {
        cedulaInput.addEventListener('input', function(e) {
            this.value = this.value.replace(/\D/g, ''); // Elimina todo lo que no sea dígito
        });
        
        // También prevenir pegado de texto no numérico (opcional, pero el input ya lo limpia)
        cedulaInput.addEventListener('keydown', function(e) {
            // Permitir teclas de control: backspace, delete, tab, etc.
            const teclasPermitidas = [8, 9, 13, 16, 17, 18, 20, 27, 35, 36, 37, 38, 39, 40, 46];
            if (teclasPermitidas.includes(e.keyCode)) return;
            
            // Evitar que se ingresen caracteres no numéricos
            if (!/^[0-9]$/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
                e.preventDefault();
            }
        });
    }
    // Toggle switches
    const novedad = document.getElementById('novedad');
    if (novedad) {
        novedad.addEventListener('change', (e) => {
            toggleSection('novedadBox', e.target.checked);
        });
    }
    


    // Form submit
    const form = document.getElementById('form');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
    
    // Inicializar canvas de firma
    setTimeout(() => {
        initializeSignatureCanvas();
    }, 100); // Pequeño retraso para asegurar que el DOM esté listo
}

// ===== FUNCIONES DEL CANVAS DE FIRMA =====
function initializeSignatureCanvas() {
    console.log("Inicializando canvas de firma...");
    signatureCanvas = document.getElementById('signatureCanvas');
    
    if (!signatureCanvas) {
        console.error("No se encontró el canvas de firma");
        return;
    }
    
    console.log("Canvas encontrado, configurando...");
    ctx = signatureCanvas.getContext('2d');
    
    // Configurar estilo del trazo
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Configurar tamaño
    setupCanvasSize();
    
    // Eventos del mouse
    signatureCanvas.addEventListener('mousedown', startDrawing);
    signatureCanvas.addEventListener('mousemove', draw);
    signatureCanvas.addEventListener('mouseup', stopDrawing);
    signatureCanvas.addEventListener('mouseout', stopDrawing);
    
    // Eventos táctiles para móviles
    signatureCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    signatureCanvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    signatureCanvas.addEventListener('touchend', stopDrawing);
    signatureCanvas.addEventListener('touchcancel', stopDrawing);
    
    // Evento de resize de ventana
    window.addEventListener('resize', () => {
        setTimeout(setupCanvasSize, 100);
    });
    
    console.log("Canvas configurado correctamente");
}

function setupCanvasSize() {
    if (!signatureCanvas || !ctx) return;
    
    const container = signatureCanvas.parentElement;
    const rect = signatureCanvas.getBoundingClientRect();
    
    // Si el canvas no tiene dimensiones, usar las del contenedor
    if (rect.width === 0) {
        signatureCanvas.width = container.clientWidth || 600;
        signatureCanvas.height = 200;
    } else {
        signatureCanvas.width = rect.width;
        signatureCanvas.height = rect.height;
    }
    
    // Restaurar configuración después del resize
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, signatureCanvas.width, signatureCanvas.height);
    
    console.log("Canvas redimensionado:", signatureCanvas.width, "x", signatureCanvas.height);
}

function startDrawing(e) {
    e.preventDefault();
    isDrawing = true;
    
    const rect = signatureCanvas.getBoundingClientRect();
    const scaleX = signatureCanvas.width / rect.width;
    const scaleY = signatureCanvas.height / rect.height;
    
    let clientX, clientY;
    
    if (e.touches) {
        // Evento táctil
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        // Evento de mouse
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    lastX = (clientX - rect.left) * scaleX;
    lastY = (clientY - rect.top) * scaleY;
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
}

function draw(e) {
    e.preventDefault();
    if (!isDrawing) return;
    
    const rect = signatureCanvas.getBoundingClientRect();
    const scaleX = signatureCanvas.width / rect.width;
    const scaleY = signatureCanvas.height / rect.height;
    
    let clientX, clientY;
    
    if (e.touches) {
        // Evento táctil
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        // Evento de mouse
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    const currentX = (clientX - rect.left) * scaleX;
    const currentY = (clientY - rect.top) * scaleY;
    
    ctx.lineTo(currentX, currentY);
    ctx.stroke();
    
    lastX = currentX;
    lastY = currentY;
}

function stopDrawing() {
    isDrawing = false;
    ctx.beginPath(); // Esto evita que se conecten líneas sueltas
}

function handleTouchStart(e) {
    e.preventDefault();
    startDrawing(e);
}

function handleTouchMove(e) {
    e.preventDefault();
    draw(e);
}

function clearSignature() {
    console.log("Limpiando firma...");
    if (!ctx || !signatureCanvas) return;
    
    ctx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, signatureCanvas.width, signatureCanvas.height);
    
    // Animación de feedback
    signatureCanvas.style.transform = 'scale(0.98)';
    setTimeout(() => {
        signatureCanvas.style.transform = 'scale(1)';
    }, 150);
}

function getSignatureBase64() {
    if (!signatureCanvas || !ctx) {
        console.error("Canvas no disponible");
        return null;
    }
    
    // Verificar si hay contenido (que no esté todo blanco)
    const imageData = ctx.getImageData(0, 0, signatureCanvas.width, signatureCanvas.height);
    const data = imageData.data;
    let hasContent = false;
    
    // Revisar si hay algún píxel que no sea blanco
    for (let i = 0; i < data.length; i += 4) {
        if (data[i] < 250 || data[i+1] < 250 || data[i+2] < 250) {
            hasContent = true;
            break;
        }
    }
    
    if (!hasContent) {
        console.log("Canvas vacío");
        return null;
    }
    
    console.log("Firma capturada correctamente");
    return signatureCanvas.toDataURL('image/png');
}

function asegurarSelectorMetodoFirma() {
    asegurarEstilosMetodoFirma();

    if (document.getElementById('signatureCanvas') && !document.getElementById('signatureMethodPanelRecepcion')) {
        const canvasContainer = document.querySelector('.signature-canvas-container');
        if (canvasContainer) {
            canvasContainer.insertAdjacentHTML('beforebegin', crearPanelMetodoFirma('recepcion'));
        }
    }

    if (document.getElementById('signatureCanvasDevolucion') && !document.getElementById('signatureMethodPanelDevolucion')) {
        const canvasWrapper = document.getElementById('canvasWrapper');
        if (canvasWrapper) {
            const group = canvasWrapper.closest('.form-group') || canvasWrapper.parentElement;
            group.insertAdjacentHTML('beforebegin', crearPanelMetodoFirma('devolucion'));
        }
    }

    if (!document.getElementById('signatureMethodModal')) {
        document.body.insertAdjacentHTML('beforeend', crearModalMetodoFirma());
    }

    actualizarVistaMetodoFirma('recepcion');
    actualizarVistaMetodoFirma('devolucion');
}

function asegurarEstilosMetodoFirma() {
    if (document.getElementById('signatureMethodStyles')) return;

    const style = document.createElement('style');
    style.id = 'signatureMethodStyles';
    style.textContent = `
        .signature-method-panel {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            padding: 1rem;
            margin-bottom: 1rem;
            border: 1px solid rgba(15, 23, 42, 0.1);
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.85);
            box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
        }
        .signature-method-title {
            margin: 0 0 0.25rem;
            font-weight: 800;
            color: #0f172a;
        }
        .signature-method-status {
            margin: 0;
            color: #64748b;
            font-size: 0.9rem;
        }
        .btn-signature-method,
        .signature-method-option {
            border: none;
            cursor: pointer;
            font-weight: 700;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .btn-signature-method {
            border-radius: 12px;
            padding: 0.75rem 1rem;
            color: #fff;
            background: linear-gradient(135deg, #dc2626, #7c3aed);
            box-shadow: 0 6px 16px rgba(124, 58, 237, 0.18);
        }
        .btn-signature-method:hover,
        .signature-method-option:hover {
            transform: translateY(-1px);
        }
        .digital-authorization-box {
            padding: 1rem;
            margin-bottom: 1rem;
            border: 1px solid rgba(34, 197, 94, 0.25);
            border-radius: 14px;
            background: rgba(240, 253, 244, 0.9);
            color: #14532d;
        }
        .digital-authorization-box p {
            margin: 0 0 0.75rem;
            line-height: 1.45;
        }
        .digital-authorization-check {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            font-weight: 800;
            cursor: pointer;
        }
        .signature-method-modal {
            position: fixed;
            inset: 0;
            z-index: 10000;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            background: rgba(15, 23, 42, 0.55);
            backdrop-filter: blur(8px);
        }
        .signature-method-modal.active {
            display: flex;
        }
        .signature-method-dialog {
            position: relative;
            width: min(460px, 100%);
            padding: 1.5rem;
            border-radius: 18px;
            background: #fff;
            box-shadow: 0 24px 60px rgba(15, 23, 42, 0.28);
        }
        .signature-method-dialog h3 {
            margin: 0 2rem 1rem 0;
            color: #0f172a;
            font-size: 1.25rem;
        }
        .signature-method-close {
            position: absolute;
            top: 0.85rem;
            right: 0.85rem;
            width: 34px;
            height: 34px;
            border: none;
            border-radius: 999px;
            background: #f1f5f9;
            color: #334155;
            cursor: pointer;
        }
        .signature-method-options {
            display: grid;
            gap: 0.75rem;
        }
        .signature-method-option {
            width: 100%;
            min-height: 52px;
            border-radius: 14px;
            background: #f8fafc;
            color: #0f172a;
            border: 1px solid #e2e8f0;
        }
        .signature-method-option:first-child i {
            color: #2563eb;
        }
        .signature-method-option:last-child i {
            color: #16a34a;
        }
        .hidden {
            display: none !important;
        }
        @media (max-width: 640px) {
            .signature-method-panel {
                align-items: stretch;
                flex-direction: column;
            }
            .btn-signature-method {
                width: 100%;
            }
        }
    `;
    document.head.appendChild(style);
}

function crearPanelMetodoFirma(contexto) {
    const sufijo = contexto === 'devolucion' ? 'Devolucion' : 'Recepcion';
    return `
        <div class="signature-method-panel" id="signatureMethodPanel${sufijo}" data-signature-context="${contexto}">
            <div>
                <p class="signature-method-title">¿Con qué deseas firmar?</p>
                <p class="signature-method-status" id="signatureMethodStatus${sufijo}">Selecciona un método de firma</p>
            </div>
            <button type="button" class="btn-signature-method" onclick="abrirModalMetodoFirma('${contexto}')">
                <i class="fas fa-signature"></i> Elegir método
            </button>
        </div>
        <div class="digital-authorization-box hidden" id="digitalAuthorizationBox${sufijo}">
            <p>Declaro que autorizo la entrega/devolución de los equipos y acepto la responsabilidad correspondiente.</p>
            <label class="digital-authorization-check">
                <input type="checkbox" id="digitalAuthorizationCheck${sufijo}">
                <span>Sí autorizo</span>
            </label>
        </div>
    `;
}

function crearModalMetodoFirma() {
    return `
        <div class="signature-method-modal" id="signatureMethodModal" aria-hidden="true">
            <div class="signature-method-dialog" role="dialog" aria-modal="true" aria-labelledby="signatureMethodTitle">
                <button type="button" class="signature-method-close" onclick="cerrarModalMetodoFirma()" aria-label="Cerrar">
                    <i class="fas fa-times"></i>
                </button>
                <h3 id="signatureMethodTitle">¿Con qué deseas firmar?</h3>
                <div class="signature-method-options">
                    <button type="button" class="signature-method-option" onclick="seleccionarMetodoFirma('MANUAL')">
                        <i class="fas fa-pen"></i>
                        <span>Firma manual</span>
                    </button>
                    <button type="button" class="signature-method-option" onclick="seleccionarMetodoFirma('SI_AUTORIZO')">
                        <i class="fas fa-check-circle"></i>
                        <span>Sí autorizo</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function abrirModalMetodoFirma(contexto = 'recepcion') {
    contextoModalFirma = contexto;
    const modal = document.getElementById('signatureMethodModal');
    if (!modal) return;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
}

function cerrarModalMetodoFirma() {
    const modal = document.getElementById('signatureMethodModal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
}

function seleccionarMetodoFirma(metodo) {
    if (contextoModalFirma === 'devolucion') {
        metodoFirmaDevolucion = metodo;
    } else {
        metodoFirmaRecepcion = metodo;
    }
    actualizarVistaMetodoFirma(contextoModalFirma);
    cerrarModalMetodoFirma();
}

function actualizarVistaMetodoFirma(contexto) {
    const esDevolucion = contexto === 'devolucion';
    const metodo = esDevolucion ? metodoFirmaDevolucion : metodoFirmaRecepcion;
    const sufijo = esDevolucion ? 'Devolucion' : 'Recepcion';
    const status = document.getElementById(`signatureMethodStatus${sufijo}`);
    const authBox = document.getElementById(`digitalAuthorizationBox${sufijo}`);
    const check = document.getElementById(`digitalAuthorizationCheck${sufijo}`);
    const canvas = document.getElementById(esDevolucion ? 'signatureCanvasDevolucion' : 'signatureCanvas');
    const canvasBox = esDevolucion
        ? document.getElementById('canvasWrapper')?.closest('.form-group')
        : document.querySelector('.signature-canvas-container');
    const clearButton = esDevolucion
        ? document.querySelector('button[onclick="clearSignatureDevolucion()"]')
        : null;

    if (status) {
        status.textContent = metodo === 'MANUAL'
            ? 'Método seleccionado: firma manual'
            : metodo === 'SI_AUTORIZO'
                ? 'Método seleccionado: Sí autorizo'
                : 'Selecciona un método de firma';
    }

    if (canvasBox) {
        canvasBox.classList.toggle('hidden', metodo === 'SI_AUTORIZO');
    }

    if (canvas) {
        canvas.style.pointerEvents = metodo === 'SI_AUTORIZO' ? 'none' : '';
    }

    if (clearButton) {
        clearButton.classList.toggle('hidden', metodo === 'SI_AUTORIZO');
    }

    if (authBox) {
        authBox.classList.toggle('hidden', metodo !== 'SI_AUTORIZO');
    }

    if (check && metodo !== 'SI_AUTORIZO') {
        check.checked = false;
    }
}

function validarMetodoFirma(contexto = 'recepcion') {
    const esDevolucion = contexto === 'devolucion';
    const metodo = esDevolucion ? metodoFirmaDevolucion : metodoFirmaRecepcion;
    const sufijo = esDevolucion ? 'Devolucion' : 'Recepcion';
    const check = document.getElementById(`digitalAuthorizationCheck${sufijo}`);

    if (!metodo) {
        showToast('Selecciona un método de firma', 'error');
        abrirModalMetodoFirma(contexto);
        return false;
    }

    if (metodo === 'SI_AUTORIZO' && check && !check.checked) {
        showToast('Debes confirmar la autorización', 'error');
        return false;
    }

    return true;
}

function obtenerFirmaRecepcion() {
    if (!validarMetodoFirma('recepcion')) return null;

    if (metodoFirmaRecepcion === 'SI_AUTORIZO') {
        return {
            firma: 'SI AUTORIZO',
            tipo_firma: 'SI_AUTORIZO',
            autoriza: 'Sí'
        };
    }

    const firmaBase64 = getSignatureBase64();
    if (!firmaBase64) {
        showToast('Debes firmar antes de continuar', 'error');
        return null;
    }

    return {
        firma: firmaBase64,
        tipo_firma: 'MANUAL'
    };
}

// ===== FUNCIONES DE UTILIDAD =====
function toggleSection(id, show) {
    const element = document.getElementById(id);
    if (element) {
        if (show) {
            element.classList.remove('hidden');
            element.style.animation = 'expand 0.3s ease';
        } else {
            element.classList.add('hidden');
        }
    }
}

function updateFileName(input, displayId, isSignature = false) {
    const fileName = input.files[0] ? input.files[0].name : 'Ningún archivo seleccionado';
    document.getElementById(displayId).textContent = fileName;
    
    // Preview
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewId = displayId.replace('fileName', 'preview');
            const preview = document.getElementById(previewId);
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            preview.classList.add('show');
            
            if (isSignature) {
                preview.classList.add('signature-preview');
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// ===== NAVEGACIÓN DEL FORMULARIO =====
// REEMPLAZAR la función nextSection() existente con esta:

function nextSection() {
    // Si estamos en el paso 1, verificar correo
    if (currentStep === 1) {
        if (!verificarAntesDeAvanzar()) {
            return;
        }
    }
    
    if (validateCurrentSection()) {
        if (currentStep < totalSteps) {
            document.querySelector(`.form-section[data-section="${currentStep}"]`).classList.remove('active');
            currentStep++;
            document.querySelector(`.form-section[data-section="${currentStep}"]`).classList.add('active');
            updateProgressBar();
            updateStepIndicators();
            
            if (currentStep === totalSteps) { // totalSteps = 3
                setTimeout(() => {
                    setupCanvasSize();
                    if (!metodoFirmaRecepcion) {
                        abrirModalMetodoFirma('recepcion');
                    }
                }, 100);
            }
        }
    }
}

function prevSection() {
    if (currentStep > 1) {
        document.querySelector(`.form-section[data-section="${currentStep}"]`).classList.remove('active');
        currentStep--;
        document.querySelector(`.form-section[data-section="${currentStep}"]`).classList.add('active');
        updateProgressBar();
        updateStepIndicators();
    }
}

function updateProgressBar() {
    const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
    const bar = document.querySelector('.progress-bar');
    if (bar) {
        bar.innerHTML = `<div style="width: ${progress}%; height: 100%; background: linear-gradient(90deg, var(--coral) 0%, var(--turquoise) 100%); border-radius: 2px; transition: width 0.5s ease;"></div>`;
    }
}

function updateStepIndicators() {
    document.querySelectorAll('.step').forEach((step, index) => {
        const stepNum = index + 1;
        step.classList.remove('active', 'completed');
        
        if (stepNum === currentStep) {
            step.classList.add('active');
        } else if (stepNum < currentStep) {
            step.classList.add('completed');
        }
    });
}

function validateCurrentSection() {
    const currentSection = document.querySelector(`.form-section[data-section="${currentStep}"]`);
    const required = currentSection.querySelectorAll('[required]');
    let valid = true;
    
    required.forEach(field => {
        if (!field.value || (field.type === 'checkbox' && !field.checked)) {
            field.style.borderColor = '#FF6B6B';
            valid = false;
            setTimeout(() => {
                field.style.borderColor = '';
            }, 3000);
        }
    });
    
    if (!valid) {
        showToast('Por favor complete los campos requeridos', 'error');
    }
    
    return valid;
}

// ===== ENVÍO DEL FORMULARIO =====
async function handleSubmit(e) {
    e.preventDefault();

    if (!validarMetodoFirma('recepcion')) {
        return;
    }
    
    // Validar checkbox de autorización de términos
    const autorizaCheckbox = document.getElementById('autoriza');
    if (autorizaCheckbox && metodoFirmaRecepcion !== 'SI_AUTORIZO' && !autorizaCheckbox.checked) {
        autorizaCheckbox.style.borderColor = '#FF6B6B';
        showToast('Debe aceptar los términos y condiciones para continuar', 'error');
        setTimeout(() => {
            autorizaCheckbox.style.borderColor = '';
        }, 3000);
        return;
    }
    
    const submitBtn = document.querySelector('.btn-submit');
    if (submitBtn.disabled) return; // Ya se envió, no hacer nada
    submitBtn.disabled = true; // Bloquear inmediatamente
    const loader = submitBtn.querySelector('.btn-loader');

    submitBtn.disabled = true;
    loader.classList.remove('hidden');
    showLoading(true);

    try {
        const formData = await collectFormData();
        if (!formData) return;   // si falla alguna validación

        const result = await postToAppsScript(formData);

        if (result.status === 'ok') {
            dispararProcesamientoDocumentosPendientes();
            showToast('¡Registro guardado exitosamente!<br>Recargando...', 'success');

            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } else {
            throw new Error(result.error || 'Error desconocido');
        }

    } catch (error) {
        console.error('Error:', error);
        showToast('Error al guardar: ' + error.message, 'error');
        
        // Opcional: guardar localmente en modo demo
    } finally {
        submitBtn.disabled = false;
        loader.classList.add('hidden');
        showLoading(false);
    }
}

async function loadRecords() {
    const grid = document.getElementById('recordsGrid');
    const emptyState = document.getElementById('emptyState');

    try {
        const data = await jsonpRequest(URL_GOOGLE_SCRIPT);
        records = data.map((r, index) => ({ ...r, id: index + 1 }));
    } catch (err) {
        console.log('Usando datos de demo');
        showToast('No se pudo cargar registros, mostrando demo', 'warning');
    }

    if (records.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    grid.innerHTML = records.map(record => createRecordCard(record)).join('');
}
function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
async function collectFormData() {
    const esOtrosEquipos = Boolean(document.getElementById('otrosEquipos')?.checked);
    const horaDevolucion = document.getElementById('horaDevolucion').value;
    
    // Validar hora
    if (!horaDevolucion || horaDevolucion < "07:00" || horaDevolucion > "15:00") {
        showToast('La hora debe estar entre 7:00 AM y 3:00 PM', 'error');
        return false;
    }
    
    let data = {
        fecha: document.getElementById('fecha').value.split('T')[0],
        nombre: document.getElementById('nombre').value.trim(),
        cedula: document.getElementById('cedula').value.trim(),
        correo: document.getElementById('correo').value.trim(),
        sede: document.getElementById('sede').value,
        hora_devolucion: horaDevolucion,
        cargador: document.getElementById('cargador').checked ? 'Sí' : 'No',
        novedad: document.getElementById('novedad').checked ? 'Sí' : 'No',
        descripcion: document.getElementById('descripcion').value || '',
        autoriza: document.getElementById('autoriza').checked ? 'Sí' : 'No',
        es_otros_equipos: esOtrosEquipos ? 'Sí' : 'No'
        // observacion, solicita_cambio, etc. ya no se incluyen
    };

    if (!validarCorreoInstitucional(data.correo)) {
        showToast('Use un correo institucional @innovaschools.edu.co', 'error');
        document.getElementById('correo')?.focus();
        return false;
    }
    
    // Si es otros equipos, validar y guardar rangos
    if (esOtrosEquipos) {
        const rangoInicio = parseInt(document.getElementById('rangoInicio').value);
        const rangoFin = parseInt(document.getElementById('rangoFin').value);
        
        const totalOtros = rangoFin - rangoInicio + 1;
        if (!rangoInicio || !rangoFin || rangoFin < rangoInicio || totalOtros > 500) {
            showToast('Verifique el rango numérico (1-500)', 'error');
            return false;
        }
        data.sede = document.getElementById('sede').value;
        data.equipo = `Otros equipos (${rangoInicio} - ${rangoFin})`;
        data.cantidad = totalOtros;
        data.detalle_equipos = `Equipos del número ${rangoInicio} hasta ${rangoFin} (Total: ${data.cantidad})`;
        data.serial_y_placa = `Rango: ${rangoInicio} - ${rangoFin}`;
        data.rango_inicio = rangoInicio;
        data.rango_fin = rangoFin;
    } else {
        // Lógica normal de carros
        const carroSeleccionado = document.getElementById('carroSelect').value;
        if (!carroSeleccionado) {
            showToast('Debe seleccionar un carro', 'error');
            return false;
        }
        
        const equiposCarro = equiposZipaquira.filter(e => e.carro === carroSeleccionado);
        data.equipo = carroSeleccionado;
        data.cantidad = equiposCarro.length;
        data.detalle_equipos = equiposCarro.map((e, i) => 
            `${i + 1}. Placa: ${e.placa} - Serial: ${e.serial}`
        ).join('\n');
        data.serial_y_placa = equiposCarro.map(e => `Placa: ${e.placa || '-'} - Serial: ${e.serial || '-'}`).join('\n');
        data.rango_inicio = '';
        data.rango_fin = '';
    }

    const quiereAdicionales = Boolean(document.getElementById('equiposAdicionalesToggle')?.checked || equiposAdicionalesSeleccionados.length);
    if (quiereAdicionales) {
        if (!equiposAdicionalesSeleccionados.length) {
            showToast('Selecciona al menos un equipo adicional de BODEGA TI', 'error');
            abrirModalEquiposAdicionales();
            return false;
        }

        const disponibles = equiposAdicionalesSeleccionados.every(eq => eq.disponible);
        const keys = equiposAdicionalesSeleccionados.map(getEquipoAdicionalKey);
        const sinDuplicados = new Set(keys).size === keys.length;
        if (!disponibles || !sinDuplicados) {
            showToast('Revisa la selección: hay equipos ocupados o duplicados', 'error');
            abrirModalEquiposAdicionales();
            return false;
        }

        const adicionalesJson = equiposAdicionalesSeleccionados.map(eq =>
            normalizarEquipoAdicional(eq, data.nombre)
        );
        const detalleAdicional = textoEquiposAdicionales(adicionalesJson);

        data.equipos_adicionales = 'Sí';
        data.serial_adicional = detalleAdicional;
        data.equipo_adicional = stringifyEquiposAdicionales(adicionalesJson);
        data.additionalEquipment = stringifyEquiposAdicionales(adicionalesJson);
        data.equiposAdicionales = stringifyEquiposAdicionales(adicionalesJson);
        data.cantidad_adicional = equiposAdicionalesSeleccionados.length;
        console.log("Equipo adicional capturado:", adicionalesJson);
        data.cantidad = Number(data.cantidad || 0) + equiposAdicionalesSeleccionados.length;
        data.detalle_equipos = [data.detalle_equipos, '--- Equipos adicionales BODEGA TI ---', detalleAdicional]
            .filter(Boolean)
            .join('\n');
    } else {
        data.equipos_adicionales = 'No';
        data.serial_adicional = '';
        data.equipo_adicional = '';
        data.additionalEquipment = '';
        data.equiposAdicionales = '';
        data.cantidad_adicional = 0;
    }
    
    // Procesar fotos (solo foto_dano)
    const fotoDano = document.getElementById('foto_dano').files[0];
    if (fotoDano) data.foto_dano = await toBase64(fotoDano);
    
    const datosFirma = obtenerFirmaRecepcion();
    if (!datosFirma) {
        return false;
    }
    data.firma = datosFirma.firma;
    data.tipo_firma = datosFirma.tipo_firma;
    if (datosFirma.autoriza) data.autoriza = datosFirma.autoriza;
    
    return data;
}
function resetFormUI() {
    document.querySelectorAll('.form-section').forEach((section, index) => {
        section.classList.toggle('active', index === 0);
    });
    
    document.querySelectorAll('.step').forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index === 0) step.classList.add('active');
    });
    
    document.querySelectorAll('.conditional-content').forEach(el => el.classList.add('hidden'));
    
    document.querySelectorAll('.image-preview').forEach(el => {
        el.classList.remove('show');
        el.innerHTML = '';
    });
    
    // Limpiar canvas de firma
    clearSignature();
    
    updateProgressBar();
}
function resetFormAndReload() {
    // Opción 1: Recargar toda la página (la más simple y efectiva)
    window.location.reload();

    // Opción 2: Solo reiniciar el formulario y volver al paso 1 (sin recargar página)
    // resetFormUI();
    // currentStep = 1;
    // showSection('form-section');
    // updateProgressBar();
    // updateStepIndicators();
}
// ===== GESTIÓN DE REGISTROS =====
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    
    if (sectionId === 'records-section') {
        loadRecords();
    } else if (sectionId === 'form-section' && currentStep === totalSteps) {
        setTimeout(setupCanvasSize, 100);
    }
}

function createRecordCard(record) {
    const date = new Date(record.fecha).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    
    return `
        <div class="record-card" onclick="showDetail(${record.id})">
            <div class="record-header">
                <div>
                    <div class="record-title">${record.nombre}</div>
                    <div class="record-date">
                        <i class="fas fa-calendar"></i> ${date}
                    </div>
                </div>
                <div class="icon-circle blue" style="width: 40px; height: 40px; font-size: 1rem;">
                    <i class="fas fa-user"></i>
                </div>
            </div>
            
            <div class="record-equipo">
                <i class="fas fa-laptop"></i> ${record.cantidad || record.equipo}
            </div>
            
            <div class="record-status">
                <span class="status-badge info">Sede: ${record.sede || 'N/A'}</span>
                <span class="status-badge warning">Hasta: ${record.hora_devolucion || 'N/A'}</span>
            </div>
            
            <div class="record-actions" onclick="event.stopPropagation()">
                <button class="btn-icon" onclick="showDetail(${record.id})" title="Ver detalle">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        </div>
    `;
}

function filterRecords() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const cards = document.querySelectorAll('.record-card');
    
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
}

// ===== MODAL DE DETALLE =====
function showDetail(id) {
    currentRecord = records.find(r => r.id === id);
    if (!currentRecord) return;
    
    const modal = document.getElementById('detailModal');
    const body = document.getElementById('modalBody');
    
    body.innerHTML = `
        <div class="detail-grid">
            <div class="detail-item">
                <div class="detail-label">Nombre</div>
                <div class="detail-value">${currentRecord.nombre}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Fecha</div>
                <div class="detail-value">${new Date(currentRecord.fecha).toLocaleDateString('es-ES')}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Equipo</div>
                <div class="detail-value">${currentRecord.cantidad || currentRecord.equipo}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Sede</div>
                <div class="detail-value">${currentRecord.sede || currentRecord.equipo}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Hasta</div>
                <div class="detail-value">${currentRecord.hora_devolucion || 'N/A'}</div>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('detailModal').classList.remove('active');
}

// ===== GENERACIÓN DE PDF =====
function downloadCurrentPDF() {
    if (currentRecord) {
        generatePDF(currentRecord);
    }
}

function downloadPDF(id) {
    const record = records.find(r => r.id === id);
    if (record) {
        generatePDF(record);
    }
}

function generatePDF(record) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Colores
    const colorPrimario = [255, 107, 107]; // Coral
    const colorSecundario = [78, 205, 196]; // Turquesa
    const colorTexto = [26, 26, 26];
    
    // Header
    doc.setFillColor(...colorPrimario);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('RECEPCIÓN DE EQUIPOS', 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`SEDE ${record.sede || 'N/A'}`, 105, 32, { align: 'center' });
    
    let y = 55;
    
    // INFO GENERAL
    doc.setFillColor(240, 240, 240);
    doc.rect(15, y - 6, 180, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 107, 107);
    doc.text('INFORMACIÓN GENERAL', 20, y);
    y += 12;
    
    doc.setTextColor(26, 26, 26);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    
    doc.text(`Nombre: ${record.nombre || 'No especificado'}`, 20, y);
    doc.text(`Fecha: ${new Date(record.fecha).toLocaleDateString('es-ES')}`, 110, y);
    y += 8;
    
    doc.text(`Cédula: ${record.cedula || 'N/A'}`, 20, y);
    doc.text(`Correo: ${record.correo || 'N/A'}`, 110, y);
    y += 8;
    
    // NUEVO: Mostrar hora de devolución destacada
    doc.setTextColor(220, 38, 38); // Rojo para destacar
    doc.setFont('helvetica', 'bold');
    doc.text(`Hora máxima de devolución: ${record.hora_devolucion || '15:00'}`, 20, y);
    doc.setTextColor(26, 26, 26);
    doc.setFont('helvetica', 'normal');
    doc.text(`Cargador: ${record.cargador || 'No'}`, 110, y);
    y += 12;
    
    // EQUIPOS
    doc.setFillColor(240, 240, 240);
    doc.rect(15, y - 6, 180, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(78, 205, 196);
    doc.text('DETALLE DE EQUIPOS', 20, y);
    y += 12;
    
    // Si es otros equipos, mostrar diferente
    if (record.es_otros_equipos === 'Sí' || record.equipo.includes('Otros equipos')) {
        doc.setFillColor(254, 243, 199); // Amarillo claro para destacar
        doc.rect(15, y - 4, 180, 20, 'F');
        doc.setTextColor(180, 83, 9);
        doc.text(`TIPO: OTROS EQUIPOS (RANGO NUMÉRICO)`, 20, y);
        y += 8;
        doc.text(`Rango: Del ${record.rango_inicio || 'N/A'} al ${record.rango_fin || 'N/A'}`, 20, y);
        y += 8;
        doc.text(`Total de equipos: ${record.cantidad || '0'}`, 20, y);
        y += 12;
    } else {
        doc.text(`Carro: ${record.equipo || 'N/A'}`, 20, y);
        doc.text(`Cantidad: ${record.cantidad || '0'} equipos`, 110, y);
        y += 10;
        
        // Tabla de equipos si existe detalle
        if (record.detalle_equipos) {
            doc.setFontSize(9);
            const lineas = record.detalle_equipos.split('\n');
            lineas.forEach((linea, idx) => {
                if (y > 270) {
                    doc.addPage();
                    y = 20;
                }
                if (idx % 2 === 0) {
                    doc.setFillColor(250, 250, 250);
                    doc.rect(18, y - 4, 174, 6, 'F');
                }
                doc.text(linea, 20, y);
                y += 6;
            });
            y += 4;
        }
    }
    // IMPORTANTE: Verificar que existan los datos
    const nombre = record.nombre || 'No especificado';
    const cedula = record.cedula || 'No especificado';
    const fecha = record.fecha || new Date().toISOString().split('T')[0];
    
    doc.text(`Nombre: ${nombre}`, 20, y);
    doc.text(`Fecha: ${new Date(fecha).toLocaleDateString('es-ES')}`, 110, y);
    y += 8;
    
    doc.text(`Cédula: ${cedula}`, 20, y);
    doc.text(`Correo: ${record.correo || 'N/A'}`, 110, y);
    y += 8;
    
    doc.text(`Carro/Equipo: ${record.equipo || 'N/A'}`, 20, y);
    doc.text(`Cantidad: ${record.cantidad || '0'} equipos`, 110, y);
    y += 8;
    
    doc.text(`Cargador: ${record.cargador || 'No'}`, 20, y);
    y += 15;
    
    // DETALLE DE EQUIPOS
    if (record.detalle_equipos && record.detalle_equipos.trim() !== '') {
        doc.setFillColor(240, 240, 240);
        doc.rect(15, y - 6, 180, 10, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...colorSecundario);
        doc.text('DETALLE DE EQUIPOS RECIBIDOS', 20, y);
        y += 12;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...colorTexto);
        
        const lineas = record.detalle_equipos.split('\n');
        
        lineas.forEach((linea, index) => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
            
            if (index % 2 === 0) {
                doc.setFillColor(250, 250, 250);
                doc.rect(18, y - 4, 174, 6, 'F');
            }
            
            doc.text(linea, 20, y);
            y += 6;
        });
        y += 10;
    }
    
    // NOVEDADES CON ENLACE A FOTO
    if (record.novedad === 'Sí') {
        if (y > 220) { doc.addPage(); y = 20; }
        
        doc.setFillColor(255, 243, 205);
        doc.rect(15, y - 6, 180, 10, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(204, 102, 0);
        doc.text('NOVEDAD REPORTADA', 20, y);
        y += 12;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...colorTexto);
        
        const splitDesc = doc.splitTextToSize(record.descripcion || 'Sin descripción', 170);
        doc.text(splitDesc, 20, y);
        y += (splitDesc.length * 6) + 5;
        
        // Mostrar enlace a la foto (no la imagen directamente)
        if (record.foto_dano && record.foto_dano.includes('drive.google.com')) {
            doc.setTextColor(0, 0, 255);
            doc.setFontSize(9);
            doc.text('Ver foto del daño:', 20, y);
            y += 5;
            doc.text(record.foto_dano, 20, y);
            y += 10;
        }
    }
    
    // CAMBIO SOLICITADO
    if (record.solicita_cambio === 'Sí') {
        if (y > 240) { doc.addPage(); y = 20; }
        
        doc.setFillColor(219, 234, 254);
        doc.rect(15, y - 6, 180, 10, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(30, 58, 138);
        doc.text('CAMBIO SOLICITADO', 20, y);
        y += 12;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...colorTexto);
        doc.text(`Serial/Placa: ${record.serial_cambio || 'No especificado'}`, 20, y);
        y += 8;
        
        if (record.foto_cambio && record.foto_cambio.includes('drive.google.com')) {
            doc.setTextColor(0, 0, 255);
            doc.setFontSize(9);
            doc.text('Ver foto del equipo a cambiar:', 20, y);
            y += 5;
            doc.text(record.foto_cambio, 20, y);
            y += 10;
        }
    }
    
    // EQUIPOS ADICIONALES
    if (record.equipos_adicionales === 'Sí') {
        if (y > 240) { doc.addPage(); y = 20; }
        
        doc.setFillColor(240, 253, 244);
        doc.rect(15, y - 6, 180, 10, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(6, 95, 70);
        doc.text(`EQUIPOS ADICIONALES (${record.cant_adicional || 0})`, 20, y);
        y += 12;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...colorTexto);
        doc.text(`Seriales: ${record.serial_adicional || 'N/A'}`, 20, y);
        if (record.observacion) {
            y += 7;
            doc.text(`Obs: ${record.observacion}`, 20, y);
        }
        y += 15;
    }
    
    // NUEVA PÁGINA PARA LA CLÁUSULA LEGAL
    doc.addPage();
    y = 20;
    
    // Título de la cláusula
    doc.setFillColor(240, 240, 240);
    doc.rect(15, y - 6, 180, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...colorPrimario);
    doc.text('AUTORIZACIÓN DE DESCUENTOS', 20, y);
    y += 15;
    
    // Texto legal con datos dinámicos
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...colorTexto);
    
    const fechaFormateada = new Date(fecha).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    
    // IMPORTANTE: Usar comillas normales y concatenar para evitar problemas
    const textoLegal = "Yo, " + nombre + " identificado con cédula de ciudadanía No. " + cedula + " de Bogotá. En mi calidad de TRABAJADOR, autorizo expresamente a mi empleador, COLEGIOS COLOMBIANOS S.A.S., para que descuente de mi Salario, primas, cesantías, auxilios legales y extralegales, bonificaciones, indemnizaciones y liquidaciones, el valor de (los) elementos, equipos y/o herramientas de trabajo que me fueron entregados mediante acta suscrita en fecha " + fechaFormateada + " en caso de pérdida, hurto o daños por descuido, negligencia y/o impericia que por mi culpa o dolo se generen a los mismos.\n\n" +
    "De igual manera AUTORIZO a mi empleador, COLEGIOS COLOMBIANOS S.A.S a que los descuentos aquí permitidos se realicen por el valor total de los elementos, equipo y /o herramientas o en caso de ser requerido mediante cuotas fijas a mi salario incluyendo primas, cesantías, auxilios legales y extralegales o bonificaciones. En caso de retiro definitivo, AUTORIZO a mi empleador, COLEGIOS COLOMBIANOS S.A.S., descontar de mi liquidación final, el valor total o faltante por pagar de los elementos, equipo y /o herramientas de trabajo en caso de pérdida, hurto o daños a mi atribuibles.\n\n" +
    "La deducción autorizada se realiza en los términos establecidos en el Artículo 149 del Código Sustantivo del Trabajo.\n\n" +
    "Nota: Un original del presente documento reposará en la carpeta del trabajador, en la Gerencia de GDH.";
    
    // Dividir el texto para que quepa en el PDF
    const lineasTexto = doc.splitTextToSize(textoLegal, 170);
    
    lineasTexto.forEach(linea => {
        if (y > 280) {
            doc.addPage();
            y = 20;
        }
        doc.text(linea, 20, y);
        y += 6;
    });
    
    y += 15;
    
    // FIRMA AL FINAL
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...colorTexto);
    doc.text('FIRMA DEL TRABAJADOR:', 20, y);
    y += 25;
    
    // Si la firma es base64 (del formulario actual), mostrarla
    if (record.firma === 'SI AUTORIZO' || record.tipo_firma === 'SI_AUTORIZO') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Firma: Sí autorizo', 20, y);
        y += 7;
        doc.text(`Autorizado por: ${record.nombre || ''}`, 20, y);
        y += 7;
        doc.text(`C.C.: ${record.cedula || ''}`, 20, y);
        y += 7;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('Confirmación digital registrada por el usuario.', 20, y);
        y += 15;
    } else if (record.firma && record.firma.startsWith('data:image')) {
        try {
            doc.addImage(record.firma, 'PNG', 20, y, 70, 35);
            y += 40;
        } catch(e) {
            doc.line(20, y + 15, 100, y + 15);
            doc.text('(Espacio para firma)', 20, y + 25);
            y += 30;
        }
    } else {
        // Si es URL de Drive o no hay firma, poner línea para firmar
        doc.line(20, y + 15, 100, y + 15);
        doc.setFontSize(9);
        doc.text('Firma y huella', 20, y + 25);
        y += 30;
        
        // Si hay URL de firma, mostrarla como texto
        if (record.firma && record.firma.includes('drive.google.com')) {
            doc.setTextColor(0, 0, 255);
            doc.setFontSize(8);
            doc.text('Firma digital: ' + record.firma, 20, y);
        }
    }
    
    // Footer
    doc.setFillColor(244, 247, 250);
    doc.rect(0, 282, 210, 15, 'F');
    doc.setFontSize(9);
    doc.setTextColor(136, 136, 136);
    doc.text('Documento generado el ' + new Date().toLocaleString('es-ES'), 105, 290, { align: 'center' });
    doc.text('Sistema de Recepción de Equipos - Innova Schools', 105, 295, { align: 'center' });
    
    // Guardar
    const nombreArchivo = `recepcion_${record.nombre.replace(/\s+/g, '_')}_${record.fecha}.pdf`;
    doc.save(nombreArchivo);
    showToast('PDF descargado exitosamente', 'success');
}


// ===== UTILIDADES UI =====
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas fa-${icons[type]}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.toggle('active', show);
}

// Cerrar modal al hacer clic fuera
document.addEventListener('click', (e) => {
    const modal = document.getElementById('detailModal');
    if (e.target === modal) {
        closeModal();
    }

    const signatureModal = document.getElementById('signatureMethodModal');
    if (e.target === signatureModal) {
        cerrarModalMetodoFirma();
    }

    const additionalModal = document.getElementById('equiposAdicionalesModal');
    if (e.target === additionalModal) {
        cerrarModalEquiposAdicionales();
    }
});
async function cargarCarros() {
    const ocupados = await jsonpRequest(URL_GOOGLE_SCRIPT + "?action=ocupados");

    console.log("OCUPADOS:", ocupados);

    const select = document.getElementById("carroSelect");
    if (!select) return;

    Array.from(select.options).forEach(option => {
        if (ocupados.includes(option.value)) {
            option.disabled = true;
            option.text += " (Ocupado)";
        }
    });

}
async function cargarSolicitudesEnCurso() {
  const tbody = document.getElementById("enCursoTableBody");
  if (!tbody) return;

  const sede = obtenerSedeDesdeURL();

  tbody.innerHTML = `<tr><td colspan="7">Cargando...</td></tr>`;

  try {
    const data = await jsonpRequest(`${URL_GOOGLE_SCRIPT}?action=enCurso&sede=${encodeURIComponent(sede)}`);
    console.log("RESPUESTA enCurso:", data);

    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7">No hay solicitudes en curso para esta sede</td></tr>`;
      return;
    }

    // Guardar datos globally para filtrar
    window.solicitudesEnCurso = data;
    
    renderizarSolicitudes(data);

  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="7">Error cargando solicitudes</td></tr>`;
  }
}

function renderizarSolicitudes(data) {
  const tbody = document.getElementById("enCursoTableBody");
  if (!tbody) return;
  
  tbody.innerHTML = "";

  data.forEach(item => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${item.nombre || ""}</td>
      <td>${item.sede || ""}</td>
      <td>${item.equipo || ""}</td>
      <td>${item.cantidad || ""}</td>
      <td>${formatearHora(item.hora_entrega)}</td>
      <td></td>
      <td></td>
    `;

    const btnPdf = document.createElement("button");
    btnPdf.type = "button";
    btnPdf.className = "btn-inline-pdf";
    btnPdf.innerHTML = '<i class="fas fa-file-pdf"></i> Ver PDF Recepción';
    btnPdf.disabled = !(item.pdf_recepcion_url || item.acta);
    btnPdf.title = btnPdf.disabled ? "Esta solicitud no tiene acta original registrada" : "Abrir acta original";
    btnPdf.addEventListener("click", () => abrirPdfRecepcion(item.pdf_recepcion_url || item.acta));

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-inline-return";
    btn.textContent = "Devolver";
    btn.addEventListener("click", () => abrirFormularioDevolucion(item));

    tr.children[5].appendChild(btnPdf);
    tr.children[6].appendChild(btn);
    tbody.appendChild(tr);
  });
}

function abrirPdfRecepcion(url) {
    const destino = obtenerUrlPreviewDrive(url);
    if (!destino) {
        showToast("No hay PDF de recepción relacionado con esta solicitud", "warning");
        return;
    }
    window.open(destino, "_blank", "noopener,noreferrer");
}

function filtrarSolicitudes() {
  if (!window.solicitudesEnCurso) return;
  
  const busqueda = document.getElementById('buscarSolicitud')?.value.toLowerCase() || '';
  const limite = document.getElementById('filtroCantidad')?.value || '0';
  
  let filtrados = window.solicitudesEnCurso;
  
  if (busqueda) {
    filtrados = filtrados.filter(item => 
      (item.nombre || '').toLowerCase().includes(busqueda) ||
      (item.equipo || '').toLowerCase().includes(busqueda) ||
      (item.sede || '').toLowerCase().includes(busqueda) ||
      (item.cantidad || '').toString().includes(busqueda)
    );
  }
  
  if (limite !== '0') {
    filtrados = filtrados.slice(0, parseInt(limite));
  }
  
  renderizarSolicitudes(filtrados);
}
function formatearHora(valor) {
    if (!valor) return "";

    const texto = String(valor).trim();

    if (/^\d{2}:\d{2}/.test(texto)) {
        return texto.slice(0, 5);
    }

    const matchIso = texto.match(/T(\d{2}):(\d{2})/);
    if (matchIso) {
        return `${matchIso[1]}:${matchIso[2]}`;
    }

    return texto;
}
function abrirFormularioDevolucion(item) {
  solicitudDevolucionSeleccionada = item || null;
  document.getElementById("formCerrarBox").style.display = "block";
  document.getElementById("devolucion_id_solicitud").value = item.id_solicitud || "";
  document.getElementById("cantidad_devuelta").value = item.cantidad || "";
  document.getElementById("estado_final").value = "";
  document.getElementById("novedad_devolucion").value = "No";
  document.getElementById("descripcion_devolucion").value = "";
  document.getElementById("boxDescripcionDevolucion").style.display = "none";
  renderizarPanelDevolucionAdicionales(item);
  const correoSoporte = document.getElementById("correo_soporte_devolucion");
  if (correoSoporte) {
    correoSoporte.value = (localStorage.getItem("emailSoporte") || "").trim().toLowerCase();
    validarCorreoSoporteDevolucion(false);
  }
  const actaBtn = document.getElementById("btnActaOriginalSeleccionada");
  if (actaBtn) {
    const actaUrl = item.pdf_recepcion_url || item.acta || "";
    actaBtn.disabled = !actaUrl;
    actaBtn.dataset.url = actaUrl;
    actaBtn.title = actaUrl ? "Abrir acta original" : "No hay acta original registrada";
  }

  metodoFirmaDevolucion = "";
  actualizarVistaMetodoFirma("devolucion");
  clearSignatureDevolucion();
  setTimeout(() => abrirModalMetodoFirma("devolucion"), 100);
}
function toggleDescripcionDevolucion() {
  const value = document.getElementById("novedad_devolucion").value;
  document.getElementById("boxDescripcionDevolucion").style.display =
    esValorSi(value) ? "block" : "none";
}

function renderizarPanelDevolucionAdicionales(item) {
    let panel = document.getElementById('devolucionAdicionalesPanel');
    const formBox = document.getElementById('formCerrarBox');
    const estadoGroup = document.getElementById('estado_final')?.closest('.form-group');
    if (!formBox || !estadoGroup) return;

    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'devolucionAdicionalesPanel';
        panel.className = 'additional-return-panel';
        estadoGroup.insertAdjacentElement('afterend', panel);
    }

    const adicionales = parseEquiposAdicionales(item?.equipo_adicional || item?.serial_adicional || '');
    if (!adicionales.length) {
        panel.style.display = 'none';
        panel.innerHTML = '';
        return;
    }

    panel.style.display = 'block';
    panel.innerHTML = `
        <h3><i class="fas fa-boxes-stacked"></i> Equipos adicionales</h3>
        <p>Estos equipos adicionales se registrarán como devueltos al confirmar la devolución. Las novedades se reportan en el campo de novedad y evidencia.</p>
        <div class="additional-return-list">
            ${adicionales.map(eq => `
                <div class="additional-return-item">
                    <i class="fas fa-check-circle" style="color:#16a34a; margin-top:0.15rem;"></i>
                    <div>
                        <strong>${eq.equipo || 'Equipo adicional'}</strong>
                        <span>Serial: ${eq.serial || '-'} | Placa: ${eq.placa || '-'} | Cantidad: ${eq.cantidad || 1}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    panel.dataset.equipos = stringifyEquiposAdicionales(adicionales);
}

function obtenerEquiposAdicionalesDevolucionPayload() {
    const panel = document.getElementById('devolucionAdicionalesPanel');
    if (!panel || panel.style.display === 'none') return '';
    const adicionales = parseEquiposAdicionales(panel.dataset.equipos || '');
    const ahora = new Date();
    const fecha = ahora.toISOString().slice(0, 10);
    const hora = ahora.toTimeString().slice(0, 5);

    adicionales.forEach(eq => {
        eq.devuelto = true;
        eq.fecha_devolucion = fecha;
        eq.hora_devolucion = hora;
    });

    return stringifyEquiposAdicionales(adicionales);
}

function validarCorreoSoporteDevolucion(mostrarMensaje = true) {
    const input = document.getElementById("correo_soporte_devolucion");
    const error = document.getElementById("correoSoporteDevolucionError");
    if (!input) return true;

    const value = input.value.trim().toLowerCase();
    const valido = !value || validarCorreoInstitucional(value);
    input.value = value;
    input.classList.toggle("input-error", Boolean(value) && !valido);
    input.classList.toggle("input-ok", Boolean(value) && valido);

    if (error) {
        error.style.display = value && !valido ? "flex" : "none";
    }

    if (mostrarMensaje && value && !valido) {
        showToast("El correo de soporte debe ser @innovaschools.edu.co", "error");
    }

    return valido;
}

function abrirActaOriginalSeleccionada() {
    const btn = document.getElementById("btnActaOriginalSeleccionada");
    const url = btn?.dataset?.url || solicitudDevolucionSeleccionada?.pdf_recepcion_url || solicitudDevolucionSeleccionada?.acta || "";
    abrirPdfRecepcion(url);
}

let canvasDev, ctxDev, isDrawingDev = false;
let lastXDev = 0, lastYDev = 0;

function initSignatureDevolucion() {
    canvasDev = document.getElementById("signatureCanvasDevolucion");
    if (!canvasDev) return;

    ctxDev = canvasDev.getContext("2d", { willReadFrequently: true });
    ctxDev.fillStyle = "white";
    ctxDev.fillRect(0, 0, canvasDev.width, canvasDev.height);
    ctxDev.strokeStyle = "#111827";
    ctxDev.lineWidth = 2;
    ctxDev.lineCap = "round";
    ctxDev.lineJoin = "round";

    canvasDev.addEventListener("mousedown", startDev);
    canvasDev.addEventListener("mouseup", stopDev);
    canvasDev.addEventListener("mouseout", stopDev);
    canvasDev.addEventListener("mousemove", drawDev);
    canvasDev.addEventListener("touchstart", startDevTouch, { passive: false });
    canvasDev.addEventListener("touchmove", drawDevTouch, { passive: false });
    canvasDev.addEventListener("touchend", stopDev);
}

function getPosDev(e) {
    const rect = canvasDev.getBoundingClientRect();
    const scaleX = canvasDev.width / rect.width;
    const scaleY = canvasDev.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

function startDev(e) {
    isDrawingDev = true;
    const p = getPosDev(e);
    lastXDev = p.x;
    lastYDev = p.y;
    ctxDev.beginPath();
    ctxDev.moveTo(p.x, p.y);
}

function startDevTouch(e) {
    e.preventDefault();
    startDev(e);
}

function drawDev(e) {
    if (!isDrawingDev) return;
    const p = getPosDev(e);
    ctxDev.beginPath();
    ctxDev.moveTo(lastXDev, lastYDev);
    ctxDev.lineTo(p.x, p.y);
    ctxDev.stroke();
    lastXDev = p.x;
    lastYDev = p.y;
}

function drawDevTouch(e) {
    e.preventDefault();
    drawDev(e);
}

function stopDev() {
    isDrawingDev = false;
    ctxDev.beginPath();
}

function clearSignatureDevolucion() {
    if (!ctxDev || !canvasDev) return;
    ctxDev.clearRect(0, 0, canvasDev.width, canvasDev.height);
    ctxDev.fillStyle = "white";
    ctxDev.fillRect(0, 0, canvasDev.width, canvasDev.height);
}

function getSignatureDevolucionBase64() {
    if (!canvasDev || !ctxDev) return "";

    const imageData = ctxDev.getImageData(0, 0, canvasDev.width, canvasDev.height).data;
    let hasContent = false;

    for (let i = 0; i < imageData.length; i += 4) {
        if (imageData[i] < 250 || imageData[i + 1] < 250 || imageData[i + 2] < 250) {
            hasContent = true;
            break;
        }
    }

    return hasContent ? canvasDev.toDataURL("image/png") : "";
}

function obtenerFirmaDevolucion() {
    if (!validarMetodoFirma('devolucion')) return null;

    if (metodoFirmaDevolucion === 'SI_AUTORIZO') {
        return {
            firma_devolucion: 'SI AUTORIZO',
            tipo_firma_devolucion: 'SI_AUTORIZO'
        };
    }

    const firmaBase64 = getSignatureDevolucionBase64();
    if (!firmaBase64) {
        showToast('Debes firmar antes de continuar', 'error');
        return null;
    }

    return {
        firma_devolucion: firmaBase64,
        tipo_firma_devolucion: 'MANUAL'
    };
}
async function cerrarSolicitudFrontend() {
    const submitButton = document.querySelector('#formCerrarBox .btn-primary');
    if (submitButton?.disabled) return;

    const id_solicitud = document.getElementById("devolucion_id_solicitud").value;
    const cantidad_devuelta = document.getElementById("cantidad_devuelta").value;
    const estado_final = document.getElementById("estado_final").value;
    const novedad_devolucion = document.getElementById("novedad_devolucion").value;
    const descripcion_devolucion = document.getElementById("descripcion_devolucion").value;
    const correo_soporte_devolucion = document.getElementById("correo_soporte_devolucion")?.value.trim().toLowerCase() || "";
    const equipo_adicional = obtenerEquiposAdicionalesDevolucionPayload();

    if (!id_solicitud) {
        showToast("No hay solicitud seleccionada", "error");
        return;
    }

    if (!cantidad_devuelta) {
        showToast("Debes ingresar la cantidad devuelta", "error");
        return;
    }

    if (!estado_final) {
        showToast("Debes seleccionar el estado final", "error");
        return;
    }

    if (correo_soporte_devolucion && !validarCorreoInstitucional(correo_soporte_devolucion)) {
        validarCorreoSoporteDevolucion(true);
        document.getElementById("correo_soporte_devolucion")?.focus();
        return;
    }

    // Si hay novedad, validar descripción y foto
    if (esValorSi(novedad_devolucion)) {
        if (!descripcion_devolucion.trim()) {
            showToast("Debes describir la novedad", "error");
            return;
        }

        const fotoInput = document.getElementById("foto_devolucion");
        if (!fotoInput.files || !fotoInput.files[0]) {
            showToast("Debes adjuntar la foto de la novedad", "error");
            return;
        }
    }

    const datosFirmaDevolucion = obtenerFirmaDevolucion();
    if (!datosFirmaDevolucion) {
        return;
    }

    try {
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        }
        showLoading(true);

        const payload = {
            action: "cerrarSolicitud",
            id_solicitud,
            cantidad_devuelta,
            estado_final,
            correo_soporte_devolucion,
            equipo_adicional,
            pdf_recepcion_url: solicitudDevolucionSeleccionada?.pdf_recepcion_url || solicitudDevolucionSeleccionada?.acta || "",
            novedad_devolucion,
            descripcion_devolucion,
            firma_devolucion: datosFirmaDevolucion.firma_devolucion,
            tipo_firma_devolucion: datosFirmaDevolucion.tipo_firma_devolucion
        };

        // Convertir foto a base64 si hay novedad
        if (esValorSi(novedad_devolucion)) {
            const fotoFile = document.getElementById("foto_devolucion").files[0];
            payload.foto_devolucion = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(fotoFile);
            });
        }

        const result = await postToAppsScript(payload);

        if (result.status === "ok") {
            dispararProcesamientoDocumentosPendientes();
            showToast("Solicitud cerrada correctamente", "success");
            document.getElementById("formCerrarBox").style.display = "none";
            removeFotoDevolucion();
            cargarSolicitudesEnCurso();
        } else {
            showToast("Error: " + (result.error || "No se pudo cerrar"), "error");
        }
    } catch (err) {
        console.error(err);
        showToast("Error de conexión al cerrar la solicitud", "error");
    } finally {
        showLoading(false);
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-check"></i> Confirmar devolución';
        }
    }
}
function obtenerSedeDesdeURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("sede") || "";
}
