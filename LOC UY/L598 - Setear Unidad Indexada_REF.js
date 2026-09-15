/**
 * @NApiVersion 2.1
 * @NAmdConfig /SuiteScripts/configuration_l598.json
 * @NScriptType UserEventScript
 * @NModuleScope Public
 *
 * ============================================================================
 * REFACTOR (Mobeats) de "L598 - Setear Unidad Indexada".
 * ----------------------------------------------------------------------------
 * Alcance: C (estándares 2.1) + D (mantenibilidad). Sin Grupo A ni 🔴.
 * Comportamiento preservado: mismo valor escrito en
 * custbody_l598_valor_unidad_indexada, mismas condiciones para escribirlo.
 *
 * Cambios aplicados (Unidad 1 — mecánicos):
 *   C1  var -> const/let. `subsidiaria` y `rate` se declaraban en ambas ramas
 *       de su if/else apoyándose en hoisting; ahora una sola declaración `let`
 *       antes de la bifurcación.
 *   C2  parseFloat(rate, 10) -> parseFloat(rate). parseFloat no acepta radix;
 *       el 10 se ignoraba.
 *   C3  eliminado 'N/error' del define (se importaba y no se usaba).
 *   C4  `==` -> `===` en el chequeo de scriptContext.type (strings literales).
 *       En la comparación tipoIntegracionFE vs parámetro se normaliza con
 *       String() en vez de migrar a ciegas: el valor de la SS es string y el
 *       parámetro podría no serlo. Mismo criterio que STC §3.
 *   D1  eliminados los logs "LINE 44"/"LINE 55" (números desincronizados).
 *   D2  eliminados log.audit INICIO/FIN, governance remaining y log.debug de
 *       dump. Se conservan los 3 log.error.
 *   D3  eliminado el segundo chequeo de no-vacuidad sobre el mismo array
 *       (rama muerta: la condición externa ya lo garantizaba).
 *   D4  `!isEmpty(x) && x` sobre un boolean -> `if (x)`.
 *
 * Cambios aplicados (Unidad 2 — estructural):
 *   D5  getConfigFE y getConfigUnidadIndexada duplicaban el desempaquetado de
 *       searchSavedPro -> helper leerPrimeraFila(). Devuelve undefined cuando no
 *       hay fila para que getConfigFE no compare (como el original) y
 *       getConfigUnidadIndexada devuelva '' (como el original). Los títulos de
 *       los log.error se pasan por parámetro y quedan idénticos.
 *
 * Pendientes de este script:
 *   D6  columnas de SS por nombre — bloqueado por duda abierta #3.
 *   B1  SS -> SuiteQL/N/cache — 🔴 requiere aprobación de Tekiio.
 *   B2  memoizar l598esOneworld — vía utilities_REF, coordinado.
 *   A1-A4 — registro de aprobaciones.
 * ============================================================================
 */
define(['N/record', 'L598/utilities', 'N/runtime', 'N/currency'],

    function (record, utilities, runtime, currency) {

        const proceso = "Setear Unidad Indexada";

        function afterSubmit(scriptContext) {

            const currScript = runtime.getCurrentScript();

            try {

                if (scriptContext.type === 'create' || scriptContext.type === 'edit') {

                    const parametroTipoIntegracionFE = currScript.getParameter('custscript_l598_set_ui_tipo_in_fe_taface');

                    // Get Data From Transaction
                    const recId = scriptContext.newRecord.id;
                    const recType = scriptContext.newRecord.type;
                    const objRecord = scriptContext.newRecord;
                    const isOneWorld = utilities.l598esOneworld();

                    let subsidiaria = '';
                    if (isOneWorld) {
                        subsidiaria = objRecord.getValue({ fieldId: 'subsidiary' });
                    }

                    const resultConfigFETaface = getConfigFE(parametroTipoIntegracionFE, subsidiaria, isOneWorld);

                    let rate;
                    // Se verifica si la configuración de FE es de TAFACE
                    if (resultConfigFETaface) {

                        // Se setean la unidad indexada predeterminada del RT URU-Configuración Unidad Indexada
                        rate = getConfigUnidadIndexada();

                    } else {

                        // Se setean la unidad indexada desde el tipo de cambio registrado en NS
                        // Get Exchange Rate For UNIDAD INDEXADA
                        rate = currency.exchangeRate({
                            source: 'UI',
                            target: 'UYU'
                        });
                    }

                    if (!utilities.isEmpty(rate) && !isNaN(rate) && parseFloat(rate) > 0) {
                        //Update Transaction
                        record.submitFields({
                            type: recType,
                            id: recId,
                            values: {
                                custbody_l598_valor_unidad_indexada: rate
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields: true //Ignora los campos obligatorios
                            }
                        });
                    }
                }
            } catch (e) {
                log.error(proceso, proceso + '- Netsuite Exception - Detalles Error: ' + JSON.stringify(e.message));
            }
        }

        /**
         * Lee una columna de la primera fila de una saved search (vía searchSavedPro).
         *
         * Devuelve `undefined` si la búsqueda falló o no trajo filas. Ese sentinela
         * es deliberado: los dos llamadores necesitan distinguir "sin resultado" de
         * un valor vacío legítimo, porque el original no comparaba nada cuando no
         * había filas. getValue nunca devuelve undefined (string/boolean/null), así
         * que no hay ambigüedad.
         *
         * @param {string} idSavedSearch
         * @param {Array|null} filtros     - formato de searchSavedPro
         * @param {number} indiceColumna   - posición en search.columns (D6 pendiente: por nombre)
         * @param {string} nombreLog       - título del log.error, igual al del original
         */
        function leerPrimeraFila(idSavedSearch, filtros, indiceColumna, nombreLog) {
            try {
                const respuesta = utilities.searchSavedPro(idSavedSearch, filtros);

                if (!respuesta.error && !utilities.isEmpty(respuesta.objRsponseFunction.result) && respuesta.objRsponseFunction.result.length > 0) {
                    return respuesta.objRsponseFunction.result[0].getValue({
                        name: respuesta.objRsponseFunction.search.columns[indiceColumna]
                    });
                }
            } catch (e) {
                log.error(nombreLog, nombreLog + ' - NetSuite Exception - Detalles Error: ' + e.message);
            }
            return undefined;
        }

        function getConfigFE(parametroTipoIntegracionFE, idSubsidiaria, isOneWorld) {

            const filtrosConfiguracionFE = [];

            if (isOneWorld && !utilities.isEmpty(idSubsidiaria)) {
                const filtroSubsidiaria = {};
                filtroSubsidiaria.name = 'custrecord_l598_conf_fe_subsidiaria';
                filtroSubsidiaria.operator = 'IS';
                filtroSubsidiaria.values = idSubsidiaria;
                filtrosConfiguracionFE.push(filtroSubsidiaria);
            }

            const tipoIntegracionFE = leerPrimeraFila('customsearch_l598_config_fe_seteo_ui', filtrosConfiguracionFE, 2, 'consultaConfigFE');

            return tipoIntegracionFE !== undefined && String(tipoIntegracionFE) === String(parametroTipoIntegracionFE);
        }

        function getConfigUnidadIndexada() {

            const valorUnidadIndexada = leerPrimeraFila('customsearch_l598_config_ui_seteo_ui', null, 2, 'getConfigUnidadIndexada');

            return valorUnidadIndexada !== undefined ? valorUnidadIndexada : '';
        }

        return {
            afterSubmit: afterSubmit
        };
    });
