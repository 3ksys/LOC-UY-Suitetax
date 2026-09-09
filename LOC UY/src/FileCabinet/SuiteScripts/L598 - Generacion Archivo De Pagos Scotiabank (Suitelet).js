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
            log.audit('Generacion de Archivo De Pagos Scotiabank', 'INICIO - Metodo: ' + context.request.method);

            try {
                var esOneworld = utilities.l598esOneworld();

                var form = serverWidget.createForm({
                    title: 'Generacion de Archivo De Pagos Scotiabank'
                });

                form.clientScriptModulePath = './L598 - Generacion Archivo De Pagos Scotiabank (Cliente).js'

                var grupoFiltros = form.addFieldGroup({
                    id: 'filtros',
                    label: 'Criterios de Busqueda'
                });

                var grupoDatos = form.addFieldGroup({
                    id: 'infopagos',
                    label: 'Informacion Pagos'
                });

                var tabDetalle = form.addTab({
                    id: 'tabdetalle',
                    label: 'Pago de Facturas'
                });

                var tabDetalleCheques = form.addTab({
                    id: 'tabdetallecheques',
                    label: 'Cheques'
                });

                var subTab = form.addSubtab({
                    id: 'tabbusqueda',
                    label: 'Disponibles:',
                    tab: 'tabdetalle'
                });

                var subTabCheques = form.addSubtab({
                    id: 'tabbusquedacheques',
                    label: 'Disponibles:',
                    tab: 'tabdetallecheques'
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

                var codigoBanco = form.addField({
                    id: 'codigo_banco',
                    label: 'Codigo Banco ScotiaBank:',
                    type: serverWidget.FieldType.TEXT,
                    container: 'filtros'
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN
                });
                //CODIGO SCOTIABANK
                codigoBanco.defaultValue = '128';

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

                var monedaPago = form.addField({
                    id: 'monedapago',
                    type: serverWidget.FieldType.SELECT,
                    label: 'Moneda Pago:',
                    source: 'currency',
                    container: 'filtros'
                });
                
                var fechaPago = form.addField({
                    id: 'fechapago',
                    type: serverWidget.FieldType.DATE,
                    label: 'Fecha Pago:',
                    container: 'filtros'
                });

                var pagosProcesados = form.addField({
                    id: 'pagosprocesados',
                    label: 'Permitir transacciones ya procesadas',
                    type: serverWidget.FieldType.CHECKBOX,
                    container: 'filtros'
                });
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

                if(!utilities.isEmpty(context.request.parameters.pagosprocesados)){
                    pagosProcesados.defaultValue = context.request.parameters.pagosprocesados;
                }

                if (esOneworld){
                    if(!utilities.isEmpty(context.request.parameters.subsidiaria)){
                        subsidiaria.defaultValue = context.request.parameters.subsidiaria;
                    }
                }

                if(!utilities.isEmpty(context.request.parameters.fechapago)){
                    fechaPago.defaultValue = context.request.parameters.fechapago;
                }

                if(!utilities.isEmpty(context.request.parameters.monedapago)){
                    monedaPago.defaultValue = context.request.parameters.monedapago;
                }

                //INICIO - CAMPOS OBLIGATORIOS
                fechaDesde.isMandatory = true;
                fechaHasta.isMandatory = true;
                if (esOneworld){
                    subsidiaria.isMandatory   = true;
                }
                //FIN - CAMPOS OBLIGATORIOS
                //FIN - CAMPOS DE CABECERA

                //INICIO - SUBLISTA PAGOS DE FACTURA
                var sublistFacturas = form.addSublist({
                    id: 'pagospendientes',
                    type: serverWidget.SublistType.LIST,
                    label: 'Pagos Pendientes',
                    tab: 'tabbusqueda'
                });

                sublistFacturas.addField({
                    id: 'chkprocesar',
                    label: 'Exportar',
                    type: serverWidget.FieldType.CHECKBOX,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.NORMAL
                });

                sublistFacturas.addField({
                    id: 'idinterno',
                    label: 'ID Interno Pago',
                    type: serverWidget.FieldType.TEXT,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                sublistFacturas.addField({
                    id: 'referencia',
                    label: 'Referencia Nº',
                    type: serverWidget.FieldType.TEXT,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                sublistFacturas.addField({
                    id: 'beneficiario',
                    label: 'Beneficiario',
                    type: serverWidget.FieldType.TEXT,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                sublistFacturas.addField({
                    id: 'ruc_proveedor',
                    label: 'Ruc Beneficiario',
                    type: serverWidget.FieldType.TEXT,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                sublistFacturas.addField({
                    id: 'fecha_emision',
                    label: 'Fecha de Emisión',
                    type: serverWidget.FieldType.TEXT,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                sublistFacturas.addField({
                    id: 'fecha_pago',
                    label: 'FECHA PAGO',
                    type: serverWidget.FieldType.TEXT,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                sublistFacturas.addField({
                    id: 'banco_benef',
                    label: 'Banco Beneficiario',
                    type: serverWidget.FieldType.TEXT,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });                

                sublistFacturas.addField({
                    id: 'currency',
                    label: 'Moneda Pago',
                    type: serverWidget.FieldType.TEXT
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                sublistFacturas.addField({
                    id: 'importe',
                    label: 'Importe',
                    type: serverWidget.FieldType.TEXT,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                sublistFacturas.addField({
                    id: 'procesado',
                    label: 'Procesado?',
                    type: serverWidget.FieldType.CHECKBOX,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                sublistFacturas.addMarkAllButtons();
                //FIN - SUBLISTA PAGOS DE FACTURA

                //INICIO - SUBLISTA CHEQUES
                var sublistCheques = form.addSublist({
                    id: 'chequespendientes',
                    type: serverWidget.SublistType.LIST,
                    label: 'Cheques Pendientes',
                    tab: 'tabbusquedacheques'
                });

                sublistCheques.addField({
                    id: 'chkprocesar',
                    label: 'Exportar',
                    type: serverWidget.FieldType.CHECKBOX,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.NORMAL
                });

                sublistCheques.addField({
                    id: 'idinterno',
                    label: 'ID Interno Cheque',
                    type: serverWidget.FieldType.TEXT,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                sublistCheques.addField({
                    id: 'referencia',
                    label: 'Referencia Nº',
                    type: serverWidget.FieldType.TEXT,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                sublistCheques.addField({
                    id: 'beneficiario',
                    label: 'Beneficiario',
                    type: serverWidget.FieldType.TEXT,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                sublistCheques.addField({
                    id: 'ruc_proveedor',
                    label: 'Ruc Beneficiario',
                    type: serverWidget.FieldType.TEXT,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                sublistCheques.addField({
                    id: 'fecha_emision',
                    label: 'Fecha de Emisión',
                    type: serverWidget.FieldType.TEXT,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                sublistCheques.addField({
                    id: 'fecha_pago',
                    label: 'FECHA PAGO',
                    type: serverWidget.FieldType.TEXT,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                sublistCheques.addField({
                    id: 'banco_benef',
                    label: 'Banco Beneficiario',
                    type: serverWidget.FieldType.TEXT,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });                

                sublistCheques.addField({
                    id: 'currency',
                    label: 'Moneda Pago',
                    type: serverWidget.FieldType.TEXT
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                sublistCheques.addField({
                    id: 'importe',
                    label: 'Importe',
                    type: serverWidget.FieldType.TEXT,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                sublistCheques.addField({
                    id: 'procesado',
                    label: 'Procesado?',
                    type: serverWidget.FieldType.CHECKBOX,
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.DISABLED
                });

                sublistCheques.addMarkAllButtons();
                //INICIO - SUBLISTA CHEQUES

                form.addSubmitButton({
                    label: 'Buscar Transacciones'
                });

                form.addButton({
                    id: 'custpage_btgenoc',
                    label: 'Generar TXT',
                    functionName: "generarTXT"
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
                    //log.debug('Generacion de Archivo De Pagos Scotiabank', 'LINE 320. sAccion : ' + sAccion);

                    switch (sAccion) {
                        case 'GENERARTXT':
                            var mensaje = "Se proceso su solicitud. Recibira una notificacion al finalizar por email";
                            //log.debug('Generacion de Archivo De Pagos Scotiabank', 'context.request : ' + context.request+'. sublist: '+sublist);
                            var resultado = generarTXTMapReduce(sublistFacturas,sublistCheques, context.request);
                            if (!utilities.isEmpty(resultado) && resultado.error == true) {
                                mensaje = resultado.mensaje;
                                log.error('Generacion de Archivo De Pagos Scotiabank', 'Error Consulta Pagos Pendientes - Error : ' + mensaje);
                            }
                            infoResultado.defaultValue = '<font color="red">' + mensaje + '</font>';
                            log.audit('Generacion de Archivo De Pagos Scotiabank', 'FIN Proceso');
                            context.response.writePage(form);
                            break;
                        case 'Buscar Transacciones':
                            var resultado = cargarPagos(sublistFacturas,sublistCheques,context.request,form);
                            if (!utilities.isEmpty(resultado) && resultado.error == true) {
                                var mensaje = resultado.mensaje;
                                log.error('Generacion de Archivo De Pagos Scotiabank', 'Error Consulta Pagos Pendientes - Error : ' + mensaje);
                                infoResultado.defaultValue = '<font color="red">' + mensaje + '</font>';
                            }
                            log.audit('Generacion de Archivo De Pagos Scotiabank', 'FIN Proceso');
                            context.response.writePage(form);
                            break;
                    }
                }
            }
            catch (excepcion) {
                log.error('Generacion de Archivo De Pagos Scotiabank', 'Excepcion Proceso Generacion de Archivo De Pagos Scotiabank - Excepcion : ' + excepcion.message);
            }
        }

        function generarTXTMapReduce(sublistFacturas,sublistCheques, request) {
            //log.audit('Generacion de Archivo De Pagos Scotiabank', 'LINE 354. INICIO Consulta Pagos Pendientes. request.parameters.pagospendientesdata: '+request.parameters.pagospendientesdata+'. sublistFacturas: '+sublistFacturas+'. sublistCheques: '+sublistCheques);
            //log.debug('Generacion de Archivo De Pagos Scotiabank', 'LINE 355. info a procesar:' + JSON.stringify(request.parameters));
            var idPagosProcesar = new Array();
            var existenPagosSeleccionados = false;
            var respuesta = new Object();
            respuesta.error = false;
            respuesta.mensaje = "";
            respuesta.estado = "";
            try {
                if (!utilities.isEmpty(request.parameters.pagospendientesdata) || (!utilities.isEmpty(request.parameters.chequespendientesdata))) {
                    var delimiterCampos = /\u0001/;
                    var delimiterArray = /\u0002/;
                    var subsidiaria = request.parameters.subsidiaria;
                    var codigoBanco = request.parameters.codigo_banco;
                    //log.debug('Generacion de Archivo De Pagos Scotiabank', 'LINE 458. codigoBanco: '+codigoBanco+'. pagosProcesados: '+pagosProcesados);
                    var sublista = request.parameters.pagospendientesdata.split(delimiterArray);
                    var sublistaCheques = request.parameters.chequespendientesdata.split(delimiterArray);

                    if ((!utilities.isEmpty(sublista) && sublista.length > 0) || (!utilities.isEmpty(sublistaCheques) && sublistaCheques.length > 0)) {

                        //INICIO CICLO PAGOS FACTURAS
                        if (!utilities.isEmpty(sublista) && sublista.length > 0){
                            for (var i = 0; respuesta.error == false && i < sublista.length; i++) {
                                if (!utilities.isEmpty(sublista[i])) {

                                    var columnas = sublista[i].split(delimiterCampos);

                                    if (!utilities.isEmpty(sublista) && sublista.length > 0) {

                                        var procesar = columnas[0];

                                        if (procesar == 'T')
                                        {
                                            existenPagosSeleccionados = true;
                                            var idInternoPagos  = columnas[1];

                                            if(!utilities.isEmpty(idInternoPagos))
                                            {
                                                idPagosProcesar.push(idInternoPagos);
                                            }
                                            else
                                            {
                                                respuesta.error = true;
                                                respuesta.mensaje = "No se pudo Obtener el ID Interno de Pagos de Facturas";
                                            }
                                        }
                                    }
                                    else
                                    {
                                        respuesta.error = true;
                                        respuesta.mensaje = "No se pudo Obtener las columnas de la sublista de Pagos de Facturas";
                                    }
                                }
                                else
                                {
                                    //respuesta.error = true;
                                    respuesta.error = false;
                                    respuesta.mensaje = "No se pudo Obtener el contenido de la sublista de Pagos de Facturas";
                                }
                            }
                        }
                        //FIN CICLO PAGOS FACTURAS

                        //INICIO CICLO CHEQUES
                        if (!utilities.isEmpty(sublistaCheques) && sublistaCheques.length > 0){
                            for (var i = 0; respuesta.error == false && i < sublistaCheques.length; i++) {
                                if (!utilities.isEmpty(sublistaCheques[i])) {

                                    var columnas = sublistaCheques[i].split(delimiterCampos);

                                    if (!utilities.isEmpty(sublistaCheques) && sublistaCheques.length > 0) {

                                        var procesar = columnas[0];

                                        if (procesar == 'T')
                                        {
                                            existenPagosSeleccionados = true;
                                            var idInternoPagos  = columnas[1];

                                            if(!utilities.isEmpty(idInternoPagos))
                                            {
                                                idPagosProcesar.push(idInternoPagos);
                                            }
                                            else
                                            {
                                                respuesta.error = true;
                                                respuesta.mensaje = "No se pudo Obtener el ID Interno de Cheques";
                                            }
                                        }
                                    }
                                    else
                                    {
                                        respuesta.error = true;
                                        respuesta.mensaje = "No se pudo Obtener las columnas de la sublista de Cheques";
                                    }
                                }
                                else
                                {
                                    //respuesta.error = true;
                                    respuesta.error = false;
                                    respuesta.mensaje = "No se pudo Obtener el contenido de la sublista de Cheques";
                                }
                            }
                        }
                        //FIN CICLO CHEQUES

                    	//log.debug('Generacion de Archivo De Pagos Scotiabank','LINE 461. idPagosProcesar: '+JSON.stringify(idPagosProcesar));

                        if (respuesta.error == false && existenPagosSeleccionados == false) {
                            respuesta.error = true;
                            respuesta.mensaje = "No se selecciono ningún pago para procesar";
                        }

                        if (respuesta.error == false &&  utilities.isEmpty(idPagosProcesar)) {
                            respuesta.error = true;
                            respuesta.mensaje = "No se selecciono ningún pago para procesar";
                        }

                        if (respuesta.error == false) {

                            parametros = new Object();
                            parametros.custscript_l598_arch_pag_sbk_mr_id_pagos   = idPagosProcesar.toString();
                            parametros.custscript_l598_arch_pag_sbk_mr_subsidia   = subsidiaria;
                            parametros.custscript_l598_arch_pag_sbk_mr_banco      = codigoBanco;
                            log.debug('Generacion de Archivo De Pagos Scotiabank', 'Generacion Pagos Realizados - Parametros: ' + JSON.stringify(parametros));
                            log.debug('Generacion de Archivo De Pagos Scotiabank', 'INICIO llamada Script MAP/REDUCE');
                            respuesta = createAndSubmitMapReduceJob('customscript_l598_arch_pag_sbk_mr', parametros);
                            var mensajeEstado = "";
                            if (!utilities.isEmpty(respuesta) && !utilities.isEmpty(respuesta.estado))
                            {
                                mensajeEstado = respuesta.estado.status;
                            }
                            log.audit('Generacion de Archivo De Pagos Scotiabank', 'MAP/REDUCE - Estado : ' + mensajeEstado);
                        }
                    } else {
                        respuesta.error = true;
                        respuesta.mensaje = "No se pudo obtener registros de la sublista de Pagos de Facturas";
                    }
                } else {
                    respuesta.error = true;
                    respuesta.mensaje = "No se pudo obtener sublista de Pagos de Facturas";
                }

            } catch (excepcion) {
                respuesta.error = true;
                respuesta.mensaje = "Excepcion Consultando Pagos Pendientes - Excepcion : " + excepcion.message;
                log.error('Generacion de Archivo De Pagos Scotiabank', 'Consulta Pagos Pendientes - Excepcion Consultando Pagos Pendientes - Excepcion : ' + excepcion.message);
            }
            log.audit('Generacion de Archivo De Pagos Scotiabank', 'FIN Consulta Pagos Pendientes');
            return respuesta;
        }

        function cargarPagos(sublistFacturas, sublistCheques, request, form) {

            log.debug('Generacion de Archivo De Pagos Scotiabank', 'INICIO Consulta Pagos/Cheques Pendientes');
            var respuesta = new Object();
            respuesta.error = false;
            respuesta.mensaje = "";

            try {

                var separadorMultiSelect = /\u0005/;
                var esOneworld = utilities.l598esOneworld();

                var pagosPendientes = search.load({
                    id: 'customsearch_l598_prev_pago_fact_scotiba'
                });

                var chequesPendientes = search.load({
                    id: 'customsearch_l598_prev_cheques_scotibank'
                });
                //log.debug('Generacion de Archivo De Pagos Scotiabank', 'request.parameters.fechadesde: '+request.parameters.fechadesde+'. request.parameters.fechahasta: '+request.parameters.fechahasta+'. esOneworld: '+esOneworld);

                if (!utilities.isEmpty(request.parameters.fechadesde)) {
                    var fechadesde = request.parameters.fechadesde;
                    if (!utilities.isEmpty(fechadesde) && fechadesde.length > 0) {
                        var filtroFechaDesde = search.createFilter({
                            name: 'trandate',
                            operator: search.Operator.ONORAFTER,
                            values: fechadesde
                        });

                        pagosPendientes.filters.push(filtroFechaDesde);
                        chequesPendientes.filters.push(filtroFechaDesde);
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

                        pagosPendientes.filters.push(filtroFechaHasta);
                        chequesPendientes.filters.push(filtroFechaHasta);
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

                            pagosPendientes.filters.push(filtroSubsidiaria);
                            chequesPendientes.filters.push(filtroSubsidiaria);
                        }
                    }
                }

                if (!utilities.isEmpty(request.parameters.monedapago)) {
                    var monedapago = request.parameters.monedapago;
                    if (!utilities.isEmpty(monedapago) && monedapago.length > 0) {
                        var filtroMonedapago = search.createFilter({
                            name: 'currency',
                            operator: search.Operator.IS,
                            values: monedapago
                        });

                        pagosPendientes.filters.push(filtroMonedapago);
                        chequesPendientes.filters.push(filtroMonedapago);
                    }
                }

                if (!utilities.isEmpty(request.parameters.fechapago)) {
                    var fechapago = request.parameters.fechapago;
                    if (!utilities.isEmpty(fechapago) && fechapago.length > 0) {
                        var filtroFechaPago = search.createFilter({
                            name: 'custbody_l598_fecha_pago',
                            operator: search.Operator.ON,
                            values: fechapago
                        });

                        pagosPendientes.filters.push(filtroFechaPago);
                        chequesPendientes.filters.push(filtroFechaPago);
                    }
                }

                if (!utilities.isEmpty(request.parameters.pagosprocesados)) {
                    var pagosprocesados = request.parameters.pagosprocesados;
                    if (!utilities.isEmpty(pagosprocesados)) {
                        if (pagosprocesados == 'F') {                          

                            var filtroPagosProcesados = search.createFilter({
                                name: 'custbody_l598_pago_procesado',
                                operator: search.Operator.IS,
                                values: false
                            });
                            pagosPendientes.filters.push(filtroPagosProcesados);
                            chequesPendientes.filters.push(filtroPagosProcesados);

                            var filtroFechaProcesados = search.createFilter({
                                name: 'custbody_l598_pago_fecha_hora_proc',
                                operator: search.Operator.ISEMPTY
                            });
                            pagosPendientes.filters.push(filtroFechaProcesados);
                            chequesPendientes.filters.push(filtroFechaProcesados);
                        }  
                    }
                }

                var resultSetPagosPend = pagosPendientes.run();
                var resultSetCheques = chequesPendientes.run();

                var completeResultSetPagosPend = null;
                var completeResultSetCheques = null;

                //log.debug('Generacion de Archivo De Pagos Scotiabank', 'LINE 716. INICIO Consulta Busqueda Pagos Pendientes');

                var resultIndex = 0;
                var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                var resultadoPagosPend; // temporary variable used to store the result set
                do {
                    // fetch one result set
                    resultadoPagosPend = resultSetPagosPend.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });

                    if (!utilities.isEmpty(resultadoPagosPend) && resultadoPagosPend.length > 0) {
                        if (resultIndex == 0)
                            completeResultSetPagosPend = resultadoPagosPend;
                        else
                            completeResultSetPagosPend = completeResultSetPagosPend.concat(resultadoPagosPend);
                    }

                    // increase pointer
                    resultIndex = resultIndex + resultStep;

                    // once no records are returned we already got all of them
                } while (!utilities.isEmpty(resultadoPagosPend) && resultadoPagosPend.length > 0)


                var resultIndexChq = 0;
                var resultStepChq = 1000; // Number of records returned in one step (maximum is 1000)
                var resultadoChq; // temporary variable used to store the result set
                do {
                    // fetch one result set
                    resultadoChq = resultSetCheques.getRange({
                        start: resultIndexChq,
                        end: resultIndexChq + resultStepChq
                    });

                    if (!utilities.isEmpty(resultadoChq) && resultadoChq.length > 0) {
                        if (resultIndexChq == 0)
                            completeResultSetCheques = resultadoChq;
                        else
                            completeResultSetCheques = completeResultSetCheques.concat(resultadoChq);
                    }

                    // increase pointer
                    resultIndexChq = resultIndexChq + resultStepChq;

                    // once no records are returned we already got all of them
                } while (!utilities.isEmpty(resultadoChq) && resultadoChq.length > 0)


                var idInternosTotal =[];

                //INICIO - SI SE HALLO INFORMACION de Pagos de Facturas (VENDORPAYMENT) SE LLENA LA SUBLISTA
                if (!utilities.isEmpty(completeResultSetPagosPend)) {

                    log.debug('Generacion de Archivo De Pagos Scotiabank', 'Cantidad de Pagos Pendientes: ' + completeResultSetPagosPend.length);
                    var idUnico = 0;
                    var idUnicoAnterior = 0;
                    var idInternos = new Array();
                    var idInternos2 = new Array();
                    var i = 0;

                    while (!utilities.isEmpty(completeResultSetPagosPend) && completeResultSetPagosPend.length > 0 && i < completeResultSetPagosPend.length){

                        var internalId = completeResultSetPagosPend[i].getValue({
                            name: resultSetPagosPend.columns[2]
                        });

                        var beneficiario = completeResultSetPagosPend[i].getValue({
                            name: resultSetPagosPend.columns[1]
                        });

                        var ruc_proveedor = completeResultSetPagosPend[i].getValue({
                            name: resultSetPagosPend.columns[0]
                        });

                        var fecha_emision = completeResultSetPagosPend[i].getValue({
                            name: resultSetPagosPend.columns[3]
                        });

                        var importe = completeResultSetPagosPend[i].getValue({
                            name: resultSetPagosPend.columns[4]
                        });

                        idUnico = completeResultSetPagosPend[i].getValue({
                            name: resultSetPagosPend.columns[2]
                        });

                        var tranId = completeResultSetPagosPend[i].getValue({
                            name: resultSetPagosPend.columns[6]
                        });

                        var procesado = completeResultSetPagosPend[i].getValue({
                            name: resultSetPagosPend.columns[7]
                        });

                        var moneda = completeResultSetPagosPend[i].getValue({
                            name: resultSetPagosPend.columns[8]
                        });

                        var banco = completeResultSetPagosPend[i].getValue({
                            name: resultSetPagosPend.columns[9]
                        });

                        var fecha_pago = completeResultSetPagosPend[i].getValue({
                            name: resultSetPagosPend.columns[10]
                        });

                        if (!utilities.isEmpty(internalId) && internalId.length>0) {
                            sublistFacturas.setSublistValue({
                                id: 'idinterno',
                                line: i,
                                value: internalId
                            });
                        }

                        if (!utilities.isEmpty(beneficiario) && beneficiario.length>0) {
                            sublistFacturas.setSublistValue({
                                id: 'beneficiario',
                                line: i,
                                value: beneficiario
                            });
                        }

                        if (!utilities.isEmpty(ruc_proveedor) && ruc_proveedor.length>0) {
                            sublistFacturas.setSublistValue({
                                id: 'ruc_proveedor',
                                line: i,
                                value: ruc_proveedor
                            });
                        }

                        if (!utilities.isEmpty(fecha_emision) && fecha_emision.length>0) {
                            sublistFacturas.setSublistValue({
                                id: 'fecha_emision',
                                line: i,
                                value: fecha_emision
                            });
                        }

                        if (!utilities.isEmpty(importe) && importe.length>0) {
                            sublistFacturas.setSublistValue({
                                id: 'importe',
                                line: i,
                                value: importe
                            });
                        }

                        if (!utilities.isEmpty(idInternos) && idInternos.length>0) {
                            sublistFacturas.setSublistValue({
                                id: 'idinternos',
                                line: i,
                                value: idInternos.toString()
                            });
                        }

                        if (!utilities.isEmpty(idInternos2) && idInternos2.length>0) {
                            sublistFacturas.setSublistValue({
                                id: 'idinternos2',
                                line: i,
                                value: idInternos2.toString()
                            });
                        }

                        if (!utilities.isEmpty(tranId) && tranId.length>0) {
                            sublistFacturas.setSublistValue({
                                id: 'referencia',
                                line: i,
                                value: tranId
                            });
                        }

                        if (!utilities.isEmpty(procesado)) {                        
                            sublistFacturas.setSublistValue({
                                id: 'procesado',
                                line: i,
                                value: procesado
                            });
                        }

                        if (!utilities.isEmpty(moneda)) {
                            sublistFacturas.setSublistValue({
                                id: 'currency',
                                line: i,
                                value: moneda
                            });
                        }

                        if (!utilities.isEmpty(fecha_pago)) {
                            sublistFacturas.setSublistValue({
                                id: 'fecha_pago',
                                line: i,
                                value: fecha_pago
                            });
                        }

                        if (!utilities.isEmpty(banco)) {
                            sublistFacturas.setSublistValue({
                                id: 'banco_benef',
                                line: i,
                                value: banco
                            });
                        }

                        i++;
                    }
                }
                else {
                    //respuesta.error = true;
                    respuesta.mensaje = "No se encontraron Pagos Pendientes";
                    log.audit('Generacion de Archivo De Pagos Scotiabank', 'FIN Consulta Busqueda Pagos Realizados - No se encontraron Pagos Realizados');
                }
				//FIN - SI SE HALLO INFORMACION de Pagos de Facturas (VENDORPAYMENT) SE LLENA LA SUBLISTA


				//INICIO - SI SE HALLO INFORMACION DE CHEQUES PENDIENTES (CHEQUES) SE LLENA LA SUBLISTA
                if (!utilities.isEmpty(completeResultSetCheques)) {
                    log.debug('Generacion de Archivo De Pagos Scotiabank', 'Cantidad de Cheques Pendientes: ' + completeResultSetCheques.length);
                    var idUnico = 0;
                    var idUnicoAnterior = 0;
                    var idInternos = new Array();
                    var idInternos2 = new Array();
                    var i = 0;

                    while (!utilities.isEmpty(completeResultSetCheques) && completeResultSetCheques.length > 0 && i < completeResultSetCheques.length) {

                        var internalId = completeResultSetCheques[i].getValue({
                            name: resultSetCheques.columns[2]
                        });

                        var beneficiario = completeResultSetCheques[i].getValue({
                            name: resultSetCheques.columns[1]
                        });

                        var ruc_proveedor = completeResultSetCheques[i].getValue({
                            name: resultSetCheques.columns[0]
                        });

                        var fecha_emision = completeResultSetCheques[i].getValue({
                            name: resultSetCheques.columns[3]
                        });

                        var importe = completeResultSetCheques[i].getValue({
                            name: resultSetCheques.columns[4]
                        });

                        idUnico = completeResultSetCheques[i].getValue({
                            name: resultSetCheques.columns[2]
                        });

                        var tranId = completeResultSetCheques[i].getValue({
                            name: resultSetCheques.columns[6]
                        });

                        var procesado = completeResultSetCheques[i].getValue({
                            name: resultSetCheques.columns[7]
                        });

                        var moneda = completeResultSetCheques[i].getValue({
                            name: resultSetPagosPend.columns[8]
                        });

                        var banco = completeResultSetCheques[i].getValue({
                            name: resultSetPagosPend.columns[9]
                        });

                        var fecha_pago = completeResultSetCheques[i].getValue({
                            name: resultSetPagosPend.columns[10]
                        });

                        if (!utilities.isEmpty(internalId) && internalId.length>0) {
                            sublistCheques.setSublistValue({
                                id: 'idinterno',
                                line: i,
                                value: internalId
                            });
                        }

                        if (!utilities.isEmpty(beneficiario) && beneficiario.length>0) {
                            sublistCheques.setSublistValue({
                                id: 'beneficiario',
                                line: i,
                                value: beneficiario
                            });
                        }

                        if (!utilities.isEmpty(ruc_proveedor) && ruc_proveedor.length>0) {
                            sublistCheques.setSublistValue({
                                id: 'ruc_proveedor',
                                line: i,
                                value: ruc_proveedor
                            });
                        }

                        if (!utilities.isEmpty(fecha_emision) && fecha_emision.length>0) {
                            sublistCheques.setSublistValue({
                                id: 'fecha_emision',
                                line: i,
                                value: fecha_emision
                            });
                        }

                        if (!utilities.isEmpty(importe) && importe.length>0) {
                            sublistCheques.setSublistValue({
                                id: 'importe',
                                line: i,
                                value: importe
                            });
                        }

                        if (!utilities.isEmpty(tranId) && tranId.length>0) {
                            sublistCheques.setSublistValue({
                                id: 'referencia',
                                line: i,
                                value: tranId
                            });
                        }

                        if (!utilities.isEmpty(procesado)) {
                            sublistCheques.setSublistValue({
                                id: 'procesado',
                                line: i,
                                value: procesado
                            });
                        }

                        if (!utilities.isEmpty(moneda)) {
                            sublistCheques.setSublistValue({
                                id: 'currency',
                                line: i,
                                value: moneda
                            });
                        }

                        if (!utilities.isEmpty(fecha_pago)) {
                            sublistCheques.setSublistValue({
                                id: 'fecha_pago',
                                line: i,
                                value: fecha_pago
                            });
                        }

                        if (!utilities.isEmpty(banco)) {
                            sublistCheques.setSublistValue({
                                id: 'banco_benef',
                                line: i,
                                value: banco
                            });
                        }
                        i++;
                    }
                }
				else
				{
                    //respuesta.error = true;
                    respuesta.mensaje = "No se encontraron Cheques Pendientes";
                    //log.audit('Generacion de Archivo De Pagos Scotiabank', 'FIN Consulta Busqueda Pagos Realizados - No se encontraron Cheques Realizados');
                }
				//FIN - SI SE HALLO INFORMACION DE CHEQUES PENDIENTES (CHEQUES) SE LLENA LA SUBLISTA

            } catch (excepcion) {
                respuesta.error = true;
                respuesta.mensaje = "Excepcion Consultando Pagos Pendientes - Excepcion : " + excepcion.message;
                log.error('Generacion de Archivo De Pagos Scotiabank', 'Consulta Busqueda Pagos Realizados - Excepcion Consultando Pagos - Excepcion : ' + excepcion.message);
            }

            log.debug('Generacion de Archivo De Pagos Scotiabank', 'FIN Consulta Pagos/Cheques Pendientes');
            return respuesta;
        }

        function createAndSubmitMapReduceJob(idScript, parametros) {
            log.audit('Generacion de Archivo De Pagos Scotiabank', 'INICIO Invocacion Script MAP/REDUCE');
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
                log.error('Generacion de Archivo De Pagos Scotiabank', 'Generacion Pagos Realizados - Excepcion Invocando A Script MAP/REDUCE - Excepcion : ' + excepcion.message);
            }
            log.audit('Generacion de Archivo De Pagos Scotiabank', 'FIN Invocacion Script MAP/REDUCE');
            return respuesta;
        }

        return {
            onRequest: onRequest
        };
    });