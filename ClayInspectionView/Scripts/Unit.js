/// <reference path="point.ts" />
/// <reference path="ui.ts" />
/// <reference path="app.ts" />
var IView;
(function (IView) {
    var Unit = /** @class */ (function () {
        function Unit() {
        }
        Unit.GetUnits = function () {
            var path = Utilities.Get_Path("/inspectionview");
            Utilities.Get(path + "API/Unit/List")
                .then(function (units) {
                IView.allUnits = units;
                IView.mapController.UpdateUnitLayer(units);
            }, function (e) {
                console.log('error getting units');
                IView.allUnits = [];
            });
        };
        Unit.UnitView = function (unit) {
            var ol = document.createElement("ol");
            var li = document.createElement("li");
            li.appendChild(document.createTextNode("Date Last Updated: " + Utilities.Format_DateTime(unit.Date_Last_Communicated)));
            ol.appendChild(li);
            return ol.outerHTML;
        };
        return Unit;
    }());
    IView.Unit = Unit;
})(IView || (IView = {}));
//# sourceMappingURL=unit.js.map