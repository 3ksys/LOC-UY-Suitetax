/**
 *@NApiVersion 2.1
 *@NAmdConfig /SuiteScripts/configuration_l598.json
 *@NScriptType UserEventScript
 *@NModuleScope Public
 */
/*
Localizaciones Uruguay V2016 - SCRIPTS SERVER SIDE
3KSYS SRL Argentina

*/

define(["N/log", "N/search", "N/runtime", "N/record", "L598/utilities"],
  function (log, search, runtime, record, utilities) {
    /* global define */
    /***
     * Migrado desde L598_SS.js las funciones l598beforeLoadTransaction, l598beforeSubmitTransaction y l598afterSubmitTransaction
     * al script llamado L598 -Transacción (Servidor) V2.js
     */


    function l598isEmpty(value) {
      return value === "" || value === null || value === undefined || value === "null" || value === "undefined";
    }

    // eslint-disable-next-line no-extend-native
    Array.prototype.pushSafe = function (val) {
      if (!l598isEmpty(val)) {
        this.push(val);
      } else {
        log.debug("se trato de guardar un valor nulo en un array, no se agrega");
      }
    };

    // eslint-disable-next-line no-extend-native
    Number.prototype.toFixedOK = function (decimals) {
      const sign = this >= 0 ? 1 : -1;
      return (Math.round((this * Math.pow(10, decimals)) + (sign * 0.001)) / Math.pow(10, decimals)).toFixed(decimals);
    };
    function l598esOneworld() {
      const filters = [];


      filters[0] = search.createFilter({
        name: "isinactive",
        operator: search.Operator.IS,
        values: false
      });
      filters[1] = search.createFilter({
        name: "custrecord_l598_dat_imp_es_oneworld",
        operator: search.Operator.IS,
        values: true
      });


      const searchresults = search.create({
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

    function letras(c, d, u) {

      const proceso = "letras";

      try {

        let lc = "";
        let ld = "";
        let lu = "";
        const centenas = eval(c);
        const decenas = eval(d);
        const decom = eval(u);

        switch (centenas) {

          case 0:
            lc = "";
            break;
          case 1: {
            if (decenas == 0 && decom == 0)
              lc = "CIEN";
            else
              lc = "CIENTO ";
          }
            break;
          case 2:
            lc = "DOSCIENTOS ";
            break;
          case 3:
            lc = "TRESCIENTOS ";
            break;
          case 4:
            lc = "CUATROCIENTOS ";
            break;
          case 5:
            lc = "QUINIENTOS ";
            break;
          case 6:
            lc = "SEISCIENTOS ";
            break;
          case 7:
            lc = "SETECIENTOS ";
            break;
          case 8:
            lc = "OCHOCIENTOS ";
            break;
          case 9:
            lc = "NOVECIENTOS ";
            break;
        }

        switch (decenas) {

          case 0:
            ld = "";
            break;
          case 1: {
            switch (decom) {

              case 0:
                ld = "DIEZ";
                break;
              case 1:
                ld = "ONCE";
                break;
              case 2:
                ld = "DOCE";
                break;
              case 3:
                ld = "TRECE";
                break;
              case 4:
                ld = "CATORCE";
                break;
              case 5:
                ld = "QUINCE";
                break;
              case 6:
                ld = "DIECISEIS";
                break;
              case 7:
                ld = "DIECISIETE";
                break;
              case 8:
                ld = "DIECIOCHO";
                break;
              case 9:
                ld = "DIECINUEVE";
                break;
            }
          }
            break;
          case 2:
            ld = "VEINTE";
            break;
          case 3:
            ld = "TREINTA";
            break;
          case 4:
            ld = "CUARENTA";
            break;
          case 5:
            ld = "CINCUENTA";
            break;
          case 6:
            ld = "SESENTA";
            break;
          case 7:
            ld = "SETENTA";
            break;
          case 8:
            ld = "OCHENTA";
            break;
          case 9:
            ld = "NOVENTA";
            break;
        }
        switch (decom) {

          case 0:
            lu = "";
            break;
          case 1:
            lu = "UN";
            break;
          case 2:
            lu = "DOS";
            break;
          case 3:
            lu = "TRES";
            break;
          case 4:
            lu = "CUATRO";
            break;
          case 5:
            lu = "CINCO";
            break;
          case 6:
            lu = "SEIS";
            break;
          case 7:
            lu = "SIETE";
            break;
          case 8:
            lu = "OCHO";
            break;
          case 9:
            lu = "NUEVE";
            break;
        }

        if (decenas == 1) {

          return lc + ld;
        }
        if (decenas == 0 || decom == 0) {

          //return lc+" "+ld+lu;
          return lc + ld + lu;
        } else {

          if (decenas == 2) {

            ld = "VEINTI";
            return lc + ld + lu.toLowerCase();
          } else {

            return lc + ld + " Y " + lu;
          }
        }
      } catch (error) {
        log.error(proceso, "Error NetSuite Excepción letras - Detalles: " + error.message);
      }

      return null;
    }


    function getNumberLiteral(n) {
      /* eslint-disable  */

      const proceso = "getNumberLiteral";

      try {
        let m0,
          cm,
          dm,
          um,
          cmi,
          dmi,
          umi,
          ce,
          de,
          un,
          hlp,
          decimal;

        if (isNaN(n)) {

          alert("La Cantidad debe ser un valor NumÃ©rico.");
          return null;
        }
        m0 = parseInt(n / 1000000000000);
        rm0 = n % 1000000000000;
        m1 = parseInt(rm0 / 100000000000);
        rm1 = rm0 % 100000000000;
        m2 = parseInt(rm1 / 10000000000);
        rm2 = rm1 % 10000000000;
        m3 = parseInt(rm2 / 1000000000);
        rm3 = rm2 % 1000000000;
        cm = parseInt(rm3 / 100000000);
        r1 = rm3 % 100000000;
        dm = parseInt(r1 / 10000000);
        r2 = r1 % 10000000;
        um = parseInt(r2 / 1000000);
        r3 = r2 % 1000000;
        cmi = parseInt(r3 / 100000);
        r4 = r3 % 100000;
        dmi = parseInt(r4 / 10000);
        r5 = r4 % 10000;
        umi = parseInt(r5 / 1000);
        r6 = r5 % 1000;
        ce = parseInt(r6 / 100);
        r7 = r6 % 100;
        de = parseInt(r7 / 10);
        r8 = r7 % 10;
        un = parseInt(r8 / 1);

        //r9=r8%1;
        999123456789;
        if (n < 1000000000000 && n >= 1000000000) {

          tmp = n.toString();
          s = tmp.length;
          tmp1 = tmp.slice(0, s - 9);
          tmp2 = tmp.slice(s - 9, s);

          tmpn1 = getNumberLiteral(tmp1);
          tmpn2 = getNumberLiteral(tmp2);

          if (tmpn1.indexOf("Un") >= 0)
            pred = " BILLÓN ";
          else
            pred = " BILLONES ";

          return tmpn1 + pred + tmpn2;
        }

        if (n < 10000000000 && n >= 1000000) {

          mldata = letras(cm, dm, um);
          hlp = mldata.replace("UN", "*");
          if (hlp.indexOf("*") < 0 || hlp.indexOf("*") > 3) {

            mldata = mldata.replace("UNO", "UN");
            mldata += " MILLONES ";
          } else
            mldata = "UN MILLÓN ";

          mdata = letras(cmi, dmi, umi);
          cdata = letras(ce, de, un);

          if (mdata != "	") {
            if (n == 1000000)
              mdata = mdata.replace("UNO", "UN") + "DE";
            else
              mdata = mdata.replace("UNO", "UN") + " MIL ";
          }

          return (mldata + mdata + cdata);
        }
        if (n < 1000000 && n >= 1000) {

          mdata = letras(cmi, dmi, umi);
          cdata = letras(ce, de, un);
          hlp = mdata.replace("UN", "*");
          if (hlp.indexOf("*") < 0 || hlp.indexOf("*") > 3) {

            mdata = mdata.replace("UNO", "UN");
            return (mdata + " MIL " + cdata);
          } else
            return ("UN MIL " + cdata);
        }
        if (n < 1000 && n >= 1)
          return (letras(ce, de, un));

        if (n == 0)
          return " CERO";

      } catch (error) {
        log.error(proceso, "Error NetSuite Excepción getNumberLiteral - Detalles: " + error.message);
      }

      return "NO DISPONIBLE";
      /* eslint-enable  */
    }

    function getNumeroEnLetras(numero, subsidiaria) {

      const proceso = "getNumeroEnLetras";

      try {
        const filters = [];
        filters[0] = search.createFilter({
          name: "isinactive",
          operator: search.Operator.IS,
          values: false
        });

        if (!l598isEmpty(subsidiaria)) {
          filters[1] = search.createFilter({
            name: "custrecord_l598_dat_imp_subsidiaria",
            operator: search.Operator.ANYOF,
            values: subsidiaria
          });
        }

        const results = search.create({
          type: "customrecord_l598_datos_impositivos_emp",
          columns: ["custrecord_l598_dat_imp_usar_d_mont"],
          filters: filters
        }).run().getRange({
          start: 0,
          end: 1
        });

        let usarDecimales = null;
        if (results != null && results.length > 0) {
          usarDecimales = results[0].getValue("custrecord_l598_dat_imp_usar_d_mont");
        }

        log.debug(proceso, "usarDecimales: " + usarDecimales);

        if (!l598isEmpty(numero)) {
          /* eslint-disable no-var, block-scoped-var */
          if (usarDecimales === false) {

            //Se redondea el numero para no usar los decimales.
            var parteEntera = Math.round(numero);

            var parteEnteraLetras = "";

            // convierto la parte entera en letras
            parteEnteraLetras = getNumberLiteral(parteEntera);
            // le hago un TRIM a la parte entera en letras
            parteEnteraLetras = parteEnteraLetras.replace(/^\s*|\s*$/g, "");

            var numeroEnLetras = "Son " + parteEnteraLetras;

            // dejo toda la palabra en mayusculas
            numeroEnLetras = numeroEnLetras.toUpperCase();

            return numeroEnLetras;
          } else { //hay que usar decimales

            const partes = String(numero).split(".");
            parteEntera = partes[0];
            const parteDecimal = partes[1] ?? "00";
            parteEnteraLetras = "";

            // convierto la parte entera en letras
            parteEnteraLetras = getNumberLiteral(parteEntera);
            // le hago un TRIM a la parte entera en letras
            parteEnteraLetras = parteEnteraLetras.replace(/^\s*|\s*$/g, "");

            numeroEnLetras = "Son " + parteEnteraLetras + " con " + parteDecimal;

            // dejo toda la palabra en mayusculas
            numeroEnLetras = numeroEnLetras.toUpperCase();

            // le agrego MN (Moneda Nacional) al final
            numeroEnLetras = numeroEnLetras + "/100";

            return numeroEnLetras;
          }
          /* eslint-enable no-var, block-scoped-var */
        } else {
          log.error(proceso, "Error al obtener el monto escrito - No se recibió ningún monto para transformar a letras.");
        }
      } catch (error) {
        log.error(proceso, "Error NetSuite Excepción getNumeroEnLetras - Detalles: " + error.message);
      }

      return null;
    }


    function obtenerTipoTransaccionLocal(tipoTransNS, esND) {
      const objTipoTransLocal = {};
      objTipoTransLocal.error = false;
      objTipoTransLocal.mensaje = "";
      objTipoTransLocal.tipoTransaccionLocal = "";
      objTipoTransLocal.idTipoTransNS = "";

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

          const columns = [
            search.createColumn({
              name: "internalid"
            })];


          const results = search.create({
            type: "customrecord_l598_tipo_trans_loc",
            filters: filters,
            columns: columns
          }).run().getRange({
            start: 0,
            end: 1
          });

          if (results != null && results.length > 0) {

            const idTipoTransLocal = results[0].getValue({ name: "internalid" });
            if (!l598isEmpty(idTipoTransLocal)) {
              objTipoTransLocal.tipoTransaccionLocal = idTipoTransLocal;
            }
            else {
              objTipoTransLocal.error = true;
              objTipoTransLocal.mensaje = "No se encontro la configuración del Tipo de Transacción Local para el Tipo de Transacción NetSuite: " + tipoTransNS + " Es Nota de Debito : " + esND;
            }
          }
          else {
            objTipoTransLocal.error = true;
            objTipoTransLocal.mensaje = "No se encontro la configuración del Tipo de Transacción Local para el Tipo de Transacción NetSuite: " + tipoTransNS + " Es Nota de Debito : " + esND;
          }
        }
        else {
          objTipoTransLocal.error = true;
          objTipoTransLocal.mensaje = "No se encontro la configuración del Tipo de Transacción NetSuite para el Tipo de Transacción : " + tipoTransNS;
        }
      }
      else {
        objTipoTransLocal.error = true;
        objTipoTransLocal.mensaje = "No se recibio el Tipo de Transaccion de NetSuite";
      }

      return objTipoTransLocal;
    }

    function obtenerIDTipoTransNS(tipoTransNS) {
      let idTipoTransNS = "";
      if (!l598isEmpty(tipoTransNS)) {

        const filters = [
          search.createFilter({
            name: "isinactive",
            operator: search.Operator.IS,
            values: false
          }),
          search.createFilter({
            name: "custrecord_l598_tipo_trans_ns_cod",
            operator: search.Operator.IS,
            values: tipoTransNS
          })
        ];


        const columns = [
          search.createColumn({
            name: "internalid"
          })
        ];

        const results = search.create({
          type: "customrecord_l598_tipo_trans_ns",
          filters: filters,
          columns: columns
        }).run().getRange({
          start: 0,
          end: 1
        });

        if (results != null && results.length > 0) {

          const idTipoTransaccion = results[0].getValue({ name: "internalid" });
          if (!l598isEmpty(idTipoTransaccion)) {
            idTipoTransNS = idTipoTransaccion;
          }
        }
      }
      return idTipoTransNS;
    }

    function obtenerTipoComprobanteFE(tipoTransLocal, esExportacion, compContingencia, compCuentaAjena, esTicket) {

      const objTipoComprobanteFE = {};
      objTipoComprobanteFE.error = false;
      objTipoComprobanteFE.mensaje = "";
      objTipoComprobanteFE.tipoComprobanteFE = "";

      if (!l598isEmpty(tipoTransLocal)) {

        const filters = [
          search.createFilter({
            name: "isinactive",
            operator: search.Operator.IS,
            values: false
          }),
          search.createFilter({
            name: "custrecord_l598_tipos_comprobantes_trans",
            operator: search.Operator.IS,
            values: tipoTransLocal
          })
        ];

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

        filters.push(search.createFilter({
          name: "custrecord_l598_tipos_comprobantes_exp",
          operator: search.Operator.IS,
          values: comprobanteExportacion,
        }));

        filters.push(search.createFilter({
          name: "custrecord_l598_tipos_comprobantes_con",
          operator: search.Operator.IS,
          values: comprobanteContingencia,
        }));
        filters.push(search.createFilter({
          name: "custrecord_l598_tipos_comprobantes_aje",
          operator: search.Operator.IS,
          values: comprobanteCuentaAjena,
        }));
        filters.push(search.createFilter({
          name: "custrecord_l598_tipos_comprobantes_tick",
          operator: search.Operator.IS,
          values: comprobanteTicket,
        }));

        const columns = search.createColumn({
          name: "internalid"
        });


        const results = search.create({
          type: "customrecord_l598_tipos_comprobantes",
          filters: filters,
          columns: columns
        }).run().getRange({
          start: 0,
          end: 1
        });

        if (results != null && results.length > 0) {
          const tipoCompFE = results[0].getValue({ name: "internalid" });
          if (!l598isEmpty(tipoCompFE)) {
            objTipoComprobanteFE.tipoComprobanteFE = tipoCompFE;
          }
          else {
            objTipoComprobanteFE.error = true;
            objTipoComprobanteFE.mensaje = "No se encontro la Configuracion de Tipos de Comprobantes de Factura Electronica para el Tipo de Transaccion Local con ID Interno : " + tipoTransLocal + ", comprobante exportacion: " + comprobanteExportacion;
            objTipoComprobanteFE.mensaje += ", comprobante contingencia: " + comprobanteContingencia + ", comprobante cuenta ajena: " + comprobanteCuentaAjena + ", comprobante ticket: " + comprobanteTicket;
          }
        }
        else {
          objTipoComprobanteFE.error = true;
          objTipoComprobanteFE.mensaje = "No se encontro la Configuracion de Tipos de Comprobantes de Factura Electronica para el Tipo de Transaccion Local con ID Interno : " + tipoTransLocal + ", comprobante exportacion: " + comprobanteExportacion;
          objTipoComprobanteFE.mensaje += ", comprobante contingencia: " + comprobanteContingencia + ", comprobante cuenta ajena: " + comprobanteCuentaAjena + ", comprobante ticket: " + comprobanteTicket;
        }
      }
      else {
        objTipoComprobanteFE.error = true;
        objTipoComprobanteFE.mensaje = "No se Recibio el Tipo de Transaccion Local";
      }

      return objTipoComprobanteFE;
    }

    function obtenerSucursal(objRecord) {
      let subsidiaria = null;
      if (l598esOneworld())
        subsidiaria = objRecord.getValue({
          fieldId: "subsidiary"
        });

      let categoriaSucursal = null;


      const locationId = objRecord.getValue({
        fieldId: "location"
      });
      if (!l598isEmpty(locationId)) {
        categoriaSucursal = search.lookupFields({
          type: search.Type.LOCATION,
          id: locationId,
          columns: "custrecord_l598_categoria_sucursal"
        });
        //.custrecord_l598_categoria_sucursal[0].value;
        log.debug("before lookupfieldSafe categoriaSucursal", JSON.stringify(categoriaSucursal));
        categoriaSucursal = utilities.getLookupFieldsSafe(categoriaSucursal, "custrecord_l598_categoria_sucursal");
        log.debug("lookupfieldSafe custrecord_l598_categoria_sucursal", categoriaSucursal);
      }


      log.debug({
        title: "obtenerSucursal",
        details: "subsidiaria: " + subsidiaria + " - locationId: " + locationId + " - categoriaSucursal: " + categoriaSucursal
      });

      const informacionSucursal = {};
      informacionSucursal.sucursal = 1;// Sucursal default: 1
      informacionSucursal.serie = 1;// Serie default: 1 - A

      const infoSucursal = getSucursal(subsidiaria, categoriaSucursal);
      if (!l598isEmpty(infoSucursal)) {
        informacionSucursal.sucursal = infoSucursal.sucursal;
        informacionSucursal.serie = infoSucursal.serie;
        informacionSucursal.caja = infoSucursal.caja;
        informacionSucursal.codigoSucursal = infoSucursal.codigoSucursal;
        informacionSucursal.codigoSerie = infoSucursal.codigoSerie;
      }


      log.debug({
        title: "obtenerSucursal",
        details: "informacionSucursal: " + JSON.stringify(informacionSucursal) + " - categoría: " + categoriaSucursal
      });

      return informacionSucursal;
    }

    function getSucursal(subsidiaria, categoriaSucursal) {

      const informacionSucursal = {};
      let categoriaVacio = false;
      informacionSucursal.sucursal = 1;// Sucursal default: 1
      informacionSucursal.serie = 1;// Serie default: 1 - A
      informacionSucursal.caja = 1;// Serie default: 1 - A

      let i = 0;

      // Obtengo la Sucursal
      const filters = [];

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

      log.debug({
        title: "getSucursal",
        details: "objSucursalxLocation: " + JSON.stringify(objSucursalxLocation) + " - categoria: " + categoriaSucursal
      });

      if (objSucursalxLocation != null) {

        if (!l598isEmpty(objSucursalxLocation.sucursalDefault)) {
          informacionSucursal.sucursal = objSucursalxLocation.sucursalDefault;

        }


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

      columns[j++] = search.createColumn({
        name: "internalid"
      });
      // Serie Preferida

      columns[j++] = search.createColumn({
        name: "custrecord_l598_sucursales_serie_pref"
      });
      // Caja Preferida

      columns[j++] = search.createColumn({
        name: "custrecord_l598_sucursales_caja_pref"
      });
      // Codigo Sucursal

      columns[j++] = search.createColumn({
        name: "custrecord_l598_sucursales_cod_ns"
      });
      // Codigo Serie

      columns[j++] = search.createColumn({
        name: "custrecord_l598_serie_comprobante_cod",
        join: "custrecord_l598_sucursales_serie_pref"
      });


      const results = search.create({
        type: "customrecord_l598_sucursales",
        filters: filters,
        columns: columns
      }).run().getRange({
        start: 0,
        end: 1
      });

      if (results != null && results.length > 0) {
        const idSucursal = results[0].getValue({ name: "internalid" });
        const idSerie = results[0].getValue({ name: "custrecord_l598_sucursales_serie_pref" });
        const idCaja = results[0].getValue({ name: "custrecord_l598_sucursales_caja_pref" });
        const codigoSucursal = results[0].getValue({ name: "custrecord_l598_sucursales_cod_ns" });
        const codigoSerie = results[0].getValue({ name: "custrecord_l598_serie_comprobante_cod", join: "custrecord_l598_sucursales_serie_pref" });

        if (!l598isEmpty(idSucursal)) {
          informacionSucursal.sucursal = idSucursal;
          informacionSucursal.serie = idSerie;
          informacionSucursal.caja = idCaja;
          informacionSucursal.codigoSucursal = codigoSucursal;
          informacionSucursal.codigoSerie = codigoSerie;
        }
      }

      log.debug({
        title: "getSucursal",
        details: "informacionSucursal: " + JSON.stringify(informacionSucursal)
      });

      return informacionSucursal;
    }

    function getSucursalxLocation(subsidiaria) {

      const sucursarxLocation = {};

      sucursarxLocation.porLocation = false;
      sucursarxLocation.sucursalDefault = 1;
      // sucursarxLocation.serieDefault=1;

      let i = 0;
      let j = 0;
      const filters = [];

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

      const columns = [];

      columns[j++] = search.createColumn({
        name: "custrecord_l598_dat_imp_num_location"
      });

      columns[j++] = search.createColumn({
        name: "custrecord_l598_dat_imp_suc_default"
      });


      const searchresults = search.create({
        type: "customrecord_l598_datos_impositivos_emp",
        filters: filters,
        columns: columns
      }).run().getRange({
        start: 0,
        end: 1000
      });

      if (searchresults != null && searchresults.length > 0) {
        const sucPorLocation = searchresults[0].getValue({ name: "custrecord_l598_dat_imp_num_location" });
        const sucDefault = searchresults[0].getValue({ name: "custrecord_l598_dat_imp_suc_default" });


        if (!l598isEmpty(sucPorLocation) && (sucPorLocation == "T" || sucPorLocation == true)) {
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

      log.debug({
        title: "getSucursalxLocation",
        details: "sucursarxLocation: " + JSON.stringify(sucursarxLocation)
      });
      return sucursarxLocation;
    }

    //function l598beforeSubmitTransaction(type) {
    function beforeSubmit(context) {

      log.audit({
        title: "Before Submit",
        details: "INICIO"
      });

      const objRecord = context.newRecord;

      const recType = objRecord.type;

      if (context.type == context.UserEventType.CREATE || context.type == context.UserEventType.EDIT) {

        let tipoTransStr;
        let idTransaccion;
        try {
          idTransaccion = objRecord.id;

          // INICIO - Consultar Sucursal por Defecto

          const serie = objRecord.getValue({
            fieldId: "custbody_l598_serie_comprobante"
          });

          const sucursal = objRecord.getValue({
            fieldId: "custbody_l598_sucursal"
          });

          const caja = objRecord.getValue({
            fieldId: "custbody_l598_caja"
          });

          const location = objRecord.getValue({
            fieldId: "location"
          });

          if (l598isEmpty(sucursal) || l598isEmpty(serie) || l598isEmpty(caja) || !l598isEmpty(location)) {

            const infoSucursal = obtenerSucursal(objRecord);

            log.debug({
              title: "l598beforeSubmitTransaction",
              details: "infoSucursal: " + JSON.stringify(infoSucursal) + " - sucursal: " + sucursal + " - serie: " + serie + " - caja: " + caja + " - ubicación: " + location
            });

            if (!l598isEmpty(infoSucursal)) {
              if (!l598isEmpty(infoSucursal.sucursal) && l598isEmpty(sucursal)) {

                objRecord.setValue({
                  fieldId: "custbody_l598_sucursal",
                  value: infoSucursal.sucursal
                });
              }
            }
            else {

              log.error({
                title: "Before Submit",
                details: "Error Obteniendo la Serie, Sucursal y Caja por defecto - ID Interno Transaccion : " + idTransaccion
              });
            }
          }

          // FIN - consultar Sucursal por Defecto




          if (recType != "transferorder" && recType != "salesorder") {
            const esND = objRecord.getValue({
              fieldId: 'custbody_l598_nd',
            });
            tipoTransStr = objRecord.type;

            if (tipoTransStr != 'vendorbill') {
              const comprobanteContingencia = false;

              const esExportacion = objRecord.getValue({
                fieldId: 'custbody_l598_trans_exportacion',
              });

              const esETicket = objRecord.getValue({
                fieldId: 'custbody_l598_trans_eticket',
              });

              const esCuentaAjena = objRecord.getValue({
                fieldId: 'custbody_l598_transac_cuenta_ajena',
              });
              const comprobanteCuentaAjena = !l598isEmpty(esCuentaAjena) && (esCuentaAjena == true || esCuentaAjena == 'T') ? true : false;

              // ? Pasado al afterSubmit
              /* let subsidiaria = null;
              if (l598esOneworld())
                  subsidiaria = objRecord.getValue({
                      fieldId: 'subsidiary',
                  });
  
              // Generar MontoEscrito
  
              const total = objRecord.getValue({
                  fieldId: 'total',
              });
  
              if (!l598isEmpty(total)) {
                  const numeroEnLetras = getNumeroEnLetras(total, subsidiaria);
  
                  if (!l598isEmpty(numeroEnLetras)) {
                      objRecord.setValue({
                          fieldId: 'custbody_l598_monto_escrito', //The internal ID of a standard or custom body field.
                          value: numeroEnLetras, //The value to set the field to.
                      });
                  } else {
                      log.error({
                          title: 'Error grabando Transaccion (' + tipoTransStr + ')',
                          details: 'ID Interno Transaccion : ' + idTransaccion + ' - Error Generando MontoEscrito',
                      });
                  }
              } */

              const tipoTransLocal = obtenerTipoTransaccionLocal(tipoTransStr, esND);
              log.debug('beforeSubmit', 'LINE 1079 - tipoTransLocal= ' + JSON.stringify(tipoTransLocal));

              if (tipoTransLocal != null && tipoTransLocal.error != true) {
                const tipoComprobanteFE = obtenerTipoComprobanteFE(
                  tipoTransLocal.tipoTransaccionLocal,
                  esExportacion,
                  comprobanteContingencia,
                  comprobanteCuentaAjena,
                  esETicket
                );

                if (tipoComprobanteFE != null && tipoComprobanteFE.error != true) {
                  // Configurar el Tipo de Comprobante de Factura Electronica
                  log.debug('beforeSubmit', 'LINE 1092 - tipoComprobanteFE= ' + JSON.stringify(tipoComprobanteFE));
                  objRecord.setValue({
                    fieldId: 'custbody_l598_tipo_comprobante', //The internal ID of a standard or custom body field.
                    value: tipoComprobanteFE.tipoComprobanteFE,
                  });
                } else {
                  log.error({
                    title: 'Error grabando Transaccion (' + tipoTransStr + ')',
                    details:
                      'ID Interno Transaccion : ' +
                      idTransaccion +
                      ' - Error Obteniendo el Tipo de Comprobante de Factura Electronica - Error : ' +
                      tipoComprobanteFE.mensaje,
                  });
                }
              } else {
                log.error({
                  title: 'Error grabando Transaccion (' + tipoTransStr + ')',
                  details: 'ID Interno Transaccion : ' + idTransaccion + ' - Error : ' + tipoTransLocal.mensaje,
                });
              }
            }
          }
        }
        catch (e) {

          log.error({
            title: "Excepcion grabando Transaccion (" + tipoTransStr + ")",
            details: "ID Interno Transaccion : " + idTransaccion + " - NetSuite Error: " + e.message
          });
        }

        log.audit({
          title: "Before Submit",
          details: "FIN"
        });
      }


      // INICIO - Aplica solo a vendor credit sin tocar taxcodes
      if (context.type == context.UserEventType.DELETE && recType == "vendorcredit") {

        const numLinesRetenciones = objRecord.getLineCount({
          sublistId: "recmachcustrecord_l598_retencion_ref_fact_padre" //string*
        });

        for (let i = 0; i < numLinesRetenciones; i++) {

          //SE TUVO QUE USAR RECORD DELETE PORQUE AL GUARDAR LA TRANSACCION NO SE BORRABAN LOS REGISTROS
          const idretencion = objRecord.getSublistValue({
            sublistId: "recmachcustrecord_l598_retencion_ref_fact_padre",
            fieldId: "id",
            line: i
          });
          try {

            objRecord.delete({
              type: "customrecord_l598_retencion",
              id: idretencion
            });
          }
          catch (e) {

            log.error({
              title: "l598beforeSubmitTransaction",
              details: "Ocurrio un error al borrar las retenciones asociadas a la Nota de Credito: " + e.message
            });
          }
        }
      }
      // FIN - Aplica solo a vendor credit sin tocar taxcodes


      // INICIO - Aplica solo a resguardo sin tocar taxcodes
      if (context.type == context.UserEventType.DELETE && recType == "customtransaction_l598_resguardo") {

        const numLinesNCResguardo = objRecord.getLineCount({
          sublistId: "recmachcustrecord_l598_retencion_nc_resguardo" //string*
        });
        let idretencionNC;
        for (let i = 0; i < numLinesNCResguardo; i++) {
          //SE TUVO QUE USAR RECORD DELETE PORQUE AL GUARDAR LA TRANSACCION NO SE BORRABAN LOS REGISTROS
          //idretencionNC = nlapiGetLineItemValue('recmachcustrecord_l598_retencion_nc_resguardo', 'id', i);
          idretencionNC = objRecord.getSublistValue({
            sublistId: "recmachcustrecord_l598_retencion_nc_resguardo",
            fieldId: "id",
            line: i
          });
          try {
            //nlapiDeleteRecord('customrecord_l598_retencion_nc', idretencionNC);
            objRecord.delete({
              type: "customrecord_l598_retencion_nc",
              id: idretencionNC
            });
          }
          catch (e) {
            //nlapiLogExecution('ERROR', 'l598beforeSubmitTransaction', 'Ocurrio un error al borrar las URU-Retenciones NC asociadas al registro URU-Resguardo: ' + e.message);
            log.error({
              title: "l598beforeSubmitTransaction",
              details: "Ocurrio un error al borrar las URU-Retenciones NC asociadas al registro URU-Resguardo: " + e.message
            });
          }
        }
      }
      // FIN - Aplica solo a resguardo sin tocar taxcodes

    }

    //function l598afterSubmitTransaction(type) {
    function afterSubmit(scriptContext) {

      const proceso = 'afterSubmit';
      const recId = scriptContext.newRecord.id;
      const recType = scriptContext.newRecord.type;

      if (scriptContext.type != scriptContext.UserEventType.DELETE) {
        const objRecord = record.load({ type: recType, id: recId });

        log.debug(proceso, `INICIO - afterSubmit / id: ${recId} / type: ${recType}`);
        // INICIO - manejo de datos a nivel de lineas
        if (recType != 'transferorder' && recType != 'salesorder') {
          // INICIO - Asignar indicador de Facturacion por lineas
          const comprobanteExportacion = objRecord.getValue({ fieldId: 'custbody_l598_trans_exportacion' });

          // * SETEO DE NUMERO EN LETRAS pasado de beforeSubmit a afterSubmit
          if (recType != 'vendorbill') {
            let subsidiaria = null;
            if (l598esOneworld()) {
              subsidiaria = objRecord.getValue({ fieldId: 'subsidiary' });
            }
            const total = objRecord.getValue({ fieldId: 'total' });
            if (!l598isEmpty(total)) {
              const numeroEnLetras = getNumeroEnLetras(total, subsidiaria);

              if (!l598isEmpty(numeroEnLetras)) {
                objRecord.setValue({
                  fieldId: 'custbody_l598_monto_escrito', //The internal ID of a standard or custom body field.
                  value: numeroEnLetras, //The value to set the field to.
                });
              } else {
                log.error({
                  title: 'Error grabando Transaccion (' + recType + ')',
                  details: 'ID Interno Transaccion : ' + recId + ' - Error Generando MontoEscrito',
                });
              }
            }
          }
          // * FIN SETEO DE NUMERO EN LETRAS

          setearCodigoImpuestosLineas(objRecord);

          const itemsQuantity = objRecord.getLineCount({
            sublistId: 'item'
          });

          for (let i = 0; i < itemsQuantity; i++) {

            log.debug(proceso, `indice: ${i} / codigo impuesto: ${objRecord.getSublistValue('item', 'custcol_l598_codigo_impuesto', i)} / tasa: ${objRecord.getSublistValue('item', 'custcol_l598_tasa_impuesto', i)}`);

          }

          // INICIO - CONSIDERAR LINEAS DE TIEMPO/GASTOS
          const tipoSublistas = ['item', 'itemcost', 'expcost', 'time'];
          const arrayLines = [];
          const arrayItem = [];
          const arrayItemTime = [];
          const arrayItemSS = [];
          const arrayItemTimeSS = [];
          const arrayTaxCodes = [];
          const arrayTaxCodesSS = [];
          const arrayFinalAux = [];

          //INICIO - SE RECORRE LA SUBLISTA INICIALMENTE PARA EXTRAER EL ID DE LOS ARTICULOS Y SU TAX CODE
          for (let subListaContador = 0; subListaContador < tipoSublistas.length; subListaContador++) {
            const tipoSublistaConsultar = tipoSublistas[subListaContador];

            const cantidadItems = objRecord.getLineCount({
              sublistId: tipoSublistaConsultar
            });

            log.debug({
              title: 'afterSubmit',
              details: 'cantidadItems: ' + cantidadItems + ' tipoSublistaConsultar:' + tipoSublistaConsultar,
            });

            for (let i = 0; i < cantidadItems; i++) {
              const aplicar = objRecord.getSublistValue({
                sublistId: tipoSublistaConsultar,
                fieldId: 'apply',
                line: i,
              });

              const itemType = objRecord.getSublistValue({
                sublistId: tipoSublistaConsultar,
                fieldId: 'itemtype',
                line: i,
              });

              const codImpuesto = objRecord.getSublistValue({
                sublistId: tipoSublistaConsultar,
                fieldId: 'custcol_l598_codigo_impuesto',
                line: i,
              });

              log.debug(proceso, `codImpuesto: ${codImpuesto}`);

              if (itemType != 'EndGroup') {
                if (tipoSublistaConsultar == 'item' || aplicar == 'T' || aplicar == true || tipoSublistaConsultar == 'time') {
                  if ((tipoSublistaConsultar == 'time' && (aplicar == 'T' || aplicar == true)) || tipoSublistaConsultar != 'time') {
                    const objLine = {
                      indice: i,
                      sublist: tipoSublistaConsultar,
                    };

                    objLine.item = objRecord.getSublistValue({
                      sublistId: tipoSublistaConsultar,
                      fieldId: 'item',
                      line: i,
                    });

                    objLine.TaxCode = objRecord.getSublistValue({
                      sublistId: tipoSublistaConsultar,
                      fieldId: 'custcol_l598_codigo_impuesto',
                      line: i,
                    });

                    objLine.lineKey = objRecord.getSublistValue({
                      sublistId: tipoSublistaConsultar,
                      fieldId: 'lineuniquekey',
                      line: i,
                    });
                    if (tipoSublistaConsultar == 'time' && (aplicar == 'T' || aplicar == true))
                      objLine.idTime = objRecord.getSublistValue({
                        sublistId: tipoSublistaConsultar,
                        fieldId: 'doc',
                        line: i,
                      });

                    arrayLines.pushSafe(objLine);

                    arrayTaxCodes.pushSafe(codImpuesto);
                  }
                  if (tipoSublistaConsultar != 'time' && tipoSublistaConsultar != 'expcost' && tipoSublistaConsultar != 'expenses')
                    arrayItem.pushSafe(
                      objRecord.getSublistValue({
                        sublistId: tipoSublistaConsultar,
                        fieldId: 'item',
                        line: i,
                      })
                    );

                  if (tipoSublistaConsultar == 'time' && (aplicar == 'T' || aplicar == true)) {
                    const item_ = objRecord.getSublistValue({
                      sublistId: tipoSublistaConsultar,
                      fieldId: 'item',
                      line: i,
                    });
                    arrayItemTime.pushSafe(item_);
                  }
                }
              }
            }
          }
          //FIN - SE RECORRE LA SUBLISTA INICIALMENTE PARA EXTRAER EL ID DE LOS ARTICULOS Y SU TAX CODE

          log.debug({
            title: 'URU-Info Lineas',
            details: 'DetalleInicialLineas - arrayLines: ' + JSON.stringify(arrayLines),
          });

          log.debug({
            title: 'URU-Info Lineas',
            details: 'arrayTaxCodes: ' + JSON.stringify(arrayTaxCodes),
          });

          log.debug({
            title: 'URU-Info Lineas',
            details: 'arrayItem: ' + JSON.stringify(arrayItem),
          });

          if (!l598isEmpty(arrayItem)) {
            if (arrayItem.length > 0) {
              //INICIO - SE CARGA LA INFORMACION PARA TODOS LOS ARTICULOS DE LA TRANSACCIÓN

              const filtro = search.createFilter({
                name: 'internalid',
                operator: search.Operator.ANYOF,
                values: arrayItem,
              });

              const saveSearchResults = search.load({
                id: 'customsearch_l598_articulos',
              });
              saveSearchResults.filters.push(filtro);
              const resultSet = saveSearchResults.run();

              const searchresults = resultSet.getRange({
                start: 0,
                end: 1000,
              });

              if (!l598isEmpty(searchresults)) {
                if (searchresults.length > 0) {
                  for (let i = 0; i < searchresults.length; i++) {
                    const result = searchresults[i];
                    const columns = result.columns;
                    const objItem = {
                      itemId: result.getValue({ name: columns[0] }),
                      itemName: result.getValue({ name: columns[1] }),
                      itemUM: result.getValue({ name: columns[2] }),
                      sublist: '',
                    };

                    arrayItemSS.push(objItem);
                  }
                }
              }
            }
          }

          log.debug({
            title: 'LINE 823',
            details: 'arrayItemSS : ' + JSON.stringify(arrayItemSS),
          });

          if (!l598isEmpty(arrayItemTime)) {
            if (arrayItemTime.length > 0) {
              //INICIO - SE CARGA LA INFORMACION PARA TODOS LOS ARTICULOS DE LA TRANSACCIÓN

              const filtro = {
                name: 'item',
                operator: 'anyof',
                values: arrayItemTime,
              };

              const saveSearchResults = search.load({
                id: 'customsearch_l598_timebill',
              });
              saveSearchResults.filters.push(filtro);
              const resultSet = saveSearchResults.run();

              const searchresults = resultSet.getRange({
                start: 0,
                end: 1000,
              });

              if (!l598isEmpty(searchresults)) {
                if (searchresults.length > 0) {
                  for (let i = 0; i < searchresults.length; i++) {
                    const result = searchresults[i];
                    const columns = result.columns;
                    const objItem = {
                      idTime: result.getValue({ name: columns[0] }),
                      itemId: result.getValue({ name: columns[1] }),
                      itemName: result.getValue({ name: columns[2] }),
                      itemUM: result.getValue({ name: columns[3] }),
                      sublist: 'time',
                    };

                    arrayItemTimeSS.push(objItem);
                  }
                }
              }
              //FIN - SE CARGA LA INFORMACION PARA TODOS LOS ARTICULOS DE LA TRANSACCIÓN
            }
          }

          log.debug({
            title: 'LINE 852',
            details: 'arrayItemTimeSS : ' + JSON.stringify(arrayItemTimeSS),
          });

          //INICIO - CARGA DE LA INFORACIÓN DE LOS CODIGOS DE IMPUESTOS RELACIONADOS A LOS ARTICULOS
          if (!l598isEmpty(arrayTaxCodes)) {
            if (arrayTaxCodes.length > 0) {
              const filtro = search.createFilter({
                name: 'internalid',
                operator: search.Operator.ANYOF,
                values: arrayTaxCodes,
              });

              const saveSearch = search.load({
                id: 'customsearch_l598_cod_impuestos',
              });
              saveSearch.filters.push(filtro);
              const resultSet = saveSearch.run();

              const searchresultsTC = resultSet.getRange({
                start: 0,
                end: 1000,
              });

              if (!l598isEmpty(searchresultsTC)) {
                if (searchresultsTC.length > 0) {
                  for (let i = 0; i < searchresultsTC.length; i++) {
                    const result = searchresultsTC[i];
                    const columns = result.columns;
                    const objTaxCode = {
                      tcId: result.getValue({ name: columns[0] }),
                      tcIndFac: result.getValue({ name: columns[1] }),
                      tcCodPercep: result.getValue({ name: columns[2] }),
                      esPercRet: result.getValue({ name: columns[3] }),
                      esIndExp: result.getValue({ name: columns[4] }),
                    };

                    arrayTaxCodesSS.push(objTaxCode);
                  }
                }
              }
            }
          }
          //FIN - CARGA DE LA INFORACIÓN DE LOS CODIGOS DE IMPUESTOS RELACIONADOS A LOS ARTICULOS

          log.debug({
            title: 'LINE 880',
            details: 'arrayTaxCodesSS : ' + JSON.stringify(arrayTaxCodesSS) + ' - arrayLines.length: ' + arrayLines.length,
          });

          if (!l598isEmpty(arrayItemSS)) {
            if (arrayItemSS.length > 0) {
              //INICIO - SE CREA UNICO ARRAY DE LINEAS DE LA TRANSACCIÓN Y SE LE AGREGA INFORMACION ADICIONAL DEL ARTICULO
              for (let j = 0; !l598isEmpty(arrayLines) && j < arrayLines.length; j++) {
                const _arrayFilter = arrayItemSS.filter(function (element) {
                  if (element.itemId == arrayLines[j].item) {
                    const obj = {
                      indice: arrayLines[j].indice,
                      sublist: arrayLines[j].sublist,
                      lineKey: arrayLines[j].lineKey,
                      itemId: arrayLines[j].item,
                      itemTaxCode: arrayLines[j].TaxCode,
                      itemName: element.itemName,
                      itemUM: element.itemUM,
                    };

                    arrayFinalAux.push(obj);
                  }
                  return element.itemId == arrayLines[j].item;
                });
              }
              //FIN - SE CREA UNICO ARRAY DE LINEAS DE LA TRANSACCIÓN Y SE LE AGREGA INFORMACION ADICIONAL DEL ARTICULO
            }
          }

          if (!l598isEmpty(arrayItemTimeSS)) {
            if (arrayItemTimeSS.length > 0) {
              //INICIO - SE CREA UNICO ARRAY DE LINEAS DE LA TRANSACCIÓN Y SE LE AGREGA INFORMACION ADICIONAL DEL ARTICULO
              for (let j = 0; !l598isEmpty(arrayLines) && j < arrayLines.length; j++) {
                const _arrayFilter = arrayItemTimeSS.filter(function (element) {
                  if (element.itemId == arrayLines[j].item && element.idTime == arrayLines[j].idTime) {
                    const obj = {
                      idTime: arrayLines[j].idTime,
                      indice: arrayLines[j].indice,
                      sublist: arrayLines[j].sublist,
                      lineKey: arrayLines[j].lineKey,
                      itemId: arrayLines[j].item,
                      itemTaxCode: arrayLines[j].TaxCode,
                      itemName: element.itemName,
                      itemUM: element.itemUM,
                    };

                    arrayFinalAux.push(obj);
                  }
                  return element.itemId == arrayLines[j].item && element.idTime == arrayLines[j].idTime;
                });
              }
              //FIN - SE CREA UNICO ARRAY DE LINEAS DE LA TRANSACCIÓN Y SE LE AGREGA INFORMACION ADICIONAL DEL ARTICULO
            }
          }

          log.debug({
            title: 'afterSubmit',
            details: 'LINE 1545 - arrayFinalAux : ' + JSON.stringify(arrayFinalAux),
          });

          //INICIO - AL ARRAY DE LINEAS UNICO SE LE AGREGA INFORMACION ADICIONAL DEL CODIGO DE IMPUESTO ASOCIADO AL MISMO
          const arrayFinal = [];
          if (!l598isEmpty(arrayTaxCodesSS) && arrayTaxCodesSS.length > 0) {
            for (let j = 0; !l598isEmpty(arrayFinalAux) && j < arrayFinalAux.length; j++) {
              const _arrayFilter = arrayTaxCodesSS.filter(function (element) {
                if (element.tcId == arrayFinalAux[j].itemTaxCode) {
                  const obj = {
                    indice: arrayFinalAux[j].indice,
                    sublist: arrayFinalAux[j].sublist,
                    lineKey: arrayFinalAux[j].lineKey,
                    itemId: arrayFinalAux[j].itemId,
                    itemName: arrayFinalAux[j].itemName,
                    itemUM: arrayFinalAux[j].itemUM,
                    itemTaxCode: arrayFinalAux[j].itemTaxCode,
                    taxCodeIndFac: element.tcIndFac,
                    taxCodeCodPercep: element.tcCodPercep,
                    esPercRet: element.esPercRet,
                    esIndExp: element.esIndExp,
                  };

                  arrayFinal.push(obj);
                }
                return element.tcId == arrayFinalAux[j].itemTaxCode;
              });
            }
          } else {
            for (let j = 0; !l598isEmpty(arrayFinalAux) && j < arrayFinalAux.length; j++) {
              const obj = {
                indice: arrayFinalAux[j].indice,
                sublist: arrayFinalAux[j].sublist,
                lineKey: arrayFinalAux[j].lineKey,
                itemId: arrayFinalAux[j].itemId,
                itemName: arrayFinalAux[j].itemName,
                itemUM: arrayFinalAux[j].itemUM,
                itemTaxCode: arrayFinalAux[j].itemTaxCode,
                taxCodeIndFac: '',
                taxCodeCodPercep: '',
                esPercRet: '',
                esIndExp: '',
              };

              arrayFinal.push(obj);
            }
          }
          //FIN - AL ARRAY DE LINEAS UNICO SE LE AGREGA INFORMACION ADICIONAL DEL CODIGO DE IMPUESTO ASOCIADO AL MISMO

          log.debug({
            title: 'URU-Info Lineas',
            details: 'DetalleFinalLineas - arrayFinal: ' + JSON.stringify(arrayFinal),
          });

          for (let subListaContador = 0; subListaContador < tipoSublistas.length; subListaContador++) {
            const tipoSublistaConsultar = tipoSublistas[subListaContador];

            log.debug('afterSubmit', 'LINE 1602 - tipoSublistaConsultar= ' + JSON.stringify(tipoSublistaConsultar));

            const cantidadItems = objRecord.getLineCount({
              sublistId: tipoSublistaConsultar, //string*
            });

            log.debug('afterSubmit', 'LINE 1608 - cantidadItems= ' + JSON.stringify(cantidadItems));

            for (let i = 0; i < cantidadItems; i++) {
              const aplicar = objRecord.getSublistValue({
                sublistId: tipoSublistaConsultar,
                fieldId: 'apply',
                line: i,
              });
              log.debug('afterSubmit', 'LINE 1616 - aplicar= ' + JSON.stringify(aplicar));

              const itemType = objRecord.getSublistValue({
                sublistId: tipoSublistaConsultar,
                fieldId: 'itemtype',
                line: i,
              });
              log.debug('afterSubmit', 'LINE 1623 - itemType= ' + JSON.stringify(itemType));

              let transCodImpuesto = objRecord.getSublistValue({
                sublistId: tipoSublistaConsultar,
                fieldId: 'custcol_l598_codigo_impuesto',
                line: i,
              });

              log.debug('afterSubmit', 'LINE 1631 - transCodImpuesto= ' + JSON.stringify(transCodImpuesto));

              if (itemType != 'EndGroup') {
                if (tipoSublistaConsultar == 'item' || aplicar == 'T' || aplicar == true || tipoSublistaConsultar == 'time') {
                  if ((tipoSublistaConsultar == 'time' && (aplicar == 'T' || aplicar == true)) || tipoSublistaConsultar == 'item') {
                    // const resultadosImpuestos = null;

                    const transCodImpuestoStr = objRecord.getSublistValue({
                      sublistId: tipoSublistaConsultar,
                      fieldId: 'custcol_l598_codigo_impuesto',
                      line: i,
                    });

                    log.debug('afterSubmit', 'LINE 1644 - transCodImpuestoStr=' + JSON.stringify(transCodImpuestoStr));

                    transCodImpuesto = objRecord.getSublistValue({
                      sublistId: tipoSublistaConsultar,
                      fieldId: 'custcol_l598_codigo_impuesto',
                      line: i,
                    });

                    // log.debug('afterSubmit', 'LINE transCodImpuesto=' + JSON.stringify(transCodImpuesto));

                    const esRetencion = objRecord.getSublistValue({
                      sublistId: tipoSublistaConsultar,
                      fieldId: 'custcol_l598_es_retencion',
                      line: i,
                    });

                    const itemId = objRecord.getSublistValue({
                      sublistId: tipoSublistaConsultar,
                      fieldId: 'item',
                      line: i,
                    });

                    const iteml598nombre = objRecord.getSublistValue({
                      sublistId: tipoSublistaConsultar,
                      fieldId: 'custcol_l598_articulo_nombre',
                      line: i,
                    });

                    const _iteml598descrip = objRecord.getSublistValue({
                      sublistId: tipoSublistaConsultar,
                      fieldId: 'custcol_l598_articulo_descripcion',
                      line: i,
                    });
                    const iteml598unidMed = objRecord.getSublistValue({
                      sublistId: tipoSublistaConsultar,
                      fieldId: 'custcol_l598_articulo_unid_medida',
                      line: i,
                    });
                    let itemName = '';
                    let itemUnidadMed = '';
                    const _lineKey = objRecord.getSublistValue({
                      sublistId: tipoSublistaConsultar,
                      fieldId: 'lineuniquekey',
                      line: i,
                    });

                    const arrayLineTemp = arrayFinal.filter(function (element) {
                      return element.sublist == tipoSublistaConsultar && element.indice == i;
                    });

                    log.debug({
                      title: 'URU-Info Lineas',
                      details:
                        'Sublista: ' + tipoSublistaConsultar + ' - Indice: ' + i + ' - DetalleLinea: ' + JSON.stringify(arrayLineTemp),
                    });
                    log.debug({
                      title: 'LINE 998',
                      details:
                        'tipoSublistaConsultar: ' +
                        tipoSublistaConsultar +
                        ' - Indice: ' +
                        i +
                        ' - arrayLineTemp : ' +
                        JSON.stringify(arrayLineTemp),
                    });
                    log.debug({
                      title: 'URU-Info Lineas',
                      details:
                        'transCodImpuesto: ' +
                        transCodImpuesto +
                        ' - transCodImpuestoStr: ' +
                        transCodImpuestoStr +
                        ' - itemId: ' +
                        itemId +
                        ' - iteml598nombre: ' +
                        iteml598nombre +
                        ' - iteml598unidMed: ' +
                        iteml598unidMed,
                    });

                    //SI EL CAMPO URU-NOMBRE ARTICULO ESTA VACIO, SE BUSCA EL VALOR RESPECTIVO
                    if (l598isEmpty(iteml598nombre) && arrayLineTemp.length > 0) {
                      if (!l598isEmpty(itemId)) {
                        if (tipoSublistaConsultar == 'item') itemName = arrayLineTemp[0].itemName;

                        if (tipoSublistaConsultar == 'time') itemName = arrayLineTemp[0].itemName;

                        if (!l598isEmpty(itemName))
                          objRecord.setSublistValue({
                            sublistId: tipoSublistaConsultar,
                            fieldId: 'custcol_l598_articulo_nombre',
                            line: i,
                            value: itemName,
                          });
                      }
                    }
                    //SI EL CAMPO URU-UNIDAD MEDIDA ARTICULO ESTA VACIO, SE BUSCA EL VALOR RESPECTIVO
                    if (l598isEmpty(iteml598unidMed) && arrayLineTemp.length > 0) {
                      if (!l598isEmpty(itemId)) {
                        if (tipoSublistaConsultar == 'item') itemUnidadMed = arrayLineTemp[0].itemUM;

                        if (tipoSublistaConsultar == 'time') itemUnidadMed = arrayLineTemp[0].itemUM;

                        if (!l598isEmpty(itemUnidadMed))
                          objRecord.setSublistValue({
                            sublistId: tipoSublistaConsultar,
                            fieldId: 'custcol_l598_articulo_unid_medida',
                            line: i,
                            value: itemUnidadMed,
                          });
                      }
                    }
                    log.debug('afterSubmit', 'LINE 1756 - transCodImpuesto: ' + JSON.stringify(transCodImpuesto));
                    log.debug('afterSubmit', 'LINE 1757 - arrayLineTemp: ' + JSON.stringify(arrayLineTemp));
                    if (!l598isEmpty(transCodImpuesto)) {
                      if (!l598isEmpty(arrayLineTemp) && arrayLineTemp.length > 0)
                        if (!l598isEmpty(arrayLineTemp[0].taxCodeIndFac) || !l598isEmpty(arrayLineTemp[0].taxCodeCodPercep)) {
                          let esPercepcionRetencion = false;
                          const indicadorFacturacion = arrayLineTemp[0].taxCodeIndFac;
                          const codigoPercRetCred = arrayLineTemp[0].taxCodeCodPercep;
                          let esIndicadorExportacion = false;
                          log.debug('afterSubmit', 'LINE 1765 - indicadorFacturacion: ' + JSON.stringify(indicadorFacturacion));
                          if (!l598isEmpty(indicadorFacturacion)) {
                            let esIndExp = '';
                            let esPercRet = '';
                            if (!l598isEmpty(arrayLineTemp[0].esIndExp) || !l598isEmpty(arrayLineTemp[0].esPercRet)) {
                              /*esIndExp = infoIndFact.custrecord_l598_ind_fact_det_exp_asim;
                esPercRet = infoIndFact.custrecord_l598_ind_fact_det_perc_ret;*/
                              esIndExp = arrayLineTemp[0].esIndExp;
                              esPercRet = arrayLineTemp[0].esPercRet;

                              if (!l598isEmpty(esIndExp) && (esIndExp == 'T' || esIndExp == true)) {
                                esIndicadorExportacion = true;
                              }
                              if (!l598isEmpty(esPercRet) && (esPercRet == 'T' || esPercRet == true)) {
                                esPercepcionRetencion = true;
                              }
                              if (
                                (comprobanteExportacion == 'T' || comprobanteExportacion == true) &&
                                esIndicadorExportacion == false
                              ) {
                                log.error({
                                  title: 'URU-Asignacion Indicador Facturacion',
                                  details:
                                    'El Indicador de Facturacion no se corresponde con un indicador de Facturacion de Exportacion y Asimiladas - ID Interno Transaccion : ' +
                                    recId,
                                });
                              }

                              objRecord.setSublistValue({
                                sublistId: tipoSublistaConsultar,
                                fieldId: 'custcol_l598_ind_facturacion',
                                line: i,
                                value: indicadorFacturacion,
                              });
                            } else {
                              log.error({
                                title: 'URU-Asignacion Indicador Facturacion',
                                details:
                                  'No se pudo Obtener la Informacion Adicional del Indicador de Facturacion - ID Interno Transaccion : ' +
                                  recId,
                              });
                            }
                          } else {
                            log.error({
                              title: 'URU-Asignacion Indicador Facturacion',
                              details:
                                'No se Encuentra Configurado el Indicador de Facturacion para el Articulo de Impuesto : ' +
                                transCodImpuestoStr +
                                ' - ID Interno Transaccion : ' +
                                recId,
                            });
                          }
                          if (!l598isEmpty(codigoPercRetCred)) {
                            if (l598isEmpty(esRetencion) || esRetencion == 'F' || esRetencion == false) {
                              objRecord.setSublistValue({
                                sublistId: tipoSublistaConsultar,
                                fieldId: 'custcol_l598_cod_perc_ret_cred',
                                line: i,
                                value: codigoPercRetCred,
                              });
                            }
                          } else {
                            if (esPercepcionRetencion == true) {
                              log.error({
                                title: 'URU-Asignacion Indicador Facturacion',
                                details:
                                  'No se Encuentra Configurado el Codigo de Percepcion/Retencion - ID Interno Transaccion : ' +
                                  recId,
                              });
                            }
                          }
                        }
                    }
                  }
                }
              }
            }
          }
        }
        // FIN - manejo de datos a nivel de lineas

        if (recType != 'transferorder' && recType != 'salesorder' && recType != 'vendorbill') {
          if (
            scriptContext.type == scriptContext.UserEventType.CREATE ||
            scriptContext.type == scriptContext.UserEventType.EDIT ||
            scriptContext.type == scriptContext.UserEventType.COPY
          ) {
            // const recId = objRecord.id;
            if (!l598isEmpty(recId) && !l598isEmpty(recType)) {
              /* record.submitFields({
            type: recType,
            id: recId,
            values: {
              custbody_l598_nro_comprobante: recId
            },
            options: {
              enableSourcing: false,
              ignoreMandatoryFields: true
            }
          }); */
              objRecord.setValue({
                fieldId: 'custbody_l598_nro_comprobante',
                value: recId,
              });
            }
          }
        }

        var idTransApply = []
        if (recType == "creditmemo") {
          var cantidadItems = objRecord.getLineCount({ sublistId: 'apply' });
          for (var j = 0; j < cantidadItems; j++) {
            var aplicado = objRecord.getSublistValue({ sublistId: 'apply', fieldId: 'apply', line: j });
            if (aplicado == true || aplicado == 'T') {
              var internalIdLine = objRecord.getSublistValue({ sublistId: 'apply', fieldId: 'internalid', line: j });
              idTransApply.push({
                internalId: internalIdLine,
                line: j
              });
              objRecord.setSublistValue({ sublistId: 'apply', fieldId: 'apply', line: j, value: false });
            }
          }

          log.debug('idTransApply', JSON.stringify(idTransApply));
          if (!utilities.isEmpty(idTransApply) && idTransApply.length > 0) {
            for (var j = 0; j < idTransApply.length; j++) {
              log.debug('idTransApply[j].internalId', idTransApply[j].internalId);
              objRecord.setSublistValue({ sublistId: 'apply', fieldId: 'apply', line: idTransApply[j].line, value: true });
            }
          }
        }

        let idRecNew = objRecord.save({
          enableSourcing: false,
          ignoreMandatoryFields: true,
        });

        log.debug(proceso, `FIN - afterSubmit / id: ${idRecNew} / type: ${recType}`);
      }
    }


    let setearCodigoImpuestosLineas = (objRecord) => {

      let proceso = 'setearCodigoImpuestosLineas';

      try {
        log.debug(proceso, `INICIO - setearcodigoImpuestosLineas`);

        const taxDetailsQuantity = objRecord.getLineCount({
          sublistId: 'taxdetails'
        });

        const itemsQuantity = objRecord.getLineCount({
          sublistId: 'item'
        });

        log.debug(proceso, `itemsQuantity: ${itemsQuantity} / taxDetailsQuantity: ${taxDetailsQuantity}`);
        let arrayTaxDetails = [];
        let arrayTaxCodes = [];

        // Obtencion de taxCodes por taxDetails
        for (let i = 0; i < taxDetailsQuantity; i++) {
          let infoTaxDetail = {};
          infoTaxDetail.taxDetailReference = objRecord.getSublistValue('taxdetails', 'taxdetailsreference', i);
          infoTaxDetail.taxCode = objRecord.getSublistValue('taxdetails', 'taxcode', i);
          infoTaxDetail.taxRate = objRecord.getSublistValue('taxdetails', 'taxrate', i);
          arrayTaxCodes.push(infoTaxDetail.taxCode);
          arrayTaxDetails.push(infoTaxDetail);
        }

        log.debug(proceso, `arrayTaxDetails: ${JSON.stringify(arrayTaxDetails)}`);
        log.debug(proceso, `arrayTaxCodes: ${JSON.stringify(arrayTaxCodes)}`);

        // Obtencion de taxCodes por items
        if (arrayTaxDetails.length > 0) {

          for (let i = 0; i < itemsQuantity; i++) {

            let taxDetailReferenceItem = objRecord.getSublistValue('item', 'taxdetailsreference', i);
            let itemInGroup = objRecord.getSublistValue('item', 'ingroup', i);
            let taxCodeItemResult = arrayTaxDetails.filter(obj => { return (obj.taxDetailReference == taxDetailReferenceItem) });
            let itemType = objRecord.getSublistValue('item', 'itemtype', i);

            log.debug(proceso, `line nro: ${i} / taxCodeItemResult: ${JSON.stringify(taxCodeItemResult)} / itemType: ${itemType} / itemInGroup: ${itemInGroup}`);

            if (!l598isEmpty(taxCodeItemResult) && taxCodeItemResult.length > 0) {

              objRecord.setSublistValue('item', 'custcol_l598_codigo_impuesto', i, taxCodeItemResult[0].taxCode);
              objRecord.setSublistValue('item', 'custcol_l598_tasa_impuesto', i, taxCodeItemResult[0].taxRate);

              if (!l598isEmpty(itemInGroup) && (itemInGroup == 'T' || itemInGroup == true)) {

                let beforeLine = i - 1;
                let itemTypeItemBefore = objRecord.getSublistValue('item', 'itemtype', beforeLine);
                log.debug(proceso, `beforeLine: ${beforeLine} / itemTypeItemBefore: ${itemTypeItemBefore}`);

                if (itemTypeItemBefore == 'Group') {
                  objRecord.setSublistValue('item', 'custcol_l598_codigo_impuesto', beforeLine, taxCodeItemResult[0].taxCode);
                  objRecord.setSublistValue('item', 'custcol_l598_tasa_impuesto', beforeLine, taxCodeItemResult[0].taxRate);
                }
              }
            } else if (itemType == 'Discount' && i > 0) {
              // Verificacion de si es mayor a la primera posicion para verificar si es descuento.
              // Esto se realiza porque el descuento no se refleja en el tax details.

              let taxCodeLineItemBefore = objRecord.getSublistValue('item', 'custcol_l598_codigo_impuesto', i - 1);
              let taxRateLineItemBefore = objRecord.getSublistValue('item', 'custcol_l598_tasa_impuesto', i - 1);

              objRecord.setSublistValue('item', 'custcol_l598_codigo_impuesto', i, taxCodeLineItemBefore);
              objRecord.setSublistValue('item', 'custcol_l598_tasa_impuesto', i, taxRateLineItemBefore);

            } else {
              log.error(proceso, `No se encuentra resultado de tax reference y tax code en la linea de articulos nro: ${i} / taxDetailsReference: ${taxDetailReferenceItem}, verifique por favor.`);
            }
          }
        } else {
          log.error(proceso, `No se encuentra resultado de tax details en la transaccion, verifique por favor.`);
        }

        log.debug(proceso, `FIN - setearcodigoImpuestosLineas`);
      } catch (error) {
        log.error(proceso, `Error NetSuite Excepcion en Setear Codigos de Impuestos Tax Codes - detalles: ${error.message}`);
      }
    }

    //function l598beforeLoadTransaction(type) {
    //En los scripts de evento de usuario, la referencia al récord que se guarda es:
    //context.newRecord, no es: context.currentRecord
    function beforeLoad(context) {
      /* 		
      Se comenta esta funcionalidad porque está repetida en este script,
      Al momento de guardarse una transacción esta funcionalidad se ejecuta y no es
      necesario repetirla acá; además, el script de cliente de L598_CS.js también
      posee el manejo de dicha funcionalidad al iniciar la carga de la transacción
    	
      */
      log.audit({
        title: "Before Load",
        details: "INICIO"
      });
      const objRecord = context.newRecord;
      const executionContext = runtime.executionContext;
      const recType = objRecord.type;
      const idTransaccion = objRecord.id;

      if ((context.type === context.UserEventType.CREATE || context.type == context.UserEventType.COPY) && recType != "vendorbill" && recType == "invoice" && executionContext == "userevent") {
        try {

          // INICIO - Consultar Sucursal por Defecto
          const serie = objRecord.getValue({
            fieldId: "custbody_l598_serie_comprobante"
          });

          const sucursal = objRecord.getValue({
            fieldId: "custbody_l598_sucursal"
          });

          const caja = objRecord.getValue({
            fieldId: "custbody_l598_caja"
          });

          const location = objRecord.getValue({
            fieldId: "location"
          });

          const codigoSucursal = objRecord.getValue({
            fieldId: "custbody_l598_codigo_sucursal"
          });

          const codigoSerie = objRecord.getValue({
            fieldId: "custbody_l598_codigo_serie"
          });

          if (l598isEmpty(sucursal) || l598isEmpty(serie) || l598isEmpty(caja) || !l598isEmpty(location)) {

            const infoSucursal = obtenerSucursal(objRecord);

            log.debug({
              title: "Before Load",
              details: "infoSucursal: " + JSON.stringify(infoSucursal) + " - sucursal: " + sucursal + " - serie: " + serie + " - caja: " + caja + " - ubicación: " + location + " - codigoSerie: " + codigoSerie + " - codigoSurcursal: " + codigoSucursal
            });

            if (!l598isEmpty(infoSucursal)) {
              if (!l598isEmpty(infoSucursal.sucursal) && l598isEmpty(sucursal)) {

                objRecord.setValue({
                  fieldId: "custbody_l598_sucursal",
                  value: infoSucursal.sucursal
                });
              }
              if (!l598isEmpty(infoSucursal.serie) && l598isEmpty(serie)) {

                objRecord.setValue({
                  fieldId: "custbody_l598_serie_comprobante",
                  value: infoSucursal.serie
                });
              }
              if (!l598isEmpty(infoSucursal.caja) && l598isEmpty(caja)) {

                objRecord.setValue({
                  fieldId: "custbody_l598_caja",
                  value: infoSucursal.caja
                });
              }
              if (!l598isEmpty(infoSucursal.codigoSucursal) && l598isEmpty(codigoSucursal)) {

                objRecord.setValue({
                  fieldId: "custbody_l598_codigo_sucursal",
                  value: infoSucursal.codigoSucursal
                });
              }
              if (!l598isEmpty(infoSucursal.codigoSerie) && l598isEmpty(codigoSerie)) {
                objRecord.setValue({
                  fieldId: "custbody_l598_codigo_serie",
                  value: infoSucursal.codigoSerie
                });
              }
            }
            else {
              log.error({
                title: "Before Load",
                details: "Error Obteniendo la Serie, Sucursal y Caja por defecto - ID Interno Transaccion: " + idTransaccion
              });
            }
          }
        }
        catch (e) {
          log.error({
            title: "Excepcion cargando transaccion (" + recType + ")",
            details: "ID Interno Transaccion : " + idTransaccion + " - NetSuite Error: " + e.message
          });
        }
      }

      log.audit({
        title: "Before Load",
        details: "FIN"
      });
    }
    return {
      beforeLoad: beforeLoad,
      beforeSubmit: beforeSubmit,
      afterSubmit: afterSubmit
    };
  });
