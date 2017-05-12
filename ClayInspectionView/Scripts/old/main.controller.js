(function () {
  "use strict";

  angular.module('InspectionView')
    .controller('MainController', ['appData', 'esriRegistry', 'esriLoader',
      'esriMapUtils', '$interval', mainController]);

  function mainController(appData, esriRegistry, esriLoader, esriMapUtils, $interval) {
    var main = this;

    main.totalInspections = [];
    main.inspections = [];
    main.inspectors = [];
    main.inspectorData = [];
    main.invalidLocationsData = [];
    main.addressData = [];
    main.inspectionGroupLayers = [];
    main.viewDay = 'Today';

    $interval(function () {
      updateData();
    }, 30000);

    updateData();

    main.updateData = function () {
      main.inspections = [];
      main.inspectors = [];
      main.inspectorData = [];
      clearInspectionGroupLayers();
      updateData();
    }

    function clearInspectionGroupLayers() {
      esriRegistry.get('myMap').then(function (map) {
        esriLoader.require(["esri/layers/GraphicsLayer"],
          function (Layer) {
            main.inspectionGroupLayers.map(function (l) {
              l.clear();
              map.removeLayer(l);
            });            
            main.inspectionGroupLayers = [];
          });
      });

    }

    function updateData() {
      main.totalInspections = [];
      main.inspections = [];
      main.invalidLocationsData = [];
      main.addressData = [];      
      appData.getInspections(main.viewDay)
        .then(function (response) {
          if (response.status !== 500) {

            main.inspections = response.data;

            main.inspectors = main.inspections.map(function (n) { return n.InspectorName });
            main.inspectors = main.inspectors.filter(function (v, i) { return main.inspectors.indexOf(v) == i });

            buildInspectorData();
            buildAddressData();
            buildInvalidLocationData();

            if (main.inspectionGroupLayers.length == 0) {
              addLayers();
            } else {
              updateLayers();
            }
          }
        });

      appData.getTotalInspections(main.viewDay)      
        .then(function (response) {
          if (response.status !== 500) {
            main.totalInspections = response.data;
          }
        });
    }


    esriLoader.require(["esri/SpatialReference","esri/geometry/Extent"],
          function (SpatialReference, Extent) {
            main.map = {
              center: {
                lng: -81.80,
                lat: 29.950
              },
              basemap: 'streets',
              zoom: 11,
              loaded: false,
              mapOptions: {
                logo: false
              },
              extent: new Extent(-82.31395416259558, 29.752280075700344, -81.28604583740163, 30.14732756963145,
                      new SpatialReference({ wkid: 4326 }))
            }
          });

    function buildAddressData() {
      var ak = main.inspections.map(function (n) { return n.AddressKey });
      ak = ak.filter(function (v, i) { return ak.indexOf(v) == i });
      main.addressData = ak.map(function (n) {
        var x = {};
        x.AddressKey = n;
        x.inspections = main.inspections.filter(function (v) {
          return v.AddressKey == n;
        });
        return x;
      });     
    }

    function buildInspectorData() {

      var iData = main.inspectors.map(function (i) {
        var x = {};
        x.name = i;
        x.inspections = main.inspections.filter(function (v) {
          return v.InspectorName == i;
        });
        if (x.inspections.length > 0) {
          x.color = x.inspections[0].Color;
        } else {
          x.color = '#FFFFFF';
        }
        return x;
      });
      main.inspectorData = iData;
      //console.log('inspector data', iData);
    }

    function buildInvalidLocationData() {
      main.invalidLocationsData = main.inspections.filter(function (v) {
        return v.ll.Latitude == 30.223404 && -81.651925;
      });
      for (var i = 0; i < main.invalidLocationsData.length; i++) {
        main.invalidLocationsData[i].ll.Latitude += (.001 * i);
      }
    }
    
    function addLayers() {
      esriRegistry.get('myMap').then(function (map) {
        esriLoader.require(["esri/layers/GraphicsLayer", "esri/geometry/Point",
          "esri/symbols/SimpleMarkerSymbol", "esri/graphic", "esri/SpatialReference",
          "esri/Color", "esri/InfoTemplate", "esri/geometry/webMercatorUtils"],
          function (GraphicsLayer, Point, SimpleMarkerSymbol, Graphic,
            SpatialReference, Color, InfoTemplate, webMercatorUtils) {
            
            var layers = main.inspectorData.map(function (i) {
              var l = new esri.layers.GraphicsLayer();
              l.id = i.name;
              l.color = i.color;
              l.numberInspections = i.inspections.length;
              var c = Color.fromHex(i.color);

              // ak is now a list of unique address keys for this user.
              var ak = i.inspections.map(function (n) { return n.AddressKey });
              ak = ak.filter(function (v, i) { return ak.indexOf(v) == i });              

              ak.map(function (n) {

                var inspections = i.inspections.filter(function (v) {
                  return v.AddressKey == n;
                });
                var ll = inspections[0].ll;
                var compactAddress = inspections[0].StreetAddressCombined + '<br/> ' +
                  inspections[0].City + ', ' + inspections[0].Zip;

                if (ll !== null && ll.Latitude !== 0 && ll.Longitude !== 0) {

                  var lat = ll.Latitude;
                  var lon = ll.Longitude;

                  var iT = new InfoTemplate();
                  iT.setTitle('Address: ${CompactAddress}');
                  iT.setContent(main.mapAddressClick);

                  var s = new SimpleMarkerSymbol({
                    "color": c,
                    "size": 11 + inspections.length * 3,
                    "angle": 0,
                    "xoffset": 0,
                    "yoffset": 0,
                    "type": "esriSMS",
                    "style": "esriSMSCircle",
                    "outline": { "color": [0, 0, 0, 255], "width": 1, "type": "esriSLS", "style": "esriSLSSolid" }
                  });
                  
                  var inspection = new Point([lon, lat], new SpatialReference({ wkid: 4326 }));
                  var wmInspection = esri.geometry.geographicToWebMercator(inspection);
                  var g = new Graphic(wmInspection, s);
                  g.setAttributes({ "CompactAddress": compactAddress, "AddressKey": n });
                  g.setInfoTemplate(iT);
                  l.add(g);

                }
                
              });
              l.visible = true;
              return l;
            });

            main.inspectionGroupLayers = layers;

            map.addLayers(main.inspectionGroupLayers);

          });
      });
    }

    //function updateMapExtent() {
    //  esriRegistry.get('myMap').then(function (map) {
    //    esriLoader.require(["esri/SpatialReference","esri/geometry/Extent"],
    //      function (SpatialReference, Extent) {
    //        var defaultExtent = new esri.geometry.Extent(-82.31395416259558, 29.752280075700344, -81.28604583740163, 30.14732756963145,
    //          new esri.SpatialReference({ wkid: 4326 }));
    //        map.extent = defaultExtent;
    //      });
    //  });
    //}

    function updateLayers() {
      esriRegistry.get('myMap').then(function (map) {
        esriLoader.require(["esri/layers/GraphicsLayer", "esri/geometry/Point",
          "esri/symbols/SimpleMarkerSymbol", "esri/graphic", "esri/SpatialReference",
          "esri/Color", "esri/InfoTemplate", "esri/geometry/webMercatorUtils"],
          function (GraphicsLayer, Point, SimpleMarkerSymbol, Graphic,
            SpatialReference, Color, InfoTemplate, webMercatorUtils) {

            main.inspectionGroupLayers.map(function (l) {
              l.clear();
              var c = Color.fromHex(l.color);
              var i = main.inspectorData.filter(function(v) {
                return v.name == l.id;
              });
              i = i[0];
              l.numberInspections = i.inspections.length;
                  // ak is now a list of unique address keys for this user.
              var ak = i.inspections.map(function (n) { return n.AddressKey });
              ak = ak.filter(function (v, i) { return ak.indexOf(v) == i });

              ak.map(function (n) {

                var inspections = i.inspections.filter(function (v) {
                  return v.AddressKey == n;
                });
                var ll = inspections[0].ll;
                var compactAddress = inspections[0].StreetAddressCombined + '<br/> ' +
                  inspections[0].City + ', ' + inspections[0].Zip;

                if (ll !== null && ll.Latitude !== 0 && ll.Longitude !== 0) {

                  var lat = ll.Latitude;
                  var lon = ll.Longitude;

                  var iT = new InfoTemplate();
                  iT.setTitle('Address: ${CompactAddress}');
                  iT.setContent(main.mapAddressClick);

                  var s = new SimpleMarkerSymbol({
                    "color": c,
                    "size": 11 + inspections.length * 3,
                    "angle": 0,
                    "xoffset": 0,
                    "yoffset": 0,
                    "type": "esriSMS",
                    "style": "esriSMSCircle",
                    "outline": { "color": [0, 0, 0, 255], "width": 1, "type": "esriSLS", "style": "esriSLSSolid" }
                  });

                  var inspection = new Point([lon, lat], new SpatialReference({ wkid: 4326 }));
                  var wmInspection = esri.geometry.geographicToWebMercator(inspection);
                  var g = new Graphic(wmInspection, s);
                  g.setAttributes({ "CompactAddress": compactAddress, "AddressKey": n });
                  g.setInfoTemplate(iT);
                  l.add(g);

                }

              });
            });
          });
      });
    }

    main.toggleVisibility = function (n) {
      if (n.visible == undefined || n.visible == true) {
        n.hide();
      } else {
        n.show();
      }      
    }

    main.layerVisibility = function (n) {
      if (n === undefined) { return false;}
      var l = main.inspectionGroupLayers.filter(function (v) {
        return v.id == n;
      });
      if (l.length === 0) { return false;}
      return l[0].visible;
    }


    function buildAddressDisplay(i) {
      var x = [];
      x.push("<ol>");
      i.map(function (n) {
        x.push("<li><a href='http://claybccims/WATSWeb/Permit/Inspection/Inspection.aspx?PermitNo=");
        x.push(n.PermitNo);
        x.push("'>");
        x.push(n.PermitNo);
        x.push(" - ");
        x.push(n.InspectionDescription);
        x.push("</a></li>");
      });
      x.push("</ol>");
      return x.join('');
    }

    main.mapAddressClick = function (graphic) {
      var i = main.addressData.filter(function (n) {
        return n.AddressKey == graphic.attributes.AddressKey;
      });
      return buildAddressDisplay(i[0].inspections);
    }

    main.mapLoaded = function (map) {
      main.realMap = map;
      main.map.loaded = true;
      //updateMapExtent();
    }




  }

})();