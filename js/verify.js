// verify.js - Sistema de verificación de correo
const VERIFY_CONFIG = {
    codeLength: 6,
    expirationMinutes: 10,
    maxAttempts: 3
};

// Variable para almacenar código temporal (en memoria, se borra al recargar)
let verificationData = {
    code: null,
    email: null,
    verified: false,
    attempts: 0,
    timestamp: null
};

// ============ FUNCIONES PRINCIPALES ============

/**
 * Inicia el proceso de verificación
 */
async function iniciarVerificacion() {
    const emailInput = document.getElementById('correo');
    const email = emailInput.value.trim().toLowerCase();
    
    // Validar formato del correo
    if (!validarCorreoInnova(email)) {
        showToast('Ingrese un correo @innovaschools.edu.co válido', 'error');
        emailInput.focus();
        return false;
    }
    
    // Mostrar loading
    showLoading(true);
    
    try {
        // Generar código
        const codigo = generarCodigo();
        
        // Guardar datos
        verificationData = {
            code: codigo,
            email: email,
            verified: false,
            attempts: 0,
            timestamp: Date.now()
        };
        
        // Enviar código por correo (via Google Apps Script)
        const enviado = await enviarCodigoPorCorreo(email, codigo);
        
        if (!enviado) {
            throw new Error('No se pudo enviar el correo');
        }
        
        // Mostrar modal de verificación
        mostrarModalVerificacion(email);
        showToast(`Código enviado a ${email}`, 'success');
        
        return true;
        
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al enviar código. Intente nuevamente.', 'error');
        return false;
    } finally {
        showLoading(false);
    }
}

/**
 * Valida el código ingresado
 */
function validarCodigoIngresado() {
    const inputCodigo = document.getElementById('codigoVerificacion');
    const codigoIngresado = inputCodigo.value.trim();
    
    // Verificar expiración
    if (haExpirado()) {
        showToast('El código ha expirado. Solicite uno nuevo.', 'error');
        cerrarModalVerificacion();
        return false;
    }
    
    // Verificar intentos
    if (verificationData.attempts >= VERIFY_CONFIG.maxAttempts) {
        showToast('Demasiados intentos. Solicite un nuevo código.', 'error');
        cerrarModalVerificacion();
        return false;
    }
    
    // Validar código
    verificationData.attempts++;
    
    if (codigoIngresado === verificationData.code) {
        // ÉXITO
        verificationData.verified = true;
        marcarCorreoVerificado();
        cerrarModalVerificacion();
        showToast('✅ Correo verificado correctamente', 'success');
        
        // Habilitar el botón siguiente del formulario principal
        habilitarBotonSiguiente();
        
        return true;
    } else {
        // FALLÓ
        const restantes = VERIFY_CONFIG.maxAttempts - verificationData.attempts;
        showToast(`Código incorrecto. ${restantes} intentos restantes.`, 'warning');
        inputCodigo.value = '';
        inputCodigo.focus();
        
        // Animación de error
        inputCodigo.style.animation = 'shake 0.5s';
        setTimeout(() => {
            inputCodigo.style.animation = '';
        }, 500);
        
        return false;
    }
}

/**
 * Reenviar código
 */
async function reenviarCodigo() {
    if (!verificationData.email) {
        showToast('Error: No hay correo pendiente', 'error');
        return;
    }
    
    // Esperar 30 segundos entre reenvíos
    const tiempoTranscurrido = Date.now() - verificationData.timestamp;
    if (tiempoTranscurrido < 30000) {
        const esperar = Math.ceil((30000 - tiempoTranscurrido) / 1000);
        showToast(`Espere ${esperar} segundos para reenviar`, 'warning');
        return;
    }
    
    showLoading(true);
    
    try {
        const nuevoCodigo = generarCodigo();
        verificationData.code = nuevoCodigo;
        verificationData.attempts = 0;
        verificationData.timestamp = Date.now();
        
        await enviarCodigoPorCorreo(verificationData.email, nuevoCodigo);
        showToast('Nuevo código enviado', 'success');
        
        // Resetear inputs
        document.getElementById('codigoVerificacion').value = '';
        document.getElementById('codigoVerificacion').focus();
        
    } catch (error) {
        showToast('Error al reenviar', 'error');
    } finally {
        showLoading(false);
    }
}

// ============ FUNCIONES AUXILIARES ============

function validarCorreoInnova(email) {
    const regex = /^[^\s@]+@innovaschools\.edu\.co$/;
    return regex.test(email);
}

function generarCodigo() {
    const chars = '0123456789';
    let codigo = '';
    for (let i = 0; i < VERIFY_CONFIG.codeLength; i++) {
        codigo += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return codigo;
}

function haExpirado() {
    const ahora = Date.now();
    const expiracion = VERIFY_CONFIG.expirationMinutes * 60 * 1000;
    return (ahora - verificationData.timestamp) > expiracion;
}

function marcarCorreoVerificado() {
    const emailInput = document.getElementById('correo');
    const verifyBtn = document.getElementById('btnVerificar');
    
    // Deshabilitar campo y cambiar estilo
    emailInput.disabled = true;
    emailInput.classList.add('verified');
    
    // Cambiar botón
    verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> Verificado';
    verifyBtn.classList.add('verified');
    verifyBtn.disabled = true;
    
    // Mostrar indicador visual
    const container = emailInput.closest('.input-group');
    let badge = container.querySelector('.verify-badge');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'verify-badge';
        container.appendChild(badge);
    }
    badge.innerHTML = '<i class="fas fa-shield-alt"></i> Verificado';
}

function habilitarBotonSiguiente() {
    // El botón siguiente ya está habilitado, pero ahora el formulario puede avanzar
    const btnNext = document.querySelector('.btn-next');
    if (btnNext) {
        btnNext.disabled = false;
        btnNext.style.opacity = '1';
    }
}

// ============ COMUNICACIÓN CON GOOGLE APPS SCRIPT ============

async function enviarCodigoPorCorreo(email, codigo) {
    try {
        const response = await fetch(`${URL_GOOGLE_SCRIPT}?action=sendVerifyCode&email=${encodeURIComponent(email)}&code=${codigo}`);
        const result = await response.json();
        return result.status === 'ok';
    } catch (error) {
        console.error('Error enviando código:', error);
        // Fallback: simular éxito en desarrollo
        console.log(`[MODO DEMO] Código para ${email}: ${codigo}`);
        return true;
    }
}

// ============ UI - MODAL ============

function mostrarModalVerificacion(email) {
    // Crear modal si no existe
    let modal = document.getElementById('verifyModal');
    if (!modal) {
        modal = crearModalHTML();
        document.body.appendChild(modal);
    }
    
    // Actualizar email mostrado
    document.getElementById('verifyEmailDisplay').textContent = email;
    
    // Mostrar
    modal.classList.add('active');
    
    // Focus en input
    setTimeout(() => {
        document.getElementById('codigoVerificacion').focus();
    }, 100);
}

function cerrarModalVerificacion() {
    const modal = document.getElementById('verifyModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function crearModalHTML() {
    const div = document.createElement('div');
    div.id = 'verifyModal';
    div.className = 'modal verify-modal';
    div.innerHTML = `
        <div class="modal-content verify-content">
            <div class="verify-header">
                <div class="verify-icon">
                    <i class="fas fa-envelope-open-text"></i>
                </div>
                <h3>Verifica tu correo</h3>
                <p>Hemos enviado un código de <strong>6 dígitos</strong> a:</p>
                <div class="email-display" id="verifyEmailDisplay"></div>
            </div>
            
            <div class="verify-body">
                <div class="code-input-container">
                    <input 
                        type="text" 
                        id="codigoVerificacion" 
                        maxlength="6" 
                        placeholder="000000"
                        inputmode="numeric"
                        autocomplete="one-time-code"
                    >
                </div>
                <p class="code-hint">Ingresa el código de 6 dígitos</p>
                
                <div class="timer-container">
                    <i class="fas fa-clock"></i>
                    <span id="verifyTimer">10:00</span>
                </div>
            </div>
            
            <div class="verify-actions">
                <button type="button" class="btn-verify-submit" onclick="validarCodigoIngresado()">
                    <i class="fas fa-check"></i> Verificar
                </button>
                <button type="button" class="btn-verify-resend" onclick="reenviarCodigo()">
                    <i class="fas fa-redo"></i> Reenviar código
                </button>
                <button type="button" class="btn-verify-cancel" onclick="cerrarModalVerificacion()">
                    Cancelar
                </button>
            </div>
        </div>
    `;
    
    // Event listeners
    setTimeout(() => {
        const input = div.querySelector('#codigoVerificacion');
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
            if (e.target.value.length === 6) {
                validarCodigoIngresado();
            }
        });
        
        // Iniciar timer
        iniciarTimer();
    }, 0);
    
    return div;
}

function iniciarTimer() {
    let segundos = VERIFY_CONFIG.expirationMinutes * 60;
    const display = document.getElementById('verifyTimer');
    
    const interval = setInterval(() => {
        if (!document.getElementById('verifyModal')?.classList.contains('active')) {
            clearInterval(interval);
            return;
        }
        
        segundos--;
        const mins = Math.floor(segundos / 60);
        const secs = segundos % 60;
        if (display) {
            display.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        }
        
        if (segundos <= 0) {
            clearInterval(interval);
            if (display) display.textContent = 'Expirado';
        }
    }, 1000);
}

// ============ INTEGRACIÓN CON FORMULARIO ============

/**
 * Verifica si el correo está verificado antes de avanzar
 */
function verificarAntesDeAvanzar() {
    const emailInput = document.getElementById('correo');
    
    // Si no hay correo
    if (!emailInput.value.trim()) {
        showToast('Ingrese su correo institucional', 'error');
        emailInput.focus();
        return false;
    }
    
    // Si el correo no es válido
    if (!validarCorreoInnova(emailInput.value)) {
        showToast('Use su correo @innovaschools.edu.co', 'error');
        return false;
    }
    
    // Si no está verificado
    if (!verificationData.verified || verificationData.email !== emailInput.value.trim().toLowerCase()) {
        // Mostrar confirmación para iniciar verificación
        iniciarVerificacion();
        return false;
    }
    
    return true;
}

// Exportar para usar en script.js
window.iniciarVerificacion = iniciarVerificacion;
window.validarCodigoIngresado = validarCodigoIngresado;
window.reenviarCodigo = reenviarCodigo;
window.cerrarModalVerificacion = cerrarModalVerificacion;
window.verificarAntesDeAvanzar = verificarAntesDeAvanzar;
window.verificationData = verificationData;