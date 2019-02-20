

namespace IView
{
  interface ILocation
  {
    lookup_key: string;
    point_to_use: Point;
    icons: Array<any>; // the array of symbols to use for this icon    
    valid_inspectors: Array<Inspector>;
    inspections: Array<Inspection>;
    all_inspections: Array<Inspection>;
    has_commercial: boolean;
    has_residential: boolean;
    has_private_provider: boolean;
    can_be_bulk_assigned: boolean;
    assigned_inspectors: Array<string>;
    RBL: boolean;
    CBL: boolean;
    REL: boolean;
    CEL: boolean;
    RME: boolean;
    CME: boolean;
    RPL: boolean;
    CPL: boolean;
    Fire: boolean;
  }

  export class Location implements ILocation
  {
    public lookup_key: string = "";
    public point_to_use: Point = null;
    public icons: Array<any> = []; 
    public valid_inspectors: Array<Inspector> = [];
    public inspections: Array<Inspection> = [];
    public all_inspections: Array<Inspection> = [];
    public has_commercial: boolean = false;
    public has_residential: boolean = false;
    public has_private_provider: boolean = false;
    public can_be_bulk_assigned: boolean = true;
    public assigned_inspectors: Array<string> = [];
    public RBL: boolean = false;
    public CBL: boolean = false;
    public REL: boolean = false;
    public CEL: boolean = false;
    public RME: boolean = false;
    public CME: boolean = false;
    public RPL: boolean = false;
    public CPL: boolean = false;
    public Fire: boolean = false;

    constructor(inspections: Array<Inspection>)
    {
      this.inspections = inspections;
      if (inspections.length === 0) return;
      let i = inspections[0];
      this.lookup_key = i.LookupKey;
      this.point_to_use = i.PointToUse;

      this.UpdateFlags();

      this.CreateIcons();
      this.AddValidInspectors(IView.allInspectors);
    }

    private UpdateFlags()
    {
      // this will update the has_commercial, residential, and private provider flags.
      // they'll be set to false, then we just loop through them all and update them to true
      // if we find any      
      this.assigned_inspectors = [];
      for (let i of this.inspections)
      {
        if (!i.CanBeAssigned) this.can_be_bulk_assigned = false;

        if (i.IsCommercial)
        {
          this.has_commercial = true;
        }
        else
        {
          this.has_residential = true;
        }

        if (i.IsPrivateProvider) this.has_private_provider = true;

        // now we start collecting data on the assigned inspectors
        // we need to know what they have assigned in order to figure out
        // what their icon should be, and what color it should be.
        if (this.assigned_inspectors.indexOf(i.InspectorName) === -1)
        {
          this.assigned_inspectors.push(i.InspectorName);
          this[i.InspectorName] = { commercial: 0, residential: 0, hexcolor: i.Color };
        }
        if (i.IsCommercial)
        {
          this[i.InspectorName].commercial += 1;
        }
        else
        {
          this[i.InspectorName].residential += 1;
        }
        // let's check the inspector type flags now
        if (i.RBL) this.RBL = true;
        if (i.CBL) this.CBL = true;
        if (i.REL) this.REL = true;
        if (i.CEL) this.CEL = true;
        if (i.RME) this.RME = true;
        if (i.CME) this.CME = true;
        if (i.RPL) this.RPL = true;
        if (i.CPL) this.CPL = true;
        if (i.Fire) this.Fire = true;
      }

    }

    private AddValidInspectors(inspectors: Array<Inspector>):void
    {
      // List the people who can perform all of these inspections
      // not all groups of inspections can be bulk assigned
      // ie: if there are 3 inspections, 1 fire and 1 building and 1 electrical
      // chances are we won't be able to bulk assign this group because no one person can do
      // all of those inspections.
      // What we need to do to calculate this at the point level is to 
      // iterate through every permit and count the types
      // here are the types that matter:
      //    permit type
      //    commercial
      //    residential
      //    private provider
      //    fire
      // Some people can have combinations, like Commercial / Electrical, and not others.
      if (!this.can_be_bulk_assigned) return;
      let current = this;
      this.valid_inspectors = inspectors.filter(function (i)
      {
        //console.log('location', current.lookup_key, current.Fire, i.Name, i.Fire, ((current.Fire === true && i.Fire === true) || current.Fire === false))
        //return ((current.Fire === true && i.Fire === true) || current.Fire === false);
        return ((current.RBL === i.RBL === true) || !current.RBL) &&
          ((current.CBL === i.CBL === true) || !current.CBL) &&
          ((current.REL === i.REL === true) || !current.REL) &&
          ((current.CEL === i.CEL === true) || !current.CEL) &&
          ((current.RME === i.RME === true) || !current.RME) &&
          ((current.CME === i.CME === true) || !current.CME) &&
          ((current.RPL === i.RPL === true) || !current.RPL) &&
          ((current.CPL === i.CPL === true) || !current.CPL) &&
          ((current.Fire === i.Fire === true) || !current.Fire);
      });
      if (this.valid_inspectors.length === 0) this.can_be_bulk_assigned = false;


    }

    private CreateIcons(): void
    {
      // this function is going to parse the inspections to figure out 
      // how to build the map icon objects.
      // if there are multiple inspectors assigned to this address,
      // we'll need to give each inspector their own icon with their
      // own color.  
      // commerical permits are given a square icon
      // residential permits are given a circle icon
      // If this address has both residential and commercial permits (usually an error)
      // then we'll give it a diamond icon.
      let x = 0;
      let offsets = this.GetOffsets();
      for (let i of this.assigned_inspectors)
      {
        if (x > offsets.length) return;

        let icontype = "";
        if (this[i].commercial > 0 && this[i].residential > 0)
        {
          icontype = "esriSMSDiamond";
        }
        else
        {
          if (this[i].commercial > 0)
          {
            icontype = "esriSMSSquare";
          }
          else
          {
            icontype = "esriSMSCircle";
          }
        }
        this.icons.push(this.CreateIcon(icontype, this[i].hexcolor, offsets[x++]));
      }

    }

    private CreateIcon(icon: string, color: string, offset: Array<number>): any
    {
      // this is our base function that we'll use to simplify our icon creation.
      return require(["esri/symbols/SimpleMarkerSymbol", "esri/Color"], function (SimpleMarkerSymbol, Color)
      {
        return new SimpleMarkerSymbol({
          "color": Color.fromHex(color),
          "size": 12, 
          "angle": 0,
          "xoffset": offset[0],
          "yoffset": offset[1],
          "type": "esriSMS",
          "style": icon,
          "outline": { "color": [0, 0, 0, 255], "width": 1, "type": "esriSLS", "style": "esriSLSSolid" }
        });
      });
    }

    private GetOffsets(): Array<Array<number>>
    {
      return [
        [-5, 5],
        [5, -5],
        [-5, -5],
        [5, 5],
        [-5, 0],
        [0, 5],
        [5, 0],
        [0, 5]
      ];
    }

    public static GetAllLocations(inspections: Array<Inspection>)
    {
      var lookupKeys: Array<string> = [];
      IView.filteredLocations = [];
      for (let i of inspections)
      {
        if (lookupKeys.indexOf(i.LookupKey) === -1) lookupKeys.push(i.LookupKey);
      }
      for (let key of lookupKeys)
      {
        let filtered = inspections.filter(function (k) { return k.LookupKey === key; });
        IView.filteredLocations.push(new Location(filtered));
      }
      console.log('all locations', IView.filteredLocations);
      //console.log('inspections > 2', IView.allLocations.filter(function (k) { return k.inspections.length > 2; }));
      //console.log('mixed inspections', IView.allLocations.filter(function (k) { return k.has_commercial && k.has_residential; }));

    }

  }

}