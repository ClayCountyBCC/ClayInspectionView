/// <reference path="Typings/arcgis-js-api.d.ts" />
var IView;
(function (IView) {
    var MapController = (function () {
        function MapController(mapDiv) {
            this.mapDiv = mapDiv;
            this.map = {};
            require(["esri/map",
                "esri/layers/ArcGISDynamicMapServiceLayer",
                "esri/dijit/Legend",
                "dojo/_base/array",
                "dojo/parser",
                "dijit/layout/BorderContainer",
                "dojo/domReady!"], function (Map, ArcGISDynamicMapServiceLayer, Legend, arrayUtils, Parser) {
                var mapOptions = {
                    basemap: "osm",
                    zoom: 11,
                    logo: false,
                    center: [-81.80, 29.950]
                };
                this.map = new Map(mapDiv, mapOptions);
                var dynamicLayerOptions = {
                    opacity: .3
                };
                var BuildingLayer = new ArcGISDynamicMapServiceLayer("https://maps.claycountygov.com:6443/arcgis/rest/services/Building/MapServer", dynamicLayerOptions);
                this.map.addLayers([BuildingLayer]);
            });
        }
        return MapController;
    }());
    IView.MapController = MapController;
})(IView || (IView = {}));
//# sourceMappingURL=map.js.map