// Configuración
const URL_GOOGLE_SCRIPT = "https://script.google.com/macros/s/AKfycbztaEB5Li8RS-8S37ZwNEYFGCeNN_eBW2gtebU6qCK61l2eIML7yjWebA1R9LU37FmZsA/exec";
let currentRecord = null;
let currentStep = 1;
const totalSteps = 3;

// Variables para el canvas de firma
let signatureCanvas, ctx;
let isDrawing = false;
let lastX = 0;
let lastY = 0;
// Variables globales para equipos
let equiposZipaquira = [];
let carrosDisponibles = [];
let carrosOcupados = [];
// Cargar equipos al iniciar
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM cargado, inicializando...");
    initializeEventListeners();
    updateProgressBar();
    loadRecords();
    setDefaultDate();
    
    // Cargar equipos de Zipaquirá
    cargarEquiposPorSede();
});

// Función general para cargar equipos según la sede
async function cargarEquiposPorSede() {
    const sedeInput = document.getElementById('sede');
    if (!sedeInput) {
        console.error("No se encontró el input hidden #sede");
        return;
    }

    // Normalizamos igual que en Apps Script
    const sedeNombre = sedeInput.value;
    const sedeParaURL = sedeNombre.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""); // zipaquira, niza, usaquen...

    try {
        const response = await fetch(`${URL_GOOGLE_SCRIPT}?action=getEquipos&sede=${encodeURIComponent(sedeParaURL)}`);
        equiposZipaquira = await response.json();   // reutilizamos la misma variable global (está bien)

        // Obtener carros únicos y ordenarlos
        carrosDisponibles = [...new Set(equiposZipaquira.map(e => e.carro))].sort((a, b) => {
            const numA = a.match(/\d+/) ? parseInt(a.match(/\d+/)[0]) : 999;
            const numB = b.match(/\d+/) ? parseInt(b.match(/\d+/)[0]) : 999;
            return numA - numB;
        });

        // Llenar el select
        const select = document.getElementById('carroSelect');
        select.innerHTML = '<option value="">Seleccione un carro...</option>';

        carrosDisponibles.forEach(carro => {
            const option = document.createElement('option');
            option.value = carro;
            option.textContent = carro;
            select.appendChild(option);
        });

        console.log(`✅ Carros cargados para sede ${sedeNombre}:`, carrosDisponibles);

    } catch (error) {
        console.error("Error cargando equipos:", error);
        document.getElementById('carroSelect').innerHTML =
            '<option value="">Error al cargar carros</option>';
    }
}
// Función para alternar entre carros y otros equipos
function toggleOtrosEquipos() {
    const esOtros = document.getElementById('otrosEquipos').checked;
    const selectCarro = document.getElementById('carroSelect');
    const equiposContainer = document.getElementById('equiposContainer');
    const otrosBox = document.getElementById('otrosEquiposBox');
    const disponibilidadMsg = document.getElementById('disponibilidadMsg');
    
    if (esOtros) {
        selectCarro.required = false;
        selectCarro.disabled = true;
        selectCarro.value = "";
        equiposContainer.style.display = 'none';
        otrosBox.classList.remove('hidden');
        disponibilidadMsg.innerHTML = '';
        document.getElementById('rangoInicio').required = true;
        document.getElementById('rangoFin').required = true;
    } else {
        selectCarro.required = true;
        selectCarro.disabled = false;
        otrosBox.classList.add('hidden');
        document.getElementById('rangoInicio').required = false;
        document.getElementById('rangoFin').required = false;
        document.getElementById('rangoInicio').value = '';
        document.getElementById('rangoFin').value = '';
    }
}

// Validar rango numérico
function validarRango() {
    const inicio = parseInt(document.getElementById('rangoInicio').value) || 0;
    const fin = parseInt(document.getElementById('rangoFin').value) || 0;
    const errorMsg = document.getElementById('rangoError');
    const totalLabel = document.getElementById('totalOtrosEquipos');
    
    if (inicio > 0 && fin > 0) {
        if (fin <= inicio || (fin - inicio) > 500) {
            errorMsg.style.display = 'block';
            totalLabel.textContent = '0';
            return false;
        } else {
            errorMsg.style.display = 'none';
            const total = fin - inicio + 1;
            totalLabel.textContent = total;
            if (total > 100) {
                totalLabel.innerHTML = total + ' <span style="color: #f59e0b;"><i class="fas fa-exclamation-triangle"></i> Muchos equipos</span>';
            }
            return true;
        }
    }
    return false;
}

// Validar hora máxima (4pm)
function validarHora() {
    const horaInput = document.getElementById('horaDevolucion');
    const hora = horaInput.value;
    const errorMsg = document.getElementById('horaError');
    
    const horaMin = "07:00";
    const horaMax = "16:00";

    if (hora < horaMin || hora > horaMax) {
        errorMsg.style.display = 'block';
        errorMsg.textContent = "La hora debe estar entre 7:00 AM y 4:00 PM";
        
        horaInput.value = ""; // limpiar
        
        setTimeout(() => {
            errorMsg.style.display = 'none';
        }, 8000);
        
        return false;
    }

    errorMsg.style.display = 'none';
    return true;
}

async function verificarDisponibilidad() {
    const carro = document.getElementById('carroSelect').value;
    const sede = document.getElementById('sede').value;   // ← NUEVO
    const msgDiv = document.getElementById('disponibilidadMsg');
    const btnNext = document.querySelector('.btn-next');
    
    console.log("=== VERIFICANDO EN FRONTEND ===");
    console.log("Carro seleccionado:", carro);
    console.log("Sede:", sede);
    
    if (!carro || document.getElementById('otrosEquipos').checked) {
        msgDiv.innerHTML = '';
        if(btnNext) {
            btnNext.disabled = false;
            btnNext.style.opacity = '1';
            btnNext.style.cursor = 'pointer';
        }
        return;
    }
    
    try {
        const fechaHoy = new Date().toISOString().split('T')[0];
        
        // ←←← AQUÍ ESTÁ EL CAMBIO IMPORTANTE
        const url = `${URL_GOOGLE_SCRIPT}?action=verificarDisponibilidad&carro=${encodeURIComponent(carro)}&fecha=${fechaHoy}&sede=${encodeURIComponent(sede)}`;
        
        console.log("URL de consulta:", url);
        
        const response = await fetch(url);
        const data = await response.json();
        
        console.log("Respuesta del servidor:", data);
        
        if (data.ocupado) {
            console.log("🔴 Carro OCUPADO");
            msgDiv.innerHTML = `
                <div style="background: #fee2e2; border: 1px solid #ef4444; border-radius: 6px; padding: 10px; margin-top: 5px;">
                    <span style="color: #dc2626; font-weight: 600;">
                        <i class="fas fa-ban"></i> CARRO NO DISPONIBLE
                    </span><br>
                    <span style="color: #7f1d1d; font-size: 0.9rem;">
                        Este carro está ocupado hasta las <strong>${data.hora_devolucion || '16:00'}</strong><br>
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
        cedula: "80720145",        // ← NUEVO
        correo: "juan@ejemplo.com", // ← NUEVO
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

        const response = await fetch(URL_GOOGLE_SCRIPT, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.status === 'ok') {
            showToast('¡Registro guardado exitosamente ✅<br>Recargando...', 'success');

            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } else if (result.ocupado) {
            showToast(`❌ ${result.error}`, 'error');
            verificarDisponibilidad();
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
        const response = await fetch(URL_GOOGLE_SCRIPT);
        const data = await response.json();
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
    const esOtrosEquipos = document.getElementById('otrosEquipos').checked;
    const horaDevolucion = document.getElementById('horaDevolucion').value;
    
    // Validar hora
    if (!horaDevolucion || horaDevolucion < "07:00" || horaDevolucion > "16:00") {
        showToast('La hora debe estar entre 7:00 AM y 4:00 PM', 'error');
        return false;
    }
    
    let data = {
        fecha: document.getElementById('fecha').value,
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
    
    // Si es otros equipos, validar y guardar rangos
    if (esOtrosEquipos) {
        const rangoInicio = parseInt(document.getElementById('rangoInicio').value);
        const rangoFin = parseInt(document.getElementById('rangoFin').value);
        
        if (!rangoInicio || !rangoFin || rangoFin <= rangoInicio || rangoFin > 500) {
            showToast('Verifique el rango numérico (1-500)', 'error');
            return false;
        }
        data.sede = document.getElementById('sede').value;
        data.equipo = `Otros equipos (${rangoInicio} - ${rangoFin})`;
        data.cantidad = rangoFin - rangoInicio + 1;
        data.detalle_equipos = `Equipos del número ${rangoInicio} hasta ${rangoFin} (Total: ${data.cantidad})`;
        data.rango_inicio = rangoInicio;
        data.rango_fin = rangoFin;
    } else {
        // Lógica normal de carros
        const carroSeleccionado = document.getElementById('carroSelect').value;
        if (!carroSeleccionado) {
            showToast('Debe seleccionar un carro', 'error');
            return false;
        }
        
        // Verificar disponibilidad antes de enviar
            try {
                const sede = document.getElementById('sede').value;   // ← NUEVO
                const checkResp = await fetch(`${URL_GOOGLE_SCRIPT}?action=verificarDisponibilidad&carro=${encodeURIComponent(carroSeleccionado)}&fecha=${new Date().toISOString().split('T')[0]}&sede=${encodeURIComponent(sede)}`);
            const checkData = await checkResp.json();
            
            if (checkData.ocupado) {
                showToast(`❌ Carro NO disponible. Estará libre a las ${checkData.hora_devolucion}`, 'error');
                return false;
            }
        } catch(e) {
            console.error("Error verificando disponibilidad:", e);
            showToast('⚠️ Error de conexión. No se pudo verificar disponibilidad.', 'error');
            return false;
        }
        
        const equiposCarro = equiposZipaquira.filter(e => e.carro === carroSeleccionado);
        data.equipo = carroSeleccionado;
        data.cantidad = equiposCarro.length;
        data.detalle_equipos = equiposCarro.map((e, i) => 
            `${i + 1}. Placa: ${e.placa} - Serial: ${e.serial}`
        ).join('\n');
        data.rango_inicio = '';
        data.rango_fin = '';
    }
    
    // Procesar fotos (solo foto_dano)
    const fotoDano = document.getElementById('foto_dano').files[0];
    if (fotoDano) data.foto_dano = await toBase64(fotoDano);
    
    const firmaBase64 = getSignatureBase64();
    if (!firmaBase64) {
        showToast('¡Por favor firme en el recuadro antes de enviar!', 'error');
        return false;
    }
    data.firma = firmaBase64;
    
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
    doc.text(`Hora máxima de devolución: ${record.hora_devolucion || '16:00'}`, 20, y);
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
    if (record.firma && record.firma.startsWith('data:image')) {
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
    showToast('PDF descargado exitosamente ✅', 'success');
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
    document.getElementById('loadingOverlay').classList.toggle('active', show);
}

// Cerrar modal al hacer clic fuera
document.addEventListener('click', (e) => {
    const modal = document.getElementById('detailModal');
    if (e.target === modal) {
        closeModal();
    }
});
async function cargarCarros() {

    const resOcupados = await fetch(URL + "?action=ocupados");
    const ocupados = await resOcupados.json();

    console.log("OCUPADOS:", ocupados);

    const select = document.getElementById("carroSelect");

    Array.from(select.options).forEach(option => {

        if (ocupados.includes(option.value)) {
            option.disabled = true;
            option.text += " (Ocupado)";
        }

    });

}