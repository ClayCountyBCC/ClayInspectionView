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
        Inspection.prototype.BulkAssign = function (InspectorId, InspectionIds) {
            var button = document.getElementById("BulkAssignButton");
            IView.toggle('showSpin', true);
            var AssignData = {
                InspectorId: InspectorId,
                InspectionIds: InspectionIds
            };
            var x = XHR.Post("API/Assign/BulkAssign/", JSON.stringify(AssignData));
            new Promise(function (resolve, reject) {
                x.then(function (response) {
                    IView.GetAllInspections();
                    IView.toggle('showSpin', false);
                    button.textContent = "Bulk Assign";
                }).catch(function () {
                    console.log("error in Bulk Assign Inspections");
                    IView.toggle('showSpin', false);
                    button.textContent = "Bulk Assign";
                });
            });
        };
        return Inspection;
    }());
    IView.Inspection = Inspection;
})(IView || (IView = {}));
//# sourceMappingURL=Inspection.js.map