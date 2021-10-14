/**
 * @module M/plugin/Findroute
 */

 import FindrouteControl from './findroutecontrol.js';
 import '@fortawesome/fontawesome-free/js/fontawesome';
 import '@fortawesome/fontawesome-free/js/solid';

 import 'assets/css/findroute.css';


export default class Findroute extends M.Plugin {

  /**
   * @classdesc
   * Main facade plugin object. This class creates a plugin
   * object which has an implementation Object
   *
   * @constructor
   * @extends {M.Plugin}
   * @param {Object} impl implementation object
   * @api stable
   */
  constructor(params) {

    super();
    /**
     * Facade of the map
     * @private
     * @type {M.Map}
     */
    this.map_ = null;

    /**
     * Array of controls
     * @private
     * @type {Array<M.Control>}
     */
    this.controls_ = [];

    /**
     * Searchstreet control
     *
     * @private
     * @type {M.control.Searchstreet}
     */
    this.control_ = null;     

    /**
     * Service URL (Searchstreet)
     *
     * @private
     * @type {string}
     */
    this.url_ = M.config.SEARCHSTREET_URL;

    /**
     * Service URL (OSRM)
     *
     * @private
     * @type {string}
     */
    if(!M.utils.isUndefined(params)){
      this.options_ = params.options || {};
      this.osrmurl_ = (((!M.utils.isNullOrEmpty(this.options_.osrmurl)) || (!M.utils.isUndefined(this.options_.osrmurl))) ? this.options_.osrmurl : undefined);
      this.osrmurlAlternativa_ = this.options_.osrmurlAlternativa;
      this.panelPosition_ = (((!M.utils.isUndefined(this.options_.panel)) && ((!M.utils.isNullOrEmpty(this.options_.panel.position)) || (!M.utils.isUndefined(this.options_.panel.position)))) ? this.options_.panel.position : M.ui.position.TL);
      this.conflictedPlugins_ = this.options_.conflictedPlugins || [];      
      this.urlGeocoderInverso = this.options_.urlGeocoderInverso;
    }else{
      this.osrmurl_ = undefined;
      this.panelPosition_ =  M.ui.position.TL;    
      this.conflictedPlugins_ = [];
    }
  }

  /**
   * This function adds this plugin into the map
   *
   * @public
   * @function
   * @param {M.Map} map the map to add the plugin
   * @api stable
   */
  addTo(map) {
    this.control_ = new FindrouteControl(this.url_, this.osrmurl_, this.osrmurlAlternativa_, this.conflictedPlugins_, this.urlGeocoderInverso);
    this.controls_.push(this.control_);
    this.map_ = map;
    this.panel_ = new M.ui.Panel("panelfindroute", {
      collapsible: true,
      className: 'm-findroute',
      position: this.panelPosition_,
      collapsedButtonClass: "g-cartografia-mapa-ruta",
      tooltip: "Cálculo de rutas"
    });

    // Foco al input al desplegar panel
    this.panel_.on(M.evt.ADDED_TO_MAP, (html) => {
      this.panel_._buttonPanel.addEventListener('click', (evt) => {
        if (!this.panel_.collapsed) {
          this.control_.getInputOrigen().focus();
        }
      });
    });

    this.panel_.addControls(this.controls_);
    map.addPanels(this.panel_);
  }
}
