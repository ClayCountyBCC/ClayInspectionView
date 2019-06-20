/// <reference path="Typings/arcgis-js-api.d.ts" />

declare var require: any;
declare var esri: any;

namespace IView
{
  export class MapController
  {
    map: any;
    drawToolbar: any;
    isDrawing: boolean = false;
    defaultExtent: any;
    //shortExtent: any;
    //homeButton: any;

    constructor(public mapDiv: string)
    {
      var mapController = this;
      require([
        "esri/map",
        "esri/layers/ArcGISDynamicMapServiceLayer",
        "esri/layers/GraphicsLayer",
        "esri/dijit/HomeButton",
        //"esri/dijit/Legend",
        "dojo/_base/array",
        "dojo/parser",
        "esri/Color",
        "dijit/layout/BorderContainer",
        "esri/toolbars/draw",
        "dojo/domReady!"],
        function (
          Map,
          ArcGISDynamicMapServiceLayer,
          GraphicsLayer,
          HomeButton,
          //Legend,
          arrayUtils,
          Parser,
          Color,
          BorderContainer,
          Draw
        )
        {
          
          mapController.defaultExtent = new esri.geometry.Extent(-82.17868, 29.69460, -81.45182,  30.21792,
            new esri.SpatialReference({ wkid: 4326 })); 

          var mapOptions = {
            basemap: "osm",
            zoom: 11,
            logo: false,
            extent: mapController.defaultExtent
          }
          mapController.map = new Map(mapDiv, mapOptions);
          mapController.map.on("load", function (evt)
          {
            mapController.drawToolbar = new Draw(evt.map, { showTooltips: false });
            mapController.drawToolbar.on("DrawEnd", IView.FindItemsInExtent);
            console.log('map loaded');
            IView.mapLoadCompleted();
          });

          let homeButton = new HomeButton({
            map: mapController.map,
            extent: mapController.defaultExtent
          }, "HomeButton");
          homeButton.startup();


          //let BuildingLayer = new ArcGISDynamicMapServiceLayer("https://maps.claycountygov.com:6443/arcgis/rest/services/Building/MapServer", dynamicLayerOptions);
          IView.location_layer = new GraphicsLayer();
          IView.location_layer.id = "locations";
          IView.location_layer.on("click", function (event: any)
          {
            if (event === undefined) return;
            if (!event.graphic || !event.graphic.attributes) return;
            //console.log('graphics layer clicked - event', event); 
            IView.last_symbol_color = event.graphic.symbol.color;
            IView.last_selected_graphic = event.graphic;
            event.graphic.symbol.color = new Color([255, 0, 0, 1]);
            IView.location_layer.redraw();
            MapController.GetLocation(event.graphic.attributes.LookupKey);
          });
          IView.location_layer.show();


          IView.unit_layer = new GraphicsLayer();
          IView.unit_layer.id = "units";
          if (IView.order_layer === undefined)
          {
            IView.order_layer = new GraphicsLayer();
            IView.order_layer.id = "myLocations";
            IView.order_layer.hide();
          }
          IView.order_layer.on("click", function (event: any)
          {
            if (event === undefined) return;
            if (!event.graphic || !event.graphic.attributes) return;
            //console.log('graphics layer clicked - event', event); 
            IView.last_symbol_color = null;
            IView.last_selected_graphic = null;                        
            MapController.GetLocation(event.graphic.attributes.LookupKey);
          });
                    
          mapController.map.addLayers([IView.location_layer, IView.unit_layer, IView.order_layer]);

        });
    }

    public static GetLocation(lookup_key: string): void
    {
      let location = IView.filteredLocations.filter(function (j) { return j.lookup_key === lookup_key });
      if (location.length === 0) return;
      IView.current_location = location[0];
      console.log('location found', location[0]);
      IView.mapController.CenterOnPoint(location[0].point_to_use);

      location[0].LocationView();

    }

    public ToggleDraw(toggle: boolean = null): void
    {
      let mapController = this;
      require(["esri/toolbars/draw"],
        function (Draw)
        {
          if (toggle !== null)
          {
            mapController.isDrawing = toggle;
          }
          else
          {
            mapController.isDrawing = !mapController.isDrawing;
          }
          
          if (mapController.isDrawing)
          {
            mapController.drawToolbar.activate(Draw.EXTENT);
          }
          else
          {
            mapController.drawToolbar.deactivate();
          }          
        });
    }

    public ToggleMyLocations(show: boolean)
    {
      let m = this.map;
      let d = this.defaultExtent;

      if (show)
      {
        Utilities.Hide(document.getElementById("Legend"));
        IView.order_layer.show();
        IView.location_layer.hide();

        //if (IView.myLocations.length === 0) return;

        //let points = [];
        //for(let location of IView.myLocations)
        //{
        //  let point = [];
        //  point.push(location.point_to_use.Longitude);
        //  point.push(location.point_to_use.Latitude);
        //  points.push(point);
        //}
        //var polylineJson = {
        //  "paths": [points], "spatialReference": { "wkid": 4326 }
        //};
        

        //require(["esri/geometry/Extent", "esri/SpatialReference", "esri/geometry/Polyline"],
        //  function (Extent, SpatialReference, Polyline)
        //  {
        //    var polyline = new Polyline(polylineJson);            
        //    let expanded = polyline.getExtent().expand(2);
        //    m.setExtent(expanded, true);
        //  });

      }
      else
      {
        Utilities.Show(document.getElementById("Legend"));
        IView.order_layer.hide();
        IView.location_layer.show();
        //m.setExtent(d);
      }


    }

    public UpdateUnitLayer(units: Array<Unit>): void
    {
      require([
        "esri/layers/GraphicsLayer",
        "esri/geometry/Point",
        "esri/symbols/SimpleMarkerSymbol",
        "esri/symbols/PictureMarkerSymbol",
        "esri/graphic",
        "esri/SpatialReference",
        "esri/Color",
        "esri/InfoTemplate",
        "esri/geometry/webMercatorUtils",
        "esri/symbols/TextSymbol"],
        function (
          GraphicsLayer,
          arcgisPoint,
          SimpleMarkerSymbol,
          PictureMarkerSymbol,
          Graphic,
          SpatialReference,
          Color,
          InfoTemplate,
          webMercatorUtils,
          TextSymbol)
        {
          IView.unit_layer.clear();
          for (let u of units)
          {
            var pin = new arcgisPoint([u.Longitude, u.Latitude], new SpatialReference({ wkid: 4326 }));
            var wmPin = webMercatorUtils.geographicToWebMercator(pin);
            var iT = new InfoTemplate();
            iT.setTitle('Vehicle: ' + u.Name);
            iT.setContent(function (graphic: any)
            {
              let value = Unit.UnitView(u);
              console.log('html info template', value);
              return value;
            });
            var icon = new PictureMarkerSymbol({
              "angle": 0,
              "xoffset": 0,
              "yoffset": 0,
              "type": "esriPMS",
              "url": u.Unit_Icon_URL,
              "contentType": "image/png",
              "width": 30,
              "height": 30
            });
            var g = new Graphic(wmPin, icon);
            g.setInfoTemplate(iT);
            IView.unit_layer.add(g);
            var textSymbol = new TextSymbol(u.Assigned_Inspector.length > 0 ? u.Assigned_Inspector : u.Name); //esri.symbol.TextSymbol(data.Records[i].UnitName);
            textSymbol.setColor(new dojo.Color([0, 100, 0]));
            textSymbol.setOffset(0, -20);
            textSymbol.setAlign(TextSymbol.ALIGN_MIDDLE);
            var font = new esri.symbol.Font();
            font.setSize("10pt");
            font.setWeight(esri.symbol.Font.WEIGHT_BOLD);
            textSymbol.setFont(font);
            var graphicText = new Graphic(wmPin, textSymbol);
            IView.unit_layer.add(graphicText);

            //g.setInfoTemplate(iT);
          }
          IView.unit_layer.show();

        });
    }

    public UpdateLocationLayer(locations: Array<Location>): void
    {
      //if (locations.length === 0) return;
      require([
        "esri/layers/GraphicsLayer",
        "esri/geometry/Point",
        "esri/symbols/SimpleMarkerSymbol",
        "esri/graphic",
        "esri/SpatialReference",
        "esri/Color",
        "esri/InfoTemplate",
        "esri/geometry/webMercatorUtils",
        "esri/symbols/TextSymbol"],
        function (
          GraphicsLayer,
          arcgisPoint,
          SimpleMarkerSymbol,
          Graphic,
          SpatialReference,
          Color,
          InfoTemplate,
          webMercatorUtils,
          TextSymbol)
        {
          IView.location_layer.clear();
          for (let l of locations)
          {
            let p = l.point_to_use;
            var pin = new arcgisPoint([p.Longitude, p.Latitude], new SpatialReference({ wkid: 4326 }));
            var wmPin = webMercatorUtils.geographicToWebMercator(pin);
            //var iT = new InfoTemplate();
            //iT.setTitle('Inspections: ' + l.inspections.length.toString());
            //iT.setContent(function (graphic:any)
            //{
            //  let value = l.LocationView().outerHTML;
            //  console.log('html info template', value);
            //  return value;
            //});
            //var g = new Graphic(wmPin, l.icons[0]);
            //g.setInfoTemplate(iT);
            //IView.location_layer.add(g);
            //if (l.icons.length > 1)
            //{
            for (var i = 0; i < l.icons.length; i++)
            {
              var g = new Graphic(wmPin, l.icons[i]);
              g.setAttributes({                
                "LookupKey": l.lookup_key
              });
              //g.setInfoTemplate(iT);
              //g.addEventListener("click", function (e)
              //{
              //  IView.mapController.CenterAndZoom(p);
              //});
              IView.location_layer.add(g);
            }
            //}
            if (l.inspections.length > 1)
            {
              var textSymbol = new TextSymbol(l.inspections.length.toString()); //esri.symbol.TextSymbol(data.Records[i].UnitName);
              textSymbol.setColor(new dojo.Color([0, 100, 0]));
              textSymbol.setOffset(0, -20);
              textSymbol.setAlign(TextSymbol.ALIGN_MIDDLE);
              var font = new esri.symbol.Font();
              font.setSize("10pt");
              font.setWeight(esri.symbol.Font.WEIGHT_BOLD);
              textSymbol.setFont(font);
              var graphicText = new Graphic(wmPin, textSymbol);
              IView.location_layer.add(graphicText);
            }

            //g.setInfoTemplate(iT);
          } 
          //IView.location_layer.show();

        });
    }

    public UpdateMyLocationLayer(locations: Array<Location>): void
    {
      //if (locations.length === 0) return;
      require([
        "esri/layers/GraphicsLayer",
        "esri/geometry/Point",
        "esri/symbols/SimpleMarkerSymbol",
        "esri/symbols/SimpleLineSymbol",
        "esri/graphic",
        "esri/SpatialReference",
        "esri/Color",
        "esri/geometry/webMercatorUtils",
        "esri/geometry/Polyline"],
        function (
          GraphicsLayer,
          arcgisPoint,
          SimpleMarkerSymbol,
          SimpleLineSymbol,
          Graphic,
          SpatialReference,
          Color,
          webMercatorUtils,
          Polyline)
        {

          locations.sort(function (j, k) { return k.order - j.order; });

          if (IView.order_layer === undefined)
          {
            IView.order_layer = new GraphicsLayer();
            IView.order_layer.id = "myLocations";
            IView.order_layer.hide();
          }
          let this_layer = IView.order_layer;
          this_layer.clear();

          // let's create a line between each point
          let points = [];
          for (let i = 0; i < locations.length; i++)
          {
            let point = [];
            point.push(locations[i].point_to_use.Longitude);
            point.push(locations[i].point_to_use.Latitude);
            points.push(point);
          }
          var polylineJson = {
            "paths": [points], "spatialReference": { "wkid": 4326 }
          };
          var polyline = new Polyline(polylineJson);
          var polylineSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new dojo.Color([0, 0, 0], 255), 3);
          var myLineGraphic = new Graphic(polyline, polylineSymbol, null, null);
          this_layer.add(myLineGraphic);

          // now let's add locations to the layer.
          for (let l of locations)
          {
            let p = l.point_to_use;
            var pin = new arcgisPoint([p.Longitude, p.Latitude], new SpatialReference({ wkid: 4326 }));
            var wmPin = webMercatorUtils.geographicToWebMercator(pin);

            let s = new SimpleMarkerSymbol({
              "color": Color.fromHex(!l.unordered ? "#FFFFFF" : "#FFDD57"),
              "size": 26,
              "angle": 0,
              "xoffset": 0,
              "yoffset": 6.5,
              "type": "esriSMS",
              "style": "esriSMSCircle",
              "outline": { "color": [0, 0, 0, 255], "width": 1, "type": "esriSLS", "style": "esriSLSSolid" }
            });
            var g = new Graphic(wmPin, s);
            g.setAttributes({
              "LookupKey": l.lookup_key
            });
            this_layer.add(g);
            l.GetSortedIcon().then(function (icon)
            {
              g = new Graphic(wmPin, icon); //l.icons[0]);
              g.setAttributes({
                "LookupKey": l.lookup_key
              });
              this_layer.add(g);
            });
          }
        });
    }

    public FindItemsInExtent(extent: any):Array<string>
    {
      let mapController = this;
      let m = this.map;
      let lookupKeys: Array<string> = [];
      require([
        "esri/symbols/SimpleMarkerSymbol",
        "esri/symbols/SimpleLineSymbol",
        "esri/Color"],
        function (
          SimpleMarkerSymbol,
          SimpleLineSymbol,
          Color)
        {
          //m.graphicsLayerIds.forEach(function (layerId)
          //{
            //let l = m.getLayer(layerId);
            //if (l.visible)
            //{
          for (let g of IView.location_layer.graphics)
          {
            if (extent.contains(g.geometry) && g.attributes && g.attributes.LookupKey)
            {
              let fluxSymbol = new SimpleMarkerSymbol();
              fluxSymbol.color = g.symbol.color;
              fluxSymbol.size = g.symbol.size;
              fluxSymbol.style = SimpleMarkerSymbol.STYLE_CROSS;
              fluxSymbol.outline = g.symbol.outline;
              g.setSymbol(fluxSymbol);
              if (lookupKeys.indexOf(g.attributes.LookupKey) === -1) lookupKeys.push(g.attributes.LookupKey);

            }
          }
            //}
          //});
        });
      mapController.isDrawing = false;
      mapController.drawToolbar.deactivate();
      return lookupKeys;
    }

    public CenterAndZoom(p: any): void
    {
      let m = this.map;
      require(["esri/geometry/Point"],
        function (Point)
        {
          var pt = new Point([p.Longitude, p.Latitude]);
          m.centerAndZoom(pt, 18);
        });
    }

    public CenterOnPoint(p: any): void
    {
      let m = this.map;
      require(["esri/geometry/Point"],
        function (Point)
        {
          var pt = new Point([p.Longitude, p.Latitude]);
          m.centerAt(pt);
        });
    }

    public GetCurrentZoom(): number
    {
      let m = document.getElementById("map");
      let zoom = m.getAttribute("data-zoom");
      return parseInt(zoom);
    }

  }
}