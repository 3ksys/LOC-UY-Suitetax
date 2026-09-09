/**
 *@NApiVersion 2.0
 *@NScriptType Restlet
 */

define(["N/log", "N/format", "N/search", "N/record"], function (
  log,
  format,
  search,
  record
) {
  /* eslint-disable no-var */
  /* global define*/
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
  // ! mal nombre.
  function buscarCampoPorCampo(recordType, campoBuscar, campoFiltro, valorFiltro) {
    var valor = "";
    var allNotEmpty = [recordType, campoBuscar, campoFiltro, valorFiltro].every(function (v) {
      return !l598isEmpty(v);
    });

    if (allNotEmpty) {
      var saveSearch = search.create({
        type: recordType,
        columns: [campoBuscar],
        filters: [
          {
            name: campoFiltro,
            operator: "is",
            values: valorFiltro
          }
        ]
      });

      var resultado = saveSearch.run().getRange({
        start: 0,
        end: 1
      });

      if (!l598isEmpty(resultado) && resultado.length > 0) {
        valor = resultado[0].getValue(campoBuscar);
      } else {
        valor = "";
      }
    }
    return valor;
  }

  function grabarCabeceraLogFE(informacionLog) {
    log.audit("URU - FE Grabar Registro Log", "INICIO Proceso");

    var objetoRespuesta = {
      error: false,
      warning: false,
      idRegistroNS: "",
      mensaje: "",
      insertadoOk: false,
    };

    try {

      if (informacionLog != null && informacionLog != "") {
        var informacion = JSON.parse(informacionLog);
        if (informacion != null && informacion != "") {
          if (!l598isEmpty(informacion.estado) && !l598isEmpty(informacion.fecha)) {
            // Grabo el Registro del Log
            var recordLog = record.create({
              type: "customrecord_l598_fact_elec_log",
            });


            var fechaDate = format.parse({ value: informacion.fecha, type: format.Type.DATETIMETZ });

            var fechaString = format.format({ value: fechaDate, type: format.Type.DATETIMETZ, timezone: format.Timezone.AMERICA_BUENOS_AIRES });
            recordLog.setValue({ fieldId: "custrecord_l598_fact_elec_log_fecha", value: fechaString });
            // Obtengo el ID Interno del Tipo de Estado en Base al Codigo
            var idInternoEstado = buscarCampoPorCampo("customrecord_l598_fe_est_log", "internalid", "custrecord_l598_fe_est_log_codigo", informacion.estado);
            if (!l598isEmpty(idInternoEstado)) {
              recordLog.setValue({ fieldId: "custrecord_l598_fact_elec_log_estado", value: idInternoEstado });
              if (!l598isEmpty(informacion.serie)) {
                recordLog.setValue({ fieldId: "custrecord_l598_fact_elec_log_serie", value: informacion.serie });
              }
              if (!l598isEmpty(informacion.sucursal)) {
                recordLog.setValue({ fieldId: "custrecord_l598_fact_elec_log_suc", value: informacion.sucursal });
              }
              if (!l598isEmpty(informacion.tipoComprobante)) {
                recordLog.setValue({ fieldId: "custrecord_l598_fact_elec_log_tipo_comp", value: informacion.tipoComprobante });
              }
              if (!l598isEmpty(informacion.idRegistroBD)) {
                recordLog.setValue({ fieldId: "custrecord_l598_fact_elec_log_ref_log_bd", value: informacion.idRegistroBD });
              }

              var idRL = recordLog.save({
                enablesourcing: false,
              });

              objetoRespuesta.idRegistroNS = idRL;
              objetoRespuesta.insertadoOk = true;
              log.debug("URU - FE Grabar Registro Log", "Se grabo correctamente el siguiente Registro de Log en NetSuite / Id Interno Registro Log : " + idRL);
            } else {
              // No se encontro el Estado del Log
              objetoRespuesta.error = true;
              objetoRespuesta.mensaje = "No se encontro el Estado a grabar en el Registro de Log en NetSuite / Codigo Estado : " + informacion.estado;
              log.error("URU - FE Grabar Registro Log", "No se encontro el Estado a grabar en el Registro de Log en NetSuite / Codigo Estado : " + informacion.estado);
            }

          } else {
            // No se Recibio informacion del Estado/Fecha del Log A Grabar
            objetoRespuesta.error = true;
            var mensajeGrabar = "No se recibio la siguiente informacion del Registro de Log A Grabar : ";
            if (l598isEmpty(informacion.estado))
              mensajeGrabar = mensajeGrabar + "Estado del Log / ";
            if (l598isEmpty(informacion.fecha))
              mensajeGrabar = mensajeGrabar + "Fecha del Log / ";
            log.error("URU - FE Grabar Registro Log", mensajeGrabar);
            objetoRespuesta.mensaje = mensajeGrabar;
          }
        } else {
          // No se Recibio informacion del Registro de Log A Grabar luego de Parsear el Objeto Recibido
          objetoRespuesta.error = true;
          log.error("URU- FE Grabar Registro Log", "No se Recibio informacion del Registro de Log A Grabar luego de Parsear el Objeto Recibido");
          objetoRespuesta.mensaje = "No se Recibio informacion del Registro de Log A Grabar luego de Parsear el Objeto Recibido";
        }
      } else {
        // No se Recibio Objeto Con la informacion del Registro de Log A Grabar
        objetoRespuesta.error = true;
        log.error("URU - FE Grabar Registro Log", "No se Recibio Objeto Con la informacion del Registro de Log A Grabar en NetSuite");
        objetoRespuesta.mensaje = "No se Recibio Objeto Con la informacion del Registro de Log A Grabar en NetSuite";
      }

    } catch (excepcion) {
      // Excepcion Grabando el Registro de Log en NetSuite
      objetoRespuesta.error = true;
      log.error("URU - FE Grabar Registro Log", "Excepcion Grabando el Registro de Log en NetSuite / Excepcion : " + excepcion.message);
      objetoRespuesta.mensaje = "Excepcion Grabando el Registro de Log en NetSuite / Excepcion : " + excepcion.message;
    }

    log.audit("URU - FE Grabar Registro Log", "FIN Proceso");
    var respuestaLog = JSON.stringify(objetoRespuesta);
    return respuestaLog;
  }

  return {
    post: grabarCabeceraLogFE
  };
});


