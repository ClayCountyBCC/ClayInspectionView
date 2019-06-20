namespace IView
{
  interface ILocationDistance
  {
    my_point: Point;
    closest_location: string; // lookup key
    closest_location_distance: number;
    next_location: string; // lookup key
    next_location_distance: number;
    calculate_distance(compare_point: Point, compare_lookup_key: string): number;
    lookup_keys: Array<string>;
    furthest_location: string;
    furthest_location_distance: number;
    link_location: string;
    link_distance: number;
  }

  export class LocationDistance implements ILocationDistance
  {
    public my_point: Point;
    // connection location a
    public link_location: string = ""; // lookup key
    public link_distance: number = 999999;
    public closest_location: string = ""; // lookup key
    public closest_location_distance: number = 999999;
    public next_location: string = ""; // lookup key
    public next_location_distance: number = 999999;
    public furthest_location: string = ""; // lookup key
    public furthest_location_distance: number = 0;
    public lookup_keys: Array<string> = [];

    public calculate_distance(compare_point: Point, compare_lookup_key: string): number
    {
      if (this[compare_lookup_key] !== undefined) return this[compare_lookup_key];

      let mylocation = this;
      return require(["esri/geometry/Point", "esri/SpatialReference", "esri/geometry/webMercatorUtils"],
        function (Point, SpatialReference, webMercatorUtils): number
        {
          var pt1 = new Point(mylocation.my_point.Longitude, mylocation.my_point.Latitude, new SpatialReference({ wkid: 4326 }));
          var pt2 = new Point(compare_point.Longitude, compare_point.Latitude, new SpatialReference({ wkid: 4326 }));
          var pt1_web = webMercatorUtils.geographicToWebMercator(pt1);
          var pt2_web = webMercatorUtils.geographicToWebMercator(pt2);
          let distance = esri.geometry.getLength(pt1_web, pt2_web);
          mylocation[compare_lookup_key] = distance;
          mylocation.lookup_keys.push(compare_lookup_key);
          mylocation.UpdateLocationDistances(compare_lookup_key, distance);
          return distance;
        });
    }

    private UpdateLocationDistances(lookup_key: string, distance: number): void
    {
      if (distance > this.furthest_location_distance)
      {
        this.furthest_location = lookup_key;
        this.furthest_location_distance = distance;
      }
      if (distance < this.closest_location_distance)
      {
        this.next_location = this.closest_location;
        this.next_location_distance = this.closest_location_distance;
        this.closest_location = lookup_key;
        this.closest_location_distance = distance;
        return;
      }
      if (distance < this.next_location_distance)
      {
        this.next_location = lookup_key;
        this.next_location_distance = distance;
      }
    }

    public GetClosestUnused(used_lookup_keys: Array<string>)
    {
      let closest = "";
      let closest_distance = 999999;
      let current = this;
      for (let key of this.lookup_keys)
      {
        if (used_lookup_keys.indexOf(key) === -1 && current[key] < closest_distance)
        {
          closest = key;
          closest_distance = current[key];
        }
      }
      return closest;
    }

    public GetBestOrderToInsert(locations: Array<Location>): number
    {
      // This function is going to figure out where a new Location should be
      // added to an already ordered list.
      locations.sort(function (j, k) { return j.order - k.order; });
      // let's populate the link_distance portion of each location distance object
      for (let location of locations)
      {
        if (location.order < 999)
        {
          for (let i = 0; i < locations.length; i++)
          {
            if (locations[i].order === (location.order + 1))
            {
              location.location_distance.link_location = locations[i].lookup_key;
              location.location_distance.link_distance = location.location_distance[locations[i].lookup_key];
            }
          }
        }
      }

      for (let i = 0; i < locations.length; i++)
      {
        let location = locations[i];
        if (location.order < 999)
        {
          if (this[location.lookup_key] < location.location_distance.link_distance)
          {
            for (let j = 0; j < locations.length; j++)
            {
              if (locations[j].order === (location.order + 1))
              {
                this.link_location = locations[j].lookup_key;
                this.link_distance = location.location_distance[locations[j].lookup_key];
              }
            }

            return location.order + 1;
          }
        }
      }
      return 999;
    }

    constructor(point: Point)
    {
      this.my_point = point;
    }

  }
}