var IView;
(function (IView) {
    var LocationDistance = /** @class */ (function () {
        function LocationDistance(point) {
            // connection location a
            this.link_location = ""; // lookup key
            this.link_distance = 999999;
            this.closest_location = ""; // lookup key
            this.closest_location_distance = 999999;
            this.next_location = ""; // lookup key
            this.next_location_distance = 999999;
            this.furthest_location = ""; // lookup key
            this.furthest_location_distance = 0;
            this.lookup_keys = [];
            this.my_point = point;
        }
        LocationDistance.prototype.calculate_distance = function (compare_point, compare_lookup_key) {
            if (this[compare_lookup_key] !== undefined)
                return this[compare_lookup_key];
            var mylocation = this;
            return require(["esri/geometry/Point", "esri/SpatialReference", "esri/geometry/webMercatorUtils"], function (Point, SpatialReference, webMercatorUtils) {
                var pt1 = new Point(mylocation.my_point.Longitude, mylocation.my_point.Latitude, new SpatialReference({ wkid: 4326 }));
                var pt2 = new Point(compare_point.Longitude, compare_point.Latitude, new SpatialReference({ wkid: 4326 }));
                var pt1_web = webMercatorUtils.geographicToWebMercator(pt1);
                var pt2_web = webMercatorUtils.geographicToWebMercator(pt2);
                var distance = esri.geometry.getLength(pt1_web, pt2_web);
                mylocation[compare_lookup_key] = distance;
                mylocation.lookup_keys.push(compare_lookup_key);
                mylocation.UpdateLocationDistances(compare_lookup_key, distance);
                return distance;
            });
        };
        LocationDistance.prototype.UpdateLocationDistances = function (lookup_key, distance) {
            if (distance > this.furthest_location_distance) {
                this.furthest_location = lookup_key;
                this.furthest_location_distance = distance;
            }
            if (distance < this.closest_location_distance) {
                this.next_location = this.closest_location;
                this.next_location_distance = this.closest_location_distance;
                this.closest_location = lookup_key;
                this.closest_location_distance = distance;
                return;
            }
            if (distance < this.next_location_distance) {
                this.next_location = lookup_key;
                this.next_location_distance = distance;
            }
        };
        LocationDistance.prototype.GetClosestUnused = function (used_lookup_keys) {
            var closest = "";
            var closest_distance = 999999;
            var current = this;
            for (var _i = 0, _a = this.lookup_keys; _i < _a.length; _i++) {
                var key = _a[_i];
                if (used_lookup_keys.indexOf(key) === -1 && current[key] < closest_distance) {
                    closest = key;
                    closest_distance = current[key];
                }
            }
            return closest;
        };
        LocationDistance.prototype.GetBestOrderToInsert = function (locations) {
            // This function is going to figure out where a new Location should be
            // added to an already ordered list.
            locations.sort(function (j, k) { return j.order - k.order; });
            // let's populate the link_distance portion of each location distance object
            for (var _i = 0, locations_1 = locations; _i < locations_1.length; _i++) {
                var location_1 = locations_1[_i];
                if (location_1.order < 999) {
                    for (var i = 0; i < locations.length; i++) {
                        if (locations[i].order === (location_1.order + 1)) {
                            location_1.location_distance.link_location = locations[i].lookup_key;
                            location_1.location_distance.link_distance = location_1.location_distance[locations[i].lookup_key];
                        }
                    }
                }
            }
            for (var i = 0; i < locations.length; i++) {
                var location_2 = locations[i];
                if (location_2.order < 999) {
                    if (this[location_2.lookup_key] < location_2.location_distance.link_distance) {
                        for (var j = 0; j < locations.length; j++) {
                            if (locations[j].order === (location_2.order + 1)) {
                                this.link_location = locations[j].lookup_key;
                                this.link_distance = location_2.location_distance[locations[j].lookup_key];
                            }
                        }
                        return location_2.order + 1;
                    }
                }
            }
            return 999;
        };
        return LocationDistance;
    }());
    IView.LocationDistance = LocationDistance;
})(IView || (IView = {}));
//# sourceMappingURL=LocationDistance.js.map