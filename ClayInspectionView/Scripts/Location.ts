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
    order: number;    
    unordered: boolean;    
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
    public order: number = 0;    
    public unordered: boolean = true;    
    public location_distance: LocationDistance;

    constructor(inspections: Array<Inspection>, myInspections: boolean = false)
    {
      this.inspections = inspections;
      if (inspections.length === 0) return;
      let i = inspections[0];
      this.lookup_key = i.LookupKey;


      this.point_to_use = i.PointToUse;

      if (!myInspections)
      {
        this.UpdateFlags();

        this.CreateIcons();
        this.AddValidInspectors(IView.allInspectors);
      }
      else
      {
        // let's check each inspection to pull out the max index and set that as the sort order.
        this.location_distance = new LocationDistance(this.point_to_use);
        this.order = 0;
        
        for (let i of inspections)
        {
          if (i.Sort_Order > this.order) this.order = i.Sort_Order;
        }
        this.unordered = this.order === 0;
        if (this.unordered) this.order = 999;
      }
    }

    private CreateSortedIcon(): any
    {
      // this is our base function that we'll use to simplify our icon creation.
      var d = new dojo.Deferred();
      let currentLocation = this;
      require(["esri/symbols/TextSymbol", "esri/Color", "esri/symbols/Font"],
        function (TextSymbol, Color, Font)
        {
          var textSymbol = new TextSymbol(currentLocation.order.toString());
          textSymbol.setColor(new Color([0, 0, 0]));
          textSymbol.rotated = false;
          textSymbol.setOffset(0, 0);
          textSymbol.setAlign(TextSymbol.ALIGN_MIDDLE);
          //textSymbol.haloColor = new Color([255, 255, 255]);
          //textSymbol.haloSize = 3;
          var font = new Font();
          font.setSize("20pt");
          font.setWeight(esri.symbol.Font.WEIGHT_BOLD);
          textSymbol.setFont(font);
          d.resolve(textSymbol);
        });
      return d.then(function (k) { return k; });
    }

    public GetSortedIcon(): any
    {
      return this.CreateSortedIcon();
    }

    private UpdateFlags()
    {
      // this will update the has_commercial, residential, and private provider flags.
      // they'll be set to false, then we just loop through them all and update them to true
      // if we find any
      this.assigned_inspectors = [];
      for (let i of this.inspections)
      {
        if (!IView.contractor_check)
        {
          if (!i.CanBeAssigned) this.can_be_bulk_assigned = false;
        }
        else
        {
          this.can_be_bulk_assigned = false;
          i.CanBeAssigned = false;
        }
        

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
      if (!this.can_be_bulk_assigned)
      {
        return;
      }
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
      if (this.assigned_inspectors.length > 1)
      {
        //let t = this;
        //let bigicon = this.CreateIcon("esriSMSCircle", "#333333", offsets[x++], 20);
        //bigicon.then(function (j)
        //{
        //  t.icons.push(j);
        //});
        x = 1;
      }
      
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

    private CreateIcon(icon: string, color: string, offset: Array<number>, size: number = 12): any
    {
      // this is our base function that we'll use to simplify our icon creation.
      var d = new dojo.Deferred();

      require(["esri/symbols/SimpleMarkerSymbol", "esri/Color"], function (SimpleMarkerSymbol, Color)
      {
        let s = new SimpleMarkerSymbol({
          "color": Color.fromHex(color),
          "size": size, 
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
        [-4, 0],
        [4, 0],
        [0, -4],
        [0, 4],
        [-4, 4],
        [4, -4],
        [-4, -4],
        [4, 4]
      ];
    }

    public static CreateLocations(inspections: Array<Inspection>):void
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

      IView.dataLoaded = true;
      IView.BuildAndLoadInitialLayers();
    }

    public static CreateMyLocations(inspections: Array<Inspection>): Array<Location>
    {
      if (inspections.length === 0) return;
      var lookupKeys: Array<string> = [];
      var locations: Array<Location> = [];

      if (inspections.length === 0) return [];

      for (let i of inspections)
      {
        if (lookupKeys.indexOf(i.LookupKey) === -1) lookupKeys.push(i.LookupKey);
      }
      for (let key of lookupKeys)
      {
        let filtered = inspections.filter(function (k) { return k.LookupKey === key; });
        locations.push(new Location(filtered, true));
      }
      locations.sort(function (j, k) { return j.order - k.order }); // now that we've ordered it, let's get the locations in the right order.

      let order = 0;
      for (let i = 0; i < locations.length; i++)
      {
        if (!locations[i].unordered)
        {
          locations[i].order = ++order; // all ordered locations are base 1, not base 0. 
        }
      //  //locations[i].CreateSortedIcon().then(function (k)
      //  //{
      //  //  locations[i].icons.push(k);
      //  //});
      }     

      return locations;
    }
       
    public LocationView():void
    {
      let title = document.getElementById("locationAddress");
      Utilities.Clear_Element(title);
      Utilities.Set_Text(title, this.Address());
      let bulkassignContainer = document.getElementById("bulkAssignInspectionsContainer");
      if (this.can_be_bulk_assigned && !IView.contractor_check)
      {
        Utilities.Show(bulkassignContainer);
        this.UpdateBulkAssignmentDropdown();
      } else
      {
        Utilities.Hide(bulkassignContainer);
      }
      let container = document.getElementById("locationInfoContainer");
      Utilities.Clear_Element(container);
      container.appendChild(this.CreateInspectionTable());
      document.getElementById("locationInfo").classList.add("is-active");
    }

    public Address(): string
    {
      let i = this.inspections[0];
      return i.StreetAddressCombined + ', ' + i.City + ', ' + i.Zip;
    }

    private CreateInspectionTable():HTMLTableElement
    {
      let table = document.createElement("table");
      table.classList.add("table");
      table.classList.add("is-fullwidth");
      table.appendChild(this.CreateInspectionTableHeading());
      let tbody = document.createElement("tbody");
      let master_permit: string = null;
      for (let i of this.inspections)
      {
        if (master_permit === null || master_permit !== i.MasterPermitNumber)
        {
          // if it's null, we just started so we're going to build whatever is there.
          tbody.appendChild(this.BuildMasterPermitPropUseRow(i));
          master_permit = i.MasterPermitNumber;
        }
        let notes_row:HTMLTableRowElement = null;
        if (i.PermitNo.substr(0, 1) !== '1')
        {
          notes_row = document.createElement("tr");
        }
        tbody.appendChild(this.CreateInspectionRow(i, notes_row));
        if (i.PreviousInspectionRemarks.length > 0) tbody.appendChild(this.CreatePreviouslyFailedInspectionRow(i.PreviousInspectionRemarks));
        if (notes_row !== null) tbody.appendChild(notes_row);
        
      }
      table.appendChild(tbody);
      return table;
    }

    private BuildMasterPermitPropUseRow(inspection: Inspection): HTMLTableRowElement
    {
      let tr = document.createElement("tr");
      if (inspection.MasterPermitNumber.length > 0)
      {
        let href = "/InspectionScheduler/#permit=" + inspection.MasterPermitNumber;
        let MasterTd = this.CreateTableCellLink(inspection.MasterPermitNumber, href, "has-text-left");
        let imsButton = document.createElement("a");
        imsButton.classList.add("button");
        imsButton.classList.add("is-small");
        imsButton.classList.add("is-success");
        imsButton.style.marginLeft = ".5em";
        imsButton.style.fontStyle = "italic";
        imsButton.target = "_blank";
        imsButton.rel = "noopener";
        imsButton.appendChild(document.createTextNode("IMS"));
        imsButton.href = inspection.MasterPermitIMSLink;
        MasterTd.appendChild(imsButton);
        tr.appendChild(MasterTd);
        let td = document.createElement("td");
        td.colSpan = 7;
        td.classList.add("has-text-left");
        td.appendChild(document.createTextNode(inspection.PropUseInfo));
        tr.appendChild(td);
      }
      else
      {
        tr.appendChild(document.createElement("td"));
        let td = document.createElement("td");
        td.colSpan = 7;
        td.classList.add("has-text-left");
        td.appendChild(document.createTextNode("NO MASTER PERMIT"));
        tr.appendChild(td);
      }      
      return tr;
    }

    private CreateInspectionTableHeading(): HTMLTableSectionElement
    {
      let thead = document.createElement("thead");
      let tr = document.createElement("tr");
      tr.appendChild(this.CreateTableCell(true, "Permit", "", "15%"));
      tr.appendChild(this.CreateTableCell(true, "Scheduled", "", "15%"));
      tr.appendChild(this.CreateTableCell(true, "Inspection Type", "", "20%"));
      let button_column = this.CreateTableCell(true, "")
      button_column.style.width = "5%";
      tr.appendChild(button_column);
      tr.appendChild(this.CreateTableCell(true, "Kind", "", "10%"));
      tr.appendChild(this.CreateTableCell(true, "Private Provider", "", "10%"));
      tr.appendChild(this.CreateTableCell(true, "Status", "", "15%"));
      tr.appendChild(this.CreateTableCell(true, "Assigned", "", "15%"));
      thead.appendChild(tr);
      return thead;
    }

    private CreateTableCell(header: boolean, value: string, className: string = "", width: string = ""): HTMLTableCellElement
    {
      let td = document.createElement(header ? "th" : "td");
      if (width.length > 0) td.style.width = width;
      if (className.length > 0) td.classList.add(className);
      td.appendChild(document.createTextNode(value));
      return td;
    }

    private CreateTableCellLink(value: string, href: string, className: string = ""): HTMLTableCellElement
    {
      let td = document.createElement("td");
      if (className.length > 0) td.classList.add(className);
      let link = document.createElement("a");
      link.target = "_blank";
      link.rel = "noopener";
      link.href = href;
      link.appendChild(document.createTextNode(value))
      td.appendChild(link);
      return td;
    }

    private CreateInspectionRow(inspection: Inspection, notes_row: HTMLTableRowElement): HTMLTableRowElement
    {
      let tr = document.createElement("tr");
      let href = "/InspectionScheduler/#permit=" + inspection.PermitNo + "&inspectionid=" + inspection.InspReqID;
      let td = this.CreateTableCellLink(inspection.PermitNo, href, "has-text-right");
      let imsButton = document.createElement("a");
      imsButton.classList.add("button");
      imsButton.classList.add("is-small");
      imsButton.classList.add("is-success");
      imsButton.style.marginLeft = ".5em";
      imsButton.style.fontStyle = "italic";
      imsButton.target = "_blank";
      imsButton.rel = "noopener";
      imsButton.appendChild(document.createTextNode("IMS"));
      imsButton.href = inspection.IMSLink;
      td.appendChild(imsButton);
      tr.appendChild(td);
      tr.appendChild(this.CreateTableCell(false, Utilities.Format_Date(inspection.ScheduledDate)));
      tr.appendChild(this.CreateTableCell(false, inspection.InspectionCode + ' ' + inspection.InspectionDescription, "has-text-left"));
      let button_td = document.createElement("td");
      if (inspection.PermitNo.substr(0, 1) !== '1')
      {
        let notes_button = document.createElement("button");
        notes_button.type = "button";
        notes_button.classList.add("button");
        notes_button.classList.add("is-info");
        notes_button.classList.add("is-small");
        notes_button.appendChild(document.createTextNode("Notes"));
        notes_button.onclick = function ()
        {
          if (notes_row.childElementCount === 0)
          {
            // we haven't rendered anything yet
            let base_td = document.createElement("td");
            base_td.colSpan = 8;
            Inspection.GetPermitNotes(inspection.PermitNo, notes_button, base_td);
            //base_td.appendChild(document.createTextNode("Test"));
            notes_row.appendChild(base_td);
          }
          else
          {
            notes_row.style.display = notes_row.style.display === "" ? "none" : "";
            //console.log('notes_row display', notes_row.style.display);
            //if (notes_row.style.display === "")
            //{
            //  notes_row.style.display = "none";
            //}
            //else
            //{
            //  notes_row.style.display = "table-row";
            //}
            return;
          }
        }
        button_td.appendChild(notes_button);
      }
      tr.appendChild(button_td);
      tr.appendChild(this.CreateTableCell(false, inspection.IsCommercial ? "Commercial" : "Residential"));
      tr.appendChild(this.CreateTableCell(false, inspection.IsPrivateProvider ? "Yes" : "No"));
      tr.appendChild(this.CreateTableCell(false, inspection.IsCompleted ? "Completed" : "Incomplete"));
      if (inspection.IsCompleted || IView.contractor_check)
      {
        tr.appendChild(this.CreateTableCell(false, inspection.InspectorName));
      }
      else
      {
        let td = document.createElement("td");
        td.appendChild(this.CreateInspectorDropdown(inspection));
        tr.appendChild(td);
      }
      
      return tr;
    }

    private CreatePreviouslyFailedInspectionRow(Remarks: string): HTMLTableRowElement
    {
      let tr = document.createElement("tr");
      let blankTD = document.createElement("td");
      blankTD.appendChild(document.createTextNode(""));
      tr.appendChild(blankTD);
      let messageTD = document.createElement("td");
      messageTD.appendChild(document.createTextNode("Failed Last Inspection"));
      messageTD.colSpan = 2;
      tr.appendChild(messageTD);
      let remarksTD = document.createElement("td");
      remarksTD.appendChild(document.createTextNode(Remarks));
      remarksTD.colSpan = 5;
      tr.appendChild(remarksTD);
      return tr;
    }

    private CreateInspectorDropdown(inspection: Inspection):HTMLElement
    {
      let control = document.createElement("div");
      control.classList.add("control");
      let container = document.createElement("div");
      container.classList.add("select");
      let select = document.createElement("select");
      for (let i of inspection.ValidInspectors)
      {
        let o = document.createElement("option");
        o.value = i.Name;
        o.selected = (i.Name === inspection.InspectorName);
        o.appendChild(document.createTextNode(i.Name));
        select.appendChild(o);
      }
      select.onchange = function (event:any)
      {
        let inspectors = IView.allInspectors.filter(function (i) { return i.Name === Utilities.Get_Value(event.srcElement) });
        let parent = event.srcElement.parentElement;        
        if (inspectors.length === 1)
        {          
          let id = inspectors[0].Id;
          let inspectionIds = [inspection.InspReqID];
          Inspection.BulkAssign(id, inspectionIds, parent);
        }        
      }

      container.appendChild(select);
      control.appendChild(container);
      return control;      
    }

    public UpdateBulkAssignmentDropdown(): void
    {
      let select = document.getElementById("bulkAssignInspections");
      Utilities.Clear_Element(select);
      let base = document.createElement("option");
      base.value = "";
      base.selected = true;
      base.appendChild(document.createTextNode("Select Inspector"));
      select.appendChild(base);
      for (let i of this.valid_inspectors)
      {
        let o = document.createElement("option");
        o.value = i.Name;
        o.selected = false;
        o.appendChild(document.createTextNode(i.Name));
        select.appendChild(o);
      }
    }

    public static HandleMyLocations(inspections: Array<Inspection>): void
    {
      if (inspections.length === 0)
      {
        IView.myLocations = [];
        Location.UpdateMyLocations();
        return;
      }
      let myLocations = Location.CreateMyLocations(inspections);
      //console.log('my locations', myLocations);
      let ordered = myLocations.filter(function (j) { return j.unordered === false; });
      if (IView.myLocations.length === 0 && ordered.length === 0)
      {
        // fresh
        //console.log('fresh');
        myLocations = Location.UpdateLocationDistances(myLocations, true);
        let furthest_locations_distance: number = 0;
        let furthest_locations: Array<string> = [];
        for (let i = 0; i < myLocations.length; i++)
        {
          if (myLocations[i].location_distance.furthest_location_distance > furthest_locations_distance)
          {
            furthest_locations = [];
            furthest_locations_distance = myLocations[i].location_distance.furthest_location_distance;
            furthest_locations.push(myLocations[i].location_distance.furthest_location);
            furthest_locations.push(myLocations[i].lookup_key);
          }
        }

        IView.myLocations = Location.SortByProximity(myLocations, furthest_locations[0]);
      }
      else
      {
        //console.log('not fresh');
        myLocations = Location.UpdateLocationDistances(myLocations, false);
        if (IView.myLocations.length === 0 && ordered.length > 0)
        {
          IView.myLocations = myLocations;          
          Location.HandleUnorderedLocations();
          
        }
        else
        {
          Location.RemoveMissingFromCurrent(myLocations);
          Location.AddNewLocations(myLocations);
        }
        // let's add the new ones to the list, remove any that aren't there anymore

      }
      Location.UpdateMyLocations();
    }

    public static UpdateLocationDistances(locations: Array<Location>, fresh: boolean): Array<Location>
    {
      for (let i = 0; i < locations.length; i++)
      {
        if (fresh) locations[i].unordered = false;

        for (let j = 0; j < locations.length; j++)
        {
          if (i !== j)
          {
            locations[i].location_distance.calculate_distance(locations[j].point_to_use, locations[j].lookup_key);
          }
        }
      }
      return locations;
    }

    public static UpdateMyLocations()
    {
      IView.myLocations.sort(function (j, k) { return j.order - k.order; });
      Location.PopulateMyLocations(IView.myLocations);
      mapController.UpdateMyLocationLayer(IView.myLocations);
      
    }

    private static RemoveMissingFromCurrent(new_locations: Array<Location>)
    {
      let locations_to_remove: Array<string> = [];
      for (let location of IView.myLocations)
      {
        let found: boolean = false;
        for (let new_location of new_locations)
        {
          if (new_location.lookup_key === location.lookup_key)
          {
            found = true;
          }
        }
        if (!found) // this location was removed
        {
          locations_to_remove.push(location.lookup_key);
        }
      }
      for (let key of locations_to_remove)
      {
        let index = Location.GetLocationIndex(key, IView.myLocations);
        if (index !== -1) IView.myLocations.splice(index, 1);
      }
    }

    public static GetLocationIndex(lookup_key: string, LocationsToSearch: Array<Location>): number
    {
      for (let i = 0; i < LocationsToSearch.length; i++)
      {
        if (LocationsToSearch[i].lookup_key === lookup_key) return i;
      }
      return -1;
    }

    private static AddNewLocations(new_locations: Array<Location>)
    {
      let added = false;
      for (let new_location of new_locations)
      {
        let found: boolean = false;
        for (let current_location of IView.myLocations)
        {
          if (new_location.lookup_key === current_location.lookup_key)
          {
            found = true;
          }
        }
        if (!found)
        {
          new_location.unordered = true;
          IView.myLocations.push(new_location);
          new_location.order = 999;
          added = true;
          //console.log('adding', new_location);
          //let my_order = new_location.location_distance.GetBestOrderToInsert(IView.myLocations);          
          //for (let l of IView.myLocations)
          //{
          //  if (l.order >= my_order && !l.unordered)
          //  {
          //    l.order++;
          //  }
          //}
          //new_location.order = my_order;
        }
      }
      if (added)
      {
        for (let l of IView.myLocations)
        {
          if (l.unordered) l.order = 999;
        }
        IView.myLocations.sort(function (j, k) { return j.order - k.order; });
        IView.myLocations = Location.UpdateLocationDistances(IView.myLocations, false);
        Location.HandleUnorderedLocations();
      }

    }

    private static HandleUnorderedLocations()
    {
      for (let l of IView.myLocations)
      {
        if (l.unordered)
        {
          let my_order = l.location_distance.GetBestOrderToInsert(IView.myLocations);
          //console.log('setting order', l.lookup_key, my_order);
          for (let location of IView.myLocations)
          {
            if (location.order >= my_order && location.order < 998)
            {
              location.order++;
            }
          }
          l.order = my_order;
        }

      }

    }

    private static PopulateMyLocations(locations: Array<Location>): void
    {
      let container = document.getElementById("sortableInspections");
      Utilities.Clear_Element(container);
      if (locations.length === 0)
      {
        let li = document.createElement("li");
        li.appendChild(document.createTextNode("No incomplete inspections were found."));
        li.style.padding = "1em 1em 1em 1em";
        container.appendChild(li);
      }
      else
      {
        for (let l of locations)
        {
          container.appendChild(Location.CreateMyLocationRow(l));
        }
      }

    }

    private static CreateMyLocationRow(location: Location): HTMLElement
    {
      let li = document.createElement("li");
      li.id = location.lookup_key;
      li.classList.add("columns");
      //li.classList.add("item");
      //li.classList.add("dropzone");
      //li.classList.add("occupied");
      li.style.borderTop = "none"; //"dotted 1px #333333";
      li.style.borderBottom = "none"; //"dotted 1px #000000";
      li.style.margin = "0 auto";
      li.style.marginBottom = ".25em";
      if (location.unordered)
      {
        li.classList.add("has-background-warning");
      }
      else
      {
        li.classList.add("has-background-grey-lighter");
      }

      let index = document.createElement("span");
      index.classList.add("column");
      index.classList.add("is-1");
      index.classList.add("has-text-centered");
      index.style.fontWeight = "bolder";
      index.appendChild(document.createTextNode(location.order.toString()));
      li.appendChild(index);

      let address = document.createElement("span");
      address.classList.add("column");
      address.classList.add("is-8");
      address.appendChild(document.createTextNode(location.Address()));
      li.appendChild(address);

      let permitCount = document.createElement("span");
      permitCount.classList.add("column");
      permitCount.classList.add("is-1");
      permitCount.classList.add("has-text-centered");
      permitCount.appendChild(document.createTextNode(location.inspections.length.toString()));
      li.appendChild(permitCount);

      let view = document.createElement("span");
      view.classList.add("column");
      view.classList.add("is-2");
      view.classList.add("has-text-centered");
      let button = document.createElement("button");
      button.classList.add("button");
      button.classList.add("is-small");
      button.appendChild(document.createTextNode("View"));
      button.onclick = function ()
      {
        IView.last_selected_graphic = null;
        IView.last_symbol_color = null;
        IView.current_location = location;
        console.log('location found', location);
        IView.mapController.CenterOnPoint(location.point_to_use);
        location.LocationView();
      }
      view.appendChild(button);
      li.appendChild(view);      

      return li;
    }

    public static SortByProximity(locations: Array<Location>, starting_lookup_key: string): Array<Location>
    {
      if (starting_lookup_key.length === 0 || locations.length <= 2) return locations;
      let ordered_locations: Array<Location> = [];

      let used_lookup_keys: Array<string> = [];
      used_lookup_keys.push(starting_lookup_key);

      let first_location = locations[Location.GetLocationIndex(starting_lookup_key, locations)];
      ordered_locations.push(first_location);
      let second_location = locations[Location.GetLocationIndex(first_location.location_distance.closest_location, locations)];
      ordered_locations.push(second_location);

      used_lookup_keys.push(second_location.lookup_key);

      let location = second_location;
      let lookup_key = "";
      let index: number = 0;
      let i = 0;
      while (used_lookup_keys.length < locations.length || i < 50)
      {
        
        lookup_key = location.location_distance.GetClosestUnused(used_lookup_keys);
        if (lookup_key.length == 0) break;
        index = Location.GetLocationIndex(lookup_key, locations);
        if (index === -1) break;
        location = locations[index];        
        ordered_locations.push(location);
        used_lookup_keys.push(lookup_key);
        i++;
      }
      for (let i = 0; i < ordered_locations.length; i++)
      {
        ordered_locations[i].order = i + 1;
        if (ordered_locations[i].unordered) ordered_locations[i].unordered = false;
      }
      return ordered_locations;
    }

    public static SaveMyLocations()
    {

    }



  }

}
