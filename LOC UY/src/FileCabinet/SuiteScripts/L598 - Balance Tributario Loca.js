/**
 * @NApiVersion 2.x
 * @NAmdConfig /SuiteScripts/configuration.json
 * @NScriptType Suitelet
 * @NModuleScope Public
 */

function formatDate(date) {
    var d = new Date(date),
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

    return [year, month, day].join('-') + '-' + hour + ':' + minutes + ':' + seconds;
}


Number.prototype.toFixedOK = function(decimals) {
    var sign = this >= 0 ? 1 : -1;
    return (Math.round((this * Math.pow(10, decimals)) + (sign * 0.001)) / Math.pow(10, decimals)).toFixed(decimals);
}

define(['N/ui/serverWidget', 'N/record', 'N/runtime', 'N/search', 'N/format', 'N/file', '3K/utilities'],
    /**
     * @param {error} error
     * @param {record} record
     * @param {search} search
     */

    function(serverWidget, record, runtime, search, format, file, utilities) {

        /**
         * Validation function to be executed when record is saved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.currentRecord - Current form record
         * @returns {boolean} Return true if record is valid
         *
         * @since 2015.2
         */

        function onRequest(context) {

            try {

                var subsidiaria = 0;

                log.audit('onRequest', 'Inicio Proceso - Metodo:' + context.request.method);

                var userObj = runtime.getCurrentUser();

                var esOneworld = utilities.l598esOneworld();

                var form = serverWidget.createForm({
                    title: 'Balance Tributario - 4 Columnas'
                });

                var grupoFiltros = form.addFieldGroup({
                    id: 'filtros',
                    label: 'Criterios'
                });

                var btnAccion = form.addField({
                    id: 'custpage_accion',
                    label: 'Accion:',
                    type: serverWidget.FieldType.TEXT,
                    container: 'filtros'
                }).updateDisplayType({
                    displayType: serverWidget.FieldDisplayType.HIDDEN
                });

                //Inicio Campos
                var Periodo = form.addField({
                    id: 'periodo',
                    label: 'Periodo',
                    type: serverWidget.FieldType.SELECT,
                    container: 'filtros',
                    source: 'accountingperiod'
                });

                if (esOneworld) {

                    var subsidiaria = form.addField({
                        id: 'subsidiaria',
                        type: serverWidget.FieldType.SELECT,
                        label: 'Subsidiaria',
                        container: 'filtros',
                        source: 'subsidiary'
                    });
                }
                //Fin Campos

                var infoResultado = form.addField({
                    id: 'custpage_resultado',
                    label: 'Resultados',
                    type: serverWidget.FieldType.INLINEHTML
                });

                form.addSubmitButton({
                    label: 'Generar'
                });

                if (context.request.method === 'POST') {

                    if (!utilities.isEmpty(context.request.parameters.subsidiaria) && !utilities.isEmpty(context.request.parameters.periodo)) {

                        var periodoPost = context.request.parameters.periodo

                        var objPeriodo = record.load({
                            type: record.Type.TAX_PERIOD,
                            id: periodoPost,
                            isDynamic: true
                        });

                        var endDate = objPeriodo.getValue('enddate');

                        var formatEndDate = format.format({
                            value: endDate,
                            type: format.Type.DATE,
                            timezone: format.Timezone.AMERICA_MONTEVIDEO // Montevideo - Uruguay
                        });

                        var oneDate = objPeriodo.getValue('startdate');

                        var formatOneDate = format.format({
                            value: oneDate,
                            type: format.Type.DATE,
                            timezone: format.Timezone.AMERICA_MONTEVIDEO // Montevideo - Uruguay
                        });

                        //inicio busqueda cuentas subsidiaria
                        var searchRecord = search.load({
                            id: 'customsearch_l598_balan_tribu_4_colum'
                        });

                        if (esOneworld) {

                            var filterSub = search.createFilter({
                                name: 'subsidiary',
                                operator: search.Operator.IS,
                                values: context.request.parameters.subsidiaria
                            });

                            searchRecord.filters.push(filterSub);
                        }
                        //Crear las columnas con saldos
                        //Saldos de Cuentas Históricas - Débito - Columna #5
                        var column5 = search.createColumn({
                            name: 'formulanumeric',
                            formula: ("CASE WHEN LAST_DAY(TO_DATE(ConCat('01 ', {postingperiod}), 'dd.mm.yyyy')) <= TO_DATE('" + formatEndDate + "','DD/MM/YYYY') THEN {debitamount} ELSE 0 END"),
                            summary: search.Summary.SUM
                        });

                        searchRecord.columns.push(column5);

                        //Saldos de Cuentas Históricas - Crédito - Columna #6
                        var column6 = search.createColumn({
                            name: 'formulanumeric',
                            formula: ("CASE WHEN LAST_DAY(TO_DATE(ConCat('01 ', {postingperiod}), 'dd.mm.yyyy')) <= TO_DATE('" + formatEndDate + "','DD/MM/YYYY') THEN {creditamount} ELSE 0 END"),
                            summary: search.Summary.SUM
                        });

                        searchRecord.columns.push(column6);

                        var priDiaEjerActual = new Date(formatOneDate);
                        priDiaEjerActual = '01/01/' + (priDiaEjerActual.getFullYear());
                        //log.debug('onRequest', 'priDiaEjerActual:' + priDiaEjerActual);

                        //Saldos de Cuentas Periódicas - Débito - Columna #7
                        var column7 = search.createColumn({
                            name: 'formulanumeric',
                            formula: ("CASE WHEN TO_DATE(ConCat('01 ', {postingperiod}), 'dd.mm.yyyy') >= TO_DATE('" + priDiaEjerActual + "','DD/MM/YYYY') AND LAST_DAY(TO_DATE(ConCat('01 ', {postingperiod}), 'dd.mm.yyyy')) <= TO_DATE('" + formatEndDate + "','DD/MM/YYYY') THEN {debitamount} ELSE 0 END"),
                            summary: search.Summary.SUM
                        });

                        searchRecord.columns.push(column7);

                        //Saldos de Cuentas Periódicas - Crédito - Columna #8
                        var column8 = search.createColumn({
                            name: 'formulanumeric',
                            formula: ("CASE WHEN TO_DATE(ConCat('01 ', {postingperiod}), 'dd.mm.yyyy') >= TO_DATE('" + priDiaEjerActual + "','DD/MM/YYYY') AND LAST_DAY(TO_DATE(ConCat('01 ', {postingperiod}), 'dd.mm.yyyy')) <= TO_DATE('" + formatEndDate + "','DD/MM/YYYY') THEN {creditamount} ELSE 0 END"),
                            summary: search.Summary.SUM
                        });

                        searchRecord.columns.push(column8);

                        var ultDiaEjerAnt = formatEndDate;
                        ultDiaEjerAnt = ultDiaEjerAnt.toString();
                        ultDiaEjerAnt = ultDiaEjerAnt.split('/')[2];
                        ultDiaEjerAnt = ultDiaEjerAnt - 1;
                        ultDiaEjerAnt = '31/12/' + ultDiaEjerAnt;

                        //Saldos para Retained Earnings - Débito - Columna #9
                        var column9 = search.createColumn({
                            name: 'formulanumeric',
                            formula: ("CASE WHEN LAST_DAY(TO_DATE(ConCat('01 ', {postingperiod}), 'dd.mm.yyyy')) <= TO_DATE('" + ultDiaEjerAnt + "','DD/MM/YYYY') THEN {debitamount} ELSE 0 END"),
                            summary: search.Summary.SUM
                        });

                        searchRecord.columns.push(column9);

                        //Saldos para Retained Earnings - Crédito - Columna #10
                        var column10 = search.createColumn({
                            name: 'formulanumeric',
                            formula: ("CASE WHEN LAST_DAY(TO_DATE(ConCat('01 ', {postingperiod}), 'dd.mm.yyyy')) <= TO_DATE('" + ultDiaEjerAnt + "','DD/MM/YYYY') THEN {creditamount} ELSE 0 END"),
                            summary: search.Summary.SUM
                        });

                        searchRecord.columns.push(column10);
                        //log.debug('onRequest', 'searchRecord.columns' + JSON.stringify(searchRecord.columns));

                        var resultSearch = searchRecord.run();
                        var completeResultSet;
                        var resultIndex = 0;
                        var resultStep = 1000; // Number of records returned in one step (maximum is 1000).
                        var resultado; // temporary variable used to store the result set.

                        do {
                            resultado = resultSearch.getRange({
                                start: resultIndex,
                                end: resultIndex + resultStep
                            });

                            if (resultado.length > 0) {
                                if (resultIndex == 0)
                                    completeResultSet = resultado; //Primera ve inicializa
                                else
                                    completeResultSet = completeResultSet.concat(resultado);
                            }
                            resultIndex = resultIndex + resultStep;

                        } while (!utilities.isEmpty(resultado) && resultado.length > 0)
                        //Fin Búsqueda cuentas subisidiaria.

                        if (esOneworld) {

                            var objSubsidiaria = record.load({
                                type: 'subsidiary',
                                id: context.request.parameters.subsidiaria,
                                isDynamic: true
                            });

                        } else {

                            var confiSubsidiaria = config.load({
                                type: config.Type.COMPANY_INFORMATION
                            });
                        }

                        var infoCSV = '';
                        var filaCSV = new Array();
                        filaCSV[0] = 'Balance Tributario';
                        infoCSV += filaCSV + '\n';

                        if (!utilities.isEmpty(objSubsidiaria.getValue('legalname'))) {
                            filaCSV[0] = 'Razon Social:' + objSubsidiaria.getValue('legalname');
                            infoCSV += filaCSV + '\n';

                        } else {
                            filaCSV[0] = 'Razon Social:' + objSubsidiaria.getValue('name');
                            infoCSV += filaCSV + '\n';
                        }

                        var periodoCsv = objPeriodo.getValue('periodname');

                        filaCSV[0] = 'Periodo:' + periodoCsv + ' -- ' + formatOneDate + ' - ' + formatEndDate;
                        infoCSV += filaCSV + '\n';
                        filaCSV[1] = 'Activo';
                        filaCSV[2] = 'Pasivo';
                        filaCSV[3] = 'Perdida';
                        filaCSV[4] = 'Ganancia';
                        infoCSV += filaCSV + '\n';

                        if (!utilities.isEmpty(completeResultSet)) {
                            /*results:
                              0-Cuenta
                              1-Cuenta: URU - Numero Columna Balance 4.
                              2-Cuenta: URU- Clasifi Cuenta Balan Tribu 4 Columnas.
                              3-Tipo de Saldo.
                              4-Subsidiaria.
                            **/
                            var retainedEarnings = new Object();
                            retainedEarnings.sumaCreditos = 0;
                            retainedEarnings.sumaDebitos = 0;
                            var suma = new Array();
                            suma[0] = 'Suma de Saldos';
                            suma[1] = 0;
                            suma[2] = 0;
                            suma[3] = 0;
                            suma[4] = 0;

                            for (i = 0; i < completeResultSet.length; i++) {
                                var result = completeResultSet[i];
                                var columns = result.columns;
                                var acct = result.getValue(columns[0]).toLowerCase();

                                //Cuentas que Intervienen;Activo;Pasivo;Pérdida;Ganancia
                                filaCSV[0] = '"' + result.getText(columns[0]) + '"'; //Nombre Cuenta
                                log.debug('onRequest', 'filaCSV[0]:' + filaCSV[0]);
                                if (result.getValue(columns[3]) == 'Acumulado') {
                                    //Si el tipo de saldo de la cuenta es Acumulado, toma las columnas acumuladas
                                    deb = parseFloat(result.getValue(columns[5]));
                                    cred = parseFloat(result.getValue(columns[6]));
                                    var saldoDeudor = result.getValue(columns[5]) - result.getValue(columns[6]);
                                    var saldoAcreedor = result.getValue(columns[6]) - result.getValue(columns[5]);
                                    saldoDeudor = parseFloat(saldoDeudor, 10).toFixedOK(0);
                                    saldoAcreedor = parseFloat(saldoAcreedor, 10).toFixedOK(0);
                                    
                                } else if (result.getValue(columns[3]) == 'Periodo' && acct.indexOf('retained earnings') < 0 && acct.indexOf('ganancias retenidas') < 0) {
                                    //Si el tipo de saldo de la cuenta es Periódico, toma las columnas periódicas y agrega los saldos del año anterior a Retained Earnings.
                                    deb = parseFloat(result.getValue(columns[7]));
                                    cred = parseFloat(result.getValue(columns[8]));
                                    var saldoDeudor = result.getValue(columns[7]) - result.getValue(columns[8]);
                                    var saldoAcreedor = result.getValue(columns[8]) - result.getValue(columns[7]);
                                    saldoDeudor = parseFloat(saldoDeudor, 10).toFixedOK(0);
                                    saldoAcreedor = parseFloat(saldoAcreedor, 10).toFixedOK(0);

                                    //Saldos del ejercicio anterior
                                    deb = parseFloat(result.getValue(columns[9]));
                                    cred = parseFloat(result.getValue(columns[10]));
                                    retainedEarnings.sumaDebitos += (isNaN(deb)) ? 0 : deb;
                                    retainedEarnings.sumaCreditos += (isNaN(cred)) ? 0 : cred;

                                } else {
                                    filaCSV[1] = 0;
                                    filaCSV[2] = 0;
                                    var saldoDeudor = 0;
                                    var saldoAcreedor = 0;
                                }

                                if (saldoDeudor > 0) {
                                    filaCSV[3] = parseFloat(saldoDeudor,10).toFixedOK(0); //Perdida
                                    filaCSV[4] = 0; //Ganancia
                                } else {
                                    filaCSV[3] = 0; //Perdida
                                    filaCSV[4] = parseFloat(saldoAcreedor,10).toFixedOK(0); //Ganancia
                                }
                                var acct = result.getValue(result.columns[0]).toLowerCase();

                                if (acct.indexOf('retained earnings') < 0 && acct.indexOf('ganancias retenidas') < 0) {
                                    switch (parseInt(result.getValue(columns[1]), 10)) {
                                        case 1: //ACTIVO
                                            filaCSV[1] = parseFloat(saldoDeudor, 10).toFixedOK(0);
                                            filaCSV[2] = 0;
                                            filaCSV[3] = 0;
                                            filaCSV[4] = 0;
                                            break;
                                        case 2: //PASIVO
                                            filaCSV[1] = 0;
                                            filaCSV[2] = parseFloat(saldoAcreedor, 10).toFixedOK(0);
                                            filaCSV[3] = 0;
                                            filaCSV[4] = 0;
                                            break;
                                        case 3: //PERDIDA
                                            filaCSV[1] = 0;
                                            filaCSV[2] = 0;
                                            filaCSV[3] = parseFloat(saldoDeudor, 10).toFixedOK(0);
                                            filaCSV[4] = 0;
                                            break;
                                        case 4: //GANANCIA
                                            filaCSV[1] = 0;
                                            filaCSV[2] = 0;
                                            filaCSV[3] = 0;
                                            filaCSV[4] = parseFloat(saldoAcreedor, 10).toFixedOK(0);
                                            break;
                                        default:
                                            filaCSV[1] = 0;
                                            filaCSV[2] = 0;
                                            filaCSV[3] = 0;
                                            filaCSV[4] = 0;
                                    }

                                    filaCSV[1] = parseFloat(filaCSV[1], 10).toFixedOK(0);
                                    filaCSV[2] = parseFloat(filaCSV[2], 10).toFixedOK(0);
                                    filaCSV[3] = parseFloat(filaCSV[3], 10).toFixedOK(0);
                                    filaCSV[4] = parseFloat(filaCSV[4], 10).toFixedOK(0);

                                    infoCSV += filaCSV + '\n';

                                    suma[1] += parseFloat(filaCSV[1]);
                                    suma[2] += parseFloat(filaCSV[2]);
                                    suma[3] += parseFloat(filaCSV[3]);
                                    suma[4] += parseFloat(filaCSV[4]);
                                }
                            } //for resultados

                            //Crear y Agregar fila de Retained Earnings
                            saldoDeudor = parseFloat(retainedEarnings.sumaDebitos, 10) - parseFloat(retainedEarnings.sumaCreditos, 10).toFixedOK(0);
                            saldoAcreedor = parseFloat(retainedEarnings.sumaCreditos, 10) - parseFloat(retainedEarnings.sumaDebitos, 10).toFixedOK(0);

                            filaCSV[0] = '"Retained Earnings"';
                            (filaCSV[1]) = (saldoDeudor > 0) ? parseFloat(saldoDeudor, 10).toFixedOK(0): 0;
                            (filaCSV[2]) = (saldoAcreedor > 0) ? parseFloat(saldoAcreedor, 10).toFixedOK(0): 0;
                            (filaCSV[3]) = 0;
                            (filaCSV[4]) = 0;
                            infoCSV += filaCSV + '\n';
                            log.debug('onRequest', 'filaCSV:' + JSON.stringify(filaCSV));

                            suma[1] += parseFloat(filaCSV[1], 10);
                            suma[2] += parseFloat(filaCSV[2], 10);
                            suma[3] += parseFloat(filaCSV[3], 10);
                            suma[4] += parseFloat(filaCSV[4], 10);
                            infoCSV += suma + '\n';
                            log.debug('onRequest', 'suma[1]:' + suma[1] + '. suma[2]:' + suma[2] + '. suma[3]:' + suma[3] + '. suma[4]:' + suma[4]);
                            
                            //Agrego Fila de Resultados del Ejercicio
                            var resultados = new Array();
                            resultados[0] = 'Resultados del Ejercicio';
                            resultados[1] = (suma[3] > suma[4]) ? parseFloat(suma[3], 10).toFixedOK(0) - parseFloat(suma[4], 10).toFixedOK(0) : 0;
                            resultados[2] = (suma[3] < suma[4]) ? parseFloat(suma[4], 10).toFixedOK(0) - parseFloat(suma[3], 10).toFixedOK(0) : 0;
                            resultados[3] = (suma[3] < suma[4]) ? parseFloat(suma[4], 10).toFixedOK(0) - parseFloat(suma[3], 10).toFixedOK(0) : 0;
                            resultados[4] = (suma[3] > suma[4]) ? parseFloat(suma[3], 10).toFixedOK(0) - parseFloat(suma[4], 10).toFixedOK(0) : 0;
                            infoCSV += resultados + '\n';
                            log.debug('onRequest', 'resultados:' + JSON.stringify(resultados));

                            suma[0] = 'Total';
                            suma[1] += resultados[1];
                            suma[2] += resultados[2];
                            suma[3] += resultados[3];
                            suma[4] += resultados[4];
                            infoCSV += suma + '\n';
                            log.debug('onRequest', 'suma:' + JSON.stringify(suma));
                        } //if resultados>0

                        if (!utilities.isEmpty(infoCSV)) {

                            var fechaServidor = new Date();
                            var fechaArchivo = formatDate(fechaServidor);
                            var nombreArchivo = '';
                            var idFolder = '';
                            var fechaLocal = format.format({
                                value: fechaServidor,
                                type: format.Type.DATETIME,
                                timezone: format.Timezone.AMERICA_MONTEVIDEO // Montevideo - Uruguay
                            });

                            var fechaLocalDate = format.parse({
                                value: fechaLocal,
                                type: format.Type.DATETIME,
                                timezone: format.Timezone.AMERICA_MONTEVIDEO // Montevideo - Uruguay
                            });

                            //INICIO OBTENER CONFIGURACION DE GENERACION CSV 
                            try {

                                var mySearch = search.load({
                                    id: 'customsearch_l598_balance_tributa_config'
                                });

                                if (esOneworld) {
                                    var filtroSubsidiaria = search.createFilter({
                                        name: 'custrecord_l598_bala_trib_confi_subsidia',
                                        operator: search.Operator.IS,
                                        values: context.request.parameters.subsidiaria
                                    });
                                    mySearch.filters.push(filtroSubsidiaria);
                                }

                                var resultSet = mySearch.run();
                                var searchResult = resultSet.getRange({
                                    start: 0,
                                    end: 1
                                });

                                if (!utilities.isEmpty(searchResult) && searchResult.length > 0) {
                                    idFolder = searchResult[0].getValue({
                                        name: resultSet.columns[1]
                                    });
                                    nombreArchivo = searchResult[0].getValue({
                                        name: resultSet.columns[2]
                                    });

                                    nombreArchivo = nombreArchivo + periodoCsv.toString().replace('\ ', '') + '_' + fechaArchivo; //+ '.csv';

                                    log.debug('onRequest', 'idFolder:' + idFolder + '. nombreArchivo:' + nombreArchivo);

                                } else {
                                    log.error('onRequest', 'No se encuentra realizada la Configuracion de Generacion CSV Loc Uruguay');
                                }
                                //FIN OBTENER CONFIGURACION DE GENERACION CSV 
                            } catch (excepcion) {
                                log.error('onRequest', 'Error - Error al crear el archivo cvs loc uru: ' + excepcion.message);
                            }

                            //SE CREA Y SE GUARDA EL ARCHIVO
                            var archivo = file.create({
                                name: nombreArchivo,
                                fileType: file.Type.CSV,
                                contents: infoCSV
                            });

                            //SE SETEA EL FOLDER DESTINO DEL ARCHIVO
                            archivo.folder = idFolder;

                            if (!utilities.isEmpty(idFolder)) {
                                var fileId = archivo.save();
                                log.debug('onRequest', 'fileId:' + fileId);
                                var mensaje = "SU BALANCE TRIBUTARIO FUE CREADO DE FORMA EXITOSA";
                                infoResultado.defaultValue = '<font color="blue">' + mensaje + '</font>';
                                context.response.writePage(form);

                                //FIN DE CREAR Y GUARDAR EL ARCHIVO
                            } else {
                                log.error('onRequest', 'No se encuentra el id de la carpeta a donde irá el archivo');
                            }
                        }
                    } else {
                        if (esOneworld) {
                            var mensaje = "Debe ingresar subsidiaria";
                            infoResultado.defaultValue = '<font color="red">' + mensaje + '</font>';
                            periodo.setValue(context.request.parameters.periodo);
                            context.response.writePage(form);
                        }
                    }

                } else {
                    context.response.writePage(form);
                }

                log.audit('onRequest', 'Fin Proceso - Metodo:' + context.request.method);

            } catch (excepcion) {
                log.error('onRequest', 'Error - Error al crear la Forma Balance Tributario 8 Columnas: ' + excepcion.message);
            }
        }
        return {
            onRequest: onRequest
        };

    });