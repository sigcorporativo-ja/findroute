/**
 * @module M/Control/FindrouteControl
 */

import FindrouteImplControl from 'impl/findroutecontrol';
import compile from 'osrm-text-instructions/index';

import templatefindroute from 'templates/findroute';
import templatefindrouteresults from 'templates/findrouteresults';
import templatefindrouteresultsroute from 'templates/findrouteresultsroute';

var osrmTextInstructions = compile('v5');

export default class FindrouteControl extends M.Control {

  /**
   * @classdesc
   * Main constructor of the class. Creates a PluginControl
   * control
   *
   * @constructor
   * @extends {M.Control}
   * @api stable
   */
  constructor(url, osrmurl, osrmurlAlternativa, conflictedPlugins, urlGeocoderInverso) {
    // 1. checks if the implementation can create PluginControl
    if (M.utils.isUndefined(FindrouteImplControl)) {
      M.exception('La implementación usada no puede crear controles findrouteControl');
    }
    // 2. implementation of this control
    let impl = new FindrouteImplControl(osrmurl, osrmurlAlternativa);
    super(impl, FindrouteControl.NAME);

    /**
     * Input 1 findroute
     *
     * @private
     * @type {HTMLElement}
     */
    this.input1_ = null;

    /**
     * Input 2 findroute
     *
     * @private
     * @type {HTMLElement}
     */
    this.input2_ = null;

    /**
     * Input actual findroute
     *
     * @private
     * @type {HTMLElement}
     */
    this.inputActual_ = null;

    /**
     * Button 1 findroute
     *
     * @private
     * @type {HTMLElement}
     */
    this.button1_ = null;

    /**
     * Button 2 findroute
     *
     * @private
     * @type {HTMLElement}
     */
    this.button2_ = null;

    /**
     * Button add input findroute
     *
     * @private
     * @type {HTMLElement}
     */
    this.buttonAddInput_ = null;

    /**
     * Button delete input findroute
     *
     * @private
     * @type {HTMLElement}
     */
    this.buttonDeleteInput_ = null;

    /**
     * Facade of the map
     * @private
     * @type {M.Map}
     */
    this.facadeMap_ = null;

    /**
     * Results panel actual findroute
     *
     * @private
     * @type {HTMLElement}
     */
    this.resultsContainerActual_ = null;

    /**
     * Timestamp of the search to abort old requests
     *
     * @private
     * @type {number}
     */
    this.searchTime_ = 0;

    /**
     * Search URL
     *
     * @private
     * @type {string}
     */
    this.searchUrl_ = url;

    /**
     * Municipality to search
     *
     * @private
     * @type {string}
     */
    this.municipio_ = null;

    /**
     * Province to search
     *
     * @private
     * @type {string}
     */
    this.provincia_ = null;

    /**
     * All provinces
     *
     * @private
     * @type {array}
     */
    this.provincias_ = ['huelva', 'sevilla', 'córdoba', 'jaén', 'cádiz', 'málaga', 'granada', 'almería'];

    /**
     * Stores the answers of the query when the province isn't indicated
     *
     * @private
     * @type {array}
     */
    this.respuestasProvincias_ = [];

    /**
     * Counter consulted provinces
     *
     * @public
     * @type {number}
     * @api stable
     */
    this.contadorProvincias = 0;

    /**
     * Container of the results to scroll
     * @private
     * @type {HTMLElement}
     */
    this.resultsScrollContainer_ = null;

    /**
     * Conflicted plugins to deactivate
     *
     * @private
     * @type {string}
     */
    this.conflictedPlugins_ = conflictedPlugins;

    /**
     * Url geocoder inverso
     * @type {String}
     */
    this.urlGeocoderInverso = urlGeocoderInverso;

    //captura de customevent lanzado desde impl
    window.addEventListener("routeCalculated", e => {
      this.showRouteResults(e.detail);
    });

    window.addEventListener("addPoint", e => {
      this.clearRouteResults();
    });

    window.addEventListener("recalculate", e => {
      this.clearRouteResults();
    });

    window.addEventListener("geocoderInv", e => {
      this.inverseGeocoderSearch(e.detail.coordinates, e.detail.input, this.showGeocoderInvResults);
    });

    if (!M.template.compileSync){
      M.template.compileSync = (string, options) => {
        let templateCompiled;
        let templateVars = {};
        let parseToHtml;
        if (!M.utils.isUndefined(options)){
          templateVars = M.utils.extends(templateVars, options.vars);
          parseToHtml = options.parseToHtml;
        }
        const templateFn = Handlebars.compile(string);
        const htmlText = templateFn(templateVars);
        if (parseToHtml !== false) {
          templateCompiled = M.utils.stringToHtml(htmlText);
        } else {
          templateCompiled = htmlText;
        }
        return templateCompiled;
      };
    }
  }
  /**
   * This function creates the view
   *
   * @public
   * @function
   * @param {M.Map} map to add the control
   * @api stable
   */
   createView(map) {
    this.facadeMap_ = map;
    return new Promise((success, fail) => {
      const html = M.template.compileSync(templatefindroute);
      this.addEvents(html);
      success(html);
    });
   }
  /**
   * This function is called on the control activation
   *
   * @public
   * @function
   * @api stable
   */
  activate() {
    super.activate(); //calls super to manage de/activation   

    this.getImpl().activateClick(this.facadeMap_);
    if(this.conflictedPlugins_.length > 0){
      this.deactiveConflictedPlugins();
    }
  }
  /**
   * This function is called on the control deactivation
   *
   * @public
   * @function
   * @api stable
   */
  deactivate() {
    super.deactivate(); //calls super to manage de/activation

    this.getImpl().deactivateClick(this.facadeMap_);

    this.clearRouteResults();
    this.clearInputsSearch();
    this.clearResultsSearch();
  }
   /**
   * This function gets activation button
   *
   * @public
   * @function
   * @param {HTML} html of control
   * @api stable
   */
  getActivationButton(html) {
    return html.querySelector('.m-findroute button');
  };
  
  /**
   * This function compares controls
   *
   * @public
   * @function
   * @param {M.Control} control to compare
   * @api stable
   */
  equals(control) {
    return control instanceof FindrouteControl;
  }

  /**
   * This function returns input_1
   *
   * @public
   * @function
   * @param {HTMLElement} html - HTML to add events
   * @api stable
   */
  getInputOrigen() {
    return this.input1_;
  }

  /**
   * This function deactivates conflicting plugins
   *
   * @private
   * @function
   */
  deactiveConflictedPlugins() {
    const conflictedPlugins = this.conflictedPlugins_;
    for (const panel of this.facadeMap_.getPanels(conflictedPlugins)) {
      for (const control of panel.getControls()) {
        if(control.activated) control.deactivate();
      }
    }
  }

  /**
   * This function add events to HTML elements
   *
   * @public
   * @function
   * @param {HTMLElement} html - HTML to add events
   * @api stable
   */
  addEvents(html) {
    this.element_ = html;

    this.on(M.evt.COMPLETED, () => {
      this.element_.classList.add('shown');
    }, this);

    // searchs
    this.input1_ = this.element_.getElementsByTagName('input')['m-findroute-search-input-1'];
    this.button1_ = this.element_.getElementsByTagName('button')['m-findroute-search-btn-1'];
    this.clear1_ = this.element_.getElementsByTagName('button')['m-findroute-clear-btn-1'];
    this.bandera1_ = this.element_.getElementsByTagName('button')['m-findroute-edit-btn-1'];

    this.input2_ = this.element_.getElementsByTagName('input')['m-findroute-search-input-2'];
    this.button2_ = this.element_.getElementsByTagName('button')['m-findroute-search-btn-2'];
    this.clear2_ = this.element_.getElementsByTagName('button')['m-findroute-clear-btn-2'];
    this.bandera2_ = this.element_.getElementsByTagName('button')['m-findroute-edit-btn-2'];
    // events
    this.button1_.addEventListener('click', this.searchClick.bind(this));
    this.button2_.addEventListener('click', this.searchClick.bind(this));
    this.bandera1_.addEventListener('click', this.activarBoton.bind(this));
    this.bandera2_.addEventListener('click', this.activarBoton.bind(this));
    this.input1_.addEventListener('keyup', this.searchClick.bind(this));
    this.input2_.addEventListener('keyup', this.searchClick.bind(this));
    this.clear1_.addEventListener('click', (evt) => {this.clearSearchs(evt);});
    this.clear2_.addEventListener('click', (evt) => {this.clearSearchs(evt);});

    // results container
    this.resultsContainer1_ = this.element_.getElementsByTagName('div')['m-findroute-results-1'];
    this.resultsContainer2_ = this.element_.getElementsByTagName('div')['m-findroute-results-2'];
    this.searchingResult_ = document.createElement('div');
    this.searchingResult_.className = 'm-searching-result g-cartografia-spinner';  

    // results route
    this.resultsContainerRoutePpalTitle_ = this.element_.getElementsByTagName('div')['m-findroute-route-results-ppal-title'];
    this.resultsContainerRoutePpalTitle_.addEventListener('click', (evt) => {this.toggleResultsRoute(evt);});
    this.resultsContainerRouteAltTitle_ = this.element_.getElementsByTagName('div')['m-findroute-route-results-alt-title'];
    this.resultsContainerRouteAltTitle_.addEventListener('click', (evt) => {this.toggleResultsRoute(evt);});
    this.resultsRoutePpal_ = this.element_.getElementsByTagName('div')['rutaPpal'];
    this.resultsRouteAlt_ = this.element_.getElementsByTagName('div')['rutaAlt'];

    // add input button
    this.buttonAddInput_ = this.element_.getElementsByTagName('button')['addRoutePoint'];
    this.buttonAddInput_.addEventListener('click', this.addInput.bind(this));

    // add input button
    this.buttonDeleteInput_ = this.element_.getElementsByTagName('button')['deleteRoutePoint'];
    this.buttonDeleteInput_.addEventListener('click', this.deleteInput.bind(this));

    // Botón de limpieza
    this.element_.querySelector("#limpiezaCompleta").addEventListener("click", this.limpiezaCompleta.bind(this));

    //Profiles events
    this.profiles_ = this.element_.getElementsByClassName('routeProfile');
    for (let i = 0, ilen = this.profiles_.length; i < ilen; i += 1) {
      this.profiles_[i].addEventListener('change', this.changeProfile.bind(this));
    }
  }

  /**
   * Limpia búsquedas, resultados y ruta.
   * Desactiva click en mapa e icono de bandera.
   * @function
   */
   limpiezaCompleta() {
    this.clearRouteResults();
    this.clearInputsSearch();
    this.clearResultsSearch();
    this.getImpl().deactivateClick(this.facadeMap_);
    
    const bandera = document.getElementsByClassName('g-cartografia-bandera m-edit-btn activated')[0];
    if (bandera) {
      bandera.classList.toggle('activated');
    }
  }

  /**
   * Limpia la búsqueda y los resultados de la búsqueda de un input.
   *
   * @private
   * @function
   */
  clearSearchs(evt) {
    this.element_.classList.remove('shown');
    let elemParent = FindrouteControl.findAncestor(evt.target, 'search-panel');
    let inputSearch = elemParent.querySelector('input.m-input-search');
    let resultsContainer = elemParent.nextElementSibling;

    inputSearch.value = '';
    resultsContainer.innerHTML = '';
  }

  /**
   * Clear results
   *
   * @private
   * @function
   */
  clearResult(evt) {
    this.element_.classList.remove('shown');
    let elemParent = FindrouteControl.findAncestor(evt.target, 'results-panel');
    let searchPanel = elemParent.previousElementSibling;
    let inputSearch = searchPanel.querySelector('input.m-input-search');
    inputSearch.value = FindrouteControl.getStreetName(evt.target,'result');
    elemParent.innerHTML = '';
  }
  /**
   * This function checks the query field is not empty, if it is not
   * sending the query to the search function
   *
   * @private
   * @function
   * @param {goog.events.BrowserEvent} evt - Keypress event
   */
  searchClick(evt) {
    evt.preventDefault();
    if (evt.type !== 'keyup' || (evt.keyCode === 13)) {
      let elemParent = FindrouteControl.findAncestor(evt.target, 'search-panel');
      this.inputActual_ = elemParent.querySelector('input.m-input-search');
      this.resultsContainerActual_ = elemParent.nextElementSibling;

      let query = this.inputActual_.value;

      if (M.utils.isNullOrEmpty(query)) {
        M.dialog.error('Debe introducir una búsqueda.');
      } else {
          this.search(query, this.showResults);
      }
    }
  }
  /**
   * This function performs the query
   *
   * @private
   * @function
   * @param {string} query - Query to search
   * @param {function} processor - Calls function
   */
  search(query, processor) {
    this.resultsContainerActual_.innerHTML = ' ';
    let searchUrl = null;
    this.provincia_ = null;
    this.municipio_ = null;
    this.resultsContainerActual_.appendChild(this.searchingResult_);
    // adds the class
    this.element_.classList.add(FindrouteControl.SEARCHING_CLASS);
    this.resultsContainerActual_.classList.add(FindrouteControl.MINIMUM);
    const normalizar = M.utils.addParameters(M.config.SEARCHSTREET_NORMALIZAR, {
      cadena: query,
    });

    M.proxy(true);
    M.remote.get(normalizar).then((response) => {
      M.proxy(false);
      const results = JSON.parse(response.text).normalizarResponse.normalizarReturn;
      this.provincia_ = M.utils.beautifyString(results.provincia);
      this.municipio_ = M.utils.beautifyString(results.municipio);
      if (!M.utils.isNullOrEmpty(this.provincia_)) {
        searchUrl = M.utils.addParameters(this.searchUrl_, {
          streetname: results.nombreVia,
          streetNumber: results.numeroPortal,
          streetType: results.tipoVia,
          municipio: this.municipio_,
          provincia: this.provincia_,
          srs: this.facadeMap_.getProjection().code,
        });
        this.searchTime_ = Date.now();
        this.querySearch(searchUrl, this.provincia_, processor);
      } else if (M.utils.isNullOrEmpty(this.provincia_) &&
        !M.utils.isNullOrEmpty(this.municipio_)) {
        this.searchTime_ = Date.now();
        this.respuestasProvincias_ = [];
        this.contadorProvincias = 0;
        for (let i = 0, ilen = this.provincias_.length; i < ilen; i += 1) {
          searchUrl = M.utils.addParameters(this.searchUrl_, {
            streetname: results.nombreVia,
            streetNumber: results.numeroPortal,
            streetType: results.tipoVia,
            municipio: this.municipio_,
            provincia: this.provincias_[i],
            srs: this.facadeMap_.getProjection().code,
          });
          this.querySearchProvinces(searchUrl, this.provincias_[i], processor);
        }
      } else {
        searchUrl = M.utils.addParameters(this.searchUrl_, {
          streetname: results.direccionSinNormalizar,
          streetNumber: null,
          streetType: null,
          municipio: null,
          provincia: null,
          srs: this.facadeMap_.getProjection().code,
        });
        this.searchTime_ = Date.now();
        this.querySearch(searchUrl, null, processor);
      }
    });
  }
  /**
   * This function performs the query if the town and province have value
   *
   * @private
   * @function
   * @param {string} searchUrl - Search URL
   * @param {string} provincia - Province
   * @param {string} processor - Calls function
   */
  querySearch(searchUrl, provincia, processor) {
    ((searchTime) => {
      M.proxy(true);
      M.remote.get(searchUrl).then((response) => {
        M.proxy(false);
        if (searchTime === this.searchTime_) {
          let results;
          try {
            if (!M.utils.isNullOrEmpty(response.text) && response.text.indexOf('No se ha podido obtener el codigoINE') === -1) {
              results = JSON.parse(response.text);
            } else {
              results = null;
            }
          } catch (err) {
            M.exception(`La respuesta no es un JSON válido: ${err}`);
          }
          if (!M.utils.isNullOrEmpty(results)) {
            this.provincia_ = M.utils.beautifyString(provincia);
            processor.call(this, results);
            this.element_.classList.remove(FindrouteControl.SEARCHING_CLASS);
            this.resultsContainerActual_.classList.remove(FindrouteControl.MINIMUM);
          } else {
            processor.call(this, results);
            this.element_.classList.remove(FindrouteControl.SEARCHING_CLASS);
            this.resultsContainerActual_.classList.remove(FindrouteControl.MINIMUM);
          }
        }
      });
    })(this.searchTime_);
  }
  /**
   * This function performs the query if the town and province haven't value
   *
   * @public
   * @function
   * @param {string} searchUrl - Search URL
   * @param {string} provincia - Province
   * @param {string} processor - Calls function
   * @api stable
   */
  querySearchProvinces(searchUrl, provincia, processor) {
    ((searchTime) => {
      M.proxy(true);
      M.remote.get(searchUrl).then((response) => {
        M.proxy(false);
        this.respuestasProvincias_.push(response);
        this.contadorProvincias += 1;
        if (this.contadorProvincias === 8) {
          for (let i = 0, ilen = this.respuestasProvincias_.length; i < ilen; i += 1) {
            if (searchTime === this.searchTime_) {
              let results;
              try {
                const item = this.respuestasProvincias_[i].text;
                if (!M.utils.isNullOrEmpty(item) && item.indexOf('No se ha podido obtener el codigoINE') === -1) {
                  results = JSON.parse(item);
                } else {
                  results = null;
                }
              } catch (err) {
                M.exception(`La respuesta no es un JSON válido: ${err}`);
              }
              if (!M.utils.isNullOrEmpty(results) && results.geocoderMunProvSrsResponse
                .geocoderMunProvSrsReturn.geocoderMunProvSrsReturn.coordinateX !== 0) {
                this.provincia_ = M.utils.beautifyString(provincia);
                processor.call(this, results);
                this.element_.classList.remove(FindrouteControl.SEARCHING_CLASS);
                this.resultsContainerActual_.classList.remove(FindrouteControl.MINIMUM);
              }
            }
          }
        }
      });
    })(this.searchTime_);
  }
  /**
   * This function displays the results of the consultation
   *
   * @private
   * @function
   * @param {object} results - Query results
   */
  showResults(results) {
    const resultsTemplateVars = this.parseResultsForTemplate(results);
    const options = { jsonp: true, vars: resultsTemplateVars };
    const html = M.template.compileSync(templatefindrouteresults, options);
    this.resultsContainerActual_.classList.remove(FindrouteControl.HIDDEN_RESULTS_CLASS);
    this.resultsContainerActual_.innerHTML = html.innerHTML;
    this.resultsScrollContainer_ = this.resultsContainerActual_.querySelector('div#m-findroute-results-scroll');
    if (!M.utils.isNullOrEmpty(this.resultsScrollContainer_)) {
      M.utils.enableTouchScroll(this.resultsScrollContainer_);
    }

    if (!M.utils.isUndefined(resultsTemplateVars.docs[0])) {
      this.eventList(resultsTemplateVars.docs);
    }
    this.element_.classList.remove(FindrouteControl.SEARCHING_CLASS);
    this.resultsContainerActual_.classList.remove(FindrouteControl.MINIMUM);

    // results button
    const btnResults = this.resultsContainerActual_.querySelector('div.page > div.g-cartografia-flecha-arriba');
    btnResults.addEventListener('click', this.resultsClick.bind(this));

    this.fire(M.evt.COMPLETED);
  }
  /**
   * This function parse query results for template
   *
   * @private
   * @function
   * @param {object} results - Query results
   * @returns {object} resultsTemplateVar - Parse results
   */
  parseResultsForTemplate(results) {
    let resultsTemplateVar = null;
    let containtResult = null;
    const resultado = results;
    const search = this.inputActual_.value;
    if (!M.utils.isNullOrEmpty(resultado)) {
      const docs = resultado.geocoderMunProvSrsResponse.geocoderMunProvSrsReturn;
      containtResult = !M.utils.isNullOrEmpty(docs);
      if (docs.geocoderMunProvSrsReturn instanceof Array) {
        if (!M.utils.isUndefined(docs.geocoderMunProvSrsReturn[0].coordinateX)) {
          for (let i = 0, ilen = docs.geocoderMunProvSrsReturn.length; i < ilen; i += 1) {
            docs.geocoderMunProvSrsReturn[i].localityName = this.municipio_;
            docs.geocoderMunProvSrsReturn[i].cityName = this.provincia_;
            docs.geocoderMunProvSrsReturn[i].streetType =
              M.utils.beautifyString(docs.geocoderMunProvSrsReturn[i].streetType);
            docs.geocoderMunProvSrsReturn[i].streetName =
              M.utils.beautifyString(docs.geocoderMunProvSrsReturn[i].streetName);
          }
          resultsTemplateVar = {
            docs: docs.geocoderMunProvSrsReturn,
            containtResult,
            search,
          };
        } else {
          resultsTemplateVar = {
            docs: [undefined],
            containtResult: false,
            search,
          };
        }
      } else if (M.utils.isNullOrEmpty(docs)) {
        resultsTemplateVar = {
          docs: [undefined],
          containtResult,
          search,
        };
      } else if (docs.geocoderMunProvSrsReturn.coordinateX === 0) {
        resultsTemplateVar = {
          docs: [undefined],
          containtResult: false,
          search,
        };
      } else {
        docs.geocoderMunProvSrsReturn.localityName = this.municipio_;
        docs.geocoderMunProvSrsReturn.cityName = this.provincia_;
        docs.geocoderMunProvSrsReturn.streetType =
          M.utils.beautifyString(docs.geocoderMunProvSrsReturn.streetType);
        docs.geocoderMunProvSrsReturn.streetName =
          M.utils.beautifyString(docs.geocoderMunProvSrsReturn.streetName);
        resultsTemplateVar = {
          docs: [docs.geocoderMunProvSrsReturn],
          containtResult,
          search,
        };
      }
    } else {
      resultsTemplateVar = {
        docs: [undefined],
        containtResult,
        search,
      };
    }
    return resultsTemplateVar;
  }
  /**
   * This function adds a click event to the elements of the list
   *
   * @private
   * @function
   * @param {array} results - Query results
   */
  eventList(results) {
    const rows = this.resultsContainerActual_.getElementsByClassName('result');
    for (let i = 0, ilen = rows.length; i < ilen; i += 1) {
      this.addEventClickList(rows[i], results[i]);
    }
  }
  /**
   * This function adds a click event to the element
   *
   * @private
   * @function
   * @param {HTMLElement} element - Specific item in the list
   * @param {object} result - Specific query result
   */
  addEventClickList(element, result) {
    element.addEventListener('click', (e) => {
      //Add route
      let elemParent = FindrouteControl.findAncestor(element, 'results-panel');
      let searchPanel = elemParent.previousElementSibling;
      let inputSearch = searchPanel.querySelector('input.m-input-search');
      let inputActual = inputSearch;

      this.getImpl().addPoint(e, result, inputActual);
      this.clearResult(e);
    }, false, this);
  }
  /**
   * This function hides/shows the list
   *
   * @private
   * @function
   * @param {goog.events.BrowserEvent} evt - Keypress event
   */
  resultsClick(evt) {
    this.facadeMap_._areasContainer.getElementsByClassName('m-top m-right')[0].classList.add('top-extra-search');
    evt.target.classList.toggle('g-cartografia-flecha-arriba');
    evt.target.classList.toggle('g-cartografia-flecha-abajo');
    let elemParent = FindrouteControl.findAncestor(evt.target, 'results-panel');
    elemParent.classList.toggle(FindrouteControl.HIDDEN_RESULTS_CLASS);   
  }

  /**
   * This function activates the button and the control 
   *
   * @private
   * @function
   * @param {goog.events.BrowserEvent} evt - Keypress event
   */
  activarBoton(evt){
    // Agrega/elimina clase activated de los botones bandera
    evt.target.classList.toggle('activated');
    let elements = document.getElementsByClassName('g-cartografia-bandera m-edit-btn activated');
    if(elements.length > 1){
      for (let i = elements.length - 1; i >= 0; i -= 1) {
        if(elements[i].getAttribute("id") != evt.target.getAttribute("id")) elements[i].classList.toggle('activated');
      }
    }
    // Guarda el elemento input correspondiente a la bandera pulsada
    let elemParent = FindrouteControl.findAncestor(evt.target, 'search-panel');
    this.inputActual_ = elemParent.querySelector('input.m-input-search');

    // Activa/desactiva control
    if(evt.target.classList.contains('activated')){
      this.activate();
    }else{
      this.deactivate();
    }    
  }
  /**
   * This function aggregates the route legs 
   *
   * @private
   * @function
   * @param {goog.events.BrowserEvent} ruta - route result
   * @returns {object} ruta - Parse route
   */
  prepareRouteforTemplate(ruta) {
    for(let j = 1; j < ruta.length; j++) {
      ruta[j].legs.forEach(function(element) {
          ruta[0].legs.push(element);
      });
      ruta[0].distance += ruta[j].distance;
      ruta[0].duration += ruta[j].duration;
    }

    return ruta[0];
  }
  /**
   * This function parse query results for template
   *
   * @private
   * @function
   * @param {object} results - Query results
   * @returns {object} resultsTemplateVar - Parse results
   */
  parseResultsForRouteTemplate(results) {
    let resultsTemplateVar = null;
    let containtResult = null;
    const resultado = results;
    let docs = new Array();
    if (!M.utils.isNullOrEmpty(resultado)) {
      resultado.legs.forEach((leg) => {
        leg.steps.forEach((step) => {
          var instruction = osrmTextInstructions.compile('es', step);
          let docStep = {
            instruction: instruction,
            distance: FindrouteControl.conversorDistancia(step.distance),
            geometry: step.geometry
          };
          docs.push(docStep);
        });
      });

      containtResult = !M.utils.isNullOrEmpty(docs);
      resultsTemplateVar = {
        routeDistance: FindrouteControl.conversorDistancia(resultado.distance),
        routeTime: FindrouteControl.conversorTiempo(resultado.duration),
        docs: docs,
        containtResult : containtResult
      };
    } else {
      resultsTemplateVar = {
        routeDistance: undefined,
        routeTime: undefined,
        docs: [undefined],
        containtResult,
      };
    }
    return resultsTemplateVar;
  } 
  /**
   * This function displays the results of the consultation
   *
   * @private
   * @function
   * @param {object} routeResults - Query results
   */
  showRouteResults(routeResults) {
    let routes = [];
    let routePpal = [];
    let routeAlt = [];
    let hayAlternativa = false;

    for(let i = 0; i < routeResults.length; i++) {
      if(routeResults[i].routes.length > 1) {
          routePpal.push(FindrouteControl.cloneJSON(routeResults[i].routes[0]));
          routeAlt.push(FindrouteControl.cloneJSON(routeResults[i].routes[1]));
          hayAlternativa = true;
        }else{
          routePpal.push(FindrouteControl.cloneJSON(routeResults[i].routes[0]));
          routeAlt.push(FindrouteControl.cloneJSON(routeResults[i].routes[0]));
        }
    }

    if(hayAlternativa){
      routes.push(this.prepareRouteforTemplate(routePpal));
      routes.push(this.prepareRouteforTemplate(routeAlt));
    }else{ //No hay ruta alternativa
      routes.push(this.prepareRouteforTemplate(routePpal));
    }

    for(let j = 0; j < routes.length; j++) {
      const resultsTemplateVars = this.parseResultsForRouteTemplate(routes[j]);
      const options = { jsonp: true, vars: resultsTemplateVars };
      const html = M.template.compileSync(templatefindrouteresultsroute, options);
      this.resultsContainerRouteActual_ = this.element_.getElementsByClassName("route-results-panel")[j];
      this.resultsContainerRouteActual_.classList.remove(FindrouteControl.HIDDEN_RESULTS_CLASS);
      this.element_.getElementsByClassName("result-route")[j].innerHTML = html.innerHTML;

      //add events
      if (!M.utils.isUndefined(resultsTemplateVars.docs[0])) {
        this.eventRouteList(resultsTemplateVars.docs);
      }

      const btnResultsPpal = this.resultsContainerRouteActual_.querySelector('div.page > div.g-cartografia-flecha-arriba');
      btnResultsPpal.addEventListener('click', this.resultsRouteClick.bind(this));
    }  
  }
  /**
   * This function toggles between routes
   *
   * @private
   * @function
   * @param {goog.events.BrowserEvent} evt - Keypress event
   */
  toggleResultsRoute(evt) {
    if(evt.target.getAttribute("id") == "m-findroute-route-results-ppal-title"){
      this.resultsRoutePpal_.classList.remove(FindrouteControl.HIDDEN_RESULTS_CLASS);
      this.resultsRouteAlt_.classList.add(FindrouteControl.HIDDEN_RESULTS_CLASS);

      //Cambio de estilos
      this.getImpl().changeRouteStyle(true);
    }else if(evt.target.getAttribute("id") == "m-findroute-route-results-alt-title"){
      this.resultsRoutePpal_.classList.add(FindrouteControl.HIDDEN_RESULTS_CLASS);
      this.resultsRouteAlt_.classList.remove(FindrouteControl.HIDDEN_RESULTS_CLASS);

      //Cambio de estilos
      this.getImpl().changeRouteStyle(false);
    }
    this.getImpl().deleteSteps(this.facadeMap_);
  }
  /**
   * This function hides/shows the list
   *
   * @private
   * @function
   * @param {goog.events.BrowserEvent} evt - Keypress event
   */
  resultsRouteClick(evt) {
    this.facadeMap_._areasContainer.getElementsByClassName('m-top m-right')[0].classList.add('top-extra-search');
    evt.target.classList.toggle('g-cartografia-flecha-arriba');
    evt.target.classList.toggle('g-cartografia-flecha-abajo');
    let elemParent = FindrouteControl.findAncestor(evt.target, 'route-results-panel');
    if(elemParent.getAttribute("id") == "m-findroute-route-results-ppal"){
      this.resultsRoutePpal_.querySelector('div.results').classList.toggle(FindrouteControl.HIDDEN_RESULTS_CLASS);
    }else if(elemParent.getAttribute("id") == "m-findroute-route-results-alt"){
      this.resultsRouteAlt_.querySelector('div.results').classList.toggle(FindrouteControl.HIDDEN_RESULTS_CLASS);
    }    
  }

  /**
   * This function clear routes results
   *
   * @private
   * @function
   */
  clearRouteResults() {
    let routeResults = this.element_.getElementsByClassName("route-results-panel");
    for(let i = 0; i < routeResults.length; i++) {
      var content = routeResults[i].querySelector('div.result-route');
      content.innerHTML = "";
      if(content.getAttribute("id") == "rutaPpal"){
        content.classList.remove(FindrouteControl.HIDDEN_RESULTS_CLASS);
      }else{
        content.classList.add(FindrouteControl.HIDDEN_RESULTS_CLASS);
      }
      routeResults[i].classList.add(FindrouteControl.HIDDEN_RESULTS_CLASS);
    }
  }

  /**
   * This function clear inputs values
   *
   * @private
   * @function
   */
  clearInputsSearch() {
    let inputSearchs = this.element_.getElementsByClassName("m-input-search");
    for(let i = 0; i < inputSearchs.length; i++) {
      inputSearchs[i].value = '';
    }
  }

  /**
   * This function clear searchs
   *
   * @private
   * @function
   */
  clearResultsSearch() {
    let results = this.element_.getElementsByClassName("results-panel");
    for(let i = 0; i < results.length; i++) {
      results[i].innerHTML = '';
    }
  }

  /**
   * This function adds a click event to the elements of the route list
   *
   * @private
   * @function
   * @param {array} results - Query results
   */
  eventRouteList(results) {
    const rows = this.resultsContainerRouteActual_.getElementsByClassName('stepResult');
    for (let i = 0, ilen = rows.length; i < ilen; i += 1) {
      this.addEventClickRouteList(rows[i], results[i]);
    }
  }

  /**
   * This function adds a click event to the route element
   *
   * @private
   * @function
   * @param {HTMLElement} element - Specific item in the list
   * @param {object} result - Specific query result
   */
   addEventClickRouteList(element, result) {
    element.addEventListener('mouseover', (e) => {
      //Add step point
      this.getImpl().addStepFeature(e, result.geometry);
    }, false, this);

    element.addEventListener('click', (e) => {
      //Add step point
      this.getImpl().addStepFeature(e, result.geometry);
    }, false, this);

    element.addEventListener('mouseleave', (e) => {
      //Clear layer
      this.facadeMap_.getLayers().find(layer => {
        if(layer.name == '__draw__'){
          layer.clear();
        }
      });      
    }, false, this);
  }

  /**
   * This function search postal address from coordinates
   *
   * @private
   * @function
   * @param {HTMLElement} coordinates - Coordinates
   * @param {HTMLElement} input - Input
   * @param {object} processor - Calls function
   */
  inverseGeocoderSearch(coordinates, input, processor) {
    ((searchTime) => {
      let elemParent = FindrouteControl.findAncestor(input, 'search-panel');
      this.inputActual_ = elemParent.querySelector('input.m-input-search');
      let coord23030 = this.getImpl().utils.transformCoord(coordinates, 'EPSG:4326', 'EPSG:23030');  
      const geocoderInverso = M.utils.addParameters(this.urlGeocoderInverso, {
        x: coord23030[0],
        y: coord23030[1],
        srs: this.facadeMap_.getProjection().code
      });
      M.proxy(true);
      M.remote.get(geocoderInverso).then((response) => {
        M.proxy(false);
        if (searchTime === this.searchTime_) {
          let results;
          try {
            if (!M.utils.isNullOrEmpty(response.text)) {
              results = JSON.parse(response.text);
            } else {
              results = null;
            }
          } catch (err) {
            M.exception(`La respuesta no es un JSON válido: ${err}`);
          }
          if (!M.utils.isNullOrEmpty(results)) {
            processor.call(this, results.geocoderInversoSrsResponse.geocoderInversoSrsReturn);
          }
        }
      });
    })(this.searchTime_);
  }

  /**
   * This function displays the results of the consultation
   *
   * @private
   * @function
   * @param {object} results - Query results
   */
  showGeocoderInvResults(results) {
    if(!M.utils.isNullOrEmpty(results.streetName)){
      let streetType = FindrouteControl.conversorCadena(results.streetType);
      let streetName = FindrouteControl.conversorCadena(results.streetName);
      let normResult = streetType + ' ' + streetName + ', ' + results.streetNumber;    
      this.inputActual_.value = normResult;
    }else{
      this.inputActual_.value = FindrouteControl.NO_POSTAL_ADDRESS;
    }    
  }

  /**
   * This function adds new route point input
   *
   * @private
   * @function
   */
  addInput() {
    let divInput = document.createElement('div');

    //Quitar clase last al último div existente y añadirlo al nuevo
    let elementsLast = this.element_.getElementsByClassName('search-panel last');
    for (let ilen = elementsLast.length, i = elementsLast.length - 1; i >= 0; i -= 1) {
      elementsLast[i].classList.toggle('last');
    }
    divInput.className = "search-panel last";

    //Placeholder puntos intermedios
    let elements = this.element_.getElementsByClassName('m-input-search');
    for (let ilen = elements.length, i = elements.length - 1; i > 0; i -= 1) {
      elements[i].setAttribute("placeholder", "Punto intermedio");
    }

    let nextInput = this.element_.getElementsByClassName("m-input-search").length + 1;

    let elementArray = new Array();
    elementArray.push(FindrouteControl.createFormElement("input", "text", "m-findroute-search-input-" + nextInput, "m-input-search", "Formato de búsqueda recomendado:\n Tipo Nombre Número, Municipio Provincia\n Ej: Calle Sierpes 1, Sevilla Sevilla\n (El municipio es obligatorio, la provincia recomendable)", "Destino"));
    elementArray.push(FindrouteControl.createFormElement("button", "button", "m-findroute-search-btn-" + nextInput, "g-cartografia-zoom m-search-btn", "Buscar"));
    elementArray.push(FindrouteControl.createFormElement("button", "button", "m-findroute-clear-btn-" + nextInput, "g-cartografia-cancelar m-clear-btn", "Limpiar búsqueda"));
    elementArray.push(FindrouteControl.createFormElement("button", "button", "m-findroute-edit-btn-" + nextInput, "g-cartografia-bandera m-edit-btn", "Añadir punto en el mapa"));
    
    for (let i = 0; i < elementArray.length; i++) {
      divInput.appendChild(elementArray[i]);
    }

    let divResult = FindrouteControl.createFormElement("div", "", "m-findroute-results-" + nextInput, "results-panel");

    let container = this.element_.getElementsByClassName("m-findroute-container-inside")[0];
    container.insertBefore(divInput, container.getElementsByClassName("route-results-panel")[0]);
    container.insertBefore(divResult, container.getElementsByClassName("route-results-panel")[0]);

    //add events
    let tagEditId = "m-findroute-edit-btn-" + nextInput;
    let newEditButton = this.element_.getElementsByTagName('button')[tagEditId];
    newEditButton.addEventListener('click', this.activarBoton.bind(this));

    let tagSearchId = "m-findroute-search-btn-" + nextInput;
    let newSearchButton = this.element_.getElementsByTagName('button')[tagSearchId];
    newSearchButton.addEventListener('click', this.searchClick.bind(this));

    let tagInputId = "m-findroute-search-input-" + nextInput;
    let newInput = this.element_.getElementsByTagName('input')[tagInputId];
    newInput.addEventListener('keyup', this.searchClick.bind(this));

    let tagClearId = "m-findroute-clear-btn-" + nextInput;
    let newClearButton = this.element_.getElementsByTagName('button')[tagClearId];
    newClearButton.addEventListener('click', (evt) => {this.clearSearchs(evt);});
  }

  /**
   * This function deletes the last point input
   *
   * @private
   * @function
   */
  deleteInput() {
    let search = this.element_.getElementsByClassName('search-panel');
    let results = this.element_.getElementsByClassName('results-panel');
    if(search.length > 2){
      let divInput = search[search.length - 1];      
      divInput.parentElement.removeChild(divInput);
      divInput = search[search.length - 1].classList.toggle('last');

      let divResult = results[results.length - 1];
      divResult.parentElement.removeChild(divResult);

      //Placeholder punto final
      let elements = this.element_.getElementsByClassName('m-input-search');
      elements[elements.length - 1].setAttribute("placeholder", "Destino");

      //Limpiar resultados
      this.clearRouteResults();

      //Borrar feature y recalcular ruta
      if(this.getImpl().getPoints().length > 2) this.getImpl().deleteLastPoint();
      this.getImpl().utils.setFeatureStyle();      
      this.getImpl().recalculateRoute();
    }    
  }
  /**
   * This function
   *
   * @private
   * @function
   */
  changeProfile() {
    this.getImpl().recalculateRoute();
  }
}

/**
 * Name to identify this control
 * @const
 * @type {string}
 * @public
 * @api stable
 */
FindrouteControl.NAME = 'findroute';

/**
 * Class 'searching'
 *
 * @const
 * @type {string}
 * @public
 * @api stable
 */
FindrouteControl.SEARCHING_CLASS = 'm-searching';

/**
 * Class 'hidden'
 * @const
 * @type {string}
 * @public
 * @api stable
 */
FindrouteControl.HIDDEN_RESULTS_CLASS = 'hidden';

/**
 * Class 'minimum'
 * @const
 * @type {string}
 * @public
 * @api stable
 */
FindrouteControl.MINIMUM = 'minimum';

/**
 * Class 'NO_POSTAL_ADDRESS'
 * @const
 * @type {string}
 * @public
 * @api stable
 */
FindrouteControl.NO_POSTAL_ADDRESS = 'Sin dirección postal';

FindrouteControl.findAncestor = function(el, cls) {
    while ((el = el.parentElement) && !el.classList.contains(cls));
    return el;
};

FindrouteControl.getStreetName = function(el, cls) {
  let elParent;
  let result = '';
  if(el.classList.contains(cls)){
    elParent = el;
  }else{
    elParent = FindrouteControl.findAncestor(el,cls) ; 
  }
  let tds = elParent.getElementsByTagName("td");
  for (let i = 0, ilen = tds.length; i < ilen; i += 1) {
    result += tds[i].innerText + ' ';
  }
  return result.trim();
};

FindrouteControl.conversorDistancia = function(metros) {
  if(metros < 1000){
    return metros.toFixed(1) + ' m';
  }else{
    return (metros/1000).toFixed(1) + ' km';
  }
};

FindrouteControl.conversorTiempo = function(segundos) {
  var valor = segundos / 60;

  if(valor < 1) return Math.round(segundos) + ' seg';
  if(valor < 60) return Math.round(valor) + ' min';

  var horas = Math.floor(segundos / 3600);
  var minutos = Math.floor(segundos % 3600 / 60);

  return horas + ' h ' + minutos + ' min';
};

FindrouteControl.conversorCadena = function(cadena) {
  let cadenaLowerCase = cadena.toLowerCase();
  return cadenaLowerCase.charAt(0).toUpperCase() + cadenaLowerCase.slice(1);
};

FindrouteControl.createFormElement = function(label, type, id, classes, title, placeholder) {
  var element = document.createElement(label);

  if (!M.utils.isNullOrEmpty(type)) {
    element.setAttribute("type", type);
  }
  
  if (!M.utils.isNullOrEmpty(id)) {
    element.id = id;
  }
  
  if (!M.utils.isNullOrEmpty(classes)) {
    element.className = classes;
  }
  
  if (!M.utils.isNullOrEmpty(title)) {
    element.setAttribute("title", title);
  }  

  if (!M.utils.isNullOrEmpty(placeholder)) {
  element.setAttribute("placeholder", placeholder);
  }

  return element;
};

FindrouteControl.cloneJSON = function(obj) {
  return JSON.parse(JSON.stringify(obj));
};