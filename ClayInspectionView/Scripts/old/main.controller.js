//(function () {
//  "use strict";

//  angular.module('InspectionView')
//    .controller('MainController', ['appData', 'esriRegistry', 'esriLoader',
//      'esriMapUtils', '$interval', mainController]);

//  function mainController(appData, esriRegistry, esriLoader, esriMapUtils, $interval) {
//    var main = this;

//    main.totalInspections = [];
//    main.inspections = [];
//    main.inspectors = [];
//    main.inspectorData = [];
//    main.invalidLocationsData = [];
//    main.addressData = [];
//    main.inspectionGroupLayers = [];
//    main.viewDay = 'Today';

//    $interval(function () {
//      updateData();
//    }, 30000);

//    updateData();

//    main.updateData = function () {
//      main.inspections = [];
//      main.inspectors = [];
//      main.inspectorData = [];
//      clearInspectionGroupLayers();
//      updateData();
//    }

//    function clearInspectionGroupLayers() {
//      esriRegistry.get('myMap').then(function (map) {
//        esriLoader.require(["esri/layers/GraphicsLayer"],
//          function (Layer) {
//            main.inspectionGroupLayers.map(function (l) {
//              l.clear();
//              map.removeLayer(l);
//            });            
//            main.inspectionGroupLayers = [];
//          });
//      });

//    }

//    function updateData() {
//      main.totalInspections = [];
//      main.inspections = [];
//      main.invalidLocationsData = [];
//      main.addressData = [];      
//      appData.getInspections(main.viewDay)
//        .then(function (response) {
//          if (response.status !== 500) {

//            main.inspections = response.data;

//            main.inspectors = main.inspections.map(function (n) { return n.InspectorName }); // get list of inspectors
//            main.inspectors = main.inspectors.filter(function (v, i) { return main.inspectors.indexOf(v) == i }); // remove the duplicates from the list

//            buildInspectorData();
//            buildAddressData();
//            buildInvalidLocationData();

//            if (main.inspectionGroupLayers.length == 0) {
//              addLayers();
//            } else {
//              updateLayers();
//            }
//          }
//        });

//      appData.getTotalInspections(main.viewDay)      
//        .then(function (response) {
//          if (response.status !== 500) {
//            main.totalInspections = response.data;
//          }
//        });
//    }


//    esriLoader.require(["esri/SpatialReference","esri/geometry/Extent"],
//          function (SpatialReference, Extent) {
//            main.map = {
//              center: {
//                lng: -81.80,
//                lat: 29.950
//              },
//              basemap: 'streets',
//              zoom: 11,
//              loaded: false,
//              mapOptions: {
//                logo: false
//              },
//              extent: new Extent(-82.31395416259558, 29.752280075700344, -81.28604583740163, 30.14732756963145,
//                      new SpatialReference({ wkid: 4326 }))
//            }
//          });





//    function buildInvalidLocationData() {
//      main.invalidLocationsData = main.inspections.filter(function (v) {
//        return v.ll.Latitude == 30.223404 && -81.651925;
//      });
//      for (var i = 0; i < main.invalidLocationsData.length; i++) {
//        main.invalidLocationsData[i].ll.Latitude += (.001 * i);
//      }
//    }
//  }

//})();