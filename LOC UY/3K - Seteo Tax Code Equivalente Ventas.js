/**
 * @NApiVersion 2.1
 * @NAmdConfig /SuiteScripts/configuration.json
 * @NScriptType UserEventScript
 * @NModuleScope Public
 */
define(
    [
        'N/record', 'N/error', 'N/search', '3K/utilities', 'N/runtime'
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
                    let recType = objRecord.type;

                    if (recType == 'vendorbill') {

                        // Obtengo los codigos de impuestos de la cuenta para la subsidiaria de Uruguay
                        let infoCodigosImp = getTaxCodes(subsidiaria);

                        if (!utilities.isEmpty(infoCodigosImp) && !infoCodigosImp.error) {

                            let codigoImpuestos = infoCodigosImp.results;
                            log.debug(proceso, 'codigoImpuestos: ' + JSON.stringify(codigoImpuestos));

                            let tipoSublistas = [];
                            tipoSublistas.push('expense');
                            tipoSublistas.push('item');

                            for (let subListasCompras = 0; subListasCompras < tipoSublistas.length; subListasCompras++) {

                                let tipoSublistaConsultar = tipoSublistas[subListasCompras];
                                let cantidadItems = objRecord.getLineCount({ sublistId: tipoSublistaConsultar });

                                for (let i = 0; i <= cantidadItems; i++) {

                                    let esFacturable = objRecord.getSublistValue(tipoSublistaConsultar, 'isbillable', i);
                                    let customer = objRecord.getSublistValue(tipoSublistaConsultar, 'customer', i);

                                    if (!utilities.isEmpty(esFacturable) && !utilities.isEmpty(customer) && (esFacturable == 'T' || esFacturable == true)) {

                                        let codigoImpLinea = objRecord.getSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'taxcode', line: i });
                                        let detalleCodImpLinea = codigoImpuestos.filter(obj => obj.tcId == codigoImpLinea);
                                        log.debug(proceso, 'detalleCodImpLinea: ' + JSON.stringify(detalleCodImpLinea));

                                        if (!utilities.isEmpty(detalleCodImpLinea) && detalleCodImpLinea.length > 0) {
                                            if (!utilities.isEmpty(detalleCodImpLinea[0].taxCodeEquivalente)) {
                                                objRecord.setSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'custcol_3k_tax_code_equivalent_ventas', line: i, value: detalleCodImpLinea[0].taxCodeEquivalente });
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            log.error(proceso, 'Error extrayendo informacion de los codigos de impuestos de lineas de gastos: ' + infoCodigosImp.mensaje);
                        }
                    }

                    if (recType == 'invoice') {

                        let tipoSublistas = [];
                        tipoSublistas.push('expcost');
                        tipoSublistas.push('itemcost');

                        for (let subListasVentas = 0; subListasVentas < tipoSublistas.length; subListasVentas++) {

                            let tipoSublistaConsultar = tipoSublistas[subListasVentas];
                            let cantidadItems = objRecord.getLineCount({ sublistId: tipoSublistaConsultar });

                            for (let i = 0; i <= cantidadItems; i++) {

                                let aplicar = objRecord.getSublistValue(tipoSublistaConsultar, 'apply', i);

                                if (!utilities.isEmpty(aplicar) && (aplicar == 'T' || aplicar == true)) {

                                    let codigoImpLineaEquivalente = objRecord.getSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'custcol_3k_tax_code_equivalent_ventas', line: i });
                                    
                                    if (!utilities.isEmpty(codigoImpLineaEquivalente)) {
                                        objRecord.setSublistValue({ sublistId: tipoSublistaConsultar, fieldId: 'taxcode', line: i, value: codigoImpLineaEquivalente });
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                log.error(proceso, 'Ocurrio un error mientras se seteaban los campos de tax code equivalentes en ventas, detalles: ' + error.message);
            }

            log.debug(proceso, 'FIN - function beforeSubmit - unidades disponibles: ' + currentScript.getRemainingUsage() + ' - time: ' + new Date());
        }

        let getTaxCodes = (subsidiaria) => {

            let proceso = 'getTaxCodes';
            let objetoRespuesta = { mensaje: '', error: false, results: [] };

            log.debug(proceso, 'INICIO - function getTaxCodes - subsidiaria: ' + subsidiaria);

            try {
                let filtros = [];

                if (!utilities.isEmpty(subsidiaria)) {
                    let filtro = {};
                    filtro.name = 'subsidiary';
                    filtro.operator = 'ANYOF';
                    filtro.values = subsidiaria;
                    filtros.push(filtro);
                }

                let objResultSet = utilities.searchSavedPro('customsearch_3k_cod_impuesto_equiv_venta', filtros);

                if (objResultSet.error) {
                    objetoRespuesta.error = true;
                    objetoRespuesta.mensaje = 'Error Consultando searchSavedPro *** Script / 3K - Código de Impuesto Equivalentes Ventas, DETALLES Error: ' + objResultSet.descripcion;
                    log.error(proceso, objetoRespuesta.mensaje);
                } else {

                    let resultSet = objResultSet.objRsponseFunction.result;
                    let resultSearch = objResultSet.objRsponseFunction.search;

                    if ((!utilities.isEmpty(resultSet)) && (resultSet.length > 0)) {
                        for (let i = 0; i < resultSet.length; i++) {

                            objetoRespuesta.results[i] = {};

                            objetoRespuesta.results[i].tcId = resultSet[i].getValue({
                                name: resultSearch.columns[0]
                            });

                            objetoRespuesta.results[i].nombre = resultSet[i].getValue({
                                name: resultSearch.columns[1]
                            });

                            objetoRespuesta.results[i].taxCodeEquivalente = resultSet[i].getValue({
                                name: resultSearch.columns[2]
                            });
                        }
                    } else {
                        log.debug(proceso, 'No se encontró información para la búsqueda guardada invocada: *** Script / 3K - Código de Impuesto Equivalentes Ventas.');
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
