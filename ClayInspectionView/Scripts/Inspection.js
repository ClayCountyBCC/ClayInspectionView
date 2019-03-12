/// <reference path="point.ts" />
/// <reference path="ui.ts" />
/// <reference path="app.ts" />
var IView;
(function (IView) {
    var Inspection = /** @class */ (function () {
        function Inspection() {
            this.MasterPermitNumber = "";
            this.PropUseInfo = "";
            this.Age = -1;
            this.ValidInspectors = [];
        }
        Inspection.GetValidInspectors = function (inspection) {
            return IView.allInspectors.filter(function (i) {
                return ((inspection.RBL === i.RBL === true) || !inspection.RBL) &&
                    ((inspection.CBL === i.CBL === true) || !inspection.CBL) &&
                    ((inspection.REL === i.REL === true) || !inspection.REL) &&
                    ((inspection.CEL === i.CEL === true) || !inspection.CEL) &&
                    ((inspection.RME === i.RME === true) || !inspection.RME) &&
                    ((inspection.CME === i.CME === true) || !inspection.CME) &&
                    ((inspection.RPL === i.RPL === true) || !inspection.RPL) &&
                    ((inspection.CPL === i.CPL === true) || !inspection.CPL) &&
                    ((inspection.Fire === i.Fire === true) || !inspection.Fire);
            });
        };
        Inspection.GetInspections = function () {
            Utilities.Toggle_Loading_Button("refreshButton", true);
            Utilities.Toggle_Loading_Button("filterButton", true);
            var path = Utilities.Get_Path("/inspectionview");
            Utilities.Get(path + "API/Inspections/GetInspections")
                .then(function (inspections) {
                Inspection.HandleInspections(inspections);
                Utilities.Toggle_Loading_Button("refreshButton", false);
                Utilities.Toggle_Loading_Button("filterButton", false);
            }, function (e) {
                console.log('error getting inspectors', e);
                IView.allInspectors = [];
                Utilities.Toggle_Loading_Button("refreshButton", false);
                Utilities.Toggle_Loading_Button("filterButton", false);
            });
        };
        Inspection.GetPermitNotes = function (PermitNo, button, target) {
            if (PermitNo.length === 0)
                return;
            Utilities.Toggle_Loading_Button(button, true);
            var path = Utilities.Get_Path("/inspectionview");
            Utilities.Get(path + "API/Inspections/GetPermitNotes?PermitNo=" + PermitNo)
                .then(function (notes) {
                if (notes.length > 0) {
                    for (var _i = 0, notes_1 = notes; _i < notes_1.length; _i++) {
                        var n = notes_1[_i];
                        var p = document.createElement("p");
                        p.classList.add("has-text-left");
                        p.appendChild(document.createTextNode(IView.Strip_Html(n)));
                        target.appendChild(p);
                    }
                }
                else {
                    var p = document.createElement("p");
                    p.classList.add("has-text-left");
                    p.appendChild(document.createTextNode("No notes found."));
                    target.appendChild(p);
                }
                Utilities.Toggle_Loading_Button(button, false);
            }, function (e) {
                console.log('error getting permit notes', e);
                Utilities.Toggle_Loading_Button(button, false);
            });
        };
        Inspection.HandleInspections = function (inspections) {
            for (var _i = 0, inspections_1 = inspections; _i < inspections_1.length; _i++) {
                var i = inspections_1[_i];
                i.ValidInspectors = Inspection.GetValidInspectors(i);
            }
            IView.allInspections = inspections;
            IView.Location.CreateLocations(IView.ApplyFilters(inspections));
            if (IView.current_location !== null) {
                var locations = IView.filteredLocations.filter(function (i) { return i.lookup_key === IView.current_location.lookup_key; });
                if (locations.length === 1) {
                    IView.current_location = locations[0];
                    IView.current_location.LocationView();
                }
            }
        };
        Inspection.BulkAssign = function (InspectorId, InspectionIds, parentElement) {
            if (parentElement === void 0) { parentElement = undefined; }
            if (InspectionIds.length === 0)
                return;
            if (parentElement)
                parentElement.classList.add("is-loading");
            var button = document.getElementById("bulkAssignButton");
            Utilities.Toggle_Loading_Button(button, true);
            var path = Utilities.Get_Path("/inspectionview");
            //IView.toggle('showSpin', true);
            var AssignData = {
                InspectorId: InspectorId,
                InspectionIds: InspectionIds
            };
            Utilities.Post(path + "API/Assign/BulkAssign/", AssignData)
                .then(function (inspections) {
                Utilities.Toggle_Loading_Button(button, false);
                if (inspections.length === 0) {
                    alert("Server error in Bulk Assign.");
                    return;
                }
                Inspection.HandleInspections(inspections);
                if (parentElement)
                    parentElement.classList.remove("is-loading");
            }, function (e) {
                console.log('error in Bulk Assign', e);
                Utilities.Toggle_Loading_Button(button, false);
                if (parentElement)
                    parentElement.classList.remove("is-loading");
            });
            //new Promise<boolean>(function (resolve, reject)
            //{
            //  x.then(function (response)
            //  {
            //    IView.GetAllInspections();
            //    IView.toggle('showSpin', false);
            //    button.textContent = "Bulk Assign";
            //  }).catch(function ()
            //  {
            //    console.log("error in Bulk Assign Inspections");
            //    IView.toggle('showSpin', false);
            //    button.textContent = "Bulk Assign";
            //  });
        };
        return Inspection;
    }());
    IView.Inspection = Inspection;
})(IView || (IView = {}));
//# sourceMappingURL=Inspection.js.map