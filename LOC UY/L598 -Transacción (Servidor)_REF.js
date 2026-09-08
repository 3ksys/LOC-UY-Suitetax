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


    /**
     * Vacío según las reglas propias de este script: además de "", null y undefined,
     * trata como vacíos los strings "null" y "undefined".
     *
     * ⚠️ TRS-D7 — NO es equivalente a `utilities.isEmpty`, que no contempla esos dos
     * strings. El archivo usa esta versión en 70 llamadas y `utilities.isEmpty` en una
     * solo (L1907, rama apply de creditmemo). Unificarlas cambiaría comportamiento,
     * así que queda fuera del refactor seguro y registrado como pendiente.
     */
    function l598isEmpty(value) {
      return value === "" || value === null || value === undefined || value === "null" || value === "undefined";
    }

    /**
     * TRS-C4 — Verdadero según la semántica dual que usa toda la localización:
     * los campos checkbox llegan como boolean `true` o como el string `"T"` según
     * el contexto de lectura. Reemplaza literalmente el patrón de doble comparación
     * repetido 18 veces en el archivo; no agrega ni quita casos.
     */
    function esVerdadero(valor) {
      const esStringT = valor == "T";
      const esBooleanTrue = valor == true;
      return esStringT || esBooleanTrue;
    }

    /**
     * TRS-B2 — Índice clave -> lista de elementos, preservando el orden original del
     * array. Reemplaza los `filter()` anidados en for que además empujaban resultados
     * desde adentro del callback (O(n x m) por cada cruce).
     *
     * Equivalencia: el `filter` recorría el array fuente en orden y empujaba UN objeto
     * por cada coincidencia; recorrer la lista del índice hace exactamente lo mismo,
     * con el mismo orden y la misma cantidad de elementos (los multi-match se conservan).
     *
     * ⚠️ La comparación original era `==` (débil). Acá la clave se normaliza con String(),
     * equivalente para ids numéricos/string —el dominio real—; es el mismo riesgo residual
     * declarado y ya caracterizado en STC-B1.
     */
    const SEPARADOR_CLAVE = '|';

    function indexarPor(array, claveDe) {
      const indice = new Map();
      for (let i = 0; i < array.length; i++) {
        const clave = claveDe(array[i]);
        if (!indice.has(clave)) {
          indice.set(clave, []);
        }
        indice.get(clave).push(array[i]);
      }
      return indice;
    }

    /**
     * Agrega al array sólo si el valor no está vacío.
     * TRS-D3: era `Array.prototype.pushSafe`. Misma semántica, incluido el log del
     * caso descartado; deja de extenderse un prototipo nativo.
     */
    function pushSafe(array, val) {
      if (!l598isEmpty(val)) {
        array.push(val);
      } else {
        log.debug("se trato de guardar un valor nulo en un array, no se agrega");
      }
    }

    // TRS-D2/D3: se eliminó `Number.prototype.toFixedOK` — estaba definido y no se
    // usaba en ningún camino del script. Si se aprueba TRS-A6 (normalizar la parte
    // decimal del monto en letras a 2 dígitos), ahí se agrega el redondeo que haga falta.
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


      // TRS-B3: es un chequeo de existencia (solo se mira length > 0); alcanza con 1 fila.
      const searchresults = search.create({
        type: "customrecord_l598_datos_impositivos_emp",
        filters: filters
      }).run().getRange({
        start: 0,
        end: 1
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
        // TRS-C1: era eval(). Los 3 argumentos llegan siempre de parseInt() en
        // getNumberLiteral, así que Number() es equivalente, NaN incluido.
        const centenas = Number(c);
        const decenas = Number(d);
        const decom = Number(u);

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

          alert("La Cantidad debe ser un valor Numérico.");
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

        if (!l598isEmpty(esExportacion) && (esVerdadero(esExportacion))) {
          comprobanteExportacion = true;
        }

        if (!l598isEmpty(compContingencia) && (esVerdadero(compContingencia))) {
          comprobanteContingencia = true;
        }

        if (!l598isEmpty(compCuentaAjena) && (esVerdadero(compCuentaAjena))) {
          comprobanteCuentaAjena = true;
        }

        if (!l598isEmpty(esTicket) && (esVerdadero(esTicket))) {
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


      if (objSucursalxLocation != null) {

        if (!l598isEmpty(objSucursalxLocation.sucursalDefault)) {
          informacionSucursal.sucursal = objSucursalxLocation.sucursalDefault;

        }


        if (!l598isEmpty(objSucursalxLocation.porLocation) && (esVerdadero(objSucursalxLocation.porLocation))) {

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


      // TRS-B3: solo se lee searchresults[0]; traer hasta 1000 filas era trabajo perdido.
      const searchresults = search.create({
        type: "customrecord_l598_datos_impositivos_emp",
        filters: filters,
        columns: columns
      }).run().getRange({
        start: 0,
        end: 1
      });

      if (searchresults != null && searchresults.length > 0) {
        const sucPorLocation = searchresults[0].getValue({ name: "custrecord_l598_dat_imp_num_location" });
        const sucDefault = searchresults[0].getValue({ name: "custrecord_l598_dat_imp_suc_default" });


        if (!l598isEmpty(sucPorLocation) && (esVerdadero(sucPorLocation))) {
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

    /**
     * TRS-D4 — Extraido del afterSubmit tal cual estaba, sin reordenar efectos.
     * Escribe custbody_l598_monto_escrito sobre el registro recibido.
     * El gate `recType != 'vendorbill'` se conserva adentro, en la misma posicion
     * relativa que tenia, para no mover la decision de lugar.
     */
    function escribirMontoEscrito(objRecord, recType, recId) {
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
    }

    /**
     * TRS-D4 — 1ª pasada del afterSubmit, extraida tal cual. Recorre las sublistas
     * y recolecta las lineas con su tax code, mas los ids de articulo y de tax code
     * que despues alimentan las saved searches.
     *
     * Los 4 arrays estaban declarados en el afterSubmit y se llenaban por efecto
     * colateral; ahora se declaran e inicializan aca y se devuelven. El cuerpo del
     * recorrido no cambio ni una linea.
     */
    function recolectarLineasDeSublistas(objRecord, tipoSublistas) {

      const proceso = 'recolectarLineasDeSublistas';
      const arrayLines = [];
      const arrayItem = [];
      const arrayItemTime = [];
      const arrayTaxCodes = [];

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
            if (tipoSublistaConsultar == 'item' || esVerdadero(aplicar) || tipoSublistaConsultar == 'time') {
              // TRS-B5: la condicion original era `|| tipoSublistaConsultar != 'time'`,
              // que recolectaba tambien itemcost/expcost/expenses. La 2a pasada solo
              // escribe 'item' y 'time' (misma condicion, con == 'item'), asi que esas
              // filas se recolectaban, viajaban a las busquedas y a los cruces, y no se
              // usaban nunca. Se iguala la condicion a la de la 2a pasada.
              if ((tipoSublistaConsultar == 'time' && (esVerdadero(aplicar))) || tipoSublistaConsultar == 'item') {
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
                if (tipoSublistaConsultar == 'time' && (esVerdadero(aplicar)))
                  objLine.idTime = objRecord.getSublistValue({
                    sublistId: tipoSublistaConsultar,
                    fieldId: 'doc',
                    line: i,
                  });

                pushSafe(arrayLines, objLine);

                pushSafe(arrayTaxCodes, codImpuesto);
              }
              if (tipoSublistaConsultar != 'time' && tipoSublistaConsultar != 'expcost' && tipoSublistaConsultar != 'expenses')
                pushSafe(arrayItem,
                  objRecord.getSublistValue({
                    sublistId: tipoSublistaConsultar,
                    fieldId: 'item',
                    line: i,
                  })
                );

              if (tipoSublistaConsultar == 'time' && (esVerdadero(aplicar))) {
                const item_ = objRecord.getSublistValue({
                  sublistId: tipoSublistaConsultar,
                  fieldId: 'item',
                  line: i,
                });
                pushSafe(arrayItemTime, item_);
              }
            }
          }
        }
      }
      //FIN - SE RECORRE LA SUBLISTA INICIALMENTE PARA EXTRAER EL ID DE LOS ARTICULOS Y SU TAX CODE

      return { arrayLines, arrayItem, arrayItemTime, arrayTaxCodes };
    }

    /**
     * TRS-A7 — Corre una saved search paginando hasta agotar resultados.
     * (aprobado por Tekiio, 2026-09-08)
     *
     * Las 3 saved searches de este afterSubmit leian `getRange({start:0, end:1000})`
     * de una sola vez: pasadas las 1.000 filas, las lineas restantes quedaban sin
     * nombre de articulo, unidad de medida, indicador de facturacion ni codigo de
     * percepcion, y sin ningun aviso.
     *
     * El resultado solo cambia por encima de 1.000 filas. Por debajo devuelve
     * exactamente lo mismo que antes, en el mismo orden.
     *
     * ----------------------------------------------------------------------------
     * POR QUE NO SE USAN utilities.searchSaved / searchSavedPro
     * ----------------------------------------------------------------------------
     * La propuesta TRS-A7 decia reusar esos helpers, que efectivamente paginan.
     * Al leerlos aparecieron tres costos que no estaban previstos:
     *
     * 1. `searchSavedPro` llama `armarArreglosSS()` sin condicion, que recorre
     *    cada fila POR cada columna con un getValue. Nosotros mapeamos por indice
     *    de columna, asi que ese array se descarta: hasta 1.000 x 5 = 5.000
     *    getValue tirados por busqueda, y peor justamente en el caso de volumen
     *    alto que este cambio viene a cubrir.
     * 2. `searchSaved` emite 2 `log.audit` por llamada, uno con JSON.stringify del
     *    array de ids. Es exactamente el patron que TRS-B4 acaba de sacar del
     *    camino caliente de este script.
     * 3. Los dos capturan la excepcion y la devuelven como `objRespuesta.error`.
     *    Este afterSubmit NO tiene try/catch, asi que hoy un fallo de busqueda es
     *    un error no manejado y ruidoso. Adoptarlos sin chequear ese flag
     *    convertiria un fallo ruidoso en uno silencioso, con lineas incompletas
     *    viajando al CFE — el mismo defecto que STC-A2. Y chequearlo implica
     *    escribir el guard de todos modos.
     *
     * ⚠️ Trampa aparte, para el dia que se los use: `operadorBusqueda()` hace
     * switch sobre nombres en MAYUSCULA ('ANYOF') y no tiene rama default, asi que
     * pasarle `search.Operator.ANYOF` — que vale 'anyof' — devuelve string vacio y
     * el createFilter falla dentro del try del helper. Es el mismo tipo de desajuste
     * de mayusculas contra un enum de NetSuite que TRS-A4.
     *
     * Este loop local preserva la semantica de error actual (la excepcion propaga),
     * no agrega pasadas sobre el result set y no acopla a esa trampa. El costo es
     * que la logica de paginado queda repetida en el proyecto; es el mas barato de
     * los cuatro.
     *
     * @param {string} idSavedSearch
     * @param {*} filtro filtro ya construido con search.createFilter
     * @returns {*[]} todos los resultados, en el orden en que los devuelve la busqueda
     */
    function correrSavedSearchPaginada(idSavedSearch, filtro) {

      const PASO = 1000; // maximo que admite getRange por llamada

      const savedSearch = search.load({ id: idSavedSearch });
      savedSearch.filters.push(filtro);
      const resultSet = savedSearch.run();

      const resultados = [];
      let indice = 0;
      let pagina;

      do {
        pagina = resultSet.getRange({ start: indice, end: indice + PASO });

        if (pagina && pagina.length > 0) {
          for (let i = 0; i < pagina.length; i++) {
            resultados.push(pagina[i]);
          }
        }

        indice += PASO;

        // Una pagina incompleta ya es la ultima: cortar aca evita la llamada extra
        // que hace el paginado de utilities cuando el total es multiplo exacto de PASO.
      } while (pagina && pagina.length === PASO);

      return resultados;
    }

    /**
     * TRS-D4 — Saved search `customsearch_l598_articulos`, extraida tal cual del
     * afterSubmit. Devuelve el array que antes se llenaba por efecto colateral.
     */
    function buscarInfoArticulos(arrayItem) {

      const arrayItemSS = [];

      if (!l598isEmpty(arrayItem)) {
        if (arrayItem.length > 0) {
          //INICIO - SE CARGA LA INFORMACION PARA TODOS LOS ARTICULOS DE LA TRANSACCIÓN

          const filtro = search.createFilter({
            name: 'internalid',
            operator: search.Operator.ANYOF,
            values: arrayItem,
          });

          // TRS-A7: era load + run + getRange({start:0, end:1000}) sin paginar.
          const searchresults = correrSavedSearchPaginada('customsearch_l598_articulos', filtro);

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

      return arrayItemSS;
    }

    /**
     * TRS-D4 — Saved search `customsearch_l598_timebill`, extraida tal cual.
     */
    function buscarInfoTimebill(arrayItemTime) {

      const arrayItemTimeSS = [];

      if (!l598isEmpty(arrayItemTime)) {
        if (arrayItemTime.length > 0) {
          //INICIO - SE CARGA LA INFORMACION PARA TODOS LOS ARTICULOS DE LA TRANSACCIÓN

          // TRS-C4: era un objeto plano; las otras 2 búsquedas del afterSubmit ya
          // usaban search.createFilter. search.Operator.ANYOF === 'anyof'.
          const filtro = search.createFilter({
            name: 'item',
            operator: search.Operator.ANYOF,
            values: arrayItemTime,
          });

          // TRS-A7: era load + run + getRange({start:0, end:1000}) sin paginar.
          const searchresults = correrSavedSearchPaginada('customsearch_l598_timebill', filtro);

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

      return arrayItemTimeSS;
    }

    /**
     * TRS-D4 — Saved search `customsearch_l598_cod_impuestos`, extraida tal cual.
     */
    function buscarInfoTaxCodes(arrayTaxCodes) {

      const arrayTaxCodesSS = [];

      if (!l598isEmpty(arrayTaxCodes)) {
        if (arrayTaxCodes.length > 0) {
          const filtro = search.createFilter({
            name: 'internalid',
            operator: search.Operator.ANYOF,
            values: arrayTaxCodes,
          });

          // TRS-A7: era load + run + getRange({start:0, end:1000}) sin paginar.
          const searchresultsTC = correrSavedSearchPaginada('customsearch_l598_cod_impuestos', filtro);

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

      return arrayTaxCodesSS;
    }

    /**
     * TRS-D4 — Los dos cruces que producen arrayFinalAux (lineas de articulo y
     * lineas de tiempo), extraidos tal cual y en el mismo orden en que corrian.
     */
    function cruzarLineasConArticulos(arrayLines, arrayItemSS, arrayItemTimeSS) {

      const arrayFinalAux = [];

      if (!l598isEmpty(arrayItemSS)) {
        if (arrayItemSS.length > 0) {
          //INICIO - SE CREA UNICO ARRAY DE LINEAS DE LA TRANSACCIÓN Y SE LE AGREGA INFORMACION ADICIONAL DEL ARTICULO
          const itemSSPorItemId = indexarPor(arrayItemSS, (element) => String(element.itemId));
          for (let j = 0; !l598isEmpty(arrayLines) && j < arrayLines.length; j++) {
            const coincidencias = itemSSPorItemId.get(String(arrayLines[j].item)) || [];
            for (const element of coincidencias) {
              arrayFinalAux.push({
                indice: arrayLines[j].indice,
                sublist: arrayLines[j].sublist,
                lineKey: arrayLines[j].lineKey,
                itemId: arrayLines[j].item,
                itemTaxCode: arrayLines[j].TaxCode,
                itemName: element.itemName,
                itemUM: element.itemUM,
              });
            }
          }
          //FIN - SE CREA UNICO ARRAY DE LINEAS DE LA TRANSACCIÓN Y SE LE AGREGA INFORMACION ADICIONAL DEL ARTICULO
        }
      }

      if (!l598isEmpty(arrayItemTimeSS)) {
        if (arrayItemTimeSS.length > 0) {
          //INICIO - SE CREA UNICO ARRAY DE LINEAS DE LA TRANSACCIÓN Y SE LE AGREGA INFORMACION ADICIONAL DEL ARTICULO
          // Clave compuesta: los dos componentes son ids internos numéricos, así que
          // no pueden contener el separador ni producir colisiones entre sí.
          const timeSSPorItemYTiempo = indexarPor(arrayItemTimeSS, (element) => String(element.itemId) + SEPARADOR_CLAVE + String(element.idTime));
          for (let j = 0; !l598isEmpty(arrayLines) && j < arrayLines.length; j++) {
            const claveLinea = String(arrayLines[j].item) + SEPARADOR_CLAVE + String(arrayLines[j].idTime);
            const coincidencias = timeSSPorItemYTiempo.get(claveLinea) || [];
            for (const element of coincidencias) {
              arrayFinalAux.push({
                idTime: arrayLines[j].idTime,
                indice: arrayLines[j].indice,
                sublist: arrayLines[j].sublist,
                lineKey: arrayLines[j].lineKey,
                itemId: arrayLines[j].item,
                itemTaxCode: arrayLines[j].TaxCode,
                itemName: element.itemName,
                itemUM: element.itemUM,
              });
            }
          }
          //FIN - SE CREA UNICO ARRAY DE LINEAS DE LA TRANSACCIÓN Y SE LE AGREGA INFORMACION ADICIONAL DEL ARTICULO
        }
      }

      return arrayFinalAux;
    }

    /**
     * TRS-D4 — Cruce final con los tax codes, extraido tal cual (incluida la rama
     * else que completa los 4 campos en vacio cuando no hubo resultados).
     */
    function cruzarConTaxCodes(arrayFinalAux, arrayTaxCodesSS) {

      const arrayFinal = [];

      if (!l598isEmpty(arrayTaxCodesSS) && arrayTaxCodesSS.length > 0) {
        const taxCodesSSPorId = indexarPor(arrayTaxCodesSS, (element) => String(element.tcId));
        for (let j = 0; !l598isEmpty(arrayFinalAux) && j < arrayFinalAux.length; j++) {
          const coincidencias = taxCodesSSPorId.get(String(arrayFinalAux[j].itemTaxCode)) || [];
          for (const element of coincidencias) {
            arrayFinal.push({
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
            });
          }
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

      return arrayFinal;
    }

    /**
     * TRS-D4 — 2ª pasada del afterSubmit: recorre las sublistas y escribe las
     * columnas custom de cada linea con la informacion ya cruzada en arrayFinal.
     *
     * Extraida tal cual, sin reordenar ni un efecto: es el bloque que escribe los
     * campos fiscales, asi que cualquier reacomodo aca es exactamente lo que la
     * caracterizacion byte a byte tiene que descartar.
     */
    function escribirColumnasDeLineas(objRecord, tipoSublistas, arrayFinal, comprobanteExportacion, recId) {

      for (let subListaContador = 0; subListaContador < tipoSublistas.length; subListaContador++) {
        const tipoSublistaConsultar = tipoSublistas[subListaContador];


        const cantidadItems = objRecord.getLineCount({
          sublistId: tipoSublistaConsultar, //string*
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

          let transCodImpuesto = objRecord.getSublistValue({
            sublistId: tipoSublistaConsultar,
            fieldId: 'custcol_l598_codigo_impuesto',
            line: i,
          });


          if (itemType != 'EndGroup') {
            if (tipoSublistaConsultar == 'item' || esVerdadero(aplicar) || tipoSublistaConsultar == 'time') {
              if ((tipoSublistaConsultar == 'time' && (esVerdadero(aplicar))) || tipoSublistaConsultar == 'item') {
                // const resultadosImpuestos = null;

                // TRS-D6: este custcol se leia 3 veces para la misma sublista y
                // linea, sin nada que lo modificara en el medio. Se conserva la
                // primera lectura (transCodImpuesto) y las otras dos la reutilizan.
                const transCodImpuestoStr = transCodImpuesto;


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
                if (!l598isEmpty(transCodImpuesto)) {
                  if (!l598isEmpty(arrayLineTemp) && arrayLineTemp.length > 0)
                    if (!l598isEmpty(arrayLineTemp[0].taxCodeIndFac) || !l598isEmpty(arrayLineTemp[0].taxCodeCodPercep)) {
                      let esPercepcionRetencion = false;
                      const indicadorFacturacion = arrayLineTemp[0].taxCodeIndFac;
                      const codigoPercRetCred = arrayLineTemp[0].taxCodeCodPercep;
                      let esIndicadorExportacion = false;
                      if (!l598isEmpty(indicadorFacturacion)) {
                        let esIndExp = '';
                        let esPercRet = '';
                        if (!l598isEmpty(arrayLineTemp[0].esIndExp) || !l598isEmpty(arrayLineTemp[0].esPercRet)) {
                          /*esIndExp = infoIndFact.custrecord_l598_ind_fact_det_exp_asim;
            esPercRet = infoIndFact.custrecord_l598_ind_fact_det_perc_ret;*/
                          esIndExp = arrayLineTemp[0].esIndExp;
                          esPercRet = arrayLineTemp[0].esPercRet;

                          if (!l598isEmpty(esIndExp) && (esVerdadero(esIndExp))) {
                            esIndicadorExportacion = true;
                          }
                          if (!l598isEmpty(esPercRet) && (esVerdadero(esPercRet))) {
                            esPercepcionRetencion = true;
                          }
                          if (
                            (esVerdadero(comprobanteExportacion)) &&
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

    /**
     * TRS-D4 — Toggle de la sublista `apply` en Nota de Credito, extraido tal cual.
     *
     * ⚠️ TRS-D1: es la misma logica que `desaplicarYAplicarNC` de
     * `L598 - Seteo de Tax Codes` (que ademas cubre vendorcredit). Se le da el mismo
     * nombre para que la duplicacion sea visible, pero NO se unifica: definir un
     * dueno unico es una decision de Grupo A, pendiente con Tekiio.
     *
     * Nota: en STC quedo probado que este toggle era un workaround del segundo save.
     * Si se aprueba TRS-A1 y desaparece ese save, probablemente sobre tambien aca.
     */
    function desaplicarYAplicarNC(recType, objRecord) {

      const idTransApply = [];
      if (recType == "creditmemo") {
        const cantidadItems = objRecord.getLineCount({ sublistId: 'apply' });
        for (let j = 0; j < cantidadItems; j++) {
          const aplicado = objRecord.getSublistValue({ sublistId: 'apply', fieldId: 'apply', line: j });
          if (esVerdadero(aplicado)) {
            const internalIdLine = objRecord.getSublistValue({ sublistId: 'apply', fieldId: 'internalid', line: j });
            idTransApply.push({
              internalId: internalIdLine,
              line: j
            });
            objRecord.setSublistValue({ sublistId: 'apply', fieldId: 'apply', line: j, value: false });
          }
        }

        // TRS-D7: era `utilities.isEmpty`, la unica llamada a la version de utilities
        // en todo el archivo. Para un array las dos implementaciones devuelven false
        // identico (un array no es "", null, undefined, "null" ni "undefined"), y el
        // `&& length > 0` cubre cualquier diferencia. Se unifica el uso mixto sin
        // cambiar comportamiento. La unificacion inversa (las 70 llamadas locales ->
        // utilities) NO es equivalente y queda registrada como pendiente.
        if (!l598isEmpty(idTransApply) && idTransApply.length > 0) {
          for (let j = 0; j < idTransApply.length; j++) {
            log.debug('idTransApply[j].internalId', idTransApply[j].internalId);
            objRecord.setSublistValue({ sublistId: 'apply', fieldId: 'apply', line: idTransApply[j].line, value: true });
          }
        }
      }
    }

    /**
     * TRS-D4 — Rama DELETE de Credito de proveedor: intenta borrar las retenciones
     * asociadas. Extraida tal cual, sin tocar una linea.
     *
     * ⚠️ Contiene TRS-A3: la llamada de borrado usa un metodo que no existe en el
     * objeto Record (la operacion es del modulo N/record), el TypeError cae en el
     * catch que solo loguea, y las retenciones probablemente nunca se borran. NO se
     * corrigio: es Grupo A y espera decision de Tekiio. Se extrae para que el dia
     * que se apruebe, el arreglo sea un diff aislado y no venga mezclado con este
     * movimiento de codigo.
     */
    function borrarRetencionesDeVendorCredit(context, objRecord, idTransaccion, recType) {

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
    }

    /**
     * TRS-D4 — Rama DELETE de URU-Resguardo. Extraida tal cual.
     * ⚠️ Mismo TRS-A3 que la funcion anterior, con el otro registro de retenciones.
     */
    function borrarRetencionesDeResguardo(context, objRecord, idTransaccion, recType) {

    // INICIO - Aplica solo a resguardo sin tocar taxcodes
    if (context.type == context.UserEventType.DELETE && recType == "customtransaction_l598_resguardo") {

      const numLinesNCResguardo = objRecord.getLineCount({
        sublistId: "recmachcustrecord_l598_retencion_nc_resguardo" //string*
      });
      let idretencionNC;
      for (let i = 0; i < numLinesNCResguardo; i++) {
        //SE TUVO QUE USAR RECORD DELETE PORQUE AL GUARDAR LA TRANSACCION NO SE BORRABAN LOS REGISTROS
        idretencionNC = objRecord.getSublistValue({
          sublistId: "recmachcustrecord_l598_retencion_nc_resguardo",
          fieldId: "id",
          line: i
        });
        try {
          objRecord.delete({
            type: "customrecord_l598_retencion_nc",
            id: idretencionNC
          });
        }
        catch (e) {
          log.error({
            title: "l598beforeSubmitTransaction",
            details: "Ocurrio un error al borrar las URU-Retenciones NC asociadas al registro URU-Resguardo: " + e.message
          });
        }
      }
    }
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


            if (!l598isEmpty(infoSucursal)) {
              if (!l598isEmpty(infoSucursal.sucursal) && l598isEmpty(sucursal)) {

                objRecord.setValue({
                  fieldId: "custbody_l598_sucursal",
                  value: infoSucursal.sucursal
                });
              }
            }
            // TRS-D2: aca habia un `else` con un log.error. Verificado 2026-08-20:
            // `obtenerSucursal` tiene un unico `return`, sin try/catch, y devuelve
            // `informacionSucursal` inicializado siempre como objeto con sucursal=1 y
            // serie=1 -> nunca es null ni undefined -> `!l598isEmpty(infoSucursal)` es
            // siempre true y esa rama era inalcanzable. Ya no es inferencia: es un hecho.
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
              const comprobanteCuentaAjena = !l598isEmpty(esCuentaAjena) && (esVerdadero(esCuentaAjena)) ? true : false;

              // TRS-D2: acá había un bloque comentado que calculaba el monto en letras,
              // rotulado "Pasado al afterSubmit". Se eliminó el código muerto, pero el dato
              // histórico importa para TRS-A1: el monto escrito ESTUVO en beforeSubmit y
              // alguien lo movió deliberadamente a afterSubmit. Antes de proponer moverlo
              // de vuelta hay que averiguar por qué se movió (¿`total` no es definitivo en
              // beforeSubmit?) — registrado como duda abierta en el informe de análisis.

              const tipoTransLocal = obtenerTipoTransaccionLocal(tipoTransStr, esND);

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


      borrarRetencionesDeVendorCredit(context, objRecord, idTransaccion, recType);

      // FIN - Aplica solo a vendor credit sin tocar taxcodes


      borrarRetencionesDeResguardo(context, objRecord, idTransaccion, recType);
      // FIN - Aplica solo a resguardo sin tocar taxcodes

    }

    //function l598afterSubmitTransaction(type) {
    function afterSubmit(scriptContext) {

      const proceso = 'afterSubmit';
      const recId = scriptContext.newRecord.id;
      const recType = scriptContext.newRecord.type;

      if (scriptContext.type != scriptContext.UserEventType.DELETE) {

        /**
         * TRS-A2 — early return (aprobado por Tekiio, 2026-09-08).
         *
         * Para 'salesorder' y 'transferorder' este entry point no escribia nada:
         * el bloque de manejo de lineas y el del numero de comprobante ya los
         * excluian por tipo, y desaplicarYAplicarNC tiene todo su cuerpo dentro
         * de un guard por 'creditmemo'. Lo unico que se ejecutaba era el load y
         * el save: ~30 GU y un guardado extra del registro por cada orden, para
         * dejarlo exactamente igual.
         *
         * Se sale antes del load: es el punto donde empieza el costo.
         *
         * NO afecta el llenado de sucursal vacia, que si aplica a estos tipos:
         * eso ocurre en beforeSubmit, en el setValue de custbody_l598_sucursal
         * que esta antes y por fuera de su propio guard de exclusion por tipo.
         * No se toca.
         *
         * Los dos guards por tipo de abajo quedan a proposito. Ahora son
         * redundantes, pero dicen lo mismo que este early return — no lo
         * contradicen — y sostienen el comportamiento si alguna vez se mueve
         * o revierte esta salida temprana.
         *
         * Lo que este cambio NO ahorra: el save eliminado **no** re-disparaba
         * los UserEvents de otros scripts. La premisa contraria estaba en duda
         * en el informe (§7.4) y los logs de la invoice 15822 la cierran: el
         * save de este afterSubmit corrio a las 1:21:19 y `Seteo de Tax Codes`
         * — otro UserEvent sobre el mismo registro — no volvio a ejecutarse.
         * Coincide con el comportamiento documentado de NetSuite. El ahorro es
         * el load+save en si, que alcanza; no se le atribuye un efecto en
         * cascada que no existe.
         */
        if (recType == 'transferorder' || recType == 'salesorder') {
          log.audit(proceso, `TRS-A2 early-return recordType=${recType} id=${recId} eventType=${scriptContext.type}`);
          return;
        }

        const objRecord = record.load({ type: recType, id: recId });

        log.debug(proceso, `INICIO - afterSubmit / id: ${recId} / type: ${recType}`);
        // INICIO - manejo de datos a nivel de lineas
        if (recType != 'transferorder' && recType != 'salesorder') {
          // INICIO - Asignar indicador de Facturacion por lineas
          const comprobanteExportacion = objRecord.getValue({ fieldId: 'custbody_l598_trans_exportacion' });

          escribirMontoEscrito(objRecord, recType, recId);

          setearCodigoImpuestosLineas(objRecord);

          // TRS-B4: acá había un loop cuyo único cuerpo era un log.debug, y que hacía
          // 2 getSublistValue por línea sólo para armar el mensaje. Se eliminó completo:
          // los argumentos de log.debug se evalúan aunque el Log Level no sea Debug,
          // así que el costo se pagaba en cada guardado de producción.

          // INICIO - CONSIDERAR LINEAS DE TIEMPO/GASTOS
          const tipoSublistas = ['item', 'itemcost', 'expcost', 'time'];

          // TRS-D4: 1ª pasada extraida a recolectarLineasDeSublistas().
          const { arrayLines, arrayItem, arrayItemTime, arrayTaxCodes } = recolectarLineasDeSublistas(objRecord, tipoSublistas);





          const arrayItemSS = buscarInfoArticulos(arrayItem);


          const arrayItemTimeSS = buscarInfoTimebill(arrayItemTime);


          //INICIO - CARGA DE LA INFORMACIÓN DE LOS CODIGOS DE IMPUESTOS RELACIONADOS A LOS ARTICULOS
          const arrayTaxCodesSS = buscarInfoTaxCodes(arrayTaxCodes);
          //FIN - CARGA DE LA INFORMACIÓN DE LOS CODIGOS DE IMPUESTOS RELACIONADOS A LOS ARTICULOS


          const arrayFinalAux = cruzarLineasConArticulos(arrayLines, arrayItemSS, arrayItemTimeSS);


          //INICIO - AL ARRAY DE LINEAS UNICO SE LE AGREGA INFORMACION ADICIONAL DEL CODIGO DE IMPUESTO ASOCIADO AL MISMO
          const arrayFinal = cruzarConTaxCodes(arrayFinalAux, arrayTaxCodesSS);
          //FIN - AL ARRAY DE LINEAS UNICO SE LE AGREGA INFORMACION ADICIONAL DEL CODIGO DE IMPUESTO ASOCIADO AL MISMO


          escribirColumnasDeLineas(objRecord, tipoSublistas, arrayFinal, comprobanteExportacion, recId);
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
              // ⚠️ TRS-D2 — Este bloque comentado se CONSERVA a propósito, contra el
              // criterio general de eliminar código muerto: es la alternativa con
              // `submitFields` que la propuesta TRS-A1 propone usar para escribir el
              // número de comprobante sin recargar y volver a guardar el documento.
              // Borrarlo perdería la evidencia de que la solución ya estaba ensayada acá.
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

        desaplicarYAplicarNC(recType, objRecord);

        let idRecNew = objRecord.save({
          enableSourcing: false,
          ignoreMandatoryFields: true,
        });

        log.debug(proceso, `FIN - afterSubmit / id: ${idRecNew} / type: ${recType}`);
      }
    }


    const setearCodigoImpuestosLineas = (objRecord) => {

      const proceso = 'setearCodigoImpuestosLineas';

      try {
        log.debug(proceso, `INICIO - setearcodigoImpuestosLineas`);

        const taxDetailsQuantity = objRecord.getLineCount({
          sublistId: 'taxdetails'
        });

        const itemsQuantity = objRecord.getLineCount({
          sublistId: 'item'
        });

        // TRS-B1: índice taxdetailsreference -> {taxCode, taxRate} en lugar de un
        // filter() por cada línea (O(items x taxdetails) -> O(items + taxdetails)).
        // "Primer match gana": el Map sólo guarda la primera aparición de cada
        // referencia, igual que el filter(...)[0] original. Es el mismo cambio que
        // STC-B1, ya caracterizado byte a byte en Seteo de Tax Codes.
        // TRS-B4: se eliminaron los log.debug de dump (arrays completos y una entrada
        // por línea); se conservan los log.error. `arrayTaxCodes` se eliminó con ellos:
        // sólo alimentaba uno de esos logs.
        const taxDetailsByRef = new Map();
        for (let i = 0; i < taxDetailsQuantity; i++) {
          const ref = objRecord.getSublistValue('taxdetails', 'taxdetailsreference', i);
          const key = String(ref);
          if (!taxDetailsByRef.has(key)) {
            taxDetailsByRef.set(key, {
              taxDetailReference: ref,
              taxCode: objRecord.getSublistValue('taxdetails', 'taxcode', i),
              taxRate: objRecord.getSublistValue('taxdetails', 'taxrate', i)
            });
          }
        }

        // Obtencion de taxCodes por items
        if (taxDetailsByRef.size > 0) {

          for (let i = 0; i < itemsQuantity; i++) {

            const taxDetailReferenceItem = objRecord.getSublistValue('item', 'taxdetailsreference', i);
            const itemInGroup = objRecord.getSublistValue('item', 'ingroup', i);
            const taxDetail = taxDetailsByRef.get(String(taxDetailReferenceItem));
            const itemType = objRecord.getSublistValue('item', 'itemtype', i);

            if (taxDetail) {

              objRecord.setSublistValue('item', 'custcol_l598_codigo_impuesto', i, taxDetail.taxCode);
              objRecord.setSublistValue('item', 'custcol_l598_tasa_impuesto', i, taxDetail.taxRate);

              if (!l598isEmpty(itemInGroup) && (esVerdadero(itemInGroup))) {

                const beforeLine = i - 1;
                const itemTypeItemBefore = objRecord.getSublistValue('item', 'itemtype', beforeLine);

                if (itemTypeItemBefore == 'Group') {
                  objRecord.setSublistValue('item', 'custcol_l598_codigo_impuesto', beforeLine, taxDetail.taxCode);
                  objRecord.setSublistValue('item', 'custcol_l598_tasa_impuesto', beforeLine, taxDetail.taxRate);
                }
              }
            } else if (itemType == 'Discount' && i > 0) {
              // Verificacion de si es mayor a la primera posicion para verificar si es descuento.
              // Esto se realiza porque el descuento no se refleja en el tax details.

              const taxCodeLineItemBefore = objRecord.getSublistValue('item', 'custcol_l598_codigo_impuesto', i - 1);
              const taxRateLineItemBefore = objRecord.getSublistValue('item', 'custcol_l598_tasa_impuesto', i - 1);

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
            // TRS-D2: mismo `else` inalcanzable que en beforeSubmit, por el mismo motivo
            // (obtenerSucursal nunca devuelve vacio). Verificado 2026-08-20.
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
