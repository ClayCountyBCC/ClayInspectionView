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
            var path = Utilities.Get_Path("/inspectionview");
            Utilities.Get(path + "API/Inspectors/")
                .then(function (inspectors) {
                console.log('inspectors', inspectors);
                IView.allInspectors = inspectors;
                IView.Inspection.GetInspections();
                window.setInterval(IView.Inspection.GetInspections, 60 * 5 * 1000);
                Inspector.BuildInspectorList();
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
            input.checked = true;
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