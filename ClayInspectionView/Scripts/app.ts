/// <reference path="map.ts" />
/// <reference path="unit.ts" />
//import MapController from "./map";


namespace IView
{

  export let mapController: MapController;
  export let allInspections: Array<Inspection> = [];// populated from web service
  export let inspectors_to_edit: Array<Inspector> = []; // only populated if the user has admin access.
  export let allInspectors: Array<Inspector> = []; // populated from web service
  export let allUnits: Array<Unit> = [];
  export let filteredLocations: Array<Location> = [];
  export let current_location: Location = null;
  export let location_layer: any;
  export let unit_layer: any;
  export let allLayers: Array<any>; // all of the layers created.
  //export let currentDay: string = "today";
  //export let currentIsComplete: boolean = false;
  export let day_filter: string = "today";  
  export let inspection_status_filter = "open";
  export let permit_kind_filter: string = "all";
  export let permit_type_filter: Array<string> = [];
  export let inspector_filter: Array<string> = [];
  export let private_provider_only: boolean = false;
  export let invalid_address_only: boolean = false;
  export let show_bulk_assign: boolean = true;
  export let last_selected_graphic: any; 
  export let last_symbol_color: any;

  export let permit_types_toggle_status: boolean = false;
  export let inspector_toggle_status: boolean = false;

  export let mapLoaded: boolean = false;
  export let dataLoaded: boolean = false;
  export let currentInspectors: Array<Inspector>; // populated from data
  
  export function Start(): void 
  {
    // things to do:
    // setup default map
    mapController = new MapController("map");
    // get the data for today/tomorrow
    Inspector.GetAllInspectors();
  }

  export function LoadDefaultsFromCookie()
  {
    
    let status = GetMapCookie("inspection_status_filter");
    let day = GetMapCookie("day_filter");
    let kind = GetMapCookie("permit_kind_filter");
    let private = GetMapCookie("private_provider_only");
    let invalid = GetMapCookie("invalid_address_only");
    let permittype = GetMapCookie("permit_type_filter");
    let inspector = GetMapCookie("inspector_filter");
    let bulk = GetMapCookie("show_bulk_assign");

    console.log(status, day, kind, private, invalid, permittype, inspector);

    if (status !== null) IView.inspection_status_filter = status;
    if (day !== null) IView.day_filter = day;
    if (kind !== null) IView.permit_kind_filter = kind;
    if (private !== null) IView.private_provider_only = (private.toLowerCase() === "true");
    if (invalid !== null) IView.invalid_address_only = (invalid.toLowerCase() === "true");
    if (permittype !== null) IView.permit_type_filter = permittype.split(",");
    if (inspector !== null) IView.inspector_filter = inspector.split(",");
    if (bulk !== null) IView.show_bulk_assign = (bulk.toLowerCase() === "true");

    // load defaults into form
    if (IView.show_bulk_assign)
    {
      Utilities.Show("BulkAssignContainer");
    }
    else
    {
      Utilities.Hide("BulkAssignContainer");
    }

    (<HTMLInputElement>document.querySelector("input[name='inspectionStatus'][value='"+ IView.inspection_status_filter + "']")).checked = true;
    (<HTMLInputElement>document.querySelector("input[name='inspectionDay'][value='" + IView.day_filter + "']")).checked = true;
    (<HTMLInputElement>document.querySelector("input[name='commercialResidential'][value='" + IView.permit_kind_filter + "']")).checked = true;

    (<HTMLInputElement>document.getElementById("privateProviderFilter")).checked = IView.private_provider_only;
    (<HTMLInputElement>document.getElementById("invalidAddressFilter")).checked = IView.invalid_address_only;
    Toggle_Input_Group("input[name='inspectorFilter']", false);
    for (let i of IView.inspector_filter)
    {
      (<HTMLInputElement>document.querySelector("input[name='inspectorFilter'][value='" + i + "']")).checked = true;
    }
    
    Toggle_Input_Group("input[name='permitType']", false);
    for (let p of IView.permit_type_filter)
    {
      (<HTMLInputElement>document.querySelector("input[name='permitType'][value='" + p + "']")).checked = true;
    }
    


  }

  export function SaveCookie(): void
  {
    UpdateFilters();
    SetMapCookie("inspection_status_filter", IView.inspection_status_filter);
    SetMapCookie("day_filter", IView.day_filter);
    SetMapCookie("permit_kind_filter", IView.permit_kind_filter);
    SetMapCookie("private_provider_only", IView.private_provider_only.toString());
    SetMapCookie("invalid_address_only", IView.invalid_address_only.toString());
    SetMapCookie("permit_type_filter", IView.permit_type_filter.join(","));
    SetMapCookie("inspector_filter", IView.inspector_filter.join(","));
    SetMapCookie("show_bulk_assign", IView.show_bulk_assign.toString());
  }

  function GetMapCookie(name: string): string
  {
    const value = "; " + document.cookie;
    const parts = value.split("; " + "inspectionview_"+ name + "=");

    if (parts.length == 2)
    {
      return parts.pop().split(";").shift();
    }
    return null;
  }

  function SetMapCookie(name: string, value: string): void
  {
    let expirationYear = new Date().getFullYear() + 1;
    let expirationDate = new Date();
    expirationDate.setFullYear(expirationYear);
    let cookie = "inspectionview_" + name + "=" + value + "; expires=" + expirationDate.toUTCString() + "; path=" + Utilities.Get_Path("/inspectionview");
    document.cookie = cookie;
  }

  export function ResetFilters():void
  {
    // let's set the actual filter backing first.
    day_filter = "today";
    inspection_status_filter = "open";
    permit_kind_filter = "all";
    permit_type_filter = [];
    inspector_filter = [];
    private_provider_only = false;
    invalid_address_only = false;


    (<HTMLInputElement>document.querySelector("input[name='inspectionStatus'][value='open']")).checked = true;
    (<HTMLInputElement>document.querySelector("input[name='inspectionDay'][value='today']")).checked = true;
    (<HTMLInputElement>document.querySelector("input[name='commercialResidential'][value='all']")).checked = true;

    (<HTMLInputElement>document.getElementById("privateProviderFilter")).checked = false;
    (<HTMLInputElement>document.getElementById("invalidAddressFilter")).checked = false;
    Toggle_Input_Group("input[name='inspectorFilter']", false);
    (<HTMLInputElement>document.querySelector("input[name='inspectorFilter'][value='All']")).checked = true;
    Toggle_Input_Group("input[name='permitType']", false);
    (<HTMLInputElement>document.querySelector("input[name='permitType'][value='all']")).checked = true;

    Location.CreateLocations(ApplyFilters(IView.allInspections));
  }

  export function Toggle_Group(group: string):void
  {
    if (group === "inspectors")
    {
      inspector_toggle_status = !inspector_toggle_status;
      Toggle_Input_Group("input[name='inspectorFilter']", inspector_toggle_status);
    }
    else
    {
      permit_types_toggle_status = !permit_types_toggle_status;
      Toggle_Input_Group("input[name='permitType']", permit_types_toggle_status);
    }
    Location.CreateLocations(ApplyFilters(IView.allInspections));
  }

  export function Toggle_Bulk_Assign(): void
  {
    IView.show_bulk_assign = !IView.show_bulk_assign;
    if (IView.show_bulk_assign)
    {
      Utilities.Show("BulkAssignContainer");
    }
    else
    {
      Utilities.Hide("BulkAssignContainer");
    }
  }

  function Toggle_Input_Group(querystring: string, checked: boolean):void
  {
    let inputs = document.querySelectorAll(querystring);
    for (let i = 0; i < inputs.length; i++)
    {
      (<HTMLInputElement>inputs.item(i)).checked = checked;
    }
  }

  export function FilterInputEvents()
  {
    let inputs = document.querySelectorAll("#filters input");
    for (let i = 0; i < inputs.length; i++)
    {
      inputs.item(i).addEventListener("click", function (e)
      {
        Location.CreateLocations(ApplyFilters(IView.allInspections));
      });
    }
  }

  function UpdateFilters(): void
  {
    IView.inspection_status_filter = Get_Single_Filter('input[name="inspectionStatus"]:checked');
    IView.day_filter = Get_Single_Filter('input[name="inspectionDay"]:checked');
    IView.permit_kind_filter = Get_Single_Filter('input[name="commercialResidential"]:checked');
    IView.private_provider_only = (<HTMLInputElement>document.getElementById("privateProviderFilter")).checked;
    IView.invalid_address_only = (<HTMLInputElement>document.getElementById("invalidAddressFilter")).checked;
    IView.permit_type_filter = Get_Filters('input[name="permitType"]:checked');
    IView.inspector_filter = Get_Filters('input[name="inspectorFilter"]:checked');
  }

  export function ApplyFilters(inspections: Array<Inspection>): Array<Inspection>
  {
    UpdateFilters();
    // filter by status
    let filtered: Array<Inspection> = inspections;
    if (IView.inspection_status_filter !== "all")
    {
      let is_completed: boolean = IView.inspection_status_filter !== "open";
      filtered = IView.allInspections.filter(function (j)
      {
        return j.IsCompleted === is_completed;
      });
    }

    // filter by day
    if (IView.day_filter !== "all")
    {
      if (IView.day_filter !== "prior")
      {
        filtered = filtered.filter(function (j) { return j.ScheduledDay === IView.day_filter; });
      }
      else
      {
        filtered = filtered.filter(function (j) { return j.Age > 0; });
      }      
    }

    // filter by kind
    if (IView.permit_kind_filter !== "all")
    {
      let is_commercial = IView.permit_kind_filter === "commercial";
      filtered = filtered.filter(function (j) { return j.IsCommercial === is_commercial; });
    }

    // filter by permit type
    if (IView.permit_type_filter.indexOf("all") === -1)
    {
      filtered = filtered.filter(function (j)
      {
        return IView.permit_type_filter.indexOf(j.PermitNo.substr(0, 1)) !== -1;
      });
    }

    // filter by private provider
    if (IView.private_provider_only)
    {
      filtered = filtered.filter(function (j) { return j.IsPrivateProvider; });
    }

    // filter by invalid address
    if (IView.invalid_address_only)
    {
      filtered = filtered.filter(function (j) { return !j.AddressPoint.IsValid || !j.ParcelPoint.IsValid; });
    }

    // filter by inspector
    if (IView.inspector_filter.indexOf("All") === -1)
    {
      
      filtered = filtered.filter(function (j)
      {
        return IView.inspector_filter.indexOf(j.InspectorName) !== -1;
      });
    }

    Inspector.UpdateCurrentCount(IView.allInspectors, filtered);
    UpdateLegend(IView.allInspectors.filter(function (j) { return j.CurrentCount > 0; }));

    return filtered;
  }

  function UpdateLegend(inspectors: Array<Inspector>):void
  {
    let ol = document.getElementById("InspectorList");
    Utilities.Clear_Element(ol);
    for(let i of inspectors)
    {

      let li = document.createElement("li");
      li.style.color = i.Id === 0 ? "black" : "white";
      //li.id = "inspector" + i.Id;
      li.style.paddingLeft = "1em";
      li.style.paddingRight = "1em";
      li.style.backgroundColor = i.Color;
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      let inspectorName = document.createElement("span");
      inspectorName.appendChild(document.createTextNode(i.Name));
      inspectorName.style.textAlign = "left";
      let count = document.createElement("span");
      count.appendChild(document.createTextNode(i.CurrentCount.toString()));
      count.style.textAlign = "right";
      li.appendChild(inspectorName);
      li.appendChild(count);
      ol.appendChild(li);
    }
    
  }

  function Get_Single_Filter(selector: string): string
  {
    return (<HTMLInputElement>document.querySelector(selector)).value;
  }

  function Get_Filters(selector: string): Array<string>
  {
    let inputs = <NodeListOf<HTMLInputElement>>document.querySelectorAll(selector);
    let values: Array<string> = [];
    for (let i = 0; i < inputs.length; i++)
    {
      values.push(inputs.item(i).value);
    }
    return values;
  }

  export function HandleHash()
  {
    let hash = location.hash;
    let currentHash = new LocationHash(location.hash.substring(1));
    if (currentHash.InspectionId > 0)
    {
      let i = allInspections.filter(function (j) { return j.InspReqID === currentHash.InspectionId });
      if (i.length > 0)
      {
        console.log('inspection based on passed id', i, 'inspection point to use', i[0].PointToUse);
        mapController.CenterAndZoom(i[0].PointToUse);
        let ii = allInspections.filter(function (j) { return j.PointToUse.Latitude === i[0].PointToUse.Latitude });
        console.log('all points', ii);
      }
    }
  }

  export function mapLoadCompleted()
  {
    mapLoaded = true;
    console.log("map load completed");
    BuildAndLoadInitialLayers();
  }

  export function BuildAndLoadInitialLayers()
  {
    if (!mapLoaded || !dataLoaded) return;
    window.onhashchange = HandleHash;
    HandleHash();
    mapController.UpdateLocationLayer(IView.filteredLocations);
    Unit.GetUnits();

    //mapController.ClearLayers();

    //let days = ["Today", "Tomorrow"];
    //if (currentDay === "") currentDay = days[0];
    //for (let d of days)
    //{
    //  let inspections = allInspections.filter(
    //    function (k)
    //    {
    //      return k.ScheduledDay === d && !k.IsCompleted;
    //    }); // todays incompleted inspections

    //  let inspectors = buildInspectorData(inspections);
    //  mapController.ApplyLayers(
    //    mapController.CreateLayers(inspectors, d, false) // , days[0] === currentDay
    //  );
    //  inspections = allInspections.filter(
    //    function (k)
    //    {
    //      return k.ScheduledDay === d;
    //    }); // todays incompleted inspections

    //  //inspectors = buildInspectorData(inspections);
    //  mapController.ApplyLayers(
    //    mapController.CreateLayers(inspectors, d, true) // , days[0] === currentDay
    //  );

    //}

    //mapController.ToggleLayersByDay(currentDay, currentIsComplete);
    //BuildLegend();
  }

  export function DrawToggle():void
  {
    let select: HTMLSelectElement = <HTMLSelectElement>document.getElementById("bulkAssignSelect");
    let button: HTMLButtonElement = <HTMLButtonElement>document.getElementById("bulkAssignButton");
    let selectedInspector = Utilities.Get_Value(select)
    if (selectedInspector === "-1")
    {
      Utilities.Error_Show("bulkAssignError", "Please choose an inspector.", true);
      return;
    }
    mapController.ToggleDraw();
  }

  export function ShowFilters()
  {
    document.getElementById("filters").classList.add("is-active");
  }

  export function ShowInspectors()
  {
    document.getElementById("inspectorEdit").classList.add("is-active");
  }

  export function CloseLocationModal()
  {
    IView.current_location = null;
    let symbol = IView.last_selected_graphic.symbol;
    let color = IView.last_symbol_color;
    window.setTimeout(function (j)
    {
      symbol.color = color;       
      IView.location_layer.redraw();      
    }, 10000)
    CloseModals();
  }

  export function CloseModals(): void
  {
    let modals = document.querySelectorAll(".modal");
    if (modals.length > 0)
    {
      for (let i = 0; i < modals.length; i++)
      {
        let modal = modals.item(i);
        modal.classList.remove("is-active");
      }
    }
  }

  export function Bulk_Assign_Location(event: any): void
  {
    if (IView.current_location === null) return;
    let selectedInspector = Utilities.Get_Value(event.srcElement);
    if (selectedInspector.length === 0) return;
    let inspectors = IView.allInspectors.filter(function (i) { return i.Name === selectedInspector });
    let parent = event.srcElement.parentElement;
    if (inspectors.length === 1)
    {
      let id = inspectors[0].Id;
      let inspectionIds = IView.current_location.inspections.map(function (i) { return i.InspReqID });
      Inspection.BulkAssign(id, inspectionIds, parent);
    }        
  }

  export function FindItemsInExtent(extent: any): void
  {
    let LookupKeys: Array<string> = mapController.FindItemsInExtent(extent);
    let InspectorId: number = parseInt((<HTMLSelectElement>document.getElementById("bulkAssignSelect")).value);
    BulkAssign(InspectorId, LookupKeys);
  }

  function BulkAssign(InspectorId: number, LookupKeys: Array<string>)
  {
    let InspectionIds: Array<number> = [];
    for (let i of allInspections)
    {
      if (LookupKeys.indexOf(i.LookupKey) !== -1)
      {
        InspectionIds.push(i.InspReqID);
      }
    }
    //let i = new Inspection();
    Inspection.BulkAssign(InspectorId, InspectionIds);
  }


}