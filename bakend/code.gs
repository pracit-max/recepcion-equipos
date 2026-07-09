const SHEET_ID = "1Z1DXZr_dK1BuutNET3u5C68ourccKU5bNRjUD5YWw-U";

const SUPPORT_EMAIL = "desarrollosoporte@innovaschools.edu.co";
const ADMIN_EMAILS = [SUPPORT_EMAIL, "jmacias@innovaschools.edu.co"];

const FOLDER_PRINCIPAL = "1CDAeq-5kGf2qeh0h-rzndOLbLYoCuxqV";
const FOLDER_DANO = "1U8429mpiHSHAcSLGEYKT_q9PuhYYpKZe";
const FOLDER_CAMBIO = "1kTr5tAAf-Plr0f9mIZkwm3UzxfHddn-9";
const FOLDER_FIRMA = FOLDER_PRINCIPAL;
const FOLDER_PDF = "1oQz1HcqW2MeN6znSU0V5nWeTc9Y_Bjfd";
const FOLDER_PDF_DEVOLUCION = "1GIloMbYUg8FuGy0fmrPVt7lRRFh0y79E";
const FOLDER_FOTO_DEVOLUCION = "1rVpx5J4GQq6krM-BWT-JEMHI2HWXF_Ux";
const LOGO_FOLDER_ID = "1duxfWaq4aKlvsAW20Q7_H6ti8nT7JeZ1";
const LOGO_ID = "";
const MAIN_SHEET_GID = 364802551;
let JSONP_CALLBACK = "";
// ============================================================
// doGet - UNIFICADA (solo puede haber una!)
// ============================================================
function doGet(e) {
  try {
    JSONP_CALLBACK = e && e.parameter ? String(e.parameter.callback || "") : "";
    const action = e && e.parameter ? e.parameter.action : null;
    const sede = e && e.parameter ? e.parameter.sede : null;

// En tu función doGet, reemplaza el bloque de validarCorreoSoporte por:

    if (action === "validarCorreoSoporte") {
      try {
        const correo = e.parameter.correo || "";
        Logger.log("=== doGet validarCorreoSoporte ===");
        Logger.log("Correo recibido: " + correo);
        
        if (!correo) {
          Logger.log("❌ Correo vacío");
          return jsonResponse({ status: "error", error: "Debes ingresar un correo" });
        }
        
        const resultado = validarCorreoSoporteHandler(correo);
        Logger.log("Resultado final: " + JSON.stringify(resultado));
        
        return jsonResponse(resultado);
      } catch (err) {
        Logger.log("🔥 Error catch validarCorreoSoporte: " + err.toString());
        return jsonResponse({ status: "error", error: err.toString() });
      }
    }
    // ==============================
    // VALIDAR CORREO DE SOPORTE (desde hoja correos_sede)
    // ==============================


    // ==============================
    // OBTENER SEDES DISPONIBLES
    // ==============================
    if (action === "getSedesSoporte") {
      return getSedesSoporteHandler();
    }

    if (action === "buscarDatosPorCedula") {
      try {
        return jsonResponse(buscarDatosPorCedulaHandler(e.parameter.cedula || ""));
      } catch (err) {
        return jsonResponse({ status: "error", error: err.toString() });
      }
    }

    if (action === "procesarDocumentosPendientes") {
      procesarDocumentosPendientesAsync();
      return jsonResponse({ status: "ok", message: "Procesamiento de documentos ejecutado" });
    }

    // ==============================
    // SOLICITUDES EN CURSO
    // ==============================
    if (action === "enCurso") {
      try {
        const permisoEnCurso = requireSoporteAutorizado_(e.parameter.correo || "", e.parameter.sede || "");
        if (!permisoEnCurso.ok) {
          return jsonResponse({ status: "error", error: permisoEnCurso.error });
        }

        const sheet = getMainSheet();
        const colMap = getColumnMap(sheet);
        const lastRow = sheet.getLastRow();
        const lastCol = sheet.getLastColumn();

        if (lastRow <= 1) {
          return jsonResponse([]);
        }

        const rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
        const normalizarTexto = (txt) => {
          return String(txt || "")
            .toLowerCase()
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
        };

        const sedeFiltro = normalizarTexto(e.parameter.sede || "");

        const enCurso = rows
          .map(row => getRowDataObject(row, colMap))
          .filter(r => {
            const estadoOk = String(r.estado || "").trim().toUpperCase() === "EN_CURSO";
            const sedeRegistro = normalizarTexto(r.sede || "");
            const sedeOk = !sedeFiltro || sedeRegistro === sedeFiltro;
            return estadoOk && sedeOk;
          })
          .map(r => ({
            id_solicitud: r.id_solicitud || "",
            fecha: formatearFechaSheet(r.fecha),
            nombre: r.nombre || "",
            cedula: r.cedula || "",
            correo: r.correo || "",
            curso: r.curso || "",
            sede: r.sede || "",
            equipo: r.equipo || "",
            tipo_usuario: r.tipo_usuario || "Docente",
            vehiculo_principal: r.vehiculo_principal || r.equipo || "",
            vehiculos_adicionales: r.vehiculos_adicionales || "",
            vehiculos_solicitados: r.vehiculos_solicitados || "",
            cantidad: r.cantidad || "",
            hora_entrega: formatearHoraSheet(r.hora_entrega),
            hora_devolucion: formatearHoraSheet(r.hora_devolucion),
            detalle_equipos: r.detalle_equipos || "",
            acta: r.acta || "",
            pdf_recepcion_url: r.acta || "",
            equipo_adicional: r.equipo_adicional || "",
            serial_adicional: r.serial_adicional || "",
            estado_devolucion_usuario: r.estado_devolucion_usuario || "",
            fecha_notificacion_devolucion: formatearFechaSheet(r.fecha_notificacion_devolucion),
            hora_notificacion_devolucion: formatearHoraSheet(r.hora_notificacion_devolucion),
            observaciones_devolucion_usuario: r.observaciones_devolucion_usuario || "",
            fotos_devolucion_usuario: r.fotos_devolucion_usuario || ""
          }));

        return jsonResponse(enCurso);

      } catch (err) {
        return jsonResponse({ status: "error", error: err.toString() });
      }
    }

    if (action === "devolucionesCerradas") {
      try {
        const permisoCerradas = requireSoporteAutorizado_(e.parameter.correo || "", e.parameter.sede || "");
        if (!permisoCerradas.ok) {
          return jsonResponse({ status: "error", error: permisoCerradas.error });
        }

        const sheet = getMainSheet();
        const colMap = getColumnMap(sheet);
        const lastRow = sheet.getLastRow();
        const lastCol = sheet.getLastColumn();

        if (lastRow <= 1) {
          return jsonResponse([]);
        }

        const rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
        const sedeFiltro = normalizarTexto(e.parameter.sede || "");

        const cerradas = rows
          .map(row => getRowDataObject(row, colMap))
          .filter(r => {
            const estadoOk = String(r.estado || "").trim().toUpperCase() === "CERRADO";
            const tieneDevolucion = Boolean(r.fecha_devolucion || r.hora_devolucion_real || r.pdf_resumen_url);
            const sedeRegistro = normalizarTexto(r.sede || "");
            const sedeOk = !sedeFiltro || sedeRegistro === sedeFiltro;
            return estadoOk && tieneDevolucion && sedeOk;
          })
          .map((r, index) => {
            const actaRecepcion = r.acta || buscarActaRecepcionRelacionada(r);
            return {
              id: index + 1,
              id_solicitud: r.id_solicitud || "",
              fecha: formatearFechaSheet(r.fecha),
              nombre: r.nombre || "",
              cedula: r.cedula || "",
              correo: r.correo || "",
              curso: r.curso || "",
              sede: r.sede || "",
              equipo: r.equipo || "",
              tipo_usuario: r.tipo_usuario || "Docente",
              vehiculo_principal: r.vehiculo_principal || r.equipo || "",
              vehiculos_adicionales: r.vehiculos_adicionales || "",
              vehiculos_solicitados: r.vehiculos_solicitados || "",
              cantidad: r.cantidad || "",
              fecha_devolucion: formatearFechaSheet(r.fecha_devolucion),
              hora_devolucion_real: formatearHoraSheet(r.hora_devolucion_real),
              estado_final: r.estado_final || "",
              novedad_devolucion: r.novedad_devolucion || "",
              acta: actaRecepcion,
              pdf_recepcion_url: actaRecepcion,
              pdf_resumen_url: r.pdf_resumen_url || ""
            };
          })
          .sort((a, b) => new Date(b.fecha_devolucion || b.fecha || 0) - new Date(a.fecha_devolucion || a.fecha || 0));

        return jsonResponse(cerradas);

      } catch (err) {
        return jsonResponse({ status: "error", error: err.toString() });
      }
    }

    // ==============================
    // CARROS OCUPADOS
    // ==============================
    if (action === "ocupados") {
      return jsonResponse(getCarrosDisponibles());
    }

    // ==============================
    // DISPONIBILIDAD POR SEDE
    // ==============================
    if (action === "getDisponibilidadSede") {
      try {
        const sedeParam = String(e.parameter.sede || "").trim();
        const fecha = String(e.parameter.fecha || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd")).trim();
        return jsonResponse(getDisponibilidadSedeHandler(sedeParam, fecha));
      } catch (err) {
        return jsonResponse({ status: "error", error: err.toString(), ocupados: {} });
      }
    }

    // ==============================
    // VERIFICAR DISPONIBILIDAD
    // ==============================
    if (action === 'verificarDisponibilidad') {
      try {
        const carro = String(e.parameter.carro || "").trim();
        const fecha = String(e.parameter.fecha || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd")).trim();
        const sedeParam = String(e.parameter.sede || "").trim();

        if (!carro) {
          return jsonResponse({ ocupado: false });
        }

        const disponibilidad = getDisponibilidadSedeHandler(sedeParam, fecha);
        const ocupado = disponibilidad.ocupados && disponibilidad.ocupados[carro];
        if (ocupado) {
          return jsonResponse({
            ocupado: true,
            usuario: ocupado.usuario || "Usuario desconocido",
            hora_devolucion: ocupado.hora_devolucion || "15:00",
            id_solicitud: ocupado.id_solicitud || ""
          });
        }

        return jsonResponse({ ocupado: false });

        const sheet = getMainSheet();
        const colMap = getColumnMap(sheet);
        const lastRow = sheet.getLastRow();
        const lastCol = sheet.getLastColumn();

        if (lastRow <= 1) {
          return jsonResponse({ ocupado: false });
        }

        const zonaHoraria = Session.getScriptTimeZone();
        const rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

        const normalizar = (txt) =>
          String(txt || "")
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

        for (let row of rows) {
          const r = getRowDataObject(row, colMap);

          let fechaRegistro = r.fecha || "";
          if (fechaRegistro instanceof Date) {
            fechaRegistro = Utilities.formatDate(fechaRegistro, zonaHoraria, "yyyy-MM-dd");
          } else {
            fechaRegistro = String(fechaRegistro).split("T")[0].split(" ")[0];
          }

          const equipoRegistrado = String(r.equipo || "").trim();
          const sedeRegistrada = normalizar(r.sede || "");
          const estadoRegistro = String(r.estado || "").trim().toUpperCase();

          if (
            fechaRegistro === fecha &&
            equipoRegistrado === carro &&
            sedeRegistrada === normalizar(sedeParam) &&
            estadoRegistro === "EN_CURSO"
          ) {
            return jsonResponse({
              ocupado: true,
              usuario: r.nombre || "Usuario desconocido",
              id_solicitud: r.id_solicitud || ""
            });
          }
        }

        return jsonResponse({ ocupado: false });

      } catch (err) {
        return jsonResponse({ ocupado: false, error: err.toString() });
      }
    }

    // ==============================
    // ENVIAR CÓDIGO DE VERIFICACIÓN
    // ==============================
    if (action === 'sendVerifyCode') {
      try {
        // El código YA NO lo genera ni lo controla el cliente (antes se podía
        // forzar cualquier "verificación" sin recibir el correo real, ver
        // confirmVerifyCode más abajo). Se genera y se guarda server-side.
        return jsonResponse(generarYEnviarCodigoVerificacion(e.parameter.email || "", e.parameter.code || ""));
      } catch (err) {
        return jsonResponse({ status: 'error', error: err.toString() });
      }
    }

    if (action === 'confirmVerifyCode') {
      try {
        return jsonResponse(confirmarCodigoVerificacion(e.parameter.email || "", e.parameter.code || ""));
      } catch (err) {
        return jsonResponse({ status: 'error', error: err.toString() });
      }
    }

    // ==============================
    // TRAER EQUIPOS POR SEDE (DINÁMICO)
    // ==============================
    if (action === 'getEquipos' && sede) {
      try {
        Logger.log("=== getEquipos === sede recibida: " + sede);

        // Normalizamos el nombre de la sede
        const sedeLimpia = sede.toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        const sheetName = "equipos_" + sedeLimpia;
        Logger.log("Buscando hoja: " + sheetName);

        const ss = SpreadsheetApp.openById(SHEET_ID);
        const sheet = ss.getSheetByName(sheetName);

        if (!sheet) {
          Logger.log("❌ No existe la hoja: " + sheetName);
          // Listar hojas disponibles para debug
          const hojas = ss.getSheets().map(s => s.getName());
          Logger.log("Hojas disponibles: " + hojas.join(", "));
          return jsonResponse({ error: "No existe la hoja '" + sheetName + "'. Hojas: " + hojas.join(", ") });
        }

        Logger.log("✅ Hoja encontrada: " + sheetName);

        const data = sheet.getDataRange().getValues();
        Logger.log("Filas en hoja: " + data.length);

        const equipos = data.slice(1)
          .filter(row => row[0] && row[0].toString().trim() !== "")
          .map(row => ({
            sede: row[0],
            equipo: row[1],
            carro: row[2],
            placa: row[3],
            serial: row[4]
          }));

        Logger.log("✅ Equipos encontrados: " + equipos.length);
        return jsonResponse(equipos);

      } catch (err) {
        Logger.log("❌ Error en getEquipos: " + err.toString());
        return jsonResponse({ error: err.toString() });
      }
    }

    if (action === 'getEquiposBodega' && sede) {
      try {
        return jsonResponse(getEquiposBodegaHandler(sede));
      } catch (err) {
        Logger.log("Error getEquiposBodega: " + err);
        return jsonResponse({ status: "error", error: err.toString() });
      }
    }

    // ==============================
    // SOPORTE: OBTENER TODOS LOS REGISTROS
    // ==============================
    if (action === 'getAllRecords') {
      try {
        const permisoAllRecords = requireSoporteAutorizado_(e.parameter.correo || "", e.parameter.sede || "");
        if (!permisoAllRecords.ok) {
          return jsonResponse({ status: "error", error: permisoAllRecords.error });
        }
        const sedeAutorizadaAllRecords = normalizarTexto(permisoAllRecords.acceso.sede);

        const sheet = getMainSheet();
        const colMap = getColumnMap(sheet);
        const lastRow = sheet.getLastRow();
        const lastCol = sheet.getLastColumn();

        if (lastRow <= 1) {
          return jsonResponse([]);
        }

        const rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

        const registros = rows
          .map(row => getRowDataObject(row, colMap))
          .filter(r => normalizarTexto(r.sede || "") === sedeAutorizadaAllRecords)
          .map((r, index) => {
            const actaRecepcion = r.acta || buscarActaRecepcionRelacionada(r);
            return {
              id: index + 1,
              id_solicitud: r.id_solicitud || "",
              fecha: formatearFechaSheet(r.fecha),
              nombre: r.nombre || "",
              cedula: r.cedula || "",
              correo: r.correo || "",
              curso: r.curso || "",
              sede: r.sede || "",
              equipo: r.equipo || "",
              tipo_usuario: r.tipo_usuario || "Docente",
              vehiculo_principal: r.vehiculo_principal || r.equipo || "",
              vehiculos_adicionales: r.vehiculos_adicionales || "",
              vehiculos_solicitados: r.vehiculos_solicitados || "",
              cantidad: r.cantidad || "",
              cargador: r.cargador || "",
              novedad: r.novedad || "No",
              descripcion: r.descripcion || "",
              foto_dano: r.foto_dano || "",
              hora_devolucion: formatearHoraSheet(r.hora_devolucion),
              hora_entrega: formatearHoraSheet(r.hora_entrega),
              estado: r.estado || "",
              fecha_devolucion: formatearFechaSheet(r.fecha_devolucion),
              hora_devolucion_real: formatearHoraSheet(r.hora_devolucion_real),
              cantidad_devuelta: r.cantidad_devuelta || "",
              estado_final: r.estado_final || "",
              novedad_devolucion: r.novedad_devolucion || "",
              descripcion_devolucion: r.descripcion_devolucion || "",
              acta: actaRecepcion,
              pdf_recepcion_url: actaRecepcion,
              pdf_resumen_url: r.pdf_resumen_url || "",
              equipo_adicional: r.equipo_adicional || "",
              serial_adicional: r.serial_adicional || "",
              estado_devolucion_usuario: r.estado_devolucion_usuario || "",
              fecha_notificacion_devolucion: formatearFechaSheet(r.fecha_notificacion_devolucion),
              hora_notificacion_devolucion: formatearHoraSheet(r.hora_notificacion_devolucion),
              observaciones_devolucion_usuario: r.observaciones_devolucion_usuario || ""
            };
          })
          .sort((a, b) => {
            const fechaA = new Date(a.fecha || 0);
            const fechaB = new Date(b.fecha || 0);
            return fechaB - fechaA;
          });

        return jsonResponse(registros);

      } catch (err) {
        return jsonResponse({ error: err.toString() });
      }
    }

    // ==============================
    // SOPORTE: DETALLE DE REGISTRO
    // ==============================
    if (action === 'getRegistroDetalle' && e.parameter.id) {
      try {
        const permisoDetalle = requireSoporteAutorizado_(e.parameter.correo || "", e.parameter.sede || "");
        if (!permisoDetalle.ok) {
          return jsonResponse({ error: permisoDetalle.error });
        }
        const sedeAutorizadaDetalle = normalizarTexto(permisoDetalle.acceso.sede);

        const sheet = getMainSheet();
        const colMap = getColumnMap(sheet);
        const lastRow = sheet.getLastRow();
        const lastCol = sheet.getLastColumn();

        if (lastRow <= 1) {
          return jsonResponse({ error: "No hay registros" });
        }

        const targetId = String(e.parameter.id).trim();
        const rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

        for (let row of rows) {
          const r = getRowDataObject(row, colMap);
          const rowId = String(r.id_solicitud || r.id || "").trim();

          if (rowId === targetId) {
            if (normalizarTexto(r.sede || "") !== sedeAutorizadaDetalle) {
              return jsonResponse({ error: "No autorizado para ver este registro" });
            }
            r.fecha = formatearFechaSheet(r.fecha);
            r.fecha_devolucion = formatearFechaSheet(r.fecha_devolucion);
            r.hora_entrega = formatearHoraSheet(r.hora_entrega);
            r.hora_devolucion = formatearHoraSheet(r.hora_devolucion);
            r.hora_devolucion_real = formatearHoraSheet(r.hora_devolucion_real);
            r.acta = r.acta || buscarActaRecepcionRelacionada(r);
            r.pdf_recepcion_url = r.acta || "";
            r.pdf_resumen_url = r.pdf_resumen_url || "";
            return jsonResponse(r);
          }
        }

        return jsonResponse({ error: "Registro no encontrado" });

      } catch (err) {
        return jsonResponse({ error: err.toString() });
      }
    }

    // ==============================
    // SOPORTE: ACTUALIZAR ESTADO
    // ==============================
    if (action === 'updateStatus' && e.parameter.id && e.parameter.estado) {
      try {
        const permisoUpdateStatus = requireSoporteAutorizado_(e.parameter.correo || "", e.parameter.sede || "");
        if (!permisoUpdateStatus.ok) {
          return jsonResponse({ status: "error", error: permisoUpdateStatus.error });
        }
        const sedeAutorizadaUpdate = normalizarTexto(permisoUpdateStatus.acceso.sede);

        const nuevoEstado = String(e.parameter.estado).trim().toUpperCase();
        if (["EN_CURSO", "CERRADO"].indexOf(nuevoEstado) === -1) {
          return jsonResponse({ status: "error", error: "Estado no válido" });
        }

        const sheet = getMainSheet();
        const colMap = getColumnMap(sheet);
        const lastRow = sheet.getLastRow();
        const lastCol = sheet.getLastColumn();

        if (lastRow <= 1) {
          return jsonResponse({ status: "error", error: "No hay registros" });
        }

        const targetId = String(e.parameter.id).trim();
        const rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

        let targetRowNumber = -1;
        let targetRowObj = null;

        for (let i = 0; i < rows.length; i++) {
          const r = getRowDataObject(rows[i], colMap);
          const rowId = String(r.id_solicitud || r.id || "").trim();

          if (rowId === targetId) {
            targetRowNumber = i + 2;
            targetRowObj = r;
            break;
          }
        }

        if (targetRowNumber === -1) {
          return jsonResponse({ status: "error", error: "No se encontró la solicitud" });
        }

        if (normalizarTexto(targetRowObj.sede || "") !== sedeAutorizadaUpdate) {
          return jsonResponse({ status: "error", error: "No autorizado para modificar este registro" });
        }

        if (colMap.estado) {
          sheet.getRange(targetRowNumber, colMap.estado).setValue(nuevoEstado);
        }

        Logger.log("Estado actualizado por " + e.parameter.correo + " — id: " + targetId + " -> " + nuevoEstado);
        return jsonResponse({ status: "ok", message: "Estado actualizado" });

      } catch (err) {
        return jsonResponse({ status: "error", error: err.toString() });
      }
    }

    // ==============================
    // CASO POR DEFECTO: TRAER REGISTROS GUARDADOS
    // ==============================
    try {
      const sheet = getMainSheet();
      const colMap = getColumnMap(sheet);
      const data = sheet.getDataRange().getValues();

      if (data.length <= 1) {
        return jsonResponse([]);
      }

      data.shift();

      const registros = data.map((row, index) => {
        const r = getRowDataObject(row, colMap);
        const actaRecepcion = r.acta || buscarActaRecepcionRelacionada(r);
        return Object.assign({ id: index + 1 }, r, {
          fecha: formatearFechaSheet(r.fecha),
          fecha_devolucion: formatearFechaSheet(r.fecha_devolucion),
          acta: actaRecepcion,
          pdf_recepcion_url: actaRecepcion,
          pdf_resumen_url: r.pdf_resumen_url || "",
          es_otros_equipos: r.es_otros_equipos || "No",
          hora_devolucion: formatearHoraSheet(r.hora_devolucion) || "15:00",
          hora_entrega: formatearHoraSheet(r.hora_entrega),
          hora_devolucion_real: formatearHoraSheet(r.hora_devolucion_real)
        });
      });

      return jsonResponse(registros);

    } catch (err) {
      return jsonResponse({ error: err.toString() });
    }

  } catch (err) {
    Logger.log("❌ ERROR doGet: " + err.toString());
    return jsonResponse({ error: err.toString() });
  }
}

// ============================================================
// HELPER: Crear respuesta JSON
// ============================================================
function jsonResponse(data) {
  if (JSONP_CALLBACK && /^[A-Za-z_$][0-9A-Za-z_$]*(\.[A-Za-z_$][0-9A-Za-z_$]*)*$/.test(JSONP_CALLBACK)) {
    return ContentService
      .createTextOutput(JSONP_CALLBACK + "(" + JSON.stringify(data) + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function buscarDatosPorCedulaHandler(cedula) {
  const cedulaBuscada = String(cedula || "").replace(/\D/g, "");
  if (!cedulaBuscada || cedulaBuscada.length < 6) {
    return { status: "error", error: "Cédula inválida" };
  }

  // Rate limit global: este endpoint no tiene sesión ni exige correo (es el
  // autocompletado de datos), así que sin límite se podría usar para
  // enumerar cédulas y sacar nombre/correo/sede de cualquier persona
  // registrada. Se limita el total de búsquedas por minuto en todo el
  // sistema — generoso para uso normal, impráctico para scraping masivo.
  const cache = CacheService.getScriptCache();
  const rlKey = "cedula_rl_" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMddHHmm");
  const conteo = Number(cache.get(rlKey) || 0);
  if (conteo >= 60) {
    return { status: "error", error: "Demasiadas búsquedas, intenta en un momento." };
  }
  cache.put(rlKey, String(conteo + 1), 70);

  const sheet = getMainSheet();
  const colMap = getColumnMap(sheet);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow <= 1 || !colMap.cedula) {
    return { status: "not_found" };
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  for (let i = rows.length - 1; i >= 0; i--) {
    const r = getRowDataObject(rows[i], colMap);
    const cedulaRegistro = String(r.cedula || "").replace(/\D/g, "");

    if (cedulaRegistro === cedulaBuscada) {
      return {
        status: "ok",
        data: {
          cedula: cedulaBuscada,
          nombre: r.nombre || "",
          curso: r.curso || "",
          correo: r.correo || "",
          sede: r.sede || "",
          tipo_usuario: r.tipo_usuario || ""
        }
      };
    }
  }

  return { status: "not_found" };
}

// ============================================================
// VALIDAR CORREO DE SOPORTE (desde hoja correos_sede)
// ============================================================


// ============================================================
// OBTENER SEDES DISPONIBLES
// ============================================================
function getEquiposHandler(sede, correo) {
  try {
    const permiso = validarAccesoSoporte(correo, sede);
    if (!permiso.ok) {
      return { error: permiso.error };
    }

    const ss = SpreadsheetApp.openById(SHEET_ID);

    const nombreHoja = "equipos_" + normalizarTexto(permiso.acceso.sedeOriginal || permiso.acceso.sede);
    const hoja = ss.getSheetByName(nombreHoja);

    if (!hoja) {
      return { error: "No existe la hoja de equipos: " + nombreHoja };
    }

    const data = hoja.getDataRange().getValues();
    if (data.length < 2) return [];

    const encabezados = data[0].map(h => normalizarTexto(h));

    const idxEquipo = encabezados.indexOf("equipo");
    const idxCarro = encabezados.indexOf("carro");
    const idxPlaca = encabezados.indexOf("placa");
    const idxSerial = encabezados.indexOf("serial");

    const salida = [];

    for (let i = 1; i < data.length; i++) {
      const fila = data[i];
      salida.push({
        equipo: idxEquipo > -1 ? fila[idxEquipo] : "",
        carro: idxCarro > -1 ? fila[idxCarro] : "",
        placa: idxPlaca > -1 ? fila[idxPlaca] : "",
        serial: idxSerial > -1 ? fila[idxSerial] : ""
      });
    }

    return salida;
  } catch (error) {
    return { error: error.message };
  }
}
// ============================================================
// doPost - REGISTRO Y CIERRE DE SOLICITUDES
// ============================================================
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    Logger.log("=== INICIO doPost ===");

    const rawPayload = e && e.parameter && e.parameter.payload
      ? e.parameter.payload
      : e.postData.contents;
    const data = JSON.parse(rawPayload);
    normalizarPayloadEquiposAdicionales_(data);
    Logger.log("Acción recibida: " + (data.action || "registro_normal"));

    // Si es cierre de solicitud
    if (data.action === "cerrarSolicitud") {
      return cerrarSolicitud(data);
    }

    if (data.action === "registrarDevolucionUsuario") {
      return registrarDevolucionUsuario(data);
    }

    // CRUD de equipos
    if (data.action === "addEquipo") {
      return agregarEquipo(data);
    }
    if (data.action === "updateEquipo") {
      return actualizarEquipo(data);
    }
    if (data.action === "deleteEquipo") {
      return eliminarEquipo(data);
    }

    if (!esCorreoInstitucional(data.correo)) {
      return jsonResponse({
        status: "error",
        error: "El correo del docente debe terminar en @innovaschools.edu.co"
      });
    }

    if (!validarTokenVerificacion(data.verify_token, data.correo)) {
      return jsonResponse({
        status: "error",
        error: "Tu correo no está verificado o la verificación expiró. Vuelve a verificar tu correo e intenta de nuevo."
      });
    }

    if (!String(data.curso || "").trim()) {
      return jsonResponse({
        status: "error",
        error: "Debe escribir el curso"
      });
    }

    const validacionVehiculosPrincipales = validarVehiculosPrincipalesDisponibles(data);
    if (!validacionVehiculosPrincipales.ok) {
      return jsonResponse({ status: "error", error: validacionVehiculosPrincipales.error, ocupado: true });
    }

    // === VALIDACIÓN DE DISPONIBILIDAD ===
    const textoEquipoAdicionalEntrada = obtenerTextoEquiposAdicionales(data);
    if (textoEquipoAdicionalEntrada) {
      const validacionBodega = validarEquiposAdicionalesDisponibles(data);
      if (!validacionBodega.ok) {
        return jsonResponse({ status: "error", error: validacionBodega.error });
      }
    }

    if (data.equipo && data.equipo !== "Otros equipos" && data.sede && data.hora_devolucion) {
      const sheetVal = getMainSheet();
      const registros = sheetVal.getDataRange().getValues();
      registros.shift();

      const fechaHoy = new Date().toISOString().split('T')[0];
      const zonaHoraria = Session.getScriptTimeZone();
      const horaActualStr = Utilities.formatDate(new Date(), zonaHoraria, "HH:mm");

      for (let row of registros) {
        if (row.length < 24) continue;

        let fechaRegistro = row[0];
        if (fechaRegistro instanceof Date) {
          fechaRegistro = Utilities.formatDate(fechaRegistro, zonaHoraria, "yyyy-MM-dd");
        } else {
          fechaRegistro = String(fechaRegistro).split('T')[0].split(' ')[0];
        }

        const sedeRegistrada = String(row[4] || "").trim();
        const equipoRegistrado = String(row[5] || "").trim();
        let horaDevolucionStr = "15:00";
        const horaRaw = row[23];
        if (horaRaw instanceof Date) {
          horaDevolucionStr = Utilities.formatDate(horaRaw, zonaHoraria, "HH:mm");
        } else if (horaRaw) {
          horaDevolucionStr = String(horaRaw).trim();
        }

        const estadoRegistro = String(row[25] || "").trim().toUpperCase();

        if (fechaRegistro === fechaHoy &&
            equipoRegistrado === data.equipo &&
            sedeRegistrada.toLowerCase() === data.sede.toLowerCase() &&
            estadoRegistro === "EN_CURSO") {

          if (horaActualStr < horaDevolucionStr) {
            return jsonResponse({
              status: "error",
              error: "El " + data.equipo + " está ocupado hasta las " + horaDevolucionStr + " por " + (row[1] || 'alguien'),
              ocupado: true,
              hora_devolucion: horaDevolucionStr
            });
          }
        }
      }
    }

    // === GUARDAR IMÁGENES ===
    let fotoDanoURL = "";
    try {
      if (data.foto_dano && String(data.foto_dano).startsWith("data:image")) {
        fotoDanoURL = guardarImagen(data.foto_dano, "dano", FOLDER_DANO);
        Logger.log("Foto daño guardada: " + fotoDanoURL);
      }
    } catch (imgError) {
      Logger.log("Error guardando foto daño: " + imgError);
    }

    const idSolicitud = Utilities.getUuid();
    const zonaHoraria = Session.getScriptTimeZone();
    const ahoraFecha = new Date();
    const horaEntrega = Utilities.formatDate(ahoraFecha, zonaHoraria, "HH:mm");
    const estadoInicial = "EN_CURSO";
    const firmaBase64 = data.firma || "";

    // === SEGUNDO CHEQUEO ANTI-RACE-CONDITION ===
    if (data.equipo && data.equipo !== "Otros equipos") {
      const sheetCheck = getMainSheet();
      const lastRowCheck = sheetCheck.getLastRow();
      if (lastRowCheck > 1) {
        const rows = sheetCheck.getRange(2, 1, lastRowCheck - 1, 26).getValues();
        const hoy = Utilities.formatDate(new Date(), zonaHoraria, "yyyy-MM-dd");
        const normalizar = (txt) => String(txt || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const vehiculosSolicitados = obtenerVehiculosPrincipalesPayload(data).map(normalizar);

        for (let row of rows) {
          let fechaReg = row[0];
          if (fechaReg instanceof Date) {
            fechaReg = Utilities.formatDate(fechaReg, zonaHoraria, "yyyy-MM-dd");
          } else {
            fechaReg = String(fechaReg).split("T")[0].split(" ")[0];
          }

          const est = String(row[25] || "").trim().toUpperCase();
          const eq = String(row[5] || "").trim();
          const sed = normalizar(row[4] || "");

          if (fechaReg === hoy && vehiculosSolicitados.indexOf(normalizar(eq)) !== -1 && sed === normalizar(data.sede || "") && est === "EN_CURSO") {
            return jsonResponse({
              status: "error",
              error: "El equipo acaba de ser reservado por otro usuario. Recarga la página.",
              ocupado: true
            });
          }
        }
      }
    }

    // === ANTI-DUPLICADO ===
    const cache = CacheService.getScriptCache();
    const key = (data.cedula || "") + "_" + (data.fecha || "");
    if (cache.get(key)) {
      return jsonResponse({ status: "error", error: "Registro duplicado detectado" });
    }
    cache.put(key, "1", 60);

    const sheet = getMainSheet();
    const lastRow = obtenerSiguienteFilaDatos_(sheet);
    limpiarCacheDisponibilidadSede(data.sede, data.fecha || Utilities.formatDate(new Date(), zonaHoraria, "yyyy-MM-dd"));

    Logger.log("Fila insertada en: " + lastRow);

    let colMapGuardado = null;
    try {
      colMapGuardado = getColumnMap(sheet);
      guardarCamposRecepcionPorEncabezado_(sheet, lastRow, colMapGuardado, {
        fecha: data.fecha || "",
        nombre: data.nombre || "",
        cedula: data.cedula || "",
        correo: data.correo || "",
        curso: data.curso || "",
        sede: data.sede || "",
        equipo: data.equipo || "",
        cantidad: data.cantidad || "",
        cargador: data.cargador || "",
        novedad: data.novedad || "No",
        descripcion: data.descripcion || "",
        foto_dano: fotoDanoURL,
        solicita_cambio: data.solicita_cambio || "",
        serial_cambio: data.serial_cambio || "",
        foto_cambio: data.foto_cambio || "",
        equipos_adicionales: data.equipos_adicionales || "No",
        serial_adicional: data.serial_adicional || "",
        observacion: data.observacion || "",
        firma: firmaBase64,
        serial_y_placa: data.serial_y_placa || "",
        detalle_equipos: data.detalle_equipos || "",
        es_otros_equipos: data.es_otros_equipos || "No",
        rango_inicio: data.rango_inicio || data.rango_ || "",
        rango_fin: data.rango_fin || "",
        hora_devolucion: data.hora_devolucion || "15:00",
        id_solicitud: idSolicitud,
        estado: estadoInicial,
        hora_entrega: horaEntrega,
        tipo_usuario: data.tipo_usuario || "Docente",
        vehiculo_principal: data.vehiculo_principal || data.equipo || "",
        vehiculos_adicionales: data.vehiculos_adicionales || "",
        vehiculos_solicitados: data.vehiculos_solicitados || (data.equipo ? JSON.stringify([data.equipo]) : "")
      });
      const textoEquiposAdicionales = obtenerTextoEquiposAdicionales(data);
      const adicionalesPlano = formatearEquiposAdicionalesPlano(textoEquiposAdicionales);
      const tieneAdicionales = Boolean(extraerEquiposAdicionales(textoEquiposAdicionales).length);

      if (tieneAdicionales) {
        const colEquiposAdicionales = asegurarColumnaPorClave(sheet, colMapGuardado, "equipos_adicionales", "equipos_adicionales");
        const colSerialAdicional = asegurarColumnaPorClave(sheet, colMapGuardado, "serial_adicional", "serial_adicional");
        const colDetalleEquipos = asegurarColumnaPorClave(sheet, colMapGuardado, "detalle_equipos", "detalle_equipos");

        sheet.getRange(lastRow, colEquiposAdicionales).setValue("Sí");
        sheet.getRange(lastRow, colSerialAdicional).setValue(data.serial_adicional || adicionalesPlano);
        sheet.getRange(lastRow, colDetalleEquipos).setValue(data.detalle_equipos || "");
      }

      const colEquipoAdicional = asegurarColumnaEquipoAdicional(sheet, colMapGuardado);
      Logger.log("Columna equipo_adicional: " + colEquipoAdicional);
      sheet.getRange(lastRow, colEquipoAdicional).setValue(data.equipo_adicional || adicionalesPlano || "");
    } catch (mapErr) {
      Logger.log("No se pudo guardar datos por encabezado: " + mapErr);
    }

    agregarDocumentoPendiente_("RECEPCION", idSolicitud);
    programarProcesamientoDocumentosAsync();

    Logger.log("=== FIN doPost OK === recepción registrada por " + (data.correo || "?") + " (cédula " + (data.cedula || "?") + ") — id: " + idSolicitud);
    return jsonResponse({
      status: "ok",
      id_solicitud: idSolicitud,
      message: "Registro guardado. El PDF y correos se procesarán en segundo plano."
    });

  } catch (err) {
    Logger.log("❌ ERROR CRÍTICO doPost: " + err.toString());
    Logger.log("Stack: " + err.stack);
    return jsonResponse({ status: "error", error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================
const MIME_IMAGEN_PERMITIDA = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp"
};
const MAX_BYTES_IMAGEN = 8 * 1024 * 1024; // 8 MB por imagen

function guardarImagen(base64, nombre, folderId) {
  const texto = String(base64 || "");
  const match = texto.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);

  // Solo se aceptan imágenes con encabezado data: reconocible; evita subir
  // archivos arbitrarios (HTML/JS/ejecutables) disfrazados de "foto" y
  // limita el tamaño para no agotar la cuota de Drive con un solo envío.
  let mimeType = "image/png";
  let base64Data;
  if (match && MIME_IMAGEN_PERMITIDA[match[1].toLowerCase()]) {
    mimeType = match[1].toLowerCase();
    base64Data = match[2];
  } else if (!texto.includes(",") && /^[A-Za-z0-9+/=\s]+$/.test(texto)) {
    // Compatibilidad con datos ya guardados que no traían el encabezado data:.
    base64Data = texto;
  } else {
    throw new Error("Formato de imagen no permitido");
  }

  const decoded = Utilities.base64Decode(base64Data);
  if (decoded.length > MAX_BYTES_IMAGEN) {
    throw new Error("La imagen supera el tamaño máximo permitido (8 MB)");
  }

  const extension = MIME_IMAGEN_PERMITIDA[mimeType] || "png";
  const nombreSeguro = String(nombre || "imagen").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);

  const folder = DriveApp.getFolderById(folderId);
  const blob = Utilities.newBlob(decoded, mimeType, nombreSeguro + "_" + Date.now() + "." + extension);
  const file = folder.createFile(blob);
  return file.getUrl();
}

function obtenerSiguienteFilaDatos_(sheet) {
  const ultimaFilaConDatos = Math.max(sheet.getLastRow(), 1);
  const siguienteFila = Math.max(ultimaFilaConDatos + 1, 2);

  if (siguienteFila > sheet.getMaxRows()) {
    sheet.insertRowsAfter(sheet.getMaxRows(), siguienteFila - sheet.getMaxRows());
  }

  return siguienteFila;
}

function programarProcesamientoDocumentosAsync() {
  try {
    const handler = "procesarDocumentosPendientesAsync";
    const existe = ScriptApp.getProjectTriggers()
      .some(trigger => trigger.getHandlerFunction && trigger.getHandlerFunction() === handler);

    if (!existe) {
      ScriptApp.newTrigger(handler)
        .timeBased()
        .after(60 * 1000)
        .create();
      Logger.log("Procesamiento de documentos programado.");
    }
  } catch (err) {
    Logger.log("No se pudo programar procesamiento de documentos: " + err);
  }
}

function leerDocumentosPendientes_() {
  try {
    const raw = PropertiesService.getScriptProperties().getProperty("DOCUMENTOS_PENDIENTES") || "[]";
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    Logger.log("No se pudo leer cola de documentos: " + err);
    return [];
  }
}

function guardarDocumentosPendientes_(pendientes) {
  PropertiesService.getScriptProperties().setProperty(
    "DOCUMENTOS_PENDIENTES",
    JSON.stringify(pendientes || [])
  );
}

function agregarDocumentoPendiente_(tipo, idSolicitud) {
  const tipoNormalizado = String(tipo || "").trim().toUpperCase();
  const idNormalizado = String(idSolicitud || "").trim();
  if (!tipoNormalizado || !idNormalizado) return;

  const pendientes = leerDocumentosPendientes_();
  const existe = pendientes.some(item =>
    String(item.tipo || "").toUpperCase() === tipoNormalizado &&
    String(item.id_solicitud || "").trim() === idNormalizado
  );
  if (!existe) {
    pendientes.push({ tipo: tipoNormalizado, id_solicitud: idNormalizado });
    guardarDocumentosPendientes_(pendientes);
  }
}

function quitarDocumentoPendiente_(tipo, idSolicitud) {
  const tipoNormalizado = String(tipo || "").trim().toUpperCase();
  const idNormalizado = String(idSolicitud || "").trim();
  const pendientes = leerDocumentosPendientes_().filter(item =>
    String(item.tipo || "").toUpperCase() !== tipoNormalizado ||
    String(item.id_solicitud || "").trim() !== idNormalizado
  );
  guardarDocumentosPendientes_(pendientes);
}

function procesarDocumentosPendientesAsync() {
  const handler = "procesarDocumentosPendientesAsync";
  try {
    procesarRecepcionesPendientes_(3);
    procesarDevolucionesPendientes_(3);
  } catch (err) {
    Logger.log("Error procesando documentos pendientes: " + err);
  } finally {
    try {
      ScriptApp.getProjectTriggers()
        .filter(trigger => trigger.getHandlerFunction && trigger.getHandlerFunction() === handler)
        .forEach(trigger => ScriptApp.deleteTrigger(trigger));
    } catch (triggerErr) {
      Logger.log("No se pudo limpiar trigger de documentos: " + triggerErr);
    }

    try {
      if (hayDocumentosPendientes_()) {
        programarProcesamientoDocumentosAsync();
      }
    } catch (pendErr) {
      Logger.log("No se pudo verificar documentos pendientes: " + pendErr);
    }
  }
}

function procesarRecepcionesPendientes_(limite) {
  const sheet = getMainSheet();
  const colMap = getColumnMap(sheet);
  if (!colMap.id_solicitud) return;

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1) return;

  const colActa = asegurarColumnaPorClave(sheet, colMap, "acta", "acta");
  const rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const pendientes = leerDocumentosPendientes_().filter(item => String(item.tipo || "").toUpperCase() === "RECEPCION");
  let procesados = 0;

  for (let p = 0; p < pendientes.length && procesados < limite; p++) {
    const idPendiente = String(pendientes[p].id_solicitud || "").trim();
    let rowNumber = -1;
    let r = null;

    for (let i = 0; i < rows.length; i++) {
      const fila = getRowDataObject(rows[i], colMap);
      if (String(fila.id_solicitud || "").trim() === idPendiente) {
        rowNumber = i + 2;
        r = fila;
        break;
      }
    }

    if (!r || rowNumber === -1) {
      quitarDocumentoPendiente_("RECEPCION", idPendiente);
      continue;
    }

    const datosPDF = construirDatosPdfRecepcionDesdeFila_(r);
    const pdfUrl = enviarPDFporCorreo(datosPDF);
    if (pdfUrl && pdfUrl.includes("drive.google.com")) {
      sheet.getRange(rowNumber, colActa).setValue(pdfUrl);
      Logger.log("PDF recepción guardado en fila " + rowNumber);
    } else {
      Logger.log("No se pudo generar/enviar PDF recepción en fila " + rowNumber + ". Queda pendiente.");
      continue;
    }

    if (normalizarSi(r.novedad) === "si" && (r.descripcion || r.foto_dano)) {
      try {
        const datosNovedad = Object.assign({}, r, {
          foto_dano: r.foto_dano || "",
          hora_entrega: r.hora_entrega || ""
        });
        enviarCorreoNovedad(datosNovedad);
      } catch (mailErr) {
        Logger.log("Error enviando novedad pendiente: " + mailErr);
      }
    }

    quitarDocumentoPendiente_("RECEPCION", idPendiente);
    procesados++;
  }
}

function procesarDevolucionesPendientes_(limite) {
  const sheet = getMainSheet();
  const colMap = getColumnMap(sheet);
  if (!colMap.id_solicitud) return;

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1) return;

  const rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const pendientes = leerDocumentosPendientes_().filter(item => String(item.tipo || "").toUpperCase() === "DEVOLUCION");
  let procesados = 0;

  for (let p = 0; p < pendientes.length && procesados < limite; p++) {
    const idPendiente = String(pendientes[p].id_solicitud || "").trim();
    let rowNumber = -1;
    let updatedObj = null;

    for (let i = 0; i < rows.length; i++) {
      const fila = getRowDataObject(rows[i], colMap);
      if (String(fila.id_solicitud || "").trim() === idPendiente) {
        rowNumber = i + 2;
        updatedObj = fila;
        break;
      }
    }

    if (!updatedObj || rowNumber === -1) {
      quitarDocumentoPendiente_("DEVOLUCION", idPendiente);
      continue;
    }

    updatedObj.acta = updatedObj.acta || buscarActaRecepcionRelacionada(updatedObj);
    const pdfResumenUrl = generarPdfResumenFinal(updatedObj);
    if (colMap.pdf_resumen_url) {
      sheet.getRange(rowNumber, colMap.pdf_resumen_url).setValue(pdfResumenUrl || "");
    }

    if (!pdfResumenUrl) {
      Logger.log("No se pudo generar/enviar PDF devolución en fila " + rowNumber + ". Queda pendiente.");
      continue;
    }

    quitarDocumentoPendiente_("DEVOLUCION", idPendiente);
    procesados++;
  }
}

function hayDocumentosPendientes_() {
  return leerDocumentosPendientes_().length > 0;
}

function construirDatosPdfRecepcionDesdeFila_(r) {
  const textoAdicional = obtenerTextoEquiposAdicionales(r);
  return {
    nombre: r.nombre || "",
    cedula: r.cedula || "",
    correo: r.correo || "",
    curso: r.curso || "",
    sede: r.sede || "",
    equipo: r.equipo || "",
    tipo_usuario: r.tipo_usuario || "Docente",
    vehiculo_principal: r.vehiculo_principal || r.equipo || "",
    vehiculos_adicionales: r.vehiculos_adicionales || "",
    vehiculos_solicitados: r.vehiculos_solicitados || "",
    cantidad: r.cantidad || "",
    cargador: r.cargador || "",
    novedad: r.novedad || "No",
    descripcion: r.descripcion || "",
    foto_dano: r.foto_dano || "",
    observacion: r.observacion || "",
    firma: r.firma || "",
    detalle_equipos: r.detalle_equipos || "",
    fecha: r.fecha || "",
    solicita_cambio: r.solicita_cambio || "No",
    serial_cambio: r.serial_cambio || "",
    foto_cambio: r.foto_cambio || "",
    equipos_adicionales: extraerEquiposAdicionales(textoAdicional).length ? "Sí" : (r.equipos_adicionales || "No"),
    serial_adicional: r.serial_adicional || "",
    equipo_adicional: r.equipo_adicional || r.serial_adicional || textoAdicional || ""
  };
}

function esFirmaSiAutoriza(valor) {
  return String(valor || "").trim().toUpperCase() === "SI AUTORIZO";
}

function enviarPDFporCorreo(data) {
  try {
    Logger.log("=== INICIANDO PDF para: " + (data.nombre || "Sin nombre"));

    if (!data.nombre || !data.cedula) {
      Logger.log("ERROR: Faltan datos mínimos");
      return "";
    }

    const procesarImagen = (imgData) => {
      try {
        if (!imgData) return null;
        const str = String(imgData);
        if (str.startsWith('data:image')) return str;
        if (str.includes('drive.google.com')) return obtenerImagenBase64(str);
        return null;
      } catch (e) {
        Logger.log("Error procesando imagen: " + e);
        return null;
      }
    };

    Logger.log("Procesando imágenes...");
    const fotoDanoBase64 = procesarImagen(data.foto_dano);
    const fotoCambioBase64 = procesarImagen(data.foto_cambio);
    const firmaBase64 = procesarImagen(data.firma);
    const firmaSiAutoriza = esFirmaSiAutoriza(data.firma);

    Logger.log("Estado imágenes - Daño:" + (fotoDanoBase64 ? "OK" : "NO") +
                " Cambio:" + (fotoCambioBase64 ? "OK" : "NO") +
                " Firma:" + (firmaBase64 ? "OK" : "NO"));

    const safe = (str) => String(str || "").replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    const firmaAutorizacionHtml = `<p><strong>Firma: S&iacute; autorizo</strong></p>
                      <p><strong>Autorizado por:</strong> ${safe(data.nombre)}</p>
                      <p><strong>C.C.:</strong> ${safe(data.cedula)}</p>
                      <p><em>Confirmaci&oacute;n digital registrada por el usuario.</em></p>`;

    // Obtener logo
    const logoBase64 = getLogoBase64();
    const logoHtml = logoBase64 
      ? `<img src="${logoBase64}" style="max-width: 70px; max-height: 70px; margin-right: 15px;">` 
      : '';

    let htmlContent = `
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
            .header { display: flex; align-items: center; border-bottom: 3px solid #4ECDC4; padding-bottom: 12px; margin-bottom: 15px; }
            .header-text h1 { color: #FF6B6B; margin: 0; font-size: 18px; }
            .header-text p { color: #4ECDC4; margin: 2px 0 0 0; font-size: 13px; }
            h1 { color: #FF6B6B; font-size: 18px; }
            h2 { color: #4ECDC4; margin-top: 20px; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ccc; padding: 6px; text-align: left; font-size: 11px; }
            th { background-color: #f4f7fa; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 10px 0; }
            .info-item { background: #f9f9f9; padding: 8px; border-radius: 4px; }
            .label { font-weight: bold; color: #666; }
            .value { font-size: 1.1em; }
            .image-container { margin: 10px 0; page-break-inside: avoid; }
            .firma-box { border: 2px solid #333; padding: 10px; display: inline-block; margin: 10px 0; background: white; }
            img { max-width: 400px; height: auto; border: 1px solid #ddd; }
            .page-break { page-break-before: always; }
            .legal-text { text-align: justify; line-height: 1.5; margin: 15px 0; font-size: 11px;
                         border-top: 2px solid #FF6B6B; border-bottom: 2px solid #FF6B6B; padding: 15px; background: #fafafa; }
            .legal-title { color: #d32f2f; font-weight: bold; text-align: center; margin-bottom: 10px; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="header">
            ${logoHtml}
            <div class="header-text">
              <h1>Recepción de Equipos</h1>
              <p>${safe(data.sede)} — ${safe(data.fecha)}</p>
            </div>
          </div>
          <p><strong>Fecha:</strong> ${safe(data.fecha)}</p>
          <h2>Información general</h2>
          <div class="info-grid">
            <div class="info-item"><span class="label">Nombre:</span> <span class="value">${safe(data.nombre)}</span></div>
            <div class="info-item"><span class="label">Cédula:</span> <span class="value">${safe(data.cedula)}</span></div>
            <div class="info-item"><span class="label">Correo:</span> <span class="value">${safe(data.correo)}</span></div>
            <div class="info-item"><span class="label">Curso:</span> <span class="value">${safe(data.curso || "No registrado")}</span></div>
            <div class="info-item"><span class="label">Tipo de usuario:</span> <span class="value">${safe(data.tipo_usuario || "Docente")}</span></div>
            <div class="info-item"><span class="label">Sede:</span> <span class="value">${safe(data.sede || "")}</span></div>
            <div class="info-item"><span class="label">Cargador:</span> <span class="value">${safe(data.cargador)}</span></div>
          </div>
          <h2>Equipos recibidos</h2>
          <p><strong>Vehículo principal:</strong> ${safe(data.vehiculo_principal || data.equipo)} (${safe(data.cantidad)} unidades)</p>
    `;

    const vehiculosPdf = obtenerVehiculosPrincipalesRegistro(data);
    if (vehiculosPdf.length > 1) {
      htmlContent += `<p><strong>Todos los vehículos seleccionados:</strong> ${safe(vehiculosPdf.join(", "))}</p>`;
    }

    htmlContent += construirTablaDetalleEquiposHtml(obtenerDetalleEquiposPrincipales(data), safe);

    if (data.novedad === 'Sí') {
      htmlContent += `<h2 style="color: #FF6B6B;">Novedad reportada</h2>
                      <p><strong>Descripción:</strong> ${safe(data.descripcion)}</p>`;
      if (fotoDanoBase64) {
        htmlContent += `<div class="image-container"><p><strong>Foto del daño:</strong></p>
                        <img src="${fotoDanoBase64}"></div>`;
      }
    }

    if (data.solicita_cambio === 'Sí') {
      htmlContent += `<h2 style="color: #4ECDC4;">Cambio solicitado</h2>
                      <p><strong>Serial/Placa:</strong> ${safe(data.serial_cambio)}</p>`;
      if (fotoCambioBase64) {
        htmlContent += `<div class="image-container"><p><strong>Foto del cambio:</strong></p>
                        <img src="${fotoCambioBase64}"></div>`;
      }
    }

    if (data.equipos_adicionales === 'Sí') {
      htmlContent += `<h2 style="color: #FFD93D;">Equipos adicionales</h2>
                      <p><strong>Obs:</strong> ${safe(data.observacion)}</p>`;
    }

    htmlContent += construirTablaEquiposAdicionalesHtml(obtenerTextoEquiposAdicionales(data), safe);

    htmlContent += `<h2>Firma de responsabilidad</h2>`;
    if (firmaSiAutoriza) {
      htmlContent += firmaAutorizacionHtml;
    } else if (firmaBase64) {
      htmlContent += `<div class="image-container"><div class="firma-box">
                      <img src="${firmaBase64}" style="max-width: 300px; max-height: 100px;"></div></div>`;
    } else {
      htmlContent += `<p><em>No se registró firma digital.</em></p>`;
    }

    htmlContent += `
        <div class="page-break"></div>
        <div class="legal-text">
          <div class="legal-title">AUTORIZACIÓN DE DESCUENTOS</div>
          <p>Yo, <strong>${safe(data.nombre)}</strong> identificado con cédula No. <strong>${safe(data.cedula)}</strong> de Bogotá.
          En mi calidad de TRABAJADOR, autorizo expresamente a mi empleador, <strong>COLEGIOS COLOMBIANOS S.A.S.</strong>,
          para que descuente de mi Salario, primas, cesantías, auxilios legales y extralegales, bonificaciones,
          indemnizaciones y liquidaciones, el valor de los elementos entregados en fecha <strong>${safe(data.fecha)}</strong>
          en caso de pérdida, hurto o daños por descuido.</p>
          <div style="margin-top: 40px; text-align: center;">
            <p style="margin-bottom: 10px; font-weight: bold;">Firma del trabajador:</p>
            ${firmaSiAutoriza ?
              firmaAutorizacionHtml :
              firmaBase64 ?
              `<div class="firma-box"><img src="${firmaBase64}" style="max-width: 280px; max-height: 120px;"></div>` :
              '<div style="border-top: 1px solid #333; width: 300px; margin: 0 auto; padding-top: 50px;">Firma y huella</div>'}
            <p style="margin-top: 15px; font-size: 11px; font-weight: bold;">${safe(data.nombre)}<br>C.C. ${safe(data.cedula)}</p>
          </div>
        </div>
        <div style="margin-top: 30px; font-size: 9px; color: #666; text-align: center;">
          Documento generado: ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss")}
        </div>
        </body>
      </html>
    `;

    Logger.log("Creando archivo temporal...");
    const tempFile = DriveApp.createFile('temp_' + Date.now() + '.html', htmlContent, 'text/html');

    Logger.log("Convirtiendo a PDF...");
    const pdfBlob = tempFile.getAs('application/pdf').setName(`Acta_${safe(data.nombre)}_${safe(data.cedula)}_${safe(data.fecha)}.pdf`);

    Logger.log("Guardando en Drive...");
    const folder = getCarpetaSede(FOLDER_PDF, data.sede);
    const pdfFile = folder.createFile(pdfBlob);
    const pdfUrl = pdfFile.getUrl();
    Logger.log("PDF subido: " + pdfUrl);

    const destinatarios = [];
    agregarDestinatarioUnico(destinatarios, data.correo);
    buscarCorreosSoportePorSede(data.sede).forEach(correo => agregarDestinatarioUnico(destinatarios, correo));
    if (!destinatarios.length) {
      agregarDestinatarioUnico(destinatarios, SUPPORT_EMAIL);
    }

    Logger.log("Enviando correo a: " + destinatarios.join(", "));

    GmailApp.sendEmail(
      destinatarios.join(","),
      `RECEPCION | ${safe(data.nombre)} | ${safe(data.cedula)} | ${new Date().getTime()}`,
      `Adjunto PDF de recepción de equipos.\nVer en Drive: ${pdfUrl}`,
      {
        attachments: [pdfBlob],
        name: "Sistema de Recepción de Equipos",
        replyTo: SUPPORT_EMAIL
      }
    );

    Logger.log("Correo enviado exitosamente");
    tempFile.setTrashed(true);

    return pdfUrl;

  } catch (error) {
    Logger.log("❌ ERROR en enviarPDFporCorreo: " + error.toString());
    Logger.log("Stack: " + error.stack);
    return "";
  }
}

function obtenerImagenBase64(urlOrId) {
  try {
    let fileId = urlOrId;
    if (urlOrId.includes('drive.google.com')) {
      const match = urlOrId.match(/[-\w]{25,}/);
      if (match) fileId = match[0];
    }

    const file = DriveApp.getFileById(fileId);
    const blob = file.getBlob();
    const base64 = Utilities.base64Encode(blob.getBytes());
    const mimeType = blob.getContentType();
    return `data:${mimeType};base64,${base64}`;
  } catch (e) {
    console.error("Error obteniendo imagen: " + e.toString());
    return null;
  }
}

function formatearHoraSheet(valor) {
  if (!valor) return "";
  const zona = Session.getScriptTimeZone();
  if (valor instanceof Date) {
    return Utilities.formatDate(valor, zona, "HH:mm");
  }
  const texto = String(valor).trim();
  if (texto.includes("T")) {
    const fecha = new Date(texto);
    if (!isNaN(fecha.getTime())) {
      return Utilities.formatDate(fecha, zona, "HH:mm");
    }
  }
  if (/^\d{2}:\d{2}/.test(texto)) {
    return texto.slice(0, 5);
  }
  return texto;
}

function formatearFechaSheet(valor) {
  if (!valor) return "";
  const zona = Session.getScriptTimeZone();

  if (valor instanceof Date) {
    return Utilities.formatDate(valor, zona, "yyyy-MM-dd");
  }

  const texto = String(valor).trim();
  if (!texto) return "";

  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }

  const fecha = new Date(texto.replace(/\s*\(.*?\)\s*$/, ""));
  if (!isNaN(fecha.getTime())) {
    return Utilities.formatDate(fecha, zona, "yyyy-MM-dd");
  }

  return texto.replace(/\s*GMT[+-]\d{4}.*$/i, "");
}

function enviarCodigoVerificacion(email, code) {
  try {
    const asunto = "Código de verificación - Sistema de Equipos";
    const cuerpo = `
      <h2>Hola,</h2>
      <p>Tu código de verificación para el sistema de recepción de equipos es:</p>
      <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px;
                  font-weight: bold; letter-spacing: 10px; margin: 20px 0;
                  border-radius: 8px; border: 2px solid #4ECDC4;">
        ${code}
      </div>
      <p>Este código expira en 10 minutos.</p>
      <p style="color: #666; font-size: 12px;">Si no solicitaste este código, ignora este mensaje.</p>
    `;

    GmailApp.sendEmail(email, asunto, "Tu código es: " + code, {
      htmlBody: cuerpo,
      name: "Sistema de Equipos Innova",
      replyTo: SUPPORT_EMAIL
    });

    Logger.log("Código enviado a: " + email);
    return true;

  } catch (error) {
    Logger.log("Error enviando código: " + error.toString());
    return false;
  }
}

// ============================================================
// VERIFICACIÓN DE CORREO — AHORA SERVER-AUTHORITATIVE
// Antes el código lo generaba y lo comprobaba solo el navegador
// (verify.js), así que cualquiera podía marcar "verified = true"
// desde la consola sin haber recibido nunca el correo. Ahora el
// código se genera, se guarda y se valida aquí, y solo se entrega
// un token firmado (HMAC) tras una verificación real; doPost exige
// ese token para aceptar el registro de recepción.
// ============================================================
function generarYEnviarCodigoVerificacion(email, codigoSolicitado) {
  const correo = String(email || "").trim().toLowerCase();
  if (!esCorreoInstitucional(correo)) {
    return { status: "error", error: "Ingresa un correo institucional @innovaschools.edu.co válido" };
  }

  const cache = CacheService.getScriptCache();

  // Rate limit: máximo 5 envíos de código por correo cada 10 minutos.
  // Los correos de soporte (registrados en la hoja correos_sede) tienen un
  // tope más alto (no exención total: sin límite, un correo de soporte
  // podría pedir códigos sin fin y agotar la cuota de envío de MailApp o
  // saturar de correos a esa cuenta) porque el modal de soporte suele pedir
  // varios códigos seguidos en uso normal.
  const esCorreoSoporte = Boolean(buscarSedePorCorreo(correo));
  const maxEnvios = esCorreoSoporte ? 20 : 5;
  const rateLimitKey = "vrl_" + correo;
  const enviosPrevios = Number(cache.get(rateLimitKey) || 0);
  if (enviosPrevios >= maxEnvios) {
    return { status: "error", error: "Demasiadas solicitudes de código para este correo. Intenta de nuevo en unos minutos." };
  }
  cache.put(rateLimitKey, String(enviosPrevios + 1), 600);

  // Si el llamador (p.ej. el modal de Soporte) ya generó y muestra un código
  // de 6 dígitos, se usa ese mismo código para que el correo enviado
  // coincida con lo que el cliente espera validar. Si no, se genera aquí.
  const codigoLimpio = String(codigoSolicitado || "").trim();
  const codigo = /^\d{6}$/.test(codigoLimpio)
    ? codigoLimpio
    : String(Math.floor(100000 + Math.random() * 900000));
  const estado = { codigo: codigo, intentos: 0, creado: Date.now() };
  cache.put("vcode_" + correo, JSON.stringify(estado), 600); // 10 minutos

  const enviado = enviarCodigoVerificacion(correo, codigo);
  if (!enviado) {
    return { status: "error", error: "No se pudo enviar el código. Intenta nuevamente." };
  }
  return { status: "ok", message: "Código enviado" };
}

function confirmarCodigoVerificacion(email, code) {
  const correo = String(email || "").trim().toLowerCase();
  const codigoIngresado = String(code || "").trim();
  const cache = CacheService.getScriptCache();
  const key = "vcode_" + correo;
  const raw = cache.get(key);

  if (!raw) {
    return { status: "error", error: "El código expiró o no se ha solicitado. Pide uno nuevo." };
  }

  let estado;
  try {
    estado = JSON.parse(raw);
  } catch (err) {
    cache.remove(key);
    return { status: "error", error: "Código inválido, solicita uno nuevo." };
  }

  if (estado.intentos >= 3) {
    cache.remove(key);
    return { status: "error", error: "Demasiados intentos fallidos. Solicita un nuevo código." };
  }

  if (codigoIngresado !== estado.codigo) {
    estado.intentos++;
    cache.put(key, JSON.stringify(estado), 600);
    Logger.log("Intento de código incorrecto para " + correo + " (" + estado.intentos + "/3)");
    return {
      status: "error",
      error: "Código incorrecto.",
      intentosRestantes: 3 - estado.intentos
    };
  }

  cache.remove(key);
  Logger.log("Correo verificado correctamente: " + correo);
  return { status: "ok", token: generarTokenVerificacion(correo) };
}

function obtenerSecretoVerificacion_() {
  const props = PropertiesService.getScriptProperties();
  let secreto = props.getProperty("VERIFY_TOKEN_SECRET");
  if (!secreto) {
    secreto = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty("VERIFY_TOKEN_SECRET", secreto);
  }
  return secreto;
}

function generarTokenVerificacion(correo) {
  const secreto = obtenerSecretoVerificacion_();
  const expira = Date.now() + (45 * 60 * 1000); // 45 minutos para terminar y enviar el formulario
  const payload = String(correo).toLowerCase() + "|" + expira;
  const firma = Utilities.base64EncodeWebSafe(
    Utilities.computeHmacSha256Signature(payload, secreto)
  );
  return Utilities.base64EncodeWebSafe(payload) + "." + firma;
}

function validarTokenVerificacion(token, correoEsperado) {
  try {
    const partes = String(token || "").split(".");
    if (partes.length !== 2) return false;

    const payload = Utilities.newBlob(Utilities.base64DecodeWebSafe(partes[0])).getDataAsString();
    const separador = payload.lastIndexOf("|");
    if (separador === -1) return false;

    const correoToken = payload.substring(0, separador);
    const expira = Number(payload.substring(separador + 1));
    if (!expira || Date.now() > expira) return false;
    if (correoToken !== String(correoEsperado || "").trim().toLowerCase()) return false;

    const secreto = obtenerSecretoVerificacion_();
    const firmaEsperada = Utilities.base64EncodeWebSafe(
      Utilities.computeHmacSha256Signature(payload, secreto)
    );
    return firmaEsperada === partes[1];
  } catch (err) {
    return false;
  }
}

function getDisponibilidadSedeHandler(sede, fecha) {
  const sedeNormalizada = normalizarTexto(sede || "");
  const fechaConsulta = String(fecha || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd")).trim();
  const cache = CacheService.getScriptCache();
  const cacheKey = "disp_" + sedeNormalizada + "_" + fechaConsulta;
  const cached = cache.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  const result = {
    status: "ok",
    sede: sedeNormalizada,
    fecha: fechaConsulta,
    ocupados: {}
  };

  const sheet = getMainSheet();
  const colMap = getColumnMap(sheet);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow <= 1) {
    cache.put(cacheKey, JSON.stringify(result), 20);
    return result;
  }

  const zonaHoraria = Session.getScriptTimeZone();
  const rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  rows.forEach(row => {
    const r = getRowDataObject(row, colMap);
    let fechaRegistro = r.fecha || "";

    if (fechaRegistro instanceof Date) {
      fechaRegistro = Utilities.formatDate(fechaRegistro, zonaHoraria, "yyyy-MM-dd");
    } else {
      fechaRegistro = String(fechaRegistro).split("T")[0].split(" ")[0];
    }

    const vehiculos = obtenerVehiculosPrincipalesRegistro(r);
    const estado = String(r.estado || "").trim().toUpperCase();
    const sedeRegistro = normalizarTexto(r.sede || "");

    if (
      fechaRegistro === fechaConsulta &&
      sedeRegistro === sedeNormalizada &&
      estado === "EN_CURSO" &&
      vehiculos.length
    ) {
      vehiculos.forEach(equipo => {
        result.ocupados[equipo] = {
          usuario: r.nombre || "Usuario desconocido",
          hora_devolucion: formatearHoraSheet(r.hora_devolucion) || "15:00",
          id_solicitud: r.id_solicitud || "",
          tipo_usuario: r.tipo_usuario || "Docente"
        };
      });
    }
  });

  cache.put(cacheKey, JSON.stringify(result), 20);
  return result;
}

function limpiarCacheDisponibilidadSede(sede, fecha) {
  try {
    const sedeNormalizada = normalizarTexto(sede || "");
    const fechaCache = String(fecha || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd")).trim();
    CacheService.getScriptCache().remove("disp_" + sedeNormalizada + "_" + fechaCache);
  } catch (err) {
    Logger.log("No se pudo limpiar cache disponibilidad: " + err);
  }
}

function getCarrosDisponibles() {
  const sheet = getMainSheet();
  const colMap = getColumnMap(sheet);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow <= 1) return [];

  const zonaHoraria = Session.getScriptTimeZone();
  const fechaHoy = Utilities.formatDate(new Date(), zonaHoraria, "yyyy-MM-dd");
  const rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  const ocupados = [];

  rows.forEach(row => {
    const r = getRowDataObject(row, colMap);

    let fechaRegistro = r.fecha || "";
    if (fechaRegistro instanceof Date) {
      fechaRegistro = Utilities.formatDate(fechaRegistro, zonaHoraria, "yyyy-MM-dd");
    } else {
      fechaRegistro = String(fechaRegistro).split("T")[0].split(" ")[0];
    }

    const vehiculos = obtenerVehiculosPrincipalesRegistro(r);
    const estado = String(r.estado || "").trim().toUpperCase();

    if (fechaRegistro === fechaHoy && estado === "EN_CURSO" && vehiculos.length) {
      vehiculos.forEach(equipo => ocupados.push(equipo));
    }
  });

  return [...new Set(ocupados)];
}

function parseListaVehiculos(valor) {
  const texto = String(valor || "").trim();
  if (!texto) return [];
  try {
    const parsed = JSON.parse(texto);
    if (Array.isArray(parsed)) {
      return parsed.map(v => String(v || "").trim()).filter(Boolean);
    }
  } catch (err) {
    // Registros antiguos pueden venir como texto separado por comas o saltos.
  }
  return texto
    .split(/[\n,;|]+/)
    .map(v => String(v || "").replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
}

function obtenerVehiculosPrincipalesRegistro(r) {
  const vehiculos = [];
  parseListaVehiculos(r.vehiculos_solicitados).forEach(v => vehiculos.push(v));
  if (!vehiculos.length && r.vehiculo_principal) vehiculos.push(String(r.vehiculo_principal).trim());
  parseListaVehiculos(r.vehiculos_adicionales).forEach(v => vehiculos.push(v));
  if (!vehiculos.length && r.equipo) vehiculos.push(String(r.equipo).trim());

  const vistos = {};
  return vehiculos.filter(v => {
    const key = normalizarTexto(v);
    if (!key || vistos[key]) return false;
    vistos[key] = true;
    return true;
  });
}

function obtenerVehiculosPrincipalesPayload(data) {
  const base = {
    equipo: data.equipo || "",
    vehiculo_principal: data.vehiculo_principal || data.equipo || "",
    vehiculos_adicionales: data.vehiculos_adicionales || "",
    vehiculos_solicitados: data.vehiculos_solicitados || ""
  };
  return obtenerVehiculosPrincipalesRegistro(base);
}

function validarVehiculosPrincipalesDisponibles(data) {
  const vehiculos = obtenerVehiculosPrincipalesPayload(data);
  if (!vehiculos.length || String(data.es_otros_equipos || "").toLowerCase() === "sí") {
    return { ok: true };
  }

  const tipoUsuario = normalizarTexto(data.tipo_usuario || "Docente");
  if (tipoUsuario === "comercial" && (vehiculos.length < 2 || vehiculos.length > 5)) {
    return { ok: false, error: "Comercial debe solicitar entre 2 y 5 carros." };
  }

  const fecha = data.fecha || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const disponibilidad = getDisponibilidadSedeHandler(data.sede || "", fecha);
  const ocupados = disponibilidad.ocupados || {};

  for (let i = 0; i < vehiculos.length; i++) {
    const vehiculo = vehiculos[i];
    if (ocupados[vehiculo]) {
      return {
        ok: false,
        error: "El " + vehiculo + " no está disponible. Está reservado por " + (ocupados[vehiculo].usuario || "otro usuario") + "."
      };
    }
  }

  return { ok: true };
}

function normalizarSi(valor) {
  const texto = String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return (texto === "si" || texto === "true" || texto === "1") ? "si" : "no";
}

function buscarCorreoSoportePorSede(sede) {
  const correos = buscarCorreosSoportePorSede(sede);
  return correos[0] || SUPPORT_EMAIL;
}

function buscarCorreosSoportePorSede(sede) {
  try {
    const hoja = obtenerHojaCorreosSede();
    const data = hoja.getDataRange().getValues();
    if (data.length < 2) return [SUPPORT_EMAIL];

    const headers = data[0].map(h => normalizarTexto(h));
    const idxSede = headers.indexOf("sede");
    const idxCorreo = headers.indexOf("correo");
    if (idxSede === -1 || idxCorreo === -1) return [SUPPORT_EMAIL];

    const sedeBuscada = normalizarTexto(sede);
    const correos = [];
    for (let i = 1; i < data.length; i++) {
      if (normalizarTexto(data[i][idxSede]) === sedeBuscada) {
        const correo = String(data[i][idxCorreo] || "").trim().toLowerCase();
        if (correo && esCorreoInstitucional(correo) && correos.indexOf(correo) === -1) {
          correos.push(correo);
        }
      }
    }

    if (correos.length) return correos;
  } catch (err) {
    Logger.log("Error buscando correo soporte por sede: " + err);
  }
  return [SUPPORT_EMAIL];
}

function enviarCorreoNovedad(data) {
  const asunto = "Nueva novedad reportada en revisión de equipos - " + (data.sede || "Sede");
  const destinatarios = buscarCorreosSoportePorSede(data.sede);
  const zonaHoraria = Session.getScriptTimeZone();
  const fechaReporte = Utilities.formatDate(new Date(), zonaHoraria, "yyyy-MM-dd HH:mm:ss");

  let cuerpo = `
    <h2 style="color:#dc2626;">Nueva novedad reportada en revisión de equipos</h2>
    <p>Hola equipo de soporte,</p>
    <p>
      La persona <strong>${data.nombre || "No registrada"}</strong> ha reportado una novedad durante el proceso
      de revisión del estado de los equipos en la sede <strong>${data.sede || "No registrada"}</strong>.
    </p>
    <p><strong>Fecha y hora del reporte:</strong> ${fechaReporte}</p>
    <h3 style="color:#991b1b;">Mensaje reportado</h3>
    <p style="padding:12px; background:#fef2f2; border-left:4px solid #dc2626;">${data.descripcion || "Sin mensaje registrado"}</p>
    <p>Por favor revisar esta novedad lo antes posible.</p>
    <h3>Datos del registro</h3>
    <table style="border-collapse:collapse; width:100%; font-family:Arial;">
      <tr style="background:#f3f4f6;">
        <td style="padding:8px; border:1px solid #ddd;"><strong>Nombre:</strong></td>
        <td style="padding:8px; border:1px solid #ddd;">${data.nombre || ""}</td>
      </tr>
      <tr>
        <td style="padding:8px; border:1px solid #ddd;"><strong>Cédula:</strong></td>
        <td style="padding:8px; border:1px solid #ddd;">${data.cedula || ""}</td>
      </tr>
      <tr style="background:#f3f4f6;">
        <td style="padding:8px; border:1px solid #ddd;"><strong>Correo:</strong></td>
        <td style="padding:8px; border:1px solid #ddd;">${data.correo || ""}</td>
      </tr>
      <tr>
        <td style="padding:8px; border:1px solid #ddd;"><strong>Sede/colegio:</strong></td>
        <td style="padding:8px; border:1px solid #ddd;">${data.sede || ""}</td>
      </tr>
      <tr style="background:#f3f4f6;">
        <td style="padding:8px; border:1px solid #ddd;"><strong>Equipo:</strong></td>
        <td style="padding:8px; border:1px solid #ddd;">${data.equipo || ""}</td>
      </tr>
      <tr>
        <td style="padding:8px; border:1px solid #ddd;"><strong>ID solicitud:</strong></td>
        <td style="padding:8px; border:1px solid #ddd;">${data.id_solicitud || ""}</td>
      </tr>
      <tr>
        <td style="padding:8px; border:1px solid #ddd;"><strong>Cantidad:</strong></td>
        <td style="padding:8px; border:1px solid #ddd;">${data.cantidad || ""}</td>
      </tr>
      <tr style="background:#f3f4f6;">
        <td style="padding:8px; border:1px solid #ddd;"><strong>Cargador:</strong></td>
        <td style="padding:8px; border:1px solid #ddd;">${data.cargador || ""}</td>
      </tr>
      <tr>
        <td style="padding:8px; border:1px solid #ddd;"><strong>Fecha:</strong></td>
        <td style="padding:8px; border:1px solid #ddd;">${data.fecha || ""}</td>
      </tr>
      <tr style="background:#f3f4f6;">
        <td style="padding:8px; border:1px solid #ddd;"><strong>Hora entrega:</strong></td>
        <td style="padding:8px; border:1px solid #ddd;">${data.hora_entrega || ""}</td>
      </tr>
      <tr>
        <td style="padding:8px; border:1px solid #ddd;"><strong>Detalle equipos:</strong></td>
        <td style="padding:8px; border:1px solid #ddd; white-space:pre-line;">${data.detalle_equipos || data.serial_y_placa || ""}</td>
      </tr>
    </table>
  `;

  if (data.foto_dano) {
    cuerpo += `
      <h3>Evidencias adjuntas</h3>
      <p><a href="${data.foto_dano}" style="background:#dc2626; color:white; padding:10px 20px; text-decoration:none; border-radius:5px; display:inline-block; margin-top:10px;">VER FOTO DEL DAÑO</a></p>
    `;
  } else {
    cuerpo += `<h3>Evidencias adjuntas</h3><p>No se adjuntaron imágenes o archivos de evidencia.</p>`;
  }

  cuerpo += `<hr><p style="font-size:12px; color:#666;">Generado automáticamente por el sistema de recepción de equipos.</p>`;

  GmailApp.sendEmail(destinatarios.join(","), asunto, "", {
    htmlBody: cuerpo,
    name: "Alerta Novedades - Innova Schools",
    replyTo: SUPPORT_EMAIL
  });

  Logger.log("Correo de novedad enviado a: " + destinatarios);
}

// ============================================================
// DEVOLUCIÓN INFORMADA POR EL USUARIO (no libera el vehículo,
// solo notifica a soporte para que valide físicamente)
// ============================================================
function registrarDevolucionUsuario(data) {
  // doPost ya sostiene el LockService.getScriptLock() global antes de
  // despachar aquí (mismo patrón que cerrarSolicitud), no se vuelve a bloquear.
  try {
    const nombre = String(data.nombre || "").trim();
    const cedula = String(data.cedula || "").replace(/\D/g, "");
    const tipoUsuario = String(data.tipo_usuario || "").trim();
    const sede = String(data.sede || "").trim();
    const vehiculosDevueltos = parseListaVehiculos(data.vehiculos_devueltos);
    const observaciones = String(data.observaciones || "").trim();
    const adicionalesDevueltos = String(data.adicionales_devueltos || "No").trim() === "Sí" ? "Sí" : "No";
    const detalleAdicionales = String(data.detalle_adicionales || "").trim();
    const observacionesConAdicionales = observaciones +
      (observaciones ? "\n\n" : "") +
      "Equipos adicionales BODEGA TI devueltos: " + adicionalesDevueltos +
      (adicionalesDevueltos === "Sí" && detalleAdicionales ? " - " + detalleAdicionales : "");

    if (!nombre || !cedula || !tipoUsuario || !sede || !vehiculosDevueltos.length) {
      return jsonResponse({ status: "error", error: "Completa nombre, cédula, tipo de usuario, sede y al menos un vehículo." });
    }

    let fotosBase64 = [];
    try {
      const parsedFotos = JSON.parse(data.fotos_devolucion || "[]");
      if (Array.isArray(parsedFotos)) fotosBase64 = parsedFotos;
    } catch (err) {
      fotosBase64 = [];
    }
    const fotosDevolucionUrls = [];
    fotosBase64.slice(0, 5).forEach((foto, idx) => {
      if (!String(foto || "").startsWith("data:image")) return;
      try {
        fotosDevolucionUrls.push(guardarImagen(foto, "devolucion_usuario_" + cedula + "_" + idx, FOLDER_FOTO_DEVOLUCION));
      } catch (imgErr) {
        Logger.log("Error guardando foto de devolución de usuario: " + imgErr);
      }
    });

    const zonaHoraria = Session.getScriptTimeZone();
    const ahora = new Date();
    const fechaNotificacion = Utilities.formatDate(ahora, zonaHoraria, "yyyy-MM-dd");
    const horaNotificacion = Utilities.formatDate(ahora, zonaHoraria, "HH:mm");

    let filasNotificadas = 0;
    try {
      const sheet = getMainSheet();
      const colMap = getColumnMap(sheet);
      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn();
      const sedeBuscada = normalizarTexto(sede);
      const vehiculosBuscados = vehiculosDevueltos.map(normalizarTexto);

      if (lastRow > 1) {
        const rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
        for (let i = 0; i < rows.length; i++) {
          const rowObj = getRowDataObject(rows[i], colMap);
          if (String(rowObj.estado || "").trim().toUpperCase() !== "EN_CURSO") continue;
          if (String(rowObj.cedula || "").replace(/\D/g, "") !== cedula) continue;
          if (normalizarTexto(rowObj.sede || "") !== sedeBuscada) continue;

          const vehiculosFila = obtenerVehiculosPrincipalesRegistro(rowObj).map(normalizarTexto);
          const coincide = vehiculosFila.some(v => vehiculosBuscados.indexOf(v) !== -1);
          if (!coincide) continue;

          guardarCamposRecepcionPorEncabezado_(sheet, i + 2, colMap, {
            estado_devolucion_usuario: "Notificado",
            fecha_notificacion_devolucion: fechaNotificacion,
            hora_notificacion_devolucion: horaNotificacion,
            observaciones_devolucion_usuario: observacionesConAdicionales,
            fotos_devolucion_usuario: fotosDevolucionUrls.length ? JSON.stringify(fotosDevolucionUrls) : ""
          });
          filasNotificadas++;
        }
        if (filasNotificadas) SpreadsheetApp.flush();
      }
    } catch (matchErr) {
      // No bloquea la notificación a soporte si no se pudo emparejar la fila.
      Logger.log("No se pudo marcar la solicitud para devolución de usuario: " + matchErr);
    }

    enviarCorreoDevolucionUsuario({
      nombre: nombre,
      cedula: cedula,
      tipo_usuario: tipoUsuario,
      sede: sede,
      vehiculos: vehiculosDevueltos,
      fecha: fechaNotificacion,
      hora: horaNotificacion,
      observaciones: observaciones,
      adicionales_devueltos: adicionalesDevueltos,
      detalle_adicionales: detalleAdicionales,
      fotos: fotosDevolucionUrls
    });

    Logger.log("Devolución notificada por usuario — cédula: " + cedula + " sede: " + sede + " filas marcadas: " + filasNotificadas);
    return jsonResponse({ status: "ok", filas_notificadas: filasNotificadas, fotos: fotosDevolucionUrls });
  } catch (err) {
    return jsonResponse({ status: "error", error: err.toString() });
  }
}

function enviarCorreoDevolucionUsuario(info) {
  const asunto = "Devolución pendiente de validar - " + (info.sede || "Sede") + " - " + (info.nombre || "Usuario");
  const destinatarios = buscarCorreosSoportePorSede(info.sede);

  const cuerpo = `
    <h2 style="color:#dc2626;">Devolución informada por el usuario</h2>
    <p>Hola equipo de soporte,</p>
    <p>
      <strong>${info.nombre || "No registrado"}</strong> informó que terminó de usar el/los vehículo(s)
      indicados abajo en la sede <strong>${info.sede || "No registrada"}</strong>.
    </p>
    <p style="padding:12px; background:#fef2f2; border-left:4px solid #dc2626;">
      Este aviso <strong>no libera automáticamente</strong> el vehículo. Soporte debe validar
      físicamente la devolución y cerrar la solicitud desde el módulo de devoluciones.
    </p>
    <table style="border-collapse:collapse; width:100%; font-family:Arial;">
      <tr style="background:#f3f4f6;">
        <td style="padding:8px; border:1px solid #ddd;"><strong>Nombre:</strong></td>
        <td style="padding:8px; border:1px solid #ddd;">${info.nombre || ""}</td>
      </tr>
      <tr>
        <td style="padding:8px; border:1px solid #ddd;"><strong>Cédula:</strong></td>
        <td style="padding:8px; border:1px solid #ddd;">${info.cedula || ""}</td>
      </tr>
      <tr style="background:#f3f4f6;">
        <td style="padding:8px; border:1px solid #ddd;"><strong>Tipo de usuario:</strong></td>
        <td style="padding:8px; border:1px solid #ddd;">${info.tipo_usuario || ""}</td>
      </tr>
      <tr>
        <td style="padding:8px; border:1px solid #ddd;"><strong>Sede:</strong></td>
        <td style="padding:8px; border:1px solid #ddd;">${info.sede || ""}</td>
      </tr>
      <tr style="background:#f3f4f6;">
        <td style="padding:8px; border:1px solid #ddd;"><strong>Vehículo(s):</strong></td>
        <td style="padding:8px; border:1px solid #ddd;">${(info.vehiculos || []).join(", ")}</td>
      </tr>
      <tr>
        <td style="padding:8px; border:1px solid #ddd;"><strong>Fecha:</strong></td>
        <td style="padding:8px; border:1px solid #ddd;">${info.fecha || ""}</td>
      </tr>
      <tr style="background:#f3f4f6;">
        <td style="padding:8px; border:1px solid #ddd;"><strong>Hora:</strong></td>
        <td style="padding:8px; border:1px solid #ddd;">${info.hora || ""}</td>
      </tr>
      <tr>
        <td style="padding:8px; border:1px solid #ddd;"><strong>Equipos adicionales BODEGA TI:</strong></td>
        <td style="padding:8px; border:1px solid #ddd;">${info.adicionales_devueltos || "No"}${info.detalle_adicionales ? " - " + info.detalle_adicionales : ""}</td>
      </tr>
      <tr>
        <td style="padding:8px; border:1px solid #ddd;"><strong>Observaciones:</strong></td>
        <td style="padding:8px; border:1px solid #ddd; white-space:pre-line;">${info.observaciones || "Sin observaciones"}</td>
      </tr>
    </table>
  `;

  let cuerpoConFotos = cuerpo;
  if (info.fotos && info.fotos.length) {
    cuerpoConFotos += `<h3>Fotos adjuntadas por el usuario (${info.fotos.length})</h3><div>`;
    info.fotos.forEach((url, idx) => {
      cuerpoConFotos += `<p><a href="${url}" style="background:#dc2626; color:white; padding:8px 16px; text-decoration:none; border-radius:5px; display:inline-block; margin:4px 4px 4px 0;">Ver foto ${idx + 1}</a></p>`;
    });
    cuerpoConFotos += `</div>`;
  }
  cuerpoConFotos += `<hr><p style="font-size:12px; color:#666;">Generado automáticamente por el sistema de recepción de equipos.</p>`;

  GmailApp.sendEmail(destinatarios.join(","), asunto, "", {
    htmlBody: cuerpoConFotos,
    name: "Devoluciones - Innova Schools",
    replyTo: SUPPORT_EMAIL
  });

  Logger.log("Correo de devolución de usuario enviado a: " + destinatarios);
}

function getMainSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheets = ss.getSheets();
  const target = sheets.find(sheet => sheet.getSheetId() === MAIN_SHEET_GID);
  return target || sheets[0];
}

function getColumnMap(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  const normalizar = (txt) =>
    String(txt || "")
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const headersNorm = headers.map(h => normalizar(h));
  const map = {};

  function buscarColumnas(...aliases) {
    const aliasesNorm = aliases.map(a => normalizar(a));
    const cols = [];
    for (let i = 0; i < headersNorm.length; i++) {
      if (aliasesNorm.includes(headersNorm[i])) {
        cols.push(i + 1);
      }
    }
    return cols;
  }

  function buscarColumna(...aliases) {
    const cols = buscarColumnas(...aliases);
    return cols.length ? cols[0] : null;
  }

  map.fecha = buscarColumna("fecha");
  map.nombre = buscarColumna("nombre");
  map.cedula = buscarColumna("cedula");
  map.correo = buscarColumna("correo");
  map.curso = buscarColumna("curso");
  map.sede = buscarColumna("sede");
  map.equipo = buscarColumna("equipo");
  map.cantidad = buscarColumna("cantidad");
  map.cargador = buscarColumna("cargador");
  map.novedad = buscarColumna("novedad");
  map.descripcion = buscarColumna("descripcion");
  map.foto_dano = buscarColumna("foto_dano");
  map.solicita_cambio = buscarColumna("solicita_cambio");
  map.serial_cambio = buscarColumna("serial_cambio");
  map.foto_cambio = buscarColumna("foto_cambio");
  map.equipos_adicionales = buscarColumna("equipos_adicionales");
  map.cant_adicional = buscarColumna("cant_adicional");
  map.serial_adicional = buscarColumna("serial_adicional");
  map.observacion = buscarColumna("observacion");
  const columnasActa = buscarColumnas("acta");
  map.acta = columnasActa[0] || null;
  map.firma = columnasActa[1] || null;
  map.serial_y_placa = buscarColumna("serial y placa");
  map.detalle_equipos = buscarColumna("detalle_equipos");
  map.es_otros_equipos = buscarColumna("es_otros_equipos");
  map.rango_inicio = buscarColumna("rango_");
  map.rango_fin = buscarColumna("rango_fin");
  map.hora_devolucion = buscarColumna("hora_devolucion");
  map.id_solicitud = buscarColumna("id_solicitud");
  map.estado = buscarColumna("estado");
  map.hora_entrega = buscarColumna("hora_entrega");
  map.fecha_devolucion = buscarColumna("fecha_devolucion");
  map.hora_devolucion_real = buscarColumna("hora_devolucion_real");
  map.cantidad_devuelta = buscarColumna("cantidad_devuelta");
  map.estado_final = buscarColumna("estado_final");
  map.novedad_devolucion = buscarColumna("novedad_devolucion");
  map.descripcion_devolucion = buscarColumna("descripcion_devolucion");
  map.firma_devolucion = buscarColumna("firma_devolucion");
  map.pdf_resumen_url = buscarColumna("pdf_resumen_url", "pdf_devolucion_url", "pdf devolucion", "pdf devolución", "acta_devolucion", "acta devolución");
  map.foto_devolucion = buscarColumna("foto_devolucion");
  map.equipo_adicional = buscarColumna("equipo_adicional");
  map.tipo_usuario = buscarColumna("tipo_usuario", "tipo de usuario", "tipo_usuario_solicitud");
  map.vehiculo_principal = buscarColumna("vehiculo_principal", "vehículo principal", "vehiculo principal");
  map.vehiculos_adicionales = buscarColumna("vehiculos_adicionales", "vehículos adicionales", "vehiculos adicionales");
  map.vehiculos_solicitados = buscarColumna("vehiculos_solicitados", "vehículos solicitados", "vehiculos solicitados");
  map.estado_devolucion_usuario = buscarColumna("estado_devolucion_usuario", "estado devolución usuario");
  map.fecha_notificacion_devolucion = buscarColumna("fecha_notificacion_devolucion", "fecha notificacion devolucion");
  map.hora_notificacion_devolucion = buscarColumna("hora_notificacion_devolucion", "hora notificacion devolucion");
  map.observaciones_devolucion_usuario = buscarColumna("observaciones_devolucion_usuario", "observaciones devolucion usuario");
  map.fotos_devolucion_usuario = buscarColumna("fotos_devolucion_usuario", "fotos devolucion usuario");

  Logger.log("MAP COLUMNAS: " + JSON.stringify(map));
  return map;
}

function asegurarColumnaEquipoAdicional(sheet, colMap) {
  if (colMap && colMap.equipo_adicional) return colMap.equipo_adicional;
  const nuevaCol = sheet.getLastColumn() + 1;
  sheet.getRange(1, nuevaCol).setValue("equipo_adicional");
  if (colMap) colMap.equipo_adicional = nuevaCol;
      Logger.log("Se creó la columna equipo_adicional en la posición: " + nuevaCol);
  return nuevaCol;
}

function asegurarColumnaPorClave(sheet, colMap, key, header) {
  if (colMap && colMap[key]) return colMap[key];
  const nuevaCol = sheet.getLastColumn() + 1;
  sheet.getRange(1, nuevaCol).setValue(header || key);
  if (colMap) colMap[key] = nuevaCol;
  Logger.log("Se creó la columna " + (header || key) + " en la posición: " + nuevaCol);
  return nuevaCol;
}

function guardarCamposRecepcionPorEncabezado_(sheet, rowNumber, colMap, valores) {
  const headersPorKey = {
    fecha: "fecha",
    nombre: "nombre",
    cedula: "cedula",
    correo: "correo",
    curso: "curso",
    sede: "sede",
    equipo: "equipo",
    cantidad: "cantidad",
    cargador: "cargador",
    novedad: "novedad",
    descripcion: "descripcion",
    foto_dano: "foto_dano",
    solicita_cambio: "solicita_cambio",
    serial_cambio: "serial_cambio",
    foto_cambio: "foto_cambio",
    equipos_adicionales: "equipos_adicionales",
    serial_adicional: "serial_adicional",
    observacion: "observacion",
    firma: "acta",
    serial_y_placa: "serial y placa",
    detalle_equipos: "detalle_equipos",
    es_otros_equipos: "es_otros_equipos",
    rango_inicio: "rango_",
    rango_fin: "rango_fin",
    hora_devolucion: "hora_devolucion",
    id_solicitud: "id_solicitud",
    estado: "estado",
    hora_entrega: "hora_entrega",
    tipo_usuario: "tipo_usuario",
    vehiculo_principal: "vehiculo_principal",
    vehiculos_adicionales: "vehiculos_adicionales",
    vehiculos_solicitados: "vehiculos_solicitados",
    estado_devolucion_usuario: "estado_devolucion_usuario",
    fecha_notificacion_devolucion: "fecha_notificacion_devolucion",
    hora_notificacion_devolucion: "hora_notificacion_devolucion",
    observaciones_devolucion_usuario: "observaciones_devolucion_usuario",
    fotos_devolucion_usuario: "fotos_devolucion_usuario"
  };

  Object.keys(valores).forEach(key => {
    if (key === "firma") {
      if (colMap.firma) {
        sheet.getRange(rowNumber, colMap.firma).setValue(valores[key]);
      } else {
        Logger.log("No se encontró la segunda columna acta para guardar la firma.");
      }
      return;
    }

    const col = asegurarColumnaPorClave(sheet, colMap, key, headersPorKey[key] || key);
    sheet.getRange(rowNumber, col).setValue(valores[key]);
  });
}

function getRowDataObject(row, colMap) {
  const obj = {};
  Object.keys(colMap).forEach(key => {
    const col = colMap[key];
    obj[key] = col ? row[col - 1] : "";
  });
  obj.hora_devolucion = formatearHoraSheet(obj.hora_devolucion);
  obj.hora_entrega = formatearHoraSheet(obj.hora_entrega);
  obj.hora_devolucion_real = formatearHoraSheet(obj.hora_devolucion_real);
  obj.fecha = formatearFechaSheet(obj.fecha);
  obj.fecha_devolucion = formatearFechaSheet(obj.fecha_devolucion);
  return obj;
}

function esCorreoInstitucional(correo) {
  return /^[^\s@]+@innovaschools\.edu\.co$/i.test(String(correo || "").trim());
}

function agregarDestinatarioUnico(lista, correo) {
  const limpio = String(correo || "").trim().toLowerCase();
  if (limpio && esCorreoInstitucional(limpio) && lista.indexOf(limpio) === -1) {
    lista.push(limpio);
  }
}

function getEquiposBodegaHandler(sede) {
  const sedeLimpia = normalizarTexto(sede || "");
  const sheetName = "equipos_" + sedeLimpia;
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    return { status: "error", error: "No existe la hoja " + sheetName };
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0].map(h => normalizarTexto(h));
  const idx = (nombres, fallback) => {
    for (let i = 0; i < headers.length; i++) {
      if (nombres.indexOf(headers[i]) !== -1) return i;
    }
    return fallback;
  };

  const idxSede = idx(["sede", "colegio"], 0);
  const idxEquipo = idx(["equipo", "nombre", "tipo"], 1);
  const idxCarro = idx(["carro", "ubicacion", "ubicacion_actual"], 2);
  const idxPlaca = idx(["placa", "codigo", "activo", "serial y placa"], 3);
  const idxSerial = idx(["serial", "serie", "serial y placa"], 4);
  const idxEstado = idx(["estado", "status"], -1);
  const ocupados = getIdentificadoresOcupadosPorSede(sedeLimpia);
  Logger.log("Equipos adicionales ocupados: " + JSON.stringify(ocupados));

  const equiposDisponibles = data.slice(1)
    .filter(row => normalizarTexto(row[idxCarro] || "") === "bodega ti")
    .filter(row => row[idxSerial] || row[idxPlaca] || row[idxEquipo])
    .map((row, index) => {
      const estado = idxEstado >= 0 ? String(row[idxEstado] || "").trim() : "";
      let serial = String(row[idxSerial] || "").trim();
      let placa = String(row[idxPlaca] || "").trim();
      const combinado = idxSerial === idxPlaca ? String(row[idxSerial] || "").trim() : "";
      if (combinado) {
        const serialMatch = combinado.match(/serial[:\s-]*([a-z0-9-]+)/i);
        const placaMatch = combinado.match(/placa[:\s-]*([a-z0-9-]+)/i);
        serial = serialMatch ? serialMatch[1] : serial;
        placa = placaMatch ? placaMatch[1] : placa;
      }
      const id = serial || placa || String(index + 1);
      const activo = !estado || ["activo", "disponible", "ok", "listo"].indexOf(normalizarTexto(estado)) !== -1;
      const ocupado = ocupados[normalizarTexto(serial)] || ocupados[normalizarTexto(placa)];
      return {
        id: id,
        sede: row[idxSede] || sede,
        equipo: row[idxEquipo] || "Equipo",
        carro: row[idxCarro] || "BODEGA TI",
        placa: placa,
        serial: serial,
        estado: estado || (activo ? "Activo" : "No disponible"),
        disponible: Boolean(activo && !ocupado),
        motivo: ocupado ? "Ocupado" : (activo ? "Disponible" : "No activo")
      };
    });
  Logger.log("Equipos disponibles finales: " + JSON.stringify(equiposDisponibles));
  return equiposDisponibles;
}

function getIdentificadoresOcupadosPorSede(sedeNormalizada) {
  const ocupados = {};
  try {
    const sheet = getMainSheet();
    const colMap = getColumnMap(sheet);
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow <= 1) return ocupados;

    const rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    rows.forEach(row => {
      const r = getRowDataObject(row, colMap);
      if (normalizarTexto(r.sede || "") !== sedeNormalizada) return;

      const estadoFinalNormalizado = normalizarTexto(r.estado_final || "");
      const soloPendienteAdicional = estadoFinalNormalizado === "pendiente_adicional";
      const activaPrincipal = !soloPendienteAdicional && (
        String(r.estado || "").trim().toUpperCase() === "EN_CURSO" ||
        !r.estado_final ||
        !r.fecha_devolucion ||
        !r.hora_devolucion_real
      );

      if (activaPrincipal) {
        const textoPrincipal = [r.equipo, r.detalle_equipos].join(" ");
        String(textoPrincipal || "").split(/[\s,;|]+/).forEach(token => {
          const limpio = normalizarTexto(token).replace(/[^a-z0-9-]/g, "");
          if (limpio && limpio.length >= 3) ocupados[limpio] = true;
        });
      }

      const filaConAdicionalActivo = String(r.estado || "").trim().toUpperCase() === "EN_CURSO" ||
        soloPendienteAdicional ||
        !r.fecha_devolucion ||
        !r.hora_devolucion_real;

      extraerEquiposAdicionales(obtenerTextoEquiposAdicionales(r)).forEach(eq => {
        if (!filaConAdicionalActivo || eq.devuelto === true) return;
        const serial = normalizarTexto(eq.serial || "");
        const placa = normalizarTexto(eq.placa || "");
        if (serial) ocupados[serial] = true;
        if (placa) ocupados[placa] = true;
      });
    });
  } catch (err) {
    Logger.log("Error calculando ocupados bodega: " + err);
  }
  return ocupados;
}

function validarEquiposAdicionalesDisponibles(data) {
  try {
    const adicionales = extraerEquiposAdicionales(obtenerTextoEquiposAdicionales(data));
    const seleccion = adicionales.map(eq => normalizarTexto(eq.serial || eq.placa || "")).filter(Boolean);

    if (!seleccion.length) {
      return { ok: false, error: "Debes seleccionar al menos un equipo adicional de BODEGA TI" };
    }

    if (new Set(seleccion).size !== seleccion.length) {
      return { ok: false, error: "Hay equipos adicionales duplicados en la selección" };
    }

    const disponibles = {};
    getEquiposBodegaHandler(data.sede || "").forEach(eq => {
      if (eq.disponible) {
        disponibles[normalizarTexto(eq.serial || "")] = true;
        disponibles[normalizarTexto(eq.placa || "")] = true;
      }
    });

    const noDisponibles = seleccion.filter(id => !disponibles[id]);
    if (noDisponibles.length) {
      return { ok: false, error: "Uno o más equipos adicionales ya no están disponibles. Actualiza BODEGA TI." };
    }

    return { ok: true };
  } catch (err) {
    Logger.log("Error validando equipos adicionales: " + err);
    return { ok: false, error: "No se pudo validar la disponibilidad de equipos adicionales" };
  }
}

function extraerEquiposAdicionales(texto) {
  const raw = String(texto || "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(eq => ({
        nombre: eq.equipo || eq.nombre || "Equipo adicional",
        cantidad: Number(eq.cantidad || 1),
        placa: String(eq.placa || ""),
        serial: String(eq.serial || ""),
        estado: String(eq.estado || ""),
        sede: String(eq.sede || ""),
        responsable: String(eq.responsable || ""),
        devuelto: eq.devuelto === true,
        fecha_devolucion: String(eq.fecha_devolucion || ""),
        hora_devolucion: String(eq.hora_devolucion || ""),
        observacion: String(eq.observacion || ""),
        raw: JSON.stringify(eq)
      })).filter(eq => eq.placa || eq.serial || eq.nombre);
    }
  } catch (err) {
    // Registros antiguos en texto plano.
  }

  return raw
    .split('\n')
    .filter(linea => /Adicional\s+\d+|BODEGA TI|Placa:|Serial:/i.test(linea))
    .map(linea => {
      const serialMatch = linea.match(/Serial:\s*([^\s-]+)/i);
      const placaMatch = linea.match(/Placa:\s*([^\s-]+)/i);
      const estadoMatch = linea.match(/Estado:\s*([^-]+)/i);
      const sedeMatch = linea.match(/Sede:\s*([^-]+)/i);
      const responsableMatch = linea.match(/Responsable:\s*(.+)$/i);
      const nombreMatch = linea.match(/Adicional\s+\d+\.\s*(.*?)\s*-\s*Placa:/i) ||
        linea.match(/Equipo:\s*(.*?)\s*-\s*Serial:/i);
      return {
        nombre: nombreMatch ? nombreMatch[1].trim() : "Equipo adicional",
        placa: placaMatch ? placaMatch[1].trim() : "",
        serial: serialMatch ? serialMatch[1].trim() : "",
        estado: estadoMatch ? estadoMatch[1].trim() : "",
        sede: sedeMatch ? sedeMatch[1].trim() : "",
        responsable: responsableMatch ? responsableMatch[1].trim() : "",
        cantidad: 1,
        devuelto: /devuelto:\s*(true|si|sí)/i.test(linea),
        fecha_devolucion: "",
        hora_devolucion: "",
        observacion: "",
        raw: linea
      };
    })
    .filter(eq => eq.placa || eq.serial || eq.raw);
}

function normalizarPayloadEquiposAdicionales_(data) {
  if (!data) return data;

  const candidatos = [
    data.equipo_adicional,
    data.serial_adicional,
    data.additionalEquipment,
    data.equiposAdicionales
  ].filter(valor => valor !== undefined && valor !== null && String(valor).trim() !== "");

  let adicionales = [];
  for (let i = 0; i < candidatos.length && !adicionales.length; i++) {
    const valor = candidatos[i];
    if (Array.isArray(valor)) {
      adicionales = valor.map(eq => ({
        nombre: eq.equipo || eq.nombre || "Equipo adicional",
        cantidad: Number(eq.cantidad || 1),
        placa: String(eq.placa || ""),
        serial: String(eq.serial || ""),
        estado: String(eq.estado || ""),
        sede: String(eq.sede || data.sede || ""),
        responsable: String(eq.responsable || data.nombre || ""),
        devuelto: eq.devuelto === true,
        fecha_devolucion: String(eq.fecha_devolucion || ""),
        hora_devolucion: String(eq.hora_devolucion || ""),
        observacion: String(eq.observacion || "")
      })).filter(eq => eq.placa || eq.serial || eq.nombre);
    } else {
      adicionales = extraerEquiposAdicionales(valor);
    }
  }

  if (!adicionales.length) {
    data.equipos_adicionales = normalizarSi(data.equipos_adicionales) === "si" ? "Sí" : "No";
    data.serial_adicional = data.serial_adicional || "";
    data.equipo_adicional = data.equipo_adicional || "";
    return data;
  }

  const adicionalesNormalizados = adicionales.map(eq => ({
    equipo: eq.equipo || eq.nombre || "Equipo adicional",
    cantidad: Number(eq.cantidad || 1),
    placa: String(eq.placa || ""),
    serial: String(eq.serial || ""),
    estado: String(eq.estado || "Activo"),
    sede: String(eq.sede || data.sede || ""),
    responsable: String(eq.responsable || data.nombre || ""),
    devuelto: eq.devuelto === true,
    fecha_devolucion: String(eq.fecha_devolucion || ""),
    hora_devolucion: String(eq.hora_devolucion || ""),
    observacion: String(eq.observacion || "")
  }));

  const detallePlano = adicionalesNormalizados.map((eq, idx) =>
    `Adicional ${idx + 1}. ${eq.equipo} - Cantidad: ${eq.cantidad} - Placa: ${eq.placa || "-"} - Serial: ${eq.serial || "-"} - Estado: ${eq.estado || "Activo"} - Sede: ${eq.sede || "-"} - Responsable: ${eq.responsable || "-"}`
  ).join("\n");

  data.equipos_adicionales = "Sí";
  data.serial_adicional = data.serial_adicional || detallePlano;
  data.equipo_adicional = JSON.stringify(adicionalesNormalizados);

  const detalleActual = String(data.detalle_equipos || "");
  if (detalleActual.indexOf("--- Equipos adicionales BODEGA TI ---") === -1) {
    data.detalle_equipos = [detalleActual, "--- Equipos adicionales BODEGA TI ---", detallePlano]
      .filter(Boolean)
      .join("\n");
  }

  Logger.log("Equipos adicionales normalizados: " + adicionalesNormalizados.length);
  return data;
}

function obtenerTextoEquiposAdicionales(data) {
  if (data.equipo_adicional) return data.equipo_adicional;
  if (data.serial_adicional) return data.serial_adicional;
  if (data.additionalEquipment) return data.additionalEquipment;
  if (data.equiposAdicionales) return data.equiposAdicionales;
  const detalle = String(data.detalle_equipos || "");
  if (detalle.indexOf("--- Equipos adicionales BODEGA TI ---") !== -1) {
    return detalle.split("--- Equipos adicionales BODEGA TI ---").pop();
  }
  return "";
}

function obtenerDetalleEquiposPrincipales(data) {
  const detalle = String(data.detalle_equipos || "");
  if (detalle.indexOf("--- Equipos adicionales BODEGA TI ---") !== -1) {
    return detalle.split("--- Equipos adicionales BODEGA TI ---")[0].trim();
  }
  return detalle.trim();
}

function construirTablaDetalleEquiposHtml(detalle, safeFn) {
  const texto = String(detalle || "").trim();
  if (!texto) return "";
  const safeLocal = safeFn || function(valor) { return String(valor || ""); };
  let html = `<table><thead><tr><th>#</th><th>Detalle equipos principales</th></tr></thead><tbody>`;
  texto.split('\n').forEach((linea, idx) => {
    if (linea.trim()) html += `<tr><td>${idx + 1}</td><td>${safeLocal(linea)}</td></tr>`;
  });
  html += `</tbody></table>`;
  return html;
}

function formatearEquiposAdicionalesPlano(texto) {
  const adicionales = extraerEquiposAdicionales(texto);
  if (!adicionales.length) return "";
  return adicionales.map((eq, idx) =>
    `${idx + 1}. Equipo: ${eq.nombre || "Equipo adicional"} - Serial: ${eq.serial || "-"} - Placa: ${eq.placa || "-"}`
  ).join("\n");
}

function normalizarEquipoAdicionalDevolucion(texto, fechaDev, horaDev) {
  const adicionales = extraerEquiposAdicionales(texto);
  if (!adicionales.length) return "";
  return formatearEquiposAdicionalesPlano(texto);
}

function tieneEquipoAdicionalPendiente(texto) {
  return extraerEquiposAdicionales(texto).some(eq => eq.devuelto !== true);
}

function construirTablaEquiposAdicionalesHtml(texto, safeFn) {
  const adicionales = extraerEquiposAdicionales(texto);
  if (!adicionales.length) return "";
  const safeLocal = safeFn || function(valor) { return String(valor || ""); };
  let html = `<h2 style="color:#0f766e;">Equipos adicionales BODEGA TI</h2>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Equipo</th>
          <th>Serial</th>
          <th>Placa</th>
        </tr>
      </thead>
      <tbody>`;
  adicionales.forEach((eq, idx) => {
    html += `<tr>
      <td>${idx + 1}</td>
      <td>${safeLocal(eq.nombre)}</td>
      <td>${safeLocal(eq.serial || "-")}</td>
      <td>${safeLocal(eq.placa || "-")}</td>
    </tr>`;
  });
  html += `</tbody></table>`;
  return html;
}

function getCarpetaSede(parentFolderId, sede) {
  const parent = DriveApp.getFolderById(parentFolderId);
  const nombreSede = String(sede || "General").trim() || "General";
  const nombre = "Sede - " + nombreSede;
  const existentes = parent.getFoldersByName(nombre);
  if (existentes.hasNext()) return existentes.next();
  return parent.createFolder(nombre);
}

function buscarActaRecepcionRelacionada(data) {
  try {
    if (data.acta) return data.acta;
    const sheet = getMainSheet();
    const colMap = getColumnMap(sheet);
    if (!colMap.acta) return "";

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow <= 1) return "";

    const objetivoId = String(data.id_solicitud || "").trim();
    const objetivoCorreo = normalizarTexto(data.correo || "");
    const objetivoSede = normalizarTexto(data.sede || "");
    const objetivoEquipo = normalizarTexto(data.equipo || "");
    const rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

    for (let i = 0; i < rows.length; i++) {
      const rowObj = getRowDataObject(rows[i], colMap);
      const mismaSolicitud = objetivoId && String(rowObj.id_solicitud || "").trim() === objetivoId;
      const mismaRelacion = objetivoCorreo &&
        normalizarTexto(rowObj.correo || "") === objetivoCorreo &&
        normalizarTexto(rowObj.sede || "") === objetivoSede &&
        normalizarTexto(rowObj.equipo || "") === objetivoEquipo;

      if ((mismaSolicitud || mismaRelacion) && rowObj.acta) {
        return rowObj.acta;
      }
    }
  } catch (err) {
    Logger.log("Error buscando acta relacionada: " + err);
  }
  return "";
}

// ============================================================
// CERRAR SOLICITUD
// ============================================================
function cerrarSolicitud(data) {
  try {
    const sheet = getMainSheet();
    const colMap = getColumnMap(sheet);

    if (!data.id_solicitud) {
      return jsonResponse({ status: "error", error: "Falta id_solicitud" });
    }

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    if (lastRow <= 1) {
      return jsonResponse({ status: "error", error: "No hay registros" });
    }

    const rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

    let targetRowNumber = -1;
    let targetRow = null;

    for (let i = 0; i < rows.length; i++) {
      const rowObj = getRowDataObject(rows[i], colMap);
      if (String(rowObj.id_solicitud || "").trim() === String(data.id_solicitud).trim()) {
        targetRowNumber = i + 2;
        targetRow = rowObj;
        break;
      }
    }

    if (targetRowNumber === -1) {
      return jsonResponse({ status: "error", error: "No se encontró la solicitud" });
    }

    if (String(targetRow.estado || "").trim().toUpperCase() === "CERRADO") {
      return jsonResponse({ status: "error", error: "La solicitud ya está cerrada" });
    }

    const correoSoporteEntrada = String(data.correo_soporte_devolucion || "").trim().toLowerCase();
    const permisoCierre = requireSoporteAutorizado_(correoSoporteEntrada, targetRow.sede || data.sede || "");
    if (!permisoCierre.ok) {
      return jsonResponse({ status: "error", error: "No autorizado para cerrar esta solicitud: " + permisoCierre.error });
    }
    const correoSoporteDevolucion = correoSoporteEntrada;

    const zonaHoraria = Session.getScriptTimeZone();
    const ahora = new Date();
    const fechaDevolucion = Utilities.formatDate(ahora, zonaHoraria, "yyyy-MM-dd");
    const horaDevolucionReal = Utilities.formatDate(ahora, zonaHoraria, "HH:mm");
    const textoEquipoAdicionalDevolucion = Object.prototype.hasOwnProperty.call(data, "equipo_adicional")
      ? data.equipo_adicional
      : (targetRow.equipo_adicional || targetRow.serial_adicional || "");
    const equipoAdicionalActualizado = normalizarEquipoAdicionalDevolucion(
      textoEquipoAdicionalDevolucion,
      fechaDevolucion,
      horaDevolucionReal
    );
    const hayEquipoAdicionalPendiente = false;
    const estadoFinalGuardado = hayEquipoAdicionalPendiente
      ? "PENDIENTE_ADICIONAL"
      : (data.estado_final || "");

    let fotoDevolucionURL = "";
    const novedadDev = String(data.novedad_devolucion || "").trim().toUpperCase();

    Logger.log("=== CIERRE SOLICITUD ===");
    Logger.log("ID solicitud: " + data.id_solicitud);
    Logger.log("Novedad devolución: " + data.novedad_devolucion);

    if (data.foto_devolucion &&
        String(data.foto_devolucion).startsWith("data:image")) {
      try {
        fotoDevolucionURL = guardarImagen(
          data.foto_devolucion,
          "devolucion_" + data.id_solicitud,
          FOLDER_FOTO_DEVOLUCION
        );
        Logger.log("Foto devolución guardada: " + fotoDevolucionURL);
      } catch (imgErr) {
        Logger.log("Error guardando foto devolución: " + imgErr);
      }
    }

    if (equipoAdicionalActualizado) {
      const colEquipoAdicional = asegurarColumnaEquipoAdicional(sheet, colMap);
      Logger.log("Columna equipo_adicional: " + colEquipoAdicional);
      sheet.getRange(targetRowNumber, colEquipoAdicional).setValue(equipoAdicionalActualizado);
    }

    if (colMap.fecha_devolucion) sheet.getRange(targetRowNumber, colMap.fecha_devolucion).setValue(fechaDevolucion);
    if (colMap.hora_devolucion_real) sheet.getRange(targetRowNumber, colMap.hora_devolucion_real).setValue(horaDevolucionReal);
    if (colMap.cantidad_devuelta) sheet.getRange(targetRowNumber, colMap.cantidad_devuelta).setValue(data.cantidad_devuelta || "");
    if (colMap.estado_final) sheet.getRange(targetRowNumber, colMap.estado_final).setValue(estadoFinalGuardado);
    if (colMap.novedad_devolucion) sheet.getRange(targetRowNumber, colMap.novedad_devolucion).setValue(data.novedad_devolucion || "No");
    if (colMap.descripcion_devolucion) sheet.getRange(targetRowNumber, colMap.descripcion_devolucion).setValue(data.descripcion_devolucion || "");
    if (colMap.firma_devolucion) sheet.getRange(targetRowNumber, colMap.firma_devolucion).setValue(data.firma_devolucion || "");
    if (colMap.foto_devolucion) sheet.getRange(targetRowNumber, colMap.foto_devolucion).setValue(fotoDevolucionURL);
    if (colMap.estado) sheet.getRange(targetRowNumber, colMap.estado).setValue(hayEquipoAdicionalPendiente ? "EN_CURSO" : "CERRADO");

    SpreadsheetApp.flush();
    limpiarCacheDisponibilidadSede(targetRow.sede || data.sede, targetRow.fecha || fechaDevolucion);

    const updatedRow = sheet.getRange(targetRowNumber, 1, 1, lastCol).getValues()[0];
    const updatedObj = getRowDataObject(updatedRow, colMap);
    updatedObj.correo_soporte_devolucion = correoSoporteDevolucion;
    updatedObj.acta = updatedObj.acta || buscarActaRecepcionRelacionada(updatedObj);
    updatedObj.equipo_adicional = equipoAdicionalActualizado || updatedObj.equipo_adicional || updatedObj.serial_adicional || "";
    updatedObj.estado_final = estadoFinalGuardado;
    updatedObj.foto_devolucion = fotoDevolucionURL || updatedObj.foto_devolucion || "";
    agregarDocumentoPendiente_("DEVOLUCION", data.id_solicitud);
    programarProcesamientoDocumentosAsync();

    Logger.log("Solicitud cerrada por " + correoSoporteDevolucion + " — id: " + data.id_solicitud);
    return jsonResponse({
      status: "ok",
      message: "Solicitud cerrada correctamente. El PDF final se procesará en segundo plano.",
      pdf_resumen_url: "",
      pdf_recepcion_url: updatedObj.acta || ""
    });

  } catch (err) {
    return jsonResponse({ status: "error", error: err.toString() });
  }
}

// ============================================================
// GENERAR PDF RESUMEN FINAL
// ============================================================
function generarPdfResumenFinal(data) {
  try {
    data.acta = data.acta || buscarActaRecepcionRelacionada(data);
    const folder = getCarpetaSede(FOLDER_PDF_DEVOLUCION, data.sede);

    const fechaEntrega = formatearFechaPdf(data.fecha || "");
    const horaEntrega = formatearHoraPdf(data.hora_entrega || "");
    const fechaDev = formatearFechaPdf(data.fecha_devolucion || "");
    const horaDev = formatearHoraPdf(data.hora_devolucion_real || "");
    const horaMax = formatearHoraPdf(data.hora_devolucion || "");

    const conclusion = construirConclusionAutomatica(data);
    const tiempoUso = calcularTiempoUsoTexto(
      normalizarFechaTexto(data.fecha || ""),
      formatearHoraPdf(data.hora_entrega || ""),
      normalizarFechaTexto(data.fecha_devolucion || ""),
      formatearHoraPdf(data.hora_devolucion_real || "")
    );

    const firmaEntregaSiAutoriza = esFirmaSiAutoriza(data.firma);
    const firmaDevolucionSiAutoriza = esFirmaSiAutoriza(data.firma_devolucion);
    const firmaEntrega = !firmaEntregaSiAutoriza && data.firma ? procesarImagenPdf(data.firma) : null;
    const firmaDevolucion = !firmaDevolucionSiAutoriza && data.firma_devolucion ? procesarImagenPdf(data.firma_devolucion) : null;
    const fotoDevolucion = data.foto_devolucion_base64 || (data.foto_devolucion ? procesarImagenPdf(data.foto_devolucion) : null);
    const firmaEntregaAutorizadaHtml = `Firma: S&iacute; autorizo<br><strong>Autorizado por:</strong> ${data.nombre || ""}<br><strong>C.C.:</strong> ${data.cedula || ""}<br><em>Confirmaci&oacute;n digital registrada por el usuario.</em>`;
    const firmaDevolucionAutorizadaHtml = `Firma devoluci&oacute;n soporte: S&iacute; autorizo<br><strong>Correo soporte:</strong> ${data.correo_soporte_devolucion || SUPPORT_EMAIL}<br><em>Confirmaci&oacute;n digital independiente registrada por soporte.</em>`;

    // Obtener logo
    const logoBase64 = getLogoBase64();
    const logoHtml = logoBase64 
      ? `<img src="${logoBase64}" style="max-width: 70px; max-height: 70px; margin-right: 15px;">` 
      : '';

    let html = `
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; margin: 25px; color: #222; }
          .header { display: flex; align-items: center; border-bottom: 3px solid #14b8a6; padding-bottom: 12px; margin-bottom: 15px; }
          .header-text h1 { color: #0f172a; margin: 0; font-size: 18px; }
          .header-text p { color: #0f766e; margin: 2px 0 0 0; font-size: 12px; }
          h1 { color: #0f172a; font-size: 18px; }
          h2 { color: #0f766e; margin-top: 22px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
          th { background: #f3f4f6; }
          .box { background: #f8fafc; border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; margin: 10px 0; }
          .firma { border: 1px solid #cbd5e1; padding: 10px; display: inline-block; background: white; }
          img.firma-img { max-width: 280px; max-height: 100px; }
          img.foto-evidencia { max-width: 400px; max-height: 300px; border: 1px solid #ddd; border-radius: 4px; }
          .ok { color: #15803d; font-weight: bold; }
          .warn { color: #b45309; font-weight: bold; }
          .bad { color: #b91c1c; font-weight: bold; }
          .novedad-box { background: #fef2f2; border: 1px solid #fca5a5; padding: 12px; border-radius: 8px; margin: 10px 0; }
          .novedad-title { color: #b91c1c; font-weight: bold; font-size: 13px; margin-bottom: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
            ${logoHtml}
            <div class="header-text">
              <h1>ACTA FINAL DE ENTREGA Y DEVOLUCIÓN</h1>
              <p>Sistema de Recepción de Equipos — Innova Schools</p>
            </div>
        </div>

        <h2>Datos generales</h2>
        <table>
          <tr><th>ID Solicitud</th><td>${data.id_solicitud || ""}</td></tr>
          <tr><th>Nombre</th><td>${data.nombre || ""}</td></tr>
          <tr><th>Cédula</th><td>${data.cedula || ""}</td></tr>
          <tr><th>Correo</th><td>${data.correo || ""}</td></tr>
          <tr><th>Curso</th><td>${data.curso || "No registrado"}</td></tr>
          <tr><th>Sede</th><td>${data.sede || ""}</td></tr>
          <tr><th>Tipo de usuario</th><td>${data.tipo_usuario || "Docente"}</td></tr>
          <tr><th>Vehículo principal</th><td>${data.vehiculo_principal || data.equipo || ""}</td></tr>
          <tr><th>Cantidad entregada</th><td>${data.cantidad || ""}</td></tr>
          <tr><th>Cantidad devuelta</th><td>${data.cantidad_devuelta || ""}</td></tr>
        </table>

        <h2>Datos de la entrega</h2>
        <table>
          <tr><th>Fecha entrega</th><td>${fechaEntrega}</td></tr>
          <tr><th>Hora entrega</th><td>${horaEntrega}</td></tr>
          <tr><th>Hora máxima pactada</th><td>${horaMax}</td></tr>
          <tr><th>Acta original</th><td>${data.acta ? '<a href="' + data.acta + '">Ver PDF de recepci&oacute;n</a>' : 'No registrada'}</td></tr>
        </table>

        <h2>Equipos principales solicitados</h2>
        ${(() => {
          const vehiculosResumen = obtenerVehiculosPrincipalesRegistro(data);
          return vehiculosResumen.length > 1
            ? '<p><strong>Vehículos adicionales:</strong> ' + vehiculosResumen.slice(1).join(", ") + '</p>'
              + '<p><strong>Todos los vehículos seleccionados:</strong> ' + vehiculosResumen.join(", ") + '</p>'
            : '';
        })()}
        ${construirTablaDetalleEquiposHtml(obtenerDetalleEquiposPrincipales(data))}

        ${construirTablaEquiposAdicionalesHtml(obtenerTextoEquiposAdicionales(data))}

        <h2>Datos de la devolución</h2>
        <table>
          <tr><th>Fecha devolución</th><td>${fechaDev}</td></tr>
          <tr><th>Hora devolución real</th><td>${horaDev}</td></tr>
          <tr><th>Estado final</th><td>${data.estado_final || ""}</td></tr>
          <tr><th>Novedad devolución</th><td>${data.novedad_devolucion || "No"}</td></tr>
          <tr><th>Descripción devolución</th><td>${data.descripcion_devolucion || "Sin novedad"}</td></tr>
        </table>

        <h2>Tiempo de uso</h2>
        <div class="box">${tiempoUso}</div>

        <h2>Conclusión automática</h2>
        <div class="box">${conclusion}</div>`;

    if (normalizarSi(data.novedad_devolucion) === "si") {
      html += `
        <h2 style="color: #b91c1c;">Novedad en la devolución</h2>
        <div class="novedad-box">
          <div class="novedad-title">NOVEDAD REPORTADA AL DEVOLVER</div>
          <p><strong>Descripción:</strong> ${data.descripcion_devolucion || "Sin descripción"}</p>`;

      if (fotoDevolucion) {
        html += `
          <p style="margin-top: 10px;"><strong>Evidencia fotográfica:</strong></p>
          <div style="margin-top: 8px;">
            <img class="foto-evidencia" src="${fotoDevolucion}">
          </div>
          <p style="margin-top: 6px; font-size: 10px; color: #666;">Ver en Drive: ${data.foto_devolucion || ""}</p>`;
      } else if (data.foto_devolucion && data.foto_devolucion.includes("drive.google.com")) {
        html += `<p style="margin-top: 10px;"><strong>Evidencia:</strong> <a href="${data.foto_devolucion}">Ver foto en Drive</a></p>`;
      } else {
        html += `<p style="margin-top: 10px; color: #b91c1c; font-style: italic;">No se adjuntó evidencia fotográfica.</p>`;
      }

      html += `</div>`;
    }

    html += `
        <h2>Firmas</h2>
        <table>
          <tr><th>Firma entrega</th><th>Firma devolución</th></tr>
          <tr>
            <td>${firmaEntregaSiAutoriza ? firmaEntregaAutorizadaHtml : firmaEntrega ? '<div class="firma"><img class="firma-img" src="' + firmaEntrega + '"></div>' : "Sin firma"}</td>
            <td>${firmaDevolucionSiAutoriza ? firmaDevolucionAutorizadaHtml : firmaDevolucion ? '<div class="firma"><img class="firma-img" src="' + firmaDevolucion + '"></div>' : "Sin firma"}</td>
          </tr>
        </table>

        <p style="margin-top:30px; font-size:10px; color:#666;">
          Documento generado automáticamente el ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss")}
        </p>
      </body>
      </html>`;

    const tempFile = DriveApp.createFile('temp_resumen_' + data.id_solicitud + '.html', html, MimeType.HTML);
    const pdfBlob = tempFile.getAs(MimeType.PDF).setName('Resumen_' + (data.nombre || 'Usuario') + '_' + (data.cedula || '') + '_' + data.id_solicitud + '.pdf');
    const pdfFile = folder.createFile(pdfBlob);
    const pdfUrl = pdfFile.getUrl();
    tempFile.setTrashed(true);

    const destinatarios = [];
    agregarDestinatarioUnico(destinatarios, data.correo);
    buscarCorreosSoportePorSede(data.sede).forEach(correo => agregarDestinatarioUnico(destinatarios, correo));
    if (!destinatarios.length) {
      agregarDestinatarioUnico(destinatarios, SUPPORT_EMAIL);
    }

    GmailApp.sendEmail(
      destinatarios.join(","),
      'Acta de devolucion | ' + (data.sede || "Sede") + ' | ' + (data.nombre || "Usuario"),
      'Se adjunta el PDF final de devolución.\n\nVer en Drive: ' + pdfUrl,
      {
        attachments: [pdfBlob],
        replyTo: SUPPORT_EMAIL,
        htmlBody: `
          <h2>Acta final de devolución</h2>
          <p><strong>Nombre:</strong> ${data.nombre || ""}</p>
          <p><strong>Curso:</strong> ${data.curso || "No registrado"}</p>
          <p><strong>Sede:</strong> ${data.sede || ""}</p>
          <p><strong>Tipo de usuario:</strong> ${data.tipo_usuario || "Docente"}</p>
          <p><strong>Vehículo(s):</strong> ${obtenerVehiculosPrincipalesRegistro(data).join(", ") || data.equipo || ""}</p>
          <p><strong>Cantidad devuelta:</strong> ${data.cantidad_devuelta || ""}</p>
          <p><strong>Estado final:</strong> ${data.estado_final || ""}</p>
          <p><strong>Fecha devolución:</strong> ${fechaDev}</p>
          <p><strong>Hora devolución:</strong> ${horaDev}</p>
          ${data.acta ? '<p><a href="' + data.acta + '">Abrir acta original de recepcion</a></p>' : ''}
          ${data.foto_devolucion ? '<p><a href="' + data.foto_devolucion + '">Ver foto de novedad</a></p>' : ''}
          <p><a href="${pdfUrl}">Ver acta final en Drive</a></p>
          <hr><p>Sistema de recepción de equipos</p>
        `
      }
    );

    return pdfUrl;

  } catch (err) {
    Logger.log("Error generando PDF final: " + err.toString());
    return "";
  }
}

function procesarImagenPdf(imgData) {
  if (!imgData) return null;
  if (String(imgData).startsWith("data:image")) return imgData;
  if (String(imgData).includes("drive.google.com")) return obtenerImagenBase64(imgData);
  return null;
}

function calcularTiempoUsoTexto(fechaEntrega, horaEntrega, fechaDev, horaDev) {
  try {
    const fechaEntregaLimpia = normalizarFechaTexto(fechaEntrega);
    const fechaDevLimpia = normalizarFechaTexto(fechaDev);
    const horaEntregaLimpia = formatearHoraPdf(horaEntrega);
    const horaDevLimpia = formatearHoraPdf(horaDev);

    if (!fechaEntregaLimpia || !horaEntregaLimpia || !fechaDevLimpia || !horaDevLimpia) {
      return "No fue posible calcular el tiempo de uso.";
    }

    const inicio = new Date(`${fechaEntregaLimpia}T${horaEntregaLimpia}:00`);
    const fin = new Date(`${fechaDevLimpia}T${horaDevLimpia}:00`);

    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      return "No fue posible calcular el tiempo de uso.";
    }

    const diffMs = fin.getTime() - inicio.getTime();

    if (diffMs < 0) {
      return "No fue posible calcular el tiempo de uso.";
    }

    const totalMin = Math.floor(diffMs / 60000);
    const horas = Math.floor(totalMin / 60);
    const minutos = totalMin % 60;

    return `Tiempo total aproximado de uso: ${horas} hora(s) y ${minutos} minuto(s).`;
  } catch (err) {
    return "No fue posible calcular el tiempo de uso.";
  }
}

function construirConclusionAutomatica(data) {
  const cantidad = Number(data.cantidad || 0);
  const devuelta = Number(data.cantidad_devuelta || 0);
  const estadoFinal = String(data.estado_final || "").toUpperCase();
  const novedad = String(data.novedad_devolucion || "No").toUpperCase();

  if (estadoFinal === "COMPLETO" && cantidad === devuelta && novedad !== "SÍ" && novedad !== "SI") {
    return `<span class="ok">La solicitud fue cerrada correctamente. Los equipos fueron devueltos completos y sin novedades reportadas.</span>`;
  }

  if (estadoFinal === "INCOMPLETO" || devuelta < cantidad) {
    return `<span class="warn">La solicitud fue cerrada con devolución incompleta. Se recomienda revisión administrativa del faltante.</span>`;
  }

  if (estadoFinal === "DAÑADO" || novedad === "SÍ" || novedad === "SI") {
    return `<span class="bad">La solicitud fue cerrada con novedad o daño reportado. Se recomienda validación técnica del equipo.</span>`;
  }

  return `<span class="warn">La solicitud fue cerrada. Revisar manualmente el estado final para validar la conclusión.</span>`;
}

function normalizarFechaTexto(valor) {
  const zonaHoraria = Session.getScriptTimeZone();

  if (!valor) return "";

  if (valor instanceof Date) {
    return Utilities.formatDate(valor, zonaHoraria, "yyyy-MM-dd");
  }

  const texto = String(valor).trim();

  if (texto.includes("T")) {
    return texto.split("T")[0];
  }

  if (texto.includes(" ")) {
    return texto.split(" ")[0];
  }

  return texto;
}

function formatearFechaPdf(valor) {
  const zona = Session.getScriptTimeZone();

  if (!valor) return "N/A";

  if (valor instanceof Date) {
    return Utilities.formatDate(valor, zona, "dd/MM/yyyy");
  }

  const texto = String(valor).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    const [y, m, d] = texto.split("-");
    return `${d}/${m}/${y}`;
  }

  if (texto.includes("T")) {
    const fecha = texto.split("T")[0];
    const [y, m, d] = fecha.split("-");
    return `${d}/${m}/${y}`;
  }

  return texto;
}

function formatearHoraPdf(valor) {
  const zona = Session.getScriptTimeZone();

  if (!valor) return "N/A";

  try {
    if (valor instanceof Date) {
      return Utilities.formatDate(valor, zona, "HH:mm");
    }

    const texto = String(valor).trim();

    const hhmm = texto.match(/\b(\d{1,2}:\d{2})\b/);
    if (hhmm) {
      const partes = hhmm[1].split(":");
      const hh = String(partes[0]).padStart(2, "0");
      const mm = partes[1];
      return `${hh}:${mm}`;
    }

    const limpio = texto.replace(/\s*\(.*?\)\s*$/, "");
    const fecha = new Date(limpio);

    if (!isNaN(fecha.getTime())) {
      return Utilities.formatDate(fecha, zona, "HH:mm");
    }

    return "N/A";
  } catch (e) {
    return "N/A";
  }
}

// ============================================================
// CRUD EQUIPOS SOPORTE
// ============================================================
function getHojaEquipos(sede) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheetName = "equipos_" + sede.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const sheet = ss.getSheetByName(sheetName);
    return sheet;
  } catch (e) {
    Logger.log("Error getHojaEquipos: " + e.toString());
    return null;
  }
}

function agregarEquipo(data) {
  try {
    const sede = data.sede;
    const correo = data.correo;
    
    // Validar acceso
    const permiso = validarAccesoSoporte(correo, sede);
    if (!permiso.ok) {
      Logger.log("❌ Error de acceso agregarEquipo: " + permiso.error);
      return jsonResponse({ status: "error", error: "Acceso denegado: " + permiso.error });
    }
    
    const sheet = getHojaEquipos(sede);

    if (!sheet) {
      Logger.log("❌ Hoja no encontrada para sede: " + sede);
      return jsonResponse({ status: "error", error: "No existe la hoja de equipos para la sede: " + sede });
    }

    const nuevaFila = [
      data.sede || "",
      data.equipo || "",
      data.carro || "",
      data.placa || "",
      data.serial || ""
    ];

    sheet.appendRow(nuevaFila);
    Logger.log("✅ Equipo agregado: " + data.placa);

    return jsonResponse({ status: "ok", message: "Equipo agregado correctamente" });

  } catch (err) {
    Logger.log("❌ Error agregarEquipo: " + err.toString());
    return jsonResponse({ status: "error", error: "Error al agregar equipo: " + err.toString() });
  }
}

// ============================================================
// ACTUALIZAR EQUIPO (Mejorado)
// ============================================================
function actualizarEquipo(data) {
  // Iniciamos un try/catch específico para capturar cualquier error
  try {
    const sede = data.sede;
    const serialOriginal = data.serialOriginal;

    // Validaciones básicas
    if (!sede || !serialOriginal) {
      return jsonResponse({ status: "error", error: "Faltan datos: sede o serial original" });
    }

    // Validar acceso (agregarEquipo/eliminarEquipo ya lo hacían; a esta le faltaba)
    const permiso = validarAccesoSoporte(data.correo, sede);
    if (!permiso.ok) {
      Logger.log("❌ Error de acceso actualizarEquipo: " + permiso.error);
      return jsonResponse({ status: "error", error: "Acceso denegado: " + permiso.error });
    }

    const sheet = getHojaEquipos(sede);

    if (!sheet) {
      Logger.log("❌ Error actualizarEquipo: Hoja no encontrada para sede " + sede);
      return jsonResponse({ status: "error", error: "No existe la hoja de equipos para esta sede: " + sede });
    }

    const lastRow = sheet.getLastRow();
    
    // Si no hay datos (solo cabecera)
    if (lastRow <= 1) {
      return jsonResponse({ status: "error", error: "No hay equipos en la hoja" });
    }

    // Obtenemos todos los datos
    const lastCol = sheet.getLastColumn();
    const dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    let encontrado = false;
    let rowNumber = -1;

    // Buscamos el equipo por el serial original
    for (let i = 0; i < dataRange.length; i++) {
      // Asumimos que el serial está en el índice 4 (Columna E) basado en tu Excel
      // Asegúrate de que esto coincida con tu hoja de cálculo
      const rowSerial = String(dataRange[i][4] || "").trim(); 

      if (rowSerial === serialOriginal) {
        rowNumber = i + 2; // +2 porque i empieza en 0 y la fila 1 es cabecera
        encontrado = true;
        break;
      }
    }

    if (!encontrado) {
      Logger.log("❌ Error actualizarEquipo: Serial no encontrado " + serialOriginal);
      return jsonResponse({ status: "error", error: "No se encontró el equipo con el serial: " + serialOriginal });
    }

    // ACTUALIZAMOS LAS CELDAS
    // Asegúrate de que los índices coincidan con tus columnas:
    // 1: Sede, 2: Equipo, 3: Carro, 4: Placa, 5: Serial
    
    // No solemos actualizar la Sede (col 1) ni el Serial si es clave primaria, 
    // pero si quieres permitir cambiar el serial, hazlo aquí:
    
    // Columna 2: Equipo
    if (data.equipo !== undefined) sheet.getRange(rowNumber, 2).setValue(data.equipo);
    
    // Columna 3: Carro
    if (data.carro !== undefined) sheet.getRange(rowNumber, 3).setValue(data.carro);
    
    // Columna 4: Placa
    if (data.placa !== undefined) sheet.getRange(rowNumber, 4).setValue(data.placa);
    
    // Columna 5: Serial (Solo si es diferente al original)
    if (data.serial !== undefined && data.serial !== serialOriginal) {
       sheet.getRange(rowNumber, 5).setValue(data.serial);
    }

    Logger.log("✅ Equipo actualizado correctamente en fila " + rowNumber);

    return jsonResponse({ status: "ok", message: "Equipo actualizado correctamente" });

  } catch (err) {
    Logger.log("🔥 ERROR CRÍTICO en actualizarEquipo: " + err.toString());
    // Devolvemos un error JSON explícito para que el frontend no se cuelgue con "Failed to fetch"
    return jsonResponse({ status: "error", error: "Error interno del servidor: " + err.toString() });
  }
}
function eliminarEquipo(data) {
  try {
    const sede = data.sede;
    const correo = data.correo;
    const serial = data.serial;
    
    // Validar acceso
    const permiso = validarAccesoSoporte(correo, sede);
    if (!permiso.ok) {
      Logger.log("❌ Error de acceso eliminarEquipo: " + permiso.error);
      return jsonResponse({ status: "error", error: "Acceso denegado: " + permiso.error });
    }
    
    const sheet = getHojaEquipos(sede);

    if (!sheet) {
      Logger.log("❌ Hoja no encontrada para sede: " + sede);
      return jsonResponse({ status: "error", error: "No existe la hoja de equipos para la sede: " + sede });
    }

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    if (lastRow <= 1) {
      return jsonResponse({ status: "error", error: "No hay equipos para eliminar" });
    }

    const dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

    for (let i = 0; i < dataRange.length; i++) {
      const rowSerial = String(dataRange[i][4] || "").trim();

      if (rowSerial === serial) {
        const rowNumber = i + 2;
        sheet.deleteRow(rowNumber);
        Logger.log("✅ Equipo eliminado: " + serial);
        return jsonResponse({ status: "ok", message: "Equipo eliminado correctamente" });
      }
    }

    Logger.log("❌ Equipo no encontrado: " + serial);
    return jsonResponse({ status: "error", error: "No se encontró el equipo con serial: " + serial });

  } catch (err) {
    Logger.log("❌ Error eliminarEquipo: " + err.toString());
    return jsonResponse({ status: "error", error: "Error al eliminar equipo: " + err.toString() });
  }
}
function normalizarTexto(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function obtenerHojaCorreosSede() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const hojas = ss.getSheets();
  
  // Buscar hoja que contenga "correo" y "sede" en el nombre (case-insensitive)
  for (let hoja of hojas) {
    const nombre = hoja.getName().toLowerCase();
    if (nombre.includes("correo") && nombre.includes("sede")) {
      Logger.log("✅ Hoja encontrada: " + hoja.getName());
      return hoja;
    }
  }
  
  // Si no se encuentra, intentar nombre exacto
  const hoja = ss.getSheetByName("correos_sede");
  if (hoja) return hoja;
  
  throw new Error("No se encontró ninguna hoja con 'correo' y 'sede' en el nombre. Hojas disponibles: " + 
    hojas.map(h => "'" + h.getName() + "'").join(", "));
}
function buscarSedePorCorreo(correo) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const hoja = ss.getSheetByName("correos_sede");
    if (!hoja) {
      Logger.log("❌ No existe la hoja 'correos_sede'");
      return null;
    }

    const data = hoja.getDataRange().getValues();
    if (data.length < 2) {
      Logger.log("⚠️ La hoja solo tiene encabezados o está vacía");
      return null;
    }

    // Encontrar índices de columnas
    const encabezados = data[0];
    let idxSede = -1, idxCorreo = -1;
    for (let i = 0; i < encabezados.length; i++) {
      const header = String(encabezados[i]).trim().toLowerCase();
      if (header === "sede") idxSede = i;
      if (header === "correo") idxCorreo = i;
    }

    if (idxSede === -1 || idxCorreo === -1) {
      Logger.log(`❌ Columnas no encontradas. Encabezados: ${encabezados.join(", ")}`);
      return null;
    }

    // NORMALIZACIÓN CORREGIDA - NO eliminar el @ ni el punto del dominio
    const correoBuscado = String(correo || "").trim().toLowerCase();
    Logger.log(`🔍 Buscando correo: "${correoBuscado}"`);

    for (let i = 1; i < data.length; i++) {
      const filaCorreo = String(data[i][idxCorreo] || "").trim().toLowerCase();
      const filaSede = String(data[i][idxSede] || "").trim();
      
      Logger.log(`Comparando fila ${i}: "${filaCorreo}" con "${correoBuscado}"`);
      
      // Comparación exacta (sin normalización extra)
      if (filaCorreo === correoBuscado) {
        Logger.log(`✅ Correo encontrado! Sede: ${filaSede}`);
        return {
          sede: filaSede.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
          sedeOriginal: filaSede,
          correo: filaCorreo
        };
      }
    }

    Logger.log(`❌ No se encontró el correo "${correoBuscado}" en la lista`);
    return null;
  } catch (error) {
    Logger.log(`🔥 Error en buscarSedePorCorreo: ${error.toString()}`);
    return null;
  }
}
function validarAccesoSoporte(correo, sedeSolicitada) {
  const acceso = buscarSedePorCorreo(correo);
  if (!acceso) {
    return { ok: false, error: "Correo no autorizado" };
  }

  if (normalizarTexto(sedeSolicitada) !== normalizarTexto(acceso.sede)) {
    return { ok: false, error: "No autorizado para esa sede" };
  }

  return { ok: true, acceso: acceso };
}

// ============================================================
// GUARDIA DE AUTORIZACIÓN PARA ENDPOINTS DE SOPORTE
// Reutiliza validarAccesoSoporte (hoja correos_sede). Se usa en
// todas las acciones que exponen datos sensibles (PII, firmas,
// fotos) o permiten mutar registros/equipos, para que solo un
// correo de soporte verificado y autorizado para esa sede pueda
// usarlas. Antes estas acciones no validaban nada.
// ============================================================
function requireSoporteAutorizado_(correo, sede) {
  const permiso = validarAccesoSoporte(correo, sede);
  if (!permiso.ok) {
    Logger.log("🚫 Acceso de soporte denegado — correo: " + correo + " sede: " + sede + " motivo: " + permiso.error);
  }
  return permiso;
}

function validarCorreoSoporteHandler(correo) {
  try {
    if (!correo) {
      return { status: "error", error: "Debes ingresar un correo" };
    }

    // Limpiar el correo (solo trim y lowerCase)
    const correoLimpiado = correo.trim().toLowerCase();
    Logger.log(`Validando correo: ${correoLimpiado}`);

    const resultado = buscarSedePorCorreo(correoLimpiado);

    if (!resultado) {
      return { 
        status: "error", 
        error: "Correo no autorizado. Verifica que esté registrado en la hoja 'correos_sede'." 
      };
    }

    return {
      status: "ok",
      sede: resultado.sede,
      sedeOriginal: resultado.sedeOriginal,
      correo: resultado.correo
    };
  } catch (error) {
    Logger.log(`Error en validarCorreoSoporteHandler: ${error.message}`);
    return { status: "error", error: "Error interno: " + error.message };
  }
}

// ============================================================
// OBTENER SEDES Y CORREOS DE FORMA DINÁMICA
// ============================================================
function getSedesSoporteHandler() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const hoja = ss.getSheetByName("correos_sede");
    
    if (!hoja) {
      Logger.log("❌ No existe la hoja 'correos_sede'");
      return jsonResponse({ error: "No se encontró la hoja 'correos_sede'" });
    }
    
    const data = hoja.getDataRange().getValues();
    if (data.length < 2) {
      Logger.log("⚠️ La hoja solo tiene encabezados");
      return jsonResponse([]);
    }
    
    // Asumir que columna A = Sede, columna B = Correo
    const sedes = [];
    for (let i = 1; i < data.length; i++) {
      const sede = String(data[i][0] || "").trim();
      const correo = String(data[i][1] || "").trim();
      
      if (sede && correo) {
        sedes.push({
          sede: sede,
          sedeNormalizada: normalizarTexto(sede),
          correo: correo.toLowerCase()
        });
      }
    }
    
    Logger.log("✅ Sedes cargadas: " + sedes.length);
    return jsonResponse(sedes);
  } catch (err) {
    Logger.log("❌ Error en getSedesSoporteHandler: " + err.toString());
    return jsonResponse({ error: err.toString() });
  }
}

// ============================================================
// OBTENER LOGO COMO BASE64 PARA PDFs
// ============================================================
function getLogoBase64() {
  try {
    if (!LOGO_ID && !LOGO_FOLDER_ID) {
      Logger.log("⚠️ Logo ID no configurado");
      return null;
    }

    const file = getLogoFile_();
    if (!file) return null;
    const blob = file.getBlob();
    const base64 = Utilities.base64Encode(blob.getBytes());
    const mimeType = blob.getContentType();

    Logger.log("✅ Logo cargado correctamente");
    return `data:${mimeType};base64,${base64}`;
  } catch (e) {
    Logger.log("❌ Error obteniendo logo: " + e.toString());
    return null;
  }
}

function getLogoFile_() {
  if (LOGO_ID) {
    return DriveApp.getFileById(LOGO_ID);
  }

  if (!LOGO_FOLDER_ID) {
    Logger.log("Logo no configurado");
    return null;
  }

  const folder = DriveApp.getFolderById(LOGO_FOLDER_ID);
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    const mimeType = file.getMimeType();
    if (mimeType && mimeType.indexOf("image/") === 0) {
      return file;
    }
  }

  Logger.log("No se encontró una imagen en la carpeta del logo");
  return null;
}
