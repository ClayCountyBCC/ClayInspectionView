/// <reference path="point.ts" />
/// <reference path="ui.ts" />
/// <reference path="app.ts" />
var IView;
(function (IView) {
    var Inspector = /** @class */ (function () {
        function Inspector() {
        }
        Inspector.GetAllInspectors = function () {
            Utilities.Toggle_Loading_Button("refreshButton", true);
            Utilities.Toggle_Loading_Button("filterButton", true);
            var path = Utilities.Get_Path("/inspectionview");
            Utilities.Get(path + "API/Inspectors/List")
                .then(function (inspectors) {
                console.log('inspectors', inspectors);
                IView.allInspectors = inspectors;
                IView.Inspection.GetInspections();
                IView.Unit.GetUnits();
                window.setInterval(IView.Inspection.GetInspections, 60 * 5 * 1000);
                window.setInterval(IView.Unit.GetUnits, 60 * 1000);
                Inspector.BuildInspectorList();
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
                    Utilities.Show_Inline_Flex("editInspectors");
                }
            }, function (e) {
                console.log('error getting inspectors');
                IView.allInspectors = [];
            });
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
        return Inspector;
    }());
    IView.Inspector = Inspector;
})(IView || (IView = {}));
//# sourceMappingURL=Inspector.js.map