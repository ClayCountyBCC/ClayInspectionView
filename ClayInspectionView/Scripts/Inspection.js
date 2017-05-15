/// <reference path="point.ts" />
/// <reference path="ui.ts" />
/// <reference path="app.ts" />
var IView;
(function (IView) {
    var Inspection = (function () {
        function Inspection() {
        }
        Inspection.prototype.GetInspections = function (Day, Total) {
            var x = XHR.Get("/API/" + Total + "Inspections/" + Day);
            return new Promise(function (resolve, reject) {
                x.then(function (response) {
                    var ar = JSON.parse(response.Text);
                    return resolve(ar);
                }).catch(function () {
                    console.log("error in Get " + Total + "Inspections for " + Day);
                    return reject(null);
                });
            });
        };
        return Inspection;
    }());
    IView.Inspection = Inspection;
})(IView || (IView = {}));
//# sourceMappingURL=Inspection.js.map