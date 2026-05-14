/**
 *@NApiVersion 2.0
 *@NScriptType Restlet
 */
define(["N/log", "N/record", "N/runtime", "N/search", "N/format"],
  function (log, record, runtime, search, format) {
    /* eslint-disable no-var */
    /* global define */
    /***
     * Migrado L598 Grabar Detalle LOG Proceso FE V2 desde L598-Middleware-FacturaElectronica solo funcion POST y dependencias.
     */
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


    /**
    * Función migrada grabarDetalleLogFE(informacionTransaccion)
    */
    function doPost(requestBody) {
      // var objetoRespuesta = {
      //   error : false,
      //   tipo : "FMSJ-1",
      // };
      try {
        //var indiceTransacciones=0;
        // Genero la Fecha
        var fechaProceso = new Date();
        var myDate3 = format.format({ value: new Date(), type: format.Type.DATETIMETZ, timezone: format.Timezone.AMERICA_BUENOS_AIRES });
        var objGet = runtime.getCurrentScript();
        var unidadesDisponibles = objGet.getRemainingUsage();
        log.audit("URU - FE Grabar Registro Detalle Log", "INICIO Proceso - " + fechaProceso + " Tiempo : " + fechaProceso + " Unidades Disponibles : " + unidadesDisponibles);
        if (!l598isEmpty(requestBody)) {
          var informacion = JSON.parse(requestBody);
          if (informacion != null && informacion != "") {
            var infoLote = informacion.infoLote;
            if (!l598isEmpty(infoLote) && infoLote.length > 0) {
              // Obtener Listado de Mensajes de Log
              var arragloMensajesLog = obtenerArregloMensajesLog();
              log.debug('grabarDetalleLog', 'arragloMensajesLog.length: ' + arragloMensajesLog.length);
              for (var i = 0; i < infoLote.length; i++) {
                // var errorCargaRegistro = false;
                log.debug('grabarDetalleLog', 'indice: ' + i + ' / infoLote: ' + JSON.stringify(infoLote[i]));
                var idError = infoLote[i].idError;
                var idInternoLog = infoLote[i].idInternoLog;
                // var fecha = fechaProceso;
                var descripcionError = infoLote[i].descripcionError;
                var idTransaccion = infoLote[i].idTransaccion;
                if (!l598isEmpty(idInternoLog) && !l598isEmpty(idError)) {
                  var idInternoMensaje = obtener_mensaje(arragloMensajesLog, idError);

                  var descripcionErrorFinal = "";
                  if (!l598isEmpty(descripcionError)) {
                    descripcionErrorFinal = descripcionError.substring(0, 3997);
                  }
                  var record_log = record.create({ type: "customrecord_l598_fact_elec_dlog" });
                  if (!l598isEmpty(record_log)) {
                    if (!l598isEmpty(idInternoMensaje)) {
                      record_log.setValue("custrecord_l598_fact_elec_dlog_msg", idInternoMensaje);
                    } else {
                      log.error("URU- FE Grabar Registro Detalle Log", "Error Obteniendo el ID Interno del Mensaje de Log con Codigo de Mensaje : " + idError);
                    }
                    record_log.setValue({ fieldId: "custrecord_l598_fact_elec_dlog_fecha", value: myDate3 });
                    record_log.setValue({ fieldId: "custrecord_l598_fact_elec_dlog_rlog", value: idInternoLog });
                    if (!l598isEmpty(descripcionErrorFinal)) {
                      record_log.setValue("custrecord_l598_fact_elec_dlog_det", descripcionErrorFinal);
                    }
                    if (!l598isEmpty(idTransaccion)) {
                      record_log.setValue("custrecord_l598_fact_elec_dlog_rtrans", idTransaccion);
                    }
                    var _idRT = record_log.save();
                  }
                } else {
                  log.error("URU - FE Grabar Registro Detalle Log", "No Se recibio Informacion de ID Log y Codigo de Mensaje");
                }
              }
            } else {
              log.error("URU - FE Grabar Registro Detalle Log", "No Se recibio Informacion de Detalle de Logs A Grabar");
            }
          } else {
            log.error("URU - FE Grabar Registro Detalle Log", "No Se recibio Informacion de Detalle de Logs A Grabar");
          }
        } else {
          log.error("URU - FE Grabar Registro Detalle Log", "No Se recibio Informacion de Detalle de Logs A Grabar");
        }
      } catch (e) {
        log.error("URU - FE Grabar Registro Detalle Log", "Excepcion Grabando Detalle de Log de Factura Electronica - Excepcion :  " + e.message);
      }
      log.audit("URU - FE Grabar Registro Detalle Log", "FIN Proceso - ");
      //var respuestaCliente = JSON.stringify(objetoRespuesta);
      //response.setContentType('JSON');
      //response.writeLine(respuestaCliente);
      //return respuestaCliente;
    }
    function obtenerArregloMensajesLog() {
      var informacionArregloMensajesLog = new Array();
      var filtroMensajesLog = new Array();
      filtroMensajesLog[0] = search.createFilter({
        name: "isinactive",
        operator: search.Operator.IS,
        values: false
      });
      var columnasMensajesLog = new Array();
      columnasMensajesLog[0] = search.createColumn("internalid");
      columnasMensajesLog[1] = search.createColumn("custrecord_l598_msg_log_codigo");
      var resultadosMensajesLog = search.create({
        type: "customrecord_l598_msg_log",
        filters: filtroMensajesLog,
        columns: columnasMensajesLog
      }).run().getRange({
        start: 0,
        end: 1000
      });

      if (resultadosMensajesLog != null && resultadosMensajesLog.length > 0) {
        for (var i = 0; i < resultadosMensajesLog.length; i++) {
          informacionArregloMensajesLog[i] = {};
          informacionArregloMensajesLog[i].idInterno = resultadosMensajesLog[i].getValue("internalid");
          informacionArregloMensajesLog[i].codigo = resultadosMensajesLog[i].getValue("custrecord_l598_msg_log_codigo");
        }
      }
      return informacionArregloMensajesLog;
    }
    function obtener_mensaje(arregloMensajes, codigo) {
      var idInternoMensaje = "";
      if (arregloMensajes != null && arregloMensajes.length > 0 && !l598isEmpty(codigo)) {
        var resultadoMensajes = arregloMensajes.filter(function (obj) {
          return (obj.codigo === codigo);
        });
        if (!l598isEmpty(resultadoMensajes) && resultadoMensajes.length > 0) {
          idInternoMensaje = resultadoMensajes[0].idInterno;
          return idInternoMensaje;
        } else {
          return null;
        }
      } else {
        return null;
      }
    }
    return {
      post: doPost
    };
  });