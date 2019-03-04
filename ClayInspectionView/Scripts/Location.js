var IView;
(function (IView) {
    var Location = /** @class */ (function () {
        function Location(inspections) {
            this.lookup_key = "";
            this.point_to_use = null;
            this.icons = [];
            this.valid_inspectors = [];
            this.inspections = [];
            this.all_inspections = [];
            this.has_commercial = false;
            this.has_residential = false;
            this.has_private_provider = false;
            this.can_be_bulk_assigned = true;
            this.assigned_inspectors = [];
            this.RBL = false;
            this.CBL = false;
            this.REL = false;
            this.CEL = false;
            this.RME = false;
            this.CME = false;
            this.RPL = false;
            this.CPL = false;
            this.Fire = false;
            this.inspections = inspections;
            if (inspections.length === 0)
                return;
            var i = inspections[0];
            this.lookup_key = i.LookupKey;
            this.point_to_use = i.PointToUse;
            this.UpdateFlags();
            this.CreateIcons();
            this.AddValidInspectors(IView.allInspectors);
        }
        Location.prototype.UpdateFlags = function () {
            // this will update the has_commercial, residential, and private provider flags.
            // they'll be set to false, then we just loop through them all and update them to true
            // if we find any      
            this.assigned_inspectors = [];
            for (var _i = 0, _a = this.inspections; _i < _a.length; _i++) {
                var i = _a[_i];
                if (!i.CanBeAssigned)
                    this.can_be_bulk_assigned = false;
                if (i.IsCommercial) {
                    this.has_commercial = true;
                }
                else {
                    this.has_residential = true;
                }
                if (i.IsPrivateProvider)
                    this.has_private_provider = true;
                // now we start collecting data on the assigned inspectors
                // we need to know what they have assigned in order to figure out
                // what their icon should be, and what color it should be.
                if (this.assigned_inspectors.indexOf(i.InspectorName) === -1) {
                    this.assigned_inspectors.push(i.InspectorName);
                    this[i.InspectorName] = { commercial: 0, residential: 0, hexcolor: i.Color };
                }
                if (i.IsCommercial) {
                    this[i.InspectorName].commercial += 1;
                }
                else {
                    this[i.InspectorName].residential += 1;
                }
                // let's check the inspector type flags now
                if (i.RBL)
                    this.RBL = true;
                if (i.CBL)
                    this.CBL = true;
                if (i.REL)
                    this.REL = true;
                if (i.CEL)
                    this.CEL = true;
                if (i.RME)
                    this.RME = true;
                if (i.CME)
                    this.CME = true;
                if (i.RPL)
                    this.RPL = true;
                if (i.CPL)
                    this.CPL = true;
                if (i.Fire)
                    this.Fire = true;
            }
        };
        Location.prototype.AddValidInspectors = function (inspectors) {
            // List the people who can perform all of these inspections
            // not all groups of inspections can be bulk assigned
            // ie: if there are 3 inspections, 1 fire and 1 building and 1 electrical
            // chances are we won't be able to bulk assign this group because no one person can do
            // all of those inspections.
            // What we need to do to calculate this at the point level is to 
            // iterate through every permit and count the types
            // here are the types that matter:
            //    permit type
            //    commercial
            //    residential
            //    private provider
            //    fire
            // Some people can have combinations, like Commercial / Electrical, and not others.
            if (!this.can_be_bulk_assigned)
                return;
            var current = this;
            this.valid_inspectors = inspectors.filter(function (i) {
                //console.log('location', current.lookup_key, current.Fire, i.Name, i.Fire, ((current.Fire === true && i.Fire === true) || current.Fire === false))
                //return ((current.Fire === true && i.Fire === true) || current.Fire === false);
                return ((current.RBL === i.RBL === true) || !current.RBL) &&
                    ((current.CBL === i.CBL === true) || !current.CBL) &&
                    ((current.REL === i.REL === true) || !current.REL) &&
                    ((current.CEL === i.CEL === true) || !current.CEL) &&
                    ((current.RME === i.RME === true) || !current.RME) &&
                    ((current.CME === i.CME === true) || !current.CME) &&
                    ((current.RPL === i.RPL === true) || !current.RPL) &&
                    ((current.CPL === i.CPL === true) || !current.CPL) &&
                    ((current.Fire === i.Fire === true) || !current.Fire);
            });
            if (this.valid_inspectors.length === 0)
                this.can_be_bulk_assigned = false;
        };
        Location.prototype.CreateIcons = function () {
            // this function is going to parse the inspections to figure out 
            // how to build the map icon objects.
            // if there are multiple inspectors assigned to this address,
            // we'll need to give each inspector their own icon with their
            // own color.  
            // commerical permits are given a square icon
            // residential permits are given a circle icon
            // If this address has both residential and commercial permits (usually an error)
            // then we'll give it a diamond icon.
            var x = 0;
            var offsets = this.GetOffsets();
            if (this.assigned_inspectors.length > 1) {
                //let t = this;
                //let bigicon = this.CreateIcon("esriSMSCircle", "#333333", offsets[x++], 20);
                //bigicon.then(function (j)
                //{
                //  t.icons.push(j);
                //});
                x = 1;
            }
            var _loop_1 = function (i) {
                if (x > offsets.length)
                    return { value: void 0 };
                var icontype = "";
                if (this_1[i].commercial > 0 && this_1[i].residential > 0) {
                    icontype = "esriSMSDiamond";
                }
                else {
                    if (this_1[i].commercial > 0) {
                        icontype = "esriSMSSquare";
                    }
                    else {
                        icontype = "esriSMSCircle";
                    }
                }
                var icon = this_1.CreateIcon(icontype, this_1[i].hexcolor, offsets[x++]);
                var test = this_1;
                icon.then(function (j) {
                    test.icons.push(j);
                });
                //this.icons.push(icon);
            };
            var this_1 = this;
            for (var _i = 0, _a = this.assigned_inspectors; _i < _a.length; _i++) {
                var i = _a[_i];
                var state_1 = _loop_1(i);
                if (typeof state_1 === "object")
                    return state_1.value;
            }
        };
        Location.prototype.CreateIcon = function (icon, color, offset, size) {
            if (size === void 0) { size = 12; }
            // this is our base function that we'll use to simplify our icon creation.
            var d = new dojo.Deferred();
            require(["esri/symbols/SimpleMarkerSymbol", "esri/Color"], function (SimpleMarkerSymbol, Color) {
                var s = new SimpleMarkerSymbol({
                    "color": Color.fromHex(color),
                    "size": size,
                    "angle": 0,
                    "xoffset": offset[0],
                    "yoffset": offset[1],
                    "type": "esriSMS",
                    "style": icon,
                    "outline": { "color": [0, 0, 0, 255], "width": 1, "type": "esriSLS", "style": "esriSLSSolid" }
                });
                d.resolve(s);
            });
            return d;
        };
        Location.prototype.GetOffsets = function () {
            return [
                [0, 0],
                [-4, 0],
                [4, 0],
                [0, -4],
                [0, 4],
                [-4, 4],
                [4, -4],
                [-4, -4],
                [4, 4]
            ];
        };
        Location.CreateLocations = function (inspections) {
            var inspectionCount = inspections.length.toString();
            Utilities.Set_Text(document.getElementById("inspectionCount"), inspectionCount);
            var lookupKeys = [];
            IView.filteredLocations = [];
            for (var _i = 0, inspections_1 = inspections; _i < inspections_1.length; _i++) {
                var i = inspections_1[_i];
                if (lookupKeys.indexOf(i.LookupKey) === -1)
                    lookupKeys.push(i.LookupKey);
            }
            var _loop_2 = function (key) {
                var filtered = inspections.filter(function (k) { return k.LookupKey === key; });
                IView.filteredLocations.push(new Location(filtered));
            };
            for (var _a = 0, lookupKeys_1 = lookupKeys; _a < lookupKeys_1.length; _a++) {
                var key = lookupKeys_1[_a];
                _loop_2(key);
            }
            IView.dataLoaded = true;
            IView.BuildAndLoadInitialLayers();
        };
        Location.prototype.LocationView = function () {
            var title = document.getElementById("locationAddress");
            Utilities.Clear_Element(title);
            Utilities.Set_Text(title, this.Address());
            var bulkassignContainer = document.getElementById("bulkAssignInspectionsContainer");
            console.log('Location View Test This', this);
            if (this.can_be_bulk_assigned) {
                Utilities.Show(bulkassignContainer);
                this.UpdateBulkAssignmentDropdown();
            }
            else {
                Utilities.Hide(bulkassignContainer);
            }
            var container = document.getElementById("locationInfoContainer");
            Utilities.Clear_Element(container);
            container.appendChild(this.CreateInspectionTable());
            document.getElementById("locationInfo").classList.add("is-active");
        };
        Location.prototype.Address = function () {
            var i = this.inspections[0];
            return i.StreetAddressCombined + ', ' + i.City + ', ' + i.Zip;
        };
        Location.prototype.CreateInspectionTable = function () {
            var table = document.createElement("table");
            table.classList.add("table");
            table.classList.add("is-fullwidth");
            table.appendChild(this.CreateInspectionTableHeading());
            var tbody = document.createElement("tbody");
            for (var _i = 0, _a = this.inspections; _i < _a.length; _i++) {
                var i = _a[_i];
                tbody.appendChild(this.CreateInspectionRow(i));
            }
            table.appendChild(tbody);
            return table;
        };
        Location.prototype.CreateInspectionTableHeading = function () {
            var thead = document.createElement("thead");
            var tr = document.createElement("tr");
            tr.appendChild(this.CreateTableCell(true, "Permit"));
            tr.appendChild(this.CreateTableCell(true, "Scheduled"));
            tr.appendChild(this.CreateTableCell(true, "Inspection Type"));
            tr.appendChild(this.CreateTableCell(true, "Kind"));
            tr.appendChild(this.CreateTableCell(true, "Private Provider"));
            tr.appendChild(this.CreateTableCell(true, "Status"));
            tr.appendChild(this.CreateTableCell(true, "Assigned"));
            thead.appendChild(tr);
            return thead;
        };
        Location.prototype.CreateTableCell = function (header, value, className) {
            if (className === void 0) { className = ""; }
            var td = document.createElement(header ? "th" : "td");
            if (className.length > 0)
                td.classList.add(className);
            td.appendChild(document.createTextNode(value));
            return td;
        };
        Location.prototype.CreateTableCellLink = function (value, href, className) {
            if (className === void 0) { className = ""; }
            var td = document.createElement("td");
            if (className.length > 0)
                td.classList.add(className);
            var link = document.createElement("a");
            link.href = href;
            link.appendChild(document.createTextNode(value));
            td.appendChild(link);
            return td;
        };
        Location.prototype.CreateInspectionRow = function (inspection) {
            var tr = document.createElement("tr");
            var href = "/InspectionScheduler/#permit=" + inspection.PermitNo + "&inspectionid=" + inspection.InspReqID;
            tr.appendChild(this.CreateTableCellLink(inspection.PermitNo, href));
            tr.appendChild(this.CreateTableCell(false, Utilities.Format_Date(inspection.ScheduledDate)));
            tr.appendChild(this.CreateTableCell(false, inspection.InspectionCode + ' ' + inspection.InspectionDescription));
            tr.appendChild(this.CreateTableCell(false, inspection.IsCommercial ? "Commercial" : "Residential"));
            tr.appendChild(this.CreateTableCell(false, inspection.IsPrivateProvider ? "Yes" : "No"));
            tr.appendChild(this.CreateTableCell(false, inspection.IsCompleted ? "Completed" : "Incomplete"));
            if (inspection.IsCompleted) {
                tr.appendChild(this.CreateTableCell(false, inspection.InspectorName));
            }
            else {
                var td = document.createElement("td");
                td.appendChild(this.CreateInspectorDropdown(inspection));
                tr.appendChild(td);
            }
            return tr;
        };
        Location.prototype.CreateInspectorDropdown = function (inspection) {
            var control = document.createElement("div");
            control.classList.add("control");
            var container = document.createElement("div");
            container.classList.add("select");
            var select = document.createElement("select");
            for (var _i = 0, _a = inspection.ValidInspectors; _i < _a.length; _i++) {
                var i = _a[_i];
                var o = document.createElement("option");
                o.value = i.Name;
                o.selected = (i.Name === inspection.InspectorName);
                o.appendChild(document.createTextNode(i.Name));
                select.appendChild(o);
            }
            select.onchange = function (event) {
                var inspectors = IView.allInspectors.filter(function (i) { return i.Name === Utilities.Get_Value(event.srcElement); });
                var parent = event.srcElement.parentElement;
                if (inspectors.length === 1) {
                    var id = inspectors[0].Id;
                    var inspectionIds = [inspection.InspReqID];
                    IView.Inspection.BulkAssign(id, inspectionIds, parent);
                }
            };
            container.appendChild(select);
            control.appendChild(container);
            return control;
        };
        Location.prototype.UpdateBulkAssignmentDropdown = function () {
            var select = document.getElementById("bulkAssignInspections");
            Utilities.Clear_Element(select);
            var base = document.createElement("option");
            base.value = "";
            base.selected = true;
            base.appendChild(document.createTextNode("Select Inspector"));
            select.appendChild(base);
            for (var _i = 0, _a = this.valid_inspectors; _i < _a.length; _i++) {
                var i = _a[_i];
                var o = document.createElement("option");
                o.value = i.Name;
                o.selected = false;
                o.appendChild(document.createTextNode(i.Name));
                select.appendChild(o);
            }
        };
        return Location;
    }());
    IView.Location = Location;
})(IView || (IView = {}));
//# sourceMappingURL=Location.js.map