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
    return filtered;
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

  //function BuildLegend(): void
  //{
  //  console.log("exiting build legend call early");
  //  return;

  //  let legend = <HTMLElement>document.getElementById("LegendInspectorList");
  //  clearElement(legend);
  //  let inspections = allInspections.filter(
  //    function (k)
  //    {
  //      if (currentIsComplete)
  //      {
  //        return k.ScheduledDay === currentDay;
  //      }
  //      else
  //      {
  //        return k.ScheduledDay === currentDay && k.IsCompleted === false;
  //      }
  //    });
  //  let inspectors = buildInspectorData(inspections);    
  //  let ol = document.createElement("ol");
  //  inspectors.forEach(function (i)
  //  {
  //    let li = document.createElement("li");
  //    li.id = "inspector" + i.Id;
  //    li.style.backgroundColor = i.Color;      
  //    li.style.display = "flex";
  //    li.style.justifyContent = "space-between";
  //    li.onclick = () => OnInspectorClick(i);
  //    let inspectorName = document.createElement("span");
  //    inspectorName.appendChild(document.createTextNode(i.Name));
  //    inspectorName.style.textAlign = "left";
  //    inspectorName.style.marginLeft = "1em";
  //    let count = document.createElement("span");
  //    count.appendChild(document.createTextNode(i.Inspections.length.toString()));
  //    count.style.textAlign = "right";
  //    count.style.marginRight = "1em";      
  //    li.appendChild(inspectorName);
  //    li.appendChild(count);
  //    ol.appendChild(li);
  //  });
  //  legend.appendChild(ol);
  //}

  //function OnInspectorClick(i: Inspector)
  //{
  //  //let x = document.querySelector("ul.nav li.active").id.toLowerCase().split("-");
  //  //currentIsComplete = (x[x.length - 1] === "incomplete" ? false : true);

  //  let e = document.getElementById("inspector" + i.Id);
  //  if (e.classList.contains("strike"))
  //  {
  //    e.classList.remove("strike"); // it's already hidden, let's show it
  //    mapController.ToggleLayers(i.Id, currentDay, currentIsComplete, true);
  //  }
  //  else
  //  {
  //    e.classList.add("strike"); // let's add a strikethrough
  //    mapController.ToggleLayers(i.Id, currentDay, currentIsComplete, false);
  //  }
  //}

  //export function DrawToggle():void
  //{
  //  let select: HTMLSelectElement = <HTMLSelectElement>document.getElementById("BulkAssignSelect");
  //  let button: HTMLButtonElement = <HTMLButtonElement>document.getElementById("BulkAssignButton");
  //  let o = select.selectedOptions[0];
  //  if (!button.disabled)
  //  {
  //    button.textContent = "Bulk Assigning to: " + o.label;
  //  }
  //  else
  //  {
  //    button.textContent = "Bulk Assign";
  //  }
  //  mapController.ToggleDraw();
  //}

  //export function toggle(id: string, show: boolean): void
  //{
  //  document.getElementById(id).style.display = show ? "inline-block" : "none";
  //}

  //export function GetAllInspections(): void
  //{
  //  toggle('showSpin', true);
  //  let button = (<HTMLButtonElement>document.getElementById("refreshButton"));
  //  button.disabled = true;
  //  console.log('GetallInspections');
  //  Inspection.GetInspections()
  //    .then(
  //    function (inspections: Array<Inspection>): void
  //    {
  //      console.log('inspections', inspections);
  //      allInspections = inspections;
  //      Location.GetAllLocations(inspections);
  //      dataLoaded = true;
  //      BuildAndLoadInitialLayers();
  //       update the counts
  //      UpdateCounts(currentDay);
  //      toggle('showSpin', false);
  //      button.disabled = false;
  //    }, function (): void
  //    {
  //      console.log('error getting All inspections');
  //      allInspections = [];
  //      toggle('showSpin', false);
  //      button.disabled = false;
  //    });
  //}

  //function UpdateCounts(day: string)
  //{    
  //  let i = allInspections.filter(function (k) { return k.ScheduledDay === day }); // our total
  //  let total = i.length;
  //  i = i.filter(function (k) { return !k.IsCompleted }); // let's weed out the ones that are completed.'
  //  let current = i.length;
  //  let e = (<HTMLElement>document.getElementById("OpenInspectionsNav"));// update our totals.
  //  clearElement(e);
  //  let count = "Open Inspections: " + current + " of " + total;
  //  e.appendChild(document.createTextNode(count));
  //}

  //function UpdateInspectors(): void
  //{
  //  Inspector.GetAllInspectors().then(function (inspectors: Array<Inspector>)
  //  {
  //    allInspectors = inspectors;
  //    //BuildBulkInspectorSelect();
  //    GetAllInspections();
  //    window.setInterval(GetAllInspections, 60 * 5 * 1000);
  //  }, function ()
  //    {
  //      console.log('error getting inspectors');
  //      // do something with the error here
  //      allInspectors = [];
  //    });
  //}

  //function BuildBulkInspectorSelect():void
  //{
  //  let select:HTMLSelectElement = <HTMLSelectElement>document.getElementById("BulkAssignSelect");
  //  for (let i of allInspectors)
  //  {
  //    let o = document.createElement("option");
  //    o.value = i.Id.toString();
  //    o.text = i.Name;
  //    select.options.add(o);
  //  }
  //}

  //export function BulkAssignChange()
  //{
  //  let select: HTMLSelectElement = <HTMLSelectElement>document.getElementById("BulkAssignSelect");
  //  let button: HTMLButtonElement = <HTMLButtonElement>document.getElementById("BulkAssignButton");
  //  let o = select.selectedOptions[0];
  //  button.disabled = (o.value === "");
  //  //if (!button.disabled)
  //  //{
  //  //  let inspector: Inspector = allInspectors.filter(function (i) { return i.Id.toString() === o.value; })[0];
  //  //  let lookupKeys: Array<string> = [];
  //  //  lookupKeys = GetInvalidInspections(inspector);
  //  //  mapController.MarkItemsToIndicateNoMatch(lookupKeys);
  //  //}
  //  button.textContent = "Bulk Assign";
  //  mapController.ToggleDraw(false);
  //}

  //function GetInvalidInspections(inspector: Inspector): Array<string>
  //{
  //  // this function returns a list of the lookupkeys that the selected
  //  // inspector doesn't have the necessary licenses to inspect.

  //  let lookupKeys: Array<string> = [];
  //  for (let i of allInspections)
  //  {
  //    if (i.IsPrivateProvider && !inspector.PrivateProvider)
  //    {
  //      if (lookupKeys.indexOf(i.LookupKey) === -1) lookupKeys.push(i.LookupKey);
  //    } else
  //    {
  //      if (
  //        i.CBL && !inspector.CBL || 
  //        i.CEL && !inspector.CEL ||
  //        i.CME && !inspector.CME ||
  //        i.CPL && !inspector.CPL ||
  //        i.RBL && !inspector.RBL ||
  //        i.REL && !inspector.REL ||
  //        i.RME && !inspector.RME ||
  //        i.RPL && !inspector.RPL ||
  //        i.Fire && !inspector.Fire)
  //      {
  //        if (i.LookupKey === '2821-BOLTON-ORANGE PARK32073')
  //        {
  //          console.log('found');
  //        }
  //        if(lookupKeys.indexOf(i.LookupKey) === -1) lookupKeys.push(i.LookupKey);
  //      }
  //    }
  //  }
  //  console.log('invalid lookupkeys', lookupKeys);
  //  if (lookupKeys.indexOf('2821-BOLTON-ORANGE PARK32073') != -1)
  //  {
  //    console.log('found in array');
  //  }
  //  return lookupKeys;
  //}

  function buildInspectorData(inspections): Array<Inspector>
  {
    let iData = allInspectors.map(function (i)
    {
      let x: Inspector = new Inspector();
      x.Id = i.Id
      x.Name = i.Name;
      x.Inspections = inspections.filter(
        function (v)
        {
          return v.InspectorName === x.Name;
        });
      if (x.Inspections.length > 0)
      {
        x.Color = x.Inspections[0].Color;
      } else
      {
        x.Color = '#FFFFFF';
      }
      return x;
    });

    iData = iData.filter(function (v) { return v.Inspections.length > 0 });
    return iData;
  }

  function buildAddressDisplayByDay(i: Array<Inspection>, day: string):string
  {
    var x = [];
    x.push("<li><span>")
    x.push(day);
    x.push(" - Total Inspections: ")
    x.push(i.length)
    x.push("</span></li>");
    i.map(function (n)
    {
      x.push("<li><a target='clayinspections' href='/InspectionScheduler/#permit=");
      x.push(n.PermitNo);
      x.push("&inspectionid=")
      x.push(n.InspReqID)
      x.push("'>");
      x.push(n.PermitNo);
      x.push(" - ");
      x.push(n.InspectionDescription);
      x.push(" - ");
      x.push(n.IsCommercial ? "Commercial" : "Residential");
      x.push(" - ");
      x.push(n.IsPrivateProvider ? "Private Provider" : "Not Private");
      x.push("</a></li>");
    });
    return x.join('');
  }

  //export function Assign(e: HTMLElement, InspectorId:number)
  //{
  //  let LookupKey = e.id;
  //  let lk: Array<string> = [LookupKey];
  //  BulkAssign(InspectorId, lk);
  //}

  function buildInspectorAssign(assignedTo: string, lookupKey: string)
  {
    var x = [];
    x.push("<li style='margin-bottom: .5em;'><span>Assigned to:</span>");
    x.push("<select id='")
    x.push(lookupKey)    
    x.push("' onchange='IView.Assign(this, this.value);'>");
    allInspectors.forEach(function (i)
    {
      x.push("<option value='");
      x.push(i.Id);
      if (i.Name === assignedTo)
      {
        x.push("' selected>");
      }
      else
      {
        x.push("'>");
      }

      x.push(i.Name);
      x.push("</option>");
    });
    x.push("</select></li>");
    return x.join('');
  }

  //export function mapAddressClick(graphic):string
  //{
  //  let inspections:Array<Inspection> = allInspections.filter(function (k: Inspection)
  //  {
  //    return k.LookupKey === graphic.attributes.LookupKey;
  //  });
  //  let today = inspections.filter(function (k) { return k.ScheduledDay === "Today" });
  //  let tomorrow = inspections.filter(function (k) { return k.ScheduledDay !== "Today" });
  //  var x = [];
  //  x.push("<ol>");
  //  let InspectorName: string = currentDay === "Today" ? today[0].InspectorName : tomorrow[0].InspectorName;
  //  let isCompletedCheck: boolean = currentDay === "Today" ? today[0].IsCompleted : tomorrow[0].IsCompleted;
  //  console.log('Inspector Name', InspectorName, 'completedcheck', isCompletedCheck, inspections[0].CanBeAssigned);
  //  if (!isCompletedCheck && inspections[0].CanBeAssigned)
  //  {
  //    x.push(buildInspectorAssign(InspectorName, graphic.attributes.LookupKey));
  //  }
  //  else
  //  {
  //    if (isCompletedCheck)
  //    {
  //      x.push("<li>This inspection is already completed.</li>");
  //    }
  //  }
  //  x.push(buildAddressDisplayByDay(today, "Today"));
  //  x.push(buildAddressDisplayByDay(tomorrow, "Tomorrow"));
  //  x.push("</ol>");
  //  return x.join('');
  //}

  export function ShowFilters()
  {
    document.getElementById("filters").classList.add("is-active");
  }

  export function ShowInspectors()
  {
    document.getElementById("inspectorEdit").classList.add("is-active");
  }

  export function CloseModals(): void
  {
    //Location.CreateLocations(IView.ApplyFilters(IView.allInspections));
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

  //export function ChangeDay()
  //{
  //  var ddl = <HTMLSelectElement>document.getElementById("selectDay");
  //  switch (ddl.value)
  //  {
  //    case "today-open":
  //      toggleNavDisplay('Today', false);
  //      break;
  //    case "today-all":
  //      toggleNavDisplay('Today', true);
  //      break;
  //    case "tomorrow-open":
  //      toggleNavDisplay('Tomorrow', false);
  //      break;
  //    case "tomorrow-all":
  //      toggleNavDisplay('Tomorrow', true);
  //      break;
  //  }
  //}

  //export function toggleNavDisplay(key:string, isCompleted:boolean):void
  //{
  //  currentIsComplete = isCompleted;
  //  currentDay = key;
  //  mapController.ToggleLayersByDay(key, isCompleted);
  //  BuildLegend();
  //  UpdateCounts(key);
  //}

  //export function clearElement(node: HTMLElement): void
  //{ // this function just emptys an element of all its child nodes.
  //  while (node.firstChild)
  //  {
  //    node.removeChild(node.firstChild);
  //  }
  //}

  //export function FindItemsInExtent(extent: any): void
  //{
  //  let LookupKeys: Array<string> = mapController.FindItemsInExtent(extent);
  //  let InspectorId: number = parseInt((<HTMLSelectElement>document.getElementById("BulkAssignSelect")).value);
  //  BulkAssign(InspectorId, LookupKeys);
  //}

  //function BulkAssign(InspectorId: number, LookupKeys: Array<string>)
  //{
  //  let InspectionIds: Array<number> = [];
  //  for (let i of allInspections)
  //  {
  //    if (LookupKeys.indexOf(i.LookupKey) !== -1 &&
  //      i.ScheduledDay === currentDay)
  //    {
  //      if (currentIsComplete || (!currentIsComplete && !i.IsCompleted))
  //      {
  //        InspectionIds.push(i.InspReqID);
  //      }
  //    }
  //  }
  //  //let i = new Inspection();
  //  Inspection.BulkAssign(InspectorId, InspectionIds);
  //}


}