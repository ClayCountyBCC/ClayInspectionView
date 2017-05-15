/// <reference path="map.ts" />
//import MapController from "./map";


namespace IView
{
  export let mapController: MapController;
  export let todayInspections: Array<Inspection>;
  export let todayTotalInspections: Array<Inspection>;
  export let tomorrowInspections: Array<Inspection>;
  export let tomorrowTotalInspections: Array<Inspection>;
  export let allInspectors: Array<Inspector>;

  export function Start(): void 
  {
    // things to do:
    // setup default map
    mapController = new MapController("map"); 
    // get the data for today/tomorrow
    UpdateInspectors();
    // update the counts

    // draw the layers



  }

  function UpdateAllInspections(): void
  {
    UpdateInspections("Today", "", todayInspections);
    UpdateInspections("Today", "Total", todayTotalInspections);
    UpdateInspections("Tomorrow", "", tomorrowInspections);
    UpdateInspections("Tomorrow", "Total", tomorrowTotalInspections);
  }

  function UpdateInspections(Day: string, Total: string, insp: Array<Inspection>): void
  {
    var i = new Inspection();
    i.GetInspections(Day, Total).then(function (inspections: Array<Inspection>)
    {
      console.log(Total + ' inspections ' + Day, inspections);
      insp = inspections;
    }, function ()
      {
        console.log('error getting ' + Total + ' inspections ' + Day);
        insp = [];
      });
  }

  function UpdateInspectors(): void
  {
    var i = new Inspector();
    i.GetInspectors().then(function (inspectors: Array<Inspector>)
    {
      console.log("Inspectors", inspectors);
      allInspectors = inspectors;
      UpdateAllInspections();
    }, function ()
      {
        console.log('error getting inspectors');
        // do something with the error here
        allInspectors = [];
      });
  }



}