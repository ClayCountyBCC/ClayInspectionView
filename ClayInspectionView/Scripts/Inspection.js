/// <reference path="point.ts" />
/// <reference path="ui.ts" />
/// <reference path="app.ts" />
var IView;
(function (IView) {
    var Inspection = /** @class */ (function () {
        function Inspection() {
            this.Age = -1;
            this.ValidInspectors = [];
        }
        Inspection.GetInspections = function () {
            Utilities.Toggle_Loading_Button("refreshButton", true);
            Utilities.Toggle_Loading_Button("filterButton", true);
            var path = Utilities.Get_Path("/inspectionview");
            Utilities.Get(path + "API/Inspections/GetInspections")
                .then(function (inspections) {
                IView.allInspections = inspections;
                Utilities.Toggle_Loading_Button("refreshButton", false);
                Utilities.Toggle_Loading_Button("filterButton", false);
                IView.Location.CreateLocations(IView.ApplyFilters(inspections));
                IView.Inspector.GetInspectorsToEdit();
            }, function (e) {
                console.log('error getting inspectors', e);
                IView.allInspectors = [];
                Utilities.Toggle_Loading_Button("refreshButton", false);
                Utilities.Toggle_Loading_Button("filterButton", false);
            });
            //var x = XHR.Get("API/Inspections/GetInspections");
            //return new Promise<Array<Inspection>>(function (resolve, reject)
            //{
            //  x.then(function (response)
            //  {
            //    let ar: Array<Inspection> = JSON.parse(response.Text);
            //    return resolve(ar);
            //  }).catch(function ()
            //  {
            //    console.log("error in Get Inspections");
            //    return reject(null);
            //  });
            //});
        };
        return Inspection;
    }());
    IView.Inspection = Inspection;
})(IView || (IView = {}));
//# sourceMappingURL=Inspection.js.map