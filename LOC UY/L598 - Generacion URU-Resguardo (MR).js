/**
 * @NApiVersion 2.x
 * @NAmdConfig /SuiteScripts/configuration.json
 * @NScriptType MapReduceScript
 * @NModuleScope Public
 */

/*require.config({
    paths: {
        '3K/utilities': './3K - Utilities'
    }
});*/

define(['N/search', 'N/record', 'N/email', 'N/runtime', 'N/error', 'N/format', 'N/runtime', 'N/file', '3K/utilities', 'N/url', 'L598/crear_resguardo'],
    /**
     * @param {record} record
     */
    function(search, record, email, runtime, error, format, runtime, file, utilities, url, resguardo) {

        function handleErrorAndSendNotification(e, stage) {
            log.error('Estado : ' + stage + ' Error', e);

            var author = runtime.getCurrentUser().id;
            var recipients = runtime.getCurrentUser().id;
            var subject = 'Proceso de Generación Transacción URU-Resguardo ' + runtime.getCurrentScript().id + ' Error en Estado : ' + stage;
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
            summary.errors.iterator().each(function(key, value) {
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

        function getParams(){
            try
            {
                var informacion = new Object();
                var currScript = runtime.getCurrentScript();
                var st = JSON.stringify(currScript);
                informacion.idRegistrosProcesar = currScript.getParameter('custscript_l598_gen_uru_resguardo_mapr_r');
                informacion.fechaResguardo = currScript.getParameter('custscript_l598_gen_uru_resguardo_mapr_f');
                informacion.fechaEmisionResguardo = currScript.getParameter('custscript_l598_gen_uru_resguardo_mapr_g');
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

                var infProcesar = new Array();
                var arrayRegistros = new Array();
                var fechaResguardo;
                var fechaEmisionResguardo;
                var infProcesarAUX = new Array();

                if (!utilities.isEmpty(informacionProcesar) && !utilities.isEmpty(informacionProcesar.idRegistrosProcesar))
                    arrayRegistros = informacionProcesar.idRegistrosProcesar.split(',');

                if (!utilities.isEmpty(informacionProcesar) && !utilities.isEmpty(informacionProcesar.fechaResguardo))
                    fechaResguardo = informacionProcesar.fechaResguardo;

                if (!utilities.isEmpty(informacionProcesar) && !utilities.isEmpty(informacionProcesar.fechaEmisionResguardo))
                    fechaEmisionResguardo = informacionProcesar.fechaEmisionResguardo;

                if (!utilities.isEmpty(informacionProcesar) && !utilities.isEmpty(informacionProcesar.idPeriodoContable))
                    idPeriodoContable = informacionProcesar.idPeriodoContable;


                //SI EL ARRAY CON LOS ID DE LAS TRANSACCIONES TIENE DATOS, CONTINUAR
                if (!utilities.isEmpty(arrayRegistros) && arrayRegistros.length > 0)
                {
                    //DECLARACION DEL SAVE SEARCH A EJECUTAR
                    var transaccionesPendientes = search.load({
                        id: 'customsearch_l598_retencion_resguardo_gr'
                    });
                    log.debug('arrayRegistros - PRUEBA', arrayRegistros);
                    //FILTRO DE ID INTERNO DE TRANSACCIONES
                    var filtroID = search.createFilter({
                        name: 'internalid',
                        operator: search.Operator.ANYOF,
                        values: arrayRegistros
                    });
                    transaccionesPendientes.filters.push(filtroID);
                }

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
                    log.debug('PRUEBA RESULTADO',resultado);
                    if (!utilities.isEmpty(resultado) && resultado.length > 0)
                    {
                        if (rangoInicial==0) completeResultSet = resultado;
                        else completeResultSet = completeResultSet.concat(resultado);
                    }
                    resultIndex = resultIndex + resultStep;

                } while (!utilities.isEmpty(resultado) && resultado.length > 0)
                rangoInicial = rangoInicial + resultStep;
                log.debug('completeResultSet PRUEBA',completeResultSet);
                for (var i=0; !utilities.isEmpty(completeResultSet) && i < completeResultSet.length; i++)
                {
                    var objDetail = new Object();

                    //ID PROVEEDOR TRANSACCION
                    objDetail.idProveedor = completeResultSet[i].getValue({
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

                    //URU-PAIS ORIGEN
                    objDetail.importeResguardo = completeResultSet[i].getValue({
                        name: resultSearch.columns[5]
                    });

                    /*INICIO - MANEJO PARA ELIMINAR LOS ID DE RETENCIONES REPETIDOS*/
                    var idsRetenciones = completeResultSet[i].getValue({
                        name: resultSearch.columns[6]
                    });

                    var arrayIdRetenciones = idsRetenciones.toString().split(',');
                    log.debug('arrayIdRetenciones - PRUEBA', arrayIdRetenciones);
                    var arrayIdRetencionesAUX = arrayIdRetenciones.filter(function(elem, index, self) {
                        return index == self.indexOf(elem);
                    });
                    log.debug('arrayIdRetencionesAUX - PRUEBA', arrayIdRetencionesAUX);
                    /*FIN - MANEJO PARA ELIMINAR LOS ID DE RETENCIONES REPETIDOS*/

                    //ID URU-RETENCIONES
                    objDetail.idsRetenciones = arrayIdRetencionesAUX.toString();

                    //URU-SUCURSAL
                    objDetail.sucursal = completeResultSet[i].getValue({
                        name: resultSearch.columns[16]
                    });

                    //URU-TIPO DE DOCUMENTO
                    objDetail.tipoDocumento = completeResultSet[i].getValue({
                        name: resultSearch.columns[26]
                    });

                    //URU-NUMERO DE DOCUMENTO
                    objDetail.nroDocumento = completeResultSet[i].getValue({
                        name: resultSearch.columns[19]
                    });

                    //URU-RAZON SOCIAL CLIENTE
                    objDetail.razonSocial = completeResultSet[i].getValue({
                        name: resultSearch.columns[20]
                    });

                    //DIRECCION
                    objDetail.direccion = completeResultSet[i].getValue({
                        name: resultSearch.columns[22]
                    });

                    //CIUDAD
                    objDetail.ciudad = completeResultSet[i].getValue({
                        name: resultSearch.columns[23]
                    });

                    //PAIS
                    objDetail.pais = completeResultSet[i].getValue({
                        name: resultSearch.columns[24]
                    });

                    //CODIGO POSTAL
                    objDetail.codigoPostal = completeResultSet[i].getValue({
                        name: resultSearch.columns[25]
                    });

                    //IMPORTE IRPF
                    objDetail.importeIRPF = completeResultSet[i].getValue({
                        name: resultSearch.columns[27]
                    });

                    //IMPORTE IRNR
                    objDetail.importeIRNR = completeResultSet[i].getValue({
                        name: resultSearch.columns[28]
                    });

                    //IMPORTE IRAE
                    objDetail.importeIRAE = completeResultSet[i].getValue({
                        name: resultSearch.columns[29]
                    });

                    //IMPORTE IVA
                    objDetail.importeIVA = completeResultSet[i].getValue({
                        name: resultSearch.columns[30]
                    });

                    //FECHA RESGUARDO
                    objDetail.fechaResguardo = fechaResguardo;

                    //URU-FECHA EMISION RESGUARDO
                    objDetail.fechaEmisionResguardo = fechaEmisionResguardo;

                    //ORIGEN RETENCION
                    objDetail.origenRetencion = completeResultSet[i].getValue({
                        name: resultSearch.columns[31]
                    });

                    /*INICIO - MANEJO PARA ELIMINAR LOS ID DE RETENCIONES REPETIDOS*/
                    var idsRetencionesDet = completeResultSet[i].getValue({
                        name: resultSearch.columns[32]
                    });

                    var arrayIdRetencionesDet = idsRetencionesDet.toString().split(',');

                    var arrayIdRetencionesDetAUX = arrayIdRetencionesDet.filter(function(elem, index, self) {
                        return index == self.indexOf(elem);
                    });
                    /*FIN - MANEJO PARA ELIMINAR LOS ID DE RETENCIONES REPETIDOS*/
                    //ID URU-RETENCIONES
                    objDetail.idsRetencionesDet = arrayIdRetencionesDetAUX.toString();
                    
                    //log.debug('LINE 341','objDetail.idsRetencionesDet: '+objDetail.idsRetencionesDet);
                    infProcesar.push(objDetail);
                }
                log.debug('infProcesar',infProcesar);
                //log.debug('GETINPUTDATA','LINE 330. FIN FOR DE LLENADO DE ARRAY infProcesar. infProcesar: '+JSON.stringify(infProcesar));

                if (!utilities.isEmpty(infProcesar))
                {

                    for (var i=0; !utilities.isEmpty(infProcesar) && i < infProcesar.length; i++)
                    {
                        var idProveedor           = infProcesar[i].idProveedor;
                        var periodo               = infProcesar[i].periodo;
                        var subsidiaria           = infProcesar[i].subsidiaria;
                        var moneda                = infProcesar[i].moneda;
                        var importeResguardo      = infProcesar[i].importeResguardo;
                        var sucursal              = infProcesar[i].sucursal;
                        var tipoDocumento         = infProcesar[i].tipoDocumento;
                        var nroDocumento          = infProcesar[i].nroDocumento;
                        var razonSocial           = infProcesar[i].razonSocial;
                        var direccion             = infProcesar[i].direccion;
                        var ciudad                = infProcesar[i].ciudad;
                        var pais                  = infProcesar[i].pais;
                        var codigoPostal          = infProcesar[i].codigoPostal;
                        var importeIRPF           = infProcesar[i].importeIRPF;
                        var importeIRNR           = infProcesar[i].importeIRNR;
                        var importeIRAE           = infProcesar[i].importeIRAE;
                        var importeIVA            = infProcesar[i].importeIVA;
                        var fechaResguardo        = infProcesar[i].fechaResguardo;
                        var fechaEmisionResguardo = infProcesar[i].fechaEmisionResguardo;
                        var origenRetencion       = infProcesar[i].origenRetencion;
                        var idsRetenciones        = infProcesar[i].idsRetenciones;
                        var idsRetencionesDet     = infProcesar[i].idsRetencionesDet;
                        var arrayRetencionesDet   = idsRetencionesDet.split(',');
                        var arrayRetencionesDetAUX = new Array();

                        //log.debug('GETINPUTDATA','LINE 376 - arrayRetencionesDet: '+JSON.stringify(arrayRetencionesDet));
                        if (!utilities.isEmpty(arrayRetencionesDet))
                        {
                            //log.debug('GETINPUTDATA','LINE 379 - arrayRetencionesDet.length: '+arrayRetencionesDet.length);
                            var auxKey   = 0;
                            if (arrayRetencionesDet.length>50)
                            {
                                var contador = 1;
                                for (var j=0; !utilities.isEmpty(arrayRetencionesDet) && j < arrayRetencionesDet.length; j++)
                                {
                                    arrayRetencionesDetAUX.push(arrayRetencionesDet[j]);
                                    //log.debug('GETINPUTDATA','LINE 387. INDICE J: '+j+' - CONTADOR: '+contador+' - arrayRetencionesDetAUX: '+JSON.stringify(arrayRetencionesDetAUX)+' - arrayRetencionesDet.length: '+arrayRetencionesDet.length);
                                    if(contador>49)
                                    {
                                        var objDetailAUX = new Object();
                                        objDetailAUX.idProveedor           = idProveedor;
                                        objDetailAUX.periodo               = periodo;
                                        objDetailAUX.subsidiaria           = subsidiaria;
                                        objDetailAUX.moneda                = moneda;
                                        objDetailAUX.importeResguardo      = importeResguardo;
                                        objDetailAUX.sucursal              = sucursal;
                                        objDetailAUX.tipoDocumento         = tipoDocumento;
                                        objDetailAUX.nroDocumento          = nroDocumento;
                                        objDetailAUX.razonSocial           = razonSocial;
                                        objDetailAUX.direccion             = direccion;
                                        objDetailAUX.ciudad                = ciudad;
                                        objDetailAUX.pais                  = pais;
                                        objDetailAUX.codigoPostal          = codigoPostal;
                                        objDetailAUX.importeIRPF           = importeIRPF;
                                        objDetailAUX.importeIRNR           = importeIRNR;
                                        objDetailAUX.importeIRAE           = importeIRAE;
                                        objDetailAUX.importeIVA            = importeIVA;
                                        objDetailAUX.fechaResguardo        = fechaResguardo;
                                        objDetailAUX.fechaEmisionResguardo = fechaEmisionResguardo;
                                        objDetailAUX.origenRetencion       = origenRetencion;
                                        objDetailAUX.idsRetenciones        = idsRetenciones;
                                        objDetailAUX.idsRetencionesDet     = arrayRetencionesDetAUX.toString();
                                        auxKey                             = auxKey + 1;
                                        objDetailAUX.auxKey                = auxKey;
                                        infProcesarAUX.push(objDetailAUX);
                                        arrayRetencionesDetAUX = new Array();
                                        //log.debug('GETINPUTDATA','LINE 417. SI - infProcesarAUX: '+JSON.stringify(infProcesarAUX)+' - arrayRetencionesDetAUX: '+JSON.stringify(arrayRetencionesDetAUX));
                                        contador = 0;
                                    }
                                    else
                                    {
                                        if(contador<51 && (arrayRetencionesDet.length==(j+1)))
                                        {
                                            var objDetailAUX = new Object();
                                            objDetailAUX.idProveedor           = idProveedor;
                                            objDetailAUX.periodo               = periodo;
                                            objDetailAUX.subsidiaria           = subsidiaria;
                                            objDetailAUX.moneda                = moneda;
                                            objDetailAUX.importeResguardo      = importeResguardo;
                                            objDetailAUX.sucursal              = sucursal;
                                            objDetailAUX.tipoDocumento         = tipoDocumento;
                                            objDetailAUX.nroDocumento          = nroDocumento;
                                            objDetailAUX.razonSocial           = razonSocial;
                                            objDetailAUX.direccion             = direccion;
                                            objDetailAUX.ciudad                = ciudad;
                                            objDetailAUX.pais                  = pais;
                                            objDetailAUX.codigoPostal          = codigoPostal;
                                            objDetailAUX.importeIRPF           = importeIRPF;
                                            objDetailAUX.importeIRNR           = importeIRNR;
                                            objDetailAUX.importeIRAE           = importeIRAE;
                                            objDetailAUX.importeIVA            = importeIVA;
                                            objDetailAUX.fechaResguardo        = fechaResguardo;
                                            objDetailAUX.fechaEmisionResguardo = fechaEmisionResguardo;
                                            objDetailAUX.origenRetencion       = origenRetencion;
                                            objDetailAUX.idsRetenciones        = idsRetenciones;
                                            objDetailAUX.idsRetencionesDet     = arrayRetencionesDetAUX.toString();
                                            auxKey                             = auxKey + 1;
                                            objDetailAUX.auxKey                = auxKey;
                                            infProcesarAUX.push(objDetailAUX);
                                            arrayRetencionesDetAUX = new Array();
                                            //log.debug('GETINPUTDATA','LINE 451. SI - infProcesarAUX: '+JSON.stringify(infProcesarAUX)+' - arrayRetencionesDetAUX: '+JSON.stringify(arrayRetencionesDetAUX));
                                            contador = 0;
                                        }
                                    }
                                    contador = contador + 1;
                                }
                            }
                            else
                            {
                                var objDetailAUX = new Object();
                                objDetailAUX.idProveedor           = idProveedor;
                                objDetailAUX.periodo               = periodo;
                                objDetailAUX.subsidiaria           = subsidiaria;
                                objDetailAUX.moneda                = moneda;
                                objDetailAUX.importeResguardo      = importeResguardo;
                                objDetailAUX.sucursal              = sucursal;
                                objDetailAUX.tipoDocumento         = tipoDocumento;
                                objDetailAUX.nroDocumento          = nroDocumento;
                                objDetailAUX.razonSocial           = razonSocial;
                                objDetailAUX.direccion             = direccion;
                                objDetailAUX.ciudad                = ciudad;
                                objDetailAUX.pais                  = pais;
                                objDetailAUX.codigoPostal          = codigoPostal;
                                objDetailAUX.importeIRPF           = importeIRPF;
                                objDetailAUX.importeIRNR           = importeIRNR;
                                objDetailAUX.importeIRAE           = importeIRAE;
                                objDetailAUX.importeIVA            = importeIVA;
                                objDetailAUX.fechaResguardo        = fechaResguardo;
                                objDetailAUX.fechaEmisionResguardo = fechaEmisionResguardo;
                                objDetailAUX.origenRetencion       = origenRetencion;
                                objDetailAUX.idsRetenciones        = idsRetenciones;
                                objDetailAUX.idsRetencionesDet     = idsRetencionesDet;
                                auxKey                             = auxKey + 1;
                                objDetailAUX.auxKey                = auxKey;
                                infProcesarAUX.push(objDetailAUX);
                            }
                        }
                    }
                }
                //log.debug('GETINPUTDATA','LINE 491 - infProcesarAUX: '+JSON.stringify(infProcesarAUX));
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
                var resultado = context.value;

                if (!utilities.isEmpty(resultado)) {

                    var searchResult = JSON.parse(resultado);

                    if (!utilities.isEmpty(searchResult))
                    {
                        var objDetail = new Object();
                        objDetail.idProveedor           = searchResult.idProveedor;
                        objDetail.periodo               = searchResult.periodo;
                        objDetail.subsidiaria           = searchResult.subsidiaria;
                        objDetail.moneda                = searchResult.moneda;
                        objDetail.importeResguardo      = searchResult.importeResguardo;
                        objDetail.idsRetenciones        = searchResult.idsRetenciones;
                        objDetail.sucursal              = searchResult.sucursal;
                        objDetail.tipoDocumento         = searchResult.tipoDocumento;
                        objDetail.nroDocumento          = searchResult.nroDocumento;
                        objDetail.razonSocial           = searchResult.razonSocial;
                        objDetail.direccion             = searchResult.direccion;
                        objDetail.ciudad                = searchResult.ciudad;
                        objDetail.pais                  = searchResult.pais;
                        objDetail.codigoPostal          = searchResult.codigoPostal;
                        objDetail.importeIRPF           = searchResult.importeIRPF;
                        objDetail.importeIRNR           = searchResult.importeIRNR;
                        objDetail.importeIRAE           = searchResult.importeIRAE;
                        objDetail.importeIVA            = searchResult.importeIVA;
                        objDetail.fechaResguardo        = searchResult.fechaResguardo;
                        objDetail.fechaEmisionResguardo = searchResult.fechaEmisionResguardo;
                        objDetail.origenRetencion       = searchResult.origenRetencion;
                        objDetail.auxKey                = searchResult.auxKey;
                        objDetail.idsRetencionesDet     = searchResult.idsRetencionesDet;

                        //var key = objDetail.idProveedor + objDetail.periodo + objDetail.subsidiaria + objDetail.origenRetencion + objDetail.idsRetenciones;
                        var key = objDetail.idProveedor + objDetail.periodo + objDetail.subsidiaria + objDetail.origenRetencion + objDetail.auxKey + objDetail.idsRetenciones; // Agregado
                        log.debug('objDetail.idsRetenciones',objDetail.idsRetenciones);
                        log.debug('objDetail.auxKey',objDetail.auxKey);
                        log.debug('objDetail',objDetail);
                        //log.debug('Generacion URU-Resguardo', 'LINE 535 - key: '+key);
                        context.write(key, JSON.stringify(objDetail));
                        //log.debug('MAP', 'InformacionProcesar: ' + JSON.stringify(objDetail) + ' - KEY: '+key);

                    } else {
                        log.error('Generacion URU-Resguardo', 'MAP - Error Obteniendo Resultados de ID de Transacciones A Procesar');
                    }

                } else {
                    log.error('Generacion URU-Resguardo', 'MAP - Error Parseando Resultados de ID de Transacciones A Procesar');
                }

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

        /**
         * Executes when the reduce entry point is triggered and applies to each group.
         *
         * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
         * @since 2015.1
         */
        function reduce(context) {

            log.audit('Generacion URU-Resguardo','REDUCE - INICIO');  
            var errorGeneral = false;
            var idResguardo;
            var respuesta = { "error": false, "detalles_errores": [] };

            if (!utilities.isEmpty(context.values) && context.values.length > 0)
            {
                try
                {
                    log.debug('REDUCE', 'InformacionProcesar (URU-Resguardo): ' + context.values[0]);
                    var registroURURetencion = JSON.parse(context.values[0]);
                    var newResguardo = resguardo.crearResguardo(registroURURetencion);
                    log.debug('REDUCE','newResguardo:' +newResguardo);


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
        }

        /**
         * Executes when the summarize entry point is triggered and applies to the result set.
         *
         * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
         * @since 2015.1
         */
  
         function summarize(summary) {
        }

        return {
            getInputData: getInputData
            ,map: map
            ,reduce: reduce,
            //summarize: summarize
        };

    });