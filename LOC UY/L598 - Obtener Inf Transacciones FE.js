/**
 *@NApiVersion 2.0
 *@NScriptType Restlet
 */
 define(["N/log", "N/record", "N/runtime", "N/search", "N/format"],
 function (log, record, runtime, search, format) {
   /* global define */
   /***
        * Migrado L598 - Obtener Inf Transacciones FE V2, desde L598-Middleware-FacturaElectronica, solo funcion POST y sus dependencias.
        */


   /**
   * 
   * @param {Object} obj https://suiteanswers.custhelp.com/app/answers/detail/a_id/43711/loc/en_US
   * @param {*} field campo que se quiere obtener
   * @param {*} value true si se quiere obtener el value (default), false si es el texto.
   * @return {any} devuelve lo pedido, o undefined, si el field llega a contener un valor plano, se retornara el valor plano no importa que diga el parametro value.
   */
   function getLookupFieldsSafe(obj, field) {
     var value = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
     if (Object.keys(obj).length === 0) return undefined;
     if (obj[field] == undefined) return undefined;
     if (!(obj[field] instanceof Array)) return obj[field];
     if (obj[field][0] == undefined) return undefined;
     if (value) {
       return obj[field][0].value;
     } else {
       return obj[field][0].text;
     }
   }
   Number.prototype.toFixedOK = function (decimals) {
     var sign = this >= 0 ? 1 : -1;
     return (Math.round((this * Math.pow(10, decimals)) + (sign * 0.001)) / Math.pow(10, decimals)).toFixed(decimals);
   };

   function nvl(valor, valorDefault) {
     if (l598isEmpty(valor))
       return valorDefault;
     else
       return valor;
   }
   function padding_left(s, c, n) {
     if (!s || !c || s.toString().length >= n) {
       return s;
     }
     var max = (n - s.toString().length) / c.toString().length;
     for (var i = 0; i < max; i++) {
       s = c + s;
     }
     return s;
   }
   function validarSiNumero(numero) {
     if (!/^([0-9])*$/.test(numero))
       return false;
     else
       return true;
   }
   function l598isEmpty(value) {
     if (value === "") {
       return true;
     }
     if (value === null) {
       return true;
     }
     if (value === undefined) {
       return true;
     }
     if (value === "null") {
       return true;
     }
     if (value === "undefined") {
       return true;
     }
     return false;
   }
   function l598esOneworld() {
     var filters = [
       search.createFilter({
         name: "isinactive",
         operator: search.Operator.IS,
         values: false
       }),
       search.createFilter({
         name: "custrecord_l598_dat_imp_es_oneworld",
         operator: search.Operator.IS,
         values: true
       })
     ];
     var searchresults = search.create({
       type: "customrecord_l598_datos_impositivos_emp",
       filters: filters
     }).run().getRange({
       start: 0,
       end: 1000
     });
     if (searchresults != null && searchresults.length > 0)
       return true;
     else
       return false;
   }
   function obtenerValorCampo(valorCampo) {
     if (l598isEmpty(valorCampo))
       return "";
     else
       return valorCampo;
   }


   /**
         * Función migrada obtenerInformacionTransaccionFE(informacionTransaccion)
         */
   function doPost(requestBody) {
     log.debug("URU - Factura Electronica", "Inicio Obtencion Informacion Transacciones");
     var informacionTransacciones = {
       error: false,
       tipo: "FMSJ-1",
       idTransaccion: 0,
       mensajeAdicional: "",
       existenTransacciones: false,
       cantidadFE: 0,
       transaccionesFE: null,
       idRegistrosSinProcesar: "",
     };
     var tipoMensajeError = "FMSJ-30";
     try {
       var objGet = runtime.getCurrentScript();
       // var unidadesDisponibles = objGet.getRemainingUsage();

       // var estadoInicial = true;

       var sinUnidades = false;
       var ultimoValorI = 0;
       if (informacionTransacciones != null && informacionTransacciones != "") {
         var informacion = null;
         if (!l598isEmpty(requestBody)) {
           informacion = JSON.parse(requestBody);
         }
         if (informacion != null && informacion != "") {
           var idTransaccion = informacion.idTransaccion;
           if (!l598isEmpty(idTransaccion) && idTransaccion.length > 0) {
             // Busco las Transacciones de la SS
             var idTransaccionesFinal = idTransaccion.split(",");
             log.debug("URU - Factura Electronica", "ID Transacciones Procesar : " + idTransaccion);
             var filtroTransaccion = search.createFilter({
               name: "internalid",
               operator: search.Operator.ANYOF,
               values: idTransaccionesFinal
             });

             ////////////* INICIO - Llamada a primera SS de transacciones a procesar CAE *///////////////

             // MIGRAR función de load.
             var loadResultadoSetPartOne = search.load({
               id: "customsearch_l598_trans_generar_cae_pr_1"
             });

             loadResultadoSetPartOne.filters.push(filtroTransaccion);
             var resultadoSetRun = loadResultadoSetPartOne.run();

             var resultadoTransacciones = resultadoSetRun.getRange({
               start: 0,
               end: 1000
             });

             ///////////* FIN - llamada a primera SS de transacciones a procesar CAE *///////////////////


             ///////////* INICIO - Llamada a segunda SS de transacciones a procesar CAE */////////////////

             // MIGRAR función de load.
             var loadResultadoSetPartTwo = search.load({
               id: "customsearch_l598_trans_generar_cae_pr_2"
             });

             loadResultadoSetPartTwo.filters.push(filtroTransaccion);
             var resultadoSetRunParte2 = loadResultadoSetPartTwo.run();

             var resultadoTransaccionesParte2 = resultadoSetRunParte2.getRange({
               start: 0,
               end: 1000
             });

             //////////////* FIN - llamada a segunda SS de transacciones a procesar CAE *///////////////////


             var errorGlobal = false;
             var ultimaTransaccionFE = 0;
             // Verifico Si es OneWorld
             // var oneWorld = false;
             // if (l598esOneworld()) {
             //   oneWorld = true;
             // }
             for (var i = 0; resultadoTransacciones != null && i < resultadoTransacciones.length && errorGlobal == false && sinUnidades == false; i++) {

               var unidadesDisponiblesIniciales = objGet.getRemainingUsage();

               if (unidadesDisponiblesIniciales > 50) { // Valor Necesario Para Obtener Informacion Inicial

                 var resultadoIndividual = resultadoTransacciones[i];
                 var columns = resultadoIndividual.columns;

                 ////// Obtencion de resultados de SS dos

                 log.debug('obtenerInformacionFE', 'resultadoTransaccionesParte2[i].id: ' + resultadoTransaccionesParte2[i].id);

                 var resultadoIndividualAuxParte2 = resultadoTransaccionesParte2.filter(function (obj) {
                   return (obj.id == resultadoIndividual.getValue(columns[0]))
                 });

                 var resultadoIndividualParte2 = resultadoIndividualAuxParte2[0];

                 log.debug('obtenerInformacionFE', 'resultadoIndividualParte2: ' + JSON.stringify(resultadoIndividualParte2));
                 var columnsParte2 = resultadoIndividualParte2.columns;
                 log.debug('obtenerInformacionFE', 'Columnas: ' + columnsParte2);
                 log.debug('obtenerInformacionFE', 'SS parte 2 / COLUMNA 37: ' + resultadoIndividualParte2.getValue(columnsParte2[37]));

                 informacionTransacciones.existenTransacciones = true;

                 var idTransaccionIndividual = resultadoIndividual.getValue(columns[0]);
                 var serie = resultadoIndividual.getValue(columns[4]) || "";
                 var sucursal = resultadoIndividual.getValue(columns[5]) || "";
                 // var esNotaDebito = resultadoIndividual.getValue(columns[6]);
                 var contextType = resultadoIndividual.getValue(columns[3]);
                 if (contextType == "customtransaction_l598_anul_resguardo") {
                   var ncResguardo = resultadoIndividualParte2.getValue(columnsParte2[65]);
                   idTransaccionIndividual = ncResguardo;
                   contextType = "vendorcredit";
                 }
                 var idTransaccionURU = resultadoIndividual.getValue(columns[8]);
                 if (!l598isEmpty(serie) && !l598isEmpty(sucursal) && !l598isEmpty(idTransaccionIndividual) && !l598isEmpty(idTransaccionURU)) {
                   try {
                     var record_transaccion = record.load({
                       type: contextType,
                       id: idTransaccionIndividual,
                       isDynamic: true
                     });
                     if (!l598isEmpty(record_transaccion)) {
                       // Verifico si hay unidades para procesar la Transaccion
                       var cantidadLineasAProcesar = record_transaccion.getLineCount("item");
                       var unidadesRequeridas = parseInt((parseInt(cantidadLineasAProcesar, 10) * parseInt(10, 10)), 10) + parseInt(30, 10); //10 Unidades Consumidas por Lines , 20 Unidades Excedentes
                       var unidadesDisponiblesActuales = objGet.getRemainingUsage();
                       if (unidadesDisponiblesActuales > unidadesRequeridas) {
                         if (informacionTransacciones.transaccionesFE == null) {
                           informacionTransacciones.transaccionesFE = [];
                         }
                         informacionTransacciones.transaccionesFE[ultimaTransaccionFE] = {};
                         // Fin Verificar Unidades Disponibles
                         var objetoRespuestaIndividual = buscarInformacionFE(record_transaccion, resultadoIndividual, columns, tipoMensajeError, resultadoIndividualParte2, columnsParte2);
                         if (objetoRespuestaIndividual != null && objetoRespuestaIndividual.error != 1) {
                           informacionTransacciones.transaccionesFE[ultimaTransaccionFE] = objetoRespuestaIndividual;
                           informacionTransacciones.transaccionesFE[ultimaTransaccionFE].tipoComprobanteURU = idTransaccionURU;
                           informacionTransacciones.transaccionesFE[ultimaTransaccionFE].CbteDesde = idTransaccionIndividual;
                           informacionTransacciones.transaccionesFE[ultimaTransaccionFE].CbteHasta = idTransaccionIndividual;
                           informacionTransacciones.transaccionesFE[ultimaTransaccionFE].serie = serie;
                           informacionTransacciones.transaccionesFE[ultimaTransaccionFE].sucursal = sucursal;
                           ultimaTransaccionFE = parseInt(ultimaTransaccionFE, 10) + parseInt(1, 10);
                           informacionTransacciones.cantidadFE = parseInt(ultimaTransaccionFE, 10);
                         } else {
                           //Error Obteniendo Informacion de la Transaccion
                           informacionTransacciones.error = true;
                           informacionTransacciones.tipo = tipoMensajeError;
                           informacionTransacciones.mensajeAdicional = "Error Obteniendo Informacion de las Transacciones A Procesar";
                           if (objetoRespuestaIndividual != null) {
                             informacionTransacciones.transaccionesFE[ultimaTransaccionFE] = objetoRespuestaIndividual;
                             informacionTransacciones.transaccionesFE[ultimaTransaccionFE].tipoComprobanteURU = idTransaccionURU;
                             informacionTransacciones.transaccionesFE[ultimaTransaccionFE].CbteDesde = idTransaccionIndividual;
                             informacionTransacciones.transaccionesFE[ultimaTransaccionFE].CbteHasta = idTransaccionIndividual;
                             informacionTransacciones.transaccionesFE[ultimaTransaccionFE].serie = serie;
                             informacionTransacciones.transaccionesFE[ultimaTransaccionFE].sucursal = sucursal;
                             ultimaTransaccionFE = parseInt(ultimaTransaccionFE, 10) + parseInt(1, 10);
                           } else {
                             informacionTransacciones.transaccionesFE[ultimaTransaccionFE].error = true;
                             informacionTransacciones.transaccionesFE[ultimaTransaccionFE].tipo = tipoMensajeError;
                             informacionTransacciones.transaccionesFE[ultimaTransaccionFE].mensaje = "No se Obtuvo Respuesta de la Funcion de Obtener la Informacion de la Trasnaccion A Procesar";
                             informacionTransacciones.transaccionesFE[ultimaTransaccionFE].idRegistro = idTransaccionIndividual;
                             informacionTransacciones.transaccionesFE[ultimaTransaccionFE].tipoComprobanteURU = idTransaccionURU;
                             informacionTransacciones.transaccionesFE[ultimaTransaccionFE].CbteDesde = idTransaccionIndividual;
                             informacionTransacciones.transaccionesFE[ultimaTransaccionFE].CbteHasta = idTransaccionIndividual;
                             informacionTransacciones.transaccionesFE[ultimaTransaccionFE].serie = serie;
                             informacionTransacciones.transaccionesFE[ultimaTransaccionFE].sucursal = sucursal;
                           }
                         }
                       } else {
                         // No Hay Unidades Disponibles para las Lineas
                         sinUnidades = true;
                         ultimoValorI = i;
                       }
                     } else {
                       //
                       if (informacionTransacciones.transaccionesFE == null) {
                         informacionTransacciones.transaccionesFE = [];
                       }
                       informacionTransacciones.transaccionesFE[ultimaTransaccionFE] = {};
                       //
                       informacionTransacciones.transaccionesFE[ultimaTransaccionFE].error = true;
                       informacionTransacciones.transaccionesFE[ultimaTransaccionFE].tipo = tipoMensajeError;
                       informacionTransacciones.transaccionesFE[ultimaTransaccionFE].mensaje = "Error Cargando la Transaccion con ID Interno : " + idTransaccionIndividual + " Tipo de Transaccion : " + contextType;
                       informacionTransacciones.transaccionesFE[ultimaTransaccionFE].idRegistro = idTransaccionIndividual;
                       informacionTransacciones.transaccionesFE[ultimaTransaccionFE].tipoComprobanteURU = idTransaccionURU;
                       informacionTransacciones.transaccionesFE[ultimaTransaccionFE].CbteDesde = idTransaccionIndividual;
                       informacionTransacciones.transaccionesFE[ultimaTransaccionFE].CbteHasta = idTransaccionIndividual;
                       informacionTransacciones.transaccionesFE[ultimaTransaccionFE].serie = serie;
                       informacionTransacciones.transaccionesFE[ultimaTransaccionFE].sucursal = sucursal;
                       ultimaTransaccionFE = parseInt(ultimaTransaccionFE, 10) + parseInt(1, 10);
                       informacionTransacciones.cantidadFE = parseInt(ultimaTransaccionFE, 10);
                       log.error("URU - Factura Electronica", "Error Cargando la Transaccion con ID Interno : " + idTransaccionIndividual + " Tipo de Transaccion : " + contextType);
                     }
                   } catch (e) {
                     //
                     if (informacionTransacciones.transaccionesFE == null) {
                       informacionTransacciones.transaccionesFE = [];
                     }
                     informacionTransacciones.transaccionesFE[ultimaTransaccionFE] = {};
                     //
                     informacionTransacciones.transaccionesFE[ultimaTransaccionFE].error = true;
                     informacionTransacciones.transaccionesFE[ultimaTransaccionFE].tipo = tipoMensajeError;
                     informacionTransacciones.transaccionesFE[ultimaTransaccionFE].mensaje = "Excepcion Obteniendo la Transaccion con ID Interno : " + idTransaccionIndividual + " Tipo de Transaccion : " + contextType + " / Excepcion : " + e.message;
                     informacionTransacciones.transaccionesFE[ultimaTransaccionFE].idRegistro = idTransaccionIndividual;
                     informacionTransacciones.transaccionesFE[ultimaTransaccionFE].tipoComprobanteURU = idTransaccionURU;
                     informacionTransacciones.transaccionesFE[ultimaTransaccionFE].CbteDesde = idTransaccionIndividual;
                     informacionTransacciones.transaccionesFE[ultimaTransaccionFE].CbteHasta = idTransaccionIndividual;
                     informacionTransacciones.transaccionesFE[ultimaTransaccionFE].serie = serie;
                     informacionTransacciones.transaccionesFE[ultimaTransaccionFE].sucursal = sucursal;
                     ultimaTransaccionFE = parseInt(ultimaTransaccionFE, 10) + parseInt(1, 10);
                     informacionTransacciones.cantidadFE = parseInt(ultimaTransaccionFE, 10);
                     log.error("URU - Factura Electronica", "Excepcion Obteniendo Informacion de Transacciones A Procesar - Excepcion :  " + e.message);
                   }
                 } else {
                   // Falta Informacion Requerida de la Transaccion para Generar CAE
                   informacionTransacciones.error = true;
                   informacionTransacciones.tipo = tipoMensajeError;
                   informacionTransacciones.idTransaccion = idTransaccionIndividual;
                   var mensajeInformacionFaltante = "Falta Configurar la siguiente Informacion Requerida de la Transaccion para Generar CAE : ";
                   if (!l598isEmpty(serie) && !l598isEmpty(sucursal) && !l598isEmpty(idTransaccionIndividual) && !l598isEmpty(idTransaccionURU))
                     if (l598isEmpty(serie))
                       mensajeInformacionFaltante = mensajeInformacionFaltante + "Serie de la Transaccion / ";
                   if (l598isEmpty(sucursal))
                     mensajeInformacionFaltante = mensajeInformacionFaltante + "Sucursal de la Transaccion / ";
                   if (l598isEmpty(idTransaccionIndividual))
                     mensajeInformacionFaltante = mensajeInformacionFaltante + "Numero de Venta de la Transaccion (ID Interno) / ";
                   if (l598isEmpty(idTransaccionURU))
                     mensajeInformacionFaltante = mensajeInformacionFaltante + "Codigo de Transaccion segun DGI / ";
                   informacionTransacciones.mensajeAdicional = mensajeInformacionFaltante;
                   log.error("URU - Factura Electronica", mensajeInformacionFaltante);
                   errorGlobal = true;
                 }
               } else {
                 // No Hay Unidades Disponibles para Obtener Informacion Inicial
                 sinUnidades = true;
                 ultimoValorI = i;
               }
             } // FIN FOR
             // Inicio Verificar si quedaron Transacciones Sin Procesar
             if (sinUnidades == true) {
               //log.debug('Generacion CAE Lotes', 'Sin Unidades : ' + sinUnidades + ' Ultimo I : ' + ultimoValorI);
               if (ultimoValorI >= 0) {
                 for (var j = ultimoValorI; resultadoTransacciones != null && j < resultadoTransacciones.length; j++) {
                   var idTransaccionSinProcesar = resultadoTransacciones[j].getValue("internalid");
                   informacionTransacciones.idRegistrosSinProcesar = informacionTransacciones.idRegistrosSinProcesar + idTransaccionSinProcesar + ",";
                   //log.debug('Generacion CAE Lotes', 'J : ' + j + ' ID Transaccion Sin Procesar : ' + idTransaccionSinProcesar + ' Info : ' + informacionTransacciones.idRegistrosSinProcesar);
                 }
               }
             }
             // Fin Verificar Si quedaron Transacciones Sin Procesar
           } else {
             informacionTransacciones.error = true; // Hubo Error;
             informacionTransacciones.tipo = tipoMensajeError;
             informacionTransacciones.mensajeAdicional = "No se recibieron los ID de las Transacciones A Procesar luego de Parsear el Objeto recibido con la informacion de las Transacciones";
             log.error("URU - Factura Electronica", "No se recibieron los ID de las Transacciones A Procesar luego de Parsear el Objeto recibido con la informacion de las Transacciones");
           }
         } else {
           informacionTransacciones.error = true; // Hubo Error;
           informacionTransacciones.tipo = tipoMensajeError;
           informacionTransacciones.mensajeAdicional = "No se recibio Informacion de las Transacciones A Procesar luego de Parsear el Objeto recibido con la informacion de las Transacciones";
           log.error("URU - Factura Electronica", "No se recibio Informacion de las Transacciones A Procesar luego de Parsear el Objeto recibido con la informacion de las Transacciones");
         }
       } else {
         informacionTransacciones.error = true; // Hubo Error;
         informacionTransacciones.tipo = tipoMensajeError;
         informacionTransacciones.mensajeAdicional = "No se recibio Objeto con la Informacion de las Transacciones A Procesar";
         log.error("URU - Factura Electronica", "No se recibio Objeto con la Informacion de las Transacciones A Procesar");
       }
     } catch (excepcion) {
       informacionTransacciones.error = true; // Hubo Error;
       informacionTransacciones.tipo = tipoMensajeError;
       informacionTransacciones.mensajeAdicional = "Excepcion General Obteniendo la Informacion de las Transacciones recibidas para Procesar - Excepcion : " + excepcion.message;
       log.error("URU - Factura Electronica", "Excepcion General Obteniendo la Informacion de las Transacciones recibidas para Procesar - Excepcion : " + excepcion.message);
     }
     log.debug("URU - Factura Electronica", "Fin Obtencion Informacion Transaccion Lotes - Codigo Respuesta : " + informacionTransacciones.tipo);
     var respuestaTransacciones = JSON.stringify(informacionTransacciones);
     return respuestaTransacciones;
   }

   function savedSearchUtility(filtros, tipoRegistroSS, idSavedSearch) {
     var response = {
       error: false,
       mensaje: "",
       resultados: []
     };
     try {
       var searchSave = search.load({ type: tipoRegistroSS, id: idSavedSearch });

       for (var i = 0; i < filtros.length; i++) {
         searchSave.filters.push(filtros[i]);
       }

       var searchResults = searchSave.run();
       var completeResults = [];
       // resultIndex points to record starting current "resultado" in the entire results array
       var resultIndex = 0;
       var resultStep = 1000; // Number of records returned in one step (maximum is 1000)
       var resultado; // temporary variable used to store the result set
       do {
         // fetch one result set
         resultado = searchResults.getRange(resultIndex, resultIndex + resultStep);
         if (!l598isEmpty(resultado) && resultado.length > 0) {
           if (resultIndex == 0)
             completeResults = resultado; //Primera ve inicializa
           else
             completeResults = completeResults.concat(resultado);
         }
         // increase pointer
         resultIndex = resultIndex + resultStep;
         // Verifico si debo Encolar el Proceso
         //checkGovernance(1000);
         // once no records are returned we already got all of them
       } while (!l598isEmpty(resultado) && resultado.length > 0);
       response.resultados = completeResults;
       return response;
     } catch (error) {
       response.error = true;
       response.mensaje = "Error NetSuite Excepción - Detalles: " + error.message;
       log.error("savedSearchUtility", response.mensaje);
       return response;
     }
   }


   function formatDateDGI(fecha) {
     var fechaFormateada = "";
     try {
       if (!l598isEmpty(fecha)) {
         log.debug("formatDateDGI", "Fecha en string:" + fecha);
         var fechaFinal = format.parse({ value: fecha, type: format.Type.DATETIMETZ });
         log.debug("formatDateDGI", "Fecha parseada:" + fecha);
         var anio = fechaFinal.getFullYear();
         var mes = fechaFinal.getMonth() + 1;
         var dia = fechaFinal.getDate();
         if (!l598isEmpty(anio) && !l598isEmpty(mes) && !l598isEmpty(dia)) {
           fechaFormateada = anio.toString() + padding_left(mes.toString(), "0", 2) + padding_left(dia.toString(), "0", 2);
         }
       } else {
         log.debug("formatDateDGI", "Fecha Vacia.");
       }
     } catch (e) {
       log.error("formatDateDGI", "Exception formatDateDGI: " + e.message);
     }
     return fechaFormateada;
   }


   function factPagada(recId, ids) {
     var proceso = "factPagada";
     var response = {
       error: false,
       message: "",
       data: []
     };
     try {
       if (!l598isEmpty(ids)) {
         log.debug(proceso, "IDs: " + JSON.stringify(ids));
         var filtrosFinales = [];
         var iCont = 0;
         var tipoRegistroSS = "transaction";
         var idSavedSearch = "customsearch_l598_trans_ref_custpayment";
         filtrosFinales[iCont++] = search.createFilter({
           name: "internalid",
           operator: search.Operator.ANYOF,
           values: ids
         });
         filtrosFinales[iCont++] = search.createFilter({
           name: "applyingtransaction",
           operator: search.Operator.ANYOF,
           values: recId
         });
         var objResultSet = savedSearchUtility(filtrosFinales, tipoRegistroSS, idSavedSearch);
         // searchSavedPro('customsearch_3k_trans_referencias', filtros);
         log.debug(proceso, "resultados facturas pagadas: " + JSON.stringify(objResultSet));
         if (!objResultSet.error) {
           var resultSet = objResultSet.resultados;
           if ((!l598isEmpty(resultSet)) && (resultSet.length > 0)) {
             for (var i = 0; i < resultSet.length; i++) {
               var columns = resultSet[i].columns;
               var data = {};
               data.internalid = nvl(resultSet[i].getValue(columns[0]), "");
               data.tipoCFE = nvl(resultSet[i].getValue(columns[1]), "");
               data.serie = nvl(resultSet[i].getValue(columns[2]), "");
               data.numero = nvl(resultSet[i].getValue(columns[3]), "");
               data.fecha = formatDateDGI(resultSet[i].getValue(columns[4]));
               data.monto = parseFloat(resultSet[i].getValue(columns[5]), 10).toFixedOK(2);
						   data.moneda =  nvl(resultSet[i].getValue(columns[6]), "");
               data.tipocambio = nvl(resultSet[i].getValue(columns[7]), "");
               data.indicadorRefGlobal = 0;
               data.razon = "";
               response.data.push(data);
             }
           }
         } else {
           response.error = true;
           response.message = objResultSet.descripcion;
         }
       }
     } catch (e) {
       response.error = true;
       response.message = e.message;
       log.error("factPagadas", "Error NetSuite Excepcion factPagadas - Detalles: " + e.message);
     }
     return response;
   }


   function obtenerReferenciasPago(recordCP) {
     var proceso = "obtenerReferenciasPago";
     var response = {
       error: false,
       mensaje: "",
       data: []
     };
     try {
       var recId = recordCP.getValue("id");
       log.debug(proceso, "obtenerReferenciasPago / recId: " + recId);
       var applyQ = recordCP.getLineCount("apply");
       log.debug(proceso, "Cant Lineas apply: " + applyQ);
       if (applyQ > 0) {
         var appliedInvoices = [];
         for (var i = 0; i < applyQ; i++) {
           recordCP.selectLine("apply", i);
           var isApplied = recordCP.getCurrentSublistValue("apply", "apply");
           if (!l598isEmpty(isApplied) && (isApplied === true || isApplied == "T")) {
             appliedInvoices.push(recordCP.getCurrentSublistValue("apply", "internalid"));
           }
         }
         log.debug(proceso, "Facturas aplicadas al pago: " + JSON.stringify(appliedInvoices));
         if (appliedInvoices.length > 0) {
           // Comment: Devuelve las facturas a las que aplica el pago con sus importes de pago. 
           var respFactPag = factPagada(recId, appliedInvoices);
           log.debug(proceso, "Facturas aplicadas al pago - factPagada RESPONSE: " + JSON.stringify(respFactPag));
           if (!respFactPag.error && respFactPag.data.length > 0) {
             response.data = respFactPag.data;
           }
         } else {
           // Es Referencia Global
           var currentScript = runtime.getCurrentScript();
           var razonGlobal = currentScript.getParameter("custscript_l598_obt_inf_trans_fe_raz_so2");
           var data = {
             internalid: "",
             tipoCFE: 0,
             serie: "",
             numero: 0,
             fecha: "",
             monto: "",
             indicadorRefGlobal: 1,
             razon: razonGlobal,
           };


           log.debug(proceso, "Es Referencia Global: " + JSON.stringify(data));
           response.data.push(data);
         }
       } else {
         // Es Referencia Global
         var currentScript = runtime.getCurrentScript();
         var razonGlobal = currentScript.getParameter("custscript_l598_obt_inf_trans_fe_raz_so2");
         var data = {
           internalid: "",
           tipoCFE: 0,
           serie: "",
           numero: 0,
           fecha: "",
           monto: "",
           indicadorRefGlobal: 1,
           razon: razonGlobal,
         };


         log.debug(proceso, "Es Referencia Global y no existe aplicacion de deposito: " + JSON.stringify(data));
         response.data.push(data);
       }
     } catch (e) {
       response.error = true;
       response.mensaje = e.message;
     }
     return response;
   }

   function getPagosSublistas(sublistID, rec) {
     var arrayFormasPago = [];
     try {
       var identifier = "";
       var metodo = "";
       switch (sublistID) {
         case "recmachcustrecord_3k_cobranza_efec_payment_id":
           identifier = "efec";
           metodo = "Efectivo";
           break;
         case "recmachcustrecord_3k_cobranza_trn_payment_id":
           identifier = "trn";
           metodo = "Transferencia";
           break;
         case "recmachcustrecord_3k_cobranza_tarj_payment_id":
           identifier = "tarj";
           metodo = "Tarjeta";
           break;
         case "recmachcustrecord_3k_cobranza_chq_payment_id":
           identifier = "chq";
           metodo = "Cheque";
           break;
       }
       var sublistLength = rec.getLineItemCount(sublistID);
       for (var i = 0; !l598isEmpty(sublistLength) && i < sublistLength; i++) {
         var formaPago = rec.getLineItemText(sublistID, "custrecord_3k_cobranza_" + identifier + "_payment_meth", i);
         // var tipoCambio = round(parseFloat(rec.getLineItemValue(sublistID, 'custrecord_3k_cobranza_' + identifier + '_tc', i), 10) , 4);
         var moneda = rec.getLineItemText(sublistID, "custrecord_3k_cobranza_" + identifier + "_currency", i).toUpperCase();
         var obj = {};
         obj.codigo = i;
         obj.glosa = "Metodo de Pago: " + formaPago + " / Transaccion en moneda: " + moneda;
         obj.orden = i;
         obj.valor = parseFloat(rec.getLineItemValue(sublistID, "custrecord_3k_cobranza_" + identifier + "_amount", i), 10);
         arrayFormasPago.push(obj);
         /* var obj = {};
                   obj.pago = metodo;
                   obj.moneda = rec.getLineItemText(sublistID, 'custrecord_3k_cobranza_' + identifier + '_currency', i).toUpperCase();
                   obj.amount = parseFloat(rec.getLineItemValue(sublistID, 'custrecord_3k_cobranza_' + identifier + '_amount', i), 10);
                   obj.tipoCambio = round(parseFloat(rec.getLineItemValue(sublistID, 'custrecord_3k_cobranza_' + identifier + '_tc', i), 10) , 4);
                   obj.originAmount = parseFloat(rec.getLineItemValue(sublistID, 'custrecord_3k_cobranza_' + identifier + '_amount_orig', i), 10);
                   obj.formaPago = rec.getLineItemText(sublistID, 'custrecord_3k_cobranza_' + identifier + '_payment_meth', i);
                   obj.formaPagoID = rec.getLineItemValue(sublistID, 'custrecord_3k_cobranza_' + identifier + '_payment_meth', i);
                   arrayFormasPago.push(obj); */
       }
     } catch (e) {
       log.error("getPagosSublistas", "Netsuite Exception getPagosSublistas - detalles: " + e.message);
     }
     return arrayFormasPago;
   }

   function getMetodosPago(rec) {
     var response = { error: false, mensaje: "", data: [] };
     var sublistID = {
       efectivo: "recmachcustrecord_3k_cobranza_efec_payment_id",
       transferencia: "recmachcustrecord_3k_cobranza_trn_payment_id",
       tarjeta: "recmachcustrecord_3k_cobranza_tarj_payment_id",
       cheque: "recmachcustrecord_3k_cobranza_chq_payment_id"
     };
     try {

       var script = runtime.getCurrentScript();
       var formaPagoMultiple = script.getParameter({
         name: "custscript_l598_obt_inf_trans_fe_form_p2",
       });

       var formPagoLocal = rec.getFieldValue("custbody_3k_forma_pago_local");
       var formaPagoNetSuite = rec.getFieldValue("paymentmethod");
       log.debug("getMetodosPago", "formaPagoMultiple: " + formaPagoMultiple + " / formaPago: " + formPagoLocal + " / formaPagoNetSuite: " + formaPagoNetSuite);
       if (formPagoLocal && (formaPagoMultiple == formPagoLocal)) {
         // Get Metodos de Pago
         var arrayPagosEfectivo = getPagosSublistas(sublistID.efectivo, rec);
         log.debug("getMetodosPago", "arrayPagosEfectivo: " + JSON.stringify(arrayPagosEfectivo));
         var arrayPagosTransferencias = getPagosSublistas(sublistID.transferencia, rec);
         log.debug("getMetodosPago", "arrayPagosTransferencias: " + JSON.stringify(arrayPagosTransferencias));
         var arrayPagosTarjetas = getPagosSublistas(sublistID.tarjeta, rec);
         log.debug("getMetodosPago", "arrayPagosTarjetas: " + JSON.stringify(arrayPagosTarjetas));
         var arrayPagosCheque = getPagosSublistas(sublistID.cheque, rec);
         log.debug("getMetodosPago", "arrayPagosCheque: " + JSON.stringify(arrayPagosCheque));
         response.data = arrayPagosEfectivo.concat(arrayPagosTransferencias).concat(arrayPagosTarjetas).concat(arrayPagosCheque);
       } else {
         log.debug("getMetodosPago", "id metodo pago netsuite: " + formaPagoNetSuite);
         var obj = {};
         obj.codigo = formaPagoNetSuite || 1;
         obj.glosa = "Metodo de Pago: " + rec.getFieldText("paymentmethod") + " / Transaccion en moneda: " + rec.getFieldText("currency");
         obj.orden = obj.codigo;
         obj.valor = parseFloat(rec.getFieldValue("payment"), 10);
         /* obj.amount = parseFloat(rec.getFieldValue('payment'), 10);
                   obj.tipoCambio = round(parseFloat(rec.getFieldValue('exchangerate'), 10) , 4);
                   obj.originAmount = parseFloat(rec.getFieldValue('payment'), 10);
                   obj.formaPago = rec.getFieldText('paymentmethod');
                   obj.formaPagoID = rec.getFieldValue('paymentmethod'); */
         response.data.push(obj);
       }
     } catch (e) {
       response.error = true;
       response.mensaje = e.message;
       log.error("getMetodosPago", "Netsuite Exception: " + e.message);
     }
     return response;
   }


   function buscarInformacionFE(record_transaccion, resultadoIndividual, columns, tipoMensajeError, resultadoIndividualParte2, columnsParte2) {
     var idTransaccion = "";
     var objetoRespuesta;
     try {
       // Busco la informacion de la Transaccion
       var objGet = runtime.getCurrentScript();
       var paramEnviarEmailPDFCliente = objGet.getParameter({
         name: "custscript_l598_obt_inf_trans_fe_env_em2"
       });
       var errorEncontrado = false;
       var codigoError = "FMSJ-30";
       var mensajeError = "";
       idTransaccion = resultadoIndividual.getValue(columns[0]);
       var tipoTransaccion = resultadoIndividual.getValue(columns[3]) || "";
       var sucursal = resultadoIndividual.getValue(columns[5]) || "";
       var idTipoTransaccionURU = resultadoIndividual.getValue(columns[8]) || "";
       var serie = resultadoIndividual.getValue(columns[4]) || "";
       var esNotaDebitoNS = resultadoIndividual.getValue(columns[6]);
       var numeroTransaccion = resultadoIndividual.getValue(columns[0]);

       var nombreSucursalDGI = resultadoIndividualParte2.getValue(columnsParte2[58]);
       var codigoSucursalDGI = resultadoIndividualParte2.getValue(columnsParte2[59]);

       var esETicketNS = resultadoIndividualParte2.getValue(columnsParte2[64]);

       var esNotaDebito = false;
       if (!l598isEmpty(esNotaDebitoNS) && (esNotaDebitoNS == "T" || esNotaDebitoNS === true)) {
         esNotaDebito = true;
       }
       var esETicket = false;
       if (!l598isEmpty(esETicketNS) && (esETicketNS == "T" || esETicketNS === true)) {
         esETicket = true;
       }
       objetoRespuesta = {
         error: false,
         mensaje: "",
         tipo: "FMSJ-1",
         cantidadRegistros: 1,
         idRegistro: idTransaccion,
         tipoComprobanteNS: tipoTransaccion,
         tipoComprobanteURU: idTipoTransaccionURU,
         serie: serie,
         sucursal: sucursal,
         numero: numeroTransaccion,
         esND: esNotaDebito,
         esETicket: esETicket,
         tipoComprobanteMsg: nvl(resultadoIndividualParte2.getText(columnsParte2[45]), ""),
         nombreSucursalDGI: nvl(nombreSucursalDGI, ""),
         codigoSucursalDGI: nvl(codigoSucursalDGI, 0),
         informacionAdicional: {},
         informacionEncabezado: {},
         informacionCliente: {},
         informacionTotalesEncabezado: {},
         informacionAdenda: {},
         detalleLineas: [],
         detalleSubtotales: [],
         detalleDescyRecGlobal: [],
         detalleFormaPago: [],
         detalleReferencia: [],
         detalleTotalesPercyRet: [],
         informacionComplementoFiscal: {},
       };


       var metodosPago = "";
       if (tipoTransaccion == "customerpayment" || tipoTransaccion == "customerdeposit") {
         //Obtener Metodos de Pago
         metodosPago = getMetodosPago(record_transaccion);
         log.debug("getMetodosPago", "RESPONSE getMetodosPago: " + JSON.stringify(metodosPago));
         if (!metodosPago.error) {
           objetoRespuesta.detalleFormaPago = metodosPago.data;
         }
       }
       // Obtener Informacion Adenda
       objetoRespuesta.informacionAdenda.textoAdenda = nvl(resultadoIndividualParte2.getValue(columnsParte2[63]), "");
       objetoRespuesta.informacionAdenda.otroAdenda = "";
       // Obtener Fecha de la Transaccion
       var fechaTransaccion = nvl(resultadoIndividual.getValue(columns[1]), "");
       var entityid = record_transaccion.getValue("entity");
       var nc_vinculada = resultadoIndividualParte2.getValue(columnsParte2[65]);
       var entityIdResguardo = record_transaccion.getValue("custbody_l598_resguardo_proveedor");
       // var indicadorMontosBrutosUCFE = resultadoIndividualParte2.getValue(columnsParte2[66]);
       //INICIO - Manejo para extraer el tipo de integracion
       var subsidiariaAux = "";
       var codIntegracion = "";
       var infoCobranza = {};
       if (l598esOneworld()) {
         subsidiariaAux = record_transaccion.getValue("subsidiary");
         if (l598isEmpty(subsidiariaAux))
           subsidiariaAux = "";
       }
       var columnaConf = [];
       columnaConf[0] = search.createColumn({
         name: "custrecord_l598_tipo_integracion_codigo",
         join: "custrecord_l598_conf_factura_elec_integr"
       });
       columnaConf[1] = search.createColumn({
         name: "custrecord_l598_ind_fact_det_codigo",
         join: "custrecord_l598_conf_fe_indicador_fact"
       });
       columnaConf[2] = search.createColumn("custrecord_l598_conf_fe_concept_cobranza");
       columnaConf[3] = search.createColumn("custrecord_l598_conf_fe_concept_cob_anul");
       columnaConf[4] = search.createColumn("custrecord_l598_conf_fe_conc_dgi_dep_cli");
       columnaConf[5] = search.createColumn("custrecord_l598_conf_fe_conc_dgi_reem_cl");
       columnaConf[6] = search.createColumn("custrecord_l598_conf_fe_ind_fac_dep_reem");
       columnaConf[7] = search.createColumn({
         name: "custrecord_l598_ind_fact_det_codigo",
         join: "custrecord_l598_conf_fe_ind_fac_an_co_re"
       });
       var filtroConf = [];
       filtroConf.push({
         name: "isinactive",
         operator: "is",
         values: false
       });
       if (!l598isEmpty(subsidiariaAux)) {
         filtroConf[1] = search.createFilter({
           name: "custrecord_l598_conf_fe_subsidiaria",
           operator: search.Operator.IS,
           values: subsidiariaAux
         });
       }
       var resultadoConf = search.create({
         type: "customrecord_l598_conf_factura_elec",
         filters: filtroConf,
         columns: columnaConf
       }).run().getRange({
         start: 0,
         end: 1000
       });
       if (!l598isEmpty(resultadoConf) && resultadoConf.length > 0) {
         codIntegracion = resultadoConf[0].getValue({ name: "custrecord_l598_tipo_integracion_codigo", join: "custrecord_l598_conf_factura_elec_integr" });
         infoCobranza.idFacturacionCobranza = resultadoConf[0].getValue({ name: "custrecord_l598_ind_fact_det_codigo", join: "custrecord_l598_conf_fe_indicador_fact" }) || "";
         infoCobranza.conceptoFacturacionCobranza = resultadoConf[0].getValue("custrecord_l598_conf_fe_concept_cobranza") || "";
         infoCobranza.conceptoCobranzaAnulacion = resultadoConf[0].getValue("custrecord_l598_conf_fe_concept_cob_anul") || "";
         infoCobranza.conceptoDeposito = resultadoConf[0].getValue("custrecord_l598_conf_fe_conc_dgi_dep_cli") || "";
         infoCobranza.conceptoReembolso = resultadoConf[0].getValue("custrecord_l598_conf_fe_conc_dgi_reem_cl") || "";
         infoCobranza.idFacturacionDepositoReembolso = resultadoConf[0].getValue("custrecord_l598_conf_fe_ind_fac_dep_reem") || "";
         infoCobranza.idFactAnulacionReembolso = resultadoConf[0].getValue({ name: "custrecord_l598_ind_fact_det_codigo", join: "custrecord_l598_conf_fe_ind_fac_an_co_re" }) || "";
       }
       objetoRespuesta.codIntegracion = codIntegracion;
       //FIN - Manejo para extraer el tipo de integracion
       if (!l598isEmpty(fechaTransaccion)) {
         objetoRespuesta.fechaComprobante = fechaTransaccion; // Formato yyyyMMdd (Necesario para Ordenamiento)
         objetoRespuesta.informacionAdicional.documentoTipo = nvl(resultadoIndividual.getValue(columns[8]), "");
         objetoRespuesta.informacionAdicional.documentoSerie = nvl(resultadoIndividual.getValue(columns[4]), "");
         objetoRespuesta.informacionAdicional.documentoNro = nvl(resultadoIndividual.getValue(columns[0]), 0);
         objetoRespuesta.informacionAdicional.transaccionNro = objetoRespuesta.informacionAdicional.documentoNro;
         objetoRespuesta.informacionAdicional.cajaNro = nvl(resultadoIndividualParte2.getValue(columnsParte2[60]), 0);
         objetoRespuesta.informacionAdicional.cajeroNombre = nvl(resultadoIndividualParte2.getValue(columnsParte2[61]), "");
         objetoRespuesta.informacionAdicional.cajeroNro = nvl(resultadoIndividualParte2.getValue(columnsParte2[62]), 0);
         objetoRespuesta.informacionAdicional.sucursalNro = nvl(sucursal, 0);
         log.debug("obtenerInformacionFELotes", "paramEnviarEmailPDFCliente: " + paramEnviarEmailPDFCliente);
         objetoRespuesta.informacionAdicional.enviarEmailCliente = (!l598isEmpty(paramEnviarEmailPDFCliente) && (paramEnviarEmailPDFCliente === true || paramEnviarEmailPDFCliente == "T")) ? true : false;
         // INICIO - Obtener Informacion del Cliente
         if (!l598isEmpty(resultadoIndividualParte2.getValue(columnsParte2[65])) && !l598isEmpty(tipoTransaccion) && (tipoTransaccion == "customtransaction_l598_anul_resguardo") && !l598isEmpty(nc_vinculada)) {
           objetoRespuesta.informacionAdicional.clienteNumero = nvl(resultadoIndividual.getValue(columns[9]), 0);
           objetoRespuesta.informacionAdicional.clienteDocumento = nvl(resultadoIndividual.getValue(columns[10]), "");
           objetoRespuesta.informacionAdicional.clienteRazonSocial = nvl(resultadoIndividual.getValue(columns[11]), "");
           objetoRespuesta.informacionAdicional.clienteNombre = nvl(resultadoIndividual.getValue(columns[12]), "");
           objetoRespuesta.informacionAdicional.clienteDireccion = record_transaccion.getValue("billaddr1");
           objetoRespuesta.informacionAdicional.clientePais = search.lookupFields({
             type: search.Type.VENDOR_CREDIT,
             id: nc_vinculada,
             columns: ["billingaddress.country"]
           });
           log.debug("obtenerInfoTransaccion", "line 791 - country pais o cliente pais: " + JSON.stringify(objetoRespuesta.informacionAdicional.clientePais));
           objetoRespuesta.informacionAdicional.clientePais = getLookupFieldsSafe(objetoRespuesta.informacionAdicional.clientePais, "billingaddress.country");
         } else {
           if (tipoTransaccion == "customtransaction_l598_resguardos" && !l598isEmpty(entityIdResguardo)) {
             objetoRespuesta.informacionAdicional.clienteNumero = nvl(resultadoIndividual.getValue(columns[9]), 0);
             objetoRespuesta.informacionAdicional.clienteDocumento = nvl(resultadoIndividual.getValue(columns[10]), "");
             objetoRespuesta.informacionAdicional.clienteRazonSocial = nvl(resultadoIndividual.getValue(columns[11]), "");
             objetoRespuesta.informacionAdicional.clienteNombre = nvl(resultadoIndividual.getValue(columns[12]), "");
             objetoRespuesta.informacionAdicional.clienteDireccion = record_transaccion.getValue("custbody_l598_resguardo_direccion_prov");
             objetoRespuesta.informacionAdicional.clienteTelefono = nvl(resultadoIndividual.getValue(columns[14]), "");
             objetoRespuesta.informacionAdicional.clienteEmail = nvl(resultadoIndividual.getValue(columns[15]), "");
             objetoRespuesta.informacionAdicional.clientePais = nvl(resultadoIndividual.getValue(columns[16]), "");
           } else {
             objetoRespuesta.informacionAdicional.clienteNumero = nvl(resultadoIndividual.getValue(columns[9]), 0);
             objetoRespuesta.informacionAdicional.clienteDocumento = nvl(resultadoIndividual.getValue(columns[10]), "");
             objetoRespuesta.informacionAdicional.clienteRazonSocial = nvl(resultadoIndividual.getValue(columns[11]), "");
             objetoRespuesta.informacionAdicional.clienteNombre = nvl(resultadoIndividual.getValue(columns[12]), "");
             objetoRespuesta.informacionAdicional.clienteDireccion = nvl(resultadoIndividual.getValue(columns[13]), "");
             objetoRespuesta.informacionAdicional.clienteTelefono = nvl(resultadoIndividual.getValue(columns[14]), "");
             objetoRespuesta.informacionAdicional.clienteEmail = nvl(resultadoIndividual.getValue(columns[15]), "");
             objetoRespuesta.informacionAdicional.clientePais = nvl(resultadoIndividual.getValue(columns[16]), "");
           }
         }
         // FIN - Obtener Informacion del Cliente
         // INICIO - Obtener Informacion del Vendedor
         objetoRespuesta.informacionAdicional.vendedorNumero = nvl(resultadoIndividual.getValue(columns[17]), 0);
         objetoRespuesta.informacionAdicional.vendedorNombre = nvl(resultadoIndividual.getValue(columns[18]), "");
         // FIN - Obtener Informacion del Vendedor
         objetoRespuesta.informacionAdicional.valorUnidadIndexada = nvl(resultadoIndividual.getValue(columns[19]), 0);
         /* objetoRespuesta.informacionAdicional.idFacturacionCobranza = infoCobranza.idFacturacionCobranza;
                          objetoRespuesta.informacionAdicional.conceptoFacturacionCobranza = infoCobranza.conceptoFacturacionCobranza;
                          objetoRespuesta.informacionAdicional.conceptoFacturacionAnulacion = infoCobranza.conceptoFacturacionAnulacion; */
         // Se verifica si el nro de documento es entero
         var nroDocumentoAux = objetoRespuesta.informacionAdicional.clienteDocumento;
         var esNroDocValido = false;
         if (!l598isEmpty(nroDocumentoAux)) {
           esNroDocValido = validarSiNumero(nroDocumentoAux);
         }
         // INICIO - Obtener Informacion de Valor de Unidad Indexada
         // FIN NUEVO SE TOMA DE LA TRANSACCION
         /*if ((!l598isEmpty(objetoRespuesta.informacionAdicional.valorUnidadIndexada) && objetoRespuesta.informacionAdicional.valorUnidadIndexada != 0) || (tipoTransaccion=='customtransaction_l598_resguardos')) {*/
         // FIN - Obtener Informacion de Valor de Unidad Indexada
         // INICIO - INFORMACION DE ENCABEZADO
         objetoRespuesta.informacionEncabezado.tipoCFE = nvl(resultadoIndividual.getValue(columns[8]), "");
         objetoRespuesta.informacionEncabezado.fechaComprobante = nvl(fechaTransaccion, "");
         objetoRespuesta.informacionEncabezado.tipoTraslado = nvl(resultadoIndividual.getValue(columns[20]), "");
         objetoRespuesta.informacionEncabezado.periodoDesde = nvl(resultadoIndividual.getValue(columns[21]), "");
         objetoRespuesta.informacionEncabezado.periodoHasta = nvl(resultadoIndividual.getValue(columns[22]), "");
         objetoRespuesta.informacionEncabezado.indicadorMontosBrutos = nvl(resultadoIndividual.getValue(columns[23]), 0);
         // objetoRespuesta.informacionEncabezado.indicadorMontosBrutosUCFE = nvl(resultadoIndividualParte2.getValue(columnsParte2[66]), 1);
         objetoRespuesta.informacionEncabezado.indicadorMontosBrutosUCFE = "";

         objetoRespuesta.informacionEncabezado.indicadorCobranzaPropia = resultadoIndividualParte2.getValue(columnsParte2[68]);
         objetoRespuesta.informacionEncabezado.formaPago = nvl(resultadoIndividual.getValue(columns[24]), "");
         if (tipoTransaccion == "customtransaction_l598_resguardos") {
           objetoRespuesta.informacionEncabezado.formaPago = 0;
         }
         //if (!l598isEmpty(objetoRespuesta.informacionEncabezado.formaPago)) {
         objetoRespuesta.informacionEncabezado.fechaVencimiento = nvl(resultadoIndividual.getValue(columns[25]), "");
         var esComprobanteExportacion = false;
         var comprobanteExportacion = nvl(resultadoIndividual.getValue(columns[26]), "");
         if (!l598isEmpty(comprobanteExportacion) && (comprobanteExportacion == "T" || comprobanteExportacion === true)) {
           esComprobanteExportacion = true;
         }
         objetoRespuesta.informacionEncabezado.clausulaDeVenta = nvl(resultadoIndividual.getValue(columns[27]), "");
         objetoRespuesta.informacionEncabezado.modalidadDeVenta = nvl(resultadoIndividual.getValue(columns[28]), "");
         objetoRespuesta.informacionEncabezado.viaDeTransporte = nvl(resultadoIndividual.getValue(columns[29]), "");
         // FIN - INFORMACION DE ENCABEZADO
         // Inicialización de objeto de informacion cliente
         objetoRespuesta.informacionCliente.clienteTipoDocumento = "";
         objetoRespuesta.informacionCliente.clienteCodigoPais = "";
         objetoRespuesta.informacionCliente.clienteNumeroDoc = "";
         objetoRespuesta.informacionCliente.clienteNumeroDocUruguayo = "";
         objetoRespuesta.informacionCliente.clienteNumeroDocExtranjero = "";
         objetoRespuesta.informacionCliente.clienteNombre = "";
         objetoRespuesta.informacionCliente.clienteDireccion = "";
         objetoRespuesta.informacionCliente.clienteCiudad = "";
         objetoRespuesta.informacionCliente.clientePais = "";
         objetoRespuesta.informacionCliente.clienteProvincia = "";
         //objetoRespuesta.informacionCliente.clienteCodigoPostal = "";
         objetoRespuesta.informacionCliente.clienteLugarEntrega = "";
         objetoRespuesta.informacionCliente.clienteNroIdentificacionCompra = "";
         /* // Inicialización de objeto de información encabezado
                          objetoRespuesta.informacionEncabezado.clausulaDeVenta = '';
                          objetoRespuesta.informacionEncabezado.modalidadDeVenta = '';
                          objetoRespuesta.informacionEncabezado.viaDeTransporte = ''; */
         // INICIO - Obtener Informacion de datos fiscales para comprobantes de cuenta ajena

         var esCompCtaAjenaAux = resultadoIndividualParte2.getValue(columnsParte2[74]);
         var esComprobanteCuentaAjena = (!l598isEmpty(esCompCtaAjenaAux) && (esCompCtaAjenaAux === true || esCompCtaAjenaAux == "T")) ? true : false;
         objetoRespuesta.informacionComplementoFiscal.nroDocCuentaAjena = resultadoIndividualParte2.getValue(columnsParte2[70]);
         objetoRespuesta.informacionComplementoFiscal.razonSocialCtaAjena = resultadoIndividualParte2.getValue(columnsParte2[71]);
         objetoRespuesta.informacionComplementoFiscal.codTipoDocEmpCtaAjena = resultadoIndividualParte2.getValue(columnsParte2[72]);
         objetoRespuesta.informacionComplementoFiscal.codigoPaisEmpCtaAjena = resultadoIndividualParte2.getValue(columnsParte2[73]);
         // Validación de datos de transacción de cuenta ajena

         if (esComprobanteCuentaAjena == false || (esComprobanteCuentaAjena == true && !l598isEmpty(objetoRespuesta.informacionComplementoFiscal.nroDocCuentaAjena) && !l598isEmpty(objetoRespuesta.informacionComplementoFiscal.razonSocialCtaAjena) &&
           !l598isEmpty(objetoRespuesta.informacionComplementoFiscal.codTipoDocEmpCtaAjena) && !l598isEmpty(objetoRespuesta.informacionComplementoFiscal.codigoPaisEmpCtaAjena))) {
           var pasarNoSeProcesaCuentaAjenaSeDebeMigrarFuncionalidadReIngeneriaSolamente = true;
           if (pasarNoSeProcesaCuentaAjenaSeDebeMigrarFuncionalidadReIngeneriaSolamente) {
             if (esComprobanteExportacion != true || ((esComprobanteExportacion == true) && (!l598isEmpty(objetoRespuesta.informacionEncabezado.clausulaDeVenta) &&
               !l598isEmpty(objetoRespuesta.informacionEncabezado.modalidadDeVenta) && objetoRespuesta.informacionEncabezado.modalidadDeVenta != 0 && !l598isEmpty(objetoRespuesta.informacionEncabezado.viaDeTransporte) && objetoRespuesta.informacionEncabezado.viaDeTransporte != 0))) {
               // INICIO - Informacion RECEPTOR
               // if (!l598isEmpty(resultadoIndividualParte2.getValue(columnsParte2[65])) && !l598isEmpty(tipoTransaccion) && (tipoTransaccion=='customtransaction_l598_anul_resguardo') && !l598isEmpty(resultadoIndividualParte2.getValue(columnsParte2[66]))){
               if (!l598isEmpty(resultadoIndividualParte2.getValue(columnsParte2[65])) && !l598isEmpty(tipoTransaccion) && (tipoTransaccion == "customtransaction_l598_anul_resguardo")) {
                 var idClienteTipoDocumento = search.lookupFields({
                   type: search.Type.ENTITY,
                   id: entityid,
                   columns: ["custentity_l598_tipo_documento"]
                 });
                 log.debug("obtenerInfoTransaccion", "line 901 - idClienteTipoDocumento: " + JSON.stringify(idClienteTipoDocumento));
                 idClienteTipoDocumento = getLookupFieldsSafe(idClienteTipoDocumento, "custentity_l598_tipo_documento");

                 if (!l598isEmpty(idClienteTipoDocumento)) {
                   objetoRespuesta.informacionCliente.clienteTipoDocumento = search.lookupFields({
                     type: "customrecord_l598_tipos_documentos",
                     id: idClienteTipoDocumento,
                     columns: ["custrecord_l598_tipos_documentos_codigo"]
                   });
                 }
                 log.debug("obtenerInfoTransaccion", "line 911 - objetoRespuesta.informacionCliente.clienteTipoDocumento: " + JSON.stringify(objetoRespuesta.informacionCliente.clienteTipoDocumento));
                 objetoRespuesta.informacionCliente.clienteTipoDocumento = getLookupFieldsSafe(objetoRespuesta.informacionCliente.clienteTipoDocumento, "custrecord_l598_tipos_documentos_codigo");


               } else {
                 /*if (esETicket==true && clienteTipoDocumentoAux == 2)
                                                {
                                                    objetoRespuesta.informacionCliente.clienteTipoDocumento = '';
                                                }
                                                else
                                                {
                                                    objetoRespuesta.informacionCliente.clienteTipoDocumento = nvl(resultadoIndividual.getValue(columns[30]), '');
                                                }*/
                 objetoRespuesta.informacionCliente.clienteTipoDocumento = nvl(resultadoIndividual.getValue(columns[30]), "");
               }
               if ((esETicket == true) || (esETicket == false && !l598isEmpty(objetoRespuesta.informacionCliente.clienteTipoDocumento))) {
                 objetoRespuesta.informacionCliente.clienteCodigoPais = nvl(resultadoIndividual.getValue(columns[31]), "");
                 if ((esETicket == true) || !l598isEmpty(objetoRespuesta.informacionCliente.clienteCodigoPais) || tipoTransaccion == "customtransaction_l598_resguardos" || codIntegracion == "SIGE") {
                   objetoRespuesta.informacionCliente.clienteNumeroDoc = nvl(resultadoIndividual.getValue(columns[32]), "");
                   objetoRespuesta.informacionCliente.clienteNumeroDocUruguayo = "";
                   objetoRespuesta.informacionCliente.clienteNumeroDocExtranjero = "";
                   if ((objetoRespuesta.informacionCliente.clienteTipoDocumento == 2 || objetoRespuesta.informacionCliente.clienteTipoDocumento == 3 || objetoRespuesta.informacionCliente.clienteTipoDocumento == 4)) {
                    if (objetoRespuesta.informacionCliente.clienteTipoDocumento == 4) {
                      objetoRespuesta.informacionCliente.clienteNumeroDocExtranjero = objetoRespuesta.informacionCliente.clienteNumeroDoc;
                      objetoRespuesta.informacionCliente.clienteNumeroDocUruguayo = objetoRespuesta.informacionCliente.clienteNumeroDoc; 
                    }
                    if (objetoRespuesta.informacionCliente.clienteTipoDocumento != 4) {
                      if (esNroDocValido) {
                        objetoRespuesta.informacionCliente.clienteNumeroDocUruguayo = objetoRespuesta.informacionCliente.clienteNumeroDoc;
                      } else {
                        // Error en el Nro de Documento
                        var mensaje = "El numero de documento del cliente en la transaccion contiene caracteres no numericos - ID Transaccion :	" + idTransaccion;
                        //objetoRespuesta.error = true;
                        objetoRespuesta.tipo = tipoMensajeError;
                        objetoRespuesta.mensaje = mensaje;
                        log.error("URU - Factura Electronica", mensaje);
                      }
                    }
                     
                   } else {
                       objetoRespuesta.informacionCliente.clienteNumeroDocExtranjero = objetoRespuesta.informacionCliente.clienteNumeroDoc;
                   }
                   if (!l598isEmpty(resultadoIndividualParte2.getValue(columnsParte2[65])) && !l598isEmpty(tipoTransaccion) && (tipoTransaccion == "customtransaction_l598_anul_resguardo") && !l598isEmpty(entityid)) {
                     objetoRespuesta.informacionCliente.clienteNombre = nvl(resultadoIndividual.getValue(columns[33]), "");
                     objetoRespuesta.informacionCliente.clienteDireccion = record_transaccion.getValue("billaddr1");
                     objetoRespuesta.informacionCliente.clienteCiudad = search.lookupFields({
                       type: search.Type.VENDOR_CREDIT,
                       id: nc_vinculada,
                       columns: ["billingaddress.city"]
                     });

                     log.debug("obtenerInfo", "LINE 951 - clienteCiudad: " + JSON.stringify(objetoRespuesta.informacionCliente.clienteCiudad));
                     objetoRespuesta.informacionCliente.clienteCiudad = getLookupFieldsSafe(objetoRespuesta.informacionCliente.clienteCiudad, "billingaddress.city");

                     objetoRespuesta.informacionCliente.clientePais = search.lookupFields({
                       type: search.Type.VENDOR_CREDIT,
                       id: nc_vinculada,
                       columns: ["billingaddress.country"]
                     });

                     log.debug("obtenerInfo", "LINE 965 - clientePais: " + JSON.stringify(objetoRespuesta.informacionCliente.clientePais));
                     objetoRespuesta.informacionCliente.clientePais = getLookupFieldsSafe(objetoRespuesta.informacionCliente.clientePais, "billingaddress.country");

                     objetoRespuesta.informacionCliente.clienteCodigoPostal = search.lookupFields({
                       type: search.Type.VENDOR_CREDIT,
                       id: nc_vinculada,
                       columns: ["billingaddress.zip"]
                     });

                     log.debug("obtenerInfo", "LINE 973 - clienteCodigoPostal: " + JSON.stringify(objetoRespuesta.informacionCliente.clienteCodigoPostal));
                     objetoRespuesta.informacionCliente.clienteCodigoPostal = getLookupFieldsSafe(objetoRespuesta.informacionCliente.clienteCodigoPostal, "billingaddress.zip");
                   } else {
                     if (tipoTransaccion == "customtransaction_l598_resguardos" && !l598isEmpty(entityIdResguardo)) {
                       objetoRespuesta.informacionCliente.clienteNombre = nvl(resultadoIndividual.getValue(columns[33]), "");
                       objetoRespuesta.informacionCliente.clienteDireccion = record_transaccion.getValue("custbody_l598_resguardo_direccion_prov");
                       objetoRespuesta.informacionCliente.clienteCiudad = record_transaccion.getValue("custbody_l598_resguardo_ciudad");
                       objetoRespuesta.informacionCliente.clientePais = record_transaccion.getValue("custbody_l598_resguardo_pais");
                       objetoRespuesta.informacionCliente.clienteCodigoPostal = record_transaccion.getValue("custbody_l598_resguardo_cod_postal");
                     } else {
                       objetoRespuesta.informacionCliente.clienteNombre = nvl(resultadoIndividual.getValue(columns[33]), "");
                       objetoRespuesta.informacionCliente.clienteDireccion = nvl(resultadoIndividual.getValue(columns[34]), "");
                       objetoRespuesta.informacionCliente.clienteCiudad = nvl(resultadoIndividual.getValue(columns[35]), "");
                       objetoRespuesta.informacionCliente.clientePais = nvl(resultadoIndividualParte2.getValue(columnsParte2[37]), "");
                       objetoRespuesta.informacionCliente.clienteCodigoPostal = nvl(resultadoIndividualParte2.getValue(columnsParte2[38]), "0");

                       if (tipoTransaccion == "customerpayment" || tipoTransaccion == "customerdeposit" || tipoTransaccion == "customerrefund") {
                         // Handle Customer Payments
                         objetoRespuesta.informacionCliente.clienteDireccion = nvl(resultadoIndividualParte2.getValue(columnsParte2[78]), "");
                         objetoRespuesta.informacionCliente.clienteCiudad = nvl(resultadoIndividualParte2.getValue(columnsParte2[75]), "");
                         objetoRespuesta.informacionCliente.clienteProvincia = nvl(resultadoIndividualParte2.getValue(columnsParte2[75]), "");
                         objetoRespuesta.informacionCliente.clientePais = nvl(resultadoIndividualParte2.getValue(columnsParte2[79]), "");
                         objetoRespuesta.informacionCliente.clienteCodigoPostal = nvl(resultadoIndividualParte2.getValue(columnsParte2[77]), "");
                       }
                       if (tipoTransaccion == "customtransaction_l598_anulacion_cobranz") {
                         // Handle Customer Payments Anulacion
                         objetoRespuesta.informacionCliente.clienteDireccion = nvl(resultadoIndividualParte2.getValue(columnsParte2[83]), "");
                         objetoRespuesta.informacionCliente.clienteCiudad = nvl(resultadoIndividualParte2.getValue(columnsParte2[80]), "");
                         objetoRespuesta.informacionCliente.clienteProvincia = nvl(resultadoIndividualParte2.getValue(columnsParte2[80]), "");
                         objetoRespuesta.informacionCliente.clientePais = nvl(resultadoIndividualParte2.getValue(columnsParte2[84]), "");
                         objetoRespuesta.informacionCliente.clienteCodigoPostal = nvl(resultadoIndividualParte2.getValue(columnsParte2[82]), "");
                       }
                     }
                   }
                   /*if (esETicket==true)
                                                    {
                                                        objetoRespuesta.informacionCliente.clienteNombre = '';
                                                    }*/
                   if (!l598isEmpty(objetoRespuesta.informacionCliente.clienteCodigoPostal).toString()) {
                     var clienteCodigoPostal = (objetoRespuesta.informacionCliente.clienteCodigoPostal).toString();
                     var clienteCodigoPostalAUX = "";
                     var expRegNumeros = /[^0-9]/gi;
                     clienteCodigoPostalAUX = clienteCodigoPostal.replace(expRegNumeros, "").toString();
                     if (clienteCodigoPostalAUX.length > 5) {
                       clienteCodigoPostalAUX = "0";
                       objetoRespuesta.informacionCliente.clienteCodigoPostal = clienteCodigoPostalAUX;
                     } else {
                       objetoRespuesta.informacionCliente.clienteCodigoPostal = clienteCodigoPostalAUX;
                     }
                   } else {
                     objetoRespuesta.informacionCliente.clienteCodigoPostal = "0";
                   }

                   if (tipoTransaccion != "customerpayment" && tipoTransaccion != "customerdeposit" && tipoTransaccion != "customerrefund" && tipoTransaccion != "customtransaction_l598_anulacion_cobranz") {
                     objetoRespuesta.informacionCliente.clienteProvincia = nvl(resultadoIndividual.getValue(columns[36]), "");
                   }

                   objetoRespuesta.informacionCliente.clienteLugarEntrega = nvl(resultadoIndividualParte2.getValue(columnsParte2[39]), "");
                   objetoRespuesta.informacionCliente.clienteNroIdentificacionCompra = nvl(resultadoIndividualParte2.getValue(columnsParte2[40]), "");

                   if ((tipoTransaccion == "customerpayment" || tipoTransaccion == "customerdeposit" || tipoTransaccion == "customerrefund") && l598isEmpty(objetoRespuesta.informacionCliente.clienteProvincia)) {
                     objetoRespuesta.informacionCliente.clienteProvincia = nvl(resultadoIndividualParte2.getValue(columnsParte2[75]), "");
                   }
                   // FIN - Informacion RECEPTOR
                   if (((esETicket == true) || (esETicket == false && (!l598isEmpty(objetoRespuesta.informacionCliente.clienteNombre) && !l598isEmpty(objetoRespuesta.informacionCliente.clienteDireccion) &&
                     !l598isEmpty(objetoRespuesta.informacionCliente.clienteCiudad)))) && (esComprobanteExportacion == false ||
                       ((esComprobanteExportacion == true) && (!l598isEmpty(objetoRespuesta.informacionCliente.clienteProvincia) &&
                         !l598isEmpty(objetoRespuesta.informacionCliente.clientePais))))) {
                     // INICIO - Totales Encabecado
                     objetoRespuesta.informacionTotalesEncabezado.cantidadLineas = 0;
                     objetoRespuesta.informacionTotalesEncabezado.monedaTransaccion = nvl(resultadoIndividualParte2.getValue(columnsParte2[41]), "");
                     /*if (!l598isEmpty(objetoRespuesta.informacionTotalesEncabezado.monedaTransaccion)) {
                                                              codigoMonedaTransaccion = nlapiLookupField('currency', objetoRespuesta.informacionTotalesEncabezado.monedaTransaccion, 'symbol');
                                                          }*/
                     var codigoMonedaTransaccion;
                     if (!l598isEmpty(objetoRespuesta.informacionTotalesEncabezado.monedaTransaccion)) {
                       if (isNaN(objetoRespuesta.informacionTotalesEncabezado.monedaTransaccion)) {
                         codigoMonedaTransaccion = objetoRespuesta.informacionTotalesEncabezado.monedaTransaccion;
                       } else {
                         codigoMonedaTransaccion = search.lookupFields({
                           type: search.Type.CURRENCY,
                           id: objetoRespuesta.informacionTotalesEncabezado.monedaTransaccion,
                           columns: ["symbol"]
                         });
                         codigoMonedaTransaccion = getLookupFieldsSafe(codigoMonedaTransaccion, "symbol");
                       }
                     }
                     if (!l598isEmpty(codigoMonedaTransaccion)) {

                       objetoRespuesta.informacionTotalesEncabezado.codigoMonedaTransaccion = !l598isEmpty(codigoMonedaTransaccion.symbol) ? codigoMonedaTransaccion.symbol : codigoMonedaTransaccion;
                       // Obtener Tipo de Cambio
                       objetoRespuesta.informacionTotalesEncabezado.tipoCambio = nvl(resultadoIndividualParte2.getValue(columnsParte2[42]), "");
                       if (!l598isEmpty(objetoRespuesta.informacionTotalesEncabezado.tipoCambio) && !isNaN(objetoRespuesta.informacionTotalesEncabezado.tipoCambio)) {
                         // Obtener Porcentaje Tasa Minima y Tasa Basica
                         var tasaMinimaIVA = nvl(resultadoIndividualParte2.getValue(columnsParte2[43]), 0);
                         var tasaBasicaIVA = nvl(resultadoIndividualParte2.getValue(columnsParte2[44]), 0);
                         if (!l598isEmpty(tasaMinimaIVA) && !l598isEmpty(tasaBasicaIVA)) {
                           var total = record_transaccion.getValue("total");
                           var subTotal = record_transaccion.getValue("subtotal");
                           var importeImpuestos = record_transaccion.getValue("taxtotal");
                           //var tipoCambio = obtenerValorCampo(record_transaccion.getValue('exchangerate'));
                           //var tipoCambio = parseFloat(objetoRespuesta.informacionTotalesEncabezado.tipoCambio,10);
                           var descuentoTotal = obtenerValorCampo(record_transaccion.getValue("discounttotal"));
                           if (l598isEmpty(descuentoTotal) || isNaN(descuentoTotal)) {
                             descuentoTotal = 0;
                           }
                           var porcentajeDescuento = obtenerValorCampo(record_transaccion.getValue("discountrate"));
                           /*if (total != null && subTotal != null && importeImpuestos != null) {*/
                           importeImpuestos = 0;
                           var importeNoGravado = 0;
                           var importeRetenciones = 0;
                           var importePercepciones = 0;
                           var importeExento = 0;
                           var importeExpYAsimiladas = 0;
                           var importeNoFacturable = 0;
                           var importeIVASuspenso = 0;
                           var importeIVATasaMinima = 0;
                           var importeIVATasaBasica = 0;
                           var importeIVAOtraTasa = 0;
                           var importeNetoGravadoIVASuspenso = 0;
                           var importeNetoGravadoTasaMinima = 0;
                           var importeNetoGravadoTasaBasica = 0;
                           var importeNetoGravadoOtraTasa = 0;
                           var importeRetenidoPercibido = 0;
                           var importeCreditosFiscales = 0;
                           var infoPercepcionyRetencion = null;
                           /*var factorDescuento = 1;
                                                                                         if (descuentoTotal != null && !l598isEmpty(descuentoTotal) && !isNaN(descuentoTotal) && parseFloat(descuentoTotal, 10) < 0) {
                                                                                         factorDescuento = parseFloat((parseFloat(1, 10) - (parseFloat(Math.abs(descuentoTotal), 10) / parseFloat(Math.abs(subTotal)))), 10);
                                                                                         }*/
                           // INICIO INFORMACION DESCUENTO/RECARGO GLOBAL
                           var importeDescuento = parseFloat((parseFloat(Math.abs(descuentoTotal), 10)), 10);
                           var infoDescRecGlobal;
                           if (!l598isEmpty(importeDescuento) && !isNaN(importeDescuento) && parseFloat(importeDescuento, 10) > 0) {
                             infoDescRecGlobal = {
                               valor: parseFloat(importeDescuento, 10).toFixedOK(2),
                               tipoMovimiento: nvl(resultadoIndividualParte2.getValue(columnsParte2[51]), ""),
                               tipoDescRec: nvl(resultadoIndividualParte2.getValue(columnsParte2[52]), ""),
                               codigo: nvl(resultadoIndividualParte2.getValue(columnsParte2[53]), ""),
                               glosa: nvl(resultadoIndividualParte2.getValue(columnsParte2[54]), ""),
                               indicadorFacturacion: nvl(resultadoIndividualParte2.getValue(columnsParte2[55]), ""),
                             };


                             log.debug("LINE 1324", "infoDescRecGlobal: " + JSON.stringify(infoDescRecGlobal));
                             var columnaAcumIndFacturacionDescRec = nvl(resultadoIndividualParte2.getValue(columnsParte2[56]), "");
                             log.debug("LINE 1326", "columnaAcumIndFacturacionDescRec: " + columnaAcumIndFacturacionDescRec);
                             if (!l598isEmpty(columnaAcumIndFacturacionDescRec)) {
                               var porcentajeParaAplicar = "";
                               log.debug("LINE 1105", "LINE 1105 - porcentajeDescuento: " + porcentajeDescuento);
                               if (!l598isEmpty(porcentajeDescuento) && porcentajeDescuento.length > 0 && porcentajeDescuento.toString().indexOf("%") != -1)
                                 porcentajeParaAplicar = porcentajeDescuento.substring(0, porcentajeDescuento.length - 1);
                               log.debug("LINE 1326", "porcentajeParaAplicar: " + porcentajeParaAplicar);
                               if (!l598isEmpty(porcentajeParaAplicar) && !isNaN(parseFloat(porcentajeParaAplicar, 10)) && parseFloat(porcentajeParaAplicar, 10) != 0.00) {
                                 var porcentajeParaAplicarDecimal = Math.abs(parseFloat(porcentajeParaAplicar, 10) / 100);
                                 log.debug("LINE 1336", "porcentajeParaAplicarDecimal: " + porcentajeParaAplicarDecimal);
                                 if (!l598isEmpty(porcentajeParaAplicarDecimal)) {
                                   switch (parseInt(columnaAcumIndFacturacionDescRec, 10)) {
                                     case 1:
                                       // Extento IVA
                                       //abrito 28-05-2019. Nota: Se comenta ya que cuando es un descuento por porcentaje Netsuite se encarga de hacer los calculos y de aplicar el descuento como un monto, por lo cual no es necesario lo que esta abajo
                                       //importeExento = parseFloat((parseFloat(importeExento, 10) + parseFloat((descuentoTotal), 10)), 10);
                                       break;
                                     case 2:
                                       // IVA TASA Minima
                                       //abrito 16-06-2018. Nota: Se comenta ya que cuando es un descuento por porcentaje Netsuite se encarga de hacer los calculos y de aplicar el descuento como un monto, por lo cual no es necesario lo que esta abajo
                                       /*importeIVATasaMinima = parseFloat(parseFloat(importeIVATasaMinima, 10) + parseFloat(descuentoTotal * porcentajeParaAplicarDecimal), 10);
                                                                                                                    importeNetoGravadoTasaMinima = parseFloat((parseFloat(importeNetoGravadoTasaMinima, 10) + parseFloat((descuentoTotal), 10)), 10);*/
                                       break;
                                     case 3:
                                       // IVA TASA Basica
                                       //abrito 16-06-2018. Nota: Se comenta ya que cuando es un descuento por porcentaje Netsuite se encarga de hacer los calculos y de aplicar el descuento como un monto, por lo cual no es necesario lo que esta abajo
                                       /*importeIVATasaBasica = parseFloat(parseFloat(importeIVATasaBasica, 10) + parseFloat(descuentoTotal * porcentajeParaAplicarDecimal), 10);
                                                                                                                    importeNetoGravadoTasaBasica = parseFloat((parseFloat(importeNetoGravadoTasaBasica, 10) + parseFloat((descuentoTotal), 10)), 10);*/
                                       break;
                                     case 4:
                                       // Otra Tasa
                                       //abrito 28-05-2019. Nota: Se comenta ya que cuando es un descuento por porcentaje Netsuite se encarga de hacer los calculos y de aplicar el descuento como un monto, por lo cual no es necesario lo que esta abajo
                                       //importeIVAOtraTasa = parseFloat(parseFloat(importeIVAOtraTasa, 10) + parseFloat(descuentoTotal * porcentajeParaAplicarDecimal), 10);
                                       //importeNetoGravadoOtraTasa = parseFloat((parseFloat(importeNetoGravadoOtraTasa, 10) + parseFloat((descuentoTotal), 10)), 10);
                                       break;
                                     case 5:
                                       // Entrega Gratuita
                                       break;
                                     case 6:
                                       // No Facturable
                                       //importeNoFacturable = parseFloat(parseFloat(importeNoFacturable, 10) + parseFloat(descuentoTotal), 10);
                                       break;
                                     case 7:
                                       // No Facturable Negativo
                                       //importeNoFacturable = parseFloat((parseFloat(importeNoFacturable, 10) + parseFloat((descuentoTotal), 10)*-1), 10);
                                       break;
                                     case 8:
                                       // Item A Rebajar en Remito
                                       break;
                                     case 9:
                                       // Item A Rebajar en Resguardo
                                       break;
                                     case 10:
                                       // Exportacion Y Asimiladas
                                       //abrito 28-05-2019. Nota: Se comenta ya que cuando es un descuento por porcentaje Netsuite se encarga de hacer los calculos y de aplicar el descuento como un monto, por lo cual no es necesario lo que esta abajo
                                       //importeExpYAsimiladas = parseFloat((parseFloat(importeExpYAsimiladas, 10) + parseFloat((descuentoTotal), 10)), 10);
                                       break;
                                     case 11:
                                       // Impuesto Percibido
                                       //importePercepciones = parseFloat((parseFloat(importePercepciones, 10) + parseFloat(parseFloat((descuentoTotal), 10), 10)), 10);
                                       break;
                                     case 12:
                                       // IVA en Suspenso
                                       importeNetoGravadoIVASuspenso = parseFloat((parseFloat(importeNetoGravadoIVASuspenso, 10) + parseFloat((descuentoTotal), 10)), 10);
                                       break;
                                     default:
                                       // Columna de Acumulacion Invalida
                                       errorEncontrado = true;
                                       mensajeError = "La Columna de Acumulacion del Indicador de Facturacion del Descuento/Recargo con Codigo : " + infoDescRecGlobal.indicadorFacturacion + " es Invalida";
                                       mensajeError = mensajeError + " - ID Transaccion : " + idTransaccion;
                                   }
                                 }
                               }
                               if (errorEncontrado != true) {
                                 if (!l598isEmpty(infoDescRecGlobal.tipoMovimiento) && !l598isEmpty(infoDescRecGlobal.tipoDescRec) &&
                                   !l598isEmpty(infoDescRecGlobal.glosa) && !l598isEmpty(infoDescRecGlobal.indicadorFacturacion)) {
                                   objetoRespuesta.detalleDescyRecGlobal.push(infoDescRecGlobal);
                                 } else {
                                   errorEncontrado = true;
                                   mensajeError = "Falta la Siguiente Informacion Requerida del Descuento/Recargo Global : ";
                                   if (l598isEmpty(infoDescRecGlobal.tipoMovimiento))
                                     mensajeError = mensajeError + "Tipo de Movimiento / ";
                                   if (l598isEmpty(infoDescRecGlobal.tipoDescRec))
                                     mensajeError = mensajeError + "Tipo de Descuento/Recargo / ";
                                   if (l598isEmpty(infoDescRecGlobal.glosa))
                                     mensajeError = mensajeError + "Descripcion / ";
                                   if (l598isEmpty(infoDescRecGlobal.indicadorFacturacion))
                                     mensajeError = mensajeError + "Indicador de Facturacion / ";
                                   mensajeError = mensajeError + " - ID Transaccion : " + idTransaccion;
                                 }
                               }
                             } else {
                               errorEncontrado = true;
                               mensajeError = "Falta configurar la Columna de Acumulacion del Indicador de Facturacion del Descuento/Recargo";
                               mensajeError = mensajeError + " - ID Transaccion : " + idTransaccion;
                             }
                           }
                           // FIN INFORMACION DESCUENTO/RECARGO GLOBAL
                           var cantidadLineas = 0;
                           // INICIO - Obtener Codigos de Impuestos de la Subsidiaria
                           // Obtengo la subsidiaria
                           var subsidiaria = "";
                           if (l598esOneworld()) {
                             subsidiaria = record_transaccion.getValue("subsidiary");
                             if (l598isEmpty(subsidiaria))
                               subsidiaria = "";
                           }
                           // INICIO - CONSIDERAR LINEAS DE TIEMPO/GASTOS
                           var tipoSublistas = [];
                           tipoSublistas.push("item");
                           tipoSublistas.push("itemcost");
                           tipoSublistas.push("expcost");
                           tipoSublistas.push("time");
                           var cantidadLineasAProcesar = 0;
                           for (var countSubLists = 0; countSubLists < tipoSublistas.length; countSubLists++) {
                             var cantidadLineasAux = record_transaccion.getLineCount(tipoSublistas[countSubLists]);

                             if(tipoSublistas[countSubLists]=='time' && cantidadLineasAux > 0){
                              var linesTime = 0;
                              for(var i=0 ; i<=cantidadLineasAux ; i++){
                                var aplicar = getSublistValue(tipoSublistas[countSubLists], 'apply',i);
                                if (aplicar=='T' || aplicar==true){
                                  linesTime++;
                                }
                              }

                              cantidadLineasAux = linesTime;
                            } 

                             if (!l598isEmpty(cantidadLineasAux) && cantidadLineasAux > 0) {
                               cantidadLineasAProcesar += cantidadLineasAux;
                             }
                           }
                           if ((esETicket && cantidadLineasAProcesar <= 700) || (!esETicket && cantidadLineasAProcesar <= 250)) {
                             var porcentajeImpuestoTasaMinima;
                             var porcentajeImpuestoTasaBasica;
                             var articuloCodUnidadMedida;
                             var k;
                             var esPercepcionRetCred = false;
                             var indicadorFacturacion;
                             for (var subListaContador = 0; subListaContador < tipoSublistas.length && errorEncontrado == false; subListaContador++) {
                               var tipoSublistaConsultar = tipoSublistas[subListaContador];
                               //log.debug('LINE 1432', 'tipoSublista : '+tipoSublistaConsultar);
                               // Recorro Sublista
                               var cantidadLineasArticulos = record_transaccion.getLineCount(tipoSublistaConsultar);
                               //log.debug('LINE 1436', 'Cantidad : '+cantidadLineasArticulos);
                               for (k = 0; k < cantidadLineasArticulos && errorEncontrado == false; k++) {
                                 var aplicar = record_transaccion.getSublistValue(tipoSublistaConsultar, "apply", k);
                                 //log.debug('LINE 1439', 'tipoSublista : '+tipoSublistaConsultar + ' - Aplicar : ' + aplicar);
                                 if (tipoSublistaConsultar == "item" || aplicar == "T" || aplicar === true) {
                                   var URUesRetencion = record_transaccion.getSublistValue(tipoSublistaConsultar, "custcol_l598_es_retencion", k);
                                   var isVoided = record_transaccion.getValue("custbody_l598_transaccion_anulada");
                                   if (((URUesRetencion == "T" || URUesRetencion === true) && (tipoTransaccion == "vendorcredit" || tipoTransaccion == "customtransaction_l598_anul_resguardo")) || (tipoTransaccion != "vendorcredit")) {
                                     var esNoGravado = false;

                                     var esIVAExento = false;
                                     var tipoPercepcion = "";
                                     var esCreditoFiscal = false;
                                     var contienePercepcion = false;
                                     var contieneRetencion = false;
                                     var infoPercepcion = null;
                                    //  var transImpImpuesto = record_transaccion.getSublistValue(tipoSublistaConsultar, "tax1amt", k);
                                     var transImpImpuesto = record_transaccion.getSublistValue(tipoSublistaConsultar, "taxamount", k);
                                     var transImporte = parseFloat(record_transaccion.getSublistValue(tipoSublistaConsultar, "amount", k), 10);
                                    //  var transCodImpuesto = record_transaccion.getSublistValue(tipoSublistaConsultar, "taxcode", k);
                                     var transCodImpuesto = record_transaccion.getSublistValue(tipoSublistaConsultar, "custcol_l598_codigo_impuesto", k);
                                     var tipoItem = record_transaccion.getSublistValue(tipoSublistaConsultar, "itemtype", k);
                                     //var precioUnitario = record_transaccion.getSublistValue('item', 'rate', k);
                                     var cantidad = record_transaccion.getSublistValue(tipoSublistaConsultar, "quantity", k);
                                     if (tipoSublistaConsultar == "time") {
                                       cantidad = record_transaccion.getSublistValue(tipoSublistaConsultar, "qty", k);
                                     }
                                    //  var porcentajeImpuestoParcial = record_transaccion.getSublistValue(tipoSublistaConsultar, "taxrate1", k);
                                     var porcentajeImpuestoParcial = record_transaccion.getSublistValue(tipoSublistaConsultar, "custcol_l598_tasa_impuesto", k);
                                     var porcentajeImpuesto = porcentajeImpuestoParcial;
                                     if (l598isEmpty(porcentajeImpuestoParcial)) {
                                       porcentajeImpuesto = parseFloat(0, 10);
                                     }

                                     log.debug("obtenerInfoTrans", "LINE 1265 - porcentajeImpuestoParcial: " + porcentajeImpuestoParcial);
                                     if (!l598isEmpty(porcentajeImpuestoParcial) && porcentajeImpuestoParcial.toString().indexOf("%") != -1) {
                                       porcentajeImpuesto = porcentajeImpuestoParcial.substring(0, porcentajeImpuestoParcial.length - 1);
                                     }
                                     porcentajeImpuesto = parseFloat(porcentajeImpuesto, 10) / 100;
                                     var contieneLineaPercepcion = record_transaccion.getSublistValue(tipoSublistaConsultar, "custcol_l598_es_perc", k);
                                     if (contieneLineaPercepcion == "T" || contieneLineaPercepcion === true)
                                       contienePercepcion = true;
                                     if (URUesRetencion == "T" || URUesRetencion === true)
                                       contieneRetencion = true;
                                     var montoImponiblePercepcion = record_transaccion.getSublistValue(tipoSublistaConsultar, "custcol_l598_monto_imp_perc", k);
                                     var alicuotaPercepcion = record_transaccion.getSublistValue(tipoSublistaConsultar, "custcol_l598_alic_perc", k);
                                     var importePercepcion = record_transaccion.getSublistValue(tipoSublistaConsultar, "custcol_l598_imp_perc", k);
                                     var codigoPercepcion = record_transaccion.getSublistValue(tipoSublistaConsultar, "custcol_l598_cod_perc_ret_cred", k);
                                     // Codigo Percepcion / Retencion / Credito Fiscal
                                     var esLineaCredFiscal = record_transaccion.getSublistValue(tipoSublistaConsultar, "custcol_l598_es_credito_fiscal", k);
                                     if (esLineaCredFiscal == "T" || esLineaCredFiscal === true)
                                       esCreditoFiscal = true;
                                     var codigoPercRetCred = record_transaccion.getSublistValue(tipoSublistaConsultar, "custcol_l598_cod_perc_ret_cred", k);
                                     // Base Imponible Percepcion/Retencion
                                     var baseImpPercepcionyRetencion = record_transaccion.getSublistValue(tipoSublistaConsultar, "custcol_l598_monto_imp_perc", k);
                                     // Alicuota Percepcion/Retencion
                                     var alicuotaPercepcionyRetencion = record_transaccion.getSublistValue(tipoSublistaConsultar, "custcol_l598_alicuota", k);
                                     var columnaIndFacturacion;
                                     if (tipoTransaccion == "customtransaction_l598_anul_resguardo") {
                                       indicadorFacturacion = nvl(record_transaccion.getSublistValue(tipoSublistaConsultar, "custcol_l598_cod_fact_anul_resguardo", k), 0);
                                       columnaIndFacturacion = nvl(record_transaccion.getSublistValue(tipoSublistaConsultar, "custcol_l598_col_acum_anul_resguardo", k), 0);
                                     } else {
                                       indicadorFacturacion = nvl(record_transaccion.getSublistValue(tipoSublistaConsultar, "custcol_l598_cod_ind_facturacion", k), 0);
                                       columnaIndFacturacion = nvl(record_transaccion.getSublistValue(tipoSublistaConsultar, "custcol_l598_col_acum_ind_facturacion", k), 0);
                                     }
                                     /*var indicadorFacturacion = nvl(record_transaccion.getSublistValue(tipoSublistaConsultar, 'custcol_l598_cod_ind_facturacion', k), 0);
                                                                                                          var columnaIndFacturacion = nvl(record_transaccion.getSublistValue(tipoSublistaConsultar, 'custcol_l598_col_acum_ind_facturacion', k), 0);*/
                                     var indicadorAgente = nvl(record_transaccion.getSublistValue(tipoSublistaConsultar, "custcol_l598_cod_ind_agent_resp", k), "");
                                     // Informacion del Articulo
                                     var articuloNombre = record_transaccion.getSublistValue(tipoSublistaConsultar, "custcol_l598_articulo_nombre", k);
                                     var articuloDescripcion = record_transaccion.getSublistValue(tipoSublistaConsultar, "custcol_l598_articulo_descripcion", k);
                                     articuloCodUnidadMedida = record_transaccion.getSublistValue(tipoSublistaConsultar, "custcol_l598_articulo_unid_medida", k);
                                     // Informacion de Descuento/Recargo
                                     var codigoDescuentoRecargo = record_transaccion.getSublistValue(tipoSublistaConsultar, "custcol_l598_tipo_desc_rec", k);
                                     var descripcionLinea = record_transaccion.getSublistValue(tipoSublistaConsultar, "description", k);

                                     var articuloEnGrupo = record_transaccion.getSublistValue(tipoSublistaConsultar, "ingroup", k) || false;
                                     // Excluyo Descripcion y SubTotal
                                     if (tipoItem != "Description" && tipoItem != "EndGroup") {
                                       if (tipoItem != "Subtotal") {
                                         if ((tipoItem != "Discount" && tipoItem != "Markup" && tipoItem != "Group")) {
                                           if (!l598isEmpty(columnaIndFacturacion)) {
                                             switch (parseInt(columnaIndFacturacion, 10)) {
                                               case 1:
                                                 // Extento IVA
                                                 esIVAExento = true;
                                                 importeExento = parseFloat((parseFloat(importeExento, 10) + parseFloat((transImporte), 10)), 10);
                                                 break;
                                               case 2:
                                                 // IVA TASA Minima
                                                 importeIVATasaMinima = parseFloat(parseFloat(importeIVATasaMinima, 10) + parseFloat((parseFloat(transImporte, 10) * parseFloat(porcentajeImpuesto, 10)), 10), 10);
                                                 importeNetoGravadoTasaMinima = parseFloat((parseFloat(importeNetoGravadoTasaMinima, 10) + parseFloat((transImporte), 10)), 10);
                                                 porcentajeImpuestoTasaMinima = porcentajeImpuesto;
                                                 break;
                                               case 3:
                                                 // IVA TASA Basica
                                                 importeIVATasaBasica = parseFloat(parseFloat(importeIVATasaBasica, 10) + parseFloat((parseFloat(transImporte, 10) * parseFloat(porcentajeImpuesto, 10)), 10), 10);
                                                 importeNetoGravadoTasaBasica = parseFloat((parseFloat(importeNetoGravadoTasaBasica, 10) + parseFloat((transImporte), 10)), 10);
                                                 porcentajeImpuestoTasaBasica = porcentajeImpuesto;
                                                 break;
                                               case 4:
                                                 // Otra Tasa
                                                 importeIVAOtraTasa = parseFloat(parseFloat(importeIVAOtraTasa, 10) + parseFloat((parseFloat(transImporte, 10) * parseFloat(porcentajeImpuesto, 10)), 10), 10);
                                                 importeNetoGravadoOtraTasa = parseFloat((parseFloat(importeNetoGravadoOtraTasa, 10) + parseFloat((transImporte), 10)), 10);
                                                 break;
                                               case 5:
                                                 // Entrega Gratuita
                                                 break;
                                               case 6:
                                                 // No Facturable
                                                 //importeNoFacturable = parseFloat(parseFloat(importeNoFacturable, 10) + parseFloat(transImpImpuesto), 10);
                                                 importeNoFacturable = parseFloat((parseFloat(importeNoFacturable, 10) + parseFloat((transImporte), 10)), 10);
                                                 break;
                                               case 7:
                                                 // No Facturable Negativo
                                                 importeNoFacturable = parseFloat((parseFloat(importeNoFacturable, 10) - parseFloat((Math.abs(transImporte)), 10)), 10);
                                                 transImporte = parseFloat((Math.abs(transImporte)), 10); //Se le aplica la funcion de valor absoluto porque la linea no puede viajar con importe negativo.
                                                 break;
                                               case 8:
                                                 // Item A Rebajar en Remito
                                                 break;
                                               case 9:
                                                 // Item A Rebajar en Resguardo
                                                 break;
                                               case 10:
                                                 // Exportacion Y Asimiladas
                                                 importeExpYAsimiladas = parseFloat((parseFloat(importeExpYAsimiladas, 10) + parseFloat((transImporte), 10)), 10);
                                                 break;
                                               case 11:
                                                 // Impuesto Percibido/Retencion/Credito Fiscal
                                                 esPercepcionRetCred = true;
                                                 //importePercepciones = parseFloat((parseFloat(importePercepciones, 10) + parseFloat(parseFloat((transImpImpuesto), 10), 10)), 10);
                                                 break;
                                               case 12:
                                                 // IVA en Suspenso
                                                 importeIVASuspenso = parseFloat(parseFloat(importeIVASuspenso, 10) + parseFloat((parseFloat(transImporte, 10) * parseFloat(porcentajeImpuesto, 10)), 10), 10);
                                                 importeNetoGravadoIVASuspenso = parseFloat((parseFloat(importeNetoGravadoIVASuspenso, 10) + parseFloat((transImporte), 10)), 10);
                                                 break;
                                               case 0:
                                                 // Item A Rebajar en Resguardo
                                                 break;
                                               default:
                                                 // Columna de Acumulacion Invalida
                                                 errorEncontrado = true;
                                                 mensajeError = "La Columna de Acumulacion del Indicador de Facturacion con Codigo : " + indicadorFacturacion + " es Invalida para la Linea de la Transaccion - Numero de Linea : " + k;
                                                 mensajeError = mensajeError + " - ID Transaccion : " + idTransaccion;
                                             }
                                           } else {
                                             // No se Encontro la Columna de Acumulacion del Indicador de Facturacion
                                             errorEncontrado = true;
                                             mensajeError = "Error Obteniendo Informacion de la Columna de Acumulacion del Indicador de Facturacion con Codigo : " + indicadorFacturacion + " Para la Linea de la Transaccion - Numero de Linea : " + k;
                                             mensajeError = mensajeError + " - ID Transaccion : " + idTransaccion;
                                           }
                                         }
                                         if (errorEncontrado == false) {
                                           /*if(esPercepcionRetCred==true){
                                                                                                                                      // Obtener Codigo de Percepcion
                                                                                                                                      infoPercepcionyRetencion = {};
                                                                                                                                      infoPercepcionyRetencion.codigo = codigoPercRetCred;
                                                                                                                                      if(!l598isEmpty(transImpImpuesto)){
                                                                                                                                          infoPercepcionyRetencion.importe = parseFloat(parseFloat((transImpImpuesto), 10), 10).toFixedOK(2);
                                                                                                                                          if(!l598isEmpty(baseImpPercepcionyRetencion)){
                                                                                                                                          // Calculo la Alicuota de Percepcion como Importe Retencion / Base Imponible
                                                                                                                                          alicuotaPercepcionyRetencion = parseFloat(((parseFloat((transImpImpuesto), 10) / parseFloat((baseImpPercepcionyRetencion), 10)) * 100), 10);
                                                                                                                                          infoPercepcionyRetencion.alicuota = parseFloat(alicuotaPercepcionyRetencion,10).toFixedOK(2);
                                                                                                                                          infoPercepcionyRetencion.baseImponible = parseFloat((baseImpPercepcionyRetencion), 10).toFixedOK(2);
                                                                                                                                          }
                                                                                                                                      }
                                                                                                                              }*/
                                         }
                                         if (errorEncontrado == false) {
                                           // INICIO - Agregar Detalle de Linea
                                           if (tipoItem != "Discount" && tipoItem != "Markup" && esPercepcionRetCred == false) {
                                             //var montoItem = parseFloat((parseFloat(precioUnitario, 10) * parseInt(cantidad, 10)), 10);
                                             var montoItem = parseFloat(transImporte, 10);
                                             if (!l598isEmpty(columnaIndFacturacion) && !l598isEmpty(indicadorFacturacion) && !l598isEmpty(articuloNombre) && !l598isEmpty(cantidad) &&
                                               !l598isEmpty(articuloCodUnidadMedida) && (!l598isEmpty(montoItem) || ((l598isEmpty(montoItem) || isNaN(montoItem) || parseFloat(montoItem, 10) < 0) && tipoItem == "Group"))) {
                                               var precioUnitario;
                                               if (!isNaN(cantidad) && parseFloat(cantidad, 10) > 0) {
                                                 precioUnitario = parseFloat((parseFloat(montoItem, 10) / parseFloat(cantidad, 10)), 10);
                                               }
                                               if ((URUesRetencion == "T" || URUesRetencion === true) && (tipoTransaccion == "vendorcredit" || tipoTransaccion == "customtransaction_l598_anul_resguardo")) {
                                                 precioUnitario = parseFloat(0, 10);
                                               }
                                               var informacionLinea = {
                                                 indicadorFacturacion: indicadorFacturacion,
                                                 columnaIndFacturacion: columnaIndFacturacion,
                                                 indicadorAgente: indicadorAgente,
                                                 nombreItem: articuloNombre,
                                                 //informacionLinea.DescripcionAdicional = articuloDescripcion;
                                                 DescripcionAdicional: descripcionLinea,
                                                 cantidad: parseFloat(cantidad, 10).toFixedOK(3),
                                                 unidadMedida: articuloCodUnidadMedida,
                                                 precioUnitario: (tipoItem == "Group") ? 0 : parseFloat(precioUnitario, 10).toFixedOK(6),
                                                 descuentoEnPorcentaje: 0,
                                                 montoDescuento: 0,
                                                 recargoEnPorcentaje: 0,
                                                 montoRecargo: 0,
                                                 montoItem: (tipoItem == "Group") ? 0 : parseFloat(montoItem, 10).toFixedOK(2),
                                               };

                                               log.debug("obtenerInfoTrans", "articulo en grupo: " + articuloEnGrupo);

                                               if (articuloEnGrupo == "T" || articuloEnGrupo === true) {
                                                 var longLineas = objetoRespuesta.detalleLineas.length;
                                                 // objetoRespuesta.detalleLineas[longLineas - 1].cantidad += parseFloat(informacionLinea.cantidad, 10);
                                                 // objetoRespuesta.detalleLineas[longLineas - 1].precioUnitario += parseFloat(informacionLinea.montoItem, 10);
                                                 objetoRespuesta.detalleLineas[longLineas - 1].montoItem += parseFloat(informacionLinea.montoItem, 10);
                                               } else {
                                                 objetoRespuesta.detalleLineas.push(informacionLinea);
                                               }

                                               // INICIO - Agregar Informacion de Percepcion
                                               if ((contienePercepcion == true) || (contieneRetencion == true)) {
                                                 // Obtener Codigo de Percepcion
                                                 infoPercepcionyRetencion = {
                                                   codigo: codigoPercepcion,
                                                   alicuota: parseFloat(alicuotaPercepcion, 10).toFixedOK(2),
                                                   baseImponible: parseFloat((montoImponiblePercepcion), 10).toFixedOK(2),
                                                 };

                                                 if (!l598isEmpty(infoPercepcionyRetencion.baseImponible) && !isNaN(parseFloat(infoPercepcionyRetencion.baseImponible, 10)) && parseFloat(infoPercepcionyRetencion.baseImponible, 10) > 0) {
                                                   if (!l598isEmpty(infoPercepcionyRetencion.alicuota) && !isNaN(parseFloat(infoPercepcionyRetencion.alicuota, 10)) && parseFloat(infoPercepcionyRetencion.alicuota, 10) > 0) {
                                                     infoPercepcionyRetencion.importe = parseFloat(parseFloat(parseFloat(infoPercepcionyRetencion.baseImponible, 10) * (parseFloat(infoPercepcionyRetencion.alicuota, 10) / 100), 10), 10).toFixedOK(2);
                                                   }
                                                 }
                                                 // Agregar Detalle de Percepcion/Retencion/Credito Fiscal
                                                 if (infoPercepcionyRetencion != null) {
                                                   if (!l598isEmpty(infoPercepcionyRetencion.codigo) && !l598isEmpty(infoPercepcionyRetencion.importe) &&
                                                     !l598isEmpty(infoPercepcionyRetencion.alicuota) && !l598isEmpty(infoPercepcionyRetencion.baseImponible)) {
                                                     //importePercepciones = parseFloat((parseFloat(importePercepciones, 10) + parseFloat(parseFloat((infoPercepcionyRetencion.importe), 10), 10)), 10).toFixedOK(2);
                                                     if (esCreditoFiscal == true) {
                                                       importeCreditosFiscales = parseFloat(importeCreditosFiscales, 10) + parseFloat(infoPercepcionyRetencion.importe, 10);
                                                     } else {
                                                       if ((tipoTransaccion == "vendorcredit" || tipoTransaccion == "customtransaction_l598_anul_resguardo") && (isVoided == "T" || isVoided === true)) {
                                                         importeRetenidoPercibido = parseFloat(parseFloat(importeRetenidoPercibido, 10) + ((parseFloat(infoPercepcionyRetencion.importe, 10)) * (parseFloat(-1, 10))), 10);
                                                       } else {
                                                         importeRetenidoPercibido = parseFloat((parseFloat(importeRetenidoPercibido, 10) + parseFloat(infoPercepcionyRetencion.importe, 10)), 10);
                                                       }
                                                     }
                                                     if (objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].percepcionyRetencion == null) {
                                                       // Genero el Array
                                                       objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].percepcionyRetencion = [];
                                                     }
                                                     objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].percepcionyRetencion.push(infoPercepcionyRetencion);
                                                     // Agregar A totales
                                                     var indice = -1;
                                                     if (objetoRespuesta.detalleTotalesPercyRet.length > 0) {
                                                       //var indice = objetoRespuesta.detalleTotalesPercyRet.indexOf(infoPercepcionyRetencion.codigo);
                                                       var codigoPercEncontrado = false;
                                                       for (var indicePerc = 0; indicePerc < objetoRespuesta.detalleTotalesPercyRet.length; indicePerc++) {
                                                         if (objetoRespuesta.detalleTotalesPercyRet[indicePerc].codigo == infoPercepcionyRetencion.codigo) {
                                                           codigoPercEncontrado = true;
                                                           indice = indicePerc;
                                                           break;
                                                         }
                                                       }
                                                     }
                                                     if (indice >= 0) {
                                                       if ((tipoTransaccion == "vendorcredit" || tipoTransaccion == "customtransaction_l598_anul_resguardo") && (isVoided == "T" || isVoided === true)) {
                                                         objetoRespuesta.detalleTotalesPercyRet[indice].importe = parseFloat((parseFloat(objetoRespuesta.detalleTotalesPercyRet[indice].importe, 10) + ((parseFloat(infoPercepcionyRetencion.importe, 10)) * (parseFloat(-1, 10))), 10));
                                                       } else {
                                                         objetoRespuesta.detalleTotalesPercyRet[indice].importe = parseFloat((parseFloat(objetoRespuesta.detalleTotalesPercyRet[indice].importe, 10) + parseFloat(infoPercepcionyRetencion.importe, 10)), 10);
                                                       }
                                                     } else {
                                                       var infoPercYRet = {
                                                         codigo: infoPercepcionyRetencion.codigo,
                                                         importe: parseFloat(infoPercepcionyRetencion.importe, 10),
                                                       };
                                                       //infoPercYRet.importe = parseFloat(infoPercepcionyRetencion.importe, 10);
                                                       //objetoRespuesta.detalleTotalesPercyRet.push(infoPercYRet);																																																
                                                       if ((tipoTransaccion == "vendorcredit" || tipoTransaccion == "customtransaction_l598_anul_resguardo") && (isVoided == "T" || isVoided === true)) {
                                                         infoPercYRet.importe = parseFloat(parseFloat(infoPercepcionyRetencion.importe, 10) * (parseFloat(-1, 10)), 10);
                                                       }

                                                       objetoRespuesta.detalleTotalesPercyRet.push(infoPercYRet);
                                                     }
                                                   } else {
                                                     // Falta Información Reuquerida de la Linea de Percepcion
                                                     //log.error('LINE 1688', 'infoPercepcionyRetencion.importe: '+infoPercepcionyRetencion.importe+'. infoPercepcionyRetencion.baseImponible: '+infoPercepcionyRetencion.baseImponible+'. infoPercepcionyRetencion.alicuota: '+infoPercepcionyRetencion.alicuota);
                                                     errorEncontrado = true;
                                                     mensajeError = "Error Obteniendo la siguiente Informacion de la Linea de Percepcion/Retencion/Credito Fiscal : ";
                                                     if (l598isEmpty(infoPercepcionyRetencion.codigo))
                                                       mensajeError = mensajeError + " Codigo / ";
                                                     if (l598isEmpty(infoPercepcionyRetencion.importe))
                                                       mensajeError = mensajeError + " Importe / ";
                                                     if (l598isEmpty(infoPercepcionyRetencion.alicuota))
                                                       mensajeError = mensajeError + " Alicuota / ";
                                                     if (l598isEmpty(infoPercepcionyRetencion.baseImponible))
                                                       mensajeError = mensajeError + " Base de Calculo / ";
                                                     mensajeError = mensajeError + " - Numero de Linea : " + k;
                                                     mensajeError = mensajeError + " - ID Transaccion : " + idTransaccion;
                                                   }
                                                 } else {
                                                   // Error Obteniendo Informacion de la Linea de Percepcion/Retencion/Credito Fiscal
                                                   errorEncontrado = true;
                                                   mensajeError = "Error Obteniendo Informacion de la Linea de Percepcion/Retencion/Credtio Fiscal - Numero de Linea : " + k;
                                                   mensajeError = mensajeError + " - ID Transaccion : " + idTransaccion;
                                                 }
                                               }

                                               log.debug("obtenerInfoTrans", "line 1549 - cantidadLineas: " + cantidadLineas);
                                               // FIN - Agregar Informacion de Percepcion
                                               if (articuloEnGrupo == "F" || articuloEnGrupo === false) {
                                                 cantidadLineas++;
                                               }
                                             } else {
                                               // Falta Informacion Obligatoria de la Linea de la Transacción
                                               errorEncontrado = true;
                                               mensajeError = "Falta la Siguiente Informacion de la Linea de la Transaccion : ";
                                               if (l598isEmpty(columnaIndFacturacion))
                                                 mensajeError = mensajeError + "Columna de Acumulacion del Indicador de Facturacion / ";
                                               if (l598isEmpty(indicadorFacturacion))
                                                 mensajeError = mensajeError + "Indicador de Facturacion / ";
                                               if (l598isEmpty(articuloNombre))
                                                 mensajeError = mensajeError + "Nombre del Articulo / ";
                                               if (l598isEmpty(cantidad))
                                                 mensajeError = mensajeError + "Cantidad del Articulo / ";
                                               if (l598isEmpty(articuloCodUnidadMedida))
                                                 mensajeError = mensajeError + "Unidad de Medida del Articulo / ";
                                               //if (l598isEmpty(precioUnitario))
                                               //mensajeError = mensajeError + "Precio Unitario del Articulo / ";
                                               if (l598isEmpty(montoItem))
                                                 mensajeError = mensajeError + "Monto del Articulo (Precio Unitario x Cantidad) / ";
                                               mensajeError = mensajeError + "- Numero de Linea : " + k;
                                               mensajeError = mensajeError + " - ID Transaccion : " + idTransaccion;
                                             }
                                           } else {
                                             // Agregar Descuento / Recargo / Percepcion a la Linea Anterior
                                             if (objetoRespuesta.detalleLineas != null && objetoRespuesta.detalleLineas.length > 0) {
                                               // Grabo la informacion en la Linea Anterior
                                               if (esPercepcionRetCred == false) {
                                                 if (tipoItem == "Discount") {
                                                   if (!l598isEmpty(codigoDescuentoRecargo)) {
                                                     var infoDescuento = {
                                                       tipo: codigoDescuentoRecargo,
                                                       valor: parseFloat(Math.abs(transImporte), 10).toFixedOK(2),
                                                     };
                                                     //infoDescuento.valor = parseFloat((parseFloat(Math.abs(transImpImpuesto), 10) + parseFloat((Math.abs(transImporte)), 10)), 10).toFixedOK(2);
                                                     if (objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].subDescuento == null) {
                                                       // Genero el Array
                                                       objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].subDescuento = [];
                                                     }
                                                     objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].subDescuento.push(infoDescuento);
                                                     objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].descuentoEnPorcentaje = infoDescuento.tipo;
                                                     //objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].descuentoEnPorcentaje = 0;
                                                     //log.debug('LINE 1776', 'informacionLinea.descuentoEnPorcentaje: '+objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].descuentoEnPorcentaje);
                                                     objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].montoDescuento = infoDescuento.valor;
                                                     objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].montoItem = parseFloat((parseFloat(objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].montoItem, 10) - parseFloat(infoDescuento.valor, 10)), 10).toFixedOK(2);
                                                     if (!l598isEmpty(objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].columnaIndFacturacion)) {
                                                       switch (parseInt(objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].columnaIndFacturacion, 10)) {
                                                         case 1:
                                                           // Exento IVA
                                                           importeExento = parseFloat(parseFloat(importeExento, 10) - parseFloat(Math.abs(parseFloat(transImporte, 10), 10)), 10);
                                                           break;
                                                         case 2:
                                                           // IVA TASA Minima
                                                           importeIVATasaMinima = parseFloat(parseFloat(importeIVATasaMinima, 10) - parseFloat(Math.abs((parseFloat(transImporte, 10) * parseFloat(porcentajeImpuesto, 10)), 10)), 10);
                                                           importeNetoGravadoTasaMinima = parseFloat((parseFloat(importeNetoGravadoTasaMinima, 10) - parseFloat((Math.abs(transImporte)), 10)), 10);
                                                           break;
                                                         case 3:
                                                           // IVA TASA Basica
                                                           importeIVATasaBasica = parseFloat(parseFloat(importeIVATasaBasica, 10) - parseFloat(Math.abs((parseFloat(transImporte, 10) * parseFloat(porcentajeImpuesto, 10)), 10)), 10);
                                                           importeNetoGravadoTasaBasica = parseFloat((parseFloat(importeNetoGravadoTasaBasica, 10) - parseFloat((Math.abs(transImporte)), 10)), 10);
                                                           break;
                                                         case 4:
                                                           // Otra Tasa
                                                           importeIVAOtraTasa = parseFloat(parseFloat(importeIVAOtraTasa, 10) - parseFloat(Math.abs((parseFloat(transImporte, 10) * parseFloat(porcentajeImpuesto, 10)), 10)), 10);
                                                           importeNetoGravadoOtraTasa = parseFloat((parseFloat(importeNetoGravadoOtraTasa, 10) - parseFloat((Math.abs(transImporte)), 10)), 10);
                                                           break;
                                                         case 6:
                                                           // No Facturable
                                                           importeNoFacturable = parseFloat((parseFloat(importeNoFacturable, 10) - parseFloat((Math.abs(transImporte)), 10)), 10);
                                                           break;
                                                         case 7:
                                                           // No Facturable Negativo
                                                           importeNoFacturable = parseFloat((parseFloat(importeNoFacturable, 10) + parseFloat((Math.abs(transImporte)), 10)), 10);
                                                           break;
                                                         case 10:
                                                           //abrito 27/07/2018: Se agrega lo siguiente para la linea aplica un descuento de linea el importe de descuento se lo reste al importe de la linea y asi el monto motal viaje con el importe correcto.
                                                           // Exportacion (Exportacion y Asimiladas)
                                                           importeExpYAsimiladas = parseFloat(parseFloat(importeExpYAsimiladas, 10) - parseFloat(Math.abs(parseFloat(transImporte, 10), 10)), 10);
                                                           break;
                                                       }
                                                     }
                                                   } else {
                                                     // Error Falta Configurar el Tipo de Descuento en la Transaccion
                                                     errorEncontrado = true;
                                                     mensajeError = "Error Obteniendo Informacion del Tipo de Descuento de la Linea de la Transaccion - Numero de Linea : " + k;
                                                     mensajeError = mensajeError + " - ID Transaccion : " + idTransaccion;
                                                   }
                                                 }
                                                 if (tipoItem == "Markup") {
                                                   //log.debug('LINE 1789', codigoDescuentoRecargo);
                                                   if (!l598isEmpty(codigoDescuentoRecargo)) {
                                                     var infoRecargo = {
                                                       tipo: codigoDescuentoRecargo,
                                                       valor: parseFloat(Math.abs(transImporte), 10).toFixedOK(2),
                                                     };
                                                     //infoRecargo.valor = parseFloat((parseFloat(transImpImpuesto, 10) + parseFloat((transImporte), 10)), 10).toFixedOK(2);
                                                     if (objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].subRecargo == null) {
                                                       // Genero el Array
                                                       objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].subRecargo = [];
                                                     }
                                                     objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].subRecargo.push(infoRecargo);
                                                     objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].recargoEnPorcentaje = infoRecargo.tipo;
                                                     objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].montoRecargo = infoRecargo.valor;
                                                     objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].montoItem = parseFloat((parseFloat(objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].montoItem, 10) + parseFloat(infoRecargo.valor, 10)), 10).toFixedOK(2);
                                                     if (!l598isEmpty(objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].columnaIndFacturacion)) {
                                                       switch (parseInt(objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].columnaIndFacturacion, 10)) {
                                                         case 2:
                                                           // IVA TASA Minima
                                                           importeIVATasaMinima = parseFloat(parseFloat(importeIVATasaMinima, 10) + parseFloat(Math.abs((parseFloat(transImporte, 10) * parseFloat(porcentajeImpuesto, 10)), 10)), 10);
                                                           importeNetoGravadoTasaMinima = parseFloat((parseFloat(importeNetoGravadoTasaMinima, 10) + parseFloat((Math.abs(transImporte)), 10)), 10);
                                                           break;
                                                         case 3:
                                                           // IVA TASA Basica
                                                           importeIVATasaBasica = parseFloat(parseFloat(importeIVATasaBasica, 10) + parseFloat(Math.abs((parseFloat(transImporte, 10) * parseFloat(porcentajeImpuesto, 10)), 10)), 10);
                                                           importeNetoGravadoTasaBasica = parseFloat((parseFloat(importeNetoGravadoTasaBasica, 10) + parseFloat((Math.abs(transImporte)), 10)), 10);
                                                           break;
                                                         case 4:
                                                           // Otra Tasa
                                                           importeIVAOtraTasa = parseFloat(parseFloat(importeIVAOtraTasa, 10) + parseFloat(Math.abs((parseFloat(transImporte, 10) * parseFloat(porcentajeImpuesto, 10)), 10)), 10);
                                                           importeNetoGravadoOtraTasa = parseFloat((parseFloat(importeNetoGravadoOtraTasa, 10) + parseFloat((Math.abs(transImporte)), 10)), 10);
                                                           break;
                                                       }
                                                     }
                                                   } else {
                                                     // Error Falta Configurar el Tipo de Recargo en la Transaccion
                                                     errorEncontrado = true;
                                                     mensajeError = "Error Obteniendo Informacion del Tipo de Recargo de la Linea de la Transaccion - Numero de Linea : " + k;
                                                     mensajeError = mensajeError + " - ID Transaccion : " + idTransaccion;
                                                   }
                                                 }
                                               }
                                               /*else {
                                                                                                                                                           // Agregar Detalle de Percepcion/Retencion/Credito Fiscal
                                                                                                                                                           if (infoPercepcionyRetencion != null) {
                                                                                                                                                               if (!l598isEmpty(infoPercepcionyRetencion.codigo) && !l598isEmpty(infoPercepcionyRetencion.importe) &&
                                                                                                                                                                   !l598isEmpty(infoPercepcionyRetencion.alicuota) && !l598isEmpty(infoPercepcionyRetencion.baseImponible)) {
                                                                                                                                                                   log.error('URU - Factura Electronica', 'Alicuota : ' + infoPercepcionyRetencion.alicuota);
                                                                                                                                                                   if(esCreditoFiscal==true){
                                                                                                                                                                       importeCreditosFiscales=parseFloat(importeCreditosFiscales,10) + parseFloat(infoPercepcionyRetencion.importe,10);
                                                                                                                                                                   }
                                                                                                                                                                   else{
                                                                                                                                                                       importeRetenidoPercibido=parseFloat(importeRetenidoPercibido,10) + parseFloat(infoPercepcionyRetencion.importe,10);
                                                                                                                                                                   }
                                                                                                                                                                   if (objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].percepcionyRetencion == null) {
                                                                                                                                                                       // Genero el Array
                                                                                                                                                                       objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].percepcionyRetencion = [];
                                                                                                                                                                   }
                                                                                                                                                                   objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].percepcionyRetencion.push(infoPercepcionyRetencion);
                                                                                                                                                                   // Agregar Agente/Responsable de la Percepcion
                                                                                                                                                                   objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].indicadorAgente = indicadorAgente;
                                                                                                                                                                   // Agregar A totales
                                                                                                                                                                   var indice = -1;
                                                                                                                                                                   if (objetoRespuesta.detalleTotalesPercyRet.length > 0) {
                                                                                                                                                                       var indice = objetoRespuesta.detalleTotalesPercyRet.indexOf(infoPercepcionyRetencion.codigo);
                                                                                                                                                                   }
                                                                                                                                                                   if (indice >= 0) {
                                                                                                                                                                       objetoRespuesta.detalleTotalesPercyRet[indice].valorPercRet = parseFloat((parseFloat(objetoRespuesta.detalleTotalesPercyRet[indice].valorPercRet, 10) + parseFloat(infoPercepcionyRetencion.importe, 10)), 10);
                                                                                                                                                                   } else {
                                                                                                                                                                       var infoPercYRet = {};
                                                                                                                                                                       infoPercYRet.codigo = infoPercepcionyRetencion.codigo;
                                                                                                                                                                       infoPercYRet.importe = parseFloat(infoPercepcionyRetencion.importe, 10);
                                                                                                                                                                       objetoRespuesta.detalleTotalesPercyRet.push(infoPercYRet);
                                                                                                                                                                   }
                                                                                                                                                               } else {
                                                                                                                                                                   // Falta Información Reuquerida de la Linea de Percepcion
                                                                                                                                                                   errorEncontrado = true;
                                                                                                                                                                   mensajeError = "Error Obteniendo la siguiente Informacion de la Linea de Percepcion/Retencion/Credtio Fiscal : ";
                                                                                                                                                                   if (l598isEmpty(infoPercepcionyRetencion.codigo))
                                                                                                                                                                       mensajeError = mensajeError + " Codigo / ";
                                                                                                                                                                   if (l598isEmpty(infoPercepcionyRetencion.importe))
                                                                                                                                                                       mensajeError = mensajeError + " Importe / ";
                                                                                                                                                                   if (l598isEmpty(infoPercepcionyRetencion.alicuota))
                                                                                                                                                                       mensajeError = mensajeError + " Alicuota / ";
                                                                                                                                                                   if (l598isEmpty(infoPercepcionyRetencion.baseImponible))
                                                                                                                                                                       mensajeError = mensajeError + " Base de Calculo / ";
                                                                                                                                                                   mensajeError = mensajeError + " - Numero de Linea : " + k;
                                                                                                                                                                   mensajeError = mensajeError + " - ID Transaccion : " + idTransaccion;
                                                                                                                                                               }
                                                                                                                                                           } else {
                                                                                                                                                               // Error Obteniendo Informacion de la Linea de Percepcion/Retencion/Credito Fiscal
                                                                                                                                                               errorEncontrado = true;
                                                                                                                                                               mensajeError = "Error Obteniendo Informacion de la Linea de Percepcion/Retencion/Credtio Fiscal - Numero de Linea : " + k;
                                                                                                                                                               mensajeError = mensajeError + " - ID Transaccion : " + idTransaccion;
                                                                                                                                                           }
                                                                                                                                                       }*/
                                             } else {
                                               // Error Grabar Descuento / Recargo / Percepcion en la primer Linea
                                               errorEncontrado = true;
                                               mensajeError = "Los Descuentos/Recargos/Percepciones no pueden ingresarse en la primer linea de la Transaccion";
                                               mensajeError = mensajeError + " - ID Transaccion : " + idTransaccion;
                                             }
                                           }
                                         }
                                         // FIN - Agregar Detalle de Linea
                                       } else {
                                         // Linea de Subtotal
                                         //log.debug('LINE 1905', 'OK');
                                         if (!l598isEmpty(descripcionLinea) && !l598isEmpty(transImporte)) {
                                           var informacionSubTotal = {
                                             glosa: descripcionLinea,
                                             orden: k, // Utilizar el Numero de Line,
                                             valor: parseFloat(parseFloat((transImporte), 10)).toFixedOK(2),
                                           };
                                           objetoRespuesta.detalleSubtotales.push(informacionSubTotal);
                                         } else {
                                           // Falta Descripcion  / Importe de la Linea de Subtotal
                                           errorEncontrado = true;
                                           mensajeError = "Falta la Siguiente Informacion de Para la Linea de Subtotal : ";
                                           if (l598isEmpty(descripcionLinea))
                                             mensajeError = mensajeError + "Descripcion del Subtotal / ";
                                           if (l598isEmpty(descripcionLinea))
                                             mensajeError = mensajeError + "Importe del Subtotal / ";
                                           mensajeError = mensajeError + " Para la Linea Numero : " + k;
                                           mensajeError = mensajeError + " - ID Transaccion : " + idTransaccion;
                                         }
                                       }

                                     }
                                     else if (tipoItem == "EndGroup") {
                                       var ultPos = objetoRespuesta.detalleLineas.length;
                                       objetoRespuesta.detalleLineas[ultPos - 1].montoItem = parseFloat(objetoRespuesta.detalleLineas[ultPos - 1].montoItem, 10).toFixedOK(2);
                                       objetoRespuesta.detalleLineas[ultPos - 1].precioUnitario = parseFloat(parseFloat(objetoRespuesta.detalleLineas[ultPos - 1].montoItem, 10) / parseInt(objetoRespuesta.detalleLineas[ultPos - 1].cantidad, 10), 10).toFixedOK(2);
                                       log.debug("buscarInformacionFE", "objetoRespuesta.detalleLineas[ultPos - 1] : " + JSON.stringify(objetoRespuesta.detalleLineas[ultPos - 1]));

                                     }
                                     // Del If Descuento y EndGroup
                                   }
                                 }
                               }
                             }
                             //INICIO - MANEJO PARA APLICACION DE DESCUENTO GLOBAL DE MONTO
                             if (errorEncontrado == false) {
                               if (!l598isEmpty(infoDescRecGlobal) && infoDescRecGlobal.valor > 0 && !l598isEmpty(infoDescRecGlobal.indicadorFacturacion) && infoDescRecGlobal.tipoMovimiento == "D") {
                                 if ((!l598isEmpty(importeNetoGravadoTasaMinima) && importeNetoGravadoTasaMinima > 0) && (!l598isEmpty(importeNetoGravadoTasaBasica) && importeNetoGravadoTasaBasica > 0)) {
                                   //Si la transaccion tiene lineas de articulos con diferentes tipos de impuesto
                                   errorEncontrado = true;
                                   mensajeError = "La transaccion tiene articulos con diferentes codigos de impuesto por lo cual no se procede a calcular el descuento global ya que se estaria reportando en la DGI algo diferente a lo que se vizualiza en el resumen de la transacción desde Netsuite";
                                   mensajeError = mensajeError + " - ID Transaccion : " + idTransaccion;
                                 } else {
                                   var indicadorFacturacionDRGlobal = infoDescRecGlobal.indicadorFacturacion;
                                   var valorDRGlobal = infoDescRecGlobal.valor;
                                   switch (parseInt(indicadorFacturacionDRGlobal, 10)) {
                                     case 1:
                                       // Extento IVA
                                       log.debug("URU - Factura Electronica", "DescGlobal - importeExento: " + importeExento);
                                       importeExento = parseFloat(parseFloat(importeExento, 10) - parseFloat(valorDRGlobal, 10), 10);
                                       log.debug("URU - Factura Electronica", "DescGlobal - importeExento: " + importeExento);
                                       break;
                                     case 2:
                                       // IVA TASA Minima
                                       importeNetoGravadoTasaMinima = parseFloat(parseFloat(importeNetoGravadoTasaMinima, 10) - parseFloat(valorDRGlobal, 10), 10);
                                       importeIVATasaMinima = parseFloat(parseFloat(importeNetoGravadoTasaMinima, 10) * parseFloat(porcentajeImpuestoTasaMinima, 10), 10);
                                       log.debug("URU - Factura Electronica", "DescGlobal - ImporteNetoGravadoTasaMinima: " + importeNetoGravadoTasaMinima + ". ImporteIVATasaMinima: " + importeIVATasaMinima);
                                       break;
                                     case 3:
                                       // IVA TASA Basica
                                       importeNetoGravadoTasaBasica = parseFloat(parseFloat(importeNetoGravadoTasaBasica, 10) - parseFloat(valorDRGlobal, 10), 10);
                                       importeIVATasaBasica = parseFloat(parseFloat(importeNetoGravadoTasaBasica, 10) * parseFloat(porcentajeImpuestoTasaBasica, 10), 10);
                                       log.debug("URU - Factura Electronica", "DescGlobal - ImporteNetoGravadoTasaBasica: " + importeNetoGravadoTasaBasica + ". ImporteIVATasaBasica: " + importeIVATasaBasica);
                                       break;
                                     case 10:
                                       // EXPORTACION Y ASIMILADAS
                                       log.debug("URU - Factura Electronica", "DescGlobal - importeExpYAsimiladas: " + importeExpYAsimiladas);
                                       importeExpYAsimiladas = parseFloat(parseFloat(importeExpYAsimiladas, 10) - parseFloat(valorDRGlobal, 10), 10);
                                       log.debug("URU - Factura Electronica", "DescGlobal - importeExpYAsimiladas: " + importeExpYAsimiladas);
                                       break;
                                     default:
                                       // Columna de Acumulacion Invalida
                                       errorEncontrado = true;
                                       mensajeError = "La Columna de Acumulacion del Indicador de Facturacion Descuento Global con Codigo : " + indicadorFacturacionDRGlobal + " es invalida para la aplicacion del descuento global";
                                       mensajeError = mensajeError + " - ID Transaccion : " + idTransaccion;
                                   }
                                 }
                               }
                             }
                             //FIN - MANEJO PARA APLICACION DE DESCUENTO GLOBAL DE MONTO
                             //nlapiLogExecution('DEBUG','LINE 2074','INICIO PROCESO URU-RETENCIONES');
                             if (tipoTransaccion == "customtransaction_l598_resguardos") {
                               var uruResguardoAnulacion = record_transaccion.getValue("custbody_l598_resguardo_anulacion");
                               var transUruResguardo = record_transaccion.getValue("custbody_l598_link_uru_resguardo");
                               var esAnulacion = false;
                               var sublistaResguardo = "recmachcustrecord_l598_ret_detalle_resguardo";
                               var sublistaResguardoLines = record_transaccion.getLineCount(sublistaResguardo);
                               var referenciaGlobal = nvl(resultadoIndividualParte2.getValue(columnsParte2[47]), "");
                               for (var subListaContador = 0; subListaContador < sublistaResguardoLines && errorEncontrado == false; subListaContador++) {
                                 var contieneRetencion = true;
                                 var infoPercepcion = null;
                                 var transImporte = 0;
                                 var transCodImpuesto = "";
                                 var codigoPercepcion = record_transaccion.getSublistValue(sublistaResguardo, "custrecord_l598_ret_detalle_cod_ret", subListaContador);
                                 var codigoPercRetCred = codigoPercepcion;
                                 var montoImponiblePercepcion = record_transaccion.getSublistValue(sublistaResguardo, "custrecord_l598_ret_detalle_base_cal_fin", subListaContador);
                                 var baseImpPercepcionyRetencion = montoImponiblePercepcion;
                                 var importePercepcion = montoImponiblePercepcion;
                                 var alicuotaPercepcion = record_transaccion.getSublistValue(sublistaResguardo, "custrecord_l598_ret_detalle_alicuota", subListaContador);
                                 indicadorFacturacion = record_transaccion.getSublistValue(sublistaResguardo, "custrecord_l598_ret_detalle_ind_facturac", subListaContador);
                                 var columnaIndFacturacion = indicadorFacturacion;
                                 var montoItem = parseFloat(transImporte, 10);
                                 //SI LO SIGUIENTE SE CUMPLE INDICA QUE CORRESPONDE A UNA TRANSACCION URU-RESGUARDO DE ANULACION
                                 //POR TANTO SE CAMBIA EL INDICADOR DE FACTURACION AL CORRESPONDIENTE
                                 /*if (!l598isEmpty(uruResguardoAnulacion) && uruResguardoAnulacion=='T' && !l598isEmpty(transUruResguardo))
                                                                                              {
                                                                                                  esAnulacion = true;
                                                                                                  var indicadorFacturacion = '9';
                                                                                                  var columnaIndFacturacion = 9;
                                                                                              }
                                                                                              else
                                                                                              {
                                                                                                  var indicadorFacturacion = '0';
                                                                                                  var columnaIndFacturacion = 0;
                                                                                              }*/
                                 if (!l598isEmpty(columnaIndFacturacion) && !l598isEmpty(indicadorFacturacion)) {
                                   var precioUnitario = parseFloat(0, 10);
                                   var informacionLinea = {
                                     indicadorFacturacion: indicadorFacturacion,
                                     columnaIndFacturacion: columnaIndFacturacion,
                                     indicadorAgente: "",
                                     nombreItem: "",
                                     DescripcionAdicional: "",
                                     cantidad: 0,
                                     unidadMedida: articuloCodUnidadMedida,
                                     precioUnitario: parseFloat(precioUnitario, 10).toFixedOK(2),
                                     descuentoEnPorcentaje: 0,
                                     montoDescuento: 0,
                                     recargoEnPorcentaje: 0,
                                     montoRecargo: 0,
                                     montoItem: parseFloat(montoItem, 10).toFixedOK(2),
                                   };
                                   objetoRespuesta.detalleLineas.push(informacionLinea);
                                   //INICIO - AGREGAR INFORMACION DE RETENCION
                                   if (contieneRetencion) {
                                     //OBTENER CODIGO DE RETENCION
                                     var infoRetencion = {
                                       codigo: codigoPercepcion,
                                       alicuota: parseFloat(alicuotaPercepcion, 10).toFixedOK(2),
                                       baseImponible: parseFloat((montoImponiblePercepcion), 10).toFixedOK(2),
                                     };

                                     if (!l598isEmpty(infoRetencion.baseImponible) && !isNaN(parseFloat(infoRetencion.baseImponible, 10)) && parseFloat(infoRetencion.baseImponible, 10) > 0) {
                                       if (!l598isEmpty(infoRetencion.alicuota) && !isNaN(parseFloat(infoRetencion.alicuota, 10)) && parseFloat(infoRetencion.alicuota, 10) > 0) {
                                         infoRetencion.importe = parseFloat(parseFloat(parseFloat(infoRetencion.baseImponible, 10) * (parseFloat(infoRetencion.alicuota, 10) / 100), 10), 10).toFixedOK(2);
                                         //nlapiLogExecution('DEBUG','LINE 2146','infoRetencion.importe: '+infoRetencion.importe);
                                       }
                                     }
                                     //AGREGAR DETALLE DE RETENCION
                                     if (!l598isEmpty(infoRetencion)) {
                                       if (!l598isEmpty(infoRetencion.codigo) && !l598isEmpty(infoRetencion.importe) &&
                                         !l598isEmpty(infoRetencion.alicuota) && !l598isEmpty(infoRetencion.baseImponible)) {
                                         if (indicadorFacturacion == 9) {
                                           importeRetenidoPercibido = parseFloat(parseFloat(importeRetenidoPercibido, 10) + ((parseFloat(infoRetencion.importe, 10)) * (parseFloat(-1, 10))), 10).toFixedOK(2);
                                         } else {
                                           importeRetenidoPercibido = parseFloat((parseFloat(importeRetenidoPercibido, 10) + parseFloat(infoRetencion.importe, 10)), 10).toFixedOK(2);
                                         }
                                         if (l598isEmpty(objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].percepcionyRetencion)) {
                                           //GENERO EL ARRAY
                                           objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].percepcionyRetencion = [];
                                         }
                                         objetoRespuesta.detalleLineas[(objetoRespuesta.detalleLineas.length - 1)].percepcionyRetencion.push(infoRetencion);
                                         //AGREGAR A TOTALES
                                         var indice = -1;
                                         if (objetoRespuesta.detalleTotalesPercyRet.length > 0) {
                                           var codigoPercEncontrado = false;
                                           for (var indicePerc = 0; !l598isEmpty(objetoRespuesta.detalleTotalesPercyRet) && indicePerc < objetoRespuesta.detalleTotalesPercyRet.length; indicePerc++) {
                                             if (objetoRespuesta.detalleTotalesPercyRet[indicePerc].codigo == infoRetencion.codigo) {
                                               codigoPercEncontrado = true;
                                               indice = indicePerc;
                                               break;
                                             }
                                           }
                                         }
                                         if (indice >= 0) {
                                           if (indicadorFacturacion == 9) {
                                             objetoRespuesta.detalleTotalesPercyRet[indice].importe = parseFloat((parseFloat(objetoRespuesta.detalleTotalesPercyRet[indice].importe, 10) + ((parseFloat(infoRetencion.importe, 10)) * (parseFloat(-1, 10)))), 10).toFixedOK(2);
                                           } else {
                                             objetoRespuesta.detalleTotalesPercyRet[indice].importe = parseFloat((parseFloat(objetoRespuesta.detalleTotalesPercyRet[indice].importe, 10) + parseFloat(infoRetencion.importe, 10)), 10).toFixedOK(2);
                                           }
                                         } else {
                                           var infoPercYRet = {
                                             codigo: infoRetencion.codigo,
                                           };

                                           if (indicadorFacturacion == 9) {
                                             infoPercYRet.importe = parseFloat(parseFloat(infoRetencion.importe, 10) * (parseFloat(-1, 10)), 10);
                                           } else {
                                             infoPercYRet.importe = parseFloat(infoRetencion.importe, 10);
                                           }
                                           objetoRespuesta.detalleTotalesPercyRet.push(infoPercYRet);
                                         }
                                       } else {
                                         errorEncontrado = true;
                                         mensajeError = "Error obteniendo la siguiente información de la linea de URU-Detalle Retencion: ";
                                         if (l598isEmpty(infoRetencion.codigo))
                                           mensajeError = mensajeError + " Codigo / ";
                                         if (l598isEmpty(infoRetencion.importe))
                                           mensajeError = mensajeError + " Importe / ";
                                         if (l598isEmpty(infoRetencion.alicuota))
                                           mensajeError = mensajeError + " Alicuota / ";
                                         if (l598isEmpty(infoRetencion.baseImponible))
                                           mensajeError = mensajeError + " Base de calculo / ";
                                         mensajeError = mensajeError + " - Numero de linea : " + k;
                                         mensajeError = mensajeError + " - ID transaccion : " + idTransaccion;
                                       }
                                     } else {
                                       // Error Obteniendo Informacion de la Linea de Percepcion/Retencion/Credito Fiscal
                                       errorEncontrado = true;
                                       mensajeError = "Error obteniendo información de la linea de retencion - Numero de linea: " + k;
                                       mensajeError = mensajeError + " - ID transaccion : " + idTransaccion;
                                     }
                                   }
                                   // FIN - Agregar Informacion de Percepcion
                                   cantidadLineas++;
                                 } else {
                                   // Falta Informacion Obligatoria de la Linea de la Transacción
                                   errorEncontrado = true;
                                   mensajeError = "Falta la siguiente información de la linea de la transacción: ";
                                   if (l598isEmpty(columnaIndFacturacion))
                                     mensajeError = mensajeError + "Columna de acumulación del indicador de facturacion / ";
                                   if (l598isEmpty(indicadorFacturacion))
                                     mensajeError = mensajeError + "Indicador de facturación / ";
                                   mensajeError = mensajeError + "- Numero de linea : " + k;
                                   mensajeError = mensajeError + " - ID transacción : " + idTransaccion;
                                 }
                               }
                               if ((!l598isEmpty(referenciaGlobal) && (referenciaGlobal == "T" || referenciaGlobal === true) && tipoTransaccion == "customtransaction_l598_resguardos") && !errorEncontrado) {
                                 var sublistaRefCFE = "recmachcustrecord_l598_info_referencia_transac";
                                 var sublistaRefCFELines = record_transaccion.getLineCount(sublistaRefCFE);
                                 var razonComprobanteReferencia = "";
                                 //SE AGREGA ESTA VALIDACION YA QUE LA DGI PERMITE UN MAXIMO DE 40 LINEAS DE REFERENCIAS PARA LOS COMPROBANTES
                                 if (sublistaRefCFELines > 40) {
                                   sublistaRefCFELines = 40;
                                 }
                                 for (var subListaContador = 0; subListaContador < sublistaRefCFELines && !errorEncontrado; subListaContador++) {
                                   razonComprobanteReferencia = record_transaccion.getSublistValue(sublistaRefCFE, "custrecord_l598_info_referencia_razon", subListaContador);
                                   if (!l598isEmpty(razonComprobanteReferencia)) {
                                     var infoReferencia = {
                                       indicadorRefGlobal: 1,
                                       razon: razonComprobanteReferencia,
                                     };

                                     objetoRespuesta.detalleReferencia.push(infoReferencia);
                                   }
                                 }
                               }
                             }
                             //nlapiLogExecution('DEBUG','LINE 2275','FIN PROCESO URU-RETENCIONES');
                             if (errorEncontrado == false) {
                               // INICIO - Considerar Costos de Envio
                            //    var costoEnvio = record_transaccion.getValue("shippingcost");
                               var costoEnvio = '';
                               if (l598isEmpty(costoEnvio)) {
                                 costoEnvio = "";
                               }
                               if (costoEnvio != 0.00 && costoEnvio != 0 && costoEnvio != "") {
                                 var porcentajeImpEnvio = record_transaccion.getValue("shippingtax1rate");
                                 var porcentajeImpEnvioFinal = 0;
                                 if (!l598isEmpty(porcentajeImpEnvio)) {
                                   porcentajeImpEnvioFinal = parseFloat((parseFloat(porcentajeImpEnvio, 10) / 100), 10);
                                 }
                                 var tipoImpEnvio = record_transaccion.getValue("shippingtaxcode");
                                 if (!l598isEmpty(tipoImpEnvio)) {
                                   // Busco el Tipo de Impuesto
                                   var indicadorFacturacionEnvio = "";
                                   var columnaIndicadorFacturacionEnvio = "";
                                   var filtroImpuesto = search.createFilter({
                                     name: "internalid",
                                     operator: search.Operator.IS,
                                     values: tipoImpEnvio
                                   });
                                   var columnaImpuesto = [];
                                   columnaImpuesto[0] = search.createColumn("custrecordcustitem_l598_ind_facturacion");
                                   var resultadoImpuesto = search.create({
                                     type: "salestaxitem",
                                     filters: filtroImpuesto,
                                     columns: columnaImpuesto
                                   }).run().getRange({
                                     start: 0,
                                     end: 1000
                                   });
                                   if (!l598isEmpty(resultadoImpuesto) && resultadoImpuesto.length > 0) {
                                     indicadorFacturacionEnvio = resultadoImpuesto[0].getValue("custrecordcustitem_l598_ind_facturacion");
                                     if (!l598isEmpty(indicadorFacturacionEnvio)) {
                                       columnaIndicadorFacturacionEnvio = search.lookupFields({
                                         type: "customrecord_l598_ind_fact_det",
                                         id: indicadorFacturacionEnvio,
                                         columns: ["custrecord_l598_ind_fact_det_col_acum"]
                                       });

                                       log.debug("obtenerInfoTrans", "line 2036 - columnaIndicadorFacturacionEnvio: " + JSON.stringify(columnaIndicadorFacturacionEnvio));
                                       columnaIndicadorFacturacionEnvio = getLookupFieldsSafe(columnaIndicadorFacturacionEnvio, "custrecord_l598_ind_fact_det_col_acum");

                                       if (!l598isEmpty(columnaIndicadorFacturacionEnvio)) {

                                         columnaIndicadorFacturacionEnvio = columnaIndicadorFacturacionEnvio.custrecord_l598_ind_fact_det_col_acum;

                                         switch (parseInt(columnaIndicadorFacturacionEnvio, 10)) {
                                           case 1:
                                             // Extento IVA
                                             importeExento = parseFloat((parseFloat(importeExento, 10) + parseFloat((costoEnvio), 10)), 10);
                                             break;
                                           case 2:
                                             // IVA TASA Minima
                                             importeIVATasaMinima = parseFloat(parseFloat(importeIVATasaMinima, 10) + parseFloat((parseFloat(costoEnvio, 10) * parseFloat(porcentajeImpEnvioFinal, 10)), 10), 10);
                                             importeNetoGravadoTasaMinima = parseFloat((parseFloat(importeNetoGravadoTasaMinima, 10) + parseFloat((costoEnvio), 10)), 10);
                                             break;
                                           case 3:
                                             // IVA TASA Basica
                                             importeIVATasaBasica = parseFloat(parseFloat(importeIVATasaBasica, 10) + parseFloat((parseFloat(costoEnvio, 10) * parseFloat(porcentajeImpEnvioFinal, 10)), 10), 10);
                                             importeNetoGravadoTasaBasica = parseFloat((parseFloat(importeNetoGravadoTasaBasica, 10) + parseFloat((costoEnvio), 10)), 10);
                                             break;
                                           case 4:
                                             // Otra Tasa
                                             importeIVAOtraTasa = parseFloat(parseFloat(importeIVAOtraTasa, 10) + parseFloat((parseFloat(costoEnvio, 10) * parseFloat(porcentajeImpEnvioFinal, 10)), 10), 10);
                                             importeNetoGravadoOtraTasa = parseFloat((parseFloat(importeNetoGravadoOtraTasa, 10) + parseFloat((costoEnvio), 10)), 10);
                                             break;
                                           case 5:
                                             // Entrega Gratuita
                                             break;
                                           case 6:
                                             // No Facturable
                                             //importeNoFacturable = parseFloat(parseFloat(importeNoFacturable, 10) + parseFloat(transImpImpuesto), 10);
                                             importeNoFacturable = parseFloat((parseFloat(importeNoFacturable, 10) + parseFloat((costoEnvio), 10)), 10);
                                             break;
                                           case 7:
                                             // No Facturable Negativo
                                             importeNoFacturable = parseFloat((parseFloat(importeNoFacturable, 10) - parseFloat((Math.abs(costoEnvio)), 10)), 10);
                                             break;
                                           case 8:
                                             // Item A Rebajar en Remito
                                             break;
                                           case 9:
                                             // Item A Rebajar en Resguardo
                                             break;
                                           case 10:
                                             // Exportacion Y Asimiladas
                                             importeExpYAsimiladas = parseFloat((parseFloat(importeExpYAsimiladas, 10) + parseFloat((costoEnvio), 10)), 10);
                                             break;
                                           case 11:
                                             // Impuesto Percibido/Retencion/Credito Fiscal
                                             esPercepcionRetCred = true;
                                             //importePercepciones = parseFloat((parseFloat(importePercepciones, 10) + parseFloat(parseFloat((transImpImpuesto), 10), 10)), 10);
                                             break;
                                           case 12:
                                             // IVA en Suspenso
                                             importeIVASuspenso = parseFloat(parseFloat(importeIVASuspenso, 10) + parseFloat((parseFloat(costoEnvio, 10) * parseFloat(porcentajeImpEnvioFinal, 10)), 10), 10);
                                             importeNetoGravadoIVASuspenso = parseFloat((parseFloat(importeNetoGravadoIVASuspenso, 10) + parseFloat((costoEnvio), 10)), 10);
                                             break;
                                           default:
                                             // Columna de Acumulacion Invalida
                                             errorEncontrado = true;
                                             mensajeError = "La Columna de Acumulacion del Indicador de Facturacion con Codigo : " + indicadorFacturacion + " es Invalida para el Costo de Envio";
                                             mensajeError = mensajeError + " - ID Transaccion : " + idTransaccion;
                                         }
                                         if (errorEncontrado == false) {

                                           var nombreCostoEnvio = record_transaccion.getValue("custbody_l598_nom_art_costo_env");
                                           if (l598isEmpty(nombreCostoEnvio))
                                             nombreCostoEnvio = "";
                                           var unidadMedidaCostoEnvio = record_transaccion.getValue("custbody_l598_cod_um_cost_env");
                                           if (l598isEmpty(unidadMedidaCostoEnvio))
                                             unidadMedidaCostoEnvio = "";
                                           var informacionLinea = {
                                             indicadorFacturacion: indicadorFacturacionEnvio,
                                             columnaIndFacturacion: columnaIndicadorFacturacionEnvio,
                                             indicadorAgente: "",
                                             nombreItem: nombreCostoEnvio,
                                             DescripcionAdicional: "",
                                             cantidad: parseInt(1, 10),
                                             unidadMedida: unidadMedidaCostoEnvio,
                                             precioUnitario: parseFloat(costoEnvio, 10).toFixedOK(2),
                                             descuentoEnPorcentaje: 0,
                                             montoDescuento: 0,
                                             recargoEnPorcentaje: 0,
                                             montoRecargo: 0,
                                             montoItem: parseFloat(costoEnvio, 10).toFixedOK(2),
                                           };

                                           log.debug("obtenerInfoTrans", "line 2121 - informacionLinea: " + JSON.stringify(informacionLinea));
                                           objetoRespuesta.detalleLineas.push(informacionLinea);
                                           cantidadLineas++;
                                         }
                                       } else {
                                         errorEncontrado = true;
                                         mensajeError = "Error obteniendo la Columna de Acumulacion del Indicador de Facturacion para el Costo de Envio";
                                         mensajeError = mensajeError + " - ID Transaccion : " + idTransaccion;
                                       }
                                     } else {
                                       errorEncontrado = true;
                                       mensajeError = "Error obteniendo el Indicador de Facturacion para el Costo de Envio";
                                       mensajeError = mensajeError + " - ID Transaccion : " + idTransaccion;
                                     }
                                   } else {
                                     errorEncontrado = true;
                                     mensajeError = "Error obteniendo el Indicador de Facturacion para el Costo de Envio";
                                     mensajeError = mensajeError + " - ID Transaccion : " + idTransaccion;
                                   }
                                 } else {
                                   errorEncontrado = true;
                                   mensajeError = "Error obteniendo el Tipo de Impuesto para el Costo de Envio";
                                   mensajeError = mensajeError + " - ID Transaccion : " + idTransaccion;
                                 }
                               }
                               // FIN - Considerar Costos de Envio													
                             }
                             /* if(errorEncontrado==false) { //Inicio - Verificación de URU-INDICADOR IVA LINEAS DETALLE
                                                                                      if (!l598isEmpty(indicadorMontosBrutosUCFE) && indicadorMontosBrutosUCFE == 1) {
                                                                                          if (!l598isEmpty(importeNetoGravadoTasaMinima) && importeNetoGravadoTasaMinima > 0) {
                                                                                              var divisor = parseFloat(1 + (parseFloat(tasaMinimaIVA, 10)/100), 10).toFixedOK(2);
                                                                                              nlapiLogExecution('AUDIT', 'buscarInformacionFE', 'LINE 2563 - importeNetoGravadoTasaMinima: ' + importeNetoGravadoTasaMinima + ' - tasaMinimaIVA: ' + tasaMinimaIVA + ' - divisor: ' + divisor + ' - importeIVATasaMinima: ' + importeIVATasaMinima);
                                                                                              importeNetoGravadoTasaMinima = parseFloat(importeNetoGravadoTasaMinima/divisor, 10);
                                                                                              importeIVATasaMinima = parseFloat(importeIVATasaMinima/divisor, 10);
                                                                                              nlapiLogExecution('AUDIT', 'buscarInformacionFE', 'LINE 2566 - importeNetoGravadoTasaMinima: ' + importeNetoGravadoTasaMinima + ' - tasaMinimaIVA: ' + tasaMinimaIVA + ' - divisor: ' + divisor + ' - importeIVATasaMinima: ' + importeIVATasaMinima);
                                                                                          }
                                                                                          if (!l598isEmpty(importeNetoGravadoTasaBasica) && importeNetoGravadoTasaBasica > 0) {
                                                                                              var divisor = parseFloat(1 + (parseFloat(tasaBasicaIVA, 10)/100), 10).toFixedOK(2);
                                                                                              nlapiLogExecution('AUDIT', 'buscarInformacionFE', 'LINE 2569 - importeNetoGravadoTasaBasica: ' + importeNetoGravadoTasaBasica + ' - tasaBasicaIVA: ' + tasaBasicaIVA + ' - divisor: ' + divisor + ' - importeIVATasaBasica: ' + importeIVATasaBasica);
                                                                                              importeNetoGravadoTasaBasica = parseFloat(importeNetoGravadoTasaBasica/divisor, 10);
                                                                                              importeIVATasaBasica = parseFloat(importeIVATasaBasica/divisor, 10);
                                                                                              nlapiLogExecution('AUDIT', 'buscarInformacionFE', 'LINE 2573 - importeNetoGravadoTasaBasica: ' + importeNetoGravadoTasaBasica + ' - tasaBasicaIVA: ' + tasaBasicaIVA + ' - divisor: ' + divisor + ' - importeIVATasaBasica: ' + importeIVATasaBasica);
                                                                                          }
                                                                                      }
                                                                                  } */
                             if (errorEncontrado == false) {
                               // Se agregan campos de detalle para Customer Payment
                               if (tipoTransaccion == "customerpayment" || tipoTransaccion == "customtransaction_l598_anulacion_cobranz" || tipoTransaccion == "customerdeposit" || tipoTransaccion == "customerrefund") {
                                 var informacionLinea = {};
                                 var pagoImporte = "";
                                 var indicadorFact = "";
                                 if (tipoTransaccion == "customerpayment") {
                                   pagoImporte = parseFloat(record_transaccion.getValue("payment"), 10).toFixedOK(2);
                                   informacionLinea.nombreItem = infoCobranza.conceptoFacturacionCobranza;
                                   indicadorFact = infoCobranza.idFacturacionCobranza;
                                 } else if (tipoTransaccion == "customtransaction_l598_anulacion_cobranz") {
                                   pagoImporte = parseFloat(record_transaccion.getValue("custbody_l598_total_pago_anulado"), 10).toFixedOK(2);
                                   informacionLinea.nombreItem = infoCobranza.conceptoCobranzaAnulacion;
                                   indicadorFact = infoCobranza.idFacturacionCobranza;
                                 }
                                 if (tipoTransaccion == "customerdeposit") {
                                   pagoImporte = parseFloat(record_transaccion.getValue("payment"), 10).toFixedOK(2);
                                   informacionLinea.nombreItem = infoCobranza.conceptoDeposito;
                                   indicadorFact = infoCobranza.idFacturacionDepositoReembolso;
                                 } else if (tipoTransaccion == "customerrefund") {
                                   pagoImporte = parseFloat(record_transaccion.getValue("total"), 10).toFixedOK(2);
                                   informacionLinea.nombreItem = infoCobranza.conceptoReembolso;
                                   indicadorFact = infoCobranza.idFacturacionDepositoReembolso;
                                 }
                                 informacionLinea.indicadorFacturacion = indicadorFact;
                                 informacionLinea.precioUnitario = pagoImporte;
                                 informacionLinea.DescripcionAdicional = "descripcionLinea";
                                 informacionLinea.indicadorAgente = "";
                                 informacionLinea.unidadMedida = "N/A";
                                 informacionLinea.cantidad = 1;
                                 informacionLinea.montoItem = pagoImporte;
                                 objetoRespuesta.detalleLineas.push(informacionLinea);
                                 // objetoRespuesta.informacionTotalesEncabezado.montoNoFacturable = pagoImporte;
                                 importeNoFacturable = pagoImporte;
                                 cantidadLineas = 1;
                                 log.debug("obtenerInformacionTransaccionesFE", "detalleLineas cobranza: " + JSON.stringify(objetoRespuesta.detalleLineas));
                               }
                               // Genero el Objeto de Respuesta
                               objetoRespuesta.informacionTotalesEncabezado.totalMontoNoGravado = parseFloat((parseFloat(importeExento, 10) + parseFloat(importeNoGravado, 10)), 10).toFixedOK(2);
                               objetoRespuesta.informacionTotalesEncabezado.totalMontoExpYAsimiladas = parseFloat(importeExpYAsimiladas, 10).toFixedOK(2);
                               objetoRespuesta.informacionTotalesEncabezado.totalMontoImpuestoPercibido = parseFloat(importePercepciones, 10).toFixedOK(2);
                               objetoRespuesta.informacionTotalesEncabezado.totalMontoIVASuspenso = parseFloat(importeIVASuspenso, 10).toFixedOK(2);
                               objetoRespuesta.informacionTotalesEncabezado.totalMontoIVATasaMinima = parseFloat(importeNetoGravadoTasaMinima, 10).toFixedOK(2);
                               objetoRespuesta.informacionTotalesEncabezado.totalMontoIVATasaBasica = parseFloat(importeNetoGravadoTasaBasica, 10).toFixedOK(2);
                               objetoRespuesta.informacionTotalesEncabezado.totalMontoIVAOtraTasa = parseFloat(importeNetoGravadoOtraTasa, 10).toFixedOK(2);
                               objetoRespuesta.informacionTotalesEncabezado.porcentajeTasaMinima = parseFloat(tasaMinimaIVA, 10).toFixedOK(2);
                               objetoRespuesta.informacionTotalesEncabezado.porcentajeTasaBasica = parseFloat(tasaBasicaIVA, 10).toFixedOK(2);
                               objetoRespuesta.informacionTotalesEncabezado.totalIVATasaMinima = parseFloat(importeIVATasaMinima, 10).toFixedOK(2);
                               objetoRespuesta.informacionTotalesEncabezado.totalIVATasaBasica = parseFloat(importeIVATasaBasica, 10).toFixedOK(2);
                               objetoRespuesta.informacionTotalesEncabezado.totalIVAOtraTasa = parseFloat(importeIVAOtraTasa, 10).toFixedOK(2);
                               var montoTransaccionTOTAL = parseFloat((parseFloat(importeExento, 10) + parseFloat(importeNoGravado, 10) + parseFloat(importeExpYAsimiladas, 10) + parseFloat(importePercepciones, 10) +
                                 parseFloat(importeNetoGravadoIVASuspenso, 10) + parseFloat(importeNetoGravadoTasaMinima, 10) + parseFloat(importeNetoGravadoTasaBasica, 10) +
                                 parseFloat(importeNetoGravadoOtraTasa, 10) + parseFloat(parseFloat(importeIVATasaMinima, 10).toFixedOK(2), 10) + parseFloat(parseFloat(importeIVATasaBasica, 10).toFixedOK(2), 10) + parseFloat(parseFloat(importeIVAOtraTasa, 10).toFixedOK(2), 10)), 10);
                               objetoRespuesta.informacionTotalesEncabezado.totalMontoTotal = parseFloat(montoTransaccionTOTAL, 10).toFixedOK(2);
                               objetoRespuesta.informacionTotalesEncabezado.totalMontoRetenido = parseFloat(importeRetenidoPercibido, 10).toFixedOK(2);
                               objetoRespuesta.informacionTotalesEncabezado.totalCreditosFiscales = parseFloat(importeCreditosFiscales, 10).toFixedOK(2);
                               objetoRespuesta.informacionTotalesEncabezado.cantidadLineas = cantidadLineas;
                               var montoNoFacturable = parseFloat(importeNoFacturable, 10);
                               objetoRespuesta.informacionTotalesEncabezado.montoNoFacturable = parseFloat(montoNoFacturable, 10).toFixedOK(2);
                               objetoRespuesta.informacionTotalesEncabezado.montoTotalAPagar = parseFloat((parseFloat(montoTransaccionTOTAL, 10) + parseFloat(importeRetenidoPercibido, 10) + parseFloat(montoNoFacturable, 10)), 10).toFixedOK(2);
                               // Inicio para Comprobante Asociado
                               var referenciaGloabal = nvl(resultadoIndividualParte2.getValue(columnsParte2[47]), "");
                               var tipoComprobanteReferencia = nvl(resultadoIndividualParte2.getValue(columnsParte2[46]), "");
                               var serieComprobanteReferencia = nvl(resultadoIndividualParte2.getValue(columnsParte2[57]), "");
                               var nroComprobanteReferencia = nvl(resultadoIndividualParte2.getValue(columnsParte2[48]), 0);
                               var fechaComprobanteReferencia = nvl(resultadoIndividualParte2.getValue(columnsParte2[49]), "");
                               var montoComprobanteReferencia = nvl(resultadoIndividualParte2.getValue(columnsParte2[86]), 0)
                               var monedaComprobanteReferencia = nvl(resultadoIndividualParte2.getValue(columnsParte2[87]), "");
                               var tipocambioComprobanteReferencia = nvl(resultadoIndividualParte2.getValue(columnsParte2[88]), "");
                               var razonComprobanteReferencia = nvl(resultadoIndividualParte2.getValue(columnsParte2[50]), "");
                               if ((!l598isEmpty(referenciaGloabal) && (referenciaGloabal == "T" || referenciaGloabal === true) && tipoTransaccion != "customtransaction_l598_resguardos") || (!l598isEmpty(tipoComprobanteReferencia) && (!l598isEmpty(nroComprobanteReferencia) && nroComprobanteReferencia > 0))) {
                                 var infoReferencia = {};
                                 if ((!l598isEmpty(referenciaGloabal) && (referenciaGloabal == "T" || referenciaGloabal === true))) {
                                   infoReferencia.indicadorRefGlobal = 1;
                                   infoReferencia.tipoCFE = "";
                                   infoReferencia.serie = "";
                                   infoReferencia.numero = 0;
                                   infoReferencia.fecha = "";
                                   infoReferencia.monto = "0.00";
                                   infoReferencia.moneda = "";
                                   infoReferencia.tipocambio = "1.00";
                                   infoReferencia.razon = razonComprobanteReferencia;
                                 } else {
                                   infoReferencia.indicadorRefGlobal = 0;
                                   infoReferencia.tipoCFE = tipoComprobanteReferencia;
                                   infoReferencia.serie = serieComprobanteReferencia;
                                   infoReferencia.numero = nroComprobanteReferencia;
                                   infoReferencia.fecha = fechaComprobanteReferencia;
                                   infoReferencia.monto = parseFloat(montoComprobanteReferencia, 10).toFixedOK(2);
                                   infoReferencia.moneda = monedaComprobanteReferencia;
                                   infoReferencia.tipocambio = tipocambioComprobanteReferencia;
                                   infoReferencia.razon = razonComprobanteReferencia;
                                 }
                                 objetoRespuesta.detalleReferencia.push(infoReferencia);
                               }
                               if (tipoTransaccion == "customerpayment" || tipoTransaccion == "customerdeposit") {
                                 var referenciasPago = obtenerReferenciasPago(record_transaccion);
                                 log.debug("obteneReferencias", "obtenerReferenciasPago RESPONSE: " + JSON.stringify(referenciasPago));
                                 if (!referenciasPago.error) {
                                   objetoRespuesta.detalleReferencia = referenciasPago.data;
                                 }
                               }
                               // Fin Para Comprobante Asociado
                             } else {
                               objetoRespuesta.error = true; // Hubo Error;
                               objetoRespuesta.tipo = codigoError;
                               objetoRespuesta.mensaje = mensajeError;
                               log.error("URU - Factura Electronica", mensajeError);
                             }
                           } else {
                             //El tipo de transaccion que intenta enviar supera la cantidad de lineas permitidas para la misma por DGI. Cantidad de lineas permitidas: 700 0 250 de acuerdo al tipo de transaccion
                             var cantidadLineasPermitidas = esETicket ? 700 : 250;
                             var mensaje = "El tipo de transacción que intenta enviar supera la cantidad de líneas permitidas para la misma por DGI. Cantidad de líneas permitidas: " + cantidadLineasPermitidas;
                             objetoRespuesta.error = true;
                             objetoRespuesta.tipo = tipoMensajeError;
                             objetoRespuesta.mensaje = mensaje;
                             log.error("URU - Factura Electronica", mensaje);
                           }
                           /*} else {
                                                                                  // Debo devolver error;
                                                                                  var mensaje = "Los Importes Total,Subtotal e Importe de Impuestos de la Transaccion no pueden ser vacios - ID Transaccion : " + idTransaccion;
                                                                                  objetoRespuesta.error = true;
                                                                                  objetoRespuesta.tipo = tipoMensajeError;
                                                                                  objetoRespuesta.mensaje = mensaje;
                                                                                  log.error('URU - Factura Electronica', mensaje);
                                                                              }*/
                         } else {
                           // Falta Configurar Tasa Minima de IVA / Tasa Basica de IVA en la Transacción
                           var mensaje = "";
                           if (l598isEmpty(tasaMinimaIVA) && l598isEmpty(tasaBasicaIVA)) {
                             mensaje = "Falta Configurar La Tasa Minima de IVA y La Tasa Basica de IVA en la Transacción";
                           } else {
                             if (l598isEmpty(tasaMinimaIVA)) {
                               mensaje = "Falta Configurar La Tasa Minima de IVA en la Transacción";
                             } else {
                               mensaje = "Falta Configurar La Tasa Basica de IVA en la Transacción";
                             }
                           }
                           mensaje = mensaje + " - ID Transaccion : " + idTransaccion;
                           objetoRespuesta.error = true;
                           objetoRespuesta.tipo = tipoMensajeError;
                           objetoRespuesta.mensaje = mensaje;
                           log.error("URU - Factura Electronica", mensaje);
                         }
                       } else {
                         // Falta Configurar Tipo de Cambio de la Transacción
                         var mensaje = "Falta Configurar El Tipo de Cambio de la Transaccion - ID Transaccion : " + idTransaccion;
                         objetoRespuesta.error = true;
                         objetoRespuesta.tipo = tipoMensajeError;
                         objetoRespuesta.mensaje = mensaje;
                         log.error("URU - Factura Electronica", mensaje);
                       }
                     } else {
                       // Falta Configurar Moneda de la Transacción o Codigo ISO de Moneda
                       var mensaje = "Falta Configurar Moneda de la Transacción o el Codigo ISO de Moneda en la Configuracion de Monedas - ID Transaccion : " + idTransaccion;
                       objetoRespuesta.error = true;
                       objetoRespuesta.tipo = tipoMensajeError;
                       objetoRespuesta.mensaje = mensaje;
                       log.error("URU - Factura Electronica", mensaje);
                     }
                   } else {
                     // Falta Informacion de Nombre,Direccion,Ciudad,Provincia,Pais del Cliente
                     var mensaje = "Falta Configurar la siguiente informacion Requerida del Cliente : ";
                     if (l598isEmpty(objetoRespuesta.informacionCliente.clienteNombre))
                       mensaje = mensaje + " Nombre o Denominacion del Cliente / ";
                     if (l598isEmpty(objetoRespuesta.informacionCliente.clienteDireccion))
                       mensaje = mensaje + " Direccion del Cliente / ";
                     if (l598isEmpty(objetoRespuesta.informacionCliente.clienteCiudad))
                       mensaje = mensaje + " Ciudad del Cliente / ";
                     if (esComprobanteExportacion == true) {
                       if (l598isEmpty(objetoRespuesta.informacionCliente.clienteProvincia))
                         mensaje = mensaje + " Provincia del Cliente / ";
                       if (l598isEmpty(objetoRespuesta.informacionCliente.clientePais))
                         mensaje = mensaje + " Pais del Cliente / ";
                     }
                     mensaje = mensaje + " - ID Transaccion : " + idTransaccion;
                     //objetoRespuesta.error = true;
                     objetoRespuesta.tipo = tipoMensajeError;
                     objetoRespuesta.mensaje = mensaje;
                     log.error("URU - Factura Electronica", mensaje);
                   }
                 } else {
                   // Falta Configurar Pais de Origen o Codigo de Pais
                   var mensaje = "Falta Configurar Pais de Origen o Codigo de Pais del Cliente  - ID Transaccion : " + idTransaccion;
                   //objetoRespuesta.error = true;
                   objetoRespuesta.tipo = tipoMensajeError;
                   objetoRespuesta.mensaje = mensaje;
                   log.error("URU - Factura Electronica", mensaje);
                 }
               } else {
                 // Falta Configurar Tipo de Documento del Cliente
                 var mensaje = "Falta Configurar Tipo de Documento del Cliente - ID Transaccion : " + idTransaccion;
                 //objetoRespuesta.error = true;
                 objetoRespuesta.tipo = tipoMensajeError;
                 objetoRespuesta.mensaje = mensaje;
                 log.error("URU - Factura Electronica", mensaje);
               }
             } else {
               // Falta Ingresar Clausula de Venta,Modalidad de Venta , Via de Transporte Requerido para Comprobantes de Exportacion
               var mensaje = "Falta Ingresar la siguiente informacion Requerida para las Transacciones de Exportacion : ";
               if (l598isEmpty(objetoRespuesta.informacionEncabezado.clausulaDeVenta)) {
                 mensaje = mensaje + " Clausula de Venta / ";
                 objetoRespuesta.informacionEncabezado.clausulaDeVenta = "";
               }
               if (l598isEmpty(objetoRespuesta.informacionEncabezado.modalidadDeVenta)) {
                 mensaje = mensaje + " Modalidad de Venta / ";
                 objetoRespuesta.informacionEncabezado.modalidadDeVenta = "";
               }
               if (!l598isEmpty(objetoRespuesta.informacionEncabezado.modalidadDeVenta) && objetoRespuesta.informacionEncabezado.modalidadDeVenta == 0) {
                 mensaje = mensaje + " Modalidad de Venta (Sin Definir) Invalida para Comprobantes de Exportacion / ";
                 objetoRespuesta.informacionEncabezado.modalidadDeVenta = "";
               }
               if (l598isEmpty(objetoRespuesta.informacionEncabezado.viaDeTransporte)) {
                 mensaje = mensaje + " Via de Transporte / ";
                 objetoRespuesta.informacionEncabezado.viaDeTransporte = "";
               }
               if (!l598isEmpty(objetoRespuesta.informacionEncabezado.viaDeTransporte) && objetoRespuesta.informacionEncabezado.viaDeTransporte == 0) {
                 mensaje = mensaje + " Via de Transporte (Sin Definir) Invalida para Comprobantes de Exportacion / ";
                 objetoRespuesta.informacionEncabezado.viaDeTransporte = "";
               }
               mensaje = mensaje + " - ID Transaccion : " + idTransaccion;
               //objetoRespuesta.error = true;
               objetoRespuesta.tipo = tipoMensajeError;
               objetoRespuesta.mensaje = mensaje;
               log.error("URU - Factura Electronica", mensaje);
             }
           } else {

             var mensaje = "Falta Configurar la siguiente informacion Requerida del Comprobante de cuenta ajena : ";
             if (esComprobanteCuentaAjena == true) {
               if (l598isEmpty(objetoRespuesta.informacionComplementoFiscal.nroDocCuentaAjena)) {
                 mensaje += " Número de Documento de la Empresa de Cuenta Ajena / ";
               }
               if (l598isEmpty(objetoRespuesta.informacionComplementoFiscal.razonSocialCtaAjena)) {
                 mensaje += " Nombre o Denominacion de la Empresa de Cuenta Ajena / ";
               }
               if (l598isEmpty(objetoRespuesta.informacionComplementoFiscal.codTipoDocEmpCtaAjena)) {
                 mensaje += " Código de tipo documento de la Empresa de Cuenta Ajena / ";
               }
               if (l598isEmpty(objetoRespuesta.informacionComplementoFiscal.codigoPaisEmpCtaAjena)) {
                 mensaje += " Código país de la Empresa de Cuenta Ajena / ";
               }
             }
             mensaje += " - ID Transaccion : " + idTransaccion;
             //objetoRespuesta.error = true;
             objetoRespuesta.tipo = tipoMensajeError;
             objetoRespuesta.mensaje = mensaje;
             log.error("URU - Factura Electronica", mensaje);
           }
         } else {
           var mensaje = "Falta Configurar la Forma de Pago de la Transaccion - ID Transaccion : " + idTransaccion;
           //objetoRespuesta.error = true;
           objetoRespuesta.tipo = tipoMensajeError;
           objetoRespuesta.mensaje = mensaje;
           log.error("URU - Factura Electronica", mensaje);
         }

       } else {
         var mensaje = "Falta Configurar la Fecha de la Transaccion - ID Transaccion : " + idTransaccion;
         objetoRespuesta.error = true;
         objetoRespuesta.tipo = tipoMensajeError;
         objetoRespuesta.mensaje = mensaje;
         log.error("URU - Factura Electronica", mensaje);
       }
     } catch (excepcion) {
       var mensaje = "Excepcion Obteniendo Informacion de la Transaccion - ID Interno Transaccion : " + idTransaccion + " Excepcion : " + excepcion.message;
       objetoRespuesta.error = true; // Hubo Error;
       objetoRespuesta.tipo = tipoMensajeError;
       objetoRespuesta.mensaje = mensaje;
       log.error("URU - Factura Electronica", mensaje);
     }
     log.debug("URU - Factura Electronica", "objetoRespuesta: " + JSON.stringify(objetoRespuesta));
     return objetoRespuesta;
   }


   return {
     post: doPost
   };
 });