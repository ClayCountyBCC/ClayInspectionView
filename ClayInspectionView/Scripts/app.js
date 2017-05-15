/// <reference path="map.ts" />
//import MapController from "./map";
var IView;
(function (IView) {
    function Start() {
        // things to do:
        // setup default map
        IView.mapController = new IView.MapController("map");
        // get the data for today/tomorrow
        UpdateInspectors();
        // update the counts
        // draw the layers
    }
    IView.Start = Start;
    function UpdateAllInspections() {
        UpdateInspections("Today", "", IView.todayInspections);
        UpdateInspections("Today", "Total", IView.todayTotalInspections);
        UpdateInspections("Tomorrow", "", IView.tomorrowInspections);
        UpdateInspections("Tomorrow", "Total", IView.tomorrowTotalInspections);
    }
    function UpdateInspections(Day, Total, insp) {
        var i = new IView.Inspection();
        i.GetInspections(Day, Total).then(function (inspections) {
            console.log(Total + ' inspections ' + Day, inspections);
            insp = inspections;
        }, function () {
            console.log('error getting ' + Total + ' inspections ' + Day);
            insp = [];
        });
    }
    function UpdateInspectors() {
        var i = new IView.Inspector();
        i.GetInspectors().then(function (inspectors) {
            console.log("Inspectors", inspectors);
            IView.allInspectors = inspectors;
            UpdateAllInspections();
        }, function () {
            console.log('error getting inspectors');
            // do something with the error here
            IView.allInspectors = [];
        });
    }
})(IView || (IView = {}));
//# sourceMappingURL=app.js.map