function validarCorreoInstitucional(email) {
    return /^[^\s@]+@innovaschools\.edu\.co$/i.test(String(email || '').trim());
}

function obtenerCuentaInnovaGuardada() {
    return String(localStorage.getItem('innovaAccountEmail') || '').trim().toLowerCase();
}

function avisarCuentaInnova(mensaje, tipo) {
    if (typeof showToast === 'function') {
        showToast(mensaje, tipo || 'info');
    } else {
        alert(mensaje);
    }
}

function abrirSelectorCuentaInnova() {
    mostrarModalCuentaInnova(true);
}

function guardarCuentaInnova(correo) {
    const limpio = String(correo || '').trim().toLowerCase();
    if (!validarCorreoInstitucional(limpio)) {
        avisarCuentaInnova('Solo se permite correo @innovaschools.edu.co', 'error');
        return false;
    }

    localStorage.setItem('innovaAccountEmail', limpio);
    sessionStorage.setItem('innovaAccountReady', 'true');
    aplicarCuentaInnovaGuardada();
    return true;
}

function guardarCuentaInnovaDesdeModal(event) {
    if (event) event.preventDefault();

    const input = document.getElementById('innovaAccountEmailInput');
    const correo = String(input?.value || '').trim().toLowerCase();
    if (!guardarCuentaInnova(correo)) {
        input?.focus();
        return;
    }

    cerrarModalCuentaInnova();
    avisarCuentaInnova('Cuenta Innova guardada', 'success');
    pedirCodigoCuentaInnova();
}

function abrirCambioSesionGoogle() {
    const input = document.getElementById('innovaAccountEmailInput');
    const correo = String(input?.value || obtenerCuentaInnovaGuardada() || '').trim().toLowerCase();
    if (!validarCorreoInstitucional(correo)) {
        avisarCuentaInnova('Primero escribe tu correo @innovaschools.edu.co', 'error');
        input?.focus();
        return;
    }

    guardarCuentaInnova(correo);
    sessionStorage.setItem('innovaPendingVerifyCode', 'true');

    const params = new URLSearchParams({
        Email: correo,
        continue: window.location.href
    });

    window.location.href = 'https://accounts.google.com/AccountChooser?' + params.toString();
}

function pedirCodigoCuentaInnova() {
    const correo = obtenerCuentaInnovaGuardada();
    const inputCorreo = document.getElementById('correo');
    const btnVerificar = document.getElementById('btnVerificar');

    if (!correo || !inputCorreo || !btnVerificar) {
        return false;
    }

    if (!inputCorreo.value.trim()) {
        inputCorreo.value = correo;
    }

    if (inputCorreo.disabled || btnVerificar.disabled) {
        return true;
    }

    if (typeof iniciarVerificacion === 'function') {
        iniciarVerificacion();
        return true;
    }

    sessionStorage.setItem('innovaPendingVerifyCode', 'true');
    return false;
}

function aplicarCuentaInnovaGuardada() {
    const correo = obtenerCuentaInnovaGuardada();
    if (!correo) return;

    const inputCorreo = document.getElementById('correo');
    if (inputCorreo && !inputCorreo.value.trim()) {
        inputCorreo.value = correo;
    }

    document.querySelectorAll('.innova-account-notice').forEach(notice => {
        notice.style.display = 'none';
    });

    if (document.getElementById('carroSelect') && typeof cargarEquiposPorSede === 'function') {
        cargarEquiposPorSede();
    }
}

function mostrarModalCuentaInnova(forzar) {
    const cuentaGuardada = obtenerCuentaInnovaGuardada();
    if (cuentaGuardada && !forzar) {
        sessionStorage.setItem('innovaAccountReady', 'true');
        aplicarCuentaInnovaGuardada();
        return;
    }

    if (!forzar && sessionStorage.getItem('innovaAccountReady') === 'true') {
        aplicarCuentaInnovaGuardada();
        return;
    }

    const modalExistente = document.getElementById('modalCuentaInnova');
    if (modalExistente) {
        modalExistente.querySelector('#innovaAccountEmailInput')?.focus();
        return;
    }

    document.body.insertAdjacentHTML('beforeend', `
        <div id="modalCuentaInnova" class="innova-account-modal">
            <div class="innova-account-dialog">
                <div class="innova-account-dialog-icon"><i class="fas fa-circle-user"></i></div>
                <h2>Cuenta Innova</h2>
                <p>Escribe tu correo <strong>@innovaschools.edu.co</strong>. Lo guardaremos para completar los formularios de recepción.</p>
                <form class="innova-account-form" onsubmit="guardarCuentaInnovaDesdeModal(event)">
                    <input
                        id="innovaAccountEmailInput"
                        class="innova-account-input"
                        type="email"
                        inputmode="email"
                        autocomplete="email"
                        placeholder="nombre@innovaschools.edu.co"
                        value="${cuentaGuardada}"
                    >
                    <button type="submit" class="innova-account-btn">
                        <i class="fas fa-check"></i>
                        Guardar cuenta Innova
                    </button>
                    <button type="button" class="innova-account-google" onclick="abrirCambioSesionGoogle()">
                        <i class="fab fa-google"></i>
                        Ver cuentas Google
                    </button>
                    <button type="button" class="innova-account-skip" onclick="cerrarModalCuentaInnova()">
                        Continuar por ahora
                    </button>
                </form>
            </div>
        </div>
    `);

    setTimeout(() => document.getElementById('innovaAccountEmailInput')?.focus(), 0);
}

function cerrarModalCuentaInnova() {
    const modal = document.getElementById('modalCuentaInnova');
    if (modal) modal.remove();
}

window.addEventListener('DOMContentLoaded', () => {
    aplicarCuentaInnovaGuardada();

    if (sessionStorage.getItem('innovaPendingVerifyCode') === 'true') {
        sessionStorage.removeItem('innovaPendingVerifyCode');
        setTimeout(pedirCodigoCuentaInnova, 250);
    }
});
