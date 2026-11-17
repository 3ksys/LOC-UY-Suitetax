/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NAmdConfig /SuiteScripts/configuration_l598.json
 * @NModuleScope Public
 */
define(['N/runtime', 'N/format', 'L598/utilities', 'N/record', 'N/file', 'N/url', 'N/email', 'N/search', 'N/currency'],

    function (runtime, format, utilities, record, file, url, email, search, currency) {

        var proceso = "L598 - Generación TXT Localizaciones (Sched)";

        function getParams() {
            try {
                var informacion = new Object({});
                var currScript = runtime.getCurrentScript();

                informacion.subsidiaria = currScript.getParameter('custscript_l598_gen_txt_loc_subsidiaria');
                informacion.periodo = currScript.getParameter('custscript_l598_gen_txt_loc_periodo');
                informacion.archivo = currScript.getParameter('custscript_l598_gen_txt_loc_archivo');
                informacion.usuario = currScript.getParameter('custscript_l598_gen_txt_loc_usuario');
                informacion.estadoOk = currScript.getParameter('custscript_l598_gen_txt_loc_estado_ok');
                informacion.estadoError = currScript.getParameter('custscript_l598_gen_txt_loc_estado_error');
                /** Modificación Publicidad */
                informacion.isTaface = currScript.getParameter('custscript_l598_gen_txt_loc_taface');
                informacion.units = currScript.getParameter('custscript_l598_gen_txt_loc_units');
                informacion.rubroPub = currScript.getParameter('custscript_l598_gen_txt_loc_rubro');
                


                return informacion;
            } catch (excepcion) {
                log.error('getParams', 'Excepcion Obteniendo Parametros - Excepcion : ' + excepcion.message.toString());
                return null;
            }
        }

        /**
         * Definition of the Scheduled script trigger point.
         *
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - The context in which the script is executed. It is one of the values from the scriptContext.InvocationType enum.
         * @Since 2015.2
         */
        function execute(scriptContext) {

            log.audit(proceso, "INICIO - Generar TXT Localizaciones URU");

            try {

                var isOneWorld = utilities.l598esOneworld();
                var informacion = getParams();

                log.audit(proceso, 'Parámetros recibidos: ' + JSON.stringify(informacion));

                if (utilities.isEmpty(informacion) || utilities.isEmpty(informacion.periodo) || utilities.isEmpty(informacion.archivo) || utilities.isEmpty(informacion.usuario) || utilities.isEmpty(informacion.estadoOk) || utilities.isEmpty(informacion.estadoError)) {
                    log.error(proceso, 'Error obteniendo alguno de los campos enviados por parámetros, el proceso no puede continuar');
                    return false;
                }

                //Inicio - Consulta Configuración
                var filtrosPanelConfig = new Array();

                if (isOneWorld) {
                    if (!utilities.isEmpty(informacion.subsidiaria)) {
                        var filtroSubsidiaria = new Object();
                        filtroSubsidiaria.name = 'custrecord_l598_gen_txt_conf_subsidiaria';
                        filtroSubsidiaria.operator = 'IS';
                        filtroSubsidiaria.values = informacion.subsidiaria;
                        filtrosPanelConfig.push(filtroSubsidiaria);
                        var searchPanelConfig = utilities.searchSavedPro('customsearch_l598_gen_txt_loc_config', filtrosPanelConfig);
                    } else {
                        log.error(proceso, 'Error obteniendo el parámetro de subsidiaria, el proceso no puede continuar.');
                        return false;
                    }
                } else {
                    var searchPanelConfig = utilities.searchSavedPro('customsearch_l598_gen_txt_loc_config');
                }

                if (!searchPanelConfig.error && !utilities.isEmpty(searchPanelConfig.objRsponseFunction.result) && searchPanelConfig.objRsponseFunction.result.length > 0) {

                    var panelConfigResultSet = searchPanelConfig.objRsponseFunction.result;
                    var panelConfigResultSearch = searchPanelConfig.objRsponseFunction.search;

                    log.debug(proceso, 'panelConfigResultSet.length: ' + JSON.stringify(panelConfigResultSet.length));

                    if (panelConfigResultSet.length == 1) {
                        for (var k = 0; k < panelConfigResultSet.length; k++) {
                            var configCarpeta = panelConfigResultSet[k].getValue({ name: panelConfigResultSearch.columns[3] });
                            var configNombreArchivo = panelConfigResultSet[k].getValue({ name: panelConfigResultSearch.columns[4] });
                        }

                        log.audit(proceso, 'configCarpeta: ' + configCarpeta + '- configNombreArchivo: ' + configNombreArchivo);
                    }
                }
                //Fin - Consulta Configuración

                var objTipoArchivo = search.lookupFields({
                    type: 'customrecord_l598_gen_txt_loc_archivos',
                    id: informacion.archivo,
                    columns: ['custrecord_l598_archivos_txt_codigo']
                });

                var archivoGenerar = '';

                if (!utilities.isEmpty(objTipoArchivo)) {
                    archivoGenerar = objTipoArchivo.custrecord_l598_archivos_txt_codigo;
                    log.audit(proceso, 'archivoGenerar: ' + archivoGenerar);
                }

                if (!utilities.isEmpty(archivoGenerar)) {

                    var estadoProceso = informacion.estadoOk;
                    switch (archivoGenerar) {
                        case "2181":
                            var busqueda = 'customsearch_l598_beta_2181';
                            var docEmpresa = consultaDatosImpositivos(informacion.subsidiaria, isOneWorld);
                            var fechaProceso = formatDate();
                            var arrPublicity = searchRubroPublicidad(isOneWorld, informacion.subsidiaria, informacion.periodo, informacion.isTaface, informacion.units)
                            var resultado = generarTXT(archivoGenerar, isOneWorld, informacion.subsidiaria, informacion.periodo, configNombreArchivo, configCarpeta, busqueda, docEmpresa, fechaProceso.fechaHora, arrPublicity, informacion.rubroPub);
                            log.audit(proceso, 'resultado: ' + JSON.stringify(resultado));

                            if (!utilities.isEmpty(resultado)) {
                                if (resultado.error == true) {
                                    estadoProceso = informacion.estadoError;
                                }
                                var idLogGeneral = grabarLogGeneral(informacion.periodo, informacion.subsidiaria, informacion.usuario, resultado.mensaje, resultado.archivo, estadoProceso, informacion.archivo, fechaProceso.fechaServidor)
                            }
                            break;
                    }
                    enviarMail(resultado.archivo, informacion.usuario, idLogGeneral, configNombreArchivo);
                }


            } catch (e) {
                log.error(proceso, 'Exception: ' + e.message);
            }

            log.audit(proceso, "FIN - Generar TXT Localizaciones URU");

        }

        /** Modificación Publicidad  */

        function searchRubroPublicidad(isOneWorld, subsidiaria, periodo, isTaface, units){
            log.debug('entroooo', isTaface);
            var arrayResult = [];

            var searchLoad = search.load({
                id: "customsearch_l598_beta_2181"
            });

            if (isOneWorld && !utilities.isEmpty(subsidiaria)) {
                var subsidiariaFilter = search.createFilter({
                    name: "subsidiary",
                    operator: search.Operator.IS,
                    values: subsidiaria
                });
                searchLoad.filters.push(subsidiariaFilter);
            }

            if (!utilities.isEmpty(periodo)) {
                var periodFilter = search.createFilter({
                    name: "postingperiod",
                    operator: search.Operator.IS,
                    values: periodo
                });
                searchLoad.filters.push(periodFilter);
            }

            searchLoad.columns = [];

            var totalColumns = search.createColumn({
                    name: "formulacurrency",
                    summary: "SUM",
                    formula: "CASE WHEN {custcol_l598_rubro_iva.custrecord_l598_rubro_iva_codigo} = '514' THEN NVL({amount}, 0) ELSE 0 END"
            });

            searchLoad.columns.push(totalColumns) 

            var vendorRut = search.createColumn({
                name: "formulatext",
                summary: "GROUP",
                formula: "CASE WHEN (NVL({custbody_l598_transac_cuenta_ajena}, '*')='*' OR {custbody_l598_transac_cuenta_ajena}='F') THEN {custbody_l598_nro_documento} ELSE {custbody_l598_nro_doc_emp_cta_ajena} END"
            });

            searchLoad.columns.push(vendorRut) 
            
            log.debug('searchLoad',searchLoad)
 
            log.debug('searchLoad',searchLoad.columns)

            var resultSet = searchLoad.run();
            var searchResult = resultSet.getRange({
                start: 0,
                end: 1000
            });
            log.debug('searchResult', searchResult.length)
            log.debug('searchResult', searchResult)

            var rate = getUnidIndexada(isOneWorld, subsidiaria, isTaface);
            log.debug('Resultado del rate', rate)

            if(searchResult.length > 0){
                for (var i = 0; i < searchResult.length; i++) {
                    var montoSearch = searchResult[i].getValue({
                        name: resultSet.columns[0]
                    });
                    var vendorRut = searchResult[i].getValue({
                        name: resultSet.columns[1]
                    });
                    log.debug('resultados de bsuqueda', montoSearch + '->> ' + vendorRut)
                    var montoReal = montoSearch / rate ; 
    
                    if(parseFloat(montoReal) > parseFloat(units)){
                        log.debug('Resultado final', montoReal + ' ->> ' + vendorRut)
                        arrayResult.push(vendorRut)
                    }
                    
                }
                
            }

            log.debug('arrResult', arrayResult)
            return arrayResult;
           
        }

        function getUnidIndexada(isOneWorld, subsidiaria, isTaface){
            log.debug('is taface', isTaface)
            if (utilities.isEmpty(subsidiaria)){
                var subsidiaria = "";
            }
            var isTaface = isTaface;
            var resultConfigFETaface = getConfigFE(isTaface, subsidiaria, isOneWorld);

            // Se verifica si la configuración de FE es de TAFACE
            if (!utilities.isEmpty(resultConfigFETaface) && resultConfigFETaface) {

                // Se setean la unidad indexada predeterminada del RT URU-Configuración Unidad Indexada                        
                var rate = getConfigUnidadIndexada();
                
                log.debug(proceso, "LINE 44 - UNIDAD INDEXADA: " + rate);

            } else {

                // Se setean la unidad indexada desde el tipo de cambio registrado en NS
                // Get Exchange Rate For UNIDAD INDEXADA
                var rate = currency.exchangeRate({
                    source: 'UI',
                    target: 'UYU'
                });

                log.debug(proceso, "LINE 55 - UNIDAD INDEXADA: " + rate);
            }

            return rate;
        }

        function getConfigFE(parametroTipoIntegracionFE, idSubsidiaria, isOneWorld) {

            var esTipoIntegracionTAFACE = false;
            log.debug('parametros', parametroTipoIntegracionFE + ' ->> ' + idSubsidiaria + ' ->> ' + isOneWorld)
            try {  
                var filtrosConfiguracionFE = [];

                if (isOneWorld && !utilities.isEmpty(idSubsidiaria)) {
                    var filtroSubsidiaria = {};
                    filtroSubsidiaria.name = 'custrecord_l598_conf_fe_subsidiaria';
                    filtroSubsidiaria.operator = 'IS';
                    filtroSubsidiaria.values = idSubsidiaria;
                    filtrosConfiguracionFE.push(filtroSubsidiaria);
                }

                var searchConfigFE = utilities.searchSavedPro('customsearch_l598_config_fe_seteo_ui', filtrosConfiguracionFE);

                if (!searchConfigFE.error && !utilities.isEmpty(searchConfigFE.objRsponseFunction.result) && searchConfigFE.objRsponseFunction.result.length > 0) {

                    var datosConfigFEResultSet = searchConfigFE.objRsponseFunction.result;
                    var datosConfigFEResultSearch = searchConfigFE.objRsponseFunction.search;

                    log.debug('consultaConfigFE', 'datosConfigFEResultSet.length: ' + datosConfigFEResultSet.length);

                    if (!utilities.isEmpty(datosConfigFEResultSet) && datosConfigFEResultSet.length > 0) {
                        var tipoIntegracionFE = datosConfigFEResultSet[0].getValue({
                            name: datosConfigFEResultSearch.columns[2]
                        });

                        if (tipoIntegracionFE == parametroTipoIntegracionFE) {
                            esTipoIntegracionTAFACE = true;
                        }
                    }
                }
            } catch (e) {
                log.error('consultaConfigFE', 'consultaConfigFE - NetSuite Exception - Detalles Error: ' + e.message);
                esTipoIntegracionTAFACE = false;
            }

            return esTipoIntegracionTAFACE;
        }

        function getConfigUnidadIndexada() {

            var valorUnidadIndexada = '';

            try {
                
                var searchConfigUI = utilities.searchSavedPro('customsearch_l598_config_ui_seteo_ui', null);

                if (!searchConfigUI.error && !utilities.isEmpty(searchConfigUI.objRsponseFunction.result) && searchConfigUI.objRsponseFunction.result.length > 0) {

                    var datosConfigUIResultSet = searchConfigUI.objRsponseFunction.result;
                    var datosConfigUIResultSearch = searchConfigUI.objRsponseFunction.search;

                    log.debug('getConfigUnidadIndexada', 'datosConfigUIResultSet.length: ' + datosConfigUIResultSet.length);

                    if (!utilities.isEmpty(datosConfigUIResultSet) && datosConfigUIResultSet.length > 0) {
                        valorUnidadIndexada = datosConfigUIResultSet[0].getValue({
                            name: datosConfigUIResultSearch.columns[2]
                        });
                    }
                }
            } catch (e) {
                log.error('getConfigUnidadIndexada', 'getConfigUnidadIndexada - NetSuite Exception - Detalles Error: ' + e.message);
            }

            return valorUnidadIndexada;
        }

        function generarTXT(archivoProcesar, isOneWorld, subsidiaria, periodo, nombreArchivo, idCarpeta, busqueda, docEmpresa, fechaArchivo, arrPublicity, rubroPub) {

            try {

                log.audit(proceso, "INICIO - generarTXT - Archivo: " + nombreArchivo);

                var errorTXT = false;

                var respuesta = new Object();
                respuesta.error = false;
                respuesta.mensaje = "";
                respuesta.archivo = "";
                respuesta.archivoNombre = "";

                var filtrosTXT = new Array();

                if (isOneWorld && !utilities.isEmpty(subsidiaria)) {
                    var filtroSubsidiaria = new Object();
                    filtroSubsidiaria.name = 'subsidiary';
                    filtroSubsidiaria.operator = 'IS';
                    filtroSubsidiaria.values = subsidiaria;
                    filtrosTXT.push(filtroSubsidiaria);
                }

                if (!utilities.isEmpty(periodo)) {
                    var filtroPeriodo = new Object();
                    filtroPeriodo.name = 'postingperiod';
                    filtroPeriodo.operator = 'IS';
                    filtroPeriodo.values = periodo;
                    filtrosTXT.push(filtroPeriodo);
                }

                var searchTXT = utilities.searchSavedPro(busqueda, filtrosTXT);
                var infoTXT = '';

                if (!searchTXT.error && !utilities.isEmpty(searchTXT.objRsponseFunction.result) && searchTXT.objRsponseFunction.result.length > 0) {

                    var TXTResultSet = searchTXT.objRsponseFunction.result;
                    var TXTResultSearch = searchTXT.objRsponseFunction.search;

                    log.debug(proceso, 'TXTResultSet.length:' + JSON.stringify(TXTResultSet.length));
                    log.debug(proceso, 'TXTResultSet:' + JSON.stringify(TXTResultSet));

                    var transactionsTXTCtaAjena = [];
                    var transacTXTNormales = [];

                    // INICIO - Formateo la data para procesar y ordenar transacciones por cuenta ajena y normales
                    for (var k = 0; k < TXTResultSet.length; k++) {
                        var objDatosTrans = {};
                        objDatosTrans.fldTypeTransaction = TXTResultSet[k].getValue({ name: TXTResultSearch.columns[1] }); // Agrupar SS
                        objDatosTrans.fldFormulario = TXTResultSet[k].getValue({ name: TXTResultSearch.columns[3] });
                        objDatosTrans.fldPeriodo = TXTResultSet[k].getValue({ name: TXTResultSearch.columns[4] });
                        objDatosTrans.fldRutInformado = TXTResultSet[k].getValue({ name: TXTResultSearch.columns[5] }); // Agrupar SS
                        objDatosTrans.fldFactura = TXTResultSet[k].getValue({ name: TXTResultSearch.columns[6] });
                        objDatosTrans.fldLinea = TXTResultSet[k].getValue({ name: TXTResultSearch.columns[7] }); // Agrupar SS
                        objDatosTrans.fldImporte = parseFloat(TXTResultSet[k].getValue({ name: TXTResultSearch.columns[8] }), 10); // Importe IVA

                        var fldEsCtaAjena = TXTResultSet[k].getValue({ name: TXTResultSearch.columns[10] });
                        var fldImpNetoCtaAjena = parseFloat(TXTResultSet[k].getValue({ name: TXTResultSearch.columns[11] }), 10); // Importe Neto (se informa con RUT CTA AJENA)
                        var fldRutCliente = TXTResultSet[k].getValue({ name: TXTResultSearch.columns[12] }); // RUT CLIENTE TRANSACCION
                        var fldRubroIVA = TXTResultSet[k].getValue({ name: TXTResultSearch.columns[14] }); // RUBRO IVA DESC CTA AJENA, LITERAL E, 750.000 UI
                        var fdlImporteBeneficiosFiscales = TXTResultSet[k].getValue({ name: TXTResultSearch.columns[15] }); // IMPORTE BENEFICIOS FISCALES CONSUMIDOS
                        var fdlTipoBeneficio = TXTResultSet[k].getValue({ name: TXTResultSearch.columns[16] });

                        log.debug(proceso, 'Importe SS:' + TXTResultSet[k].getValue({ name: TXTResultSearch.columns[8] }));
                        log.debug(proceso, 'objDatosTrans: ' + JSON.stringify(objDatosTrans));
                        log.debug(proceso, 'impIVA: ' + objDatosTrans.fldImporte + ' - fldEsCtaAjena: ' + fldEsCtaAjena + ' - fldImpNetoCtaAjena: ' + fldImpNetoCtaAjena + ' - fldRutCliente: ' + fldRutCliente + ' - fldRubroIVA: ' + fldRubroIVA + ' - fdlImporteBeneficiosFiscales: ' + fdlImporteBeneficiosFiscales);

                        if ((!utilities.isEmpty(fldEsCtaAjena) && (fldEsCtaAjena == 'T' || fldEsCtaAjena == true)) || (!utilities.isEmpty(fdlImporteBeneficiosFiscales) && !isNaN(fdlImporteBeneficiosFiscales) && parseFloat(Math.abs(fdlImporteBeneficiosFiscales), 10) > 0 && !utilities.isEmpty(fdlTipoBeneficio))) {

                            var objDatCtaAjena = {};
                            objDatCtaAjena.fldTypeTransaction = objDatosTrans.fldTypeTransaction;
                            objDatCtaAjena.fldFormulario = objDatosTrans.fldFormulario;
                            objDatCtaAjena.fldPeriodo = objDatosTrans.fldPeriodo;
                            objDatCtaAjena.fldRutInformado = objDatosTrans.fldRutInformado;
                            objDatCtaAjena.fldFactura = objDatosTrans.fldFactura;
                            objDatCtaAjena.fldLinea = fldRubroIVA;
                            objDatCtaAjena.fldImporte = (!utilities.isEmpty(fldEsCtaAjena) && (fldEsCtaAjena == 'T' || fldEsCtaAjena == true)) ? parseFloat(fldImpNetoCtaAjena, 10) : fdlImporteBeneficiosFiscales;

                            log.debug(proceso, 'INGRESO  setear datos cuenta ajena - objDatCtaAjena: ' + JSON.stringify(objDatCtaAjena));
                            for (var j = 0; j < transactionsTXTCtaAjena.length; j++) {
                                if (objDatCtaAjena.fldRutInformado == transactionsTXTCtaAjena[j].fldRutInformado && objDatCtaAjena.fldLinea == transactionsTXTCtaAjena[j].fldLinea) {
                                    transactionsTXTCtaAjena[j].fldImporte += parseFloat(objDatCtaAjena.fldImporte, 10);
                                    j = transactionsTXTCtaAjena.length + 1;
                                    break;
                                }
                            }

                            // Ingreso registro de transaccion por cuenta ajena porque no se encontro coincidencia de transaccion en array existente
                            if (j == transactionsTXTCtaAjena.length) {
                                
                                transactionsTXTCtaAjena.push(objDatCtaAjena);
                            }

                            log.debug(proceso, 'transactionsTXTCtaAjena luego de setear datos cuenta ajena: ' + JSON.stringify(transactionsTXTCtaAjena));
                        }

                        objDatosTrans.fldRutInformado = fldRutCliente;

                        log.debug(proceso, 'objDatosTrans luego de setear datos de cuenta ajena: ' + JSON.stringify(objDatosTrans));

                        for (var j = 0; j < transacTXTNormales.length; j++) {
                            if (objDatosTrans.fldRutInformado == transacTXTNormales[j].fldRutInformado && objDatosTrans.fldLinea == transacTXTNormales[j].fldLinea) {
                                log.debug(proceso, 'actualziacion valor de importe en array transacTXTNormales: ' + JSON.stringify(transacTXTNormales[j]));
                                transacTXTNormales[j].fldImporte += parseFloat(objDatosTrans.fldImporte, 10);
                                j = transacTXTNormales.length + 1;
                                break;
                            }
                        }

                        // Ingreso registro de transaccion normal porque no se encontro coincidencia de transaccion en array existente
                        if (j == transacTXTNormales.length) {
                            transacTXTNormales.push(objDatosTrans);
                        }
                        log.debug(proceso, 'transacTXTNormales: ' + JSON.stringify(transacTXTNormales));
                    }
                    // FIN - Formateo la data para procesar y ordenar transacciones por cuenta ajena y normales

                    log.debug(proceso, 'transactionsTXTCtaAjena: ' + JSON.stringify(transactionsTXTCtaAjena));
                    log.debug(proceso, 'transacTXTNormales: ' + JSON.stringify(transacTXTNormales));

                    var transactionsTXT = transactionsTXTCtaAjena.concat(transacTXTNormales);

                    log.debug(proceso, 'transactionsTXT: ' + JSON.stringify(transactionsTXT));

                    // INICIO - creacion de contenido TXT
                    for (var k = 0; k < transactionsTXT.length; k++) {
                        var flag = false;
                        
                        var fldFormulario = transactionsTXT[k].fldFormulario;
                        var fldPeriodo = transactionsTXT[k].fldPeriodo;
                        var fldRutInformado = transactionsTXT[k].fldRutInformado;
                        var fldFactura = transactionsTXT[k].fldFactura;
                        var fldLinea = transactionsTXT[k].fldLinea;
                        var fldImporte = transactionsTXT[k].fldImporte;

                        /** Modificación Publicidad */
                        if(fldLinea !='514'){
                            flag = true;
                        }else if(fldLinea =='514' && arrPublicity.indexOf(fldRutInformado) > -1){
                            flag = true;
                        }
                        var fldImporteRounded = parseFloat(fldImporte, 10).toFixed(0)
                        if(flag && fldImporteRounded!= 0){
                            infoTXT += docEmpresa + ';';
                            infoTXT += fldFormulario + ';';
                            infoTXT += fldPeriodo + ';';
                            infoTXT += fldRutInformado + ';';
                            infoTXT += fldFactura + ';';
                            infoTXT += fldLinea + ';';
    
                            var separadorDecimal = '.';
                            log.debug(proceso, 'fldImporte:' + fldImporte);
    
                            infoTXT += formatearNumero(fldImporte, 12, 0, separadorDecimal);
                            //infoTXT += parseFloat(fldImporte).toFixed(2) + ';';
                            infoTXT += '\r\n';//Salto de linea
                        }
                        
                    }
                    // FIN - creacion de contenido TXT

                    log.debug(proceso, 'infoTXT: ' + infoTXT);

                    if (!utilities.isEmpty(infoTXT) && !utilities.isEmpty(nombreArchivo) && !utilities.isEmpty(idCarpeta) && !utilities.isEmpty(fechaArchivo)) {

                        var nombreArchivoFinal = nombreArchivo + '_' + fechaArchivo + '.txt';

                        var archivo = file.create({
                            name: nombreArchivoFinal,
                            fileType: file.Type.PLAINTEXT,
                            contents: infoTXT,
                            folder: idCarpeta
                        });

                        var fileId = archivo.save();
                        log.debug(proceso, 'fileId: ' + fileId);
                    }

                    respuesta.error = false;
                    respuesta.mensaje = 'Archivo TXT generado exitosamente';
                    respuesta.archivo = fileId;
                } else {
                    respuesta.error = true;
                    respuesta.mensaje = 'No se encontraron transacciones a informar en el TXT.';
                    log.debug('generarTXT', respuesta.mensaje);
                }

            } catch (e) {
                respuesta.error = true;
                respuesta.mensaje = 'Error Generando TXT - Exception: ' + e.message;
                log.error('generarTXT', respuesta.mensaje);
            }

            log.audit(proceso, "FIN - generarTXT - Archivo: " + nombreArchivo);
            return respuesta;
        }

        function grabarLogGeneral(periodo, subsidiaria, usuario, detalleProceso, archivo, estadoProceso, txtProceso, fechaProceso) {

            try {

                log.audit(proceso, "INICIO - grabarLogGeneral");

                var fechaLocalDate = format.parse({
                    value: fechaProceso,
                    type: format.Type.DATETIME,
                    timezone: format.Timezone.AMERICA_MONTEVIDEO
                });

                var registroLogGeneral = record.create({
                    type: 'customrecord_l598_gen_txt_loc_log'
                });

                if (!utilities.isEmpty(fechaLocalDate)) {
                    registroLogGeneral.setValue({ fieldId: 'custrecord_l598_gen_txt_loc_log_fecha', value: fechaLocalDate });
                }

                if (!utilities.isEmpty(periodo)) {
                    registroLogGeneral.setValue({ fieldId: 'custrecord_l598_gen_txt_loc_log_periodo', value: periodo });
                }

                if (!utilities.isEmpty(subsidiaria)) {
                    registroLogGeneral.setValue({ fieldId: 'custrecord_l598_gen_txt_loc_log_subsidia', value: subsidiaria });
                }

                if (!utilities.isEmpty(usuario)) {
                    registroLogGeneral.setValue({ fieldId: 'custrecord_l598_gen_txt_loc_log_usuario', value: usuario });
                }

                if (!utilities.isEmpty(detalleProceso)) {
                    registroLogGeneral.setValue({ fieldId: 'custrecord_l598_gen_txt_loc_log_detalle', value: detalleProceso });
                }

                if (!utilities.isEmpty(archivo)) {
                    registroLogGeneral.setValue({ fieldId: 'custrecord_l598_gen_txt_loc_log_archivo', value: archivo });
                }

                if (!utilities.isEmpty(estadoProceso)) {
                    registroLogGeneral.setValue({ fieldId: 'custrecord_l598_gen_txt_loc_log_estado', value: estadoProceso });
                }

                if (!utilities.isEmpty(txtProceso)) {
                    registroLogGeneral.setValue({ fieldId: 'custrecord_l598_gen_txt_loc_log_txt_proc', value: txtProceso });
                }

                try {
                    var idRecordSave = registroLogGeneral.save();
                    log.debug(proceso, 'idRecordSave: ' + idRecordSave);
                    if (utilities.isEmpty(idRecordSave)) {
                        log.error(proceso, 'Error Sumarize - Error : No se Recibio el ID Interno del LOG');
                    } else {
                        log.audit(proceso, "FIN - grabarLogGeneral");
                        return idRecordSave;
                    }
                } catch (excepcionSave) {
                    log.error(proceso, 'Excepcion Inesperada al guardar LOG - Excepcion : ' + excepcionSave.message);
                }

            } catch (e) {
                log.error('grabarLogGeneral', 'Exception: ' + e.message);
            }
        }

        function enviarMail(archivo, idUsuario, idLogGeneral, nombreArchivo) {

            try {

                log.audit(proceso, "INICIO - enviarMail");
                log.debug(proceso, 'idUsuario: ' + idUsuario + '- idLogGeneral: ' + idLogGeneral + '- archivo: ' + archivo);

                var author = idUsuario;
                var recipients = idUsuario;
                var subject = 'URU - Generación TXT Localizaciones - Resultado del proceso';

                var esquema = 'https://';
                var host = url.resolveDomain({
                    hostType: url.HostType.APPLICATION
                });
                var rutaRelativa = url.resolveRecord({
                    recordType: 'customrecord_l598_gen_txt_loc_log',
                    recordId: idLogGeneral,
                    isEditMode: false
                });

                urlRT = esquema + host + rutaRelativa;
                //log.debug(proceso, 'urlRT: ' + urlRT);

                if (!utilities.isEmpty(archivo)) {
                    body = 'La Generación del archivo ' + nombreArchivo + ' ha finalizado, puede verificar el resultado en el siguiente enlace: <a href="' + urlRT + '"> URU-Generación TXT LOC - Log  </a>  <br> Se adjunta el archivo TXT generado.'
                } else {
                    body = 'No se encontraron transacciones a informar para el archivo ' + nombreArchivo + ', puede verificar el resultado en el siguiente enlace: <a href="' + urlRT + '"> URU-Generación TXT LOC - Log  </a>'
                }

                var adjunto = null;

                if (!utilities.isEmpty(archivo)) {
                    var fileObj = file.load({
                        id: archivo
                    });
                    adjunto = [fileObj];

                }

                email.send({
                    author: author,
                    recipients: recipients,
                    subject: subject,
                    body: body,
                    attachments: adjunto
                });

                log.audit(proceso, "FIN - enviarMail");

            } catch (e) {
                log.error('enviarMail', 'Exception: ' + e.message);
            }
        }

        function consultaDatosImpositivos(idSubsidiaria, isOneWorld) {

            try {
                log.audit(proceso, "INICIO - consultaDatosImpositivos");

                if (isOneWorld) {
                    var filtrosDatosImp = new Array();

                    var filtroSubsidiaria = new Object();
                    filtroSubsidiaria.name = 'custrecord_l598_dat_imp_subsidiaria';
                    filtroSubsidiaria.operator = 'IS';
                    filtroSubsidiaria.values = idSubsidiaria;
                    filtrosDatosImp.push(filtroSubsidiaria);
                    var searchDatosImp = utilities.searchSavedPro('customsearch_l598_datos_imp_empresa', filtrosDatosImp);
                } else {
                    var searchDatosImp = utilities.searchSavedPro('customsearch_l598_datos_imp_empresa');
                }

                if (!searchDatosImp.error && !utilities.isEmpty(searchDatosImp.objRsponseFunction.result) && searchDatosImp.objRsponseFunction.result.length > 0) {

                    var datosImpResultSet = searchDatosImp.objRsponseFunction.result;
                    var datosImpResultSearch = searchDatosImp.objRsponseFunction.search;

                    log.debug('consultaDatosImpositivos', 'datosImpResultSet.length: ' + datosImpResultSet.length);

                    if (!utilities.isEmpty(datosImpResultSet) && datosImpResultSet.length > 0) {
                        var nroDocEmpresa = datosImpResultSet[0].getValue({
                            name: datosImpResultSearch.columns[2]
                        });
                    }
                    log.audit(proceso, "FIN - consultaDatosImpositivos");

                    return nroDocEmpresa;
                }

            } catch (e) {
                log.error('consultaDatosImpositivos', 'Exception: ' + e.message);
            }
        }

        //Toma una fecha ubicada en otra zona horaria y la mueve a GMT0. Con zonaHoraria se puede cambiar por otra diferente a GMT0
        function getDate(fecha, zonaHoraria) {

            try {

                var utc = new Date(fecha); //GMT 0
                zonaHoraria = utilities.isEmpty(zonaHoraria) ? 0 : zonaHoraria;
                utc = utc.getTime() + (utc.getTimezoneOffset() * 60000);
                return new Date(utc + (3600000 * zonaHoraria));

            } catch (e) {
                log.error('getDate', e.message);
            }
        }

        function formatDate() {

            try {

                var fechaServidor = new Date();

                var fechaLocal = getDate(fechaServidor, -3);
                //log.debug(proceso, 'fechaLocal: ' + fechaLocal);

                var d = fechaLocal,
                    month = '' + (d.getMonth() + 1),
                    day = '' + d.getDate(),
                    year = d.getFullYear(),
                    hour = d.getHours(),
                    minutes = d.getMinutes(),
                    seconds = d.getSeconds();

                if (month.length < 2) month = '0' + month;
                if (day.length < 2) day = '0' + day;
                if (hour.toString().length < 2) hour = '0' + hour;
                if (minutes.toString().length < 2) minutes = '0' + minutes;
                if (seconds.toString().length < 2) seconds = '0' + seconds;


                var objFecha = new Object();
                objFecha.fechaHora = [year, month, day].join('') + '_' + hour + minutes + seconds;
                objFecha.fechaServidor = fechaServidor;
                return objFecha;

            } catch (e) {
                log.error('formatDate', e.message);
            }
        }

        function formatearNumero(valor, cantidadDigitosEntero, cantidadDigitosDecimal, separadorDecimal) {

            try {
                var numeroNegativo = false;
                var resultado = "";
                var expRegNumeros = /[^0-9]/gi;
                log.debug('formatearNumero', 'valor Inicial:' + valor);

                if (!utilities.isEmpty(cantidadDigitosEntero) && !utilities.isEmpty(cantidadDigitosDecimal) && !utilities.isEmpty(separadorDecimal)) {
                    if (utilities.isEmpty(valor)) {
                        valor = '0';
                    }
                    else {
                        valor = parseFloat(valor, 10).toFixed(0);
                    }
                    if (valor < 0) {
                        numeroNegativo = true;
                    }
                    valor = valor.toString();
                    var posicionSeparador = valor.indexOf(separadorDecimal);
                    if (posicionSeparador != -1) {
                        var parteEntera = valor.substring(0, posicionSeparador);
                        if (utilities.isEmpty(parteEntera)) {
                            parteEntera = '0';
                        }
                        var parteDecimal = valor.substring(posicionSeparador + 1, valor.length);
                        if (utilities.isEmpty(parteDecimal)) {
                            parteDecimal = '0';
                        }
                        var cantidadPad = cantidadDigitosEntero;
                        if (!isNaN(parteEntera) && !isNaN(parteDecimal)) {
                            // Parte Entera
                            if (parseFloat(parteEntera, 0) < 0.00 || numeroNegativo == true) {
                                if (parteEntera.toString().length > 0) {
                                    cantidadPad = cantidadDigitosEntero - 1;
                                    parteEntera = parteEntera.substring(1, parteEntera.length);
                                    resultado = "-" + padding_left(parteEntera.replace(expRegNumeros, ''), '0', cantidadPad).toString();
                                }
                            } else {
                                resultado = padding_left(parteEntera.replace(expRegNumeros, ''), '0', cantidadPad).toString();
                            }
                            // Parte Decimal
                            resultado = resultado.toString();
                        }
                    }
                    else {
                        //valor entero
                        if (!isNaN(valor)) {
                            if (parseFloat(valor, 0) < 0.00 || numeroNegativo == true) {
                                if (valor.toString().length > 0) {
                                    cantidadPad = cantidadDigitosEntero - 1;
                                    valor = valor.substring(1, valor.length);
                                    resultado = "-" + padding_left(valor.replace(expRegNumeros, ''), '0', cantidadPad).toString();
                                }
                            } else {
                                cantidadPad = cantidadDigitosEntero;
                                resultado = padding_left(valor.replace(expRegNumeros, ''), '0', cantidadPad).toString();
                            }
                        }
                    }
                }
                return resultado.toString();

            } catch (e) {
                log.error('formatearNumero', 'Exception: ' + e.message);
            }
        }

        // left padding s with c to a total of n chars
        // padding_left('eureka', '*', 10)
        function padding_left(s, c, n) {
            try {
                if (!s || !c || s.toString().length >= n) {
                    return s;
                }
                var max = (n - s.toString().length) / c.toString().length;
                for (var i = 0; i < max; i++) {
                    s = c + s;
                }
                return s;
            } catch (e) {
                log.error('padding_left', 'Exception: ' + e.message);
            }
        }

        // right padding s with c to a total of n chars
        // padding_right('eureka', '*', 10)
        function padding_right(s, c, n) {
            try {
                if (!s || !c || s.toString().length >= n) {
                    return s;
                }
                var max = (n - s.toString().length) / c.toString().length;
                for (var i = 0; i < max; i++) {
                    s += c;
                }
                return s;
            } catch (e) {
                log.error('padding_right', 'Exception: ' + e.message);
            }
        }

        return {
            execute: execute
        };

    });
