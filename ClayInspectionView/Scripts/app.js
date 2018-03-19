/// <reference path="map.ts" />
/// <reference path="unit.ts" />
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
    function HandleHash() {
        var hash = location.hash;
        var currentHash = new IView.LocationHash(location.hash.substring(1));
        if (currentHash.InspectionId > 0) {
            var i = IView.allInspections.filter(function (j) { return j.InspReqID === currentHash.InspectionId; });
            if (i.length > 0) {
                console.log(i[0].PointToUse);
                IView.mapController.CenterAndZoom(i[0].PointToUse);
            }
        }
    }
    IView.HandleHash = HandleHash;
    function mapLoadCompleted() {
        mapLoaded = true;
        console.log("map load completed");
        BuildAndLoadInitialLayers();
    }
    IView.mapLoadCompleted = mapLoadCompleted;
    function BuildAndLoadInitialLayers() {
        if (!mapLoaded || !dataLoaded)
            return;
        window.onhashchange = HandleHash;
        HandleHash();
        IView.mapController.ClearLayers();
        var days = ["Today", "Tomorrow"];
        if (IView.currentDay === "")
            IView.currentDay = days[0];
        var _loop_1 = function (d) {
            var inspections = IView.allInspections.filter(function (k) {
                return k.ScheduledDay === d && !k.IsCompleted;
            }); // todays incompleted inspections
            var inspectors = buildInspectorData(inspections);
            IView.mapController.ApplyLayers(IView.mapController.CreateLayers(inspectors, d, false) // , days[0] === currentDay
            );
            inspections = IView.allInspections.filter(function (k) {
                return k.ScheduledDay === d;
            }); // todays incompleted inspections
            inspectors = buildInspectorData(inspections);
            IView.mapController.ApplyLayers(IView.mapController.CreateLayers(inspectors, d, true) // , days[0] === currentDay
            );
        };
        for (var _i = 0, days_1 = days; _i < days_1.length; _i++) {
            var d = days_1[_i];
            _loop_1(d);
        }
        //inspections = allInspections.filter(
        //  function (k)
        //  {
        //    return k.ScheduledDay === days[0];
        //  }); // todays inspections both incomplete and completed
        //mapController.ApplyLayers(
        //  mapController.CreateLayers(
        //    buildInspectorData(inspections),
        //    days[0],
        //    true) // days[0] === currentDay && currentIsComplete === true
        //);
        //inspections = allInspections.filter(
        //  function (k)
        //  {
        //    return k.ScheduledDay === days[1]
        //  }); // tomorrows inspections
        //mapController.ApplyLayers(
        //  mapController.CreateLayers(
        //    buildInspectorData(inspections),
        //    days[1],
        //    true)// days[1] === currentDay
        //);
        IView.mapController.ToggleLayersByDay(IView.currentDay, IView.currentIsComplete);
        BuildLegend();
    }
    function BuildLegend() {
        var legend = document.getElementById("LegendInspectorList");
        clearElement(legend);
        var inspections = IView.allInspections.filter(function (k) {
            if (IView.currentIsComplete) {
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
        //let x = document.querySelector("ul.nav li.active").id.toLowerCase().split("-");
        //currentIsComplete = (x[x.length - 1] === "incomplete" ? false : true);
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
            o.text = i.Name;
            select.options.add(o);
        }
    }
    function BulkAssignChange() {
        var select = document.getElementById("BulkAssignSelect");
        var button = document.getElementById("BulkAssignButton");
        var o = select.selectedOptions[0];
        button.disabled = (o.value === "");
        //if (!button.disabled)
        //{
        //  let inspector: Inspector = allInspectors.filter(function (i) { return i.Id.toString() === o.value; })[0];
        //  let lookupKeys: Array<string> = [];
        //  lookupKeys = GetInvalidInspections(inspector);
        //  mapController.MarkItemsToIndicateNoMatch(lookupKeys);
        //}
        button.textContent = "Bulk Assign";
        IView.mapController.ToggleDraw(false);
    }
    IView.BulkAssignChange = BulkAssignChange;
    function GetInvalidInspections(inspector) {
        // this function returns a list of the lookupkeys that the selected
        // inspector doesn't have the necessary licenses to inspect.
        var lookupKeys = [];
        for (var _i = 0, allInspections_1 = IView.allInspections; _i < allInspections_1.length; _i++) {
            var i = allInspections_1[_i];
            if (i.LookupKey === '2821-BOLTON-ORANGE PARK32073') {
                console.log('inspector', inspector, 'inspection', i);
            }
            if (i.IsPrivateProvider && !inspector.PrivateProvider) {
                if (i.LookupKey === '2821-BOLTON-ORANGE PARK32073') {
                    console.log('found');
                }
                if (lookupKeys.indexOf(i.LookupKey) === -1)
                    lookupKeys.push(i.LookupKey);
            }
            else {
                if (i.CBL && !inspector.CBL ||
                    i.CEL && !inspector.CEL ||
                    i.CME && !inspector.CME ||
                    i.CPL && !inspector.CPL ||
                    i.RBL && !inspector.RBL ||
                    i.REL && !inspector.REL ||
                    i.RME && !inspector.RME ||
                    i.RPL && !inspector.RPL ||
                    i.Fire && !inspector.Fire) {
                    if (i.LookupKey === '2821-BOLTON-ORANGE PARK32073') {
                        console.log('found');
                    }
                    if (lookupKeys.indexOf(i.LookupKey) === -1)
                        lookupKeys.push(i.LookupKey);
                }
            }
        }
        console.log('invalid lookupkeys', lookupKeys);
        if (lookupKeys.indexOf('2821-BOLTON-ORANGE PARK32073') != -1) {
            console.log('found in array');
        }
        return lookupKeys;
    }
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
        var InspectorName = IView.currentDay === "Today" ? today[0].InspectorName : tomorrow[0].InspectorName;
        var isCompletedCheck = IView.currentDay === "Today" ? today[0].IsCompleted : tomorrow[0].IsCompleted;
        console.log('Inspector Name', InspectorName, 'completedcheck', isCompletedCheck, inspections[0].CanBeAssigned);
        if (!isCompletedCheck && inspections[0].CanBeAssigned) {
            x.push(buildInspectorAssign(InspectorName, graphic.attributes.LookupKey));
        }
        else {
            if (isCompletedCheck) {
                x.push("<li>This inspection is already completed.</li>");
            }
        }
        x.push(buildAddressDisplayByDay(today, "Today"));
        x.push(buildAddressDisplayByDay(tomorrow, "Tomorrow"));
        x.push("</ol>");
        return x.join('');
    }
    IView.mapAddressClick = mapAddressClick;
    function ToggleLegend() {
    }
    IView.ToggleLegend = ToggleLegend;
    function ChangeDay() {
        var ddl = document.getElementById("selectDay");
        switch (ddl.value) {
            case "today-open":
                toggleNavDisplay('Today', false);
                break;
            case "today-all":
                toggleNavDisplay('Today', true);
                break;
            case "tomorrow-open":
                toggleNavDisplay('Tomorrow', false);
                break;
            case "tomorrow-all":
                toggleNavDisplay('Tomorrow', true);
                break;
        }
    }
    IView.ChangeDay = ChangeDay;
    function toggleNavDisplay(key, isCompleted) {
        IView.currentIsComplete = isCompleted;
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
        for (var _i = 0, allInspections_2 = IView.allInspections; _i < allInspections_2.length; _i++) {
            var i_1 = allInspections_2[_i];
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