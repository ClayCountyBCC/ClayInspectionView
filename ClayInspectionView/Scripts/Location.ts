declare var dojo: any;

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
      if (this.assigned_inspectors.length > 1) x = 1;
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
        let icon = this.CreateIcon(icontype, this[i].hexcolor, offsets[x++]);
        let test = this;
        icon.then(function (j)
        {
          test.icons.push(j);
        });
        
        //this.icons.push(icon);
      }

    }

    private CreateIcon(icon: string, color: string, offset: Array<number>): any
    {
      // this is our base function that we'll use to simplify our icon creation.
      var d = new dojo.Deferred();

      require(["esri/symbols/SimpleMarkerSymbol", "esri/Color"], function (SimpleMarkerSymbol, Color)
      {
        let s = new SimpleMarkerSymbol({
          "color": Color.fromHex(color),
          "size": 12, 
          "angle": 0,
          "xoffset": offset[0],
          "yoffset": offset[1],
          "type": "esriSMS",
          "style": icon,
          "outline": { "color": [0, 0, 0, 255], "width": 1, "type": "esriSLS", "style": "esriSLSSolid" }
        });
        d.resolve(s);
      });
      return d;
    }

    private GetOffsets(): Array<Array<number>>
    {
      return [
        [0, 0],
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

    public static CreateLocations(inspections: Array<Inspection>)
    {
      let inspectionCount = inspections.length.toString();
      Utilities.Set_Text(document.getElementById("inspectionCount"), inspectionCount);
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
      console.log('locations', IView.filteredLocations);
      console.log('inspectors > 1', IView.filteredLocations.filter(function (k) { return k.icons.length > 2; }));
      console.log('inspections > 2', IView.filteredLocations.filter(function (k) { return k.inspections.length > 2; }));
      console.log('mixed inspections', IView.filteredLocations.filter(function (k) { return k.has_commercial && k.has_residential; }));
      IView.dataLoaded = true;
      IView.BuildAndLoadInitialLayers();
    }

    public LocationView():HTMLDivElement
    {
      let container = document.createElement("div");
      let df = document.createDocumentFragment();
      df.appendChild(this.AddressView());
      df.appendChild(this.BulkAssignControl());
      df.appendChild(this.CreateInspectionTable());
      container.appendChild(df);
      return container;
    }

    private AddressView():HTMLParagraphElement
    {
      let i = this.inspections[0];
      let p = document.createElement("p");
      p.appendChild(document.createTextNode(i.StreetAddressCombined));
      p.appendChild(document.createTextNode(i.City + ', ' + i.Zip));
      return p;
    }

    private BulkAssignControl(): HTMLDivElement
    {
      let container = document.createElement("div");
      container.appendChild
      return container;
    }

    private CreateInspectionTable():HTMLTableElement
    {
      let table = document.createElement("table");
      table.classList.add("table");
      table.classList.add("is-fullwidth");
      table.appendChild(this.CreateInspectionTableHeading());
      let tbody = document.createElement("tbody");
      for (let i of this.inspections)
      {
        tbody.appendChild(this.CreateInspectionRow(i));
      }
      table.appendChild(tbody);
      return table;
    }

    private CreateInspectionTableHeading(): HTMLTableSectionElement
    {
      let thead = document.createElement("thead");
      let tr = document.createElement("tr");
      tr.appendChild(this.CreateTableCell(true, "Permit"));
      tr.appendChild(this.CreateTableCell(true, "Inspection Type"));
      tr.appendChild(this.CreateTableCell(true, "Kind"));
      tr.appendChild(this.CreateTableCell(true, "Private Provider"));
      tr.appendChild(this.CreateTableCell(true, "Status"));
      tr.appendChild(this.CreateTableCell(true, "Assigned"));
      thead.appendChild(tr);
      return thead;
    }

    private CreateTableCell(header: boolean, value: string, className: string = ""): HTMLTableCellElement
    {
      let td = document.createElement(header ? "th" : "td");
      if (className.length > 0) td.classList.add(className);
      td.appendChild(document.createTextNode(value));
      return td;
    }

    

    private CreateInspectionRow(inspection: Inspection): HTMLTableRowElement
    {
      let tr = document.createElement("tr")
      tr.appendChild(this.CreateTableCell(false, inspection.PermitNo));
      tr.appendChild(this.CreateTableCell(false, inspection.InspectionCode + ' ' + inspection.InspectionDescription));
      tr.appendChild(this.CreateTableCell(false, inspection.IsCommercial ? "Commercial" : "Residential"));
      tr.appendChild(this.CreateTableCell(false, inspection.IsPrivateProvider ? "Yes" : "No"));
      tr.appendChild(this.CreateTableCell(false, inspection.IsCompleted ? "Completed" : "Incomplete"));
      tr.appendChild(this.CreateTableCell(false, inspection.InspectorName));
      return tr;
    }

  }

}