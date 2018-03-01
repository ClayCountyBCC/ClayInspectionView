/// <reference path="point.ts" />
/// <reference path="ui.ts" />
/// <reference path="app.ts" />
var IView;
(function (IView) {
    var Inspection = /** @class */ (function () {
        function Inspection() {
        }
        Inspection.prototype.GetInspections = function () {
            var x = XHR.Get("API/Inspections/GetInspections");
            return new Promise(function (resolve, reject) {
                x.then(function (response) {
                    var ar = JSON.parse(response.Text);
                    return resolve(ar);
                }).catch(function () {
                    console.log("error in Get Inspections");
                    return reject(null);
                });
            });
        };
        Inspection.prototype.Assign = function (InspectorId, LookupKey, Day) {
            var x = XHR.Put("API/Assign/" + LookupKey + "/" + InspectorId.toString() + "/" + Day);
            new Promise(function (resolve, reject) {
                x.then(function (response) {
                }).catch(function () {
                    console.log("error in Assign Inspections");
                });
            });
        };
        return Inspection;
    }());
    IView.Inspection = Inspection;
})(IView || (IView = {}));
//# sourceMappingURL=Inspection.js.map