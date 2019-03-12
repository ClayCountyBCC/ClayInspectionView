/// <refrence path="point.ts" />
/// <reference path="ui.ts" />
/// <reference path="app.ts" />
var IView;
(function (IView) {
    var Inspector = /** @class */ (function () {
        function Inspector() {
            this.Id = -1;
            this.Active = false;
            this.Intl = "";
            this.Name = "";
            this.Color = "";
            this.Vehicle = "";
            this.RBL = false;
            this.CBL = false;
            this.REL = false;
            this.CEL = false;
            this.RME = false;
            this.CME = false;
            this.RPL = false;
            this.CPL = false;
            this.Fire = false;
            this.PrivateProvider = false;
            this.CurrentCount = 0;
        }
        Inspector.GetAllInspectors = function () {
            Utilities.Toggle_Loading_Button("refreshButton", true);
            Utilities.Toggle_Loading_Button("filterButton", true);
            var path = Utilities.Get_Path("/inspectionview");
            Utilities.Get(path + "API/Inspectors/List")
                .then(function (inspectors) {
                var initialRun = IView.allInspectors.length === 0;
                console.log('inspectors', inspectors);
                IView.allInspectors = inspectors;
                Inspector.BuildBulkAssignDropdown(inspectors);
                IView.Inspection.GetInspections();
                if (initialRun) {
                    Inspector.BuildInspectorList();
                    IView.LoadDefaultsFromCookie();
                    window.setInterval(IView.Inspection.GetInspections, 60 * 5 * 1000);
                    window.setInterval(IView.Unit.GetUnits, 60 * 1000);
                    Inspector.GetInspectorsToEdit();
                }
            }, function (e) {
                console.log('error getting inspectors');
                IView.allInspectors = [];
            });
        };
        Inspector.GetInspectorsToEdit = function () {
            var path = Utilities.Get_Path("/inspectionview");
            Utilities.Get(path + "API/Inspectors/Edit")
                .then(function (inspectors) {
                console.log('inspectors to edit', inspectors);
                IView.inspectors_to_edit = inspectors;
                if (inspectors.length > 0) {
                    Utilities.Show_Flex("editInspectors");
                    Inspector.BuildInspectorControl(inspectors);
                }
            }, function (e) {
                console.log('error getting inspectors to edit');
            });
        };
        Inspector.BuildBulkAssignDropdown = function (inspectors) {
            var select = document.getElementById("bulkAssignSelect");
            Utilities.Clear_Element(select);
            var base = document.createElement("option");
            base.value = "-1";
            base.selected = true;
            base.appendChild(document.createTextNode("Select Inspector"));
            select.appendChild(base);
            for (var _i = 0, inspectors_1 = inspectors; _i < inspectors_1.length; _i++) {
                var i = inspectors_1[_i];
                var o = document.createElement("option");
                o.value = i.Id.toString();
                o.appendChild(document.createTextNode(i.Name));
                select.appendChild(o);
            }
        };
        Inspector.BuildInspectorList = function () {
            var container = document.getElementById("inspectorList");
            Utilities.Clear_Element(container);
            container.appendChild(Inspector.AddInspector("All"));
            for (var _i = 0, _a = IView.allInspectors; _i < _a.length; _i++) {
                var i = _a[_i];
                container.appendChild(Inspector.AddInspector(i.Name));
            }
            IView.FilterInputEvents();
        };
        Inspector.AddInspector = function (name) {
            var df = document.createDocumentFragment();
            var label = document.createElement("label");
            label.classList.add("label");
            label.classList.add("checkbox");
            label.classList.add("is-medium");
            var input = document.createElement("input");
            input.type = "checkbox";
            input.classList.add("checkbox");
            input.classList.add("is-medium");
            input.name = "inspectorFilter";
            input.value = name;
            input.checked = name === "All";
            label.appendChild(input);
            label.appendChild(document.createTextNode(name));
            df.appendChild(label);
            //df.appendChild(document.createElement("br"));
            return df;
        };
        Inspector.BuildInspectorControl = function (inspectors) {
            var tbody = document.getElementById("inspectorControlList");
            Utilities.Clear_Element(tbody);
            for (var _i = 0, inspectors_2 = inspectors; _i < inspectors_2.length; _i++) {
                var i = inspectors_2[_i];
                if (i.Id !== 0)
                    tbody.appendChild(Inspector.BuildInspectorRow(i));
            }
        };
        Inspector.AddNewInspector = function (inspector) {
            var tbody = document.getElementById("inspectorControlList");
            if (inspector.Id !== 0)
                tbody.appendChild(Inspector.BuildInspectorRow(inspector));
        };
        Inspector.BuildInspectorRow = function (inspector) {
            var id = inspector.Id.toString();
            var tr = document.createElement("tr");
            tr.appendChild(Inspector.CreateInputTableCell(id, "name", inspector.Name));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "active", inspector.Active));
            tr.appendChild(Inspector.CreateTableCell(inspector.Intl));
            tr.appendChild(Inspector.CreateTableCell(inspector.Color));
            tr.appendChild(Inspector.CreateInputTableCell(id, "vehicle", inspector.Vehicle));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "c_b", inspector.CBL));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "c_e", inspector.CEL));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "c_p", inspector.CPL));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "c_m", inspector.CME));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "r_b", inspector.RBL));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "r_e", inspector.REL));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "r_p", inspector.RPL));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "r_m", inspector.RME));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "fire", inspector.Fire));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "private", inspector.PrivateProvider));
            tr.appendChild(Inspector.CreateSaveButtonTableCell(id));
            return tr;
        };
        Inspector.CreateTableCell = function (value) {
            var td = document.createElement("td");
            td.appendChild(document.createTextNode(value));
            return td;
        };
        Inspector.CreateSaveButtonTableCell = function (id) {
            var td = document.createElement("td");
            var control = document.createElement("div");
            control.classList.add("control");
            var button = document.createElement("button");
            button.classList.add("button");
            button.classList.add("is-success");
            button.type = "button";
            button.onclick = function () {
                Utilities.Toggle_Loading_Button(button, true);
                var i = new Inspector();
                i.LoadFromForm(id);
                i.Update(button);
            };
            button.appendChild(document.createTextNode("Save"));
            control.appendChild(button);
            td.appendChild(control);
            return td;
        };
        Inspector.CreateAddButtonTableCell = function (id, tr) {
            var td = document.createElement("td");
            var control = document.createElement("div");
            control.classList.add("control");
            var button = document.createElement("button");
            button.classList.add("button");
            button.classList.add("is-success");
            button.type = "button";
            button.onclick = function () {
                Utilities.Toggle_Loading_Button(button, true);
                var i = new Inspector();
                i.LoadFromForm(id, true);
                if (!i.ValidateInspector())
                    return;
                i.Insert(button, tr);
            };
            button.appendChild(document.createTextNode("Add"));
            control.appendChild(button);
            td.appendChild(control);
            return td;
        };
        Inspector.prototype.ValidateInspector = function () {
            if (this.Name.length === 0) {
                alert("Cannot add new inspector, missing Name.");
                return false;
            }
            if (this.Intl.length === 0) {
                alert("Cannot add new inspector, missing Initials.");
                return false;
            }
            var current = this;
            var initialtest = IView.inspectors_to_edit.filter(function (k) { return k.Intl.toLowerCase() === current.Intl.toLowerCase(); });
            if (initialtest.length > 0) {
                alert("Cannot add new inspector, Initials must be unique.");
                return false;
            }
            if (this.Color.length === 0) {
                alert("Cannot add new inspector, missing Color.  You can use the color assigned to an inactive inspector.");
                return false;
            }
            return true;
        };
        Inspector.CreateInputTableCell = function (id, name, value, max_length) {
            if (max_length === void 0) { max_length = null; }
            var td = document.createElement("td");
            var control = document.createElement("div");
            control.classList.add("control");
            var input = document.createElement("input");
            input.id = id + "_" + name;
            input.type = "text";
            if (max_length !== null)
                input.maxLength = max_length;
            input.classList.add("input");
            input.value = value;
            control.appendChild(input);
            td.appendChild(control);
            return td;
        };
        Inspector.CreateCheckBoxTableCell = function (id, name, checked) {
            var td = document.createElement("td");
            var control = document.createElement("div");
            control.classList.add("control");
            control.classList.add("has-text-centered");
            var input = document.createElement("input");
            input.id = id + "_" + name;
            input.type = "checkbox";
            input.classList.add("checkbox");
            input.checked = checked;
            control.appendChild(input);
            td.appendChild(control);
            return td;
        };
        Inspector.UpdateCurrentCount = function (inspectors, inspections) {
            var byinspector = [];
            var _loop_1 = function (inspector) {
                inspector.CurrentCount = 0;
                byinspector = inspections.filter(function (i) { return i.InspectorName === inspector.Name; });
                inspector.CurrentCount = byinspector.length;
            };
            for (var _i = 0, inspectors_3 = inspectors; _i < inspectors_3.length; _i++) {
                var inspector = inspectors_3[_i];
                _loop_1(inspector);
            }
        };
        Inspector.prototype.LoadFromForm = function (id, all) {
            if (all === void 0) { all = false; }
            this.Id = parseInt(id);
            this.Active = document.getElementById(id + "_active").checked;
            this.Name = Utilities.Get_Value(id + "_name").trim();
            this.Intl = all ? Utilities.Get_Value(id + "_initial").trim() : "";
            this.Color = all ? Utilities.Get_Value(id + "_color").trim() : "";
            this.Vehicle = Utilities.Get_Value(id + "_vehicle").trim();
            this.CBL = document.getElementById(id + "_c_b").checked;
            this.CEL = document.getElementById(id + "_c_e").checked;
            this.CPL = document.getElementById(id + "_c_p").checked;
            this.CME = document.getElementById(id + "_c_m").checked;
            this.RBL = document.getElementById(id + "_r_b").checked;
            this.REL = document.getElementById(id + "_r_e").checked;
            this.RPL = document.getElementById(id + "_r_p").checked;
            this.RME = document.getElementById(id + "_r_m").checked;
            this.Fire = document.getElementById(id + "_fire").checked;
            this.PrivateProvider = document.getElementById(id + "_private").checked;
        };
        Inspector.prototype.Update = function (button) {
            var path = Utilities.Get_Path("/inspectionview");
            Utilities.Post(path + "API/Inspectors/Update/", this)
                .then(function (inspectors) {
                if (inspectors.length === 0) {
                    alert("There was a problem saving your changes.  Please refresh the application and try again.  If this issue persists, please put in a help desk ticket.");
                    return;
                }
                Utilities.Set_Text("inspectorUpdateMessage", "Changes have been made, please refresh this application to see them.");
                IView.allInspectors = inspectors;
                Utilities.Toggle_Loading_Button(button, false);
            }, function (e) {
                console.log('error in Bulk Assign', e);
                Utilities.Toggle_Loading_Button(button, false);
            });
        };
        Inspector.prototype.Insert = function (button, tr) {
            var path = Utilities.Get_Path("/inspectionview");
            Utilities.Post(path + "API/Inspectors/Insert/", this)
                .then(function (inspector) {
                if (inspector === null) {
                    alert("There was a problem saving your changes.  Please refresh the application and try again.  If this issue persists, please put in a help desk ticket.");
                    return;
                }
                Inspector.AddNewInspector(inspector);
                tr.parentElement.removeChild(tr);
                Utilities.Toggle_Loading_Button(button, false);
                Utilities.Set_Text("inspectorUpdateMessage", "Changes have been made, please refresh this application to see them.");
            }, function (e) {
                console.log('error in Bulk Assign', e);
                Utilities.Toggle_Loading_Button(button, false);
            });
        };
        Inspector.AddInspectorToEdit = function () {
            var tbody = document.getElementById("inspectorControlList");
            var id = Inspector.GetNewInspectorId();
            var tr = document.createElement("tr");
            tr.appendChild(Inspector.CreateInputTableCell(id, "name", "", 50));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "active", false));
            tr.appendChild(Inspector.CreateInputTableCell(id, "initial", "", 3));
            tr.appendChild(Inspector.CreateInputTableCell(id, "color", "", 7));
            tr.appendChild(Inspector.CreateInputTableCell(id, "vehicle", "", 10));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "c_b", false));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "c_e", false));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "c_p", false));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "c_m", false));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "r_b", false));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "r_e", false));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "r_p", false));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "r_m", false));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "fire", false));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "private", false));
            tr.appendChild(Inspector.CreateAddButtonTableCell(id, tr));
            tbody.appendChild(tr);
        };
        Inspector.GetNewInspectorId = function () {
            for (var i = 10000; i < 11000; i++) {
                if (!document.getElementById(i.toString() + "_name"))
                    return i.toString();
            }
        };
        return Inspector;
    }());
    IView.Inspector = Inspector;
})(IView || (IView = {}));
//# sourceMappingURL=Inspector.js.map