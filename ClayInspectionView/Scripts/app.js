/// <reference path="map.ts" />
/// <reference path="unit.ts" />
//import MapController from "./map";
var IView;
(function (IView) {
    IView.allInspections = []; // populated from web service
    IView.inspectors_to_edit = []; // only populated if the user has admin access.
    IView.allInspectors = []; // populated from web service
    IView.allUnits = [];
    IView.filteredLocations = [];
    IView.current_location = null;
    IView.day_filter = "today";
    IView.inspection_status_filter = "open";
    IView.permit_kind_filter = "all";
    IView.permit_type_filter = [];
    IView.inspector_filter = [];
    IView.private_provider_only = false;
    IView.invalid_address_only = false;
    IView.show_bulk_assign = true;
    IView.permit_types_toggle_status = false;
    IView.inspector_toggle_status = false;
    IView.mapLoaded = false;
    IView.dataLoaded = false;
    function Start() {
        // things to do:
        // setup default map
        IView.mapController = new IView.MapController("map");
        IView.Inspector.GetAllInspectors();
    }
    IView.Start = Start;
    function LoadDefaultsFromCookie() {
        var status = GetMapCookie("inspection_status_filter");
        var day = GetMapCookie("day_filter");
        var kind = GetMapCookie("permit_kind_filter");
        var private = GetMapCookie("private_provider_only");
        var invalid = GetMapCookie("invalid_address_only");
        var permittype = GetMapCookie("permit_type_filter");
        var inspector = GetMapCookie("inspector_filter");
        var bulk = GetMapCookie("show_bulk_assign");
        if (status === null)
            return;
        if (status !== null)
            IView.inspection_status_filter = status;
        if (day !== null)
            IView.day_filter = day;
        if (kind !== null)
            IView.permit_kind_filter = kind;
        if (private !== null)
            IView.private_provider_only = (private.toLowerCase() === "true");
        if (invalid !== null)
            IView.invalid_address_only = (invalid.toLowerCase() === "true");
        if (permittype !== null)
            IView.permit_type_filter = permittype.split(",");
        if (inspector !== null)
            IView.inspector_filter = inspector.split(",");
        if (bulk !== null)
            IView.show_bulk_assign = (bulk.toLowerCase() === "true");
        // load defaults into form
        if (IView.show_bulk_assign) {
            Utilities.Show("BulkAssignContainer");
        }
        else {
            Utilities.Hide("BulkAssignContainer");
        }
        document.querySelector("input[name='inspectionStatus'][value='" + IView.inspection_status_filter + "']").checked = true;
        document.querySelector("input[name='inspectionDay'][value='" + IView.day_filter + "']").checked = true;
        document.querySelector("input[name='commercialResidential'][value='" + IView.permit_kind_filter + "']").checked = true;
        document.getElementById("privateProviderFilter").checked = IView.private_provider_only;
        document.getElementById("invalidAddressFilter").checked = IView.invalid_address_only;
        Toggle_Input_Group("input[name='inspectorFilter']", false);
        for (var _i = 0, _a = IView.inspector_filter; _i < _a.length; _i++) {
            var i = _a[_i];
            document.querySelector("input[name='inspectorFilter'][value='" + i + "']").checked = true;
        }
        Toggle_Input_Group("input[name='permitType']", false);
        for (var _b = 0, _c = IView.permit_type_filter; _b < _c.length; _b++) {
            var p = _c[_b];
            document.querySelector("input[name='permitType'][value='" + p + "']").checked = true;
        }
    }
    IView.LoadDefaultsFromCookie = LoadDefaultsFromCookie;
    function SaveCookie() {
        UpdateFilters();
        SetMapCookie("inspection_status_filter", IView.inspection_status_filter);
        SetMapCookie("day_filter", IView.day_filter);
        SetMapCookie("permit_kind_filter", IView.permit_kind_filter);
        SetMapCookie("private_provider_only", IView.private_provider_only.toString());
        SetMapCookie("invalid_address_only", IView.invalid_address_only.toString());
        SetMapCookie("permit_type_filter", IView.permit_type_filter.join(","));
        SetMapCookie("inspector_filter", IView.inspector_filter.join(","));
        SetMapCookie("show_bulk_assign", IView.show_bulk_assign.toString());
    }
    IView.SaveCookie = SaveCookie;
    function GetMapCookie(name) {
        var value = "; " + document.cookie;
        var parts = value.split("; " + "inspectionview_" + name + "=");
        if (parts.length == 2) {
            return parts.pop().split(";").shift();
        }
        return null;
    }
    function SetMapCookie(name, value) {
        var expirationYear = new Date().getFullYear() + 1;
        var expirationDate = new Date();
        expirationDate.setFullYear(expirationYear);
        var cookie = "inspectionview_" + name + "=" + value + "; expires=" + expirationDate.toUTCString() + "; path=" + Utilities.Get_Path("/inspectionview");
        document.cookie = cookie;
    }
    function ResetFilters() {
        // let's set the actual filter backing first.
        IView.day_filter = "today";
        IView.inspection_status_filter = "open";
        IView.permit_kind_filter = "all";
        IView.permit_type_filter = [];
        IView.inspector_filter = [];
        IView.private_provider_only = false;
        IView.invalid_address_only = false;
        document.querySelector("input[name='inspectionStatus'][value='open']").checked = true;
        document.querySelector("input[name='inspectionDay'][value='today']").checked = true;
        document.querySelector("input[name='commercialResidential'][value='all']").checked = true;
        document.getElementById("privateProviderFilter").checked = false;
        document.getElementById("invalidAddressFilter").checked = false;
        Toggle_Input_Group("input[name='inspectorFilter']", false);
        document.querySelector("input[name='inspectorFilter'][value='All']").checked = true;
        Toggle_Input_Group("input[name='permitType']", false);
        document.querySelector("input[name='permitType'][value='all']").checked = true;
        IView.Location.CreateLocations(ApplyFilters(IView.allInspections));
    }
    IView.ResetFilters = ResetFilters;
    function Toggle_Group(group) {
        if (group === "inspectors") {
            IView.inspector_toggle_status = !IView.inspector_toggle_status;
            Toggle_Input_Group("input[name='inspectorFilter']", IView.inspector_toggle_status);
        }
        else {
            IView.permit_types_toggle_status = !IView.permit_types_toggle_status;
            Toggle_Input_Group("input[name='permitType']", IView.permit_types_toggle_status);
        }
        IView.Location.CreateLocations(ApplyFilters(IView.allInspections));
    }
    IView.Toggle_Group = Toggle_Group;
    function Toggle_Bulk_Assign() {
        IView.show_bulk_assign = !IView.show_bulk_assign;
        if (IView.show_bulk_assign) {
            Utilities.Show("BulkAssignContainer");
        }
        else {
            Utilities.Hide("BulkAssignContainer");
        }
    }
    IView.Toggle_Bulk_Assign = Toggle_Bulk_Assign;
    function Toggle_Input_Group(querystring, checked) {
        var inputs = document.querySelectorAll(querystring);
        for (var i = 0; i < inputs.length; i++) {
            inputs.item(i).checked = checked;
        }
    }
    function FilterInputEvents() {
        var inputs = document.querySelectorAll("#filters input");
        for (var i = 0; i < inputs.length; i++) {
            inputs.item(i).addEventListener("click", function (e) {
                IView.Location.CreateLocations(ApplyFilters(IView.allInspections));
            });
        }
    }
    IView.FilterInputEvents = FilterInputEvents;
    function UpdateFilters() {
        IView.inspection_status_filter = Get_Single_Filter('input[name="inspectionStatus"]:checked');
        IView.day_filter = Get_Single_Filter('input[name="inspectionDay"]:checked');
        IView.permit_kind_filter = Get_Single_Filter('input[name="commercialResidential"]:checked');
        IView.private_provider_only = document.getElementById("privateProviderFilter").checked;
        IView.invalid_address_only = document.getElementById("invalidAddressFilter").checked;
        IView.permit_type_filter = Get_Filters('input[name="permitType"]:checked');
        IView.inspector_filter = Get_Filters('input[name="inspectorFilter"]:checked');
    }
    function ApplyFilters(inspections) {
        UpdateFilters();
        // filter by status
        var filtered = inspections;
        if (IView.inspection_status_filter !== "all") {
            var is_completed_1 = IView.inspection_status_filter !== "open";
            filtered = IView.allInspections.filter(function (j) {
                return j.IsCompleted === is_completed_1;
            });
        }
        // filter by day
        if (IView.day_filter !== "all") {
            if (IView.day_filter !== "prior") {
                filtered = filtered.filter(function (j) { return j.ScheduledDay === IView.day_filter; });
            }
            else {
                filtered = filtered.filter(function (j) { return j.Age > 0; });
            }
        }
        // filter by kind
        if (IView.permit_kind_filter !== "all") {
            var is_commercial_1 = IView.permit_kind_filter === "commercial";
            filtered = filtered.filter(function (j) { return j.IsCommercial === is_commercial_1; });
        }
        // filter by permit type
        if (IView.permit_type_filter.indexOf("all") === -1) {
            filtered = filtered.filter(function (j) {
                return IView.permit_type_filter.indexOf(j.PermitNo.substr(0, 1)) !== -1;
            });
        }
        // filter by private provider
        if (IView.private_provider_only) {
            filtered = filtered.filter(function (j) { return j.IsPrivateProvider; });
        }
        // filter by invalid address
        if (IView.invalid_address_only) {
            filtered = filtered.filter(function (j) { return !j.AddressPoint.IsValid || !j.ParcelPoint.IsValid; });
        }
        // filter by inspector
        if (IView.inspector_filter.indexOf("All") === -1) {
            filtered = filtered.filter(function (j) {
                return IView.inspector_filter.indexOf(j.InspectorName) !== -1;
            });
        }
        IView.Inspector.UpdateCurrentCount(IView.allInspectors, filtered);
        UpdateLegend(IView.allInspectors.filter(function (j) { return j.CurrentCount > 0; }));
        return filtered;
    }
    IView.ApplyFilters = ApplyFilters;
    function UpdateLegend(inspectors) {
        var ol = document.getElementById("InspectorList");
        Utilities.Clear_Element(ol);
        for (var _i = 0, inspectors_1 = inspectors; _i < inspectors_1.length; _i++) {
            var i = inspectors_1[_i];
            var li = document.createElement("li");
            li.style.color = i.Id === 0 ? "black" : "white";
            //li.id = "inspector" + i.Id;
            li.style.paddingLeft = "1em";
            li.style.paddingRight = "1em";
            li.style.backgroundColor = i.Color;
            li.style.display = "flex";
            li.style.justifyContent = "space-between";
            var inspectorName = document.createElement("span");
            inspectorName.appendChild(document.createTextNode(i.Name));
            inspectorName.style.textAlign = "left";
            var count = document.createElement("span");
            count.appendChild(document.createTextNode(i.CurrentCount.toString()));
            count.style.textAlign = "right";
            li.appendChild(inspectorName);
            li.appendChild(count);
            ol.appendChild(li);
        }
    }
    function Get_Single_Filter(selector) {
        return document.querySelector(selector).value;
    }
    function Get_Filters(selector) {
        var inputs = document.querySelectorAll(selector);
        var values = [];
        for (var i = 0; i < inputs.length; i++) {
            values.push(inputs.item(i).value);
        }
        return values;
    }
    function HandleHash() {
        var hash = location.hash;
        var currentHash = new IView.LocationHash(location.hash.substring(1));
        if (currentHash.InspectionId > 0) {
            var i_1 = IView.allInspections.filter(function (j) { return j.InspReqID === currentHash.InspectionId; });
            if (i_1.length > 0) {
                console.log('inspection based on passed id', i_1, 'inspection point to use', i_1[0].PointToUse);
                IView.mapController.CenterAndZoom(i_1[0].PointToUse);
                var ii = IView.allInspections.filter(function (j) { return j.PointToUse.Latitude === i_1[0].PointToUse.Latitude; });
                console.log('all points', ii);
            }
        }
    }
    IView.HandleHash = HandleHash;
    function mapLoadCompleted() {
        IView.mapLoaded = true;
        console.log("map load completed");
        BuildAndLoadInitialLayers();
    }
    IView.mapLoadCompleted = mapLoadCompleted;
    function BuildAndLoadInitialLayers() {
        if (!IView.mapLoaded || !IView.dataLoaded)
            return;
        window.onhashchange = HandleHash;
        HandleHash();
        IView.mapController.UpdateLocationLayer(IView.filteredLocations);
        IView.Unit.GetUnits();
        //mapController.ClearLayers();
        //let days = ["Today", "Tomorrow"];
        //if (currentDay === "") currentDay = days[0];
        //for (let d of days)
        //{
        //  let inspections = allInspections.filter(
        //    function (k)
        //    {
        //      return k.ScheduledDay === d && !k.IsCompleted;
        //    }); // todays incompleted inspections
        //  let inspectors = buildInspectorData(inspections);
        //  mapController.ApplyLayers(
        //    mapController.CreateLayers(inspectors, d, false) // , days[0] === currentDay
        //  );
        //  inspections = allInspections.filter(
        //    function (k)
        //    {
        //      return k.ScheduledDay === d;
        //    }); // todays incompleted inspections
        //  //inspectors = buildInspectorData(inspections);
        //  mapController.ApplyLayers(
        //    mapController.CreateLayers(inspectors, d, true) // , days[0] === currentDay
        //  );
        //}
        //mapController.ToggleLayersByDay(currentDay, currentIsComplete);
        //BuildLegend();
    }
    IView.BuildAndLoadInitialLayers = BuildAndLoadInitialLayers;
    function DrawToggle() {
        var select = document.getElementById("bulkAssignSelect");
        var button = document.getElementById("bulkAssignButton");
        var selectedInspector = Utilities.Get_Value(select);
        if (selectedInspector === "-1") {
            Utilities.Error_Show("bulkAssignError", "Please choose an inspector.", true);
            return;
        }
        IView.mapController.ToggleDraw();
    }
    IView.DrawToggle = DrawToggle;
    function ShowFilters() {
        document.getElementById("filters").classList.add("is-active");
    }
    IView.ShowFilters = ShowFilters;
    function ShowInspectors() {
        document.getElementById("inspectorEdit").classList.add("is-active");
    }
    IView.ShowInspectors = ShowInspectors;
    function CloseLocationModal() {
        IView.current_location = null;
        var symbol = IView.last_selected_graphic.symbol;
        var color = IView.last_symbol_color;
        window.setTimeout(function (j) {
            symbol.color = color;
            IView.location_layer.redraw();
        }, 10000);
        CloseModals();
    }
    IView.CloseLocationModal = CloseLocationModal;
    function CloseModals() {
        var modals = document.querySelectorAll(".modal");
        if (modals.length > 0) {
            for (var i = 0; i < modals.length; i++) {
                var modal = modals.item(i);
                modal.classList.remove("is-active");
            }
        }
    }
    IView.CloseModals = CloseModals;
    function Bulk_Assign_Location(event) {
        if (IView.current_location === null)
            return;
        var selectedInspector = Utilities.Get_Value(event.srcElement);
        if (selectedInspector.length === 0)
            return;
        var inspectors = IView.allInspectors.filter(function (i) { return i.Name === selectedInspector; });
        var parent = event.srcElement.parentElement;
        if (inspectors.length === 1) {
            var id = inspectors[0].Id;
            var inspectionIds = IView.current_location.inspections.map(function (i) { return i.InspReqID; });
            IView.Inspection.BulkAssign(id, inspectionIds, parent);
        }
    }
    IView.Bulk_Assign_Location = Bulk_Assign_Location;
    function Strip_Html(html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    }
    IView.Strip_Html = Strip_Html;
    function FindItemsInExtent(extent) {
        var LookupKeys = IView.mapController.FindItemsInExtent(extent);
        var InspectorId = parseInt(document.getElementById("bulkAssignSelect").value);
        BulkAssign(InspectorId, LookupKeys);
    }
    IView.FindItemsInExtent = FindItemsInExtent;
    function BulkAssign(InspectorId, LookupKeys) {
        var InspectionIds = [];
        for (var _i = 0, allInspections_1 = IView.allInspections; _i < allInspections_1.length; _i++) {
            var i = allInspections_1[_i];
            if (LookupKeys.indexOf(i.LookupKey) !== -1) {
                InspectionIds.push(i.InspReqID);
            }
        }
        //let i = new Inspection();
        IView.Inspection.BulkAssign(InspectorId, InspectionIds);
    }
})(IView || (IView = {}));
//# sourceMappingURL=app.js.map