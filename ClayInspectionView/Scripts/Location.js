var IView;
(function (IView) {
    var Location = /** @class */ (function () {
        function Location(inspections, myInspections) {
            if (myInspections === void 0) { myInspections = false; }
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
            this.order = 0;
            this.unordered = true;
            this.inspections = inspections;
            if (inspections.length === 0)
                return;
            var i = inspections[0];
            this.lookup_key = i.LookupKey;
            this.point_to_use = i.PointToUse;
            if (!myInspections) {
                this.UpdateFlags();
                this.CreateIcons();
                this.AddValidInspectors(IView.allInspectors);
            }
            else {
                // let's check each inspection to pull out the max index and set that as the sort order.
                this.location_distance = new IView.LocationDistance(this.point_to_use);
                this.order = 0;
                for (var _i = 0, inspections_1 = inspections; _i < inspections_1.length; _i++) {
                    var i_1 = inspections_1[_i];
                    if (i_1.Sort_Order > this.order)
                        this.order = i_1.Sort_Order;
                }
                this.unordered = this.order === 0;
                if (this.unordered)
                    this.order = 999;
            }
        }
        Location.prototype.CreateSortedIcon = function () {
            // this is our base function that we'll use to simplify our icon creation.
            var d = new dojo.Deferred();
            var currentLocation = this;
            require(["esri/symbols/TextSymbol", "esri/Color", "esri/symbols/Font"], function (TextSymbol, Color, Font) {
                var textSymbol = new TextSymbol(currentLocation.order.toString());
                textSymbol.setColor(new Color([0, 0, 0]));
                textSymbol.rotated = false;
                textSymbol.setOffset(0, 0);
                textSymbol.setAlign(TextSymbol.ALIGN_MIDDLE);
                //textSymbol.haloColor = new Color([255, 255, 255]);
                //textSymbol.haloSize = 3;
                var font = new Font();
                font.setSize("20pt");
                font.setWeight(esri.symbol.Font.WEIGHT_BOLD);
                textSymbol.setFont(font);
                d.resolve(textSymbol);
            });
            return d.then(function (k) { return k; });
        };
        Location.prototype.GetSortedIcon = function () {
            return this.CreateSortedIcon();
        };
        Location.prototype.UpdateFlags = function () {
            // this will update the has_commercial, residential, and private provider flags.
            // they'll be set to false, then we just loop through them all and update them to true
            // if we find any
            this.assigned_inspectors = [];
            for (var _i = 0, _a = this.inspections; _i < _a.length; _i++) {
                var i = _a[_i];
                if (!IView.contractor_check) {
                    if (!i.CanBeAssigned)
                        this.can_be_bulk_assigned = false;
                }
                else {
                    this.can_be_bulk_assigned = false;
                    i.CanBeAssigned = false;
                }
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
            if (!this.can_be_bulk_assigned) {
                return;
            }
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
            for (var _i = 0, inspections_2 = inspections; _i < inspections_2.length; _i++) {
                var i = inspections_2[_i];
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
        Location.CreateMyLocations = function (inspections) {
            if (inspections.length === 0)
                return;
            var lookupKeys = [];
            var locations = [];
            if (inspections.length === 0)
                return [];
            for (var _i = 0, inspections_3 = inspections; _i < inspections_3.length; _i++) {
                var i = inspections_3[_i];
                if (lookupKeys.indexOf(i.LookupKey) === -1)
                    lookupKeys.push(i.LookupKey);
            }
            var _loop_3 = function (key) {
                var filtered = inspections.filter(function (k) { return k.LookupKey === key; });
                locations.push(new Location(filtered, true));
            };
            for (var _a = 0, lookupKeys_2 = lookupKeys; _a < lookupKeys_2.length; _a++) {
                var key = lookupKeys_2[_a];
                _loop_3(key);
            }
            locations.sort(function (j, k) { return j.order - k.order; }); // now that we've ordered it, let's get the locations in the right order.
            var order = 0;
            for (var i = 0; i < locations.length; i++) {
                if (!locations[i].unordered) {
                    locations[i].order = ++order; // all ordered locations are base 1, not base 0. 
                }
                //  //locations[i].CreateSortedIcon().then(function (k)
                //  //{
                //  //  locations[i].icons.push(k);
                //  //});
            }
            return locations;
        };
        Location.prototype.LocationView = function () {
            var title = document.getElementById("locationAddress");
            Utilities.Clear_Element(title);
            Utilities.Set_Text(title, this.Address());
            var bulkassignContainer = document.getElementById("bulkAssignInspectionsContainer");
            if (this.can_be_bulk_assigned && !IView.contractor_check) {
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
            var master_permit = null;
            for (var _i = 0, _a = this.inspections; _i < _a.length; _i++) {
                var i = _a[_i];
                if (master_permit === null || master_permit !== i.MasterPermitNumber) {
                    // if it's null, we just started so we're going to build whatever is there.
                    tbody.appendChild(this.BuildMasterPermitPropUseRow(i));
                    master_permit = i.MasterPermitNumber;
                }
                var notes_row = null;
                if (i.PermitNo.substr(0, 1) !== '1') {
                    notes_row = document.createElement("tr");
                }
                tbody.appendChild(this.CreateInspectionRow(i, notes_row));
                if (i.PreviousInspectionRemarks.length > 0)
                    tbody.appendChild(this.CreatePreviouslyFailedInspectionRow(i.PreviousInspectionRemarks));
                if (notes_row !== null)
                    tbody.appendChild(notes_row);
            }
            table.appendChild(tbody);
            return table;
        };
        Location.prototype.BuildMasterPermitPropUseRow = function (inspection) {
            var tr = document.createElement("tr");
            if (inspection.MasterPermitNumber.length > 0) {
                var href = "/InspectionScheduler/#permit=" + inspection.MasterPermitNumber;
                var MasterTd = this.CreateTableCellLink(inspection.MasterPermitNumber, href, "has-text-left");
                var imsButton = document.createElement("a");
                imsButton.classList.add("button");
                imsButton.classList.add("is-small");
                imsButton.classList.add("is-success");
                imsButton.style.marginLeft = ".5em";
                imsButton.style.fontStyle = "italic";
                imsButton.target = "_blank";
                imsButton.rel = "noopener";
                imsButton.appendChild(document.createTextNode("IMS"));
                imsButton.href = inspection.MasterPermitIMSLink;
                MasterTd.appendChild(imsButton);
                tr.appendChild(MasterTd);
                var td = document.createElement("td");
                td.colSpan = 7;
                td.classList.add("has-text-left");
                td.appendChild(document.createTextNode(inspection.PropUseInfo));
                tr.appendChild(td);
            }
            else {
                tr.appendChild(document.createElement("td"));
                var td = document.createElement("td");
                td.colSpan = 7;
                td.classList.add("has-text-left");
                td.appendChild(document.createTextNode("NO MASTER PERMIT"));
                tr.appendChild(td);
            }
            return tr;
        };
        Location.prototype.CreateInspectionTableHeading = function () {
            var thead = document.createElement("thead");
            var tr = document.createElement("tr");
            tr.appendChild(this.CreateTableCell(true, "Permit", "", "15%"));
            tr.appendChild(this.CreateTableCell(true, "Scheduled", "", "15%"));
            tr.appendChild(this.CreateTableCell(true, "Inspection Type", "", "20%"));
            var button_column = this.CreateTableCell(true, "");
            button_column.style.width = "5%";
            tr.appendChild(button_column);
            tr.appendChild(this.CreateTableCell(true, "Kind", "", "10%"));
            tr.appendChild(this.CreateTableCell(true, "Private Provider", "", "10%"));
            tr.appendChild(this.CreateTableCell(true, "Status", "", "15%"));
            tr.appendChild(this.CreateTableCell(true, "Assigned", "", "15%"));
            thead.appendChild(tr);
            return thead;
        };
        Location.prototype.CreateTableCell = function (header, value, className, width) {
            if (className === void 0) { className = ""; }
            if (width === void 0) { width = ""; }
            var td = document.createElement(header ? "th" : "td");
            if (width.length > 0)
                td.style.width = width;
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
            link.target = "_blank";
            link.rel = "noopener";
            link.href = href;
            link.appendChild(document.createTextNode(value));
            td.appendChild(link);
            return td;
        };
        Location.prototype.CreateInspectionRow = function (inspection, notes_row) {
            var tr = document.createElement("tr");
            var href = "/InspectionScheduler/#permit=" + inspection.PermitNo + "&inspectionid=" + inspection.InspReqID;
            var td = this.CreateTableCellLink(inspection.PermitNo, href, "has-text-right");
            var imsButton = document.createElement("a");
            imsButton.classList.add("button");
            imsButton.classList.add("is-small");
            imsButton.classList.add("is-success");
            imsButton.style.marginLeft = ".5em";
            imsButton.style.fontStyle = "italic";
            imsButton.target = "_blank";
            imsButton.rel = "noopener";
            imsButton.appendChild(document.createTextNode("IMS"));
            imsButton.href = inspection.IMSLink;
            td.appendChild(imsButton);
            tr.appendChild(td);
            tr.appendChild(this.CreateTableCell(false, Utilities.Format_Date(inspection.ScheduledDate)));
            tr.appendChild(this.CreateTableCell(false, inspection.InspectionCode + ' ' + inspection.InspectionDescription, "has-text-left"));
            var button_td = document.createElement("td");
            if (inspection.PermitNo.substr(0, 1) !== '1') {
                var notes_button_1 = document.createElement("button");
                notes_button_1.type = "button";
                notes_button_1.classList.add("button");
                notes_button_1.classList.add("is-info");
                notes_button_1.classList.add("is-small");
                notes_button_1.appendChild(document.createTextNode("Notes"));
                notes_button_1.onclick = function () {
                    if (notes_row.childElementCount === 0) {
                        // we haven't rendered anything yet
                        var base_td = document.createElement("td");
                        base_td.colSpan = 8;
                        IView.Inspection.GetPermitNotes(inspection.PermitNo, notes_button_1, base_td);
                        //base_td.appendChild(document.createTextNode("Test"));
                        notes_row.appendChild(base_td);
                    }
                    else {
                        notes_row.style.display = notes_row.style.display === "" ? "none" : "";
                        //console.log('notes_row display', notes_row.style.display);
                        //if (notes_row.style.display === "")
                        //{
                        //  notes_row.style.display = "none";
                        //}
                        //else
                        //{
                        //  notes_row.style.display = "table-row";
                        //}
                        return;
                    }
                };
                button_td.appendChild(notes_button_1);
            }
            tr.appendChild(button_td);
            tr.appendChild(this.CreateTableCell(false, inspection.IsCommercial ? "Commercial" : "Residential"));
            tr.appendChild(this.CreateTableCell(false, inspection.IsPrivateProvider ? "Yes" : "No"));
            tr.appendChild(this.CreateTableCell(false, inspection.IsCompleted ? "Completed" : "Incomplete"));
            if (inspection.IsCompleted || IView.contractor_check) {
                tr.appendChild(this.CreateTableCell(false, inspection.InspectorName));
            }
            else {
                var td_1 = document.createElement("td");
                td_1.appendChild(this.CreateInspectorDropdown(inspection));
                tr.appendChild(td_1);
            }
            return tr;
        };
        Location.prototype.CreatePreviouslyFailedInspectionRow = function (Remarks) {
            var tr = document.createElement("tr");
            var blankTD = document.createElement("td");
            blankTD.appendChild(document.createTextNode(""));
            tr.appendChild(blankTD);
            var messageTD = document.createElement("td");
            messageTD.appendChild(document.createTextNode("Failed Last Inspection"));
            messageTD.colSpan = 2;
            tr.appendChild(messageTD);
            var remarksTD = document.createElement("td");
            remarksTD.appendChild(document.createTextNode(Remarks));
            remarksTD.colSpan = 5;
            tr.appendChild(remarksTD);
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
        Location.HandleMyLocations = function (inspections) {
            if (inspections.length === 0) {
                IView.myLocations = [];
                Location.UpdateMyLocations();
                return;
            }
            var myLocations = Location.CreateMyLocations(inspections);
            //console.log('my locations', myLocations);
            var ordered = myLocations.filter(function (j) { return j.unordered === false; });
            if (IView.myLocations.length === 0 && ordered.length === 0) {
                // fresh
                //console.log('fresh');
                myLocations = Location.UpdateLocationDistances(myLocations, true);
                var furthest_locations_distance = 0;
                var furthest_locations = [];
                for (var i = 0; i < myLocations.length; i++) {
                    if (myLocations[i].location_distance.furthest_location_distance > furthest_locations_distance) {
                        furthest_locations = [];
                        furthest_locations_distance = myLocations[i].location_distance.furthest_location_distance;
                        furthest_locations.push(myLocations[i].location_distance.furthest_location);
                        furthest_locations.push(myLocations[i].lookup_key);
                    }
                }
                IView.myLocations = Location.SortByProximity(myLocations, furthest_locations[0]);
            }
            else {
                //console.log('not fresh');
                myLocations = Location.UpdateLocationDistances(myLocations, false);
                if (IView.myLocations.length === 0 && ordered.length > 0) {
                    IView.myLocations = myLocations;
                    Location.HandleUnorderedLocations();
                }
                else {
                    Location.RemoveMissingFromCurrent(myLocations);
                    Location.AddNewLocations(myLocations);
                }
                // let's add the new ones to the list, remove any that aren't there anymore
            }
            Location.UpdateMyLocations();
        };
        Location.UpdateLocationDistances = function (locations, fresh) {
            for (var i = 0; i < locations.length; i++) {
                if (fresh)
                    locations[i].unordered = false;
                for (var j = 0; j < locations.length; j++) {
                    if (i !== j) {
                        locations[i].location_distance.calculate_distance(locations[j].point_to_use, locations[j].lookup_key);
                    }
                }
            }
            return locations;
        };
        Location.UpdateMyLocations = function () {
            IView.myLocations.sort(function (j, k) { return j.order - k.order; });
            Location.PopulateMyLocations(IView.myLocations);
            IView.mapController.UpdateMyLocationLayer(IView.myLocations);
        };
        Location.RemoveMissingFromCurrent = function (new_locations) {
            var locations_to_remove = [];
            for (var _i = 0, _a = IView.myLocations; _i < _a.length; _i++) {
                var location_1 = _a[_i];
                var found = false;
                for (var _b = 0, new_locations_1 = new_locations; _b < new_locations_1.length; _b++) {
                    var new_location = new_locations_1[_b];
                    if (new_location.lookup_key === location_1.lookup_key) {
                        found = true;
                    }
                }
                if (!found) // this location was removed
                 {
                    locations_to_remove.push(location_1.lookup_key);
                }
            }
            for (var _c = 0, locations_to_remove_1 = locations_to_remove; _c < locations_to_remove_1.length; _c++) {
                var key = locations_to_remove_1[_c];
                var index = Location.GetLocationIndex(key, IView.myLocations);
                if (index !== -1)
                    IView.myLocations.splice(index, 1);
            }
        };
        Location.GetLocationIndex = function (lookup_key, LocationsToSearch) {
            for (var i = 0; i < LocationsToSearch.length; i++) {
                if (LocationsToSearch[i].lookup_key === lookup_key)
                    return i;
            }
            return -1;
        };
        Location.AddNewLocations = function (new_locations) {
            var added = false;
            for (var _i = 0, new_locations_2 = new_locations; _i < new_locations_2.length; _i++) {
                var new_location = new_locations_2[_i];
                var found = false;
                for (var _a = 0, _b = IView.myLocations; _a < _b.length; _a++) {
                    var current_location_1 = _b[_a];
                    if (new_location.lookup_key === current_location_1.lookup_key) {
                        found = true;
                    }
                }
                if (!found) {
                    new_location.unordered = true;
                    IView.myLocations.push(new_location);
                    new_location.order = 999;
                    added = true;
                    //console.log('adding', new_location);
                    //let my_order = new_location.location_distance.GetBestOrderToInsert(IView.myLocations);          
                    //for (let l of IView.myLocations)
                    //{
                    //  if (l.order >= my_order && !l.unordered)
                    //  {
                    //    l.order++;
                    //  }
                    //}
                    //new_location.order = my_order;
                }
            }
            if (added) {
                for (var _c = 0, _d = IView.myLocations; _c < _d.length; _c++) {
                    var l = _d[_c];
                    if (l.unordered)
                        l.order = 999;
                }
                IView.myLocations.sort(function (j, k) { return j.order - k.order; });
                IView.myLocations = Location.UpdateLocationDistances(IView.myLocations, false);
                Location.HandleUnorderedLocations();
            }
        };
        Location.HandleUnorderedLocations = function () {
            for (var _i = 0, _a = IView.myLocations; _i < _a.length; _i++) {
                var l = _a[_i];
                if (l.unordered) {
                    var my_order = l.location_distance.GetBestOrderToInsert(IView.myLocations);
                    //console.log('setting order', l.lookup_key, my_order);
                    for (var _b = 0, _c = IView.myLocations; _b < _c.length; _b++) {
                        var location_2 = _c[_b];
                        if (location_2.order >= my_order && location_2.order < 998) {
                            location_2.order++;
                        }
                    }
                    l.order = my_order;
                }
            }
        };
        Location.PopulateMyLocations = function (locations) {
            var container = document.getElementById("sortableInspections");
            Utilities.Clear_Element(container);
            if (locations.length === 0) {
                var li = document.createElement("li");
                li.appendChild(document.createTextNode("No incomplete inspections were found."));
                li.style.padding = "1em 1em 1em 1em";
                container.appendChild(li);
            }
            else {
                for (var _i = 0, locations_1 = locations; _i < locations_1.length; _i++) {
                    var l = locations_1[_i];
                    container.appendChild(Location.CreateMyLocationRow(l));
                }
            }
        };
        Location.CreateMyLocationRow = function (location) {
            var li = document.createElement("li");
            li.id = location.lookup_key;
            li.classList.add("columns");
            //li.classList.add("item");
            //li.classList.add("dropzone");
            //li.classList.add("occupied");
            li.style.borderTop = "none"; //"dotted 1px #333333";
            li.style.borderBottom = "none"; //"dotted 1px #000000";
            li.style.margin = "0 auto";
            li.style.marginBottom = ".25em";
            if (location.unordered) {
                li.classList.add("has-background-warning");
            }
            else {
                li.classList.add("has-background-grey-lighter");
            }
            var index = document.createElement("span");
            index.classList.add("column");
            index.classList.add("is-1");
            index.classList.add("has-text-centered");
            index.style.fontWeight = "bolder";
            index.appendChild(document.createTextNode(location.order.toString()));
            li.appendChild(index);
            var address = document.createElement("span");
            address.classList.add("column");
            address.classList.add("is-8");
            address.appendChild(document.createTextNode(location.Address()));
            li.appendChild(address);
            var permitCount = document.createElement("span");
            permitCount.classList.add("column");
            permitCount.classList.add("is-1");
            permitCount.classList.add("has-text-centered");
            permitCount.appendChild(document.createTextNode(location.inspections.length.toString()));
            li.appendChild(permitCount);
            var view = document.createElement("span");
            view.classList.add("column");
            view.classList.add("is-2");
            view.classList.add("has-text-centered");
            var button = document.createElement("button");
            button.classList.add("button");
            button.classList.add("is-small");
            button.appendChild(document.createTextNode("View"));
            button.onclick = function () {
                IView.last_selected_graphic = null;
                IView.last_symbol_color = null;
                IView.current_location = location;
                console.log('location found', location);
                IView.mapController.CenterOnPoint(location.point_to_use);
                location.LocationView();
            };
            view.appendChild(button);
            li.appendChild(view);
            return li;
        };
        Location.SortByProximity = function (locations, starting_lookup_key) {
            if (starting_lookup_key.length === 0 || locations.length <= 2)
                return locations;
            var ordered_locations = [];
            var used_lookup_keys = [];
            used_lookup_keys.push(starting_lookup_key);
            var first_location = locations[Location.GetLocationIndex(starting_lookup_key, locations)];
            ordered_locations.push(first_location);
            var second_location = locations[Location.GetLocationIndex(first_location.location_distance.closest_location, locations)];
            ordered_locations.push(second_location);
            used_lookup_keys.push(second_location.lookup_key);
            var location = second_location;
            var lookup_key = "";
            var index = 0;
            var i = 0;
            while (used_lookup_keys.length < locations.length || i < 50) {
                lookup_key = location.location_distance.GetClosestUnused(used_lookup_keys);
                if (lookup_key.length == 0)
                    break;
                index = Location.GetLocationIndex(lookup_key, locations);
                if (index === -1)
                    break;
                location = locations[index];
                ordered_locations.push(location);
                used_lookup_keys.push(lookup_key);
                i++;
            }
            for (var i_2 = 0; i_2 < ordered_locations.length; i_2++) {
                ordered_locations[i_2].order = i_2 + 1;
                if (ordered_locations[i_2].unordered)
                    ordered_locations[i_2].unordered = false;
            }
            return ordered_locations;
        };
        Location.SaveMyLocations = function () {
        };
        return Location;
    }());
    IView.Location = Location;
})(IView || (IView = {}));
//# sourceMappingURL=Location.js.map