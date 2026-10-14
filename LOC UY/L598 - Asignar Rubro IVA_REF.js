/**
 * @NApiVersion 2.1
 * @NAmdConfig /SuiteScripts/configuration_l598.json
 * @NScriptType UserEventScript
 * @NModuleScope Public
 *
 * ============================================================================
 * REFACTOR (Mobeats) de "L598 - Asignar Rubro IVA".
 * ----------------------------------------------------------------------------
 * Alcance: B (performance) + C (estándares 2.1) + D (mantenibilidad).
 * Sin Grupo A ni 🔴. Comportamiento preservado: mismos valores en
 * custcol_l598_rubro_iva y custcol_l598_rubro_iva_equival_ventas por línea,
 * mismas condiciones para escribirlos, mismo save.
 *
 * Unidad 1 — C + D mecánicos:
 *   C1  var -> const/let.
 *   C2  getSublistValue posicional -> forma con objeto (isbillable, customer).
 *   C3  summary "group"/"GROUP" -> search.Summary.GROUP.
 *   D1  eliminados createError (nunca invocada) y con ella 'N/error' del
 *       define; `var name` sin uso; bloque debug comentado; restos comentados;
 *       `return true` del afterSubmit (un UserEvent ignora el retorno).
 *   D2  eliminadas las 2 lecturas por línea de rubroIVA / rubroIVAEquivalente:
 *       el guard que las usaba estaba comentado.
 *   D5  eliminados log.audit con el JSON completo de las SS, dumps de parámetros
 *       y log.debug por línea. Se conservan todos los log.error.
 *   D6  getRubro: fuera el parámetro sin uso; recibe el objeto del rubro en vez
 *       de un array del que leía [0]. Mismo retorno, mismo catch.
 *   D7  contrato posicional de las SS de mapeo explicitado en COLUMNAS_SS_RUBROS.
 *
 * Unidad 2 — B performance + D3:
 *   B1  filter() dentro de los loops por línea -> índices Map construidos una
 *       vez por llamada ("primer match gana", igual que filter(...)[0]).
 *       ARI-A2 (aprobado por Tekiio 2026-10-14, aplicado): B1 había preservado
 *       el TypeError que se producía al acceder a `.aplicaPublicidad` de un
 *       ítem sin match. Ahora se valida antes de acceder: la línea se omite y
 *       se registra con log.error, en vez de abortar toda la ejecución.
 *   B2  los line counts se leen ANTES de ejecutar las SS de mapeo: la SS de
 *       cuentas (y l598esOneworld, que sólo alimenta su filtro) corre sólo si
 *       hay líneas de gasto; la de tax codes sólo si hay alguna línea.
 *   D3  para gastos sin tax code, el filtro por cuenta se ejecutaba dos veces
 *       sobre el mismo array con la misma clave. Ahora una.
 *
 * Unidad 3 — D4 estructural:
 *   D4  bloque de publicidad (~110 líneas) extraído de afterSubmit a
 *       aplicarRubroPublicidad(). JSDoc corregidos.
 *       NO se cambió el '' que afterSubmit pasa como "array" de resultados de
 *       expensas para la sublista item: pasar [] alteraría la conducta en un
 *       borde (ítem sin tax code y con cuenta), hoy inalcanzable en la
 *       práctica pero no demostrable para todo tipo de registro. Sigue sin cambiarse (no forma parte de ARI-A2).
 *
 * DESVIO DE DEPLOY (no de refactor): los IDs de parametro de script son unicos
 * en la cuenta y pertenecen al Script record ORIGINAL; el _REF no puede
 * declararlos (verificado 2026-09-16: "This custom field already exists").
 * El _REF lee sus parametros por constantes PARAM_* con sufijo _ref. El dia que
 * este archivo reemplace al original, volver los valores de esas constantes a
 * los IDs originales. Ver docs/carga-y-deploy-de-scripts.md.
 *
 * Unidad 4 — Grupo A aprobado por Tekiio (2026-10-14), aplicado:
 *   A2  validación previa del resultado de la búsqueda de publicidad (ver B1).
 *   B3  paginación de las 2 búsquedas ad-hoc (obtenerTodosLosResultados). Cambia
 *       el resultado sólo con >1000 filas; mismo patrón que TRS-A7 / CRT-A7 /
 *       CDF-A4. Reclasificado a Grupo A el 2026-09-15.
 *
 * Fuera de este refactor, con motivo:
 *   B4  SS -> SuiteQL/Workbooks: 🔴, requiere aprobación de Tekiio.
 *   B5  usar el `.array` de searchSavedPro: ese array se indexa por NOMBRE de
 *       columna y este script lee por POSICIÓN; sin la definición de las 2 SS
 *       (duda abierta #5) no se puede mapear con garantía. Además `.array`
 *       transforma valores multi-select (toma [0].value), que getValue no hace.
 *   A1-A6 — registro de aprobaciones.
 * ============================================================================
 */
define(
    [
        'N/record', 'N/search', 'L598/utilities', 'N/runtime'
    ],
    function (record, search, utilities, runtime) {

        // DESVÍO DE DEPLOY: el ID original es 'custscript_l598_rubro_publicidad'. Ver header.
        const PARAM_RUBRO_PUBLICIDAD = 'custscript_l598_rubro_publicidad_ref';

        /**
         * ARI-D7 — Contrato posicional de las 2 saved searches de mapeo
         * (customsearch_l598_rubros_iva_codigos_imp / customsearch_l598_rubros_iva_cuentas_con).
         * El script lee las columnas por posición; reordenarlas en la cuenta reasignaría
         * rubros sin ningún error de compilación. Hasta nombrarlas (junto con ARI-B4),
         * este objeto es el único lugar donde el orden está escrito.
         */
        const COLUMNAS_SS_RUBROS = {
            ID_CLAVE: 0,           // ID interno del código de impuesto o de la cuenta contable
            NOMBRE: 1,             // Nombre del código de impuesto o de la cuenta contable
            RUBRO_IVA: 2,          // ID interno del rubro IVA asociado
            RUBRO_EQUIVALENTE: 3   // ID interno del rubro IVA equivalente en ventas/compras
        };

        /** Respuesta de getRubrosIVA cuando la búsqueda no hace falta (ARI-B2). Nunca se muta. */
        const SIN_RESULTADOS = { mensaje: '', error: false, results: [] };

        /**
         * ARI-B1 — Indexa un array de objetos por una propiedad, conservando sólo la
         * PRIMERA aparición de cada clave: equivale a `array.filter(...)[0]`.
         *
         * La clave se normaliza con String() porque la comparación original era `==`
         * (débil) entre valores de getValue y de getSublistValue: equivalente para ids
         * numéricos/string —el dominio real—; mismo riesgo residual declarado y
         * caracterizado en STC-B1 y TRS-B1.
         *
         * Si `array` no es un array se devuelve tal cual, para que la búsqueda posterior
         * falle exactamente como fallaba `''.filter(...)` en el original (ver D4).
         */
        function indexarPrimerMatch(array, nombreClave) {
            if (!Array.isArray(array)) {
                return array;
            }
            const indice = new Map();
            for (let i = 0; i < array.length; i++) {
                const clave = String(array[i][nombreClave]);
                if (!indice.has(clave)) {
                    indice.set(clave, array[i]);
                }
            }
            return indice;
        }

        function buscarEnIndice(indice, clave) {
            return indice.get(String(clave));
        }

        /**
         * Function definition to be triggered after record is saved.
         *
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {Record} scriptContext.oldRecord - Old record
         * @param {string} scriptContext.type - Trigger type
         * @Since 2015.2
         */
        function afterSubmit(scriptContext) {

            const proceso = 'afterSubmit';

            const recId = scriptContext.newRecord.id;
            const recType = scriptContext.newRecord.type;
            const script = runtime.getCurrentScript();
            const rubroPublicidad = script.getParameter(PARAM_RUBRO_PUBLICIDAD);

            try {

                if (scriptContext.type == 'create' || scriptContext.type == 'edit') {
                    const objRecord = record.load({ type: recType, id: recId });
                    const idFieldIVA = 'custcol_l598_rubro_iva';

                    // ARI-B2: contar líneas antes de consultar. Las SS de mapeo sólo se
                    // ejecutan si hay líneas que las necesiten.
                    const cantidadItems = objRecord.getLineCount({
                        sublistId: 'item'
                    });
                    const cantidadExpensas = objRecord.getLineCount({
                        sublistId: 'expense'
                    });

                    const resultsRubrosIVATaxCodes = (cantidadItems > 0 || cantidadExpensas > 0)
                        ? getRubrosIVA('customsearch_l598_rubros_iva_codigos_imp', null) // Pasar el param subsidiaria en null
                        : SIN_RESULTADOS;

                    let resultsRubrosIVAExpensas = SIN_RESULTADOS;
                    if (cantidadExpensas > 0) {
                        let subsidiaria = null;
                        if (utilities.l598esOneworld()) {
                            subsidiaria = objRecord.getValue({ fieldId: 'subsidiary' });
                        }
                        resultsRubrosIVAExpensas = getRubrosIVA('customsearch_l598_rubros_iva_cuentas_con', subsidiaria);
                    }

                    // ---------------------- INICIO - Verificación de sublista de ITEMS para setear Rubros IVA ---------------
                    if (!resultsRubrosIVATaxCodes.error && resultsRubrosIVATaxCodes.results.length > 0 && cantidadItems > 0) {
                        const seteoRubrosIVATaxcodes = setearRubrosIVA(cantidadItems, objRecord, 'item', idFieldIVA, '', resultsRubrosIVATaxCodes.results, recType);

                        if (seteoRubrosIVATaxcodes.error) {
                            log.error(proceso, seteoRubrosIVATaxcodes.mensaje);
                        }
                    }
                    // ---------------------- FIN - Verificación de sublista de ITEMS para setear Rubros IVA ---------------

                    // ---------------------- INICIO - Verificación de sublista de GASTOS para setear Rubros IVA ---------------
                    if ((!resultsRubrosIVATaxCodes.error && resultsRubrosIVATaxCodes.results.length > 0 || !resultsRubrosIVAExpensas.error && resultsRubrosIVAExpensas.results.length > 0) && cantidadExpensas > 0) {
                        const seteoRubrosIVAExpenses = setearRubrosIVA(cantidadExpensas, objRecord, 'expense', idFieldIVA, resultsRubrosIVAExpensas.results, resultsRubrosIVATaxCodes.results, recType);

                        if (seteoRubrosIVAExpenses.error) {
                            log.error(proceso, seteoRubrosIVAExpenses.mensaje);
                        }
                    }
                    // ---------------------- FIN - Verificación de sublista de GASTOS para setear Rubros IVA ---------------

                    _refreshApplyTranList(objRecord, recType);

                    aplicarRubroPublicidad(objRecord, recType, recId, rubroPublicidad);

                    objRecord.save({ enableSourcing: false, ignoreMandatoryFields: true });
                }
            } catch (error) {
                const mensajeError = 'Error NetSuite Excepción - Error en la función : ' + proceso + ' al setear Rubros de IVA - Detalles: ' + error.message;
                log.error(proceso, mensajeError);
            }
        }

        /**
         * ARI-B3 — Corre una búsqueda creada con search.create paginando hasta agotar
         * resultados. (aprobado por Tekiio, 2026-10-14)
         *
         * Las 2 búsquedas ad-hoc de aplicarRubroPublicidad leían `getRange({start:0, end:1000})`
         * de una sola vez: pasadas las 1.000 filas, el resto quedaba sin considerar y sin aviso.
         * Paginar también quita la causa más probable de ARI-A2 (los ítems posteriores a la
         * fila 1000 no tenían match). ARI-B3 se reclasificó a Grupo A el 2026-09-15.
         *
         * Mismo patrón que TRS-A7 (correrSavedSearchPaginada). No se usan
         * utilities.searchSaved / searchSavedPro por los motivos documentados allí.
         * Por debajo de 1.000 filas devuelve lo mismo que antes, en el mismo orden.
         *
         * @param {search.Search} searchObj
         * @returns {search.Result[]} todos los resultados, en el orden de la búsqueda
         */
        function obtenerTodosLosResultados(searchObj) {

            const PASO = 1000; // máximo que admite getRange por llamada

            const resultSet = searchObj.run();

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

                // Una página incompleta ya es la última.
            } while (pagina && pagina.length === PASO);

            return resultados;
        }

        /**
         * ARI-D4 — "Modificación Publicidad", extraída de afterSubmit sin reordenar efectos.
         * Sólo para vendorbill / vendorcredit: los ítems marcados con
         * custitem_l598_aplica_publicidad y los gastos cuya cuenta tiene
         * custrecord_l598_aplica_publicidad reciben el rubro del parámetro del deployment.
         *
         * Cualquier excepción sube al catch de afterSubmit, como antes.
         *
         * @param {Record} objRecord - registro cargado en afterSubmit
         * @param {string} recType
         * @param {number|string} recId
         * @param {string} rubroPublicidad - parámetro PARAM_RUBRO_PUBLICIDAD (original: custscript_l598_rubro_publicidad)
         */
        function aplicarRubroPublicidad(objRecord, recType, recId, rubroPublicidad) {

            if (recType == 'vendorbill' || recType == 'vendorcredit') {
                const transactionSearchObj = search.create({
                    type: "transaction",
                    filters:
                        [
                            ["mainline", "is", "F"],
                            "AND",
                            ["internalid", "anyof", recId]
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: "item",
                                summary: search.Summary.GROUP,
                                label: "Item"
                            }),
                            search.createColumn({
                                name: "custitem_l598_aplica_publicidad",
                                join: "item",
                                summary: search.Summary.GROUP,
                                label: "UY - Aplica Concetos de Publicidad"
                            })
                        ]
                });

                // ARI-B3 (aprobado por Tekiio, 2026-10-14): paginada hasta agotar resultados.
                const searchResult = obtenerTodosLosResultados(transactionSearchObj);

                const jsonItemsRubros = [];
                searchResult.forEach(function (result) {
                    jsonItemsRubros.push({
                        "internalID": result.getValue({ name: "item", summary: search.Summary.GROUP }),
                        "aplicaPublicidad": result.getValue({ name: "custitem_l598_aplica_publicidad", join: "item", summary: search.Summary.GROUP }),
                    });
                });
                const itemsPorId = indexarPrimerMatch(jsonItemsRubros, 'internalID');

                const lineCount = objRecord.getLineCount({ sublistId: "item" });

                for (let i = 0; i < lineCount; i++) {

                    const idItem = objRecord.getSublistValue({
                        sublistId: "item",
                        fieldId: "item",
                        line: i
                    });

                    // ARI-A2 (aprobado por Tekiio, 2026-10-14): validar antes de acceder.
                    // Antes, un ítem sin match en la búsqueda lanzaba TypeError, el catch
                    // global lo registraba y save() no corría: se perdían TODOS los rubros
                    // de la ejecución. Ahora esa línea se omite con un log.error y el resto
                    // se guarda. La evaluación de `aplicaPublicidad` no cambia.
                    const resultado = buscarEnIndice(itemsPorId, idItem);
                    if (!resultado) {
                        log.error('aplicarRubroPublicidad', 'ARI-A2 item sin resultado en la busqueda de publicidad: item=' + idItem + ' linea=' + i);
                    } else if (resultado.aplicaPublicidad) {
                        objRecord.setSublistValue({
                            sublistId: "item",
                            fieldId: "custcol_l598_rubro_iva",
                            line: i,
                            value: rubroPublicidad
                        });
                    }
                }

                const lineCountExpense = objRecord.getLineCount({ sublistId: "expense" });

                if (lineCountExpense > 0) {

                    const accountSearchObj = search.create({
                        type: "account",
                        filters:
                            [
                                ["custrecord_l598_aplica_publicidad", "is", "T"]
                            ],
                        columns:
                            [
                                search.createColumn({ name: "internalid", label: "Internal ID" })
                            ]
                    });

                    // ARI-B3 (aprobado por Tekiio, 2026-10-14): paginada hasta agotar resultados.
                    const searchResultCuentas = obtenerTodosLosResultados(accountSearchObj);

                    const jsonExpenseRubros = [];
                    searchResultCuentas.forEach(function (result) {
                        jsonExpenseRubros.push({
                            "internalID": result.getValue({ name: "internalid" })
                        });
                    });
                    const cuentasPorId = indexarPrimerMatch(jsonExpenseRubros, 'internalID');

                    for (let i = 0; i < lineCountExpense; i++) {

                        const idAccount = objRecord.getSublistValue({
                            sublistId: "expense",
                            fieldId: "account",
                            line: i
                        });

                        if (buscarEnIndice(cuentasPorId, idAccount)) {
                            objRecord.setSublistValue({
                                sublistId: "expense",
                                fieldId: "custcol_l598_rubro_iva",
                                line: i,
                                value: rubroPublicidad
                            });
                        }
                    }
                }
            }
        }

        function _refreshApplyTranList(objRecord, recType) {
            try {
                const idTransApply = [];
                if (recType == "creditmemo") {
                    const cantidadItems = objRecord.getLineCount({ sublistId: 'apply' });
                    for (let j = 0; j < cantidadItems; j++) {
                        const aplicado = objRecord.getSublistValue({ sublistId: 'apply', fieldId: 'apply', line: j });
                        if (aplicado == true || aplicado == 'T') {
                            const internalIdLine = objRecord.getSublistValue({ sublistId: 'apply', fieldId: 'internalid', line: j });
                            idTransApply.push({
                                internalId: internalIdLine,
                                line: j
                            });
                            objRecord.setSublistValue({ sublistId: 'apply', fieldId: 'apply', line: j, value: false });
                        }
                    }

                    if (!utilities.isEmpty(idTransApply) && idTransApply.length > 0) {
                        for (let j = 0; j < idTransApply.length; j++) {
                            objRecord.setSublistValue({ sublistId: 'apply', fieldId: 'apply', line: idTransApply[j].line, value: true });
                        }
                    }
                }
            } catch (error) {
                const mensajeError = 'Error NetSuite Excepción - Error en la función : _refreshApplyTranList - Detalles: ' + error.message;
                log.error('Error', mensajeError);
            }
        }

        /**
         * Setea el Rubro IVA (y el equivalente de ventas cuando corresponde) en cada línea
         * de una sublista, a partir de los resultados de las SS de mapeo.
         *
         * @param {number} cantidadLineas - Cantidad de líneas de la sublista
         * @param {Record} objRecord - Registro cargado
         * @param {string} idSublist - 'item' | 'expense'
         * @param {string} idFieldIVA - Id del campo de línea del rubro IVA
         * @param {Array|string} savedSearchResultsExpensas - Resultados de la SS de cuentas ('' para item, ver D4)
         * @param {Array} savedSearchResultsTaxCode - Resultados de la SS de códigos de impuesto
         * @param {string} recType - Tipo de registro
         *
         * @return {object} objetoRespuesta
         * @property {string} objetoRespuesta.mensaje - Mensaje de Respuesta.
         * @property {Boolean} objetoRespuesta.error - Verdadero si existe algún error en el proceso, falso si no existe ninguno.
         */
        function setearRubrosIVA(cantidadLineas, objRecord, idSublist, idFieldIVA, savedSearchResultsExpensas, savedSearchResultsTaxCode, recType) {

            const proceso = 'setearRubrosIVA';
            const objetoRespuesta = { mensaje: '', error: false };

            try {
                // ARI-B1: un índice por array, construido una vez por llamada.
                const porTaxCode = indexarPrimerMatch(savedSearchResultsTaxCode, 'idFieldKey');
                const porCuenta = indexarPrimerMatch(savedSearchResultsExpensas, 'idFieldKey');

                for (let i = 0; i < cantidadLineas; i++) {

                    const esFacturable = objRecord.getSublistValue({ sublistId: idSublist, fieldId: 'isbillable', line: i });
                    const customer = objRecord.getSublistValue({ sublistId: idSublist, fieldId: 'customer', line: i });

                    const fieldTaxCode = objRecord.getSublistValue({ sublistId: idSublist, fieldId: 'custcol_l598_codigo_impuesto', line: i }); // Cambiar este ID x el nuevo campo
                    const fieldAccount = objRecord.getSublistValue({ sublistId: idSublist, fieldId: 'account', line: i });

                    if (!utilities.isEmpty(fieldTaxCode) || !utilities.isEmpty(fieldAccount)) {

                        let rubroIVAFinal;
                        if (!utilities.isEmpty(fieldTaxCode)) {
                            rubroIVAFinal = buscarEnIndice(porTaxCode, fieldTaxCode);
                        } else {
                            rubroIVAFinal = buscarEnIndice(porCuenta, fieldAccount);
                        }

                        // Si es Expensas consultar si account tiene rubro asociado: el rubro de la
                        // cuenta predomina sobre el del taxcode.
                        // ARI-D3: cuando la línea no tiene tax code la búsqueda de arriba ya fue por
                        // cuenta sobre el mismo índice; repetirla daba el mismo resultado.
                        if (idSublist == 'expense' && !utilities.isEmpty(fieldTaxCode)) {
                            const rubroIVACuenta = buscarEnIndice(porCuenta, fieldAccount);

                            if (rubroIVACuenta) {
                                rubroIVAFinal = rubroIVACuenta;
                            }
                        }

                        if (rubroIVAFinal) {
                            if (!utilities.isEmpty(rubroIVAFinal.idRubroIVA)) {
                                const rubro = getRubro(recType, rubroIVAFinal);
                                objRecord.setSublistValue({ sublistId: idSublist, fieldId: idFieldIVA, line: i, value: rubro });
                            }

                            if (recType == 'vendorbill' && !utilities.isEmpty(rubroIVAFinal.rubroIVAEquivalente) && !utilities.isEmpty(esFacturable) && !utilities.isEmpty(customer) && (esFacturable == true || esFacturable == 'T')) {
                                objRecord.setSublistValue({ sublistId: idSublist, fieldId: 'custcol_l598_rubro_iva_equival_ventas', line: i, value: rubroIVAFinal.rubroIVAEquivalente });
                            }
                        } else {
                            objRecord.setSublistValue({ sublistId: idSublist, fieldId: idFieldIVA, line: i, value: '' });
                        }
                    }
                }
            } catch (error) {
                objetoRespuesta.error = true;
                objetoRespuesta.mensaje = 'Error NetSuite Excepción - Error al setear valores de rubros de IVA en líneas de Artículos y Gastos - Detalles: ' + error.message;
                log.error(proceso, objetoRespuesta.mensaje);
            }

            return objetoRespuesta;
        }

        /**
         * ARI-D6 — Devuelve el rubro a escribir según el tipo de transacción.
         * Compras (vendorbill / vendorcredit): el rubro propio. Resto: el equivalente de ventas.
         * La corrección del guard/valor en ventas es ARI-A4 y no entra acá.
         */
        function getRubro(recType, rubroIVA) {
            const proceso = 'getRubro';
            try {
                if (recType == 'vendorbill' || recType == 'vendorcredit') {
                    return rubroIVA.idRubroIVA;
                }
                return rubroIVA.rubroIVAEquivalente;
            } catch (e) {
                log.error(proceso, e);
            }
        }

        /**
         * Retorna los resultados de las búsquedas guardadas de taxcodes/accounts.
         * Las columnas se leen por posición según COLUMNAS_SS_RUBROS (ARI-D7).
         *
         * @param {string} idSavedSearch - ID del Saved Search a invocar
         * @param {string|null} subsidiaria - Subsidiaria de la transacción (filtra la SS de cuentas)
         *
         * @return {object} objetoRespuesta
         * @property {string} objetoRespuesta.mensaje - Mensaje de Respuesta.
         * @property {Boolean} objetoRespuesta.error - Verdadero si existe algún error en el proceso, falso si no existe ninguno.
         * @property {Array} objetoRespuesta.results - Array de resultados obtenidos del SS
         */
        function getRubrosIVA(idSavedSearch, subsidiaria) {

            const proceso = 'getRubrosIVA';
            const objetoRespuesta = { mensaje: '', error: false, results: [] };

            try {

                const filtros = [];
                if (!utilities.isEmpty(subsidiaria)) {
                    const filtro = {};
                    filtro.name = 'subsidiary';
                    filtro.operator = 'IS';
                    filtro.values = subsidiaria;
                    filtros.push(filtro);
                }

                const objResultSet = utilities.searchSavedPro(idSavedSearch, filtros);

                if (objResultSet.error) {
                    objetoRespuesta.error = true;
                    objetoRespuesta.mensaje = 'Error Consultando searchSavedPro - ' + idSavedSearch + ' - Error: ' + objResultSet.descripcion;
                    log.error(proceso, objetoRespuesta.mensaje);
                } else {

                    const resultSet = objResultSet.objRsponseFunction.result;
                    const resultSearch = objResultSet.objRsponseFunction.search;

                    if ((!utilities.isEmpty(resultSet)) && (resultSet.length > 0)) {
                        for (let i = 0; i < resultSet.length; i++) {

                            objetoRespuesta.results[i] = {};

                            objetoRespuesta.results[i].idFieldKey = resultSet[i].getValue({
                                name: resultSearch.columns[COLUMNAS_SS_RUBROS.ID_CLAVE]
                            });

                            objetoRespuesta.results[i].nombre = resultSet[i].getValue({
                                name: resultSearch.columns[COLUMNAS_SS_RUBROS.NOMBRE]
                            });

                            objetoRespuesta.results[i].idRubroIVA = resultSet[i].getValue({
                                name: resultSearch.columns[COLUMNAS_SS_RUBROS.RUBRO_IVA]
                            });

                            objetoRespuesta.results[i].rubroIVAEquivalente = resultSet[i].getValue({
                                name: resultSearch.columns[COLUMNAS_SS_RUBROS.RUBRO_EQUIVALENTE]
                            });
                        }
                    }
                }
            } catch (error) {
                objetoRespuesta.error = true;
                objetoRespuesta.mensaje = 'Error NetSuite Excepción - Error al obtener valores de rubros de IVA en Códigos de Impuestos y Cuentas - Detalles: ' + error.message;
                log.error(proceso, objetoRespuesta.mensaje);
            }

            return objetoRespuesta;
        }

        return {
            afterSubmit: afterSubmit
        };
    });
