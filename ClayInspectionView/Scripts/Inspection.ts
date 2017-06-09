/// <reference path="point.ts" />
/// <reference path="ui.ts" />
/// <reference path="app.ts" />


namespace IView
{
  interface IInspection
  {
    LookupKey: string;
    AddressNumber: string;
    StreetName: string;
    StreetAddressCombined: string;
    City: string;
    Zip: string;
    InspectorName: string;
    InspectionDescription: string;
    PermitNo: string;
    Color: string;
    Parcel: string;
    IsCompleted: boolean;
    InspectionCode: string;
    ScheduledDate: Date;
    InspDateTime: Date;
    ScheduledDay: string;
    CanBeAssigned: boolean;
    AddressPoint: Point;
    ParcelPoint: Point;
    PointToUse: Point;

    GetInspections(Day: string, Total: string): Promise<Array<Inspection>>;
    Assign(InspectorId: number, LookupKey: string, Day: string): void;
  }
  export class Inspection implements IInspection
  {
    public LookupKey: string;
    public AddressNumber: string;
    public StreetName: string;
    public StreetAddressCombined: string;
    public City: string;
    public Zip: string;
    public InspectorName: string;
    public InspectionDescription: string;
    public PermitNo: string;
    public Color: string;
    public Parcel: string;
    public IsCompleted: boolean;
    public InspectionCode: string;
    public CanBeAssigned: boolean;
    ScheduledDate: Date;
    InspDateTime: Date;
    public ScheduledDay: string;
    public AddressPoint: Point;
    public ParcelPoint: Point;
    public PointToUse: Point;

    constructor()
    {

    }

    GetInspections(): Promise<Array<Inspection>>
    {
      var x = XHR.Get("API/Inspections");
      return new Promise<Array<Inspection>>(function (resolve, reject)
      {
        x.then(function (response)
        {
          let ar: Array<Inspection> = JSON.parse(response.Text);
          return resolve(ar);
        }).catch(function ()
        {
          console.log("error in Get Inspections");
          return reject(null);
        });
      });
    }

    Assign(InspectorId: number, LookupKey: string, Day: string): void
    {
      var x = XHR.Put("API/Assign/" + LookupKey + "/" + InspectorId.toString() + "/" + Day);
      new Promise<boolean>(function (resolve, reject)
      {
        x.then(function (response)
        {
        }).catch(function ()
        {
          console.log("error in Assign Inspections");
        });
      });
    }
  }


}