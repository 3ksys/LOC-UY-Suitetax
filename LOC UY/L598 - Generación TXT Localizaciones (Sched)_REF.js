/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NAmdConfig /SuiteScripts/configuration_l598.json
 * @NModuleScope Public
 *
 * ============================================================================
 * REFACTOR (Mobeats) de "L598 - Generación TXT Localizaciones (Sched)".
 * ----------------------------------------------------------------------------
 * Alcance aplicado: B (governance/performance) + C (estándares 2.1) + D (mantenibilidad).
 * El contenido del TXT generado se preserva BYTE A BYTE respecto del original.
 *
 * NO incluido (grupo A — cambian comportamiento, requieren aprobación de Tekiio):
 *   A1  Truncamiento a 1000 en searchRubroPublicidad (se mantiene idéntico al original).
 *   A2  resultado/idLogGeneral pueden quedar undefined si archivoGenerar != "2181".
 *   A3  configCarpeta/configNombreArchivo sólo se setean si la config trae 1 resultado.
 *
 * NO aplicado por riesgo (documentado):
 *   B1  La saved search 2181 se usa en DOS niveles de agregación distintos
 *       (detalle en generarTXT, SUM/GROUP en searchRubroPublicidad). Consolidarlas
 *       cambiaría resultados; su unificación segura requiere SuiteQL (fuera de alcance).
 * ============================================================================
 */
define(['N/runtime', 'N/format', 'L598/utilities', 'N/record', 'N/file', 'N/url', 'N/email', 'N/search', 'N/currency'],

    (runtime, format, utilities, record, file, url, email, search, currency) => {

        const PROCESO = 'L598 - Generación TXT Localizaciones (Sched) [REF]';

        // --- Constantes de dominio (antes hardcodeadas en el cuerpo) ---
        const SEARCH_2181 = 'customsearch_l598_beta_2181';
        const ARCHIVO_2181 = '2181';
        const RUBRO_PUBLICIDAD = '514';
        const TZ_MONTEVIDEO = -3;          // GMT-3 (Uruguay)
        const SEP_DECIMAL = '.';
        const IMPORTE_DIGITOS_ENTERO = 12;
        const IMPORTE_DIGITOS_DECIMAL = 0;

        // ----------------------------------------------------------------------
        // Parámetros del script
        // ----------------------------------------------------------------------
        function getParams() {
            try {
                const currScript = runtime.getCurrentScript();
                return {
                    subsidiaria: currScript.getParameter('custscript_l598_gen_txt_loc_subsidiaria'),
                    periodo: currScript.getParameter('custscript_l598_gen_txt_loc_periodo'),
                    archivo: currScript.getParameter('custscript_l598_gen_txt_loc_archivo'),
                    usuario: currScript.getParameter('custscript_l598_gen_txt_loc_usuario'),
                    estadoOk: currScript.getParameter('custscript_l598_gen_txt_loc_estado_ok'),
                    estadoError: currScript.getParameter('custscript_l598_gen_txt_loc_estado_error'),
                    // Modificación Publicidad
                    isTaface: currScript.getParameter('custscript_l598_gen_txt_loc_taface'),
                    units: currScript.getParameter('custscript_l598_gen_txt_loc_units'),
                    rubroPub: currScript.getParameter('custscript_l598_gen_txt_loc_rubro')
                };
            } catch (excepcion) {
                log.error('getParams', 'Excepcion Obteniendo Parametros - Excepcion : ' + excepcion.message);
                return null;
            }
        }

        // ----------------------------------------------------------------------
        // Entry point
        // ----------------------------------------------------------------------
        function execute(scriptContext) {

            log.audit(PROCESO, 'INICIO - Generar TXT Localizaciones URU');

            try {
                const isOneWorld = utilities.l598esOneworld();
                const informacion = getParams();

                log.audit(PROCESO, 'Parámetros recibidos: ' + JSON.stringify(informacion));

                if (utilities.isEmpty(informacion) || utilities.isEmpty(informacion.periodo) || utilities.isEmpty(informacion.archivo) ||
                    utilities.isEmpty(informacion.usuario) || utilities.isEmpty(informacion.estadoOk) || utilities.isEmpty(informacion.estadoError)) {
                    log.error(PROCESO, 'Error obteniendo alguno de los campos enviados por parámetros, el proceso no puede continuar');
                    return false;
                }

                // --- Configuración (carpeta + nombre de archivo destino) ---
                // Comportamiento original preservado: sólo se resuelve cuando la búsqueda
                // de configuración devuelve EXACTAMENTE 1 resultado (ver hallazgo A3).
                let configCarpeta;
                let configNombreArchivo;

                const config = consultarConfiguracion(informacion.subsidiaria, isOneWorld);
                if (config === null) {
                    return false; // OneWorld sin subsidiaria: el proceso no puede continuar
                }
                configCarpeta = config.carpeta;
                configNombreArchivo = config.nombreArchivo;

                // --- Tipo de archivo a generar ---
                const objTipoArchivo = search.lookupFields({
                    type: 'customrecord_l598_gen_txt_loc_archivos',
                    id: informacion.archivo,
                    columns: ['custrecord_l598_archivos_txt_codigo']
                });

                let archivoGenerar = '';
                if (!utilities.isEmpty(objTipoArchivo)) {
                    archivoGenerar = objTipoArchivo.custrecord_l598_archivos_txt_codigo;
                    log.audit(PROCESO, 'archivoGenerar: ' + archivoGenerar);
                }

                if (utilities.isEmpty(archivoGenerar)) {
                    return;
                }

                let estadoProceso = informacion.estadoOk;
                let resultado;
                let idLogGeneral;

                switch (archivoGenerar) {
                    case ARCHIVO_2181: {
                        const docEmpresa = consultaDatosImpositivos(informacion.subsidiaria, isOneWorld);
                        const fechaProceso = formatDate();
                        const arrPublicity = searchRubroPublicidad(isOneWorld, informacion.subsidiaria, informacion.periodo, informacion.isTaface, informacion.units);

                        resultado = generarTXT(isOneWorld, informacion.subsidiaria, informacion.periodo, configNombreArchivo,
                            configCarpeta, SEARCH_2181, docEmpresa, fechaProceso.fechaHora, arrPublicity, informacion.rubroPub);
                        log.audit(PROCESO, 'resultado: ' + JSON.stringify(resultado));

                        if (!utilities.isEmpty(resultado)) {
                            if (resultado.error === true) {
                                estadoProceso = informacion.estadoError;
                            }
                            idLogGeneral = grabarLogGeneral(informacion.periodo, informacion.subsidiaria, informacion.usuario,
                                resultado.mensaje, resultado.archivo, estadoProceso, informacion.archivo, fechaProceso.fechaServidor);
                        }
                        break;
                    }
                }

                enviarMail(resultado.archivo, informacion.usuario, idLogGeneral, configNombreArchivo);

            } catch (e) {
                log.error(PROCESO, 'Exception: ' + e.message);
            }

            log.audit(PROCESO, 'FIN - Generar TXT Localizaciones URU');
        }

        // ----------------------------------------------------------------------
        // Configuración del panel (carpeta + nombre de archivo)
        // Devuelve { carpeta, nombreArchivo } o null si OneWorld sin subsidiaria.
        // ----------------------------------------------------------------------
        function consultarConfiguracion(subsidiaria, isOneWorld) {
            const salida = { carpeta: undefined, nombreArchivo: undefined };

            let searchPanelConfig;
            if (isOneWorld) {
                if (utilities.isEmpty(subsidiaria)) {
                    log.error(PROCESO, 'Error obteniendo el parámetro de subsidiaria, el proceso no puede continuar.');
                    return null;
                }
                const filtroSubsidiaria = {
                    name: 'custrecord_l598_gen_txt_conf_subsidiaria',
                    operator: 'IS',
                    values: subsidiaria
                };
                searchPanelConfig = utilities.searchSavedPro('customsearch_l598_gen_txt_loc_config', [filtroSubsidiaria]);
            } else {
                searchPanelConfig = utilities.searchSavedPro('customsearch_l598_gen_txt_loc_config');
            }

            if (!searchPanelConfig.error && !utilities.isEmpty(searchPanelConfig.objRsponseFunction.result) &&
                searchPanelConfig.objRsponseFunction.result.length > 0) {

                const resultSet = searchPanelConfig.objRsponseFunction.result;
                const resultSearch = searchPanelConfig.objRsponseFunction.search;

                // Comportamiento original: sólo resuelve carpeta/nombre cuando hay exactamente 1 config.
                if (resultSet.length === 1) {
                    salida.carpeta = resultSet[0].getValue({ name: resultSearch.columns[3] });
                    salida.nombreArchivo = resultSet[0].getValue({ name: resultSearch.columns[4] });
                    log.audit(PROCESO, 'configCarpeta: ' + salida.carpeta + ' - configNombreArchivo: ' + salida.nombreArchivo);
                }
            }
            return salida;
        }

        // ----------------------------------------------------------------------
        // Modificación Publicidad: RUTs cuyo monto (rubro 514) supera el umbral en UI.
        // NOTA (A1): se mantiene el límite original de 1000 resultados (sin paginar).
        // ----------------------------------------------------------------------
        function searchRubroPublicidad(isOneWorld, subsidiaria, periodo, isTaface, units) {
            const arrayResult = [];

            const searchLoad = search.load({ id: SEARCH_2181 });

            filtrosSubsidiariaPeriodo(isOneWorld, subsidiaria, periodo).forEach(f => searchLoad.filters.push(f));

            searchLoad.columns = [
                search.createColumn({
                    name: 'formulacurrency',
                    summary: 'SUM',
                    formula: "CASE WHEN {custcol_l598_rubro_iva.custrecord_l598_rubro_iva_codigo} = '" + RUBRO_PUBLICIDAD + "' THEN NVL({amount}, 0) ELSE 0 END"
                }),
                search.createColumn({
                    name: 'formulatext',
                    summary: 'GROUP',
                    formula: "CASE WHEN (NVL({custbody_l598_transac_cuenta_ajena}, '*')='*' OR {custbody_l598_transac_cuenta_ajena}='F') THEN {custbody_l598_nro_documento} ELSE {custbody_l598_nro_doc_emp_cta_ajena} END"
                })
            ];

            const resultSet = searchLoad.run();
            const searchResult = resultSet.getRange({ start: 0, end: 1000 });

            const rate = getUnidIndexada(isOneWorld, subsidiaria, isTaface);

            for (let i = 0; i < searchResult.length; i++) {
                const montoSearch = searchResult[i].getValue({ name: resultSet.columns[0] });
                const vendorRut = searchResult[i].getValue({ name: resultSet.columns[1] });
                const montoReal = montoSearch / rate;

                if (parseFloat(montoReal) > parseFloat(units)) {
                    arrayResult.push(vendorRut);
                }
            }

            return arrayResult;
        }

        function getUnidIndexada(isOneWorld, subsidiaria, isTaface) {
            const sub = utilities.isEmpty(subsidiaria) ? '' : subsidiaria;
            const esTaface = getConfigFE(isTaface, sub, isOneWorld);

            // Si la configuración de FE es TAFACE se usa la UI predeterminada del RT de configuración;
            // en caso contrario, el tipo de cambio UI registrado en NetSuite.
            if (!utilities.isEmpty(esTaface) && esTaface) {
                return getConfigUnidadIndexada();
            }
            return currency.exchangeRate({ source: 'UI', target: 'UYU' });
        }

        function getConfigFE(parametroTipoIntegracionFE, idSubsidiaria, isOneWorld) {
            let esTipoIntegracionTAFACE = false;
            try {
                const filtrosConfiguracionFE = [];
                if (isOneWorld && !utilities.isEmpty(idSubsidiaria)) {
                    filtrosConfiguracionFE.push({
                        name: 'custrecord_l598_conf_fe_subsidiaria',
                        operator: 'IS',
                        values: idSubsidiaria
                    });
                }

                const searchConfigFE = utilities.searchSavedPro('customsearch_l598_config_fe_seteo_ui', filtrosConfiguracionFE);

                if (!searchConfigFE.error && !utilities.isEmpty(searchConfigFE.objRsponseFunction.result) &&
                    searchConfigFE.objRsponseFunction.result.length > 0) {

                    const resultSet = searchConfigFE.objRsponseFunction.result;
                    const resultSearch = searchConfigFE.objRsponseFunction.search;

                    const tipoIntegracionFE = resultSet[0].getValue({ name: resultSearch.columns[2] });
                    if (tipoIntegracionFE == parametroTipoIntegracionFE) {
                        esTipoIntegracionTAFACE = true;
                    }
                }
            } catch (e) {
                log.error('getConfigFE', 'NetSuite Exception - Detalles Error: ' + e.message);
                esTipoIntegracionTAFACE = false;
            }
            return esTipoIntegracionTAFACE;
        }

        function getConfigUnidadIndexada() {
            let valorUnidadIndexada = '';
            try {
                const searchConfigUI = utilities.searchSavedPro('customsearch_l598_config_ui_seteo_ui', null);

                if (!searchConfigUI.error && !utilities.isEmpty(searchConfigUI.objRsponseFunction.result) &&
                    searchConfigUI.objRsponseFunction.result.length > 0) {

                    const resultSet = searchConfigUI.objRsponseFunction.result;
                    const resultSearch = searchConfigUI.objRsponseFunction.search;
                    valorUnidadIndexada = resultSet[0].getValue({ name: resultSearch.columns[2] });
                }
            } catch (e) {
                log.error('getConfigUnidadIndexada', 'NetSuite Exception - Detalles Error: ' + e.message);
            }
            return valorUnidadIndexada;
        }

        // ----------------------------------------------------------------------
        // Generación del TXT (orquesta: buscar → agrupar → construir → guardar)
        // ----------------------------------------------------------------------
        function generarTXT(isOneWorld, subsidiaria, periodo, nombreArchivo, idCarpeta, busqueda, docEmpresa, fechaArchivo, arrPublicity, rubroPub) {
            const respuesta = { error: false, mensaje: '', archivo: '', archivoNombre: '' };

            try {
                log.audit(PROCESO, 'INICIO - generarTXT - Archivo: ' + nombreArchivo);

                const filtrosTXT = filtrosSubsidiariaPeriodo(isOneWorld, subsidiaria, periodo);
                const searchTXT = utilities.searchSavedPro(busqueda, filtrosTXT);

                if (searchTXT.error || utilities.isEmpty(searchTXT.objRsponseFunction.result) || searchTXT.objRsponseFunction.result.length === 0) {
                    respuesta.error = true;
                    respuesta.mensaje = 'No se encontraron transacciones a informar en el TXT.';
                    log.debug('generarTXT', respuesta.mensaje);
                    return respuesta;
                }

                const TXTResultSet = searchTXT.objRsponseFunction.result;
                const TXTResultSearch = searchTXT.objRsponseFunction.search;

                // Agrupa transacciones (cuenta ajena + normales) en O(n) preservando el orden original.
                const transacciones = agruparTransacciones(TXTResultSet, TXTResultSearch);

                // Construye el contenido del archivo.
                const infoTXT = construirContenidoTXT(transacciones, docEmpresa, arrPublicity);

                if (!utilities.isEmpty(infoTXT) && !utilities.isEmpty(nombreArchivo) && !utilities.isEmpty(idCarpeta) && !utilities.isEmpty(fechaArchivo)) {
                    const archivo = file.create({
                        name: nombreArchivo + '_' + fechaArchivo + '.txt',
                        fileType: file.Type.PLAINTEXT,
                        contents: infoTXT,
                        folder: idCarpeta
                    });
                    respuesta.archivo = archivo.save();
                    log.debug(PROCESO, 'fileId: ' + respuesta.archivo);
                }

                respuesta.error = false;
                respuesta.mensaje = 'Archivo TXT generado exitosamente';

            } catch (e) {
                respuesta.error = true;
                respuesta.mensaje = 'Error Generando TXT - Exception: ' + e.message;
                log.error('generarTXT', respuesta.mensaje);
            }

            log.audit(PROCESO, 'FIN - generarTXT - Archivo: ' + nombreArchivo);
            return respuesta;
        }

        // Agrupa por (RUT informado + línea). Reemplaza el doble loop O(n^2) original por
        // dos Map (orden de inserción = orden de primera aparición → salida byte-idéntica).
        function agruparTransacciones(TXTResultSet, cols) {
            const ctaAjena = new Map();
            const normales = new Map();

            for (let k = 0; k < TXTResultSet.length; k++) {
                const fldTypeTransaction = TXTResultSet[k].getValue({ name: cols.columns[1] });
                const fldFormulario = TXTResultSet[k].getValue({ name: cols.columns[3] });
                const fldPeriodo = TXTResultSet[k].getValue({ name: cols.columns[4] });
                const fldRutInformado = TXTResultSet[k].getValue({ name: cols.columns[5] });
                const fldFactura = TXTResultSet[k].getValue({ name: cols.columns[6] });
                const fldLinea = TXTResultSet[k].getValue({ name: cols.columns[7] });
                const fldImporte = parseFloat(TXTResultSet[k].getValue({ name: cols.columns[8] }), 10); // Importe IVA

                const fldEsCtaAjena = TXTResultSet[k].getValue({ name: cols.columns[10] });
                const fldImpNetoCtaAjena = parseFloat(TXTResultSet[k].getValue({ name: cols.columns[11] }), 10);
                const fldRutCliente = TXTResultSet[k].getValue({ name: cols.columns[12] });
                const fldRubroIVA = TXTResultSet[k].getValue({ name: cols.columns[14] });
                const fdlImporteBeneficiosFiscales = TXTResultSet[k].getValue({ name: cols.columns[15] });
                const fdlTipoBeneficio = TXTResultSet[k].getValue({ name: cols.columns[16] });

                const esCtaAjena = !utilities.isEmpty(fldEsCtaAjena) && (fldEsCtaAjena == 'T' || fldEsCtaAjena == true);
                const tieneBeneficio = !utilities.isEmpty(fdlImporteBeneficiosFiscales) && !isNaN(fdlImporteBeneficiosFiscales) &&
                    parseFloat(Math.abs(fdlImporteBeneficiosFiscales), 10) > 0 && !utilities.isEmpty(fdlTipoBeneficio);

                if (esCtaAjena || tieneBeneficio) {
                    const registro = {
                        fldTypeTransaction: fldTypeTransaction,
                        fldFormulario: fldFormulario,
                        fldPeriodo: fldPeriodo,
                        fldRutInformado: fldRutInformado,
                        fldFactura: fldFactura,
                        fldLinea: fldRubroIVA,
                        fldImporte: esCtaAjena ? parseFloat(fldImpNetoCtaAjena, 10) : fdlImporteBeneficiosFiscales
                    };
                    acumular(ctaAjena, registro.fldRutInformado + '|' + registro.fldLinea, registro);
                }

                // El RUT informado de la línea "normal" es el RUT del cliente de la transacción.
                const registroNormal = {
                    fldTypeTransaction: fldTypeTransaction,
                    fldFormulario: fldFormulario,
                    fldPeriodo: fldPeriodo,
                    fldRutInformado: fldRutCliente,
                    fldFactura: fldFactura,
                    fldLinea: fldLinea,
                    fldImporte: fldImporte
                };
                acumular(normales, registroNormal.fldRutInformado + '|' + registroNormal.fldLinea, registroNormal);
            }

            // Orden original: primero cuenta ajena, luego normales.
            return [...ctaAjena.values(), ...normales.values()];
        }

        // Suma el importe si la clave ya existe; si no, inserta el registro (preserva orden).
        function acumular(mapa, clave, registro) {
            if (mapa.has(clave)) {
                mapa.get(clave).fldImporte += parseFloat(registro.fldImporte, 10);
            } else {
                mapa.set(clave, registro);
            }
        }

        // Construye el contenido del TXT. Misma regla original:
        // se informa la línea si rubro != 514, o si rubro == 514 y el RUT está en publicidad.
        function construirContenidoTXT(transacciones, docEmpresa, arrPublicity) {
            const lineas = [];

            for (let k = 0; k < transacciones.length; k++) {
                const t = transacciones[k];

                const informa = (t.fldLinea != RUBRO_PUBLICIDAD) ||
                    (t.fldLinea == RUBRO_PUBLICIDAD && arrPublicity.indexOf(t.fldRutInformado) > -1);

                const importeRedondeado = parseFloat(t.fldImporte, 10).toFixed(0);

                if (informa && importeRedondeado != 0) {
                    lineas.push(
                        docEmpresa + ';' +
                        t.fldFormulario + ';' +
                        t.fldPeriodo + ';' +
                        t.fldRutInformado + ';' +
                        t.fldFactura + ';' +
                        t.fldLinea + ';' +
                        formatearNumero(t.fldImporte, IMPORTE_DIGITOS_ENTERO, IMPORTE_DIGITOS_DECIMAL, SEP_DECIMAL)
                    );
                }
            }

            // Cada línea termina en CRLF (incluida la última), igual que el original.
            return lineas.length > 0 ? lineas.join('\r\n') + '\r\n' : '';
        }

        function grabarLogGeneral(periodo, subsidiaria, usuario, detalleProceso, archivo, estadoProceso, txtProceso, fechaProceso) {
            try {
                log.audit(PROCESO, 'INICIO - grabarLogGeneral');

                const fechaLocalDate = format.parse({
                    value: fechaProceso,
                    type: format.Type.DATETIME,
                    timezone: format.Timezone.AMERICA_MONTEVIDEO
                });

                const registroLogGeneral = record.create({ type: 'customrecord_l598_gen_txt_loc_log' });

                const campos = [
                    { fieldId: 'custrecord_l598_gen_txt_loc_log_fecha', value: fechaLocalDate },
                    { fieldId: 'custrecord_l598_gen_txt_loc_log_periodo', value: periodo },
                    { fieldId: 'custrecord_l598_gen_txt_loc_log_subsidia', value: subsidiaria },
                    { fieldId: 'custrecord_l598_gen_txt_loc_log_usuario', value: usuario },
                    { fieldId: 'custrecord_l598_gen_txt_loc_log_detalle', value: detalleProceso },
                    { fieldId: 'custrecord_l598_gen_txt_loc_log_archivo', value: archivo },
                    { fieldId: 'custrecord_l598_gen_txt_loc_log_estado', value: estadoProceso },
                    { fieldId: 'custrecord_l598_gen_txt_loc_log_txt_proc', value: txtProceso }
                ];
                campos.forEach(c => {
                    if (!utilities.isEmpty(c.value)) {
                        registroLogGeneral.setValue({ fieldId: c.fieldId, value: c.value });
                    }
                });

                const idRecordSave = registroLogGeneral.save();
                log.debug(PROCESO, 'idRecordSave: ' + idRecordSave);

                if (utilities.isEmpty(idRecordSave)) {
                    log.error(PROCESO, 'Error Sumarize - Error : No se Recibio el ID Interno del LOG');
                } else {
                    log.audit(PROCESO, 'FIN - grabarLogGeneral');
                    return idRecordSave;
                }
            } catch (e) {
                log.error('grabarLogGeneral', 'Exception: ' + e.message);
            }
        }

        function enviarMail(archivo, idUsuario, idLogGeneral, nombreArchivo) {
            try {
                log.audit(PROCESO, 'INICIO - enviarMail');

                const host = url.resolveDomain({ hostType: url.HostType.APPLICATION });
                const rutaRelativa = url.resolveRecord({
                    recordType: 'customrecord_l598_gen_txt_loc_log',
                    recordId: idLogGeneral,
                    isEditMode: false
                });
                const urlRT = 'https://' + host + rutaRelativa;

                let body;
                if (!utilities.isEmpty(archivo)) {
                    body = 'La Generación del archivo ' + nombreArchivo + ' ha finalizado, puede verificar el resultado en el siguiente enlace: <a href="' + urlRT + '"> URU-Generación TXT LOC - Log  </a>  <br> Se adjunta el archivo TXT generado.';
                } else {
                    body = 'No se encontraron transacciones a informar para el archivo ' + nombreArchivo + ', puede verificar el resultado en el siguiente enlace: <a href="' + urlRT + '"> URU-Generación TXT LOC - Log  </a>';
                }

                let adjunto = null;
                if (!utilities.isEmpty(archivo)) {
                    adjunto = [file.load({ id: archivo })];
                }

                email.send({
                    author: idUsuario,
                    recipients: idUsuario,
                    subject: 'URU - Generación TXT Localizaciones - Resultado del proceso',
                    body: body,
                    attachments: adjunto
                });

                log.audit(PROCESO, 'FIN - enviarMail');
            } catch (e) {
                log.error('enviarMail', 'Exception: ' + e.message);
            }
        }

        function consultaDatosImpositivos(idSubsidiaria, isOneWorld) {
            try {
                log.audit(PROCESO, 'INICIO - consultaDatosImpositivos');

                let searchDatosImp;
                if (isOneWorld) {
                    const filtroSubsidiaria = {
                        name: 'custrecord_l598_dat_imp_subsidiaria',
                        operator: 'IS',
                        values: idSubsidiaria
                    };
                    searchDatosImp = utilities.searchSavedPro('customsearch_l598_datos_imp_empresa', [filtroSubsidiaria]);
                } else {
                    searchDatosImp = utilities.searchSavedPro('customsearch_l598_datos_imp_empresa');
                }

                if (!searchDatosImp.error && !utilities.isEmpty(searchDatosImp.objRsponseFunction.result) &&
                    searchDatosImp.objRsponseFunction.result.length > 0) {

                    const resultSet = searchDatosImp.objRsponseFunction.result;
                    const resultSearch = searchDatosImp.objRsponseFunction.search;
                    const nroDocEmpresa = resultSet[0].getValue({ name: resultSearch.columns[2] });

                    log.audit(PROCESO, 'FIN - consultaDatosImpositivos');
                    return nroDocEmpresa;
                }
            } catch (e) {
                log.error('consultaDatosImpositivos', 'Exception: ' + e.message);
            }
        }

        // ----------------------------------------------------------------------
        // Helpers
        // ----------------------------------------------------------------------

        // Filtros comunes de subsidiaria + período (reutilizado por las 2 búsquedas base).
        function filtrosSubsidiariaPeriodo(isOneWorld, subsidiaria, periodo) {
            const filtros = [];
            if (isOneWorld && !utilities.isEmpty(subsidiaria)) {
                filtros.push(search.createFilter({ name: 'subsidiary', operator: search.Operator.IS, values: subsidiaria }));
            }
            if (!utilities.isEmpty(periodo)) {
                filtros.push(search.createFilter({ name: 'postingperiod', operator: search.Operator.IS, values: periodo }));
            }
            return filtros;
        }

        // Toma una fecha en otra zona horaria y la mueve según el offset indicado (default GMT0).
        function getDate(fecha, zonaHoraria) {
            try {
                let utc = new Date(fecha);
                const offset = utilities.isEmpty(zonaHoraria) ? 0 : zonaHoraria;
                utc = utc.getTime() + (utc.getTimezoneOffset() * 60000);
                return new Date(utc + (3600000 * offset));
            } catch (e) {
                log.error('getDate', e.message);
            }
        }

        function formatDate() {
            try {
                const fechaServidor = new Date();
                const d = getDate(fechaServidor, TZ_MONTEVIDEO);

                let month = '' + (d.getMonth() + 1);
                let day = '' + d.getDate();
                const year = d.getFullYear();
                let hour = '' + d.getHours();
                let minutes = '' + d.getMinutes();
                let seconds = '' + d.getSeconds();

                if (month.length < 2) month = '0' + month;
                if (day.length < 2) day = '0' + day;
                if (hour.length < 2) hour = '0' + hour;
                if (minutes.length < 2) minutes = '0' + minutes;
                if (seconds.length < 2) seconds = '0' + seconds;

                return {
                    fechaHora: [year, month, day].join('') + '_' + hour + minutes + seconds,
                    fechaServidor: fechaServidor
                };
            } catch (e) {
                log.error('formatDate', e.message);
            }
        }

        // Formatea un importe a entero con padding de ceros a la izquierda.
        // (La rama decimal del original era código muerto: el valor siempre se redondea con toFixed(0).)
        function formatearNumero(valor, cantidadDigitosEntero, cantidadDigitosDecimal, separadorDecimal) {
            try {
                const expRegNumeros = /[^0-9]/gi;

                if (utilities.isEmpty(cantidadDigitosEntero) || utilities.isEmpty(cantidadDigitosDecimal) || utilities.isEmpty(separadorDecimal)) {
                    return ''.toString();
                }

                let valorStr = utilities.isEmpty(valor) ? '0' : parseFloat(valor, 10).toFixed(0);
                const numeroNegativo = parseFloat(valorStr) < 0;
                valorStr = valorStr.toString();

                if (isNaN(valorStr)) {
                    return ''.toString();
                }

                if (numeroNegativo && valorStr.length > 0) {
                    const cantidadPad = cantidadDigitosEntero - 1;
                    const sinSigno = valorStr.substring(1, valorStr.length);
                    return ('-' + utilities.padding_left(sinSigno.replace(expRegNumeros, ''), '0', cantidadPad)).toString();
                }
                return utilities.padding_left(valorStr.replace(expRegNumeros, ''), '0', cantidadDigitosEntero).toString();

            } catch (e) {
                log.error('formatearNumero', 'Exception: ' + e.message);
            }
        }

        return {
            execute: execute
        };

    });
