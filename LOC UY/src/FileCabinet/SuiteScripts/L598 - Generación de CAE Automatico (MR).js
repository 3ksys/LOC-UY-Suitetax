/**
 *@NApiVersion 2.1
 *@NScriptType MapReduceScript
 * @NModuleScope Public
 *@NAmdConfig /SuiteScripts/configuration.json
 */
 define(['N/record', 'N/runtime', 'N/search', 'N/format', 'N/url', 'N/https', 'N/error', 'L598/utilities', 'N/email', 'N/log'],
 function (record, runtime, search, format, url, https, error, utilities, email, log) {

     const proceso = "Generación de CAE Automatico (MR)";
     const URLSuitelet = 'customscript_l598_conexion_directa_fe_sl';
     const ImplSuitelet = 'customdeploy1';

     /**
      * Marks the beginning of the Map/Reduce process and generates input data.
      *
      * @typedef {Object} ObjectRef
      * @property {number} id - Internal ID of the record instance
      * @property {string} type - Record type id
      *
      * @return {Array|Object|Search|RecordRef} inputSummary
      * @since 2015.1
      */
     function getInputData() {
         var currScript = runtime.getCurrentScript();

         var respuesta = new Object();
         respuesta.error = false;
         respuesta.mensaje = '';
         respuesta.informacionTransacciones = new Array();
         //respuesta.idLogGeneral ='';

         try {

             /***************************** OBTENER PARAMETROS DE EJECUCION - INICIO ********************************/

             var parametrosEjecucion = obtenerParametros(currScript);

             log.audit(proceso, 'Parametros de Ejecución : ' + JSON.stringify(parametrosEjecucion));

             /***************************** OBTENER PARAMETROS DE EJECUCION - FIN ********************************/

             if (!utilities.isEmpty(parametrosEjecucion) && !utilities.isEmpty(parametrosEjecucion.ssTransaccionesPendCAE)) {
                  /***************************** CREAR RECORD LOG - INICIO ********************************/

                  idLogGeneral = crearLogGeneral(currScript, parametrosEjecucion);

                  log.audit(proceso, 'Respuesta Obtener Transacciones : ' + JSON.stringify(objInformacionTransacciones));

                  /***************************** CREAR RECORD LOGS - FIN ********************************/


                 /***************************** OBTENER TRANSACCIONES - INICIO ********************************/

                 var objInformacionTransacciones = obtenerTransacciones(currScript, parametrosEjecucion, idLogGeneral);

                 log.audit(proceso, 'Respuesta Obtener Transacciones : ' + JSON.stringify(objInformacionTransacciones));

                 /***************************** OBTENER TRANSACCIONES - FIN ********************************/
                
                 if (!utilities.isEmpty(objInformacionTransacciones) && objInformacionTransacciones.error == false
                     && !utilities.isEmpty(objInformacionTransacciones.informacionTransacciones) && objInformacionTransacciones.informacionTransacciones.length > 0) {
                     respuesta.informacionTransacciones = objInformacionTransacciones.informacionTransacciones;
                 }
                 else {

                     if (utilities.isEmpty(objInformacionTransacciones)) {
                         respuesta.error = true;
                         respuesta.mensaje = 'No se recibio objeto con respuesta de la consulta de Transacciones a procesar';
                     }
                     else {
                         if (objInformacionTransacciones.error == true) {
                             respuesta.error = true;
                             respuesta.mensaje = 'Error al obtener las Transacciones a Procesar - Error : ' + objInformacionTransacciones.mensaje;
                         }
                         else {
                             if (utilities.isEmpty(objInformacionTransacciones.informacionTransacciones)) {
                                 respuesta.error = true;
                                 respuesta.mensaje = 'No se recibio objeto con la informacion de Transacciones a procesar';
                             }
                             else {
                                 respuesta.error = false;
                                 respuesta.mensaje = 'No se recibieron Transacciones a procesar';
                             }
                         }
                     }
                 }
             }
             else {
                 respuesta.error = true;
                 if (utilities.isEmpty(parametrosEjecucion)) {
                     respuesta.mensaje = 'No se recibio objeto con la informacion de los Parametros de Ejecucion';
                 }
                 else {
                     respuesta.mensaje = 'No se recibio la siguiente informacion requerida para realizar la generacion de CAE : ';
                     if (utilities.isEmpty(parametrosEjecucion.ssTransaccionesPendCAE)) {
                         respuesta.mensaje += ' / Busqueda Guardada con Transacciones Autorizadas';
                     }
                 }
             }

         } catch (excepcion) {
             log.error(proceso, 'INPUT DATA - Excepcion Generando CAE - Excepcion : ' + excepcion.message.toString());
             log.audit(proceso, 'INPUT DATA - Fin Proceso');

             return null;
         }
         if (respuesta.error == false) {
             log.audit(proceso, 'INPUT DATA - Fin Proceso - Fecha : ' + new Date() + ' - Unidades Disponibles : ' + currScript.getRemainingUsage());
             if (respuesta.informacionTransacciones.length > 0) {
                 return respuesta.informacionTransacciones;
             }
             else {
                 return null;
             }
         }
         else {
             log.error(proceso, 'INPUT DATA - Error Generando CAE - Error : ' + respuesta.mensaje);
             return null;
         }
     }

     /**
      * Executes when the map entry point is triggered and applies to each key/value pair.
      *
      * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
      * @since 2015.1
      */
     function map(context) {
         var currScript = runtime.getCurrentScript();
         try {
             log.audit(proceso, 'MAP - Incio Proceso - Fecha : ' + new Date() + ' - Unidades Disponibles : ' + currScript.getRemainingUsage());
             var resultado = context.value;
             if (!utilities.isEmpty(resultado)) {
                 var informacion = JSON.parse(resultado);
                 if (!utilities.isEmpty(informacion.id) && !utilities.isEmpty(informacion.tipo)) {

                     var obj = new Object();
                     obj = informacion;

                     var clave = obj.tipo + '-' + obj.id;

                     context.write(clave, JSON.stringify(obj));

                 } else {
                     log.error(proceso, 'MAP - Error Obteniendo Resultados de ID de Registro a Procesar');
                 }

             } else {
                 log.error(proceso, 'MAP - Error Parseando Resultados de registro a Procesar');
             }

         } catch (excepcion) {
             log.error(proceso, 'MAP - Excepcion Procesando Registros - Excepcion : ' + excepcion.message.toString());
         }
         log.audit(proceso, 'MAP - Fin Proceso - Fecha : ' + new Date() + ' - Unidades Disponibles : ' + currScript.getRemainingUsage());
     }

     /**
      * Executes when the reduce entry point is triggered and applies to each group.
      *
      * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
      * @since 2015.1
      */
     function reduce(context) {
         var currScript = runtime.getCurrentScript();
         log.audit(proceso, 'REDUCE - Incio Proceso - ID Transaccion : ' + context.key + ' - Fecha : ' + new Date() + ' - Unidades Disponibles : ' + currScript.getRemainingUsage());

         var respuesta = new Object();
         respuesta.error = false;
         respuesta.mensaje = '';
         respuesta.tipo = '';
         respuesta.id = '';
         respuesta.cae = '';

         try {

             if (!utilities.isEmpty(context.key) && !utilities.isEmpty(context.values) && context.values.length > 0) {
                 for (var i = 0; !utilities.isEmpty(context.values) && context.values.length > 0 && i < context.values.length; i++) {
                     var registro = JSON.parse(context.values[i]);
                     if (!utilities.isEmpty(registro.id) && !utilities.isEmpty(registro.tipo)) {
                         log.audit(proceso, 'Transacciones A Ejecutar : ' + JSON.stringify(context));

                         respuesta.id = registro.id;
                         respuesta.tipo = registro.tipo;
                         respuesta.idLog = registro.idLog;
                         /***************************** OBTENER PARAMETROS DE EJECUCION - FIN ********************************/
                         var parametrosEjecucion = obtenerParametros(currScript);

                         log.audit(proceso, 'Parametros de Ejecución : ' + JSON.stringify(parametrosEjecucion));

                         /***************************** OBTENER PARAMETROS DE EJECUCION - FIN ********************************/

                         if (!utilities.isEmpty(parametrosEjecucion)
                             && !utilities.isEmpty(parametrosEjecucion.codigoEstadoError) && !utilities.isEmpty(parametrosEjecucion.codigoEstadoSinError)
                             && !utilities.isEmpty(parametrosEjecucion.tipoMensajeErrorConfiguracionFE) && !utilities.isEmpty(parametrosEjecucion.tipoMensajeErrorCAE)
                             && !utilities.isEmpty(parametrosEjecucion.tipoMensajeErrorInesperadoXML) && !utilities.isEmpty(parametrosEjecucion.tipoMensajeSinError)
                             && !utilities.isEmpty(parametrosEjecucion.tipoMensajeErrorBoton)) {
                             // INICIO - Generar CAE
                             objRespuestaCAE = generarCAE(currScript, parametrosEjecucion, registro.tipo, registro.id, registro.idLog);
                             // FIN - Generar CAE
                             if (!utilities.isEmpty(objRespuestaCAE) && objRespuestaCAE.error == false
                                 && !utilities.isEmpty(objRespuestaCAE.id) && !utilities.isEmpty(objRespuestaCAE.tipo)
                                 && !utilities.isEmpty(objRespuestaCAE.cae)) {
                                 respuesta.mensaje = 'CAE Generado Correctamente - Respuesta : ' + JSON.stringify(objRespuestaCAE);
                                 respuesta.cae = objRespuestaCAE.cae;
                             }
                             else {
                                 // Error Generando Lote
                                 respuesta.error = true;
                                 if (utilities.isEmpty(objRespuestaCAE)) {
                                     respuesta.mensaje = 'No se recibio objeto con la informacion del CAE Generado';
                                 }
                                 else {
                                     if (objRespuestaCAE.error == true) {
                                         respuesta.mensaje = 'Error Generando CAE - Error : ' + objRespuestaCAE.mensaje;
                                     }
                                     else {
                                         respuesta.mensaje = 'No se recibio la siguiente informacion relacionada al CAE Generado : ';
                                         if (utilities.isEmpty(objRespuestaCAE.id)) {
                                             respuesta.mensaje += ' / ID de la Transaccion';
                                         }
                                         if (utilities.isEmpty(objRespuestaCAE.tipo)) {
                                             respuesta.mensaje += ' / Tipo de Transaccion';
                                         }
                                         if (utilities.isEmpty(objRespuestaCAE.cae)) {
                                             respuesta.mensaje += ' / CAE Generado';
                                         }
                                     }
                                 }
                             }
                         }
                         else {
                             respuesta.error = true;
                             if (utilities.isEmpty(parametrosEjecucion)) {
                                 respuesta.mensaje = 'No se recibio objeto con la informacion de los Parametros de Ejecucion';
                             }
                             else {
                                 if (utilities.isEmpty(parametrosEjecucion.codigoEstadoError)) {
                                     respuesta.mensaje += ' / Codigo de Estado de Error';
                                 }
                                 if (utilities.isEmpty(parametrosEjecucion.codigoEstadoSinError)) {
                                     respuesta.mensaje += ' / Codigo Estado Sin Error';
                                 }
                                 if (utilities.isEmpty(parametrosEjecucion.tipoMensajeErrorConfiguracionFE)) {
                                     respuesta.mensaje += ' / Tipo de Mensaje de Error de Configuracion FE';
                                 }
                                 if (utilities.isEmpty(parametrosEjecucion.tipoMensajeErrorCAE)) {
                                     respuesta.mensaje += ' / Tipo de Mensaje de Error de CAE';
                                 }
                                 if (utilities.isEmpty(parametrosEjecucion.tipoMensajeErrorInesperadoXML)) {
                                     respuesta.mensaje += ' / Tipo de Mensaje de Error Inesperado XML';
                                 }
                                 if (utilities.isEmpty(parametrosEjecucion.tipoMensajeSinError)) {
                                     respuesta.mensaje += ' / Tipo de Mensaje Sin Error';
                                 }
                                 if (utilities.isEmpty(parametrosEjecucion.tipoMensajeErrorBoton)) {
                                     respuesta.mensaje += ' / Tipo de Mensaje de Error de Boton';
                                 }
                             }
                         }
                     }
                     else {
                         respuesta.error = true;
                         respuesta.mensaje = 'No se recibio la siguiente informacion de la transaccion requerida para relizar la generacion de CAE : ';
                         if (utilities.isEmpty(registro.id)) {
                             respuesta.mensaje += ' / ID Interno de Transaccion';
                         }
                         if (utilities.isEmpty(registro.tipo)) {
                             respuesta.mensaje += ' / Tipo de Transaccion';
                         }
                     }
                 }
             } else {
                 respuesta.error = true;
                 respuesta.mensaje = 'Error al Generar CAE de la Transaccion con ID Interno : ' + context.key + ' - No se recibio informacion de registros';
                 log.error(proceso, respuesta.mensaje);
             }
         }
         catch (ex) {
             respuesta.error = true;
             respuesta.mensaje = 'Excepcion General Generando CAE de la Transaccion con ID Interno :  : ' + context.key + ' - Descripcion : ' + ex.message;
             log.error(proceso, respuesta.mensaje);
             context.write(context.key, respuesta);
         }
         if (respuesta.error == false) {
             respuesta.mensaje = 'Se ha generado correctamente el CAE para la Transaccion Tipo : ' + respuesta.tipo + ' - ID Interno : ' + respuesta.id + ' - CAE Generado : ' + respuesta.cae + ' - Fecha : ' + new Date() + ' - Unidades Disponibles : ' + currScript.getRemainingUsage() + ' - Respuesta : ' + JSON.stringify(respuesta);
             log.audit(proceso, 'REDUCE - Fin Proceso - KEY : ' + context.key + ' - Fecha : ' + new Date() + ' - Unidades Disponibles : ' + currScript.getRemainingUsage() + ' - Respuesta : ' + JSON.stringify(respuesta));
         }
         else {
             respuesta.error = true;
             respuesta.mensaje = 'Error Generando CAE para la Transaccion Tipo : ' + respuesta.tipo + ' - ID Interno : ' + respuesta.id + ' - Fecha : ' + new Date() + ' - Unidades Disponibles : ' + currScript.getRemainingUsage() + ' - Respuesta : ' + JSON.stringify(respuesta);
             log.error(proceso, 'REDUCE - ' + respuesta.mensaje);

         }

         context.write(context.key, respuesta);
     }

     /**
      * Executes when the summarize entry point is triggered and applies to the result set.
      *
      * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
      * @since 2015.1
      */
     function summarize(summary) {
         //handleErrorIfAny(summary);
         var currScript = runtime.getCurrentScript();
         var respuesta = new Object();
         var idLog;
         respuesta.error = false;
         respuesta.mensaje = 'Detalle de Ejecucion : ';

         log.audit(proceso, 'SUMMARIZE - Incio Proceso - Fecha : ' + new Date() + ' - Unidades Disponibles : ' + currScript.getRemainingUsage());

         try {
             var totalReduceRecords = 0;
             var totalReduceErrors = 0;

             summary.output.iterator().each(function (key, value) {

                 totalReduceRecords++;
                 var objResp = JSON.parse(value);
                 if(utilities.isEmpty(idLog)){
                     idLog = objResp.idLog;
                 }
                 if (objResp.error == true) {
                     totalReduceErrors++;
                 }
                 respuesta.mensaje += ' / ' + totalReduceRecords + ': ' + ' - Tipo Registro : ' + objResp.tipo + ' - ID : ' + objResp.id + ' - CAE : ' + objResp.cae + ' - Mensaje : ' + objResp.mensaje;
                 
                 return true;
             });
             var userObj = runtime.getCurrentUser();
             envioEmail(totalReduceRecords, totalReduceErrors, idLog, userObj.id);
             log.audit(proceso, 'SUMMARIZE - Fin Proceso - Fecha : ' + new Date() + ' - Unidades Disponibles : ' + currScript.getRemainingUsage() + ' - Total Registros : ' + totalReduceRecords + ' - Total Registros Procesados Correctamente : ' + (totalReduceRecords - totalReduceErrors) + ' - Total Registros con Error : ' + totalReduceErrors);
             log.audit(proceso, 'SUMMARIZE - Detalle Procesamiento : ' + respuesta.mensaje);

         } catch (e) {
             log.error(proceso, 'Excepcion General Summarize - Descripcion : ' + JSON.stringify(e.message));
         }
     }

     /***************************** FUNCIONES AUXILIARES - INICIO ********************************/

     function obtenerParametros(currScript) {
         var respuesta = new Object();
         respuesta.error = false;
         respuesta.mensaje = '';

         try {
             respuesta.ssTransaccionesPendCAE = currScript.getParameter('custscript_l598_gen_cae_a_trans');
             respuesta.subsidiaria = currScript.getParameter('custscript_l598_gen_cae_a_sub');
             respuesta.codigoEstadoError = currScript.getParameter('custscript_l598_gen_cae_a_est_error');
             respuesta.codigoEstadoSinError = currScript.getParameter('custscript_l598_gen_cae_a_est_sin_error');
             respuesta.tipoMensajeErrorConfiguracionFE = currScript.getParameter('custscript_l598_gen_cae_a_men_error_fe');
             respuesta.tipoMensajeErrorCAE = currScript.getParameter('custscript_l598_gen_cae_a_men_error_cae');
             respuesta.tipoMensajeErrorInesperadoXML = currScript.getParameter('custscript_l598_gen_cae_a_men_error_xml');
             respuesta.tipoMensajeSinError = currScript.getParameter('custscript_l598_gen_cae_a_men_sin_error');
             respuesta.tipoMensajeErrorBoton = currScript.getParameter('custscript_l598_gen_cae_a_men_error_bot');
             respuesta.infoTransacciones = currScript.getParameter('custscript_l598_gen_cae_a_transacciones');

             return respuesta;
         } catch (exception) {
             respuesta.error = true;
             respuesta.mensaje = 'Excepcion al Obtener Parametros de Ejecucion - Error : ' + exception.message;
             return respuesta;
         }
         return respuesta;
     }

     function envioEmail(totalReduceRecords, totalReduceErrors, idLog, userActual){
         try {
             var currScript = runtime.getCurrentScript();
             var parametrosEjecucion = obtenerParametros(currScript);
             var infoTransacciones = JSON.parse(parametrosEjecucion.infoTransacciones);
             log.debug("Parametros de EJecucio ",JSON.stringify(parametrosEjecucion));
             log.debug("Inicio envioEmail", "Se inicia el envioEmail");
             var filtroConf = [];
             filtroConf.push({
                 name: "isinactive",
                 operator: "is",
                 values: false
             });
             if (!utilities.isEmpty(infoTransacciones.custpage_subsidiaria)) {
                 filtroConf.push({
                 name: "custrecord_l598_conf_fe_subsidiaria",
                 operator: "is",
                 values: infoTransacciones.custpage_subsidiaria
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
             var errorMasivo = false;
             if (!utilities.isEmpty(resultadoConf) && resultadoConf.length > 0) {
                 var urlLog = resultadoConf[0].getValue("custrecord_l598_conf_fe_log");
                 var urlDominio = resultadoConf[0].getValue("custrecord_l598_conf_fe_url_dom");
                 var enviarEmail = resultadoConf[0].getValue("custrecord_l598_conf_fe_enviar_email");
                 var emailUsuario = resultadoConf[0].getValue("custrecord_l598_conf_fe_empleado_notific");
                 log.debug("URU - Factura Electronica", "ID Empleado : " + emailUsuario + ",urlLog:" + urlLog + ",urlDominio:" + urlDominio + ",enviarEmail: " + enviarEmail );
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
                 if(totalReduceErrors > 0){
                     errorMasivo = true;
                     var id = record.submitFields({
                         type: 'customrecord_l598_fact_elec_log',
                         id: idLog,
                         values: {
                             custrecord_l598_fact_elec_log_estado: parametrosEjecucion.codigoEstadoError
                         },
                         options: {
                             enableSourcing: false,
                             ignoreMandatoryFields : true
                         }
                     });
                 }
                 if (!utilities.isEmpty(enviarEmail) && enviarEmail === true) {
                     
                     var body = '';

                     if (!errorMasivo){
                         + ' - Total Registros : ' + totalReduceRecords + ' - Total Registros Procesados Correctamente : ' + (totalReduceRecords - totalReduceErrors) + ' - Total Registros con Error : ' + totalReduceErrors
                         body += '<p>Estimado(a) :</p>';
                         body += '<p>Se ha terminado el proceso satisfactoriamente - Total Registros Procesados Correctamente : ' + totalReduceRecords + ' </p>';
                         body += '<p>Puede Observar  el Detalle de las Transacciones Procesadas desde el Siguiente link.</p>';
                         body += "<a href=\"" + urlRT + "\"> Informacion Generacion de CAE </a>";
                         body += '<p>Atentamente,</p>';
                         body += '<br>';
                         body += '<p><strong>***NO RESPONDA A ESTE MENSAJE***</strong></p>';
                     } else{
                         body += '<p>Estimado(a) :</p>';
                         body += '<p>Se ha generado un error al intentar ejecutar el proceso  - Total Registros : ' + totalReduceRecords + ' - Total Registros Procesados Correctamente : ' + (totalReduceRecords - totalReduceErrors) + ' - Total Registros con Error : ' + totalReduceErrors +'.</p>';
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
                         subject: "NetSuite - Proceso de generación Masivo de CAE",
                         body: body,
                     });

                 }
             }
             log.debug("Fin envioEmail", "Se termina el envioEmail");
         } catch (error) {
             log.error(proceso, 'Excepción Enviando Email Log de Proceso de Factura Electrónica - Excepción: ' + error.message);
             return false;
         }
     }
     function obtenerTransacciones(currScript, parametrosEjecucion, idLogGeneral) {
         log.debug(proceso, 'OBTENER TRANSACCIONES - Incio Proceso - INFORMACION RECIBIDA - Parametros de Ejecucion : '
             + JSON.stringify(parametrosEjecucion));

         var respuesta = new Object();
         respuesta.error = false;
         respuesta.mensaje = '';
         respuesta.informacionTransacciones = new Array();

         try {
             if (!utilities.isEmpty(parametrosEjecucion) && !utilities.isEmpty(parametrosEjecucion.ssTransaccionesPendCAE)) {

                 /****************************** CONSULTAR TRANSACCIONES - INICIO **********************************/

                 var respuestaTransacciones = buscarTransacciones(currScript, parametrosEjecucion, idLogGeneral);

                 log.debug(proceso, 'Obtener Transacciones - Informacion Transacciones : ' + JSON.stringify(respuestaTransacciones));

                 /****************************** CONSULTAR TRANSACCIONES - FIN **********************************/

                 if (!utilities.isEmpty(respuestaTransacciones) && respuestaTransacciones.error == false
                     && !utilities.isEmpty(respuestaTransacciones.informacion) && respuestaTransacciones.informacion.length > 0) {

                     respuesta.informacionTransacciones = respuestaTransacciones.informacion;

                 }
                 else {
                     // No se encoentraron Transacciones
                     if (utilities.isEmpty(respuestaTransacciones)) {
                         respuesta.error = true;
                         respuesta.mensaje = 'No se recibio la información del objeto con la información de las Transacciones a Procesar';
                     }
                     else {
                         if (respuestaTransacciones.error == true) {
                             respuesta.error = true;
                             if (!utilities.isEmpty(respuestaTransacciones.mensaje)) {
                                 respuesta.mensaje = 'Error obteniendo Informacion de Transacciones A Procesar - Error : ' + respuestaTransacciones.mensaje;
                             }
                             else {
                                 respuesta.mensaje = 'No se recibio la información de las Transacciones A Procesar';
                             }
                         }
                     }
                 }
             }
             else {
                 // Error Recibiendo Parametros
                 respuesta.error = true;
                 if (utilities.isEmpty(parametrosEjecucion)) {
                     respuesta.mensaje = 'No se recibio objeto con la informacion de los Parametros de Ejecucion';
                 }
                 else {
                     respuesta.mensaje = 'No se recibio la siguiente informacion requerida para realizar la Busqueda de Transacciones : ';
                     if (utilities.isEmpty(parametrosEjecucion.ssTransaccionesPendCAE)) {
                         respuesta.mensaje += ' / Busqueda Guardada para la Consulta de Transacciones a Generar CAE';
                     }
                 }
             }
         } catch (exception) {
             respuesta.error = true;
             respuesta.mensaje = 'Excepcion al Obtener Transacciones A Generar CAE - Error : ' + exception.message;
             return respuesta;
         }
         return respuesta;
     }

     function crearLogGeneral(currScript, parametrosEjecucion) {
         log.debug(proceso, 'Inicio PROCESO - crearLogGeneral.');
         var idRL = '';
         try {
             var recordLog = record.create({ type: 'customrecord_l598_fact_elec_log' });
             var fechaActual = parseDate();
             // Genero la Fecha
             recordLog.setValue({ fieldId: 'custrecord_l598_fact_elec_log_fecha', value: fechaActual });

             if (!utilities.isEmpty(parametrosEjecucion.codigoEstadoSinError))
                 recordLog.setValue({ fieldId: 'custrecord_l598_fact_elec_log_estado', value: parametrosEjecucion.codigoEstadoSinError });

             idRL = recordLog.save();
         } catch (error) {
             log.error(proceso, 'Excepción Grabando Log de Proceso de Factura Electrónica - Excepción: ' + error.message);
         }

         log.debug(proceso, 'FIN PROCESO - crearLogGeneral.');
         return idRL;
     }

     function buscarTransacciones(currScript, parametros, idLogGeneral) {
         log.debug(proceso, 'BUSCAR TRANSACCIONES - Incio Proceso - INFORMACION RECIBIDA - Parametros de Ejecucion : '
             + JSON.stringify(parametros));

         var respuesta = new Object();
         respuesta.error = false;
         respuesta.mensaje = '';
         respuesta.informacion = new Array();
         try {

             if (!utilities.isEmpty(parametros) && !utilities.isEmpty(parametros.ssTransaccionesPendCAE)) {
                 var objResultSet = '';
                 var filtros = null;
                 var infoTransacciones = JSON.parse(parametros.infoTransacciones);
                 if(!utilities.isEmpty(infoTransacciones)){
                     filtros = obtenerFiltros(infoTransacciones);
                 } else if (!utilities.isEmpty(parametros.subsidiaria)) {
                     filtros = [];
                     var filtroSubsidiaria = {};
                     filtroSubsidiaria.name = 'subsidiary';
                     filtroSubsidiaria.operator = 'ANYOF';
                     filtroSubsidiaria.values = parametros.subsidiaria;
                     filtros.push(filtroSubsidiaria);
                     
                 }
                 log.debug(proceso, 'BUSCAR TRANSACCIONES - Filtros - INFORMACION RECIBIDA - Filtros : '+ JSON.stringify(filtros));
                 objResultSet = utilities.searchSavedPro(parametros.ssTransaccionesPendCAE, filtros);
                 log.debug(proceso, 'BUSCAR TRANSACCIONES - objResultSet - INFORMACION RECIBIDA - objResultSet : '+ JSON.stringify(objResultSet));
                 if (objResultSet.error) {
                     respuesta.error = true;
                     respuesta.mensaje = 'Error Consultando Transacciones A Procesar - Error : ' + objResultSet.descripcion;
                     log.error(proceso, respuesta.mensaje);
                 } else {
                     var resultSet = objResultSet.objRsponseFunction.result;
                     var resultSearch = objResultSet.objRsponseFunction.search;

                     if (!utilities.isEmpty(resultSet) && resultSet.length > 0) {
                         for (var i = 0; !utilities.isEmpty(resultSet) && i < resultSet.length; i++) {
                             infoTransaccion = new Object();
                             infoTransaccion.id = resultSet[i].getValue({ name: resultSearch.columns[0] });
                             infoTransaccion.tipo = resultSet[i].getValue({ name: resultSearch.columns[1] });
                             infoTransaccion.idLog = idLogGeneral;

                             if (!utilities.isEmpty(infoTransaccion.id) && !utilities.isEmpty(infoTransaccion.tipo)) {
                                 respuesta.informacion.push(infoTransaccion);
                             }
                         }
                     }
                 }
             }
             else {
                 // Error no se recibieron parametros de consulta de Transacciones A Procesar
                 respuesta.error = true;
                 respuesta.mensaje = 'Error Consultando Transacciones A Procesar - No se recibio la siguiente informacion requerida : ';
                 if (utilities.isEmpty(parametros)) {
                     respuesta.mensaje += ' / Objeto con Informacion de Parametros de Ejecucion';
                 }
                 else {
                     if (utilities.isEmpty(parametros.ssTransaccionesPendCAE)) {
                         respuesta.mensaje += ' / Busqueda Guardada a utilizar para la consulta de Transacciones';
                     }
                 }
             }
         }
         catch (e) {
             respuesta.error = true;
             respuesta.mensaje = 'Excepcion Consultando Transacciones A Procesar - Descripcion : ' + JSON.stringify(e.message);
             return respuesta;
         }
         log.debug(proceso, 'BUSCAR TRANSACCIONES - Fin Proceso - INFORMACION RESPUESTA :  ' + JSON.stringify(respuesta));
         return respuesta;
     }

     function generarCAE(currentScript, parametros, paramRecType, paramRecId, paramIdlog) {

         log.debug(proceso, 'GENERAR CAE - Incio Proceso - INFORMACION RECIBIDA - Tipo de Transaccion : '
             + paramRecType + ' - ID de Transaccion : ' + paramRecId);

         var respuesta = new Object();
         respuesta.error = false;
         respuesta.mensaje = '';
         respuesta.id = '';
         respuesta.tipo = '';
         respuesta.cae = '';

         try {
             if (!utilities.isEmpty(parametros) && !utilities.isEmpty(paramRecType) && !utilities.isEmpty(paramRecId)) {
                 respuesta.tipo = paramRecType;
                 respuesta.id = paramRecId;

                 var codigoEstadoError = parametros.codigoEstadoError;
                 var codigoEstadoSinError = parametros.codigoEstadoSinError;
                 var tipoMensajeErrorConfiguracionFE = parametros.tipoMensajeErrorConfiguracionFE;
                 var tipoMensajeErrorCAE = parametros.tipoMensajeErrorCAE;
                 var tipoMensajeErrorInesperadoXML = parametros.tipoMensajeErrorInesperadoXML;
                 var tipoMensajeSinError = parametros.tipoMensajeSinError;
                 var tipoMensajeErrorBoton = parametros.tipoMensajeErrorBoton;
                 var mensaje = '';
                 var punto_venta = '';
                 var tipoTransaccion = '';
                 var refLog = paramIdlog;
                 var refTransaccion = paramRecId;
                 var informacionAuxiliarCAE = '';

                 var recId = paramRecId;
                 var recType = paramRecType;
                 var recordTransaction = record.load({
                     type: recType,
                     id: recId,
                     isDynamic: true
                 });
                 var esOneWorld = utilities.l598esOneworld();
                 var punto_venta = recordTransaction.getText({ fieldId: 'custbody_l598_sucursal' });
                 var tipoTransaccion = recordTransaction.getText({ fieldId: 'custbody_l598_tipo_comprobante' });
                 var tipoComprobanteDGI = recordTransaction.getValue({ fieldId: 'custbody_l598_tipo_comprobante' });
                 var serie = recordTransaction.getText({ fieldId: 'custbody_l598_serie_comprobante' });
                 var docXML = recordTransaction.getValue({ fieldId: 'custbody_l598_documento_xml_fe' });
                 var docJSON = recordTransaction.getValue({ fieldId: 'custbody_l598_informacion_json_tran_fe' });
                 var codigoSerie = recordTransaction.getText({ fieldId: 'custbody_l598_codigo_serie' });
                 var sucursalText = recordTransaction.getText({ fieldId: 'custbody_l598_codigo_sucursal' });
                 log.debug(proceso, 'recId: ' + recId + ' - recType: ' + recType + ' - docXML: ' + docXML);
                 var cae = recordTransaction.getValue({ fieldId: 'custbody_l598_cae' });

                 if (!utilities.isEmpty(docXML)) {
                     if (utilities.isEmpty(cae)) {
                         var userObj = runtime.getCurrentUser();
                         var usuarioEmail = '';

                         var new_url = url.resolveScript({
                             scriptId: URLSuitelet,
                             deploymentId: ImplSuitelet,
                             returnExternalUrl: true
                         });

                         log.debug(proceso, 'URL Final : ' + new_url);

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
                                                 grabarDatosCAE(informacionAuxiliarCAE, recType, recordTransaction, CAEGENERADO, codigoEstadoSinError, tipoMensajeSinError, erroresRespuesta, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, informacionAuxiliarCAE, codigoEstadoError, tipoMensajeErrorCAE, recId);

                                                 log.debug(proceso, "LINE 246 - Remaining Usage = " + currentScript.getRemainingUsage() + ' --- time: ' + new Date());

                                                 respuesta.error = false;
                                                 var mensajeRespuesta = 'ID Interno Transacción : ' + refTransaccion + ' - Comprobante :  ' + tipoTransaccion.toString() + ' / CAE: ' + CAE;
                                                 respuesta.mensaje = mensajeRespuesta;
                                                 respuesta.cae = CAE;
                                                 // Grabo el Record Trnasaccion
                                                 //alert_msg(respuestaFinal);

                                             } catch (error) {
                                                 mensaje = "Excepción Actualizando CAE de Transacción en NetSuite - ID Interno Transaccion : " + idTransaccion + " - Excepcion : " + error.message;
                                                 respuesta.error = true;
                                                 respuesta.mensaje = mensaje;
                                                 log.error(proceso, mensaje);
                                                 informacionAuxiliarCAE = (!CAEGENERADO || utilities.isEmpty(CAE) || CAE == "0" || CAE == 0) ? '' : informacionAuxiliarCAE;
                                                 grabarError(codigoEstadoError, tipoMensajeErrorCAE, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, informacionAuxiliarCAE, recordTransaction);
                                                 //alert_msg(mensaje);
                                             }
                                         } else {
                                             mensaje = 'Error - No se complen con las condiciones para generar CAE, verifique fecha de vencimiento o el proceso de generación de CAE.';
                                             respuesta.error = true;
                                             respuesta.mensaje = mensaje;
                                             log.error(proceso, mensaje);
                                             grabarError(codigoEstadoError, tipoMensajeErrorCAE, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', recordTransaction);
                                             //alert_msg(mensaje);
                                         }
                                     } else {
                                         mensaje = 'Error - No se recibió información del web services para grabar el resultado de CAE.';
                                         respuesta.error = true;
                                         respuesta.mensaje = mensaje;
                                         log.error(proceso, mensaje);
                                         grabarError(codigoEstadoError, tipoMensajeErrorCAE, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', recordTransaction);
                                         //alert_msg(mensaje);
                                     }

                                     log.debug(proceso, "LINE 153 - Remaining Usage = " + currentScript.getRemainingUsage() + ' --- time: ' + new Date());
                                 } else {
                                     // Muestro los errores ocurridos
                                     if (!utilities.isEmpty(informacionRespuesta.mensajeError)) {
                                         erroresRespuesta = 'Error en el proceso de CAE - Detalles: ' + informacionRespuesta.mensajeError;
                                     }
                                     respuesta.error = true;
                                     respuesta.mensaje = erroresRespuesta;
                                     log.error(proceso, erroresRespuesta);
                                     grabarError(codigoEstadoError, tipoMensajeErrorCAE, erroresRespuesta, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', recordTransaction);
                                     //alert_msg(erroresRespuesta);
                                 }
                             } else {
                                 mensaje = "Error obteniendo información de Suitelet generador de CAE - Respuesta OBJECT: nula/vacía";
                                 respuesta.error = true;
                                 respuesta.mensaje = mensaje;
                                 log.error(proceso, mensaje);
                                 grabarError(codigoEstadoError, tipoMensajeErrorCAE, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', recordTransaction);
                                 //alert_msg(mensaje);
                             }

                         } else if (utilities.isEmpty(response) && !verificacionCAETransaccionDetalleLogFE.error && verificacionCAETransaccionDetalleLogFE.poseeCAE) {

                             try {

                                 var informacionCAEDetalleLog = JSON.parse(verificacionCAETransaccionDetalleLogFE.informacionCAE);
                                 var mensajeRespuesta = 'ID Interno Transacción : ' + refTransaccion + ' - Comprobante :  ' + tipoTransaccion.toString() + ' ' + codigoSerie.toString() + '-' + sucursalText.toString() + '-' + refTransaccion + ' / CAE: ' + informacionCAEDetalleLog.CAE;
                                 respuesta.error = false;
                                 respuesta.mensaje = mensajeRespuesta;
                                 respuesta.cae = informacionCAEDetalleLog.CAE;
                                 grabarDatosCAE(informacionCAEDetalleLog, recType, recordTransaction, true, codigoEstadoSinError, tipoMensajeSinError, mensajeRespuesta, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, informacionCAEDetalleLog, codigoEstadoError, tipoMensajeErrorCAE, recId);

                                 log.debug(proceso, 'Generación de CAE OK.');

                                 //alert_msg('La transacción ya posee CAE generado previamente y sus datos están registrados de manera interna en los registros del RT "URU-Factura Electrónica Detalle Log" de la transacción actual, se procedió a actualizar la transacción con dichos datos. \n \n ' + mensajeRespuesta);
                             } catch (error) {
                                 mensaje = 'La transacción ya posee CAE generado previamente y sus datos están registrados de manera interna en los registros del RT "URU-Factura Electrónica Detalle Log" de la transacción actual. \n \n Excepción Actualizando CAE de Transacción en NetSuite - ID Interno Transaccion : ' + idTransaccion + ' - Excepcion : ' + error.message;
                                 respuesta.error = true;
                                 respuesta.mensaje = mensaje;
                                 log.error(proceso, mensaje);
                                 grabarError(codigoEstadoError, tipoMensajeErrorCAE, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', recordTransaction);
                                 //alert_msg(mensaje);
                             }

                         } else if (verificacionCAETransaccionDetalleLogFE.error) {
                             mensaje = verificacionCAETransaccionDetalleLogFE.mensaje;
                             respuesta.error = true;
                             respuesta.mensaje = mensaje;
                             log.error(proceso, mensaje);
                             grabarError(codigoEstadoError, tipoMensajeErrorCAE, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', recordTransaction);
                             //alert_msg(mensaje);
                         } else {
                             mensaje = "Error obteniendo información de Suitelet generador de CAE - Respuesta JSON: nula/vacía";
                             respuesta.error = true;
                             respuesta.mensaje = mensaje;
                             log.error(proceso, mensaje);
                             grabarError(codigoEstadoError, tipoMensajeErrorCAE, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', recordTransaction);
                             //alert_msg(mensaje);
                         }
                     } else {
                         mensaje = "La transacción ya posee CAE.";
                         respuesta.error = true;
                         respuesta.mensaje = mensaje;
                         //alert_msg(mensaje);
                         log.error(proceso, mensaje);
                         grabarError(codigoEstadoError, tipoMensajeErrorCAE, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', recordTransaction);
                     }
                 } else {
                     mensaje = "La transacción no posee asociado el XML con los datos para generar CAE, proceda a editar la transacción y a guardarla nuevamente para posteriormente generar el CAE";
                     respuesta.error = true;
                     respuesta.mensaje = mensaje;
                     //alert_msg(mensaje);
                     log.error(proceso, mensaje);
                     grabarError(codigoEstadoError, tipoMensajeErrorCAE, mensaje, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', recordTransaction);
                 }
             }
             else {
                 respuesta.error = true;
                 respuesta.mensaje = 'Error Generando CAE - No se recibio la siguiente informacion requerida : ';
                 if (utilities.isEmpty(parametros)) {
                     respuesta.mensaje = ' / Parametros Generales de Ejecucion';
                 }
                 if (utilities.isEmpty(paramRecType)) {
                     respuesta.mensaje = ' / Tipo de Transaccion';
                 }
                 if (utilities.isEmpty(paramRecId)) {
                     respuesta.mensaje = ' / ID de Transaccion';
                 }
             }
         }
         catch (excepcion) {
             respuesta.error = true;
             respuesta.mensaje = 'Excepción General realizando la generacion del CAE de la Transacciin Tipo : ' + paramRecType + ' - ID Interno : ' + paramRecId + ' - Error : ' + excepcion.message.toString();
         }
         log.debug(proceso, 'GENERAR CAE - Fin Proceso - INFORMACION DE EJECUCION - Tipo de Transaccion : '
             + paramRecType + ' - ID de Transaccion : ' + paramRecId + ' - Respuesta : ' + JSON.stringify(respuesta));
         return respuesta
     }

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

     function grabarDatosCAE(informacionCAE, recType, recordTransaction, CAEGENERADO, codigoEstadoSinError, tipoMensajeSinError, erroresRespuesta, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, informacionAuxiliarCAE, codigoEstadoError, tipoMensajeErrorCAE, recId) {

         var proceso = 'grabarDatosCAE';

         log.debug(proceso, 'INICIO - grabarDatosCAE');

         if (CAEGENERADO == true && !utilities.isEmpty(informacionCAE.CAE) && informacionCAE.CAE != "0" && informacionCAE.CAE != 0) {
             log.debug(proceso, 'Generación de CAE OK.');
             grabarError(codigoEstadoSinError, tipoMensajeSinError, erroresRespuesta, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, informacionAuxiliarCAE, recordTransaction);
         } else {
             log.debug(proceso, 'Generación de CAE NULL.');
             grabarError(codigoEstadoError, tipoMensajeErrorCAE, erroresRespuesta, punto_venta, tipoTransaccion, refLog, refTransaccion, serie, '', recordTransaction);
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

     function obtenerFiltros(infoTransacciones) {
         try {
             let i = 0;
             const filtros = new Array();

             log.debug('URU - GENERAR CAE LOTES', `infoTransacciones ${JSON.stringify(infoTransacciones)}`);
             // var filtroSubsidiaria = {};
             // filtroSubsidiaria.name = 'subsidiary';
             // filtroSubsidiaria.operator = 'ANYOF';
             // filtroSubsidiaria.values = subsidiaria;
             // filtros.push(filtroSubsidiaria);
             if (!l598isEmpty(infoTransacciones.custpage_subsidiaria)){}
             filtros[i++] = {
                 name: "subsidiary",
                 operator: "ANYOF",
                 values: infoTransacciones.custpage_subsidiaria
             };

             if (!l598isEmpty(infoTransacciones.custpage_sucursal))
             filtros[i++] = {
                 name: "custbody_l598_sucursal",
                 operator: "ANYOF",
                 values: infoTransacciones.custpage_sucursal
             };

             if (!l598isEmpty(infoTransacciones.custpage_serie))
             filtros[i++] = {
                 name: "custbody_l598_serie_comprobante",
                 operator: "ANYOF",
                 values: infoTransacciones.custpage_serie
             };

             if (!l598isEmpty(infoTransacciones.custpage_tipo_transaccion)) {

             const informacionTipoTransaccion = search.lookupFields({
                 type: "customrecord_l598_tipo_transaccion_fe",
                 id: infoTransacciones.custpage_tipo_transaccion,
                 columns: ["custrecord_l598_tipo_transaccion_fe_tipo", "custrecord_l598_tipo_transaccion_fe_exp", "custrecord_l598_tipo_transaccion_fe_tick", "custrecord_l598_tipo_transaccion_fe_ajen"]
             });

             if (!l598isEmpty(utilities.getLookupFieldsSafe(informacionTipoTransaccion, "custrecord_l598_tipo_transaccion_fe_tipo"))) {

                 const filtroTipoTransaccion = new Array();
                 filtroTipoTransaccion[0] = search.createFilter({
                 name: "internalid",
                 operator: search.Operator.IS,
                 values: utilities.getLookupFieldsSafe(informacionTipoTransaccion, "custrecord_l598_tipo_transaccion_fe_tipo")
                 });

                 const columnaTipoTransaccion = new Array();
                 columnaTipoTransaccion[0] = search.createColumn({ name: "custrecord_l598_tipo_trans_ns_cod", join: "custrecord_l598_tipo_trans_loc_tipo_ns" });
                 columnaTipoTransaccion[1] = search.createColumn("custrecord_l598_tipo_trans_loc_es_nd");

                 const resultadoTipoTransaccion = search.create({
                 type: "customrecord_l598_tipo_trans_loc",
                 filters: filtroTipoTransaccion,
                 columns: columnaTipoTransaccion
                 }).run().getRange({
                 start: 0,
                 end: 1000
                 });

                 if (!l598isEmpty(resultadoTipoTransaccion) && resultadoTipoTransaccion.length > 0) {

                 const tipoNS = resultadoTipoTransaccion[0].getValue({ name: "custrecord_l598_tipo_trans_ns_cod", join: "custrecord_l598_tipo_trans_loc_tipo_ns" });
                 const esND = resultadoTipoTransaccion[0].getValue("custrecord_l598_tipo_trans_loc_es_nd");

                 let esNotaDebito = 'F';

                 if (!l598isEmpty(esND) && (esND == "T" || esND === true))
                     esNotaDebito = 'T';

                 if (!l598isEmpty(tipoNS)) {

                     filtros[i++] = {
                     name: "recordType",
                     operator: "IS",
                     values: tipoNS
                     };

                     filtros[i++] = {
                     name: "custbody_l598_nd",
                     operator: "IS",
                     values: esNotaDebito
                     };

                     let esExportacion = 'F';

                     if (utilities.getLookupFieldsSafe(informacionTipoTransaccion, "custrecord_l598_tipo_transaccion_fe_exp") === true) {
                     esExportacion = 'T';
                     }

                     filtros[i++] = {
                     name: "custbody_l598_trans_exportacion",
                     operator: "IS",
                     values: esExportacion
                     };

                     let esTicket = 'F';

                     if (utilities.getLookupFieldsSafe(informacionTipoTransaccion, "custrecord_l598_tipo_transaccion_fe_tick") === true) {
                     esTicket = 'T';
                     }

                     filtros[i++] = {
                     name: "custbody_l598_trans_eticket",
                     operator: "IS",
                     values: esTicket
                     };

                     let esCuentaAjena = 'F';

                     if (utilities.getLookupFieldsSafe(informacionTipoTransaccion, "custrecord_l598_tipo_transaccion_fe_ajen") === true) {
                     esCuentaAjena = 'T';
                     }

                     filtros[i++] = {
                     name: "custbody_l598_transac_cuenta_ajena",
                     operator: "IS",
                     values: esCuentaAjena
                     };

                     log.debug('L598 - GENERAR CAE LOTES', `esNotaDebito: ${esNotaDebito} / tipoNS: ${tipoNS} / esExportacion: ${esExportacion} / esTicket: ${esTicket} / esCuentaAjena: ${esCuentaAjena}`);

                 }
                 }
             }
             }

             if (!l598isEmpty(infoTransacciones.custpage_fecha_desde)) {
             let fechaDsd = new Date(infoTransacciones.custpage_fecha_desde);

             log.debug('URU - GENERAR CAE LOTES', `fechaDsd: ${fechaDsd}`);

             let fechaDesdeFinal = format.format({
                 value: fechaDsd,
                 type: format.Type.DATE
             });

             log.debug('URU - GENERAR CAE LOTES', `fechaDesdeFinal: ${fechaDesdeFinal}`);

             filtros[i++] = {
                 name: "trandate",
                 operator: "ONORAFTER",
                 values: fechaDesdeFinal
             };

             }

             if (!l598isEmpty(infoTransacciones.custpage_fecha_hasta)) {
             let fechaHsta = new Date(infoTransacciones.custpage_fecha_hasta);

             log.debug('URU - GENERAR CAE LOTES', `fechaHsta: ${fechaHsta}`);

             let fechaHastaFinal = format.format({
                 value: fechaHsta,
                 type: format.Type.DATE
             });

             log.debug('URU - GENERAR CAE LOTES', `fechaHastaFinal: ${fechaHastaFinal}`);

             filtros[i++] = {
                 name: "trandate",
                 operator: "ONORBEFORE",
                 values: fechaHastaFinal
             };
             }

             return filtros;
         } catch (error) {
             log.error(proceso, 'Excepción Grabando Log de Proceso de Factura Electrónica - Excepción: ' + error.message);
             return null;
         }
         
     }

     function l598isEmpty(value) {
         if (value === "") {
           return true;
         }
   
         if (value === null) {
           return true;
         }
   
         if (value === undefined) {
           return true;
         }
   
         if (value === "null") {
           return true;
         }
   
         if (value === "undefined") {
           return true;
         }
   
         return false;
       }
   
     function grabarError(codigoEstado, codigoMensaje, detalleMensaje, puntoVenta, tipoComprobante, refLog, refTransaccion, serie, informacionAuxiliarCAE, recordTransaction) {

         var proceso = 'grabarError';
         log.debug(proceso, 'INICIO PROCESO - grabarError - parámetros - codigoEstado: ' + codigoEstado + ' - codigoMensaje: ' + codigoMensaje + ' - detalleMensaje: ' + detalleMensaje + ' - puntoVenta: ' + puntoVenta + ' - tipoComprobante: ' + tipoComprobante + ' - refLog: ' + refLog + ' - refTransaccion: ' + refTransaccion + ' - serie: ' + serie + ' - informacionAuxiliarCAE: ' + informacionAuxiliarCAE);

         try {
             var idRL = refLog;
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
         }
         log.debug(proceso, 'FIN PROCESO - grabarError.');
     }

     function handleErrorAndSendNotification(e, stage) {
         log.error('Estado : ' + stage + ' Error', e);

         var author = runtime.getCurrentUser().id;
         var recipients = runtime.getCurrentUser().id;
         var subject = proceso + " : " + runtime.getCurrentScript().id + ' Error en Estado : ' + stage;
         var body = 'Ocurrio un error con la siguiente informacion : \n' +
             'Codigo de Error: ' + e.name + '\n' +
             'Mensaje de Error: ' + e.message;

         email.send({
             author: author,
             recipients: recipients,
             subject: subject,
             body: body
         });
     }

     function handleErrorIfAny(summary) {
         var inputSummary = summary.inputSummary;
         var mapSummary = summary.mapSummary;
         var reduceSummary = summary.reduceSummary;

         if (inputSummary.error) {
             var e = error.create({
                 name: 'INPUT_STAGE_FAILED',
                 message: inputSummary.error
             });
             handleErrorAndSendNotification(e, 'getInputData');
         }

         handleErrorInStage('map', mapSummary);
         handleErrorInStage('reduce', reduceSummary);
     }

     function handleErrorInStage(stage, summary) {
         var errorMsg = [];
         summary.errors.iterator().each(function (key, value) {
             var msg = 'Error: ' + key + '. Error was: ' + JSON.parse(value).message + '\n';
             errorMsg.push(msg);
             return true;
         });
         if (errorMsg.length > 0) {
             var e = error.create({
                 name: 'ERROR_CUSTOM',
                 message: JSON.stringify(errorMsg)
             });
             handleErrorAndSendNotification(e, stage);
         }
     }

     /***************************** FUNCIONES AUXILIARES - FIN ********************************/

     return {
         getInputData: getInputData,
         map: map,
         reduce: reduce,
         summarize: summarize
     };
 });