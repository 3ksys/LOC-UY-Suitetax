/**
 * @NApiVersion 2.1
 * @NAmdConfig /SuiteScripts/configuration_l598.json
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(
    [
        'N/record', 'N/error', 'N/search', 'L598/utilities', 'N/runtime'
    ],
    (record, error, search, utilities, runtime) => {

        /**
         * Function definition to be triggered before record is loaded.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        let beforeSubmit = (scriptContext) => {

            let proceso = 'beforeSubmit';
            let currentScript = runtime.getCurrentScript();

            log.debug(proceso, 'INICIO - function beforeSubmit - unidades disponibles: ' + currentScript.getRemainingUsage() + ' - time: ' + new Date());

            try {
                if (scriptContext.type != 'delete') {
                    let objRecord = scriptContext.newRecord;
                    let isOneWorld = utilities.l598esOneworld();
                    let subsidiaria = isOneWorld ? objRecord.getValue('subsidiary') : null;
                    let cantidadGastos = objRecord.getLineCount({ sublistId: 'expense' });

                    if (!utilities.isEmpty(cantidadGastos) && cantidadGastos > 0) {

                        let existeGastoFacturable = false;

                        for (let i = 0; i < cantidadGastos && existeGastoFacturable == false; i++) {
                            let esBillable = objRecord.getSublistValue('expense', 'isbillable', i);
                            let cust = objRecord.getSublistValue('expense', 'customer', i);

                            if (!utilities.isEmpty(esBillable) && !utilities.isEmpty(cust) && (esBillable == 'T' || esBillable == true)) {
                                existeGastoFacturable = true;
                            }
                        }

                        log.debug(proceso, 'existeGastoFacturable: ' + existeGastoFacturable);

                        if (existeGastoFacturable == true) {
                            let configuracionLineasGastos = getConfigLineasGastos(subsidiaria);
                            log.debug(proceso, 'configuracionLineasGastos: ' + JSON.stringify(configuracionLineasGastos));

                            if (!utilities.isEmpty(configuracionLineasGastos) && !configuracionLineasGastos.error) {

                                let resultsConfigLineasGastos = configuracionLineasGastos.results;
                                // let infoCodigosImp = getTaxCodes(subsidiaria);
                                let infoCodigosImp = getTaxCodes(null);

                                if (!utilities.isEmpty(infoCodigosImp) && !infoCodigosImp.error) {

                                    let codigoImpuestos = infoCodigosImp.results;
                                    log.debug(proceso, 'codigoImpuestos: ' + JSON.stringify(codigoImpuestos));

                                    if (codigoImpuestos.length > 0) {
                                        if (resultsConfigLineasGastos.length > 0) {

                                            log.debug(proceso, 'Line 65 - unidades disponibles: ' + currentScript.getRemainingUsage() + ' - time: ' + new Date());

                                            for (let i = 0; i < cantidadGastos; i++) {

                                                let esFacturable = objRecord.getSublistValue('expense', 'isbillable', i);
                                                let customer = objRecord.getSublistValue('expense', 'customer', i);

                                                if (!utilities.isEmpty(esFacturable) && !utilities.isEmpty(customer) && (esFacturable == 'T' || esFacturable == true)) {
                                                    // let codigoImpLinea = objRecord.getSublistValue({ sublistId: 'expense', fieldId: 'taxcode', line: i });
                                                    let codigoImpLinea = objRecord.getSublistValue({ sublistId: 'expense', fieldId: 'custcol_l598_codigo_impuesto', line: i });
                                                    let detalleCodImpLinea = codigoImpuestos.filter(obj => obj.tcId == codigoImpLinea);

                                                    log.debug(proceso, 'detalleCodImpLinea: ' + JSON.stringify(detalleCodImpLinea));

                                                    objRecord.setSublistValue({ sublistId: 'expense', fieldId: 'custcol_l598_articulo_unid_medida', line: i, value: resultsConfigLineasGastos[0].codUnidadMedida });
                                                    let nombreGasto = resultsConfigLineasGastos[0].nombreGenericoItems;
                                                    let setearNombreGastosItems = resultsConfigLineasGastos[0].setearNombreGastosItems;

                                                    if (!utilities.isEmpty(setearNombreGastosItems) && (setearNombreGastosItems == true || setearNombreGastosItems == 'T')) {
                                                        nombreGasto = objRecord.getSublistText({ sublistId: 'expense', fieldId: 'account', line: i });
                                                        let displayGasto = objRecord.getSublistValue({ sublistId: 'expense', fieldId: 'account_display', line: i });

                                                        log.debug(proceso, 'nombreGasto: ' + nombreGasto + ' - displayGasto: ' + displayGasto);
                                                    }

                                                    if (!utilities.isEmpty(nombreGasto)) {
                                                        objRecord.setSublistValue({ sublistId: 'expense', fieldId: 'custcol_l598_articulo_nombre', line: i, value: nombreGasto });
                                                        objRecord.setSublistValue({ sublistId: 'expense', fieldId: 'custcol_l598_articulo_descripcion', line: i, value: nombreGasto });
                                                    }

                                                    if (!utilities.isEmpty(detalleCodImpLinea) && detalleCodImpLinea.length > 0) {
                                                        if (!utilities.isEmpty(detalleCodImpLinea[0].tcIndFac)) {
                                                            objRecord.setSublistValue({ sublistId: 'expense', fieldId: 'custcol_l598_ind_facturacion', line: i, value: detalleCodImpLinea[0].tcIndFac });
                                                        }
                                                        if (!utilities.isEmpty(detalleCodImpLinea[0].tcCodPercep)) {
                                                            objRecord.setSublistValue({ sublistId: 'expense', fieldId: 'custcol_l598_cod_perc_ret_cred', line: i, value: detalleCodImpLinea[0].tcCodPercep });
                                                        }
                                                    }
                                                }
                                            }

                                            log.debug(proceso, 'Line 104 - unidades disponibles: ' + currentScript.getRemainingUsage() + ' - time: ' + new Date());
                                        } else {
                                            log.error(proceso, 'No existe configuracion para configurar los campos de las localizaciones en los items de gastos.');
                                        }
                                    } else {
                                        log.error(proceso, 'No existe configuracion para configurar los campos de las localizaciones en los items de gastos.');
                                    }
                                } else {
                                    log.error(proceso, 'Error extrayendo informacion de los codigos de impuestos de lineas de gastos: ' + infoCodigosImp.mensaje);
                                }
                            } else {
                                log.error(proceso, 'Error extrayendo informacion de la configuracion de lineas de gastos: ' + configuracionLineasGastos.mensaje);
                            }
                        }
                    }
                }
            } catch (error) {
                log.error(proceso, 'Ocurrio un error mientras se seteaban los campos de lineas de gastos, detalles: ' + error.message);
            }

            log.debug(proceso, 'FIN - function beforeSubmit - unidades disponibles: ' + currentScript.getRemainingUsage() + ' - time: ' + new Date());
        }

        let getConfigLineasGastos = (subsidiaria) => {

            var proceso = 'getConfigLineasGastos';
            var objetoRespuesta = { mensaje: '', error: false, results: [] };

            log.debug(proceso, 'INICIO - function getConfigLineasGastos - subsidiaria: ' + subsidiaria);

            try {

                var filtros = [];

                if (!utilities.isEmpty(subsidiaria)) {
                    var filtro = {};
                    filtro.name = 'custrecord_l598_conf_lin_gas_re_subsi';
                    filtro.operator = 'ANYOF';
                    filtro.values = subsidiaria;
                    filtros.push(filtro);
                }

                var objResultSet = utilities.searchSavedPro('customsearch_l598_config_lin_gas_refactu', filtros);

                if (objResultSet.error) {
                    objetoRespuesta.error = true;
                    objetoRespuesta.mensaje = 'Error Consultando searchSavedPro *** Script / URU-Configuración Líneas Gastos Refact. Search, DETALLES Error: ' + objResultSet.descripcion;
                    log.error(proceso, objetoRespuesta.mensaje);
                } else {

                    var resultSet = objResultSet.objRsponseFunction.result;
                    var resultSearch = objResultSet.objRsponseFunction.search;

                    if ((!utilities.isEmpty(resultSet)) && (resultSet.length > 0)) {
                        for (var i = 0; i < resultSet.length; i++) {

                            objetoRespuesta.results[i] = {};

                            objetoRespuesta.results[i].idInterno = resultSet[i].getValue({
                                name: resultSearch.columns[0]
                            });

                            objetoRespuesta.results[i].unidadMedida = resultSet[i].getValue({
                                name: resultSearch.columns[1]
                            });

                            objetoRespuesta.results[i].codUnidadMedida = resultSet[i].getValue({
                                name: resultSearch.columns[2]
                            });

                            objetoRespuesta.results[i].setearNombreGastosItems = resultSet[i].getValue({
                                name: resultSearch.columns[3]
                            });

                            objetoRespuesta.results[i].nombreGenericoItems = resultSet[i].getValue({
                                name: resultSearch.columns[4]
                            });

                            objetoRespuesta.results[i].cantidadDefault = resultSet[i].getValue({
                                name: resultSearch.columns[5]
                            });
                        }
                    } else {
                        log.debug(proceso, 'No se encontró información para la búsqueda guardada invocada: *** Script / URU-Configuración Líneas Gastos Refact. Search.');
                    }
                }
            } catch (error) {
                objetoRespuesta.error = true;
                objetoRespuesta.mensaje = 'Error NetSuite Excepción - Error al obtener valores de la configuracion de articulos de gastos refacturables - Detalles: ' + error.message;
                log.error(proceso, objetoRespuesta.mensaje);
            }

            log.debug(proceso, 'FIN - function getConfigLineasGastos');
            return objetoRespuesta;
        }

        let getTaxCodes = (subsidiaria) => {

            var proceso = 'getTaxCodes';
            var objetoRespuesta = { mensaje: '', error: false, results: [] };

            log.debug(proceso, 'INICIO - function getTaxCodes - subsidiaria: ' + subsidiaria);

            try {

                var filtros = [];

                if (!utilities.isEmpty(subsidiaria)) {
                    var filtro = {};
                    filtro.name = 'subsidiary';
                    filtro.operator = 'ANYOF';
                    filtro.values = subsidiaria;
                    filtros.push(filtro);
                }

                var objResultSet = utilities.searchSavedPro('customsearch_l598_codig_imp_gastos_refac', filtros);

                if (objResultSet.error) {
                    objetoRespuesta.error = true;
                    objetoRespuesta.mensaje = 'Error Consultando searchSavedPro *** Script / URU - Código de Impuesto Gastos Refacturables, DETALLES Error: ' + objResultSet.descripcion;
                    log.error(proceso, objetoRespuesta.mensaje);
                } else {

                    var resultSet = objResultSet.objRsponseFunction.result;
                    var resultSearch = objResultSet.objRsponseFunction.search;

                    if ((!utilities.isEmpty(resultSet)) && (resultSet.length > 0)) {
                        for (var i = 0; i < resultSet.length; i++) {

                            objetoRespuesta.results[i] = {};

                            objetoRespuesta.results[i].tcId = resultSet[i].getValue({
                                name: resultSearch.columns[0]
                            });

                            objetoRespuesta.results[i].tcIndFac = resultSet[i].getValue({
                                name: resultSearch.columns[1]
                            });

                            objetoRespuesta.results[i].tcCodPercep = resultSet[i].getValue({
                                name: resultSearch.columns[2]
                            });

                            objetoRespuesta.results[i].esPercRet = resultSet[i].getValue({
                                name: resultSearch.columns[3]
                            });

                            objetoRespuesta.results[i].esIndExp = resultSet[i].getValue({
                                name: resultSearch.columns[4]
                            });
                        }
                    } else {
                        log.debug(proceso, 'No se encontró información para la búsqueda guardada invocada: *** Script / URU - Código de Impuesto Gastos Refacturables.');
                    }
                }
            } catch (error) {
                objetoRespuesta.error = true;
                objetoRespuesta.mensaje = 'Error NetSuite Excepción - Error al obtener valores de codigos de impuestos de IVA - Detalles: ' + error.message;
                log.error(proceso, objetoRespuesta.mensaje);
            }

            log.debug(proceso, 'FIN - function getTaxCodes');
            return objetoRespuesta;
        }

        return {
            beforeSubmit: beforeSubmit
        };
    });
