/// <reference path="Typings/arcgis-js-api.d.ts" />
var IView;
(function (IView) {
    var MapController = /** @class */ (function () {
        function MapController(mapDiv) {
            this.mapDiv = mapDiv;
            this.isDrawing = false;
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
                "dojo/domReady!"
            ], function (Map, ArcGISDynamicMapServiceLayer, GraphicsLayer, Legend, arrayUtils, Parser, BorderContainer, Draw) {
                var mapOptions = {
                    basemap: "osm",
                    zoom: 11,
                    logo: false,
                    center: [-81.80, 29.950]
                    //showInfoWindowOnClick: false
                };
                mapController.map = new Map(mapDiv, mapOptions);
                mapController.map.infoWindow.resize(600, 100);
                //map.infoWindow.resize(300, 200); // changes the size of the info window used in the InfoTemplate
                // default size is 250wide by 100 high
                mapController.map.on("load", function (evt) {
                    //  mapController.drawToolbar = new Draw(evt.map, { showTooltips: false });
                    //  mapController.drawToolbar.on("DrawEnd", IView.FindItemsInExtent);
                    IView.mapLoadCompleted();
                });
                var dynamicLayerOptions = {
                    opacity: .3
                };
                var BuildingLayer = new ArcGISDynamicMapServiceLayer("https://maps.claycountygov.com:6443/arcgis/rest/services/Building/MapServer", dynamicLayerOptions);
                IView.location_layer = new GraphicsLayer();
                IView.location_layer.id = "locations";
                IView.unit_layer = new GraphicsLayer();
                IView.unit_layer.id = "units";
                mapController.map.addLayers([BuildingLayer, IView.location_layer, IView.unit_layer]);
            });
        }
        MapController.prototype.ToggleDraw = function (toggle) {
            if (toggle === void 0) { toggle = null; }
            var mapController = this;
            require(["esri/toolbars/draw"], function (Draw) {
                if (toggle !== null) {
                    mapController.isDrawing = toggle;
                }
                else {
                    mapController.isDrawing = !mapController.isDrawing;
                }
                if (mapController.isDrawing) {
                    mapController.drawToolbar.activate(Draw.EXTENT);
                }
                else {
                    mapController.drawToolbar.deactivate();
                }
            });
        };
        MapController.prototype.UpdateUnitLayer = function (units) {
            //if (locations.length === 0) return;
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
                "esri/symbols/TextSymbol"
            ], function (GraphicsLayer, arcgisPoint, SimpleMarkerSymbol, PictureMarkerSymbol, Graphic, SpatialReference, Color, InfoTemplate, webMercatorUtils, TextSymbol) {
                IView.unit_layer.clear();
                var _loop_1 = function (u) {
                    pin = new arcgisPoint([u.Longitude, u.Latitude], new SpatialReference({ wkid: 4326 }));
                    wmPin = webMercatorUtils.geographicToWebMercator(pin);
                    iT = new InfoTemplate();
                    iT.setTitle('Vehicle: ' + u.Name);
                    iT.setContent(function (graphic) {
                        var value = IView.Unit.UnitView(u);
                        console.log('html info template', value);
                        return value;
                    });
                    icon = new PictureMarkerSymbol({
                        "angle": 0,
                        "xoffset": 0,
                        "yoffset": 0,
                        "type": "esriPMS",
                        "url": u.Unit_Icon_URL,
                        "contentType": "image/png",
                        "width": 30,
                        "height": 30
                    });
                    g = new Graphic(wmPin, icon);
                    g.setInfoTemplate(iT);
                    IView.unit_layer.add(g);
                    textSymbol = new TextSymbol(u.Name); //esri.symbol.TextSymbol(data.Records[i].UnitName);
                    textSymbol.setColor(new dojo.Color([0, 100, 0]));
                    textSymbol.setOffset(0, -20);
                    textSymbol.setAlign(TextSymbol.ALIGN_MIDDLE);
                    font = new esri.symbol.Font();
                    font.setSize("10pt");
                    font.setWeight(esri.symbol.Font.WEIGHT_BOLD);
                    textSymbol.setFont(font);
                    graphicText = new Graphic(wmPin, textSymbol);
                    IView.unit_layer.add(graphicText);
                    //g.setInfoTemplate(iT);
                };
                var pin, wmPin, iT, icon, g, textSymbol, font, graphicText;
                for (var _i = 0, units_1 = units; _i < units_1.length; _i++) {
                    var u = units_1[_i];
                    _loop_1(u);
                }
                IView.unit_layer.show();
            });
        };
        MapController.prototype.UpdateLocationLayer = function (locations) {
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
                "esri/symbols/TextSymbol"
            ], function (GraphicsLayer, arcgisPoint, SimpleMarkerSymbol, Graphic, SpatialReference, Color, InfoTemplate, webMercatorUtils, TextSymbol) {
                IView.location_layer.clear();
                var _loop_2 = function (l) {
                    var p = l.point_to_use;
                    pin = new arcgisPoint([p.Longitude, p.Latitude], new SpatialReference({ wkid: 4326 }));
                    wmPin = webMercatorUtils.geographicToWebMercator(pin);
                    iT = new InfoTemplate();
                    iT.setTitle('Inspections: ' + l.inspections.length.toString());
                    iT.setContent(function (graphic) {
                        var value = l.LocationView().outerHTML;
                        console.log('html info template', value);
                        return value;
                    });
                    if (l.icons.length > 1) {
                        for (var i = 0; i < l.icons.length; i++) {
                            g = new Graphic(wmPin, l.icons[i]);
                            g.setInfoTemplate(iT);
                            IView.location_layer.add(g);
                        }
                        // need to add circle around grouped inspections
                    }
                    else {
                        g = new Graphic(wmPin, l.icons[0]);
                        g.setInfoTemplate(iT);
                        IView.location_layer.add(g);
                    }
                    if (l.inspections.length > 1) {
                        textSymbol = new TextSymbol(l.inspections.length.toString()); //esri.symbol.TextSymbol(data.Records[i].UnitName);
                        textSymbol.setColor(new dojo.Color([0, 100, 0]));
                        textSymbol.setOffset(0, -20);
                        textSymbol.setAlign(TextSymbol.ALIGN_MIDDLE);
                        font = new esri.symbol.Font();
                        font.setSize("8pt");
                        font.setWeight(esri.symbol.Font.WEIGHT_BOLD);
                        textSymbol.setFont(font);
                        graphicText = new Graphic(wmPin, textSymbol);
                        IView.location_layer.add(graphicText);
                    }
                    //g.setInfoTemplate(iT);
                };
                var pin, wmPin, iT, g, g, textSymbol, font, graphicText;
                for (var _i = 0, locations_1 = locations; _i < locations_1.length; _i++) {
                    var l = locations_1[_i];
                    _loop_2(l);
                }
                IView.location_layer.show();
            });
        };
        MapController.prototype.CreateLayers = function (inspectorData, day, completed) {
            if (inspectorData.length === 0)
                return [];
            var layers;
            require([
                "esri/layers/GraphicsLayer",
                "esri/geometry/Point",
                "esri/symbols/SimpleMarkerSymbol",
                "esri/graphic",
                "esri/SpatialReference",
                "esri/Color",
                "esri/InfoTemplate",
                "esri/geometry/webMercatorUtils"
            ], function (GraphicsLayer, arcgisPoint, SimpleMarkerSymbol, Graphic, SpatialReference, Color, InfoTemplate, webMercatorUtils) {
                layers = inspectorData.map(function (i) {
                    var l = new GraphicsLayer();
                    l.id = i.Name + '-' + day + '-' + completed;
                    l.inspector = i.Id;
                    l.completed = completed;
                    l.day = day;
                    l.color = i.Color;
                    l.numberInspections = i.Inspections.length;
                    var c = Color.fromHex(i.Color);
                    // ak is now a list of unique lookup keys for this user.
                    var ak = i.Inspections.map(function (n) { return n.LookupKey; });
                    ak = ak.filter(function (v, i) { return ak.indexOf(v) == i; });
                    ak.forEach(function (n) {
                        var inspections = i.Inspections.filter(function (v) {
                            return v.LookupKey == n;
                        });
                        // Need to get total number o                
                        var p = inspections[0].PointToUse;
                        var compactAddress = inspections[0].StreetAddressCombined + '<br/> ' +
                            inspections[0].City + ', ' + inspections[0].Zip;
                        if (!p.IsValid) {
                            console.log('Invalid data', n, i);
                        }
                        if (p.IsValid) {
                            var iT = new InfoTemplate();
                            iT.setTitle('Address: ${CompactAddress}');
                            //iT.setContent(IView.mapAddressClick);
                            var s = new SimpleMarkerSymbol({
                                "color": c,
                                "size": 12,
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
        };
        MapController.prototype.ApplyLayers = function (layers) {
            var mapController = this;
            this.map.addLayers(layers);
        };
        MapController.prototype.ToggleLayers = function (inspectorId, day, isComplete, visible) {
            var m = this.map;
            this.map.graphicsLayerIds.forEach(function (layerId) {
                var l = m.getLayer(layerId);
                if (l.inspector === inspectorId && l.day === day && l.completed === isComplete) {
                    if (visible) {
                        l.show();
                    }
                    else {
                        l.hide();
                    }
                }
            });
        };
        MapController.prototype.ToggleLayersByDay = function (day, isComplete) {
            var m = this.map;
            m.graphicsLayerIds.forEach(function (layerId) {
                var l = m.getLayer(layerId);
                if (l.day === day && l.completed === isComplete) {
                    l.show();
                }
                else {
                    l.hide();
                }
            });
        };
        MapController.prototype.ClearLayers = function () {
            var m = this.map;
            if (!m.graphicsLayerIds)
                return;
            while (m.graphicsLayerIds.length > 0) {
                for (var _i = 0, _a = m.graphicsLayerIds; _i < _a.length; _i++) {
                    var glid = _a[_i];
                    m.removeLayer(m.getLayer(glid));
                }
            }
        };
        MapController.prototype.FindItemsInExtent = function (extent) {
            var mapController = this;
            var m = this.map;
            var lookupKeys = [];
            require([
                "esri/symbols/SimpleMarkerSymbol",
                "esri/symbols/SimpleLineSymbol",
                "esri/Color"
            ], function (SimpleMarkerSymbol, SimpleLineSymbol, Color) {
                m.graphicsLayerIds.forEach(function (layerId) {
                    var l = m.getLayer(layerId);
                    if (l.visible) {
                        for (var _i = 0, _a = l.graphics; _i < _a.length; _i++) {
                            var g = _a[_i];
                            if (extent.contains(g.geometry)) {
                                var fluxSymbol = new SimpleMarkerSymbol();
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
        };
        MapController.prototype.CenterAndZoom = function (p) {
            var mapController = this;
            var m = this.map;
            require(["esri/geometry/Point"], function (Point) {
                var pt = new Point([p.Longitude, p.Latitude]);
                m.centerAndZoom(pt, 18);
            });
        };
        return MapController;
    }());
    IView.MapController = MapController;
})(IView || (IView = {}));
//# sourceMappingURL=map.js.map