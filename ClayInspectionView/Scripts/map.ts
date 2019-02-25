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

    constructor(public mapDiv: string)
    {
      var mapController = this;
      require([
        "esri/map",
        "esri/layers/ArcGISDynamicMapServiceLayer",
        "esri/layers/GraphicsLayer",
        "esri/dijit/Legend",
        "dojo/_base/array",
        "dojo/parser",
        "dijit/layout/BorderContainer",
        "esri/toolbars/draw",
        "dojo/domReady!"],
        function (
          Map,
          ArcGISDynamicMapServiceLayer,
          GraphicsLayer,
          Legend,
          arrayUtils,
          Parser,
          BorderContainer,
          Draw
        )
        {
          var mapOptions = {
            basemap: "osm",
            zoom: 11,
            logo: false,
            center: [-81.80, 29.950]
            //showInfoWindowOnClick: false
          }
          mapController.map = new Map(mapDiv, mapOptions);
          mapController.map.infoWindow.resize(600, 100);
          //map.infoWindow.resize(300, 200); // changes the size of the info window used in the InfoTemplate
          // default size is 250wide by 100 high
          mapController.map.on("load", function (evt)
          {
          //  mapController.drawToolbar = new Draw(evt.map, { showTooltips: false });
          //  mapController.drawToolbar.on("DrawEnd", IView.FindItemsInExtent);

            IView.mapLoadCompleted();
          });
          let dynamicLayerOptions = {
            opacity: .3
          };
          let BuildingLayer = new ArcGISDynamicMapServiceLayer("https://maps.claycountygov.com:6443/arcgis/rest/services/Building/MapServer", dynamicLayerOptions);
          IView.location_layer = new GraphicsLayer();
          IView.location_layer.id = "locations";
          IView.unit_layer = new GraphicsLayer();
          IView.unit_layer.id = "units";
          mapController.map.addLayers([BuildingLayer, IView.location_layer, IView.unit_layer]);

        });
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
            var iT = new InfoTemplate();
            iT.setTitle('Inspections: ' + l.inspections.length.toString());
            iT.setContent(function (graphic:any)
            {
              let value = l.LocationView().outerHTML;
              console.log('html info template', value);
              return value;
              // Show the address
              // 
              // we need a bulk assign area
              // with some kind of verbage that indicates that it will only bulk assign
              // those that are incomplete

              // build a table showing the following:
              // Permit #
              // Inspection # / Description
              // Status
              // Assigned
              //  If the inspection is complete, just show the name
              //  If incomplete, show a dropdown allowing it to be reassigned.
              //return "<div></div>";
  //export function mapAddressClick(graphic):string
  //{
  //  let inspections:Array<Inspection> = allInspections.filter(function (k: Inspection)
  //  {
  //    return k.LookupKey === graphic.attributes.LookupKey;
  //  });
  //  let today = inspections.filter(function (k) { return k.ScheduledDay === "Today" });
  //  let tomorrow = inspections.filter(function (k) { return k.ScheduledDay !== "Today" });
  //  var x = [];
  //  x.push("<ol>");
  //  let InspectorName: string = currentDay === "Today" ? today[0].InspectorName : tomorrow[0].InspectorName;
  //  let isCompletedCheck: boolean = currentDay === "Today" ? today[0].IsCompleted : tomorrow[0].IsCompleted;
  //  console.log('Inspector Name', InspectorName, 'completedcheck', isCompletedCheck, inspections[0].CanBeAssigned);
  //  if (!isCompletedCheck && inspections[0].CanBeAssigned)
  //  {
  //    x.push(buildInspectorAssign(InspectorName, graphic.attributes.LookupKey));
  //  }
  //  else
  //  {
  //    if (isCompletedCheck)
  //    {
  //      x.push("<li>This inspection is already completed.</li>");
  //    }
  //  }
  //  x.push(buildAddressDisplayByDay(today, "Today"));
  //  x.push(buildAddressDisplayByDay(tomorrow, "Tomorrow"));
  //  x.push("</ol>");
  //  return x.join('');
  //}
            });
            if (l.icons.length > 1)
            {
              for (var i = 0; i < l.icons.length; i++)
              {
                var g = new Graphic(wmPin, l.icons[i]);
                g.setInfoTemplate(iT);
                IView.location_layer.add(g);
              }
              // need to add circle around grouped inspections

            }
            else
            {
              var g = new Graphic(wmPin, l.icons[0]);
              g.setInfoTemplate(iT);
              IView.location_layer.add(g);
            }
            if (l.inspections.length > 1)
            {
              var textSymbol = new TextSymbol(l.inspections.length.toString()); //esri.symbol.TextSymbol(data.Records[i].UnitName);
              textSymbol.setColor(new dojo.Color([0, 100, 0]));
              textSymbol.setOffset(0, -20);
              textSymbol.setAlign(TextSymbol.ALIGN_MIDDLE);
              var font = new esri.symbol.Font();
              font.setSize("8pt");
              font.setWeight(esri.symbol.Font.WEIGHT_BOLD);
              textSymbol.setFont(font);
              var graphicText = new Graphic(wmPin, textSymbol);
              IView.location_layer.add(graphicText);
            }

            //g.setInfoTemplate(iT);
          } 
          IView.location_layer.show();

        });
    }

    public CreateLayers(inspectorData: Array<Inspector>, day: string, completed: boolean): Array<any>
    {
      if (inspectorData.length === 0) return [];
      var layers: Array<any>;
      require([
        "esri/layers/GraphicsLayer",
        "esri/geometry/Point",
        "esri/symbols/SimpleMarkerSymbol",
        "esri/graphic",
        "esri/SpatialReference",
        "esri/Color",
        "esri/InfoTemplate",
        "esri/geometry/webMercatorUtils"],
        function (
          GraphicsLayer,
          arcgisPoint,
          SimpleMarkerSymbol,
          Graphic,
          SpatialReference,
          Color,
          InfoTemplate,
          webMercatorUtils)
        {
          layers = inspectorData.map(
            function (i: Inspector)
            {
              var l = new GraphicsLayer();
              l.id = i.Name + '-' + day + '-' + completed;
              l.inspector = i.Id;
              l.completed = completed;
              l.day = day;
              l.color = i.Color;
              l.numberInspections = i.Inspections.length;
              var c = Color.fromHex(i.Color);
              // ak is now a list of unique lookup keys for this user.
              var ak = i.Inspections.map(function (n) { return n.LookupKey });
              ak = ak.filter(function (v, i) { return ak.indexOf(v) == i });

              ak.forEach(function (n: string) //loop through each unique lookupkey
              {

                var inspections: Array<Inspection> = i.Inspections.filter(function (v)
                {
                  return v.LookupKey == n;
                });

                // Need to get total number o                

                let p: Point = inspections[0].PointToUse;
                var compactAddress = inspections[0].StreetAddressCombined + '<br/> ' +
                  inspections[0].City + ', ' + inspections[0].Zip;

                if (!p.IsValid)
                {
                  console.log('Invalid data', n, i);
                }
                if (p.IsValid)
                {
                  var iT = new InfoTemplate();
                  iT.setTitle('Address: ${CompactAddress}');
                  //iT.setContent(IView.mapAddressClick);
                  
                  var s = new SimpleMarkerSymbol({
                    "color": c,
                    "size": 12, // + inspections.length * 3
                    "angle": 0,
                    "xoffset": 0,
                    "yoffset": -5,
                    "type": "esriSMS",
                    "style": "esriSMSCircle",
                    "outline": { "color": [0, 0, 0, 255], "width": 1, "type": "esriSLS", "style": "esriSLSSolid" }
                  });

                  var inspection = new arcgisPoint([p.Longitude, p.Latitude], new SpatialReference({ wkid: 4326 }));
                  var wmInspection = webMercatorUtils.geographicToWebMercator(inspection); 
                  var g = new Graphic(wmInspection, s);
                  g.setAttributes({                    
                    "CompactAddress": compactAddress,
                    "LookupKey": n
                  });
                  g.setInfoTemplate(iT);

                  l.add(g);
                }

              });

              //l.visible = isVisible;
              return l;
            });
          
        });
      return layers;
    }

    public ApplyLayers(layers: Array<any>)
    {
      var mapController = this;
      this.map.addLayers(layers);      
    }

    public ToggleLayers(inspectorId: number, day: string, isComplete:boolean, visible: boolean)
    {
      let m = this.map;
      this.map.graphicsLayerIds.forEach(function (layerId)
      {
        let l = m.getLayer(layerId);
        if (l.inspector === inspectorId && l.day === day && l.completed === isComplete)
        {
          if (visible)
          {
            l.show();
          }
          else
          {
            l.hide();
          }
        }
      });
    }

    public ToggleLayersByDay(day: string, isComplete:boolean):void
    {
      let m = this.map;
      m.graphicsLayerIds.forEach(function (layerId)
      {
        let l = m.getLayer(layerId);
        if (l.day === day && l.completed === isComplete)
        {
          l.show();
        }
        else
        {
          l.hide();
        }
      });
    }

    public ClearLayers()
    {
      let m = this.map;
      if (!m.graphicsLayerIds) return;
      
      while (m.graphicsLayerIds.length > 0)
      {
        for (let glid of m.graphicsLayerIds)
        {
          m.removeLayer(m.getLayer(glid));
        }
      }
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
          m.graphicsLayerIds.forEach(function (layerId)
          {
            let l = m.getLayer(layerId);
            if (l.visible)
            {
              for (let g of l.graphics)
              {
                if (extent.contains(g.geometry))
                {
                  let fluxSymbol = new SimpleMarkerSymbol();
                  fluxSymbol.color = g.symbol.color;
                  fluxSymbol.size = g.symbol.size;
                  fluxSymbol.style = SimpleMarkerSymbol.STYLE_SQUARE;
                  fluxSymbol.outline = g.symbol.outline;
                  g.setSymbol(fluxSymbol);
                  lookupKeys.push(g.attributes.LookupKey);                  
                }
              }
            }
          });
        });
      mapController.isDrawing = false;
      mapController.drawToolbar.deactivate();
      return lookupKeys;
    }

    public CenterAndZoom(p: any): void
    {
      let mapController = this;
      let m = this.map;
      require(["esri/geometry/Point"],
        function (Point)
        {
          var pt = new Point([p.Longitude, p.Latitude]);
          m.centerAndZoom(pt, 18);
        });
    }

  }
}