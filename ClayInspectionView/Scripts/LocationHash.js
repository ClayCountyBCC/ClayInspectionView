var IView;
(function (IView) {
    var LocationHash // implements ILocationHash
     = /** @class */ (function () {
        function LocationHash(locationHash) {
            this.InspectionId = 0;
            var ha = locationHash.split("&");
            for (var i = 0; i < ha.length; i++) {
                var k = ha[i].split("=");
                switch (k[0].toLowerCase()) {
                    case "inspectionid":
                        this.InspectionId = parseInt(k[1]);
                        break;
                }
            }
        }
        LocationHash.prototype.ToHash = function () {
            var h = "";
            if (this.InspectionId > 0)
                h += "&inspectionid=" + this.InspectionId.toString();
            if (h.length > 0)
                h = "#" + h.substring(1);
            return h;
        };
        return LocationHash;
    }());
    IView.LocationHash = LocationHash;
})(IView || (IView = {}));
//# sourceMappingURL=LocationHash.js.map