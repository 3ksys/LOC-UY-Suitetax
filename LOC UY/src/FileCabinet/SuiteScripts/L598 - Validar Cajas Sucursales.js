/**
 *@NApiVersion 2.1
 *@NScriptType ClientScript
 *@NAmdConfig /SuiteScripts/configuration.json
 *@NModuleScope Public
 */

define(["N/currentRecord"],
  function (currentRecord) {
    /* global define */
    /***
		 * El script se llama L598 - Validar - Cajas Sucursales - v2
		 * Se migra desde L598_CS.js la funcion validarCajaPreferidaSucursal, y sus dependencias.
		 */


    function l598isEmpty(value) {
      return value === "" || value === null || value === undefined || value === "null" || value === "undefined";
    }

    //function validarCajaPreferidaSucursal() {
    function saveRecord() {
      const objRecord = currentRecord.get();
      //var cajaPreferida = nlapiGetFieldValue('custrecord_l598_sucursales_caja_pref');
      const cajaPreferida = objRecord.getValue({
        fieldId: "custrecord_l598_sucursales_caja_pref"
      });
      //var cajasHabilitadas = nlapiGetFieldValue('custrecord_l598_sucursales_cajas');
      const cajasHabilitadas = objRecord.getValue({
        fieldId: "custrecord_l598_sucursales_cajas"
      });

      if (!l598isEmpty(cajasHabilitadas) && cajasHabilitadas.length > 0) {
        if (!l598isEmpty(cajaPreferida)) {
          if (cajasHabilitadas.indexOf(cajaPreferida) >= 0) {
            return true;
          }
          else {
            alert("La Caja Preferida seleccionada no se corresponde con una de las Cajas Habilitadas para la Sucursal. Verifique");
            return false;
          }
        }
        else {
          alert("Debe Seleccionar una Caja Preferida para la Sucursal.");
          return false;
        }
      }
      else {
        alert("Debe Seleccionar las Cajas Habilitadas para la Sucursal.");
        return false;
      }
    }
    return {
      saveRecord: saveRecord
    };
  });