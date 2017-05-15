/// <reference path="Typings/arcgis-js-api.d.ts" />

declare var require: any;

namespace IView
{
  export class MapController
  {
    map: any = {};

    constructor(public mapDiv: string)
    {
      require(["esri/map",
        "esri/layers/ArcGISDynamicMapServiceLayer",
        "esri/dijit/Legend",
        "dojo/_base/array",
        "dojo/parser",
        "dijit/layout/BorderContainer",
        "dojo/domReady!"],
        function (
          Map,
          ArcGISDynamicMapServiceLayer,
          Legend,
          arrayUtils,
          Parser
        )
        {

          var mapOptions = {
            basemap: "osm",
            zoom: 11,
            logo: false,
            center: [-81.80, 29.950]
          }
          this.map = new Map(mapDiv, mapOptions);
          let dynamicLayerOptions = {
            opacity: .3
          };
          let BuildingLayer = new ArcGISDynamicMapServiceLayer("https://maps.claycountygov.com:6443/arcgis/rest/services/Building/MapServer", dynamicLayerOptions);
          this.map.addLayers([BuildingLayer]);

        });
    }

  }
}