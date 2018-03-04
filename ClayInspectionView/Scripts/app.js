/// <reference path="map.ts" />
//import MapController from "./map";
var IView;
(function (IView) {
    IView.allInspections = []; // populated from web service
    IView.allInspectors = []; // populated from web service
    IView.currentDay = "";
    IView.currentIsComplete = false;
    var mapLoaded = false;
    var dataLoaded = false;
    function Start() {
        // things to do:
        // setup default map
        IView.mapController = new IView.MapController("map");
        // get the data for today/tomorrow
        UpdateInspectors();
    }
    IView.Start = Start;
    function mapLoadCompleted() {
        mapLoaded = true;
        console.log("map load completed");
        BuildAndLoadInitialLayers();
    }
    IView.mapLoadCompleted = mapLoadCompleted;
    function BuildAndLoadInitialLayers() {
        if (!mapLoaded || !dataLoaded)
            return;
        IView.mapController.ClearLayers();
        var days = ["Today", "Tomorrow"];
        if (IView.currentDay === "")
            IView.currentDay = days[0];
        var inspections = IView.allInspections.filter(function (k) {
            return k.ScheduledDay === days[0] && !k.IsCompleted;
        }); // todays incompleted inspections
        var inspectors = buildInspectorData(inspections);
        IView.mapController.ApplyLayers(IView.mapController.CreateLayers(inspectors, days[0], false, days[0] === IView.currentDay));
        inspections = IView.allInspections.filter(function (k) {
            return k.ScheduledDay === days[0];
        }); // todays inspections both incomplete and completed
        IView.mapController.ApplyLayers(IView.mapController.CreateLayers(buildInspectorData(inspections), days[0], true, days[0] === IView.currentDay && IView.currentIsComplete === true));
        inspections = IView.allInspections.filter(function (k) {
            return k.ScheduledDay === days[1];
        }); // tomorrows inspections
        IView.mapController.ApplyLayers(IView.mapController.CreateLayers(buildInspectorData(inspections), days[1], true, days[1] === IView.currentDay));
        BuildLegend();
    }
    function BuildLegend() {
        var legend = document.getElementById("legend");
        clearElement(legend);
        var x = document.querySelector("ul.nav li.active").id.toLowerCase().split("-");
        var isCompleted = (x[x.length - 1] === "incomplete" ? false : true);
        var inspections = IView.allInspections.filter(function (k) {
            if (isCompleted) {
                return k.ScheduledDay === IView.currentDay;
            }
            else {
                return k.ScheduledDay === IView.currentDay && k.IsCompleted === false;
            }
        });
        var inspectors = buildInspectorData(inspections);
        var ol = document.createElement("ol");
        inspectors.forEach(function (i) {
            var li = document.createElement("li");
            li.id = "inspector" + i.Id;
            li.style.backgroundColor = i.Color;
            li.style.display = "flex";
            li.style.justifyContent = "space-between";
            li.onclick = function () { return OnInspectorClick(i); };
            var inspectorName = document.createElement("span");
            inspectorName.appendChild(document.createTextNode(i.Name));
            inspectorName.style.textAlign = "left";
            inspectorName.style.marginLeft = "1em";
            var count = document.createElement("span");
            count.appendChild(document.createTextNode(i.Inspections.length.toString()));
            count.style.textAlign = "right";
            count.style.marginRight = "1em";
            li.appendChild(inspectorName);
            li.appendChild(count);
            ol.appendChild(li);
        });
        legend.appendChild(ol);
    }
    function OnInspectorClick(i) {
        var x = document.querySelector("ul.nav li.active").id.toLowerCase().split("-");
        IView.currentIsComplete = (x[x.length - 1] === "incomplete" ? false : true);
        var e = document.getElementById("inspector" + i.Id);
        if (e.classList.contains("strike")) {
            e.classList.remove("strike"); // it's already hidden, let's show it
            IView.mapController.ToggleLayers(i.Id, IView.currentDay, IView.currentIsComplete, true);
        }
        else {
            e.classList.add("strike"); // let's add a strikethrough
            IView.mapController.ToggleLayers(i.Id, IView.currentDay, IView.currentIsComplete, false);
        }
    }
    function DrawToggle() {
        var select = document.getElementById("BulkAssignSelect");
        var button = document.getElementById("BulkAssignButton");
        var o = select.selectedOptions[0];
        if (!button.disabled) {
            button.textContent = "Bulk Assigning to: " + o.label;
        }
        else {
            button.textContent = "Bulk Assign";
        }
        IView.mapController.ToggleDraw();
    }
    IView.DrawToggle = DrawToggle;
    function toggle(id, show) {
        document.getElementById(id).style.display = show ? "inline-block" : "none";
    }
    IView.toggle = toggle;
    function GetAllInspections() {
        toggle('showSpin', true);
        var button = document.getElementById("refreshButton");
        button.disabled = true;
        console.log('GetallInspections');
        var i = new IView.Inspection();
        i.GetInspections()
            .then(function (inspections) {
            console.log('inspections', inspections);
            IView.allInspections = inspections;
            dataLoaded = true;
            BuildAndLoadInitialLayers();
            // update the counts
            UpdateCounts(IView.currentDay);
            toggle('showSpin', false);
            button.disabled = false;
        }, function () {
            console.log('error getting All inspections');
            IView.allInspections = [];
            toggle('showSpin', false);
            button.disabled = false;
        });
    }
    IView.GetAllInspections = GetAllInspections;
    function UpdateCounts(day) {
        var i = IView.allInspections.filter(function (k) { return k.ScheduledDay === day; }); // our total
        var total = i.length;
        i = i.filter(function (k) { return !k.IsCompleted; }); // let's weed out the ones that are completed.'
        var current = i.length;
        var e = document.getElementById("OpenInspectionsNav"); // update our totals.
        clearElement(e);
        var count = "Open Inspections: " + current + " of " + total;
        e.appendChild(document.createTextNode(count));
    }
    function UpdateInspectors() {
        var i = new IView.Inspector();
        i.GetAllInspectors().then(function (inspectors) {
            IView.allInspectors = inspectors;
            BuildBulkInspectorSelect();
            GetAllInspections();
        }, function () {
            console.log('error getting inspectors');
            // do something with the error here
            IView.allInspectors = [];
        });
    }
    function BuildBulkInspectorSelect() {
        var select = document.getElementById("BulkAssignSelect");
        for (var _i = 0, allInspectors_1 = IView.allInspectors; _i < allInspectors_1.length; _i++) {
            var i = allInspectors_1[_i];
            var o = document.createElement("option");
            o.value = i.Id.toString();
            o.label = i.Name;
            select.options.add(o);
        }
    }
    function BulkAssignChange() {
        var select = document.getElementById("BulkAssignSelect");
        var button = document.getElementById("BulkAssignButton");
        var o = select.selectedOptions[0];
        button.disabled = (o.value === "");
        button.textContent = "Bulk Assign";
        IView.mapController.ToggleDraw(false);
    }
    IView.BulkAssignChange = BulkAssignChange;
    function buildInspectorData(inspections) {
        var iData = IView.allInspectors.map(function (i) {
            var x = new IView.Inspector();
            x.Id = i.Id;
            x.Name = i.Name;
            x.Inspections = inspections.filter(function (v) {
                return v.InspectorName === x.Name;
            });
            if (x.Inspections.length > 0) {
                x.Color = x.Inspections[0].Color;
            }
            else {
                x.Color = '#FFFFFF';
            }
            return x;
        });
        iData = iData.filter(function (v) { return v.Inspections.length > 0; });
        return iData;
    }
    function buildAddressDisplayByDay(i, day) {
        var x = [];
        x.push("<li><span>");
        x.push(day);
        x.push(" - Total Inspections: ");
        x.push(i.length);
        x.push("</span></li>");
        i.map(function (n) {
            x.push("<li><a target='clayinspections' href='http://apps.claycountygov.com/InspectionScheduler/#permit=");
            x.push(n.PermitNo);
            x.push("&inspectionid=");
            x.push(n.InspReqID);
            x.push("'>");
            x.push(n.PermitNo);
            x.push(" - ");
            x.push(n.InspectionDescription);
            x.push(" - ");
            x.push(n.IsCommercial ? "Commercial" : "Residential");
            x.push(" - ");
            x.push(n.IsPrivateProvider ? "Private Provider" : "Not Private");
            x.push("</a></li>");
        });
        return x.join('');
    }
    function Assign(e, InspectorId) {
        var LookupKey = e.id;
        var lk = [LookupKey];
        BulkAssign(InspectorId, lk);
    }
    IView.Assign = Assign;
    //function UpdateInspectionAssignments(lookupKey: string, assignedTo: number, day: string)
    //{
    //  let currentInspector = allInspectors.filter(function (k)
    //  {
    //    return k.Id == assignedTo;
    //  })[0];
    //  console.log(currentInspector);
    //  let inspections: Array<Inspection> = allInspections.filter(
    //    function (k: Inspection)
    //    {
    //      return k.LookupKey === lookupKey && k.ScheduledDay === day;
    //    });
    //  inspections.forEach(function (i)
    //  {
    //    i.InspectorName = currentInspector.Name;
    //    i.Color = currentInspector.Color;
    //  });
    //  BuildAndLoadInitialLayers();
    //}
    function buildInspectorAssign(assignedTo, lookupKey) {
        var x = [];
        x.push("<li style='margin-bottom: .5em;'><span>Assigned to:</span>");
        x.push("<select id='");
        x.push(lookupKey);
        x.push("' onchange='IView.Assign(this, this.value);'>");
        IView.allInspectors.forEach(function (i) {
            x.push("<option value='");
            x.push(i.Id);
            if (i.Name === assignedTo) {
                x.push("' selected>");
            }
            else {
                x.push("'>");
            }
            x.push(i.Name);
            x.push("</option>");
        });
        x.push("</select></li>");
        return x.join('');
    }
    function mapAddressClick(graphic) {
        var inspections = IView.allInspections.filter(function (k) {
            return k.LookupKey === graphic.attributes.LookupKey;
        });
        var today = inspections.filter(function (k) { return k.ScheduledDay === "Today"; });
        var tomorrow = inspections.filter(function (k) { return k.ScheduledDay !== "Today"; });
        var x = [];
        x.push("<ol>");
        if (!inspections[0].IsCompleted && inspections[0].CanBeAssigned) {
            x.push(buildInspectorAssign(inspections[0].InspectorName, graphic.attributes.LookupKey));
        }
        x.push(buildAddressDisplayByDay(today, "Today"));
        x.push(buildAddressDisplayByDay(tomorrow, "Tomorrow"));
        x.push("</ol>");
        return x.join('');
    }
    IView.mapAddressClick = mapAddressClick;
    function toggleNavDisplay(key, isCompleted) {
        IView.currentIsComplete = isCompleted;
        var x = document.querySelectorAll("ul.nav li.active");
        for (var i = 0; i < x.length; ++i) {
            x[i].classList.remove("active");
        }
        var id = "nav-" + key + "-" + (isCompleted ? "all" : "incomplete");
        document.getElementById(id).classList.add("active");
        IView.currentDay = key;
        IView.mapController.ToggleLayersByDay(key, isCompleted);
        BuildLegend();
        UpdateCounts(key);
    }
    IView.toggleNavDisplay = toggleNavDisplay;
    function clearElement(node) {
        while (node.firstChild) {
            node.removeChild(node.firstChild);
        }
    }
    IView.clearElement = clearElement;
    function FindItemsInExtent(extent) {
        var LookupKeys = IView.mapController.FindItemsInExtent(extent);
        var InspectorId = parseInt(document.getElementById("BulkAssignSelect").value);
        BulkAssign(InspectorId, LookupKeys);
    }
    IView.FindItemsInExtent = FindItemsInExtent;
    function BulkAssign(InspectorId, LookupKeys) {
        var InspectionIds = [];
        for (var _i = 0, allInspections_1 = IView.allInspections; _i < allInspections_1.length; _i++) {
            var i_1 = allInspections_1[_i];
            if (LookupKeys.indexOf(i_1.LookupKey) !== -1 &&
                i_1.ScheduledDay === IView.currentDay) {
                if (IView.currentIsComplete || (!IView.currentIsComplete && !i_1.IsCompleted)) {
                    InspectionIds.push(i_1.InspReqID);
                }
            }
        }
        var i = new IView.Inspection();
        i.BulkAssign(InspectorId, InspectionIds);
    }
})(IView || (IView = {}));
//# sourceMappingURL=app.js.map