/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 *@NAmdConfig /SuiteScripts/configuration.json
 *@NModuleScope Public
 */
define(["N/search"],
  function (search) {
    /* global define */
    /**
     *  Codigo migrado desde L598_CS.js
     * unicamente aquello que se necesita para que funcione
     */
    function l598isEmpty(value) {
      return value === "" || value === null || value === undefined || value === "null" || value === "undefined";
    }

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

      //var searchresults = new nlapiSearchRecord("customrecord_l598_datos_impositivos_emp", null, filters, null);
      const searchresults = search.create({
        type: "customrecord_l598_datos_impositivos_emp",
        filters: filters,
        // columns:columns,
        // id: string //opc                       
      }).run().getRange({
        start: 0,
        end: 1000
      });

      if (searchresults != null && searchresults.length > 0)
        return true;
      else
        return false;
    }

    //entry point
    //function l598saveCustomer() {
    function saveRecord(context) {
      const objRecord = context.currentRecord;
      let subsidiaria = null;
      if (l598esOneworld()) {
        subsidiaria = objRecord.getValue({
          fieldId: "subsidiary"
        });
      }

      const tipoDocumento = objRecord.getValue({
        fieldId: "custentity_l598_tipo_documento"
      });

      const esRUC = objRecord.getValue({
        fieldId: "custentity_l598_es_ruc"
      });

      const nroDocumento = objRecord.getValue({
        fieldId: "custentity_l598_nro_documento"
      });

      if (!l598isEmpty(esRUC) && (esRUC == "T" || esRUC === true) && !l598isEmpty(nroDocumento)) {

        if (!validaRuc(nroDocumento)) {
          alert("El Nro. de Documento ingresado no es valido. Verifique y vuelva a intentar");
          return false;
        }

        if (!controlDuplicidadRuc(subsidiaria, tipoDocumento, nroDocumento, "customer", objRecord.id)) {
          alert("El Nro. de RUT esta repetido. Verifique y vuelva a intentar");
          return false;
        }
      }
      return true;
    }


    /*Function que valida el digito verificador del RUC.*/
    function validaRuc(RUC) {
      if (!l598isEmpty(RUC)) {
        const expRegNumeros = /[^0-9]/gi;
        let ruc = RUC.replace(expRegNumeros, "");
        if (ruc.toString() != "" && ruc.toString().length == 12) {

          const dc = ruc.substr(11, 1);
          ruc = ruc.substr(0, 11);
          let total = 0;
          let factor = 2;

          for (let i = 10; i >= 0; i--) {
            total += (factor * ruc.substr(i, 1));
            factor = (factor == 9) ? 2 : ++factor;
          }

          let dv = 11 - (total % 11);

          if (dv == 11) {
            dv = 0;
          } else if (dv == 10) {
            dv = 1;
          }
          if (dv == dc) {
            return true;
          }
          return false;
        } else {
          return false;
        }
      }
      return false;
    }

    /*Function que valida RUC no repetido para Clientes y Proveedores.*/
    function controlDuplicidadRuc(subsidiaria, tipoDoc, nroDocumento, tipoEntidad, entityId) {
      if (tipoEntidad == "vendor" || tipoEntidad == "customer") {
        const filters = [];


        filters.push(search.createFilter({
          name: "isinactive",
          operator: search.Operator.IS,
          values: false
        }));
        filters.push(search.createFilter({
          name: "custentity_l598_tipo_documento",
          operator: search.Operator.IS,
          values: tipoDoc
        }));

        filters.push(search.createFilter({
          name: "custentity_l598_nro_documento",
          operator: search.Operator.IS,
          values: nroDocumento
        }));

        if (!l598isEmpty(subsidiaria)) {
          filters.push(search.createFilter({
            name: "subsidiary",
            operator: search.Operator.IS,
            values: subsidiaria
          }));
        }

        if (!l598isEmpty(entityId)) {
          filters.push(search.createFilter({
            name: "internalidnumber",
            operator: search.Operator.NOTEQUALTO,
            values: entityId
          }));
        }

        const results = search.create({
          type: tipoEntidad,
          filters: filters

        }).run().getRange({
          start: 0,
          end: 1000
        });

        if (results != null && results.length > 0)
          return false;

        return true;
      }
    }


    return {
      saveRecord: saveRecord
    };
  });