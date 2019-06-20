var IView;
(function (IView) {
    var ReorderData = /** @class */ (function () {
        function ReorderData(id, order) {
            this.inspection_id = id;
            this.inspection_order = order;
        }
        ReorderData.Save = function (button) {
            // this function will save the order of whatever items are in the IView.myLocations array
            Utilities.Toggle_Loading_Button(button, true);
            var data = [];
            for (var _i = 0, _a = IView.myLocations; _i < _a.length; _i++) {
                var location_1 = _a[_i];
                location_1.unordered = false;
                for (var _b = 0, _c = location_1.inspections; _b < _c.length; _b++) {
                    var inspection = _c[_b];
                    data.push(new ReorderData(inspection.InspReqID, location_1.order));
                }
            }
            var path = Utilities.Get_Path("/inspectionview");
            Utilities.Post(path + "API/Inspections/Reorder", data)
                .then(function (inspections) {
                if (inspections.length === 0) {
                    alert("There was an error saving the order, your changes might not be saved.");
                    Utilities.Toggle_Loading_Button(button, false);
                    return;
                }
                IView.Inspection.HandleInspections(inspections);
                Utilities.Toggle_Loading_Button(button, false);
            }, function (e) {
                console.log('error in Reordering Insepctions', e);
                Utilities.Toggle_Loading_Button(button, false);
            });
        };
        return ReorderData;
    }());
    IView.ReorderData = ReorderData;
})(IView || (IView = {}));
//# sourceMappingURL=ReorderData.js.map