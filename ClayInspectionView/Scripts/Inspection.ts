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
    InspectionCode: string;
    ScheduledDate: Date;
    InspDateTime: Date;
    AddressPoint: Point;
    ParcelPoint: Point;

    GetInspections(Day:string, Total:string): Promise<Array<Inspection>>;
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
    public InspectionCode: string;
    ScheduledDate: Date;
    InspDateTime: Date;
    public AddressPoint: Point;
    public ParcelPoint: Point;

    constructor()
    {

    }

    GetInspections(Day:string, Total: string): Promise<Array<Inspection>>
    {
      var x = XHR.Get("/API/" + Total + "Inspections/" + Day);
      return new Promise<Array<Inspection>>(function (resolve, reject)
      {
        x.then(function (response)
        {
          let ar: Array<Inspection> = JSON.parse(response.Text);
          return resolve(ar);
        }).catch(function ()
        {
          console.log("error in Get " + Total + "Inspections for " + Day);
          return reject(null);
        });
      });
    }

  }


}