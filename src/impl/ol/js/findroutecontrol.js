/**
 * @module M/impl/Control/FindrouteControl
 */

export default class FindrouteControl extends M.impl.Control {
  /**
   * @classdesc
   * Main constructor of the findrouteControl.
   *
   * @constructor
   * @extends {M.impl.Control}
   * @api stable
   */
  constructor(osrmurl, osrmurlAlternativa) {
    super();
    if (M.utils.isUndefined(osrmurl)) {
      this.url_osrm_nearest = osrmurlAlternativa + "/nearest/v1/";
      this.url_osrm_route = osrmurlAlternativa + "/route/v1/";
    }else{
      this.url_osrm_nearest = osrmurl + '/nearest/v1/';
      this.url_osrm_route = osrmurl + '/route/v1/';
    }
  }
  /**
   * This function adds the control to the specified map
   *
   * @public
   * @function
   * @param {M.Map} map to add the plugin
   * @param {HTMLElement} html of the plugin
   * @api stable
   */
  addTo(map, html) {
    this.element_ = html;
    let olMap = map.getMapImpl();
    olMap.getInteractions().forEach(interaction => {
      if (interaction instanceof ol.interaction.DoubleClickZoom) {
        this.dblClickInteraction = interaction;
      }
    });

    this.facadeMap_ = map;

    //Array para almacenar los puntos de la ruta
    this.points = ['',''];

    //Utiles
    this.utils = {
      getNearest: (coord) => {
        var coord4326 = this.utils.transformCoord(coord, this.facadeMap_.getProjection().code, 'EPSG:4326');    
        return new Promise((resolve, reject) => {
          let profile = this.utils.getProfile(document.getElementsByName('routeProfile'));
          let url = this.url_osrm_nearest + profile + '/';
          //Snap del punto a la red
          M.proxy(false);
          M.remote.get(url + coord4326.join()).then((response) => {
            if(!M.utils.isUndefined(response.code) && response.code != 200){
              reject(response.code);
            }else{
              let json = JSON.parse(response.text);
              if (json.code === 'Ok') resolve(json.waypoints[0].location);
              else reject(json.message);
            }
          });
        });
      },
      createFeature: (coord, id) => {
        let feature = new M.Feature("marcador" + id, {
          "id": id
        });
        let geojsonObject = {
          'type': 'Point',
          'coordinates': [coord[0], coord[1]]  
        };
                  
        feature.setGeometry(geojsonObject);

        this.marcadorLayer.addFeatures(feature);

        this.utils.setFeatureStyle();       
      },
      createRoute: (polyline, tipoRuta) => {
        let ruta = new ol.format.Polyline({
          factor: 1e5
        }).readFeature(polyline, {
          dataProjection: 'EPSG:4326',
          featureProjection: this.facadeMap_.getProjection().code
        });

        var rutaCoordinates = ruta.getGeometry().getCoordinates();

        var featureRuta = new M.Feature("ruta" + Math.random(), {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: rutaCoordinates
          }
        });
        if(tipoRuta == "alternativa"){
          featureRuta.setStyle(this.rutaAltStyle);
          featureRuta.setAttribute("tipoRuta","rutaAlt");
        }else if(tipoRuta == "principal"){
          featureRuta.setStyle(this.rutaPpalStyle);
          featureRuta.setAttribute("tipoRuta","rutaPpal");
        } else {
          featureRuta.setStyle(this.rutaPpalStyle);
          featureRuta.setAttribute("tipoRuta","rutaPpal");
        }

        this.rutaLayer_.addFeatures([featureRuta]);
      },
      transformCoord: (coord, origen, destino) => {
        return ol.proj.transform([
          parseFloat(coord[0]), parseFloat(coord[1])
        ], origen, destino);
      },
      setFeatureStyle: () => {
        if (this.marcadorLayer.getFeatures().length > 1){
          this.marcadorLayer.getFeatures().forEach((feature, idx, array) => {
            if (idx === array.length - 1){
              feature.setStyle(this.utils.cambiarEstilo('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAI4AAACRAQMAAAAvsxIFAAAAAXNSR0IB2cksfwAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAAZQTFRFAAAAm64MbRMzkgAAAAJ0Uk5TAP9bkSK1AAABoklEQVR4nO3WMU7EMBAFUFspUuYIuQk+WowoOAZHIVRcI1SUGNFkpSjD+I+TtceRVoICWOFmd98mjuMZjceYg+Hmioi0WCKvqCEaFbVEk6KOKCjqifQjHdFymQai9TIRVcv/Ico2aPCg/nxlw3/G1UdOO9Txl4FkpLdyvFUbyWw27p7baJH7+HMnBAq71+8UEC6mbid5PFNLaiy4VpH9Fr1WtLYVhZo801sCIaz3RWgSmpB3DmSEPAivMReEd/YltcjHgiy27DqIg66o46wJJQ1MN0KN0F3MLTeCeqEH0AzaQxuJbpmakt6ZXEk8PqikdcjTRAgV4g8SJ7WmZ2hOARldUEzySWgVmhHHHjQLjSALmopo30TyZUYzLSonOIqTTpPT8sty9cvUx18Ftdj5MslRNKxcCrqX7AO1Qo8Syqcs79M4EeqzqnLBVoUvdDWhElXl8YBCTVNNY01GaD1X7yWRMXuRn4XCdkZhdhCOm17Ip2NGzimZ1UipldMsTZW1BZ2squgU0n05bR1C3k80MutBi/FPV0sHPaYZdCvHNVb3gJ+zRwUQBed3+AAAAABJRU5ErkJggg=='));
            }else{
              feature.setStyle(this.utils.cambiarEstilo('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJMAAACTCAMAAAC9O9snAAAAAXNSR0IB2cksfwAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAN5QTFRFAAAAvchurbxMoLEfm64Mt8JhtsiApLUuv7+AsL9TqrlBprY2sb9WtMJcpbUzusdss8BZsL5SrLtIqbg+s79Yu8dqvMhvr71Pv8x5vslvrr1OoLIhusZonrAbtcJepLUzvsx0nbAWvspyo7Quvshxsr9WvMh6orQpt8RkobMlrrxKnK4RvspwvcZ7tMFbobMmrr1MucVpvMltqLc6uMVlu8ZqssBYqLg8rLlEprY1ucVoscBVp7c6r7xOgICAwch1ushqrbxLv7+An7AcvMlwvcZxm64PucRnq7pGorMpG8k7ZAAAAEp0Uk5TAF3Q/P+bDvQMwuHuu6rxaLLE1+a0cVzIKFrK+339ovI3/kP1T7oX95L61f9SG6360Hxn6oh0s+jc73+968sCJXPQBP1QG/+G2/gMLcTrAAADSElEQVR4nO3c+3vZUBjA8ahUhIa5TSlxWTs1UqOG0lpndvv//6FFI+RyLu8hnmPP3u+vlZNPRRI851AUTKzYRVzdFL+ULXFLOCAnLSmbs0lX/aVkgxQlrQbTZJOuQiRVvTo/kqoaUk1EkqrKJGUoJpkvKQpJVeVdEcivJrlPFJUk8RWFpqhN2ct3uXwhUyiWEtHt/r1mV74WN1Wq8fBfb1JG7EhQrb4bzXff55iSZoPxCLt881BR1T+Q5zSvk3dl11KUFNvjlrum75lS+0N4mFv3j3fUPdGvXITqdx8FRCZ5kN09VmTP7Dr3IBDjf3VPnm50KLtPnDsS+8nvbR/Vj9Rk1ymROdZDh7utuX1sLmrUpsHn4V6THOmEiwkxd5PHU6CcNNEN2sopn6nD2l+lhrIp+/ZHfCybsuvfN7UyeeOLfRepTKatCBEz/3kANj3NCdeb7CL8WVU4+9J/gElj3jHGgyNAWnMzhLBpzAJtWxwm0rebi5kGbaKBUBv4rsbN+42SiEn0yxXwYUyPfNvBTR1BkRP3MHYnoTfzYBP4qIWiH8Zn0tkLNpnEjUVKzMv7N/KD6YtJf3sMM0FOtuhCE5rQhCY0oQlNaEITmtCEJjShCU1oQhOa0IQmNKEJTWhCE5rQhCY0oQlNaPo/TctmbGzkZs/pRVa6aVR87KnhWtNJ5SiRERgQZvpaJlj89SYHimKhofim5gvpySGmvQqLrPCc7BuOKbgqj99MZML9iDSj0nOIwibKVHhu0MNIGd/ziIBpDp1aTY57GK1vtE2ppiiiHsaVzpgFWzup6a3vKXPt2cuy/8CelZtXTm9y69JXrHjzr2Q7i3nRgTWk52AKLmuVb+o1gyeDdBNh8jXQ1CjkdeO+tP5hb9IvPkUmuiBdNPim1JC0naJkc8LrRYJRFo4yTYF5zIToC8H4Uadf003lJQ/k9EpbZ8xOp49INv0UW+BtVYmjMGL+VkIUc9rfGhXAoAbnJRE2HfFzD5DDWFhzhwmYjl9C/YtxNjZgawdP9Vnq1vz9xzNwp1qDr+OV+fmOFppgoQkWmmChCRaaYKEJFppgoQkWmmChCRaaYFk+kyWb4+QzycZs8/4aTV82xm21I61kU86wv1E0r3Q7rCb1AAAAAElFTkSuQmCC'));
            }
          });
        }
      },
      cambiarEstilo: (codigo) => {
        let marcStyle = new M.style.Point({
          icon: {
            src: codigo,
            scale: 0.25,
            anchor: [-0.005, 0],
            anchororigin: 'bottom-left'
          }
          /*label: {
            text: codigo,
            font: '900 18px "Font Awesome 5 Free"',
            color: '#9bae0c',
            scale: 1.2,
            offset: [0, 0],
            stroke: {
              color: '#ffffff',
                width: 3
            },
            rotation: 0,
            align: M.style.align.LEFT,
            baseline: M.style.baseline.BOTTOM
          }*/
        });
        return marcStyle;
      },
      getProfile : (profiles) => {
        let profile = 'car';
        for (var i = 0, length = profiles.length; i < length; i++){
          if (profiles[i].checked){
            profile = profiles[i].value;
            break;
          }
        }
        return profile;
      }
    };

    //CAPAS
    //Capa para los marcadores de las rutas
    this.marcadorLayer = new M.layer.GeoJSON({
      source: {
        "crs": {"properties": {"name": this.facadeMap_.getProjection().code},"type": "name"},
        "features": [],
        "type": "FeatureCollection"
      },
      name: 'Puntos de ruta',
      extract: false
    });

    //Capa para las rutas
    this.rutaLayer_ = new M.layer.Vector({
      name: 'Ruta',
      extract: false
    });

    //Capa para los inicios de los steps
    this.stepLayer_ = new M.layer.Vector({
      name: 'Indicaciones de ruta',
      extract: false
    });

    //ESTILOS
    //Estilo de la capa de marcador
    this.marcador_ = this.utils.cambiarEstilo('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJMAAACTCAMAAAC9O9snAAAAAXNSR0IB2cksfwAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAMBQTFRFAAAAvchurbxMoLEfm64Mt8JhtsiApLUuv7+AsL9TqrlBprY2sb9WtMJcpbUzusdss8BZsL5SrLtIqbg+s79Yu8dqvMhvr71Pv8x5vslvrr1OoLIhusZonrAbtcJepLUzvsx0nbAWvspyo7Quvshxsr9WvMh6orQpt8RkobMlrrxKnK4RvspwvcZ7tMFbobMmrr1MucVpvMltqLc6uMVlm64LvMlwvcZxprY1gICAushqm64PucRnq7pGorMpv7+AKYj9mwAAAEB0Uk5TAF3Q/P+bDvQMwuHuu6rxaLLE1+a0cVzIKFrK+339ovI3/kP1T7oX95L61f9SG6360Hxn6oj+UBvvAnP/htv4BPTjbYsAAAJwSURBVHic7dzbVtpAGIbhUUbZKFqIVItsrFXRCm2h1O7r/d9Vw4IQksxMvkBY/xx87ynM5CGEcPRHKVasg8OKXlQ5kpZEHS9By6o1ac6iuk7WkAYpdaLTVaVJpxmS1qf+kbRuipqMJK0lSWcWk+QlZSFpLXdHMF9NsifKShK8omgq23R+9KbVDs6Ci85xeYd/Ww27vCpuetetZF+9bjQPdgT1+uvdEv/7OabaYOh4R1j7ZltRN7nRxs+8bz5U2HulGm5PVOvKfmRLtx+y29xFL95bj2S/cxnq3z8UEA3Mm6z/Y4sc2d3oEQI5Pmv043kqDxX2MecfyX3yn1fvGpdqCht1zJzJp1Hu2sHqva2yUYs+f5nGmtqsbriZGIuWfN0Halm16IJbtc8ztV3xXWoqTYmLv/G5NGUdTVg0YdGEJWb6Zn+J5wmLJiyasGjCogmLJiyasGjCogmLJiyasGjCogmLJiyasGjCogmLJiyasGjCogmLJiyasGjCogmLJiyasGjCogmLJiyasGjC8tB07aFp7qFJ0YTU88/UVt6ZkpNsXphSM6Q+mNJjrfKm5xvlm8kwrgOahkG73nzsvHwPl4wvfpQmOsyKEFNjalqn1Hmr8LxIOsvgqNN0MjMvirMPguVnnW23my5/5oGW/bLNGbur23c0m34XG/CedI27OHI+K8Fk2uqBAbMABg1zLomsaYfHPSBfY/CSu03KtPsI9R/Hr3GIzQ4mTfP8BWB3g7//NjYedXv4HO++TLtEExZNWDRh0YRFExZNWDRh0YRFExZNWDRhTRKmiTRnWcIkjVm1+TSasTQm6nVNepWmeNh/jcwD9KYkeLoAAAAASUVORK5CYII=');

    //Estilo de la ruta principal
    this.rutaPpalStyle = new M.style.Line({
      fill: {
        color: '#9bae0c',
        width: 4
      },
      stroke: {
        color: '#7c8c05',
        width: 6,
      }
    });

    this.rutaAltStyle = new M.style.Line({
      fill: {
        color: '#72723d',
        width: 6,
        opacity: 0.6,
      }
    });

    let stepStyle = new M.style.Point({
      radius: 9,
      fill: {  
        color: '#ffffff',
        opacity: 0.8
      },
      stroke: {
        color: '#596615',
        width: 3
      }
    });

    this.marcadorLayer.setStyle(this.marcador_);
    this.stepLayer_.setStyle(stepStyle);

    this.facadeMap_.addLayers([this.rutaLayer_, this.marcadorLayer, this.stepLayer_]);
    //Oculto las capas en el TOC
    this.marcadorLayer.displayInLayerSwitcher = false;
    this.stepLayer_.displayInLayerSwitcher = false;
    this.rutaLayer_.displayInLayerSwitcher = false;

    // super addTo - don't delete
    super.addTo(map, html);
  }

  activateClick(map) {
    //Añado la capas del TOC
    if(M.impl.Map.Z_INDEX[M.layer.type.WFS] == 1){
        this.marcadorLayer.setZIndex(10501);
        this.rutaLayer_.setZIndex(10502);
        this.stepLayer_.setZIndex(10503);        
    }else{
        this.marcadorLayer.setZIndex(M.impl.Map.Z_INDEX[M.layer.type.WFS] + 152);
        this.rutaLayer_.setZIndex(M.impl.Map.Z_INDEX[M.layer.type.WFS] + 153);
        this.stepLayer_.setZIndex(M.impl.Map.Z_INDEX[M.layer.type.WFS] + 154);
    }  
    this.marcadorLayer.displayInLayerSwitcher = true;
    this.stepLayer_.displayInLayerSwitcher = true;
    this.rutaLayer_.displayInLayerSwitcher = true;

    //desactivo el zoom al dobleclick
    this.dblClickInteraction.setActive(false);

    //Evento click
    let olMap = map.getMapImpl();
    olMap.on('click', this.addPoint, this);
  }

  /**
   * Desactiva la captura de dirección al hacer click en el mapa.
   * @function
   */
  desactivaSinLimpiar() {
    //Quito la capas del TOC
    this.marcadorLayer.displayInLayerSwitcher = false;
    this.stepLayer_.displayInLayerSwitcher = false;
    this.rutaLayer_.displayInLayerSwitcher = false;

    //activo el zoom al dobleclick
    this.dblClickInteraction.setActive(true);

    let olMap = this.facadeMap_.getMapImpl();
    olMap.un('click', this.addPoint, this);
  }

  /**
   * Desactiva la captura de dirección al hacer click en el mapa
   * y elimina la ruta y puntos mostrados.
   * @function
   * @param {M.map} map 
   */
  deactivateClick(map) {
    this.deleteRoutePoints(map);
    this.deleteRoute(map);

    this.desactivaSinLimpiar();
  }

  addPoint(evt, result, inputAct) {
      let control = this;

      let addPointEvt = new CustomEvent('addPoint', {
        bubbles: true
      });
      this.facadeMap_.getContainer().dispatchEvent(addPointEvt);

      let routePointsInputs = null;
      let inputActual = null;
      let actualPoint = null;
      let emptyValues = false;
      if(!M.utils.isUndefined(result)){
        routePointsInputs = this.element_.getElementsByClassName("m-input-search");
        inputActual = inputAct;
        for (let i = 0, ilen = routePointsInputs.length; i < ilen; i += 1) {
          if(routePointsInputs[i].getAttribute("id") === inputActual.getAttribute("id")){
            actualPoint = i;
            break;
          } 
        }
      }else{
        routePointsInputs = this.element_.getElementsByClassName("g-cartografia-bandera m-edit-btn");
        inputActual = this.element_.getElementsByClassName("g-cartografia-bandera m-edit-btn activated")[0];
        for (let i = 0, ilen = routePointsInputs.length; i < ilen; i += 1) {
          if(routePointsInputs[i].getAttribute("id") === inputActual.getAttribute("id")){
            actualPoint = i;
            break;
          }
        }
      }      

      let coordinate = new Array();
      if(!M.utils.isUndefined(result)){
        coordinate.push(result.coordinateX);
        coordinate.push(result.coordinateY);
      }else{
        coordinate = evt.coordinate;
      }
      this.utils.getNearest(coordinate).then((coord_geo) => {
        this.replacePoint(actualPoint, coord_geo);
        this.deletePointsFeatures(this.facadeMap_);
        let points_length = control.points.length;

        for (let i = 0, ilen = points_length; i < ilen; i += 1) {
          if(M.utils.isNullOrEmpty(control.points[i])){
            emptyValues = true;
          }else{
            control.utils.createFeature(control.utils.transformCoord(control.points[i], 'EPSG:4326', this.facadeMap_.getProjection().code), i);
          }
        }

        //Obtener la dirección por geocodificación inversa si se hace clic en el mapa
        if(M.utils.isUndefined(result)){
          let geocoderInvEvt = new CustomEvent('geocoderInv', {
            detail: {
              coordinates: coord_geo,
              input: inputActual
            },
            bubbles: true
          });
          this.facadeMap_.getContainer().dispatchEvent(geocoderInvEvt);
        }

        if (points_length < routePointsInputs.length || emptyValues) {
          return;
        }

        //Obtener la ruta
        this.deleteRoute(this.facadeMap_);
        this.deleteSteps(this.facadeMap_);

        let promiseArray = [];
        let ilen = points_length;

        for (let m = 0; m < ilen - 1; m += 1) {
          promiseArray.push(this.calculateRoute(control.points[m].join(), control.points[m+1].join()));
        }

        const results = Promise.all(promiseArray).then((routeResult) => {
          if (!M.utils.isNullOrEmpty(routeResult)) {
              //Zoom to layer extent
              this.facadeMap_.setBbox(this.rutaLayer_.getFeaturesExtent());

              let routeCalculatedEvt = new CustomEvent('routeCalculated', {
                detail: routeResult,
                bubbles: true
              });
              this.facadeMap_.getContainer().dispatchEvent(routeCalculatedEvt);
            }
          }).catch((err) => {
            M.dialog.show("No se ha podido calcular la ruta: " + err, "Error", 'error');
          });

      }).catch((err) => {
        M.dialog.show("No se ha podido obtener el punto más cercano: " + err, "Error", 'error');
      });
     
    // Se desactiva el botón de bandera tras click en mapa
    this.facadeMap_.getMapImpl().un('click', this.addPoint, this);
    this.desactivaSinLimpiar();
    const bandera = document.getElementsByClassName('g-cartografia-bandera m-edit-btn activated')[0];
    if (bandera) {
      bandera.classList.toggle('activated');
    }
  }

  recalculateRoute(){
    let control = this;

    let recalculateEvt = new CustomEvent('recalculate', {
      bubbles: true
    });
    this.facadeMap_.getContainer().dispatchEvent(recalculateEvt);

    let routePointsInputs = this.element_.getElementsByClassName("m-input-search");
    let emptyValues = false; 
    let points_length = control.points.length;

    for (let i = 0, ilen = points_length; i < ilen; i += 1) {
      if(M.utils.isNullOrEmpty(control.points[i])){
        emptyValues = true;
      }
    }

    if (points_length < routePointsInputs.length || emptyValues) {
      return;
    }

    //Obtener la ruta
    this.deleteRoute(this.facadeMap_);
    this.deleteSteps(this.facadeMap_);

    let promiseArray = [];
    let ilen = points_length;

    for (let m = 0; m < ilen - 1; m += 1) {
      promiseArray.push(this.calculateRoute(control.points[m].join(), control.points[m+1].join()));
    }

    const results = Promise.all(promiseArray).then((routeResult) => {
      if (!M.utils.isNullOrEmpty(routeResult)) {
          //Zoom to layer extent
          this.facadeMap_.setBbox(this.rutaLayer_.getFeaturesExtent());

          let routeCalculatedEvt = new CustomEvent('routeCalculated', {
            detail: routeResult,
            bubbles: true
          });
          this.facadeMap_.getContainer().dispatchEvent(routeCalculatedEvt);
        }
      }).catch((err) => {
        M.dialog.show("No se ha podido calcular la ruta: " + err, "Error", 'error');
      });
  }

  calculateRoute(point1, point2) {
    return new Promise((resolve, reject) => {
      let profile = this.utils.getProfile(document.getElementsByName('routeProfile'));
      let url = this.url_osrm_route + profile + '/';

      const reqRuta = M.utils.addParameters(url + point1 + ';' + point2, {
        alternatives: '2',
        steps: 'true',
        annotations: 'true',
        geometries: 'polyline',
        overview: 'full'
      });

      M.proxy(false);
      M.remote.get(reqRuta).then((response) => {
        if(!M.utils.isUndefined(response.code) && response.code != 200){
          reject(response.code);
        }else{
          let json = JSON.parse(response.text);
          if (json.code === 'Ok'){
            //Diferenciamos las rutas para los estilos si hay más de una
            if(json.routes.length > 1){
              for(var i = 1; i >= 0; i--) {
                if(i != 0){
                  this.utils.createRoute(json.routes[i].geometry, "alternativa");
                }else{
                  this.utils.createRoute(json.routes[i].geometry, "principal");
                }          
              }
            }else{
              this.utils.createRoute(json.routes[0].geometry);
            }
            resolve(json);
          }else{
            reject(json.message);
          }
        }
      });
    });
  }

  getPoints(){
    return this.points;
  }

  deleteRoutePoints(map){
    this.marcadorLayer.clear();
    this.rutaLayer_.clear();
    this.stepLayer_.clear();
    this.points = ['',''];
  }

  deleteRoute(map){
    this.rutaLayer_.clear();
  }

  deleteSteps(map){
    this.stepLayer_.clear();
  }

  deletePoint(id){
    for (let i = 0, ilen = this.marcadorLayer.getFeatures().length; i < ilen; i += 1) {
      let featureId = this.marcadorLayer.getFeatures()[i].getId();
      if(featureId == id){
        this.marcadorLayer.removeFeatures([this.marcadorLayer.getFeatures()[i]]);
        this.points.splice(i, 1);
        break;
      }
    }
  }

  deleteLastPoint(){
    let lastPoint = this.marcadorLayer.getFeatures().length - 1;
    this.marcadorLayer.removeFeatures([this.marcadorLayer.getFeatures()[lastPoint]]);
    this.points.splice(lastPoint, 1);
  }

  replacePoint(idx, coord){
    this.points.splice(idx, 1);
    this.points.splice(idx, 0, coord);
  }

  deletePointsFeatures(map){
    map.getLayers().find(element => {
      if(element.name == 'Puntos de ruta'){
        element.clear();
      }
    });
  }

  changeRouteStyle(valor){
    this.rutaLayer_.getFeatures().forEach((feature) => {
      if(valor){
        if(feature.getAttribute("tipoRuta") == "rutaPpal"){
          feature.setStyle(this.rutaPpalStyle);
        }else if(feature.getAttribute("tipoRuta") == "rutaAlt"){
          feature.setStyle(this.rutaAltStyle);
        }
      }else{
        if(feature.getAttribute("tipoRuta") == "rutaAlt"){
          feature.setStyle(this.rutaPpalStyle);
        }else if(feature.getAttribute("tipoRuta") == "rutaPpal"){
          feature.setStyle(this.rutaAltStyle);
        }
      }
    });
  }

  addStepFeature(evt, polyline) {
    let step = new ol.format.Polyline({
      factor: 1e5
    }).readFeature(polyline, {
      dataProjection: 'EPSG:4326',
      featureProjection: this.facadeMap_.getProjection().code
    });

    var stepInitialCoord = step.getGeometry().getCoordinates()[0];

    var initialFeature = new M.Feature("step" + Math.random(), {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": stepInitialCoord 
      }
    });

    if(evt.type == 'click'){
      this.stepLayer_.clear();
      this.stepLayer_.addFeatures([initialFeature]);
      this.facadeMap_.setBbox(this.stepLayer_.getFeaturesExtent());
    }

    this.facadeMap_.drawFeatures(initialFeature);
  } 
}