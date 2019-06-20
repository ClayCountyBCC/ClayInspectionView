/// <reference path="point.ts" />
/// <reference path="ui.ts" />
/// <reference path="app.ts" />

namespace IView
{
  interface IUnit
  {
    Name: string;
    Date_Last_Communicated: any;
    Longitude: number;
    Latitude: number;
    Unit_Icon_URL: string;
    Unit_Status_Icon_URL: string;
    Assigned_Inspector: string; 
  }
  export class Unit implements IUnit
  {
    public Name: string;
    public Date_Last_Communicated: any;
    public Longitude: number;
    public Latitude: number;
    public Unit_Icon_URL: string;
    public Unit_Status_Icon_URL: string;
    public Assigned_Inspector: string = "";

    constructor() { }

    public static GetUnits():void
    {
      let path = Utilities.Get_Path("/inspectionview");
      Utilities.Get<Array<Unit>>(path + "API/Unit/List")
        .then(function (units: Array<Unit>)
        {
          IView.allUnits = units;
          IView.mapController.UpdateUnitLayer(units);

        }, function (e)
          {
            console.log('error getting units', e);
            IView.allUnits = [];
          });
    }

    public static UnitView(unit: Unit): string
    {
      let ol = document.createElement("ol");
      let li = document.createElement("li");
      li.appendChild(document.createTextNode("Date Last Updated: " + Utilities.Format_DateTime(unit.Date_Last_Communicated)));
      ol.appendChild(li);
      return ol.outerHTML;
    }


  }

}