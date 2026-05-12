/**
 * @NApiVersion 2.x
 * @NAmdConfig /SuiteScripts/configuration.json
 * @NScriptType Suitelet
 * @NModuleScope Public
 */

/*require.config({
    paths: {
        '3K/utilities': './3K - Utilities'
    }
});*/

define(['N/ui/serverWidget', 'N/https', 'N/record', 'N/error', 'N/search', 'N/format', 'N/task', '3K/utilities'],

    function(serverWidget, https, record, error, search, format, task, utilities) {

        /**
         * Definition of the Suitelet script trigger point.
         *
         * @param {Object} context
         * @param {ServerRequest} context.request - Encapsulation of the incoming request
         * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
         * @Since 2015.2
         */
        function onRequest(context) {
            log.audit('Generacion URU-Resguardo', 'INICIO - Metodo: ' + context.request.method);

            try {
                var esOneworld = utilities.l598esOneworld();

                var form = serverWidget.createForm({
                    title: 'Generacion URU-Resguardo'
                });

                form.clientScriptModulePath = './L598 - Generacion URU-Retenciones (Cliente).js'

                var grupoFiltros = form.addFieldGroup({
                    id: 'filtros',
                    label: 'Criterios de Busqueda'
                });

                var grupoDatos = form.addFieldGroup({
                    id: 'infoNC',
                    label: 'Informacion'
                });

                var tabDetalle = form.addTab({
                    id: 'tabdetalle',
                    label: 'Notas de Credito',
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
                var fechaDesde = form.addField({
                    id: 'fechadesde',
                    type: serverWidget.FieldType.DATE,
                    label: 'Fecha desde:',
                    container: 'filtros'                    
                });

                var fechaHasta = form.addField({
                    id: 'fechahasta',
                    type: serverWidget.FieldType.DATE,
                    label: 'Fecha hasta:',
                    container: 'filtros'
                });

                if (esOneworld)
                {
                    var subsidiaria = form.addField({
                        id: 'subsidiaria',
                        type: serverWidget.FieldType.SELECT,
                        label: 'Subsidiaria:',
                        source: 'subsidiary',
                        container: 'filtros'
                    });
                }
                else
                {
                    var subsidiaria = 0;
                }

                //FIN - FILTROS
               
                // Por defecto la Fecha Actual
                var fechaServidor = new Date();

                var fechaLocal = format.format({
                    value: fechaServidor,
                    type: format.Type.DATE,
                    timezone: format.Timezone.AMERICA_MONTEVIDEO // Buenos Aires - Argentina
                });

                var fechaLocalDate = format.parse({
                    value: fechaLocal,
                    type: format.Type.DATE,
                    timezone: format.Timezone.AMERICA_MONTEVIDEO // Buenos Aires - Argentina
                });

                if (!utilities.isEmpty(fechaLocal))
                {
                    fechaHasta.defaultValue = fechaLocalDate;
                }
              
                if(!utilities.isEmpty(context.request.parameters.fechadesde)){
                    fechaDesde.defaultValue = context.request.parameters.fechadesde;
                }

                if(!utilities.isEmpty(context.request.parameters.fechahasta)){
                    fechaHasta.defaultValue = context.request.parameters.fechahasta;
                }
                else{
                    if (!utilities.isEmpty(fechaLocal))
                    {
                        fechaHasta.defaultValue = fechaLocalDate;
                    }
                }

                if (esOneworld){
                    if(!utilities.isEmpty(context.request.parameters.subsidiaria)){
                        subsidiaria.defaultValue = context.request.parameters.subsidiaria;
                    }
                }

                //INICIO - CAMPOS OBLIGATORIOS
                fechaDesde.isMandatory = true;
                fechaHasta.isMandatory = true;
                if (esOneworld){
                    subsidiaria.isMandatory   = true;
                }
                //FIN - CAMPOS OBLIGATORIOS
                //FIN - CAMPOS DE CABECERA

                //INICIO - SUBLISTA NOTAS DE CREDITO
                var sublistNotasCredito = form.addSublist({
                    id: 'notascreditopendientes',
                    type: serverWidget.SublistType.LIST,
                    label: 'Notas de Credito',
                    tab: 'tabdetalle'
                });

                sublistNotasCredito.addField({
                    id: 'chkprocesar',
                    label: 'Exportar',
                    type: serverWidget.FieldType.CHECKBOX,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.NORMAL
                });

                sublistNotasCredito.addField({
                    id: 'idinterno',
                    label: 'ID INTERNO',
                    type: serverWidget.FieldType.TEXT,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                sublistNotasCredito.addField({
                    id: 'tranid',
                    label: 'REFERENCIA N.º',
                    type: serverWidget.FieldType.TEXT,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                sublistNotasCredito.addField({
                    id: 'codretencion',
                    label: 'CODIGO RET.',
                    type: serverWidget.FieldType.TEXT,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                sublistNotasCredito.addField({
                    id: 'alicuota',
                    label: 'ALICUOTA RET.',
                    type: serverWidget.FieldType.PERCENT,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                sublistNotasCredito.addField({
                    id: 'proveedor',
                    label: 'URU-RAZON SOCIAL',
                    type: serverWidget.FieldType.TEXT,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                sublistNotasCredito.addField({
                    id: 'ruc_proveedor',
                    label: 'URU-NUMERO DOCUMENTO',
                    type: serverWidget.FieldType.TEXT,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                sublistNotasCredito.addField({
                    id: 'fecha_emision',
                    label: 'FECHA DE EMISIÓN',
                    type: serverWidget.FieldType.TEXT,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                sublistNotasCredito.addField({
                    id: 'importe',
                    label: 'IMPORTE',
                    type: serverWidget.FieldType.CURRENCY,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                sublistNotasCredito.addMarkAllButtons();
                //FIN - SUBLISTA NOTAS DE CREDITO


                form.addSubmitButton({
                    label: 'Buscar Notas de Credito'
                });

                form.addButton({
                    id: 'custpage_btgenoc',
                    label: 'Generar',
                    functionName: "generarRetenciones"
                });

                var infoResultado = form.addField({
                    id: 'custpage_resultado',
                    label: 'Resultados',
                    type: serverWidget.FieldType.INLINEHTML
                });

                if (context.request.method === 'GET') {
                    context.response.writePage(form);
                } else {
                    var sAccion = utilities.isEmpty(context.request.parameters.custpage_accion) ? context.request.parameters.submitter : context.request.parameters.custpage_accion;
                    //log.debug('Generacion URU-Resguardo', 'LINE 248. sAccion : ' + sAccion);

                    switch (sAccion) {
                        case 'GENERARETENCIONES':
                            var mensaje = "Se proceso su solicitud. Recibira una notificacion al finalizar por email";
                            //log.debug('Generacion URU-Resguardo', 'context.request : ' + context.request+'. sublist: '+sublist);
                            var resultado = generarResguardoMapReduce(sublistNotasCredito, context.request);
                            if (!utilities.isEmpty(resultado) && resultado.error == true) {
                                mensaje = resultado.mensaje;
                                log.error('Generacion URU-Resguardo', 'Error Consulta Pagos Pendientes - Error : ' + mensaje);
                            }
                            infoResultado.defaultValue = '<font color="red">' + mensaje + '</font>';
                            log.audit('Generacion URU-Resguardo', 'FIN Proceso');
                            context.response.writePage(form);
                            break;
                        case 'Buscar Notas de Credito':
                            var resultado = cargarNotasCredito(sublistNotasCredito,context.request,form);
                            if (!utilities.isEmpty(resultado) && resultado.error == true) {
                                var mensaje = resultado.mensaje;
                                log.error('Generacion URU-Resguardo', 'Error Consulta Pagos Pendientes - Error : ' + mensaje);
                                infoResultado.defaultValue = '<font color="red">' + mensaje + '</font>';
                            }
                            log.audit('Generacion URU-Resguardo', 'FIN Proceso');
                            context.response.writePage(form);
                            break;
                    }
                }
            }
            catch (excepcion) {
                log.error('Generacion URU-Resguardo', 'Excepcion Proceso Generacion URU-Resguardo - Excepcion : ' + excepcion.message);
            }
        }

        function generarResguardoMapReduce(sublistNotasCredito, request) {
            //log.audit('Generacion URU-Resguardo', 'LINE 282. INICIO Consulta Pagos Pendientes. request.parameters.notascreditopendientesdata: '+request.parameters.notascreditopendientesdata+'. sublistNotasCredito: '+sublistNotasCredito+'. sublistCheques: '+sublistCheques);
            //log.debug('Generacion URU-Resguardo', 'LINE 283. info a procesar:' + JSON.stringify(request.parameters));
            var arrayNCProcesar = new Array();
            var existenNCSeleccionadas = false;
            var respuesta = new Object();
            respuesta.error = false;
            respuesta.mensaje = "";
            respuesta.estado = "";
            try {
                if (!utilities.isEmpty(request.parameters.notascreditopendientesdata)) {
                    var delimiterCampos = /\u0001/;
                    var delimiterArray = /\u0002/;
                    var fechaDesde = request.parameters.fechadesde;
                    var fechaHasta = request.parameters.fechahasta;
                    var subsidiaria = request.parameters.subsidiaria;
                    var sublista = request.parameters.notascreditopendientesdata.split(delimiterArray);

                    if ((!utilities.isEmpty(sublista) && sublista.length > 0)) {

                        //INICIO CICLO NOTAS DE CREDITO
                        if (!utilities.isEmpty(sublista) && sublista.length > 0){
                            for (var i = 0; respuesta.error == false && i < sublista.length; i++) {
                                if (!utilities.isEmpty(sublista[i])) {

                                    var columnas = sublista[i].split(delimiterCampos);

                                    if (!utilities.isEmpty(sublista) && sublista.length > 0) {

                                        var procesar = columnas[0];

                                        if (procesar == 'T')
                                        {
                                            existenNCSeleccionadas = true;
                                            var idInternoNC  = columnas[1];

                                            if(!utilities.isEmpty(idInternoNC))
                                            {
                                                arrayNCProcesar.push(idInternoNC);
                                            }
                                            else
                                            {
                                                respuesta.error = true;
                                                respuesta.mensaje = "No se pudo Obtener el ID Interno de Notas de Credito";
                                            }
                                        }
                                    }
                                    else
                                    {
                                        respuesta.error = true;
                                        respuesta.mensaje = "No se pudo Obtener las columnas de la sublista de Notas de Credito";
                                    }
                                }
                                else
                                {
                                    //respuesta.error = true;
                                    respuesta.error = false;
                                    respuesta.mensaje = "No se pudo Obtener el contenido de la sublista de Notas de Credito";
                                }
                            }
                        }
                        //FIN CICLO NOTAS DE CREDITO

                    	//log.debug('Generacion URU-Resguardo','LINE 344. arrayNCProcesar: '+JSON.stringify(arrayNCProcesar));

                        if (respuesta.error == false && existenNCSeleccionadas == false) {
                            respuesta.error = true;
                            respuesta.mensaje = "No se selecciono ninguna nota de credito para procesar";
                        }

                        if (respuesta.error == false &&  utilities.isEmpty(arrayNCProcesar)) {
                            respuesta.error = true;
                            respuesta.mensaje = "No se selecciono ninguna nota de credito para procesar";
                        }

                        if (respuesta.error == false) {

                            parametros = new Object();
                            parametros.custscript_l598_gen_uru_resguardo_mr_ncs   = arrayNCProcesar.toString();
                            parametros.custscript_l598_gen_uru_resguardo_mr_fde    = fechaDesde;
                            parametros.custscript_l598_gen_uru_resguardo_mr_fha    = fechaHasta;
                            parametros.custscript_l598_gen_uru_resguardo_mr_sub   = subsidiaria;
                            log.debug('Generacion URU-Resguardo', 'Generacion URU-Resguardo - Parametros: ' + JSON.stringify(parametros));
                            log.debug('Generacion URU-Resguardo', 'INICIO llamada Script MAP/REDUCE');
                            respuesta = createAndSubmitMapReduceJob('customscript_l598_gen_uru_resguardo_mr', parametros);
                            var mensajeEstado = "";
                            if (!utilities.isEmpty(respuesta) && !utilities.isEmpty(respuesta.estado))
                            {
                                mensajeEstado = respuesta.estado.status;
                            }
                            log.audit('Generacion URU-Resguardo', 'MAP/REDUCE - Estado : ' + mensajeEstado);
                        }
                    } else {
                        respuesta.error = true;
                        respuesta.mensaje = "No se pudo obtener registros de la sublista de Notas de Credito";
                    }
                } else {
                    respuesta.error = true;
                    respuesta.mensaje = "No se pudo obtener sublista de sublista de Notas de Credito";
                }

            } catch (excepcion) {
                respuesta.error = true;
                respuesta.mensaje = "Excepcion Consultando Pagos Pendientes - Excepcion : " + excepcion.message;
                log.error('Generacion URU-Resguardo', 'Consulta Pagos Pendientes - Excepcion Consultando Pagos Pendientes - Excepcion : ' + excepcion.message);
            }
            log.audit('Generacion URU-Resguardo', 'FIN Consulta Pagos Pendientes');
            return respuesta;
        }

        function cargarNotasCredito(sublistNotasCredito, request, form) {

            log.debug('Generacion URU-Resguardo', 'INICIO Consulta Notas de Credito sin URU-Resguardo');
            var respuesta = new Object();
            respuesta.error = false;
            respuesta.mensaje = "";

            try {

                var separadorMultiSelect = /\u0005/;
                var esOneworld = utilities.l598esOneworld();

                var notasCreditoPendientes = search.load({
                    id: 'customsearch_l598_vendorpayment_resg'
                });

                //log.debug('Generacion URU-Resguardo', 'request.parameters.fechadesde: '+request.parameters.fechadesde+'. request.parameters.fechahasta: '+request.parameters.fechahasta+'. esOneworld: '+esOneworld);

                if (!utilities.isEmpty(request.parameters.fechadesde)) {
                    var fechadesde = request.parameters.fechadesde;
                    if (!utilities.isEmpty(fechadesde) && fechadesde.length > 0) {
                        var filtroFechaDesde = search.createFilter({
                            name: 'trandate',
                            operator: search.Operator.ONORAFTER,
                            values: fechadesde
                        });

                        notasCreditoPendientes.filters.push(filtroFechaDesde);
                    }
                }

                if (!utilities.isEmpty(request.parameters.fechahasta)) {
                    var fechahasta = request.parameters.fechahasta;
                    if (!utilities.isEmpty(fechahasta) && fechahasta.length > 0) {
                        var filtroFechaHasta = search.createFilter({
                            name: 'trandate',
                            operator: search.Operator.ONORBEFORE,
                            values: fechahasta
                        });

                        notasCreditoPendientes.filters.push(filtroFechaHasta);
                    }
                }

                if (esOneworld){
                    if (!utilities.isEmpty(request.parameters.subsidiaria)) {
                        var subsidiaria = request.parameters.subsidiaria;
                        if (!utilities.isEmpty(subsidiaria) && subsidiaria.length > 0) {
                            var filtroSubsidiaria = search.createFilter({
                                name: 'subsidiary',
                                operator: search.Operator.IS,
                                values: subsidiaria
                            });

                            notasCreditoPendientes.filters.push(filtroSubsidiaria);
                        }
                    }
                }

                var resultsNotasCreditoPend = notasCreditoPendientes.run();
                var completeResultSetNotasCreditoPend = null;
                //log.debug('Generacion URU-Resguardo', 'LINE 452. INICIO Consulta Busqueda Pagos Pendientes');

                var resultIndex = 0;
                var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                var resultadoNotasCreditoPend; // temporary variable used to store the result set
                do {
                    // fetch one result set
                    resultadoNotasCreditoPend = resultsNotasCreditoPend.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });

                    if (!utilities.isEmpty(resultadoNotasCreditoPend) && resultadoNotasCreditoPend.length > 0) {
                        if (resultIndex == 0)
                            completeResultSetNotasCreditoPend = resultadoNotasCreditoPend;
                        else
                            completeResultSetNotasCreditoPend = completeResultSetNotasCreditoPend.concat(resultadoNotasCreditoPend);
                    }

                    // increase pointer
                    resultIndex = resultIndex + resultStep;

                    // once no records are returned we already got all of them
                } while (!utilities.isEmpty(resultadoNotasCreditoPend) && resultadoNotasCreditoPend.length > 0)



                var idInternosTotal =[];

                //INICIO - SI SE HALLO INFORMACION de sublista de Notas de Credito (VENDORCREDIT) SE LLENA LA SUBLISTA
                if (!utilities.isEmpty(completeResultSetNotasCreditoPend)) {

                    log.debug('Generacion URU-Resguardo', 'Cantidad de Notas de Credito sin URU-Resguardo: ' + completeResultSetNotasCreditoPend.length);
                    var idUnicoAnterior = 0;
                    var idInternos = new Array();
                    var idInternos2 = new Array();
                    var i = 0;

                    while (!utilities.isEmpty(completeResultSetNotasCreditoPend) && completeResultSetNotasCreditoPend.length > 0 && i < completeResultSetNotasCreditoPend.length){

                        var internalId = completeResultSetNotasCreditoPend[i].getValue({
                            name: resultsNotasCreditoPend.columns[0]
                        });

                        var nombreProveedor = completeResultSetNotasCreditoPend[i].getValue({
                            name: resultsNotasCreditoPend.columns[1]
                        });

                        var ruc_proveedor = completeResultSetNotasCreditoPend[i].getValue({
                            name: resultsNotasCreditoPend.columns[2]
                        });

                        var fecha_emision = completeResultSetNotasCreditoPend[i].getValue({
                            name: resultsNotasCreditoPend.columns[3]
                        });

                        var importe = completeResultSetNotasCreditoPend[i].getValue({
                            name: resultsNotasCreditoPend.columns[4]
                        });

                        var tranId = completeResultSetNotasCreditoPend[i].getValue({
                            name: resultsNotasCreditoPend.columns[5]
                        });

                        var codRetencion = completeResultSetNotasCreditoPend[i].getValue({
                            name: resultsNotasCreditoPend.columns[6]
                        });

                        var alicuota = completeResultSetNotasCreditoPend[i].getValue({
                            name: resultsNotasCreditoPend.columns[7]
                        });
        
                        if (!utilities.isEmpty(internalId) && internalId.length>0) {
                            sublistNotasCredito.setSublistValue({
                                id: 'idinterno',
                                line: i,
                                value: internalId
                            });
                        }

                        if (!utilities.isEmpty(nombreProveedor) && nombreProveedor.length>0) {
                            sublistNotasCredito.setSublistValue({
                                id: 'proveedor',
                                line: i,
                                value: nombreProveedor
                            });
                        }

                        if (!utilities.isEmpty(ruc_proveedor) && ruc_proveedor.length>0) {
                            sublistNotasCredito.setSublistValue({
                                id: 'ruc_proveedor',
                                line: i,
                                value: ruc_proveedor
                            });
                        }

                        if (!utilities.isEmpty(fecha_emision) && fecha_emision.length>0) {
                            sublistNotasCredito.setSublistValue({
                                id: 'fecha_emision',
                                line: i,
                                value: fecha_emision
                            });
                        }

                        if (!utilities.isEmpty(importe) && importe.length>0) {
                            sublistNotasCredito.setSublistValue({
                                id: 'importe',
                                line: i,
                                value: importe
                            });
                        }

                        if (!utilities.isEmpty(tranId) && tranId.length>0) {
                            sublistNotasCredito.setSublistValue({
                                id: 'tranid',
                                line: i,
                                value: tranId
                            });
                        }

                        if (!utilities.isEmpty(codRetencion) && codRetencion.length>0) {
                            sublistNotasCredito.setSublistValue({
                                id: 'codretencion',
                                line: i,
                                value: codRetencion
                            });
                        }

                        if (!utilities.isEmpty(alicuota) && alicuota.length>0) {
                            sublistNotasCredito.setSublistValue({
                                id: 'alicuota',
                                line: i,
                                value: alicuota
                            });
                        }
                        i++;
                    }
                }
                else {
                    //respuesta.error = true;
                    respuesta.mensaje = "No se encontraron Pagos Pendientes";
                    log.audit('Generacion URU-Resguardo', 'FIN Consulta Notas de Credito sin URU-Resguardo - No se encontraron Consulta Notas de Credito');
                }
				//FIN - SI SE HALLO INFORMACION de sublista de Notas de Credito (VENDORCREDIT) SE LLENA LA SUBLISTA

            } catch (excepcion) {
                respuesta.error = true;
                respuesta.mensaje = "Excepcion Consulta Notas de Credito sin URU-Resguardo - Excepcion : " + excepcion.message;
                log.error('Generacion URU-Resguardo', 'Consulta Notas de Credito sin URU-Resguardo - Excepcion Consultando Pagos - Excepcion : ' + excepcion.message);
            }

            log.debug('Generacion URU-Resguardo', 'FIN Consulta Notas de Credito sin URU-Resguardo');
            return respuesta;
        }

        function createAndSubmitMapReduceJob(idScript, parametros) {
            log.audit('Generacion URU-Resguardo', 'INICIO Invocacion Script MAP/REDUCE');
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
                respuesta.error = true;
                respuesta.mensaje = "Excepcion Invocando A Script MAP/REDUCE - Excepcion : " + excepcion.message;
                log.error('Generacion URU-Resguardo', 'Generacion URU-Resguardo - Excepcion Invocando A Script MAP/REDUCE - Excepcion : ' + excepcion.message);
            }
            log.audit('Generacion URU-Resguardo', 'FIN Invocacion Script MAP/REDUCE');
            return respuesta;
        }

        return {
            onRequest: onRequest
        };
    });