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
                console.log('units', units);
                IView.allUnits = units;
                console.log('build units layer');
            }, function (e) {
                console.log('error getting units');
                IView.allUnits = [];
            });
        };
        return Unit;
    }());
    IView.Unit = Unit;
})(IView || (IView = {}));
//# sourceMappingURL=unit.js.map