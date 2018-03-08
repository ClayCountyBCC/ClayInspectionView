/// <reference path="map.ts" />
/// <reference path="unit.ts" />
//import MapController from "./map";


namespace IView
{
  export let mapController: MapController;
  export let allInspections: Array<Inspection> =[];// populated from web service
  export let allInspectors: Array<Inspector> = []; // populated from web service
  export let allLayers: Array<any>; // all of the layers created.
  export let currentDay: string = "";
  export let currentIsComplete: boolean = false;
  let mapLoaded: boolean = false;
  let dataLoaded: boolean = false;
  export let currentInspectors: Array<Inspector>; // populated from data
  
  export function Start(): void 
  {
    // things to do:
    // setup default map
    mapController = new MapController("map");
    // get the data for today/tomorrow
    UpdateInspectors();
  }

  export function mapLoadCompleted()
  {
    mapLoaded = true;
    console.log("map load completed");
    BuildAndLoadInitialLayers();
  }

  function BuildAndLoadInitialLayers()
  {
    if (!mapLoaded || !dataLoaded) return;
    mapController.ClearLayers();
    let days = ["Today", "Tomorrow"];
    if(currentDay === "") currentDay = days[0];
    let inspections = allInspections.filter(
      function (k)
      {
        return k.ScheduledDay === days[0] && !k.IsCompleted;
      }); // todays incompleted inspections
    let inspectors = buildInspectorData(inspections);
    mapController.ApplyLayers(
      mapController.CreateLayers(inspectors, days[0], false, days[0] === currentDay)
    );
    

    inspections = allInspections.filter(
      function (k)
      {
        return k.ScheduledDay === days[0];
      }); // todays inspections both incomplete and completed
    mapController.ApplyLayers(
      mapController.CreateLayers(
        buildInspectorData(inspections),
        days[0],
        true,
        days[0] === currentDay && currentIsComplete === true)
    );

    inspections = allInspections.filter(
      function (k)
      {
        return k.ScheduledDay === days[1]
      }); // tomorrows inspections
    mapController.ApplyLayers(
      mapController.CreateLayers(
        buildInspectorData(inspections),
        days[1],
        true,
        days[1] === currentDay)
    );
    BuildLegend();
  }

  function BuildLegend(): void
  {
    let legend = <HTMLElement>document.getElementById("legend");
    clearElement(legend);
    let x = document.querySelector("ul.nav li.active").id.toLowerCase().split("-");
    let isCompleted = (x[x.length - 1] === "incomplete" ? false : true);
    let inspections = allInspections.filter(
      function (k)
      {
        if (isCompleted)
        {
          return k.ScheduledDay === currentDay;
        }
        else
        {
          return k.ScheduledDay === currentDay && k.IsCompleted === false;
        }
      });
    let inspectors = buildInspectorData(inspections);    
    let ol = document.createElement("ol");
    inspectors.forEach(function (i)
    {
      let li = document.createElement("li");
      li.id = "inspector" + i.Id;
      li.style.backgroundColor = i.Color;      
      li.style.display = "flex";
      li.style.justifyContent = "space-between";
      li.onclick = () => OnInspectorClick(i);
      let inspectorName = document.createElement("span");
      inspectorName.appendChild(document.createTextNode(i.Name));
      inspectorName.style.textAlign = "left";
      inspectorName.style.marginLeft = "1em";
      let count = document.createElement("span");
      count.appendChild(document.createTextNode(i.Inspections.length.toString()));
      count.style.textAlign = "right";
      count.style.marginRight = "1em";      
      li.appendChild(inspectorName);
      li.appendChild(count);
      ol.appendChild(li);
    });
    legend.appendChild(ol);
  }

  function OnInspectorClick(i: Inspector)
  {
    let x = document.querySelector("ul.nav li.active").id.toLowerCase().split("-");
    currentIsComplete = (x[x.length - 1] === "incomplete" ? false : true);

    let e = document.getElementById("inspector" + i.Id);
    if (e.classList.contains("strike"))
    {
      e.classList.remove("strike"); // it's already hidden, let's show it
      mapController.ToggleLayers(i.Id, currentDay, currentIsComplete, true);
    }
    else
    {
      e.classList.add("strike"); // let's add a strikethrough
      mapController.ToggleLayers(i.Id, currentDay, currentIsComplete, false);
    }
  }

  export function DrawToggle():void
  {
    let select: HTMLSelectElement = <HTMLSelectElement>document.getElementById("BulkAssignSelect");
    let button: HTMLButtonElement = <HTMLButtonElement>document.getElementById("BulkAssignButton");
    let o = select.selectedOptions[0];
    if (!button.disabled)
    {
      button.textContent = "Bulk Assigning to: " + o.label;
    }
    else
    {
      button.textContent = "Bulk Assign";
    }
    mapController.ToggleDraw();
  }

  export function toggle(id: string, show: boolean): void
  {
    document.getElementById(id).style.display = show ? "inline-block" : "none";
  }

  export function GetAllInspections(): void
  {
    toggle('showSpin', true);
    let button = (<HTMLButtonElement>document.getElementById("refreshButton"));
    button.disabled = true;
    console.log('GetallInspections');
    var i = new Inspection();
    i.GetInspections()
      .then(
      function (inspections: Array<Inspection>): void
      {
        console.log('inspections', inspections);
        allInspections = inspections;
        dataLoaded = true;
        BuildAndLoadInitialLayers();
        // update the counts
        UpdateCounts(currentDay);
        toggle('showSpin', false);
        button.disabled = false;
      }, function (): void
      {
        console.log('error getting All inspections');
        allInspections = [];
        toggle('showSpin', false);
        button.disabled = false;
      });
  }

  function UpdateCounts(day: string)
  {    
    let i = allInspections.filter(function (k) { return k.ScheduledDay === day }); // our total
    let total = i.length;
    i = i.filter(function (k) { return !k.IsCompleted }); // let's weed out the ones that are completed.'
    let current = i.length;
    let e = (<HTMLElement>document.getElementById("OpenInspectionsNav"));// update our totals.
    clearElement(e);
    let count = "Open Inspections: " + current + " of " + total;
    e.appendChild(document.createTextNode(count));
  }

  function UpdateInspectors(): void
  {
    var i = new Inspector();
    i.GetAllInspectors().then(function (inspectors: Array<Inspector>)
    {
      allInspectors = inspectors;
      BuildBulkInspectorSelect();
      GetAllInspections();
    }, function ()
      {
        console.log('error getting inspectors');
        // do something with the error here
        allInspectors = [];
      });
  }

  function BuildBulkInspectorSelect():void
  {
    let select:HTMLSelectElement = <HTMLSelectElement>document.getElementById("BulkAssignSelect");
    for (let i of allInspectors)
    {
      let o = document.createElement("option");
      o.value = i.Id.toString();
      o.text = i.Name;
      select.options.add(o);
    }
  }

  export function BulkAssignChange()
  {
    let select: HTMLSelectElement = <HTMLSelectElement>document.getElementById("BulkAssignSelect");
    let button: HTMLButtonElement = <HTMLButtonElement>document.getElementById("BulkAssignButton");
    let o = select.selectedOptions[0];
    button.disabled = (o.value === "");
    button.textContent = "Bulk Assign";
    mapController.ToggleDraw(false);
  }

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
      x.push("<li><a target='clayinspections' href='http://apps.claycountygov.com/InspectionScheduler/#permit=");
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

  export function Assign(e: HTMLElement, InspectorId:number)
  {
    let LookupKey = e.id;
    let lk: Array<string> = [LookupKey];
    BulkAssign(InspectorId, lk);
  }

  //function UpdateInspectionAssignments(lookupKey: string, assignedTo: number, day: string)
  //{
  //  let currentInspector = allInspectors.filter(function (k)
  //  {
  //    return k.Id == assignedTo;
  //  })[0];
  //  console.log(currentInspector);
  //  let inspections: Array<Inspection> = allInspections.filter(
  //    function (k: Inspection)
  //    {
  //      return k.LookupKey === lookupKey && k.ScheduledDay === day;
  //    });
  //  inspections.forEach(function (i)
  //  {
  //    i.InspectorName = currentInspector.Name;
  //    i.Color = currentInspector.Color;
  //  });
  //  BuildAndLoadInitialLayers();
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

  export function mapAddressClick(graphic):string
  {
    let inspections:Array<Inspection> = allInspections.filter(function (k: Inspection)
    {
      return k.LookupKey === graphic.attributes.LookupKey;
    });
    let today = inspections.filter(function (k) { return k.ScheduledDay === "Today" });
    let tomorrow = inspections.filter(function (k) { return k.ScheduledDay !== "Today" });
    var x = [];
    x.push("<ol>");
    if (!inspections[0].IsCompleted && inspections[0].CanBeAssigned)
    {
      x.push(buildInspectorAssign(inspections[0].InspectorName, graphic.attributes.LookupKey));      
    }    
    x.push(buildAddressDisplayByDay(today, "Today"));
    x.push(buildAddressDisplayByDay(tomorrow, "Tomorrow"));
    x.push("</ol>");
    return x.join('');
  }

  export function toggleNavDisplay(key:string, isCompleted:boolean):void
  {
    currentIsComplete = isCompleted;
    let x = document.querySelectorAll("ul.nav li.active");
    for (var i = 0; i < x.length; ++i)
    {
      (<HTMLLIElement>x[i]).classList.remove("active");
    }
    let id = "nav-" + key + "-" + (isCompleted ? "all" : "incomplete");
    document.getElementById(id).classList.add("active");    
    currentDay = key;
    mapController.ToggleLayersByDay(key, isCompleted);
    BuildLegend();
    UpdateCounts(key);
  }

  export function clearElement(node: HTMLElement): void
  { // this function just emptys an element of all its child nodes.
    while (node.firstChild)
    {
      node.removeChild(node.firstChild);
    }
  }

  export function FindItemsInExtent(extent: any): void
  {
    let LookupKeys: Array<string> = mapController.FindItemsInExtent(extent);
    let InspectorId: number = parseInt((<HTMLSelectElement>document.getElementById("BulkAssignSelect")).value);
    BulkAssign(InspectorId, LookupKeys);
  }

  function BulkAssign(InspectorId: number, LookupKeys: Array<string>)
  {
    let InspectionIds: Array<number> = [];
    for (let i of allInspections)
    {
      if (LookupKeys.indexOf(i.LookupKey) !== -1 &&
        i.ScheduledDay === currentDay)
      {
        if (currentIsComplete || (!currentIsComplete && !i.IsCompleted))
        {
          InspectionIds.push(i.InspReqID);
        }
      }
    }
    let i = new Inspection();
    i.BulkAssign(InspectorId, InspectionIds);
  }
}