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
  }
  export class Unit implements IUnit
  {
    public Name: string;
    public Date_Last_Communicated: any;
    public Longitude: number;
    public Latitude: number;
    public Unit_Icon_URL: string;
    public Unit_Status_Icon_URL: string;

    constructor() { }

    public static GetUnits():void
    {
      let path = Utilities.Get_Path("/inspectionview");
      Utilities.Get<Array<Unit>>(path + "API/Unit/List")
        .then(function (units: Array<Unit>)
        {
          console.log('units', units);
          IView.allUnits = units;
          console.log('build units layer');

        }, function (e)
          {
            console.log('error getting units');
            IView.allUnits = [];
          });
    }


  }

}