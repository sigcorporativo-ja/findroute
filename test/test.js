import Findroute from 'facade/findroute.js';

M.proxy(false);
var myMap = M.map({
  container: 'mapjs',
  controls:['scale','layerswitcher','mouse'],
  layers: [new M.layer.OSM()]
});

var mp = new Findroute({
  options: {
    // Especificar url de instancia de OSRM
    //osrmurl: "",
    osrmurlAlternativa: "https://router.project-osrm.org",
    panel: {
      position: M.ui.position.TL
    },
    conflictedPlugins: ["navigation", "tools", "panelSelectByPolygon"],    
    urlGeocoderInverso: "http://ws248.juntadeandalucia.es/EXT_PUB_CallejeroREST/geocoderInversoSrs"
  }
});

// add here the plugin into the map
myMap.addPlugin(mp);

myMap.on(M.evt.COMPLETED, function() {
  myMap.setMaxExtent([96388.1179, 3959795.9442, 621889.937, 4299792.107]);
  myMap.setBbox([96388.1179, 3959795.9442, 621889.937, 4299792.107]);
});