/**
 *@NApiVersion 2.1
 *@NAmdConfig /SuiteScripts/configuration_l598.json
 *@NScriptType ClientScript
 *@NModuleScope Public
 */
 define(["N/log", "N/search", "L598/utilities"],
 function (log, search, utilities) {
   /* global define */
   /***
    * Migrado desde L598_CS.js, la funcion l598pageInitTransaction, l598saveTransaction, l598changeFieldTransaction y l598validarLinea
    */
   function l598isEmpty(value) {
     return value === "" || value === null || value === undefined || value === "null" || value === "undefined";
   }

   function l598esOneworld() {
     const filters = [search.createFilter({
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

     const searchresults = search.create({
       type: "customrecord_l598_datos_impositivos_emp",
       filters: filters
     }).run().getRange({
       start: 0,
       end: 1000
     });

     if (searchresults != null && searchresults.length > 0) {
       return true;
     } else {
       return false;
     }
   }

   function getSucursalxLocation(subsidiaria) {

     const sucursarxLocation = {
       porLocation: false,
       sucursalDefault: 1,
       // sucursarxLocation.serieDefault=1;
     };


     let i = 0;
     let j = 0;
     const filters = new Array();
     filters[i++] = search.createFilter({
       name: "isinactive",
       operator: search.Operator.IS,
       values: false
     });

     if (!l598isEmpty(subsidiaria)) {
       filters[i++] = search.createFilter({
         name: "custrecord_l598_dat_imp_subsidiaria",
         operator: search.Operator.IS,
         values: subsidiaria
       });
     }

     const columns = new Array();
     columns[j++] = search.createColumn("custrecord_l598_dat_imp_num_location");
     columns[j++] = search.createColumn("custrecord_l598_dat_imp_suc_default");
     // columns[j++] = new nlobjSearchColumn("custrecord_l598_dat_imp_serie_default");

     const searchresults = search.create({
       type: "customrecord_l598_datos_impositivos_emp",
       filters: filters,
       columns: columns
     }).run().getRange({
       start: 0,
       end: 1000
     });

     if (searchresults != null && searchresults.length > 0) {
       const sucPorLocation = searchresults[0].getValue("custrecord_l598_dat_imp_num_location");
       const sucDefault = searchresults[0].getValue("custrecord_l598_dat_imp_suc_default");
       // var serieDefault = searchresults[0].getValue('custrecord_l598_dat_imp_serie_default');

       if (!l598isEmpty(sucPorLocation) && (sucPorLocation == "T" || sucPorLocation === true)) {
         sucursarxLocation.porLocation = true;
       }
       // Asignar Sucursal Por Defecto
       if (!l598isEmpty(sucDefault)) {
         sucursarxLocation.sucursalDefault = sucDefault;
       }
       // Asignar Serie Por Defecto
       /* if(!l598isEmpty(serieDefault)){
                sucursarxLocation.serieDefault=serieDefault;
            } */
     }

     return sucursarxLocation;
   }

   function getSucursal(subsidiaria, categoriaSucursal) {

     const informacionSucursal = {
       sucursal: 1, // Sucursal default: 1
       // informacionSucursal.serie=1;// Serie default: 1 - A
       // informacionSucursal.caja=1;// Serie default: 1 - A
     };
     let categoriaVacio = false;

     let i = 0;

     // Obtengo la Sucursal
     const filters = new Array();
     filters[i++] = search.createFilter({
       name: "isinactive",
       operator: search.Operator.IS,
       values: false
     });

     if (!l598isEmpty(subsidiaria))
       filters[i++] = search.createFilter({
         name: "custrecord_l598_sucursales_subsidiaria",
         operator: search.Operator.IS,
         values: subsidiaria
       });

     //Si la empresa utiliza Sucursal por location, filtro categoria de Sucursal
     const objSucursalxLocation = getSucursalxLocation(subsidiaria);
     log.debug("getSucursal", "objSucursalxLocation: " + JSON.stringify(objSucursalxLocation) + " - categoria: " + categoriaSucursal);

     if (objSucursalxLocation != null) {

       if (!l598isEmpty(objSucursalxLocation.sucursalDefault)) {
         informacionSucursal.sucursal = objSucursalxLocation.sucursalDefault;
         // nlapiLogExecution('DEBUG','getSucursal','existe sucursal en datos impositivos - id informacionSucursal.sucursal: '+informacionSucursal.sucursal);
       }

       /* if(!l598isEmpty(objSucursalxLocation.serieDefault)){
                informacionSucursal.serie=objSucursalxLocation.serieDefault;
            } */

       if (!l598isEmpty(objSucursalxLocation.porLocation) && (objSucursalxLocation.porLocation == true || objSucursalxLocation.porLocation == "T")) {

         if (l598isEmpty(categoriaSucursal)) {
           categoriaVacio = true;
           // categoriaSucursal = '@NONE@';
         }
       } else {
         categoriaVacio = true;
         // categoriaSucursal = '@NONE@';
       }

     } else {
       // categoriaSucursal = '@NONE@';
       return informacionSucursal;
     }

     // Si existe una categoría en la ubicación y es numerador por locación
     if (!categoriaVacio) {
       filters[i++] = search.createFilter({
         name: "custrecord_l598_sucursales_categoria",
         operator: search.Operator.IS,
         values: categoriaSucursal
       });
     } else {
       filters[i++] = search.createFilter({
         name: "internalid",
         operator: search.Operator.IS,
         values: informacionSucursal.sucursal
       });
     }

     const columns = [];
     let j = 0;
     columns[j++] = search.createColumn("internalid");
     // Serie Preferida
     columns[j++] = search.createColumn("custrecord_l598_sucursales_serie_pref");
     // Caja Preferida
     columns[j++] = search.createColumn("custrecord_l598_sucursales_caja_pref");

     const results = search.create({
       type: "customrecord_l598_sucursales",
       filters: filters,
       columns: columns
     }).run().getRange({
       start: 0,
       end: 1000
     });

     if (results != null && results.length > 0) {
       const idSucursal = results[0].getValue("internalid");
       const idSerie = results[0].getValue("custrecord_l598_sucursales_serie_pref");
       const idCaja = results[0].getValue("custrecord_l598_sucursales_serie_pref");

       if (!l598isEmpty(idSucursal)) {
         informacionSucursal.sucursal = idSucursal;
         // informacionSucursal.serie = idSerie;
         // informacionSucursal.caja = idCaja;
       }
     }

     return informacionSucursal;
   }

   function obtenerSucursal(scriptContext) {

     try {
       const objRecord = scriptContext.currentRecord;
       log.debug("obtenerSucursal", "INICIO");
       let subsidiaria = null;
       if (l598esOneworld())
         subsidiaria = objRecord.getValue("subsidiary");

       let categoriaSucursal = null;

       const locationId = objRecord.getValue("location");
       if (!l598isEmpty(locationId)) {
         categoriaSucursal = search.lookupFields({
           type: search.Type.LOCATION,
           id: locationId,
           columns: ["custrecord_l598_categoria_sucursal"]
         });
         log.debug("before lookupfieldSafe categoriaSucursal", JSON.stringify(categoriaSucursal));
         //.custrecord_l598_categoria_sucursal[0].value;
         categoriaSucursal = utilities.getLookupFieldsSafe(categoriaSucursal, "custrecord_l598_categoria_sucursal");
         log.debug("lookupfieldSafe custrecord_l598_categoria_sucursal", categoriaSucursal);
       }

       const informacionSucursal = {
         sucursal: 1, // Sucursal default: 1
         // informacionSucursal.serie=1;// Serie default: 1 - A
       };

       const infoSucursal = getSucursal(subsidiaria, categoriaSucursal);
       log.debug("obtenerSucursal", "infoSucursal: " + JSON.stringify(infoSucursal));

       if (!l598isEmpty(infoSucursal)) {
         informacionSucursal.sucursal = infoSucursal.sucursal;
         // informacionSucursal.serie=infoSucursal.serie;
       }

       return informacionSucursal;
     } catch (e) {
       log.debug("obtenerSucursal", "ERROR - MSG:" + e.message);
       log.debug("obtenerSucursal", "ERROR:" + e);
     }
   }
   function obtenerIDTipoTransNS(tipoTransNS) {
     let idTipoTransNS = "";
     if (!l598isEmpty(tipoTransNS)) {


       const filters = new Array();
       filters.push({
         name: "isinactive",
         operator: "is",
         values: false
       });
       filters.push({
         name: "custrecord_l598_tipo_trans_ns_cod",
         operator: "is",
         values: tipoTransNS
       });

       const busqueda = search.create({
         type: "customrecord_l598_tipo_trans_ns",
         columns: ["internalid"],
         filters: filters
       });

       const results = busqueda.run().getRange({
         start: 0,
         end: 1
       });


       if (results != null && results.length > 0) {

         const idTipoTransaccion = results[0].getValue("internalid");
         if (!l598isEmpty(idTipoTransaccion)) {
           idTipoTransNS = idTipoTransaccion;
         }
       }
     }
     return idTipoTransNS;
   }


   function obtenerTipoTransaccionLocal(tipoTransNS, esND) {

     const objTipoTransLocal = {
       error: false,
       mensaje: "",
       tipoTransaccionLocal: "",
       idTipoTransNS: "",
     };


     if (!l598isEmpty(tipoTransNS)) {

       const idTipoTransNS = obtenerIDTipoTransNS(tipoTransNS);

       if (!l598isEmpty(idTipoTransNS)) {

         objTipoTransLocal.idTipoTransNS = idTipoTransNS;

         let i = 0;

         const filters = new Array();
         filters[i++] = search.createFilter({
           name: "isinactive",
           operator: search.Operator.IS,
           values: false
         });
         filters[i++] = search.createFilter({
           name: "custrecord_l598_tipo_trans_loc_tipo_ns",
           operator: search.Operator.IS,
           values: idTipoTransNS
         });

         if (!l598isEmpty(esND))
           filters[i++] = search.createFilter({
             name: "custrecord_l598_tipo_trans_loc_es_nd",
             operator: search.Operator.IS,
             values: esND
           });
         else
           filters[i++] = search.createFilter({
             name: "custrecord_l598_tipo_trans_loc_es_nd",
             operator: search.Operator.IS,
             values: false
           });

         const columns = [search.createColumn("internalid")];

         const results = search.create({
           type: "customrecord_l598_tipo_trans_loc",
           filters: filters,
           columns: columns
         }).run().getRange({
           start: 0,
           end: 1000
         });

         if (results != null && results.length > 0) {

           const idTipoTransLocal = results[0].getValue("internalid");
           if (!l598isEmpty(idTipoTransLocal)) {
             objTipoTransLocal.tipoTransaccionLocal = idTipoTransLocal;
           } else {
             objTipoTransLocal.error = true;
             objTipoTransLocal.mensaje = "No se encontro la configuración del Tipo de Transacción Local para el Tipo de Transacción NetSuite: " + tipoTransNS + " Es Nota de Debito : " + esND;
           }
         } else {
           objTipoTransLocal.error = true;
           objTipoTransLocal.mensaje = "No se encontro la configuración del Tipo de Transacción Local para el Tipo de Transacción NetSuite: " + tipoTransNS + " Es Nota de Debito : " + esND;
         }
       } else {
         objTipoTransLocal.error = true;
         objTipoTransLocal.mensaje = "No se encontro la configuración del Tipo de Transacción NetSuite para el Tipo de Transacción : " + tipoTransNS;
       }
     } else {
       objTipoTransLocal.error = true;
       objTipoTransLocal.mensaje = "No se recibio el Tipo de Transaccion de NetSuite";
     }

     return objTipoTransLocal;
   }

   function obtenerTipoComprobanteFE(tipoTransLocal, esExportacion, compContingencia, compCuentaAjena, esTicket) {

     const objTipoComprobanteFE = {
       error: false,
       mensaje: "",
       tipoComprobanteFE: "",
     };

     try {
       if (!l598isEmpty(tipoTransLocal)) {
         let i = 0;

         const filters = new Array();

         filters[i++] = search.createFilter({
           name: "isinactive",
           operator: search.Operator.IS,
           values: false
         });

         filters[i++] = search.createFilter({
           name: "custrecord_l598_tipos_comprobantes_trans",
           operator: search.Operator.IS,
           values: tipoTransLocal
         });

         let comprobanteExportacion = false;
         let comprobanteCuentaAjena = false;
         let comprobanteContingencia = false;
         let comprobanteTicket = false;

         if (!l598isEmpty(esExportacion) && (esExportacion == "T" || esExportacion == true)) {
           comprobanteExportacion = true;
         }

         if (!l598isEmpty(compContingencia) && (compContingencia == "T" || compContingencia == true)) {
           comprobanteContingencia = true;
         }

         if (!l598isEmpty(compCuentaAjena) && (compCuentaAjena == "T" || compCuentaAjena == true)) {
           comprobanteCuentaAjena = true;
         }

         if (!l598isEmpty(esTicket) && (esTicket == "T" || esTicket == true)) {
           comprobanteTicket = true;
         }

         filters[i++] = search.createFilter({
           name: "custrecord_l598_tipos_comprobantes_exp",
           operator: search.Operator.IS,
           values: comprobanteExportacion
         });

         filters[i++] = search.createFilter({
           name: "custrecord_l598_tipos_comprobantes_con",
           operator: search.Operator.IS,
           values: comprobanteContingencia
         });
         filters[i++] = search.createFilter({
           name: "custrecord_l598_tipos_comprobantes_aje",
           operator: search.Operator.IS,
           values: comprobanteCuentaAjena
         });
         filters[i++] = search.createFilter({
           name: "custrecord_l598_tipos_comprobantes_tick",
           operator: search.Operator.IS,
           values: comprobanteTicket
         });

         const columns = [search.createColumn("internalid")];

         const results = search.create({
           type: "customrecord_l598_tipos_comprobantes",
           filters: filters,
           columns: columns
         }).run().getRange({
           start: 0,
           end: 1000
         });

         if (results != null && results.length > 0) {
           const tipoCompFE = results[0].getValue("internalid");
           if (!l598isEmpty(tipoCompFE)) {
             objTipoComprobanteFE.tipoComprobanteFE = tipoCompFE;
           } else {
             objTipoComprobanteFE.error = true;
             objTipoComprobanteFE.mensaje = "No se encontro la Configuracion de Tipos de Comprobantes de Factura Electronica para el Tipo de Transaccion Local con ID Interno : " + tipoTransLocal + ", comprobante exportacion: " + comprobanteExportacion;
             objTipoComprobanteFE.mensaje += ", comprobante contingencia: " + comprobanteContingencia + ", comprobante cuenta ajena: " + comprobanteCuentaAjena + ", comprobante ticket: " + comprobanteTicket;
           }
         } else {
           objTipoComprobanteFE.error = true;
           objTipoComprobanteFE.mensaje = "No se encontro la Configuracion de Tipos de Comprobantes de Factura Electronica para el Tipo de Transaccion Local con ID Interno : " + tipoTransLocal + ", comprobante exportacion: " + comprobanteExportacion;
           objTipoComprobanteFE.mensaje += ", comprobante contingencia: " + comprobanteContingencia + ", comprobante cuenta ajena: " + comprobanteCuentaAjena + ", comprobante ticket: " + comprobanteTicket;
         }
       } else {
         objTipoComprobanteFE.error = true;
         objTipoComprobanteFE.mensaje = "No se Recibio el Tipo de Transaccion Local";
       }
     } catch (error) {
       objTipoComprobanteFE.error = true;
       objTipoComprobanteFE.mensaje = "Ocurrió una excepción al intentar obtener la configuración de tipos de comprobantes de factura electrónica para el tipo de transacción local con ID interno: " + tipoTransLocal;
       log.error("obtenerTipoComprobanteFE", objTipoComprobanteFE.mensaje);
     }
     return objTipoComprobanteFE;
   }


   /*
    Funcion: l598pageInitTransaction
    */
   function pageInit(scriptContext) {

     const proceso = "pageInit";
     log.debug(proceso, "INICIO");
     try {
       if (scriptContext.mode == "create" || scriptContext.mode == "copy") {
         const objRecord = scriptContext.currentRecord;
         const createdFrom = objRecord.getValue("createdfrom");
         if (l598isEmpty(createdFrom)) {
           const infoSucursal = obtenerSucursal(scriptContext);
           if (!l598isEmpty(infoSucursal)) {
             if (!l598isEmpty(infoSucursal.sucursal)) {
               objRecord.setValue({
                 fieldId: "custbody_l598_sucursal",
                 value: infoSucursal.sucursal
               });
             }
           }
         }
       }
       log.debug(proceso, "FIN");
     } catch (e) {
       log.debug(proceso, "ERROR - MESSAGE:" + e.message);
     }
   }

   /*
    Funcion: l598saveTransaction
    */
   function saveRecord(context) {

     const proceso = "saveRecord";

     log.debug(proceso, "INICIO");

     try {
       const objRecord = context.currentRecord;
       const tipoTransStr = objRecord.type;

       if (tipoTransStr != "transferorder" && tipoTransStr != "salesorder") {

         const mensajeErrorInicial = "Error Grabando Transaccion - Error : ";
         const esND = objRecord.getValue("custbody_l598_nd");
         //   const recId = objRecord.id;

         const comprobanteContingencia = false;
         const esExportacion = objRecord.getValue("custbody_l598_trans_exportacion");
         const esETicket = objRecord.getValue("custbody_l598_trans_eticket");
         const esCuentaAjena = objRecord.getValue("custbody_l598_transac_cuenta_ajena");
         const comprobanteCuentaAjena = (!l598isEmpty(esCuentaAjena) && (esCuentaAjena == true || esCuentaAjena == "T")) ? "T" : "F";


         const tipoTransLocal = obtenerTipoTransaccionLocal(tipoTransStr, esND);

         if (tipoTransLocal == null || (tipoTransLocal != null && tipoTransLocal.error == true)) {
           alert(mensajeErrorInicial + tipoTransLocal.mensaje);
           return false;
         }

         // var tipoComprobanteFE = obtenerTipoComprobanteFE(tipoTransLocal);
         const tipoComprobanteFE = obtenerTipoComprobanteFE(tipoTransLocal.tipoTransaccionLocal, esExportacion, comprobanteContingencia, comprobanteCuentaAjena, esETicket);

         if (l598isEmpty(tipoComprobanteFE) || tipoComprobanteFE.error == true) {
           alert("Error Obteniendo el Tipo de Comprobante de Factura Electronica - Error " + tipoComprobanteFE.mensaje);
           return false;
         }
       }
       log.debug(proceso, "FIN");
       return true;
     } catch (e) {
       log.debug(proceso, "ERROR - MESSAGE:" + e.message);
       log.debug(proceso, "ERROR - MESSAGE:" + e);
     }
   }

   /*
     Funcion: l598changeFieldTransaction
     */
   function fieldChanged(scriptContext) {
     // Obtener Sucursal por Location

     const proceso = "fieldChanged";

     try {
       if (scriptContext.fieldId == "location") {
         log.debug(proceso, "into location");
         const objRecord = scriptContext.currentRecord;
         log.debug(proceso, "objRecord:" + objRecord);
         log.debug(proceso, "objRecord - JSON:" + JSON.stringify(objRecord));
         const infoSucursal = obtenerSucursal(scriptContext); // objRecord
         log.debug(proceso, "infoSucursal:" + infoSucursal);
         log.debug(proceso, "infoSucursal - JSON:" + JSON.stringify(infoSucursal));
         if (!l598isEmpty(infoSucursal)) {
           log.debug(proceso, "infoSucursal:" + infoSucursal);
           log.debug(proceso, "infoSucursal.sucursal:" + infoSucursal.sucursal);
           if (!l598isEmpty(infoSucursal.sucursal)) {
             objRecord.setValue({
               fieldId: "custbody_l598_sucursal",
               value: infoSucursal.sucursal
             });
           }
         }
       }
     } catch (e) {
       log.debug(proceso, "ERROR - MESSAGE:" + e.message);
       log.debug(proceso, "ERROR - MESSAGE:" + e);
     }

   }

   return {
     pageInit: pageInit,
     saveRecord: saveRecord,
     fieldChanged: fieldChanged,
   };

 });
