/**
 *@NApiVersion 2.0
 *@NScriptType Restlet
 */

define(["N/log", "N/email", "N/search",], function (
  log,
  email,
  search
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

  function enviarEmailFE(informacionTransaccion) {
    log.debug("URU - Factura Electronica", "Inicio Enviar Email de Finalizacion de Proceso");

    var objetoRespuesta = {
      error: false,
      tipo: "FMSJ-1", // OK
      mensaje: "",
    };


    var tipoMensajeError = "FMSJ-31";

    try {

      if (informacionTransaccion != null && informacionTransaccion != "") {

        var informacion = JSON.parse(informacionTransaccion);

        if (informacion != null && informacion != "") {

          var error = informacion.error;

          var serie = informacion.serie;
          var sucursal = informacion.sucursal;
          var tipoTransaccion = informacion.tipoComprobante;
          // var emailUsuario = informacion.emailUsuario;
          var cantidadTransaccionesProc = informacion.cantidadTransaccionesProc;
          var cantidadTransaccionesTotal = informacion.cantidadTransaccionesTotal;
          var idLog = informacion.idLog;
          var subsidiaria = informacion.subsidiaria;
          var urlLog = "";
          var urlDominio = "";
          var enviarEmail = false;
          var emailUsuario = '';

          var filtroConf = [];
          filtroConf.push({
            name: "isinactive",
            operator: "is",
            values: false
          });
          if (!l598isEmpty(subsidiaria)) {
            filtroConf.push({
              name: "custrecord_l598_conf_fe_subsidiaria",
              operator: "is",
              values: subsidiaria
            });
          }

          var configuracionSaveSearch = search.create({
            type: "customrecord_l598_conf_factura_elec",
            columns: ["custrecord_l598_conf_fe_url_dom", "custrecord_l598_conf_fe_log", "custrecord_l598_conf_fe_enviar_email", "custrecord_l598_conf_fe_empleado_notific"],
            filters: filtroConf
          });

          var resultadoConf = configuracionSaveSearch.run().getRange({
            start: 0,
            end: 1
          });

          if (!l598isEmpty(resultadoConf) && resultadoConf.length > 0) {
            urlLog = resultadoConf[0].getValue("custrecord_l598_conf_fe_log");
            urlDominio = resultadoConf[0].getValue("custrecord_l598_conf_fe_url_dom");
            enviarEmail = resultadoConf[0].getValue("custrecord_l598_conf_fe_enviar_email");
            emailUsuario = resultadoConf[0].getValue("custrecord_l598_conf_fe_empleado_notific");
            log.debug("URU - Factura Electronica", "ID Empleado : " + emailUsuario);

            if (!l598isEmpty(enviarEmail) && enviarEmail === true) {
              if (!l598isEmpty(error) && !l598isEmpty(emailUsuario)) {

                var mensaje = "<html><head></head><body><br>";
                if (error == "SI") {
                  mensaje += "Error Generando CAE para las Transacciones ";
                  if (!l598isEmpty(serie) && !l598isEmpty(sucursal) && !l598isEmpty(tipoTransaccion)) {
                    mensaje += tipoTransaccion + " de la Serie " + serie + " y Sucursal " + sucursal;
                  }
                  if (!l598isEmpty(cantidadTransaccionesProc) && !l598isEmpty(cantidadTransaccionesTotal)) {
                    mensaje += "<br>";
                    mensaje += "Cantidad Transacciones Procesadas : " + cantidadTransaccionesProc;
                    if (cantidadTransaccionesTotal > 0)
                      mensaje += " De : " + cantidadTransaccionesTotal;
                    mensaje += "<br>";
                    if (!l598isEmpty(idLog) && idLog > 0 && !l598isEmpty(urlLog) && !l598isEmpty(urlDominio)) {
                      mensaje += "Puede Observar el Detalle de Errores desde el Siguiente link " + "<br> ";
                      mensaje += "<a href=\"" + urlDominio + "/app/common/custom/custrecordentry.nl?rectype=" + urlLog + "&id=" + idLog + "\"> Informacion Generacion de CAE </a>";
                    }
                  }
                } else {
                  mensaje += "La generación del CAE para las Transacciones ";
                  if (!l598isEmpty(serie) && !l598isEmpty(sucursal) && !l598isEmpty(tipoTransaccion)) {
                    mensaje += tipoTransaccion + " de la Serie " + serie + " y Sucursal " + sucursal + " ";
                  }
                  mensaje += "fue realizada exitosamente.";
                  if (!l598isEmpty(cantidadTransaccionesProc) && !l598isEmpty(cantidadTransaccionesTotal)) {
                    mensaje += "<br>";
                    mensaje += "Cantidad Transacciones Procesadas : " + cantidadTransaccionesProc;
                    if (cantidadTransaccionesTotal > 0)
                      mensaje += " De : " + cantidadTransaccionesTotal;
                    mensaje += "<br>";
                  }
                  if (!l598isEmpty(idLog) && idLog > 0 && !l598isEmpty(urlLog) && !l598isEmpty(urlDominio)) {
                    mensaje += "Puede Observar  el Detalle de las Transacciones Procesadas desde el Siguiente link " + "<br> ";
                    mensaje += "<a href=\"" + urlDominio + "/app/common/custom/custrecordentry.nl?rectype=" + urlLog + "&id=" + idLog + "\"> Informacion Generacion de CAE </a>";
                  }
                }
                mensaje += "</body></html>";
                email.send({
                  author: emailUsuario,
                  recipients: emailUsuario,
                  subject: "NetSuite - Proceso de generación de CAE",
                  body: mensaje,
                });
              } else {
                objetoRespuesta.error = true;
                objetoRespuesta.tipo = tipoMensajeError;
                var mensaje = "No se recibio informacion del Email del Usuario al cual se le debe Enviar el Email de Finalizacion del Proceso";
                objetoRespuesta.mensaje = mensaje;
                log.error("URU - Factura Electronica", mensaje);
              }
            } else {
              log.debug("URU - Factura Electronica", "La configuracion del Middleware indica que no se debe enviar Email de Finalizacion");
            }
          } else {
            objetoRespuesta.error = true;
            objetoRespuesta.tipo = tipoMensajeError;
            var mensaje = "No se puedo encontrar el Panel de Configuracion del Proceso de Factura Electronica";
            objetoRespuesta.mensaje = mensaje;
            log.error("URU - Factura Electronica", mensaje);
          }
        } else {
          objetoRespuesta.error = true;
          objetoRespuesta.tipo = tipoMensajeError;
          var mensaje = "No se recibio Informacion del Email de Finalizacion de Proceso A Enviar luego de Parsear el Objeto Recibido";
          objetoRespuesta.mensaje = mensaje;
          log.error("URU - Factura Electronica", mensaje);

        }
      } else {
        objetoRespuesta.error = true;
        objetoRespuesta.tipo = tipoMensajeError;
        var mensaje = "No se recibio Objeto con la informacion del Email de Finalizacion de Proceso A Enviar";
        objetoRespuesta.mensaje = mensaje;
        log.error("URU - Factura Electronica", mensaje);

      }
    } catch (excepcion) {
      objetoRespuesta.error = true;
      objetoRespuesta.tipo = tipoMensajeError;
      var mensaje = "Excepcion Enviando Email de Finalizacion de Proceso al Usuario - Excepcion : " + excepcion.message;
      objetoRespuesta.mensaje = mensaje;
      log.error("URU - Factura Electronica", mensaje);
    }

    log.debug("URU - Factura Electronica", "Fin Enviar Email de Finalizacion de Proceso");

    //var  respuestaEmail = JSON.stringify(objetoRespuesta);
    //response.setContentType('JSON');
    //response.writeLine(respuestaCliente);
    //return respuestaEmail;
  }

  return {
    post: enviarEmailFE
  };
});
