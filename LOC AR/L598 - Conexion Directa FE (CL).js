/**
 * @NApiVersion 2.0
 * @NModuleScope Public
 * @NAmdConfig /SuiteScripts/configuration_l598.json
 */
define(
    [
        'N/currentRecord', 'N/format', 'L598/utilities', 'N/runtime', 'N/https', 'N/url', 'N/log', 'N/record', 'N/search', 'N/email'
    ],
    function (currentRecord, format, utilities, runtime, https, url, log, record, search, email) {

        function generarCAE(codigoEstadoError, codigoEstadoSinError, tipoMensajeErrorConfiguracionFE, tipoMensajeErrorCAE, tipoMensajeErrorInesperadoXML, tipoMensajeSinError, tipoMensajeErrorBoton) {

            var proceso = 'generarCAE';
            var currentScript = runtime.getCurrentScript();
            var currentContext = currentRecord.get();
            var subsidiaria;
            var idLog;
            var codigoEstadoError = codigoEstadoError;
            var codigoEstadoSinError = codigoEstadoSinError;
            var tipoMensajeErrorConfiguracionFE = tipoMensajeErrorConfiguracionFE;
            var tipoMensajeErrorCAE = tipoMensajeErrorCAE;
            var tipoMensajeErrorInesperadoXML = tipoMensajeErrorInesperadoXML;
            var tipoMensajeSinError = tipoMensajeSinError;
            var tipoMensajeErrorBoton = tipoMensajeErrorBoton;
            var mensaje = '';
            var punto_venta = '';
            var tipoTransaccion = '';
            var refLog = '';
            var refTransaccion = currentContext.id;
            var informacionAuxiliarCAE = '';
            var errorProceso = false;
            var caeRecibido = '';
            var tipoTransaccion = '';
            var codigoSerie = '';
            var sucursalText = '';
            log.debug(proceso, "INICIO - Generar CAE (CL) - unidades disponibles: " + currentScript.getRemainingUsage() + ' --- time: ' + new Date());

            try {

                // log.debug(proceso, 'Detalles transacción - currentContext: ' + JSON.stringify(currentContext));

                // Si es del Tipo Manual

                if (confirm("La obtención del CAE es un proceso externo, el cual puede demorar unos segundos. Se le notificará cuando finalice, ¿Desea continuar?")) {
                    // log.debug(proceso, 'codigoEstadoError: ' + codigoEstadoError + ' - codigoEstadoSinError: ' + codigoEstadoSinError + ' - tipoMensajeErrorConfiguracionFE: ' + tipoMensajeErrorConfiguracionFE + ' - tipoMensajeErrorCAE: ' + tipoMensajeErrorCAE + ' - tipoMensajeErrorInesperadoXML: ' + tipoMensajeErrorInesperadoXML + ' - tipoMensajeSinError: ' + tipoMensajeSinError + ' - tipoMensajeErrorBoton: ' + tipoMensajeErrorBoton);

                    var recId = currentContext.id;
                    var recType = currentContext.type;
                    var recordTransaction = record.load({
                        type: recType,
                        id: recId,
                        isDynamic: true
                    });
                    var esOneWorld = utilities.l598esOneworld();
                    var punto_venta = recordTransaction.getText({ fieldId: 'custbody_l598_sucursal' });
                    tipoTransaccion = recordTransaction.getText({ fieldId: 'custbody_l598_tipo_comprobante' });
                    var tipoComprobanteDGI = recordTransaction.getValue({ fieldId: 'custbody_l598_tipo_comprobante' });
                    var serie = recordTransaction.getText({ fieldId: 'custbody_l598_serie_comprobante' });
                    var docXML = recordTransaction.getValue({ fieldId: 'custbody_l598_documento_xml_fe' });
                    var docJSON = recordTransaction.getValue({ fieldId: 'custbody_l598_informacion_json_tran_fe' });
                    codigoSerie = recordTransaction.getText({ fieldId: 'custbody_l598_codigo_serie' });
                    sucursalText = recordTransaction.getText({ fieldId: 'custbody_l598_codigo_sucursal' });
                    log.debug(proceso, 'recId: ' + recId + ' - recType: ' + recType + ' - docXML: ' + docXML);
                    var cae = recordTransaction.getValue({ fieldId: 'custbody_l598_cae' });
                    subsidiaria = recordTransaction.getValue({ fieldId: 'subsidiary' });
                    if (!utilities.isEmpty(docXML)) {

                        if (utilities.isEmpty(cae)) {
                            //Obtengo Usuario para Enviar Email
                            // var usuarioEmail = nlapiGetUser();
                            var userObj = runtime.getCurrentUser();
                            // log.debug(proceso, 'Current user email: ' + userObj.email);

                            var usuarioEmail = userObj.email;
                            if (utilities.isEmpty(usuarioEmail)) {
                                usuarioEmail = "";
                            }

                            var new_url = url.resolveScript({
                                scriptId: 'customscript_l598_conexion_directa_fe_sl',
                                deploymentId: 'customdeploy1'
                            });

                            var idTransaccion = recId;

                            var postData = {
                                idTransaccion: recId,
                                typeTransaccion: recType,
                                idXML: docXML,
                                idJSON: docJSON
                            };

                            log.debug(proceso, 'postData: ' + JSON.stringify(postData));

                            var response = '';
                            var verificacionCAETransaccionDetalleLogFE = verificarCAETransaccionDetalleLogFE(recordTransaction);

                            log.debug(proceso, 'verificacionCAETransaccionDetalleLogFE: ' + JSON.stringify(verificacionCAETransaccionDetalleLogFE));

                            if (!verificacionCAETransaccionDetalleLogFE.poseeCAE && !verificacionCAETransaccionDetalleLogFE.error) {
                                response = https.post({
                                    url: new_url,
                                    body: postData
                                });
                            }

                            if (!utilities.isEmpty(response) && !verificacionCAETransaccionDetalleLogFE.error && !verificacionCAETransaccionDetalleLogFE.poseeCAE) {

                                var erroresRespuesta = "";
                                log.debug(proceso, 'Response Suitelet: ' + JSON.stringify(response.body));
                                var informacionRespuestaAux = JSON.parse(response.body);

                                if (!utilities.isEmpty(informacionRespuestaAux) && informacionRespuestaAux.length > 0) {

                                    log.debug(proceso, "LINE 141 - Remaining Usage = " + currentScript.getRemainingUsage() + ' --- time: ' + new Date());

                                    var informacionRespuesta = informacionRespuestaAux[0];

                                    if (!informacionRespuesta.error) {

                                        var respuestaFinal = informacionRespuesta.mensajeFinal + '\n';

                                        if (!utilities.isEmpty(informacionRespuesta.mensajeError)) {
                                            erroresRespuesta = informacionRespuesta.mensajeError;
                                            respuestaFinal += 'Detalles: ' + erroresRespuesta + '\n';
                                        }
                                        var informacionCAE = informacionRespuesta.objetoRespuestaWS;
                                        log.debug(proceso, 'informacionCAE: ' + JSON.stringify(informacionCAE));

                                        if (!utilities.isEmpty(informacionCAE) && !utilities.isEmpty(informacionCAE.CAEGENERADO)) {

                                            var CAEGENERADO = false;
                                            if (!utilities.isEmpty(informacionCAE.CAEGENERADO) && informacionCAE.CAEGENERADO == 'SI') {
                                                CAEGENERADO = true;
                                            }

                                            var CAE = informacionCAE.CAE;
                                            var CAEVencimiento = informacionCAE.CAEVencimiento;

                                            if ((CAEGENERADO == true && !utilities.isEmpty(CAE) && !utilities.isEmpty(CAEVencimiento)) || (CAEGENERADO != true)) {

                                                var CAEVencimientoFinal = '';
                                                if (!utilities.isEmpty(CAEVencimiento)) {
                                                    CAEVencimientoFinal = CAEVencimiento.toString();
                                                }

                                                // Obtengo Informacion de transacción del Proveedor de FE
                                                var fechaSolicitudAFIPFinal = "";
                                                var fechaRespuestaAFIPFinal = "";
                                                var infoEnviadaAFIP = informacionCAE.infoEnviadaAFIP;

                                                if (utilities.isEmpty(infoEnviadaAFIP)) {
                                                    infoEnviadaAFIP = "";
                                                }

                                                var infoRespuestaAFIP = informacionCAE.infoRespuestaAFIP;
                                                if (utilities.isEmpty(infoRespuestaAFIP)) {
                                                    infoRespuestaAFIP = "";
                                                }

                                                var descripcionErrorFinal = "";
                                                if (!utilities.isEmpty(infoRespuestaAFIP)) {
                                                    descripcionErrorFinal = infoRespuestaAFIP.substring(0, 3995)
                                                }

                                                var fechaSolicitudAFIP = informacionCAE.fechaSolicitudAFIP;
                                                if (utilities.isEmpty(fechaSolicitudAFIP)) {
                                                    fechaSolicitudAFIP = "";
                                                } else {
                                                    fechaSolicitudAFIPFinal = fechaSolicitudAFIP;
                                                }

                                                var fechaRespuestaAFIP = informacionCAE.fechaRespuestaAFIP;
                                                if (utilities.isEmpty(fechaRespuestaAFIP)) {
                                                    fechaRespuestaAFIP = "";
                                                } else {
                                                    fechaRespuestaAFIPFinal = fechaRespuestaAFIP;
                                                }

                                                var codigoBarras = informacionCAE.codigoBarras;
                                                if (utilities.isEmpty(codigoBarras)) {
                                                    codigoBarras = "";
                                                }

                                                // INICIO Informacion Adicional
                                                var codigoSeguridad = informacionCAE.CODSEGURIDAD;
                                                if (utilities.isEmpty(codigoSeguridad)) {
                                                    codigoSeguridad = "";
                                                }

                                                var urlVerificacion = informacionCAE.URLVERIFICACION;
                                                if (utilities.isEmpty(urlVerificacion)) {
                                                    urlVerificacion = "";
                                                }

                                                var urlVerificacionQR = informacionCAE.URLVERIFICACIONQR;
                                                if (utilities.isEmpty(urlVerificacionQR)) {
                                                    urlVerificacionQR = "";
                                                }

                                                var caeNumero = informacionCAE.CAENRO;
                                                if (utilities.isEmpty(caeNumero)) {
                                                    caeNumero = "";
                                                }

                                                var caeSerie = informacionCAE.CAESERIE;
                                                if (utilities.isEmpty(caeSerie)) {
                                                    caeSerie = "";
                                                }

                                                var fechaFirma = informacionCAE.FechaFirma;
                                                if (utilities.isEmpty(fechaFirma)) {
                                                    fechaFirma = "";
                                                }

                                                var caeNroInicial = informacionCAE.CAENROINICIAL;
                                                if (utilities.isEmpty(caeNroInicial)) {
                                                    caeNroInicial = "";
                                                }

                                                var caeNroFinal = informacionCAE.CAENROFINAL;
                                                if (utilities.isEmpty(caeNroFinal)) {
                                                    caeNroFinal = "";
                                                }

                                                var resolucionIVA = informacionCAE.RESOLUCIONIVA;
                                                if (utilities.isEmpty(resolucionIVA)) {
                                                    resolucionIVA = "";
                                                }

                                                var correspondeSobre = informacionCAE.CORRESPONDESOBRE;
                                                if (!utilities.isEmpty(correspondeSobre) && correspondeSobre == 1) {
                                                    correspondeSobre = true;
                                                } else {
                                                    correspondeSobre = false;
                                                }

                                                if (!CAEGENERADO || utilities.isEmpty(CAE) || CAE == "0" || CAE == 0) {
                                                    CAE = '';
                                                    CAEVencimientoFinal = '';
                                                    codigoBarras = '';
                                                }

                                                try {

                                                    log.debug(proceso, "LINE 243 - Remaining Usage = " + currentScript.getRemainingUsage() + ' --- time: ' + new Date());
                                                    
                                                    informacionAuxiliarCAE = agruparInformacionCAE(infoEnviadaAFIP, descripcionErrorFinal, fechaSolicitudAFIPFinal, fechaRespuestaAFIPFinal, codigoSeguridad, urlVerificacion, urlVerificacionQR, caeNumero, caeSerie, fechaFirma, caeNroInicial, caeNroFinal, resolucionIVA, correspondeSobre, CAE, CAEVencimientoFinal, codigoBarras);
                                                    var objGrabarDatos = grabarDatosCAE(informacionAuxiliarCAE, recType, recordTransaction, CAEGENERADO, codigoEstadoSinError, tipoMensajeSinError, erroresRespuesta, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, informacionAuxiliarCAE, codigoEstadoError, tipoMensajeErrorCAE, recId);
                                                    idLog = objGrabarDatos.idLog;
                                                    caeRecibido = objGrabarDatos.cae; 
                                                    log.debug(proceso, "LINE 246 - Remaining Usage = " + currentScript.getRemainingUsage() + ' --- time: ' + new Date());
                                                    mensaje = respuestaFinal;
                                                    // Grabo el Record Trnasaccion
                                                    alert_msg(respuestaFinal);

                                                } catch (error) {
                                                    mensaje = "Excepción Actualizando CAE de Transacción en NetSuite - ID Interno Transaccion : " + idTransaccion + " - Excepcion : " + error.message;
                                                    log.error(proceso, mensaje);
                                                    errorProceso = true;
                                                    informacionAuxiliarCAE = (!CAEGENERADO || utilities.isEmpty(CAE) || CAE == "0" || CAE == 0) ? '' : informacionAuxiliarCAE;
                                                    idLog = grabarError(codigoEstadoError, tipoMensajeErrorCAE, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, informacionAuxiliarCAE, recordTransaction);
                                                    alert_msg(mensaje);
                                                }
                                            } else {
                                                mensaje = 'Error - No se complen con las condiciones para generar CAE, verifique fecha de vencimiento o el proceso de generación de CAE.';
                                                log.error(proceso, mensaje);
                                                errorProceso = true;
                                                idLog = grabarError(codigoEstadoError, tipoMensajeErrorCAE, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', recordTransaction);
                                                alert_msg(mensaje);
                                            }
                                        } else {
                                            mensaje = 'Error - No se recibió información del web services para grabar el resultado de CAE.';
                                            log.error(proceso, mensaje);
                                            errorProceso = true;
                                            idLog = grabarError(codigoEstadoError, tipoMensajeErrorCAE, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', recordTransaction);
                                            alert_msg(mensaje);
                                        }

                                        log.debug(proceso, "LINE 153 - Remaining Usage = " + currentScript.getRemainingUsage() + ' --- time: ' + new Date());
                                    } else {
                                        // Muestro los errores ocurridos
                                        if (!utilities.isEmpty(informacionRespuesta.mensajeError)) {
                                            erroresRespuesta = 'Error en el proceso de CAE - Detalles: ' + informacionRespuesta.mensajeError;
                                        }
                                        errorProceso = true;
                                        mensaje = erroresRespuesta;
                                        log.error(proceso, erroresRespuesta);
                                        idLog = grabarError(codigoEstadoError, tipoMensajeErrorCAE, erroresRespuesta, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', recordTransaction);
                                        alert_msg(erroresRespuesta);
                                    }
                                } else {
                                    mensaje = "Error obteniendo información de Suitelet generador de CAE - Respuesta OBJECT: nula/vacía";
                                    log.error(proceso, mensaje);
                                    errorProceso = true;
                                    idLog = grabarError(codigoEstadoError, tipoMensajeErrorCAE, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', recordTransaction);
                                    alert_msg(mensaje);
                                }

                            } else if (utilities.isEmpty(response) && !verificacionCAETransaccionDetalleLogFE.error && verificacionCAETransaccionDetalleLogFE.poseeCAE) {

                                try {

                                    var informacionCAEDetalleLog = JSON.parse(verificacionCAETransaccionDetalleLogFE.informacionCAE);
                                    var mensajeRespuesta = 'ID Interno Transacción : ' + refTransaccion + ' - Comprobante :  ' + tipoTransaccion.toString() + ' ' + codigoSerie.toString() + '-' + sucursalText.toString() + '-' + refTransaccion + ' / CAE: ' + informacionCAEDetalleLog.CAE;
                                    mensaje = mensajeRespuesta;
                                    var objGrabarDatos = grabarDatosCAE(informacionCAEDetalleLog, recType, recordTransaction, true, codigoEstadoSinError, tipoMensajeSinError, mensajeRespuesta, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, informacionCAEDetalleLog, codigoEstadoError, tipoMensajeErrorCAE, recId);
                                    idLog = objGrabarDatos.idLog;
                                    caeRecibido = objGrabarDatos.cae; 
                                    log.debug(proceso, 'Generación de CAE OK.');

                                    alert_msg('La transacción ya posee CAE generado previamente y sus datos están registrados de manera interna en los registros del RT "URU-Factura Electrónica Detalle Log" de la transacción actual, se procedió a actualizar la transacción con dichos datos. \n \n ' + mensajeRespuesta);
                                } catch (error) {
                                    mensaje = 'La transacción ya posee CAE generado previamente y sus datos están registrados de manera interna en los registros del RT "URU-Factura Electrónica Detalle Log" de la transacción actual. \n \n Excepción Actualizando CAE de Transacción en NetSuite - ID Interno Transaccion : ' + idTransaccion + ' - Excepcion : ' + error.message;
                                    log.error(proceso, mensaje);
                                    errorProceso = true;
                                    idLog = grabarError(codigoEstadoError, tipoMensajeErrorCAE, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', recordTransaction);
                                    alert_msg(mensaje);
                                }

                            } else if (verificacionCAETransaccionDetalleLogFE.error) {
                                mensaje = verificacionCAETransaccionDetalleLogFE.mensaje;
                                log.error(proceso, mensaje);
                                errorProceso = true;
                                idLog = grabarError(codigoEstadoError, tipoMensajeErrorCAE, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', recordTransaction);
                                alert_msg(mensaje);
                            } else {
                                mensaje = "Error obteniendo información de Suitelet generador de CAE - Respuesta JSON: nula/vacía";
                                log.error(proceso, mensaje);
                                errorProceso = true;
                                idLog = grabarError(codigoEstadoError, tipoMensajeErrorCAE, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', recordTransaction);
                                alert_msg(mensaje);
                            }
                        } else {
                            mensaje = "La transacción ya posee CAE.";
                            errorProceso = true;
                            alert_msg(mensaje);
                            log.error(proceso, mensaje);
                            idLog = grabarError(codigoEstadoError, tipoMensajeErrorCAE, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', recordTransaction);
                        }
                    } else {
                        mensaje = "La transacción no posee asociado el XML con los datos para generar CAE, proceda a editar la transacción y a guardarla nuevamente para posteriormente generar el CAE";
                        alert_msg(mensaje);
                        errorProceso = true;
                        log.error(proceso, mensaje);
                        idLog = grabarError(codigoEstadoError, tipoMensajeErrorCAE, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', recordTransaction);
                    }
                }
            } catch (error) {
                mensaje = 'Excepción inesperada en la función generarCAE - Detalles: ' + error.message;
                log.error(proceso, mensaje);
                errorProceso = true;
                idLog = grabarError(codigoEstadoError, tipoMensajeErrorCAE, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', recordTransaction);
                alert_msg(mensaje);
            }

            log.debug("Mensaje", mensaje);
            if(!utilities.isEmpty(mensaje)){
                var userObj = runtime.getCurrentUser();
                // log.debug(proceso, 'Current user email: ' + userObj.email);

                var usuarioEmail = userObj.email;
                envioEmail(errorProceso, caeRecibido, tipoTransaccion, codigoSerie, sucursalText, refTransaccion, subsidiaria, idLog, mensaje,userObj.id );
            }
            

            log.debug(proceso, "FIN - Generar CAE (CL) - unidades disponibles: " + currentScript.getRemainingUsage() + ' --- time: ' + new Date());
        }

        function grabarError(codigoEstado, codigoMensaje, detalleMensaje, puntoVenta, tipoComprobante, refLog, refTransaccion, serie, informacionAuxiliarCAE, recordTransaction) {

            var proceso = 'grabarError';
            log.debug(proceso, 'INICIO PROCESO - grabarError - parámetros - codigoEstado: ' + codigoEstado + ' - codigoMensaje: ' + codigoMensaje + ' - detalleMensaje: ' + detalleMensaje + ' - puntoVenta: ' + puntoVenta + ' - tipoComprobante: ' + tipoComprobante + ' - refLog: ' + refLog + ' - refTransaccion: ' + refTransaccion + ' - serie: ' + serie + ' - informacionAuxiliarCAE: ' + informacionAuxiliarCAE);
            var idRL;

            try {
                idRL = refLog;
                var idRDL = null;
                var fechaActual = parseDate();
                var formattedDate = '';

                if (!utilities.isEmpty(recordTransaction)){
                    var fecha = recordTransaction.getValue({ fieldId: 'trandate' })
                    var date = new Date(fecha);
        
                    var day = date.getDate();
                    var month = date.getMonth() + 1;
                    var year = date.getFullYear();
        
                    day = day < 10 ? '0' + day : day;
                    month = month < 10 ? '0' + month : month;
        
                    formattedDate = day + '/' + month + '/' + year;
                }

                if (utilities.isEmpty(idRL)) {

                    var recordLog = record.create({ type: 'customrecord_l598_fact_elec_log' });

                    // Genero la Fecha
                    recordLog.setValue({ fieldId: 'custrecord_l598_fact_elec_log_fecha', value: fechaActual });

                    if (!utilities.isEmpty(codigoEstado))
                        recordLog.setValue({ fieldId: 'custrecord_l598_fact_elec_log_estado', value: codigoEstado });

                    if (!utilities.isEmpty(puntoVenta))
                        recordLog.setValue({ fieldId: 'custrecord_l598_fact_elec_log_suc', value: puntoVenta });

                    if (!utilities.isEmpty(tipoComprobante))
                        recordLog.setValue({ fieldId: 'custrecord_l598_fact_elec_log_tipo_comp', value: tipoComprobante });

                    if (!utilities.isEmpty(serie))
                        recordLog.setValue({ fieldId: 'custrecord_l598_fact_elec_log_serie', value: serie });

                    idRL = recordLog.save();
                }

                if (!utilities.isEmpty(idRL)) {

                    var recordDetalleLog = record.create({ type: 'customrecord_l598_fact_elec_dlog' });
                    recordDetalleLog.setValue({ fieldId: 'custrecord_l598_fact_elec_dlog_fecha', value: fechaActual });

                    if (!utilities.isEmpty(codigoMensaje))
                        recordDetalleLog.setValue({ fieldId: 'custrecord_l598_fact_elec_dlog_msg', value: codigoMensaje });

                    if (!utilities.isEmpty(detalleMensaje))
                        recordDetalleLog.setValue({ fieldId: 'custrecord_l598_fact_elec_dlog_det', value: detalleMensaje });

                    if (!utilities.isEmpty(idRL))
                        recordDetalleLog.setValue({ fieldId: 'custrecord_l598_fact_elec_dlog_rlog', value: idRL });

                    if (!utilities.isEmpty(refTransaccion))
                        recordDetalleLog.setValue({ fieldId: 'custrecord_l598_fact_elec_dlog_rtrans', value: refTransaccion });

                    if (!utilities.isEmpty(informacionAuxiliarCAE)) {
                        recordDetalleLog.setValue({ fieldId: 'custrecord_l598_fact_elec_dlog_datos_cae', value: (JSON.stringify(informacionAuxiliarCAE)).replace(/TRANSACTIONDATE/g, formattedDate) });
                        recordDetalleLog.setValue({ fieldId: 'custrecord_l598_fact_elec_dlog_cae_gener', value: true });
                    }

                    idRDL = recordDetalleLog.save();
                }

                log.debug(proceso, 'id log FE: ' + idRL + ' - id detalle log FE: ' + idRDL);
                
            } catch (error) {
                log.error(proceso, 'Excepción Grabando Log de Proceso de Factura Electrónica - Excepción: ' + error.message);
                return false;
            }
            log.debug(proceso, 'FIN PROCESO - grabarError.');
            return idRL;
        }

        function envioEmail(errorProceso, CAENRO, tipoDocumento, codigoSerie, sucursal, internalId, subsidiaria, idLog, message, userActual){
            try {
                log.debug("Inicio envioEmail", "Se inicia el envioEmail");
                var filtroConf = [];
                filtroConf.push({
                    name: "isinactive",
                    operator: "is",
                    values: false
                });
                if (!utilities.isEmpty(subsidiaria)) {
                    filtroConf.push({
                    name: "custrecord_l598_conf_fe_subsidiaria",
                    operator: "is",
                    values: subsidiaria
                    });
                }

                var configuracionSaveSearch = search.create({
                    type: "customrecord_l598_conf_factura_elec",
                    columns: ["custrecord_l598_conf_fe_url_dom", "custrecord_l598_conf_fe_log", "custrecord_l598_conf_fe_enviar_email", "custrecord_l598_conf_fe_empleado_notific"],
                    filters: filtroConf
                  });

                var resultadoConf = configuracionSaveSearch.run().getRange({
                    start: 0,
                    end: 1
                });
                if (!utilities.isEmpty(resultadoConf) && resultadoConf.length > 0) {
                    var urlLog = resultadoConf[0].getValue("custrecord_l598_conf_fe_log");
                    var urlDominio = resultadoConf[0].getValue("custrecord_l598_conf_fe_url_dom");
                    var enviarEmail = resultadoConf[0].getValue("custrecord_l598_conf_fe_enviar_email");
                    var emailUsuario = resultadoConf[0].getValue("custrecord_l598_conf_fe_empleado_notific");
                    log.debug("URU - Factura Electronica", "ID Empleado : " + emailUsuario + ",urlLog:" + urlLog + ",urlDominio:" + urlDominio + ",enviarEmail: " + enviarEmail + ",emailUsuario:" + emailUsuario + "CAENRO: "+ CAENRO + "errorProceso:" + errorProceso);
                    var esquema = 'https://';
                    var host = url.resolveDomain({
                        hostType: url.HostType.APPLICATION
                    });
                    var rutaRelativa = url.resolveRecord({
                        recordType: 'customrecord_l598_fact_elec_log',
                        recordId: idLog,
                        isEditMode: false
                    });

                    var urlRT = esquema + host + rutaRelativa;
                    if (!utilities.isEmpty(enviarEmail) && enviarEmail === true) {
                        
                        var body = '';

                        if (!errorProceso && !utilities.isEmpty(CAENRO)){
                            body += '<p>Estimado(a) :</p>';
                            body += '<p>Se ha generado el número de CAE: ' + CAENRO + ' para la transacción de ' + tipoDocumento + ' con la serie ' + codigoSerie + ', Sucursal '+ sucursal +'  e Internal ID ' + internalId + '.</p>';
                            body += '<p>Puede Observar  el Detalle de las Transacciones Procesadas desde el Siguiente link.</p>';
                            body += "<a href=\"" + urlRT + "\"> Informacion Generacion de CAE </a>";
                            body += '<p>Atentamente,</p>';
                            body += '<br>';
                            body += '<p><strong>***NO RESPONDA A ESTE MENSAJE***</strong></p>';
                        } else{
                            body += '<p>Estimado(a) :</p>';
                            body += '<p>Se ha generado un error al intentar generar el CAE para la transacción de ' + tipoDocumento + ' con la serie ' + codigoSerie + ', Sucursal '+ sucursal +'  e Internal ID ' + internalId + '.</p>';
                            body += '<p>Detalles del error ocurrido: ' + message + '.</p>';
                            body += "<p>Puede Observar el Detalle de Errores desde el Siguiente link. </p> ";
                            body += "<a href=\"" + urlRT + "\"> Informacion Generacion de CAE </a>";
                            body += '<p>Atentamente,</p>';
                            body += '<br>';
                            body += '<p><strong>***NO RESPONDA A ESTE MENSAJE***</strong></p>';
                        }
                        log.debug("body", body);

                        var arrRec = [emailUsuario]
                        if (!utilities.isEmpty(userActual)) {
                            var arrRec = [emailUsuario, userActual]
                        }

                        email.send({
                            author: emailUsuario,
                            recipients: arrRec,
                            subject: "NetSuite - Proceso de generación de CAE",
                            body: body,
                        });

                    }
                }
                log.debug("Fin envioEmail", "Se termina el envioEmail");
            } catch (error) {
                log.error("Envio", 'Excepción Enviando Email Log de Proceso de Factura Electrónica - Excepción: ' + error.message);
            }
        }
        /* function parseDate(fecha) {

            if (!utilities.isEmpty(fecha)) {
                var fechaFormateada = format.parse({
                    value: fecha,
                    type: format.Type.DATE,
                    timezone: format.Timezone.AMERICA_MONTEVIDEO
                });
            } else {
                var fechaFormateada = new Date();
            }

            currentDateTime = fechaFormateada;
            var companyTimeZone = config.load({ type: config.Type.COMPANY_INFORMATION }).getText({ fieldId: 'timezone' });
            var timeZoneOffSet = (companyTimeZone.indexOf('(GMT)') == 0) ? 0 : Number(companyTimeZone.substr(4, 6).replace(/\+|:00/gi, '').replace(/:30/gi, '.5'));
            var UTC = currentDateTime.getTime() + (currentDateTime.getTimezoneOffset() * 60000);
            var companyDateTime = UTC + (timeZoneOffSet * 60 * 60 * 1000);

            return new Date(companyDateTime);
        } */

        function padding_left(s, c, n) {

            if (!s || !c || s.toString().length >= n) {
                return s;
            }
            var max = (n - s.toString().length) / c.toString().length;
            for (var i = 0; i < max; i++) {
                s = c + s;
            }
            return s;
        }

        function parseDate(fecha) {

            if (!utilities.isEmpty(fecha)) {
                var fechaFormateada = format.parse({
                    value: fecha,
                    type: format.Type.DATE,
                    timezone: format.Timezone.AMERICA_MONTEVIDEO
                });
            } else {
                var fechaFormateada = new Date();
            }

            return fechaFormateada;
        }

        /**
         * Retorna los datos de la solicitud de generación de CAE
         * @param {string} infoEnviadaAFIP - Información con los datos enviado para generar CAE
         * @param {string} descripcionErrorFinal - Descripción del mensaje final
         * @param {string} fechaSolicitudAFIPFinal - Fecha de la solicitud de CAE
         * @param {string} fechaRespuestaAFIPFinal - Fecha de la respuesta de CAE
         * @param {string} codigoSeguridad - Código de seguridad de CAE
         * @param {string} urlVerificacion - URL de verificación de CAE
         * @param {string} urlVerificacionQR - URL de verificación de QR de CAE
         * @param {string} caeNumero - Número de CAE
         * @param {string} caeSerie - Número de serie de CAE
         * @param {string} fechaFirma - Fecha de la Firma de CAE
         * @param {string} caeNroInicial - Número inicial de CAE
         * @param {string} caeNroFinal - Número final de CAE
         * @param {string} resolucionIVA - Resolución IVA
         * @param {string} correspondeSobre - Datos corresponde sobre
         * @param {string} CAE - Número de CAE generado
         * @param {string} CAEVencimientoFinal - Fecha Vencimiento de CAE.
         * @param {string} codigoBarras - Código de Barras de CAE.
         *
         * @return {object} informacionCAE - Objeto con la información de CAE.
         * @property {string} informacionCAE.infoEnviadaAFIP - Información con los datos enviado para generar CAE
         * @property {string} informacionCAE.descripcionErrorFinal - Descripción del mensaje final
         * @property {string} informacionCAE.fechaSolicitudAFIPFinal - Fecha de la solicitud de CAE
         * @property {string} informacionCAE.fechaRespuestaAFIPFinal - Fecha de la respuesta de CAE
         * @property {string} informacionCAE.codigoSeguridad - Código de seguridad de CAE
         * @property {string} informacionCAE.urlVerificacion - URL de verificación de CAE
         * @property {string} informacionCAE.urlVerificacionQR - URL de verificación de QR de CAE
         * @property {string} informacionCAE.caeNumero - Número de CAE
         * @property {string} informacionCAE.caeSerie - Número de serie de CAE
         * @property {string} informacionCAE.fechaFirma - Fecha de la Firma de CAE
         * @property {string} informacionCAE.caeNroInicial - Número inicial de CAE
         * @property {string} informacionCAE.caeNroFinal - Número final de CAE
         * @property {string} informacionCAE.resolucionIVA - Resolución IVA
         * @property {string} informacionCAE.correspondeSobre - Datos corresponde sobre
         * @property {string} informacionCAE.CAE - Número de CAE generado
         * @property {string} informacionCAE.CAEVencimientoFinal - Fecha Vencimiento de CAE.
         * @property {string} informacionCAE.codigoBarras - Código de Barras de CAE.
        */
        function agruparInformacionCAE(infoEnviadaAFIP, descripcionErrorFinal, fechaSolicitudAFIPFinal, fechaRespuestaAFIPFinal, codigoSeguridad, urlVerificacion, urlVerificacionQR, caeNumero, caeSerie, fechaFirma, caeNroInicial, caeNroFinal, resolucionIVA, correspondeSobre, CAE, CAEVencimientoFinal, codigoBarras) {

            var proceso = 'agruparInformacionCAE';
            var informacionCAE = {};

            try {
                informacionCAE.infoEnviadaAFIP = infoEnviadaAFIP;
                informacionCAE.descripcionErrorFinal = descripcionErrorFinal;
                informacionCAE.fechaSolicitudAFIPFinal = fechaSolicitudAFIPFinal;
                informacionCAE.fechaRespuestaAFIPFinal = fechaRespuestaAFIPFinal;
                informacionCAE.codigoSeguridad = codigoSeguridad;
                informacionCAE.urlVerificacion = urlVerificacion;
                informacionCAE.urlVerificacionQR = urlVerificacionQR;
                informacionCAE.caeNumero = caeNumero;
                informacionCAE.caeSerie = caeSerie;
                informacionCAE.fechaFirma = fechaFirma;
                informacionCAE.caeNroInicial = caeNroInicial;
                informacionCAE.caeNroFinal = caeNroFinal;
                informacionCAE.resolucionIVA = resolucionIVA;
                informacionCAE.correspondeSobre = correspondeSobre;
                informacionCAE.CAE = CAE;
                informacionCAE.CAEVencimientoFinal = CAEVencimientoFinal;
                informacionCAE.codigoBarras = codigoBarras;
            } catch (error) {
                log.error(proceso, 'Error al agrupar información de CAE - Detalles: ' + error.message);
            }

            return informacionCAE;
        }

        /**
         * Retorna los datos de CAE del RT URU-Factura Electronica Detalle Log
         * @param {Object} recordTransaction - Record Transacción
         *
         * @return {Object} response.
         * @property {int} response.informacionCAE - Información de CAE del registro de URU-Factura Electronica Detalle Log
         * @property {Boolean} response.error - True si existe un error en el proceso / False si no existe un error en el proceso
         * @property {String} response.mensaje - Mensaje de error generado
         * @property {Boolean} response.poseeCAE - True si existe CAE generado / False si no existe CAE generado
         */
        function verificarCAETransaccionDetalleLogFE(recordTransaction) {

            var proceso = 'verificarCAETransaccionDetalleLogFE';
            var response = { error: false, mensaje: '', informacionCAE: '', poseeCAE: false };

            log.debug(proceso, 'INICIO - verificarCAETransaccionDetalleLogFE');

            try {
                var cantDetalleLog = recordTransaction.getLineCount({ sublistId: 'recmachcustrecord_l598_fact_elec_dlog_rtrans' });
                log.debug(proceso, 'cantDetalleLog: ' + cantDetalleLog);

                for (var j = 0; j < cantDetalleLog; j++) {

                    recordTransaction.selectLine({ sublistId: 'recmachcustrecord_l598_fact_elec_dlog_rtrans', line: j });
                    var datosCAE = recordTransaction.getCurrentSublistValue({ sublistId: 'recmachcustrecord_l598_fact_elec_dlog_rtrans', fieldId: 'custrecord_l598_fact_elec_dlog_datos_cae' });
                    var caeGenerado = recordTransaction.getCurrentSublistValue({ sublistId: 'recmachcustrecord_l598_fact_elec_dlog_rtrans', fieldId: 'custrecord_l598_fact_elec_dlog_cae_gener' });

                    /* var datosCAE = recordTransaction.getSublistValue({sublistId: 'recmachcustrecord_l598_fact_elec_dlog_rtrans', fieldId: 'custrecord_l598_fact_elec_dlog_datos_cae', line: j });
                    var caeGenerado = recordTransaction.getSublistValue({ sublistId: 'recmachcustrecord_l598_fact_elec_dlog_rtrans', fieldId: 'custrecord_l598_fact_elec_dlog_cae_gener', line: j }); */

                    if (!utilities.isEmpty(datosCAE) && caeGenerado) {
                        response.informacionCAE = datosCAE;
                        response.poseeCAE = true;
                        j = cantDetalleLog;
                        break;
                    }
                }
            } catch (error) {
                response.mensaje = 'Error al extraer información de CAE del RT URU-Factura Electronica Detalle Log - Detalles: ' + error.message;
                response.error = true;
                log.error(proceso, response.mensaje);
            }

            log.debug(proceso, 'FIN - verificarCAETransaccionDetalleLogFE');
            return response;
        }

        /**
         * Graba los datos de la transacción con CAE
         * @param {Object} informacionCAE - Información de CAE
         * @param {string} recType - Tipo de Registro
         * @param {string} recordTransaction - Record Transacción
         * @param {Boolean} CAEGENERADO - True si existe CAE / False si no existe
         * @param {string} codigoEstadoSinError - Código de Mensaje sin Error
         * @param {string} tipoMensajeSinError - Tipo Mensaje sin Error
         * @param {string} erroresRespuesta - Mensaje Respuesta (incluyendo errores)
         * @param {string} punto_venta - Punto de Venta Transacción
         * @param {string} tipoTransaccion - Tipo Transacción L598
         * @param {string} refLog - Referencia al Log padre
         * @param {int} refTransaccion - ID Transacción
         * @param {string} serie - Número de Serie
         * @param {Object} informacionAuxiliarCAE - Información de CAE auxiliar para grabar en el registro de detalle log
         * @param {string} codigoEstadoError - Código Estado Error en CAE
         * @param {string} tipoMensajeErrorCAE - Tipo Mensaje de Error en CAE
         * @param {int} recId - ID Transacción
         */
        function grabarDatosCAE(informacionCAE, recType, recordTransaction, CAEGENERADO, codigoEstadoSinError, tipoMensajeSinError, erroresRespuesta, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, informacionAuxiliarCAE, codigoEstadoError, tipoMensajeErrorCAE, recId) {

            var proceso = 'grabarDatosCAE';
            var idLog;
            var cae = '';
            var returnObj = {};
            log.debug(proceso, 'INICIO - grabarDatosCAE');

            if (CAEGENERADO == true && !utilities.isEmpty(informacionCAE.CAE) && informacionCAE.CAE != "0" && informacionCAE.CAE != 0) {
                log.debug(proceso, 'Generación de CAE OK.');
                cae = informacionCAE.CAE;
                idLog = grabarError(codigoEstadoSinError, tipoMensajeSinError, erroresRespuesta, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, informacionAuxiliarCAE, recordTransaction);
            } else {
                log.debug(proceso, 'Generación de CAE NULL.');
                idLog = grabarError(codigoEstadoError, tipoMensajeErrorCAE, erroresRespuesta, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', recordTransaction);
            }
            
            var fecha = recordTransaction.getValue({ fieldId: 'trandate' })
            var date = new Date(fecha);

            var day = date.getDate();
            var month = date.getMonth() + 1;
            var year = date.getFullYear();

            day = day < 10 ? '0' + day : day;
            month = month < 10 ? '0' + month : month;

            var formattedDate = day + '/' + month + '/' + year;
            
            if (recType != 'customtransaction_l598_resguardos') {
                recordTransaction.setValue({ fieldId: 'custbody_l598_cae_envio_dgi', value: informacionCAE.infoEnviadaAFIP });
                recordTransaction.setValue({ fieldId: 'custbody_l598_cae_respuesta_dgi', value: informacionCAE.descripcionErrorFinal });
                recordTransaction.setValue({ fieldId: 'custbody_l598_cae_fecha_hora_envio', value: informacionCAE.fechaSolicitudAFIPFinal });
                recordTransaction.setValue({ fieldId: 'custbody_l598_cae_fecha_hora_respuesta', value: informacionCAE.fechaRespuestaAFIPFinal });
                recordTransaction.setValue({ fieldId: 'custbody_l598_codigo_seguridad', value: informacionCAE.codigoSeguridad });
                recordTransaction.setValue({ fieldId: 'custbody_l598_url_verificacion', value: informacionCAE.urlVerificacion });
                recordTransaction.setValue({ fieldId: 'custbody_l598_url_verif_qr', value: informacionCAE.codigoBarras.replace("TRANSACTIONDATE", formattedDate) });
                recordTransaction.setValue({ fieldId: 'custbody_l598_cae_nro', value: informacionCAE.caeNumero });
                recordTransaction.setValue({ fieldId: 'custbody_l598_cae_serie', value: informacionCAE.caeSerie });
                recordTransaction.setValue({ fieldId: 'custbody_l598_fecha_firma', value: informacionCAE.fechaFirma });
                recordTransaction.setValue({ fieldId: 'custbody_l598_cae_nro_inicial', value: informacionCAE.caeNroInicial });
                recordTransaction.setValue({ fieldId: 'custbody_l598_cae_nro_final', value: informacionCAE.caeNroFinal });
                recordTransaction.setValue({ fieldId: 'custbody_l598_resolucion_iva', value: informacionCAE.resolucionIVA });
                recordTransaction.setValue({ fieldId: 'custbody_l598_corresponde_sobre', value: informacionCAE.correspondeSobre });
                recordTransaction.setValue({ fieldId: 'custbody_l598_cae', value: informacionCAE.CAE });
                recordTransaction.setValue({ fieldId: 'custbody_l598_cae_vto', value: informacionCAE.CAEVencimientoFinal });
                recordTransaction.setValue({ fieldId: 'custbody_l598_codigo_qr', value: informacionCAE.codigoBarras.replace("TRANSACTIONDATE", formattedDate) });
            }

            if (!utilities.isEmpty(informacionCAE.CAE) && recType == 'customtransaction_l598_resguardos') {
                //recordTransaction.setValue({ fieldId: 'transtatus', value: 'B' });
                var cantDetalleRet = recordTransaction.getLineCount({ sublistId: 'recmachcustrecord_l598_ret_detalle_resguardo' });
                log.debug(proceso, 'cantDetalleRet: ' + cantDetalleRet);

                for (var j = 0; j < cantDetalleRet; j++) {
                    try {
                        recordTransaction.selectLine({ sublistId: 'recmachcustrecord_l598_ret_detalle_resguardo', line: j });
                        recordTransaction.setCurrentSublistValue({ sublistId: 'recmachcustrecord_l598_ret_detalle_resguardo', fieldId: 'custrecord_l598_ret_detalle_status_resgu', value: 'B', ignoreFieldChange: false });
                        recordTransaction.commitLine({ sublistId: 'recmachcustrecord_l598_ret_detalle_resguardo' });
                    } catch (e) {
                        log.error(proceso, 'ERROR ESTABLECIENDO ESTADO DE RESGUARDO DETALLE: ' + JSON.stringify(e));
                    }
                }
                recordTransaction.save();
            }

            log.debug(proceso, 'LINE 279 - Antes de grabar el Record Transaccion');

            // Grabo el Record Trnasaccion
            if (recType == 'customtransaction_l598_resguardos') {
                var idTransaccionFinal = record.submitFields({
                    type: recType,
                    id: recId,
                    values: {
                        transtatus: 'B',
                        custbody_l598_cae_envio_dgi: informacionCAE.infoEnviadaAFIP,
                        custbody_l598_cae_respuesta_dgi: informacionCAE.descripcionErrorFinal,
                        custbody_l598_cae_fecha_hora_envio: informacionCAE.fechaSolicitudAFIPFinal,
                        custbody_l598_cae_fecha_hora_respuesta: informacionCAE.fechaRespuestaAFIPFinal,
                        custbody_l598_codigo_seguridad: informacionCAE.codigoSeguridad,
                        custbody_l598_url_verificacion: informacionCAE.urlVerificacion,
                        custbody_l598_url_verif_qr: informacionCAE.urlVerificacionQR,
                        custbody_l598_cae_nro: informacionCAE.caeNumero,
                        custbody_l598_cae_serie: informacionCAE.caeSerie,
                        custbody_l598_fecha_firma: informacionCAE.fechaFirma,
                        custbody_l598_cae_nro_inicial: informacionCAE.caeNroInicial,
                        custbody_l598_cae_nro_final: informacionCAE.caeNroFinal,
                        custbody_l598_resolucion_iva: informacionCAE.resolucionIVA,
                        custbody_l598_corresponde_sobre: informacionCAE.correspondeSobre,
                        custbody_l598_cae: informacionCAE.CAE,
                        custbody_l598_cae_vto: informacionCAE.CAEVencimientoFinal,
                        custbody_l598_codigo_qr: informacionCAE.codigoBarras
                    },
                    options: {
                        enablesourcing: false,
                        ignoreMandatoryFields: true
                    }
                });
            } else {
                var idTransaccionFinal = recordTransaction.save();
            }
            
            log.debug(proceso, 'FIN - grabarDatosCAE - idTransaccionFinal: ' + idTransaccionFinal);
            returnObj.idLog = idLog;
            returnObj.cae = cae;

            return returnObj;
        }

        function alert_msg(bodyMessage) {
            /* dialog.alert({
                title: "Mensaje",
                message: bodyMessage
            }).then(function (result) {
                log.debug('alert_msg', "Success with value " + result);
            }).catch(function (reason) {
                log.error('alert_msg', "Failure: " + reason);
            }); */
            alert(bodyMessage);
        }

        return {
            generarCAE: generarCAE
        };
    });