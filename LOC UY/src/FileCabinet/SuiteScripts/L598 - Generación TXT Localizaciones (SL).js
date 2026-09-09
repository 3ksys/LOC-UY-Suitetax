/**
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 *@NAmdConfig /SuiteScripts/configuration_l598.json
 *@NModuleScope Public
 */
define(['N/record', 'N/search', 'N/runtime', 'L598/utilities', 'N/ui/serverWidget', 'N/task'],

    function (record, search, runtime, utilities, serverWidget, task) {

        var proceso = "L598 - Generación TXT Localizaciones (SL)";

        function onRequest(context) {
            try {

                var form = serverWidget.createForm({
                    title: 'Panel de Generación de TXT Localizaciones URU'
                });

                form.clientScriptModulePath = './L598 - Generación TXT Localizaciones (CL).js'

                log.debug(proceso, 'INICIO Dibujando SuiteLet');

                var grupoFiltros = form.addFieldGroup({
                    id: 'filtros',
                    label: 'Información General'
                });

                // INICIO CAMPOS
                var btnAccion = form.addField({
                    id: 'custpage_accion',
                    label: 'Accion:',
                    type: serverWidget.FieldType.TEXT,
                    container: 'filtros'
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN
                });
                // FIN CAMPOS

                // INICIO FILTROS
                var isOneWorld = utilities.l598esOneworld();

                if (isOneWorld) {
                    var subsidiaria = form.addField({
                        id: 'custpage_field_subsidiaria',
                        label: 'Subsidiaria',
                        type: serverWidget.FieldType.SELECT,
                        container: 'filtros',
                        source: record.Type.SUBSIDIARY
                    });
                    subsidiaria.isMandatory = true;
                } else {
                    var subsidiaria = form.addField({
                        id: 'custpage_field_subsidiaria',
                        label: 'Subsidiaria',
                        type: serverWidget.FieldType.TEXT,
                        container: 'filtros'
                    }).updateDisplayType({
                        displayType: serverWidget.FieldDisplayType.HIDDEN
                    });
                }

                var periodo = form.addField({
                    id: 'custpage_field_periodo',
                    label: 'Periodo',
                    type: serverWidget.FieldType.SELECT,
                    container: 'filtros',
                    source: 'accountingperiod'
                });
                periodo.isMandatory = true;

                var archivos = form.addField({
                    id: 'custpage_field_archivo',
                    label: 'Archivo a Generar',
                    type: serverWidget.FieldType.SELECT,
                    container: 'filtros',
                    source: 'customrecord_l598_gen_txt_loc_archivos'
                });
                archivos.isMandatory = true;
                // FIN FILTROS

                form.addSubmitButton({
                    label: 'Generar TXT'
                });

                var infoResultado = form.addField({
                    id: 'custpage_resultado',
                    label: 'Resultados',
                    type: serverWidget.FieldType.INLINEHTML
                });

                if (context.request.method === 'GET') {
                    log.audit(proceso, 'FIN Proceso');
                    context.response.writePage(form);
                } else {
                    var sAccion = utilities.isEmpty(context.request.parameters.custpage_accion) ? context.request.parameters.submitter : context.request.parameters.custpage_accion;
                    log.debug(proceso, 'POST accion: ' + sAccion);
                    switch (sAccion) {
                        case 'GENERAR':
                            var subsidiaria = context.request.parameters.custpage_field_subsidiaria;
                            var periodo = context.request.parameters.custpage_field_periodo;
                            var archivo = context.request.parameters.custpage_field_archivo;

                            var mensaje = "Se proceso su solicitud. Recibira una notificación al finalizar por email";
                            var resultado = generarTXT(context.request, subsidiaria, periodo, archivo, isOneWorld);
                            if (!utilities.isEmpty(resultado) && resultado.error == true) {
                                mensaje = resultado.mensaje;
                                log.error(proceso, 'Error al intentar invocar la Generación del TXT seleccionado - Error : ' + mensaje);
                            }
                            infoResultado.defaultValue = '<font color="red"&nbsp;&nbsp;&nbsp;>' + mensaje + '</font>';
                            log.audit(proceso, 'FIN Proceso');

                            context.response.writePage(form);
                            break;
                    }
                }
            } catch (excepcion) {
                log.error(proceso, 'Excepcion : ' + excepcion.message);
            }
        }

        function generarTXT(request, subsidiaria, periodo, archivo, isOneWorld) {
            log.audit(proceso, 'INICIO - Proceso que invoca Programado de Generación TXT Localizaciones');

            var respuesta = new Object();
            respuesta.error = false;
            respuesta.mensaje = "";
            respuesta.estado = "";

            try {

                if ((!utilities.isEmpty(subsidiaria) && isOneWorld || (utilities.isEmpty(subsidiaria) && !isOneWorld)) && !utilities.isEmpty(archivo) && !utilities.isEmpty(periodo)) {

                    var idUsuario = runtime.getCurrentUser().id;

                    var objParametros = {};
                    objParametros.custscript_l598_gen_txt_loc_subsidiaria = subsidiaria;
                    objParametros.custscript_l598_gen_txt_loc_periodo = periodo;
                    objParametros.custscript_l598_gen_txt_loc_archivo = archivo;
                    objParametros.custscript_l598_gen_txt_loc_usuario = idUsuario;

                    log.debug(proceso, 'objParametros a Enviar: ' + JSON.stringify(objParametros));

                    respuesta = createAndSubmitScheduledJob('customscript_l598_gen_txt_loc_sched', objParametros);

                } else {
                    respuesta.error = true;
                    respuesta.mensaje = "Faltan parámetros por seleccionar.";
                    log.error(proceso, respuesta.mensaje);
                }

            } catch (excepcion) {
                respuesta.error = true;
                respuesta.mensaje = "Error Generando Parámetros para el Programado de Generación TXT Localizaciones - Excepcion : " + excepcion.message;
                log.error(proceso, respuesta.mensaje);
            }
            log.audit(proceso, 'FIN - Proceso que invoca Programado de Generación TXT Localizaciones');
            return respuesta;
        }

        function createAndSubmitScheduledJob(idScript, parametros) {
            log.debug('createAndSubmitScheduledJob', 'INICIO Invocacion Script Programado');
            var respuesta = new Object();
            respuesta.error = false;
            respuesta.mensaje = "";
            respuesta.estado = "";
            try {
                var mrTask = task.create({
                    taskType: task.TaskType.SCHEDULED_SCRIPT,
                    scriptId: idScript,
                    params: parametros
                });
                var mrTaskId = mrTask.submit();
                var taskStatus = task.checkStatus(mrTaskId);
                respuesta.estado = taskStatus;
            } catch (excepcion) {
                respuesta.error = true;
                respuesta.mensaje = "Excepcion Invocando el Script Programado - Excepcion : " + excepcion.message;
                log.error('createAndSubmitScheduledJob', respuesta.mensaje);
            }
            log.debug('createAndSubmitScheduledJob', 'FIN Invocacion Script Programado');
            return respuesta;
        }

        return {
            onRequest: onRequest
        }
    });
