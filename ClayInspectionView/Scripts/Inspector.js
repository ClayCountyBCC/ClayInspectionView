/// <refrence path="point.ts" />
/// <reference path="ui.ts" />
/// <reference path="app.ts" />
var IView;
(function (IView) {
    var Inspector = /** @class */ (function () {
        function Inspector() {
            this.CurrentCount = 0;
        }
        Inspector.GetAllInspectors = function () {
            Utilities.Toggle_Loading_Button("refreshButton", true);
            Utilities.Toggle_Loading_Button("filterButton", true);
            var path = Utilities.Get_Path("/inspectionview");
            Utilities.Get(path + "API/Inspectors/List")
                .then(function (inspectors) {
                console.log('inspectors', inspectors);
                IView.allInspectors = inspectors;
                Inspector.BuildBulkAssignDropdown(inspectors);
                IView.Inspection.GetInspections();
                Inspector.BuildInspectorList();
                window.setInterval(IView.Inspection.GetInspections, 60 * 5 * 1000);
                window.setInterval(IView.Unit.GetUnits, 60 * 1000);
                Inspector.GetInspectorsToEdit();
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
                }
            }, function (e) {
                console.log('error getting inspectors');
                IView.allInspectors = [];
            });
        };
        Inspector.BuildBulkAssignDropdown = function (inspectors) {
            var select = document.getElementById("bulkAssignSelect");
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
        Inspector.BuildInspectorControl = function () {
        };
        Inspector.UpdateCurrentCount = function (inspectors, inspections) {
            var byinspector = [];
            var _loop_1 = function (inspector) {
                inspector.CurrentCount = 0;
                byinspector = inspections.filter(function (i) { return i.InspectorName === inspector.Name; });
                inspector.CurrentCount = byinspector.length;
            };
            for (var _i = 0, inspectors_2 = inspectors; _i < inspectors_2.length; _i++) {
                var inspector = inspectors_2[_i];
                _loop_1(inspector);
            }
        };
        return Inspector;
    }());
    IView.Inspector = Inspector;
})(IView || (IView = {}));
//# sourceMappingURL=Inspector.js.map