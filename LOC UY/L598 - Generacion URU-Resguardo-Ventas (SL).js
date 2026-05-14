/**
 * @NApiVersion 2.x
 * @NAmdConfig /SuiteScripts/configuration.json
 * @NScriptType Suitelet
 * @NModuleScope Public
 */


define(['N/ui/serverWidget', 'N/format', 'N/task', '3K/utilities', 'N/runtime'],

    function(serverWidget, format, task, utilities, runtime) {

        /**
         * Definition of the Suitelet script trigger point.
         *
         * @param {Object} context
         * @param {ServerRequest} context.request - Encapsulation of the incoming request
         * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
         * @Since 2015.2
         */
        function onRequest(context) {

            try {

                log.audit('Generación URU-Resguardo', 'INICIO - Metodo: ' + context.request.method);
                var currentScript = runtime.getCurrentScript();
                var habilitarFechaResguardo = true;
                var habilitarFechaEmisionResguardo = true;
                log.audit('Generación URU-Resguardo', 'Parámetros: Habilitar Fecha Resguardo: ' + habilitarFechaResguardo + ' - Habilitar Fecha Valor: ' + habilitarFechaEmisionResguardo);
                
                var esOneworld = runtime.isFeatureInEffect({
                    feature: 'SUBSIDIARIES'
                });
                var form = serverWidget.createForm({
                    title: 'Generación Transacción URU-Resguardo - Ventas'
                });

                form.clientScriptModulePath = './L598 - Generacion URU-Resguardo-Ventas (Cliente)'

                var grupoFiltros = form.addFieldGroup({
                    id: 'filtros',
                    label: 'Criterios de Búsqueda General'
                });
                var grupoDatosEmision = form.addFieldGroup({
                    id: 'datosemision',
                    label: 'Datos de Emisión Resguardo'
                });     

                var grupoResultados =  form.addFieldGroup({
                    id: "proceso",
                    label: "Resultados"
                });


                //INICIO - CAMPOS DE CABECERA
                var btnAccion = form.addField({
                    id: 'custpage_accion',
                    label: 'Accion:',
                    type: serverWidget.FieldType.TEXT,
                    container: 'filtros'
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN
                });

                //INICIO - FILTROS
                var periodoContable = form.addField({
                    id: 'periodocontable',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Periodo Contable:',
                    source: 'accountingperiod',
                    required: true ,
                    container: 'filtros'
                });

                if (esOneworld)
                {
                    var subsidiaria = form.addField({
                        id: 'subsidiaria',
                        type: serverWidget.FieldType.SELECT,
                        label: 'Subsidiaria:',
                        source: 'subsidiary',
                        required: true ,
                        container: 'filtros'
                    });
                }
                else
                {
                    var subsidiaria = 0;
                }

                var cliente = form.addField({
                    id: 'cliente',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Cliente:',
                    source: 'customer',
                    container: 'filtros'
                });

                //FIN - FILTROS

                var fechaServidor = new Date();

                var fechaLocal = format.format({
                    value: fechaServidor,
                    type: format.Type.DATE,
                    timezone: format.Timezone.AMERICA_MONTEVIDEO
                });

                var fechaLocalDate = format.parse({
                    value: fechaLocal,
                    type: format.Type.DATE,
                    timezone: format.Timezone.AMERICA_MONTEVIDEO
                });

      
                
                var fechaUruResguardo = form.addField({
                    id: 'fecharesguardo',
                    type: serverWidget.FieldType.DATE,
                    label: 'Fecha Resguardo:',
                    container: 'datosemision'                    
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                if (!utilities.isEmpty(habilitarFechaResguardo) && habilitarFechaResguardo)
                    fechaUruResguardo.updateDisplayType({ displayType: serverWidget.FieldDisplayType.NORMAL });

                var fechaUruResguardoEmision = form.addField({
                    id: 'fecharesguardoemision',
                    type: serverWidget.FieldType.DATE,
                    label: 'Fecha Valor:',
                    container: 'datosemision'                    
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                if (!utilities.isEmpty(habilitarFechaEmisionResguardo) && habilitarFechaEmisionResguardo)
                    fechaUruResguardoEmision.updateDisplayType({ displayType: serverWidget.FieldDisplayType.NORMAL });

                if (!utilities.isEmpty(fechaUruResguardoEmision)){
                    fechaUruResguardoEmision.isMandatory = true;
                    fechaUruResguardoEmision.defaultValue = fechaLocalDate; 
                }

                if (!utilities.isEmpty(fechaUruResguardo)){
                    fechaUruResguardo.isMandatory = true;
                    fechaUruResguardo.defaultValue = fechaLocalDate; 
                }
                                

                if (esOneworld){
                    if(!utilities.isEmpty(context.request.parameters.subsidiaria)){
                        subsidiaria.defaultValue = context.request.parameters.subsidiaria;
                    }
                }

                if(!utilities.isEmpty(context.request.parameters.periodocontable)){
                    periodoContable.defaultValue = context.request.parameters.periodocontable;
                }

                if(!utilities.isEmpty(context.request.parameters.fecharesguardo)){
                    fechaUruResguardo.defaultValue = context.request.parameters.fecharesguardo;
                }

                if(!utilities.isEmpty(context.request.parameters.fecharesguardoemision)){
                    fechaUruResguardoEmision.defaultValue = context.request.parameters.fecharesguardoemision;
                }

                if (!utilities.isEmpty(cliente))
                {
                    if(!utilities.isEmpty(context.request.parameters.cliente)){
                        cliente.defaultValue = context.request.parameters.cliente;
                    }
                }

                //INICIO - CAMPOS OBLIGATORIOS
                periodoContable.isMandatory = true;

                if (esOneworld)
                {
                    subsidiaria.isMandatory   = true;
                }
                //FIN - CAMPOS OBLIGATORIOS
                //FIN - CAMPOS DE CABECERA

                form.addSubmitButton({
                    label: 'Generar Resguardos'
                });

                var infoResultado = form.addField({
                    id: 'custpage_resultado',
                    label: 'Resultados',
                    type: serverWidget.FieldType.INLINEHTML,
                    container: "proceso"
                });
                infoResultado.updateLayoutType({
                    layoutType: serverWidget.FieldLayoutType.MIDROW
                });
                
                infoResultado.padding = 50;


                if (context.request.method === 'GET') {
                    context.response.writePage(form);
                } else {
                    var sAccion = utilities.isEmpty(context.request.parameters.custpage_accion) ? context.request.parameters.submitter : context.request.parameters.custpage_accion;
                    log.debug('Generación URU-Resguardo', 'LINE 248. sAccion : ' + sAccion);
                    log.debug('context.request.parameters.submitter',context.request.parameters.submitter)

                    switch (sAccion) {
                        case 'GENERARRESGUARDOS':
                            var mensaje = "Se proceso su solicitud. Recibira una notificacion al finalizar por email";
                            //log.debug('Generación URU-Resguardo', 'context.request : ' + context.request+'. sublist: '+sublist);
                            var resultado = generarResguardoMapReduce(context.request);
                            if (!utilities.isEmpty(resultado) && resultado.error == true) {
                                mensaje = resultado.mensaje;
                                log.error('Generación URU-Resguardo', 'Error Consulta Pagos Pendientes - Error : ' + mensaje);
                            }
                            infoResultado.defaultValue = '<font color="red">' + mensaje + '</font>';
                            log.audit('Generación URU-Resguardo', 'FIN Proceso');
                            context.response.writePage(form);
                            break;
                    }
                }
            }
            catch (excepcion)
            {
                //log.error('Generación URU-Resguardo', 'Excepcion Proceso Generación URU-Resguardo - Excepcion : ' + excepcion.message);
                var mensajeError = 'Excepcion Proceso Generación URU-Resguardo';
                if (!utilities.isEmpty(excepcion) && !utilities.isEmpty(excepcion.message)) {
                    mensajeError = 'Excepcion Proceso Generación URU-Resguardo. Excepcion: '+ excepcion.message.toString();
                }
                log.error('Generacion URU-Resguardo', mensajeError);
            }
        }

        function generarResguardoMapReduce(request) {
            log.debug('Generación URU-Resguardo', 'LINE 283. info a procesar:' + JSON.stringify(request.parameters));
            var respuesta = new Object();
            respuesta.error = false;
            respuesta.mensaje = "";
            respuesta.estado = "";
            try {
                //COMPONENTES PARA PROCESAMIENTO DE LOTES
                var infoParamMP = {
                    fechaResguardo : request.parameters.fecharesguardo,
                    fechaEmisionResguardo: request.parameters.fecharesguardoemision,
                    idPeriodoContable: request.parameters.periodocontable,
                    idSubsidiaria: request.parameters.subsidiaria,
                    idCliente: request.parameters.cliente
                }
            
                if ((!utilities.isEmpty(infoParamMP.idSubsidiaria) && !utilities.isEmpty(infoParamMP.idPeriodoContable) )) {

                    if (respuesta.error == false)
                    {
                        parametros = new Object();
                        parametros.custscript_l598_gen_uru_resg_vent_mapr_d  = JSON.stringify(infoParamMP)
                        log.debug('Generación URU-Resguardo', 'Generación URU-Resguardo - Parametros: ' + JSON.stringify(parametros));
                        log.debug('Generación URU-Resguardo', 'INICIO llamada Script MAP/REDUCE');
                        respuesta = createAndSubmitMapReduceJob('customscript_l598_gen_uru_resgvent_mapr', parametros);
                        var mensajeEstado = "";
                        if (!utilities.isEmpty(respuesta) && !utilities.isEmpty(respuesta.estado))
                        {
                            mensajeEstado = respuesta.estado.status;
                        }
                        log.audit('Generación URU-Resguardo', 'MAP/REDUCE - Estado : ' + mensajeEstado);
                    }
                } else {
                    respuesta.error = true;
                    respuesta.mensaje = "No se ha llenada la información de Periodo o Subsidiaria";
                }


            } catch (excepcion)
            {
                //log.error('Generación URU-Resguardo', 'Consulta Pagos Pendientes - Excepcion Consultando Pagos Pendientes - Excepcion : ' + excepcion.message);
                var mensajeError = 'Excepcion Consultando Pagos Pendientes';
                if (!utilities.isEmpty(excepcion) && !utilities.isEmpty(excepcion.message))
                {
                    mensajeError = 'Excepcion Consultando Pagos Pendientes. Excepcion: '+ excepcion.message.toString();
                }
                log.error('Generacion URU-Resguardo', mensajeError);
                respuesta.error = true;
                respuesta.mensaje = mensajeError;
            }
            log.audit('Generación URU-Resguardo', 'FIN Consulta Pagos Pendientes');
            return respuesta;
        }

        function createAndSubmitMapReduceJob(idScript, parametros) {
            log.audit('Generación URU-Resguardo', 'INICIO Invocacion Script MAP/REDUCE');
            var respuesta = new Object();
            respuesta.error = false;
            respuesta.mensaje = "";
            respuesta.estado = "";
            try {
                var mrTask = task.create({
                    taskType: task.TaskType.MAP_REDUCE,
                    scriptId: idScript,
                    params: parametros
                });
                var mrTaskId = mrTask.submit();
                var taskStatus = task.checkStatus(mrTaskId);
                respuesta.estado = taskStatus;
            } catch (excepcion) {
                var mensajeError = 'Excepcion Invocando A Script MAP/REDUCE';
                if (!utilities.isEmpty(excepcion) && !utilities.isEmpty(excepcion.message))
                {
                    mensajeError = 'Excepcion Invocando A Script MAP/REDUCE. Excepcion: '+ excepcion.message.toString();
                }
                log.error('Generacion URU-Resguardo', mensajeError);

                respuesta.error = true;
                respuesta.mensaje = mensajeError;
                //log.error('Generación URU-Resguardo', 'Generación URU-Resguardo - Excepcion Invocando A Script MAP/REDUCE - Excepcion : ' + excepcion.message);
            }
            log.audit('Generación URU-Resguardo', 'FIN Invocacion Script MAP/REDUCE');
            return respuesta;
        }

        return {
            onRequest: onRequest
        };
    });