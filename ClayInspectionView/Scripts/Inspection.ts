/// <reference path="point.ts" />
/// <reference path="ui.ts" />
/// <reference path="app.ts" />


namespace IView
{
  interface IInspection
  {
    InspReqID: number;
    IsCommercial: boolean;
    IsPrivateProvider: boolean;
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
    BulkAssign(InspectorId: number, InspectionIds: Array<number>);
  }
  export class Inspection implements IInspection
  {
    public InspReqID: number;
    public IsCommercial: boolean;
    public IsPrivateProvider: boolean;
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
      var x = XHR.Get("API/Inspections/GetInspections");
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

    BulkAssign(InspectorId: number, InspectionIds: Array<number>): void
    {
      let button: HTMLButtonElement = <HTMLButtonElement>document.getElementById("BulkAssignButton");
      IView.toggle('showSpin', true);
      let AssignData = {
        InspectorId: InspectorId,
        InspectionIds: InspectionIds
      }
      var x = XHR.Post("API/Assign/BulkAssign/",  JSON.stringify(AssignData));
      new Promise<boolean>(function (resolve, reject)
      {
        x.then(function (response)
        {
          IView.GetAllInspections();
          IView.toggle('showSpin', false);
          button.textContent = "Bulk Assign";
        }).catch(function ()
        {
          console.log("error in Bulk Assign Inspections");
          IView.toggle('showSpin', false);
          button.textContent = "Bulk Assign";
        });
      });
    }
  }


}