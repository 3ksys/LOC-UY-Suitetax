/**
 * @NApiVersion 2.1
 * @NAmdConfig /SuiteScripts/configuration.json
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */

define(['N/search', 'N/record', 'N/email', 'N/runtime', 'N/error', 'N/format', 'N/runtime', 'N/file', '3K/utilities', 'N/url'],
    /**
     * @param {record} record
     */
    function(search, record, email, runtime, error, format, runtime, file, utilities, url) {

        function enviarEmail(autor, destinatario, titulo, mensaje, archivo) {


            if (!utilities.isEmpty(autor) && !utilities.isEmpty(destinatario) && !utilities.isEmpty(titulo) && !utilities.isEmpty(mensaje)) {
                var adjunto = null;

                if (!utilities.isEmpty(archivo))
                {
                    var fileObj = file.load({
                        id: archivo
                    });
                    adjunto = [fileObj];
                }

                email.send({
                    author: autor,
                    recipients: destinatario,
                    subject: titulo,
                    body: mensaje,
                    attachments: adjunto
                });

            } else {
                var detalleError = 'No se recibio la siguiente informacion necesaria para realizar el envio del Email : ';
                if (utilities.isEmpty(autor)) {
                    detalleError = detalleError + ' ID del Autor del Email / ';
                }
                if (utilities.isEmpty(destinatario)) {
                    detalleError = detalleError + ' ID del Destinatario del Email / ';
                }
                if (utilities.isEmpty(titulo)) {
                    detalleError = detalleError + ' ID del Titulo del Email / ';
                }
                if (utilities.isEmpty(mensaje)) {
                    detalleError = detalleError + ' ID del Mensaje del Email / ';
                }
                log.error('Generacion URU-Resguardo', 'REDUCE - Error Envio Email - Error : ' + detalleError);
            }
            //log.debug('enviarEmail', 'REDUCE - FIN ENVIO EMAIL');
        }

        function getParams(){
            try{
                var informacion = new Object();
                var currScript = runtime.getCurrentScript();
                informacion = JSON.parse(currScript.getParameter('custscript_l598_gen_uru_resg_vent_mapr_d'));
                //informacion.fechaResguardo = currScript.getParameter('custscript_l598_gen_uru_resguardo_mapr_f');
                //informacion.fechaEmisionResguardo = currScript.getParameter('custscript_l598_gen_uru_resguardo_mapr_g');
                //informacion.idPeriodoContable = currScript.getParameter('custscript_l598_gen_uru_resguardo_mapr_p');

                log.debug('GETPARAMS', 'Parametros - informacion : ' + JSON.stringify(informacion));                

                return informacion;
            }
            catch (excepcion)
            {
                var mensajeError = 'GETPARAMS - Excepcion obteniendo parametros';
                if (!utilities.isEmpty(excepcion) && !utilities.isEmpty(excepcion.message)) {
                    mensajeError = 'GETPARAMS - Excepcion obteniendo parametros - Excepcion  : ' + excepcion.message.toString();
                }
                log.error('Generacion URU-Resguardo', mensajeError);
                return null;
            }
        }
        function getConfiguracionFE(params){
            try{
                var savedsearch = search.create({
                    type: "customrecord_l598_conf_factura_elec",
                    filters:
                    [
                        ["isinactive","is","F"], 
                        "AND", 
                        ["custrecord_l598_conf_fe_subsidiaria","anyof",params.idSubsidiaria]
                    ],
                    columns:
                    [
                        search.createColumn({name: "custrecord_l598_conf_fe_transint_resg_ve", label: "Generar Trans. Interna para Resguardos de Ventas"})
                    ]
                });
                var resultSearch = savedsearch.run();
                var completeResultSet = resultSearch.getRange({
                    start: 0,
                    end: 1
                });
                var objConfig = new Object();
                if(!utilities.isEmpty(completeResultSet) && completeResultSet.length > 0)
                {
                    objConfig.transinterna = completeResultSet[0].getValue({
                        name: resultSearch.columns[0]
                    });
                }
                return objConfig
            }catch(excepcion)
            {
                var mensajeError = 'GETPARAMS - Excepcion obteniendo configuración de FE';
                if (!utilities.isEmpty(excepcion) && !utilities.isEmpty(excepcion.message)) {
                    mensajeError = 'GETPARAMS - Excepcion obteniendo configuración de FE - Excepcion  : ' + excepcion.message.toString();
                }
                log.error('getConfiguracionFE', mensajeError);
                return null;
            }

        }

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

            try {
                log.audit('Generacion URU-Resguardo', 'GETINPUTDATA - INICIO');

                //INICIO OBTENER PARAMETROS
                var informacionProcesar = getParams();
                //FIN OBTENER PARAMETROS

                //INICIO OBTENER CONFIGURACION FACTURACION ELECTRONICA
                var configuracionFE = getConfiguracionFE(informacionProcesar);
                log.debug('configuracionFE',configuracionFE)

                var infProcesar = new Array();
                var fechaResguardo;
                var fechaEmisionResguardo;
                var infProcesarAUX = new Array();
                var idPeriodoContable;
                var idSubsidiaria;
                var idCliente;

                log.debug('informacionProcesar',informacionProcesar)

                if (!utilities.isEmpty(informacionProcesar) && !utilities.isEmpty(informacionProcesar.fechaResguardo))
                    fechaResguardo = informacionProcesar.fechaResguardo;

                if (!utilities.isEmpty(informacionProcesar) && !utilities.isEmpty(informacionProcesar.fechaEmisionResguardo))
                    fechaEmisionResguardo = informacionProcesar.fechaEmisionResguardo;

                if (!utilities.isEmpty(informacionProcesar) && !utilities.isEmpty(informacionProcesar.idPeriodoContable))
                    idPeriodoContable = informacionProcesar.idPeriodoContable;
                if (!utilities.isEmpty(informacionProcesar) && !utilities.isEmpty(informacionProcesar.idSubsidiaria))
                    idSubsidiaria = informacionProcesar.idSubsidiaria;
                if (!utilities.isEmpty(informacionProcesar) && !utilities.isEmpty(informacionProcesar.idCliente))
                    idCliente = informacionProcesar.idCliente;
                
                //DECLARACION DEL SAVE SEARCH A EJECUTAR
                var transaccionesPendientes = search.load({
                    id: 'customsearch_l598_bene_fiscal_resgvent'
                });

                //FILTRO DE PERIODO
                var filtroPeriod = search.createFilter({
                    name: 'postingperiod',
                    operator: search.Operator.ANYOF,
                    values: idPeriodoContable
                });
                transaccionesPendientes.filters.push(filtroPeriod);
                //FILTRO DE SUBSIDIARIA
                if(idSubsidiaria){
                    var filtroSubsidiaria = search.createFilter({
                        name: 'subsidiary',
                        operator: search.Operator.ANYOF,
                        values: idSubsidiaria
                    });
                    transaccionesPendientes.filters.push(filtroSubsidiaria);
                }
                //FILTRO DE CLIENTE
                if(idCliente){
                    var filtroCliente = search.createFilter({
                        name: 'internalid',
                        join: 'customermain',
                        operator: search.Operator.ANYOF,
                        values: idCliente
                    });
                    transaccionesPendientes.filters.push(filtroCliente);
                }
                
                log.audit('transaccionesPendientes - SEARCH ',transaccionesPendientes)

                var resultSearch = transaccionesPendientes.run();
                var resultIndex = 0;
                var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                var resultado; // temporary variable used to store the result set
                var rangoInicial = 0;
                var completeResultSet = [];

                do{
                    resultado = resultSearch.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });

                    if (!utilities.isEmpty(resultado) && resultado.length > 0)
                    {
                        if (resultIndex==0) completeResultSet = resultado;
                        else completeResultSet = completeResultSet.concat(resultado);
                    }
                    resultIndex = resultIndex + resultStep;

                } while (!utilities.isEmpty(resultado) && resultado.length > 0)
                rangoInicial = rangoInicial + resultStep;
                log.debug('LINE 236 - completeResultSet',completeResultSet)

                for (var i=0; !utilities.isEmpty(completeResultSet) && i < completeResultSet.length; i++)
                {
                    var objDetail = new Object();

                    //ID CLIENTE TRANSACCION
                    objDetail.idCliente = completeResultSet[i].getValue({
                        name: resultSearch.columns[1]
                    });

                    //PERIDO TRANSACCION
                    objDetail.periodo = completeResultSet[i].getValue({
                        name: resultSearch.columns[2]
                    });

                    //SUBSIDIARIA TRANSACCION
                    objDetail.subsidiaria = completeResultSet[i].getValue({
                        name: resultSearch.columns[3]
                    });

                    //MONEDA TRANSACCION
                    objDetail.moneda = completeResultSet[i].getValue({
                        name: resultSearch.columns[4]
                    });

                    //IMPORTE TOTAL
                    objDetail.importeResguardo = completeResultSet[i].getValue({
                        name: resultSearch.columns[5]
                    });
                    //IMPORTE (416)
                    objDetail.importeCF416 = completeResultSet[i].getValue({
                        name: resultSearch.columns[6]
                    });
                    //IMPORTE (426)
                    objDetail.importeCF426 = completeResultSet[i].getValue({
                        name: resultSearch.columns[7]
                    });

                    //IDS FACTURAS
                    var idsFacturas = completeResultSet[i].getValue({
                        name: resultSearch.columns[8]
                    });
                    objDetail.idsFacturas = idsFacturas.toString();

                    //IDS FACTURAS
                    var idsFacturasTypes = completeResultSet[i].getValue({
                        name: resultSearch.columns[9]
                    });
                    objDetail.idsFacturasTypes = idsFacturasTypes.toString();

                    //URU-TIPO DE DOCUMENTO
                    objDetail.tipoDocumento = completeResultSet[i].getValue({
                        name: resultSearch.columns[10]
                    });

                    //URU-SUCURSAL
                    objDetail.sucursal = completeResultSet[i].getValue({
                        name: resultSearch.columns[11]
                    });


                    //URU-NUMERO DE DOCUMENTO
                    objDetail.nroDocumento = completeResultSet[i].getValue({
                        name: resultSearch.columns[12]
                    });

                    //URU-RAZON SOCIAL CLIENTE
                    objDetail.razonSocial = completeResultSet[i].getValue({
                        name: resultSearch.columns[13]
                    });

                    //DIRECCION
                    objDetail.direccion = completeResultSet[i].getValue({
                        name: resultSearch.columns[14]
                    });

                    //CIUDAD
                    objDetail.ciudad = completeResultSet[i].getValue({
                        name: resultSearch.columns[15]
                    });

                    //PAIS
                    objDetail.pais = completeResultSet[i].getValue({
                        name: resultSearch.columns[16]
                    });

                    //CODIGO POSTAL
                    objDetail.codigoPostal = completeResultSet[i].getValue({
                        name: resultSearch.columns[17]
                    });

                    //TRAN ID
                    objDetail.idsFacturasNames = completeResultSet[i].getValue({
                        name: resultSearch.columns[18]
                    });


                    //FECHA RESGUARDO
                    objDetail.fechaResguardo = fechaResguardo;

                    //URU-FECHA EMISION RESGUARDO
                    objDetail.fechaEmisionResguardo = fechaEmisionResguardo;

                    //PERIODO
                    objDetail.idPeriodoContable = idPeriodoContable

                    //URU Transaccion Interna
                    objDetail.transinterna = configuracionFE.transinterna;

                    infProcesar.push(objDetail);
                }
                log.debug('GETINPUTDATA','LINE 330. FIN FOR DE LLENADO DE ARRAY infProcesar. infProcesar: '+JSON.stringify(infProcesar));

                if (!utilities.isEmpty(infProcesar))
                {

                    for (var i=0; !utilities.isEmpty(infProcesar) && i < infProcesar.length; i++)
                    {
                        var { 
                            idCliente, periodo, subsidiaria, moneda, importeResguardo,importeCF416,importeCF426, sucursal,
                            tipoDocumento, nroDocumento, razonSocial, direccion, ciudad, pais,
                            codigoPostal, fechaResguardo, fechaEmisionResguardo,idsFacturas,idsFacturasTypes,idsFacturasNames, transinterna
                        } = infProcesar[i];
                        var objDetailAUX = {
                            idCliente,periodo,subsidiaria,moneda,importeResguardo,importeCF416,importeCF426, sucursal,
                            tipoDocumento,nroDocumento,razonSocial,direccion,ciudad,pais,
                            codigoPostal,fechaResguardo,fechaEmisionResguardo,idsFacturas,idsFacturasTypes,idsFacturasNames, transinterna
                        };
                        infProcesarAUX.push(objDetailAUX);

                    }
                }
                log.debug('GETINPUTDATA','LINE 491 - infProcesarAUX: '+JSON.stringify(infProcesarAUX));
                log.audit('Generacion URU-Resguardo', 'GETINPUTDATA - FIN');

                return(infProcesarAUX);

            }
            catch (excepcion)
            {
                var mensajeError = 'GETINPUTDATA - Error Obteniendo Transacciones A Procesar';
                if (!utilities.isEmpty(excepcion) && !utilities.isEmpty(excepcion.message)) {
                    mensajeError = 'GETINPUTDATA - Error Obteniendo Transacciones A Procesar - Excepcion  : ' + excepcion.message.toString();
                }
                log.error('Generacion URU-Resguardo', mensajeError);
            }
        }

        /**
         * Executes when the map entry point is triggered and applies to each key/value pair.
         *
         * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
         * @since 2015.1
         */
        function map(context) {

            log.audit('Generacion URU-Resguardo', 'MAP - INICIO');

            try {
                // Validación y parseo más eficiente
                if (!context.value) {
                    log.error('Generacion URU-Resguardo', 'MAP - Valor de contexto vacío');
                    return;
                }

                var searchResult = JSON.parse(context.value);
                
                if (utilities.isEmpty(searchResult)) {
                    log.error('Generacion URU-Resguardo', 'MAP - Resultados vacíos');
                    return;
                }

                if (searchResult.importeResguardo <= 0) {
                    log.error('Generacion URU-Resguardo', 'MAP - Resultado Importe Menor Igual a 0');
                    return;
                }

                var resguardoInfo = crearResguardo(searchResult);
                log.audit('resguardoInfo',resguardoInfo)
                

                    // Enviamos el ID al summarize usando write
                    context.write({
                        key: '1',
                        value: JSON.stringify(resguardoInfo)
                    });
                

            }
            catch (excepcion)
            {
                var mensajeError = 'MAP - Excepcion Procesando ID de Transacciones A Procesar';
                if (!utilities.isEmpty(excepcion) && !utilities.isEmpty(excepcion.message)) {
                    mensajeError = 'MAP - Excepcion Procesando ID de Transacciones A Procesar - Excepcion  : ' + excepcion.message.toString();
                }
                log.error('Generacion URU-Resguardo', mensajeError);
            }
            log.audit('Generacion URU-Resguardo', 'MAP - FIN');
        }
        function crearResguardo(registroURU){
            try{
                var errorGeneral = false;
                var idResguardo;
                var rutaRelativa;
                var respuesta = { "error": false, "detalles_errores": [] };
                var recURUResguardo = record.create({
                    type: 'customtransaction_l598_resguardos',
                    isDynamic: true
                });

                //INICIO - CREACION URU-RESGUARDO

                if (utilities.l598esOneworld())
                {
                    //SUBSIDIARIA
                    recURUResguardo.setValue({
                        fieldId:'subsidiary',
                        value: registroURU.subsidiaria
                    });
                }

                //MONEDA
                recURUResguardo.setValue({
                    fieldId:'currency',
                    value: registroURU.moneda
                });

                //ID Cliente
                recURUResguardo.setValue({
                    fieldId:'custbody_l598_resguardo_cliente',
                    value: registroURU.idCliente
                });


                //DIRECCION RECEPTOR
                recURUResguardo.setValue({
                    fieldId:'custbody_l598_resguardo_direccion_prov',
                    value: registroURU.direccion
                });

                //CIUDAD RECEPTOR
                recURUResguardo.setValue({
                    fieldId:'custbody_l598_resguardo_ciudad',
                    value: registroURU.ciudad
                });

                //PAIS RECEPTOR
                recURUResguardo.setValue({
                    fieldId:'custbody_l598_resguardo_pais',
                    value: registroURU.pais
                });

                //CODIGO POSTAL RECEPTOR
                recURUResguardo.setValue({
                    fieldId:'custbody_l598_resguardo_cod_postal',
                    value: registroURU.codigoPostal
                });

                //URU-TIPO DOCUMENTO
                recURUResguardo.setValue({
                    fieldId:'custbody_l598_tipo_documento',
                    value: registroURU.tipoDocumento
                });

                //URU-NUMERO DOCUMENTO
                recURUResguardo.setValue({
                    fieldId:'custbody_l598_nro_documento',
                    value: registroURU.nroDocumento
                });

                //URU-RAZON SOCIAL CLIENTE
                recURUResguardo.setValue({
                    fieldId:'custbody_l598_razon_social_cliente',
                    value: registroURU.razonSocial
                });

                //ESTADO TRANSACCION
                recURUResguardo.setValue({
                    fieldId: 'transtatus',
                    value: 'A'
                });

                var fechaResguardo = format.parse({
                    value: registroURU.fechaResguardo,
                    type: format.Type.DATE,
                    timezone: format.Timezone.AMERICA_MONTEVIDEO // Buenos Aires - Argentina
                });

                //FECHA TRANSACCION
                recURUResguardo.setValue({
                    fieldId: 'trandate',
                    value: fechaResguardo
                });

                var fechaEmisionResguardo = format.parse({
                    value: registroURU.fechaEmisionResguardo,
                    type: format.Type.DATE,
                    timezone: format.Timezone.AMERICA_MONTEVIDEO // Buenos Aires - Argentina
                });

                //URU-FECHA EMISION RESGUARDO
                recURUResguardo.setValue({
                    fieldId: 'custbody_l598_resguardo_fecha_emision',
                    value: fechaEmisionResguardo
                });

                //TRANSACCION INTERNA
                recURUResguardo.setValue({
                    fieldId: 'custbody_l598_trans_interna',
                    value: registroURU.transinterna
                })

                //PERIODO CONTABLE URU-RESGUARDO
                recURUResguardo.setValue({
                    fieldId: 'postingperiod',
                    value: registroURU.idPeriodoContable
                });

                //IMPORTE TOTAL DEL RESGUARDO
                recURUResguardo.setValue({
                    fieldId:'custbody_l598_resguardo_importe',
                    value: registroURU.importeResguardo
                });

                //IMPORTE CRED FISCAL (416)
                recURUResguardo.setValue({
                    fieldId:'custbody_l598_cred_fisc_imp_416',
                    value: registroURU.importeCF416
                });

                //IMPORTE CRED FISCAL (426)
                recURUResguardo.setValue({
                    fieldId:'custbody_l598_cred_fisc_imp_426',
                    value: registroURU.importeCF426
                });





                if (!errorGeneral)
                {

                    try
                    {
                        idResguardo = recURUResguardo.save();
                    }
                    catch(excepcion)
                    {
                        //log.error('Generacion URU-Resguardo','Excepcion ocurrida mientras se creaba la transaccion de URU-Resguardo. Detalles: '+e.message);
                        errorGeneral = true;
                        var mensajeError = 'Excepcion ocurrida mientras se creaba la transaccion de URU-Resguardo';
                        respuesta.error = true;
                        respuesta.detalles_errores.push(mensajeError);
                        if (!utilities.isEmpty(excepcion) && !utilities.isEmpty(excepcion.message)) {
                            mensajeError = 'Excepcion ocurrida mientras se creaba la transaccion de URU-Resguardo - Excepcion  : ' + excepcion.message.toString();
                        }
                        log.error('Generacion URU-Resguardo', mensajeError);
                    }

                    log.debug('Generacion URU-Resguardo','URU-RESGUARDO GENERADO ID: '+idResguardo);

                }
                //SI SE CREA EL RECORD - SE CREA DETALLE
                var idsFacturas = (registroURU.idsFacturas).split(',')
                var idsFacturasTypes = (registroURU.idsFacturasTypes).split(',')
                var idsFacturasNames = (registroURU.idsFacturasNames).split(',')
                //SI SE CREA EL RECORD - SE EDITA LAS FACTURAS y CREAR REFERENCIA
                for (var i=0; !utilities.isEmpty(idsFacturas) && i < idsFacturas.length; i++)
                {
                    try
                    {
                        var id = record.submitFields({
                            type: idsFacturasTypes[i],
                            id: idsFacturas[i],
                            values: {
                                custbody_l598_link_uru_resguardo: idResguardo
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields : true
                            }
                        });
                        var referenciaRecord = record.create({
                        type: 'customrecord_l598_info_referencia', 
                        isDynamic: true,
                        });
                        referenciaRecord.setValue({
                            fieldId: 'custrecord_l598_info_referencia_transac',
                            value: idResguardo,
                        });
                        referenciaRecord.setValue({
                            fieldId: 'custrecord_l598_info_referencia_razon',
                            value: idsFacturasNames[i],
                        });
                        referenciaRecord.save();                    

                        
                    }
                    catch(excepcion)
                    {
                        errorGeneral = true;
                        var mensajeError = 'Excepcion ocurrida mientras se actualizaba el estado y link de resguardo en la transacción con ID: '+idsFacturas[i];
                        respuesta.error = true;
                        respuesta.detalles_errores.push(mensajeError);
                        if (!utilities.isEmpty(excepcion) && !utilities.isEmpty(excepcion.message)) {
                            mensajeError = 'Excepcion ocurrida mientras se actualizaba el estado y link de resguardo en la transacción con ID: '+idsFacturas[i] +'. Detalles: '+ excepcion.message.toString();
                        }
                        log.error('Generacion URU-Resguardo', mensajeError);
                    }
                    
                }
                //SE CREA DETALLE 416
                if(!utilities.isEmpty(idResguardo) && registroURU.importeCF416!=0){
                    var detalleRecord = record.create({
                        type: 'customrecord_l598_detalle_cred_fisc_resg', 
                        isDynamic: true,
                        });
                        detalleRecord.setValue({
                            fieldId: 'custrecord_l598_det_cre_fis_resg_rel',
                            value: idResguardo,
                        });
                        detalleRecord.setValue({
                            fieldId: 'custrecord_l598_det_cre_fis_resg_cod_for',
                            value: '2181416',
                        });
                        detalleRecord.setValue({
                            fieldId: 'custrecord_l598_det_cre_fi_res_ba_im_cre',
                            value: parseFloat(registroURU.importeCF416),
                        });
                        detalleRecord.setValue({
                            fieldId: 'custrecord_l598_det_cre_fis_resg_alicuot',
                            value: 100,
                        });
                        detalleRecord.setValue({
                            fieldId: 'custrecord_l598_det_cre_fis_resg_ind_fac',
                            value: 0,
                        });
                        detalleRecord.save();
                }
                //SE CREA DETALLE 426
                if(!utilities.isEmpty(idResguardo) && registroURU.importeCF426!=0){
                    var detalleRecord = record.create({
                        type: 'customrecord_l598_detalle_cred_fisc_resg', 
                        isDynamic: true,
                        });
                        detalleRecord.setValue({
                            fieldId: 'custrecord_l598_det_cre_fis_resg_rel',
                            value: idResguardo,
                        });
                        detalleRecord.setValue({
                            fieldId: 'custrecord_l598_det_cre_fis_resg_cod_for',
                            value: '2181426',
                        });
                        detalleRecord.setValue({
                            fieldId: 'custrecord_l598_det_cre_fi_res_ba_im_cre',
                            value: parseFloat(registroURU.importeCF426),
                        });
                        detalleRecord.setValue({
                            fieldId: 'custrecord_l598_det_cre_fis_resg_alicuot',
                            value: 100,
                        });
                        detalleRecord.setValue({
                            fieldId: 'custrecord_l598_det_cre_fis_resg_ind_fac',
                            value: 0,
                        });
                        detalleRecord.save();
                }
                //SI EL PROCESO SE EJECUTA OK SE INFORMA VIA EMAIL AL USUARIO
                if (!utilities.isEmpty(idResguardo) && !errorGeneral){
                    rutaRelativa = url.resolveRecord({
                            recordType: 'customtransaction_l598_resguardos',
                            recordId: idResguardo,
                            isEditMode: false
                    });
                }
                return {errorGeneral,respuesta,idResguardo,rutaRelativa};
            }
            catch(excepcion)
            {
                //log.error('Generacion URU-Resguardo','Excepcion ocurrida mientras se creaba transaccion URU-Resguardo. Detalles: '+e.message);
                var mensajeError = 'Excepcion general en el proceso de creación de transaccion URU-Resguardo';
                if (!utilities.isEmpty(excepcion) && !utilities.isEmpty(excepcion.message)) {
                    mensajeError = 'Excepcion general en el proceso de creación de transaccion URU-Resguardo. Detalles: '+ excepcion.message.toString();
                }
                log.error('Generacion URU-Resguardo', mensajeError);
                error = true;
            } 
        }
        function getInformacionDetalle(idsFacturas){
            try{
                var infoDetalle = {};
                //DECLARACION DEL SAVE SEARCH A EJECUTAR
                var transaccionesPendientes = search.load({
                    id: 'customsearch_l598_bene_fiscal_resgvent'
                });

                //FILTRO DE PERIODO
                var filtroId = search.createFilter({
                    name: 'internalid',
                    operator: search.Operator.ANYOF,
                    values: idsFacturas
                });
                transaccionesPendientes.filters.push(filtroId);

                var columnId = search.createColumn({
                    name: "internalid",
                    summary: "GROUP",
                    label: "Internal ID"
                });
                transaccionesPendientes.columns[0] = columnId;
                
                log.audit('transaccionesPendientes - SEARCH ',transaccionesPendientes)

                var resultSearch = transaccionesPendientes.run();
                var resultIndex = 0;
                var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
                var resultado; // temporary variable used to store the result set
                var rangoInicial = 0;
                var completeResultSet = [];

                do{
                    resultado = resultSearch.getRange({
                        start: resultIndex,
                        end: resultIndex + resultStep
                    });

                    if (!utilities.isEmpty(resultado) && resultado.length > 0)
                    {
                        if (resultIndex==0) completeResultSet = resultado;
                        else completeResultSet = completeResultSet.concat(resultado);
                    }
                    resultIndex = resultIndex + resultStep;

                } while (!utilities.isEmpty(resultado) && resultado.length > 0)
                rangoInicial = rangoInicial + resultStep;
                log.debug('LINE 648 - completeResultSet',completeResultSet)

                for (var i=0; !utilities.isEmpty(completeResultSet) && i < completeResultSet.length; i++)
                {
                    var objDetail = new Object();

                    objDetail.id = completeResultSet[i].getValue({
                        name: resultSearch.columns[0]
                    });

                    //IMPORTE TOTAL
                    objDetail.importeResguardo = completeResultSet[i].getValue({
                        name: resultSearch.columns[5]
                    });

                    //RUBRO CODIGO
                    objDetail.codigoRubro = completeResultSet[i].getValue({
                        name: resultSearch.columns[18]
                    });


                    infoDetalle[objDetail.id] = objDetail;
                }
                return infoDetalle;
            }
            catch(excepcion)
            {
                //log.error('Generacion URU-Resguardo','Excepcion ocurrida mientras se creaba transaccion URU-Resguardo. Detalles: '+e.message);
                var mensajeError = 'Excepcion general en el proceso de creación de transaccion URU-Resguardo';
                if (!utilities.isEmpty(excepcion) && !utilities.isEmpty(excepcion.message)) {
                    mensajeError = 'Excepcion general en el proceso de creación de transaccion URU-Resguardo. Detalles: '+ excepcion.message.toString();
                }
                log.error('Generacion URU-Resguardo', mensajeError);
                error = true;
            } 
        }
        function enviarMensajeRespuesta(resguardosCreados,erroresResguardos){
            try{
                //SI EL PROCESO SE EJECUTA OK SE INFORMA VIA EMAIL AL USUARIO
                var autor = runtime.getCurrentUser().id;
                var destinatario = autor;
                var titulo = 'Proceso Generación Transacción URU-Resguardo';
                var mensajeMail = 'El proceso de Generación Transacción URU-Resguardo - Ventas';

                var links = '';
                if (resguardosCreados.length > 0){
                    var esquema = 'https://';
                    var host = url.resolveDomain({
                        hostType: url.HostType.APPLICATION
                    });
                    links = '<br>Puede observar el detalle de las transacciones  exitosas URU-Resguardo en los siguientes links:';
                    for(var i=0;i<resguardosCreados.length;i++){
                        var urlRT = esquema + host + resguardosCreados[i].rutaRelativa;
                        links += '<br><a href="' + urlRT + '">Transacción URU-Resguardo '+resguardosCreados[i].idResguardo+'</a>'
                    }
                }
                var errores = '';
                if (erroresResguardos.length > 0){
                    errores =  '<br>El proceso de Generación Transacción URU-Resguardo finalizó con errores. Detalles: ';

                    for(var i=0;i<erroresResguardos.length;i++){
                        var body = JSON.stringify(erroresResguardos[i].respuesta);
                        errores += '<br>' + body
                    }

                }
                var mensaje = '<html><head></head><body><br>' + mensajeMail + links + errores + '</body></html>';
                enviarEmail(autor, destinatario, titulo, mensaje);
                //FIN - ENVIO EMAIL      
            
            }catch(excepcion){
                var mensajeError = 'Excepcion general en el proceso de enviarMensajeRespuesta';
                if (!utilities.isEmpty(excepcion) && !utilities.isEmpty(excepcion.message)) {
                    mensajeError = 'Excepcion general en el proceso de enviarMensajeRespuesta. Detalles: '+ excepcion.message.toString();
                }
                log.error('enviarMensajeRespuesta', mensajeError);
            }
        }



  
        function summarize(summary) {
            try{
                log.audit('SUMMARIZE - INICIO', 'Procesando resultados');
                
                var resguardosProcesados = [];
                log.audit('summary',summary)

                
                summary.output.iterator().each(function (key, value){
                    log.audit('value',value)
                    var respuesta = JSON.parse(value);
                    resguardosProcesados.push(respuesta)
                    return true;
                }); 
                log.audit('SUMMARIZE resguardosProcesados',resguardosProcesados)
                var { erroresResguardos, resguardosCreados } = resguardosProcesados.reduce(
                    (acc, r) => {
                        if (r.errorGeneral) {
                            acc.erroresResguardos.push(r);
                        } else {
                            acc.resguardosCreados.push(r);
                        }
                        return acc;
                    },
                    { erroresResguardos: [], resguardosCreados: [] }
                );

                log.audit('SUMMARIZE erroresResguardos',erroresResguardos)
                log.audit('SUMMARIZE resguardosCreados',resguardosCreados)
                if(erroresResguardos.length>0 || resguardosCreados.length>0 ){
                    enviarMensajeRespuesta(resguardosCreados,erroresResguardos)
                }

                return ;
            }catch(excepcion){
                log.error('Summarize',excepcion)
            }
        }

        return {
            getInputData: getInputData,
            map: map,
            summarize: summarize
        };

    });