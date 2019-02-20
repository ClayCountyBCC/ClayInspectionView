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
    Age: number;
    CanBeAssigned: boolean;
    AddressPoint: Point;
    ParcelPoint: Point;
    PointToUse: Point;
    ValidInspectors: Array<Inspector>;
    RBL: boolean;
    CBL: boolean;
    REL: boolean;
    CEL: boolean;
    RME: boolean;
    CME: boolean;
    RPL: boolean;
    CPL: boolean;
    Fire: boolean;

    //GetInspections(Day: string, Total: string): Promise<Array<Inspection>>;
    //BulkAssign(InspectorId: number, InspectionIds: Array<number>);
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
    public ScheduledDate: Date;
    public InspDateTime: Date;
    public ScheduledDay: string;
    public Age: number = -1;
    public AddressPoint: Point;
    public ParcelPoint: Point;
    public PointToUse: Point;
    public ValidInspectors: Array<Inspector> = [];
    public RBL: boolean;
    public CBL: boolean;
    public REL: boolean;
    public CEL: boolean;
    public RME: boolean;
    public CME: boolean;
    public RPL: boolean;
    public CPL: boolean;
    public Fire: boolean;

    constructor()
    {

    }

    public static GetInspections(): void
    {
      
      let path = Utilities.Get_Path("/inspectionview");
      Utilities.Get<Array<Inspection>>(path + "API/Inspections/GetInspections")
        .then(function (inspections: Array<Inspection>)
        {
          IView.allInspections = inspections;
          Utilities.Toggle_Loading_Button("refreshButton", false);
          Location.GetAllLocations(inspections);
        }, function (e)
          {
            console.log('error getting inspectors', e);
            IView.allInspectors = [];
            Utilities.Toggle_Loading_Button("refreshButton", false);
          });
      //var x = XHR.Get("API/Inspections/GetInspections");
      //return new Promise<Array<Inspection>>(function (resolve, reject)
      //{
      //  x.then(function (response)
      //  {
      //    let ar: Array<Inspection> = JSON.parse(response.Text);
      //    return resolve(ar);
      //  }).catch(function ()
      //  {
      //    console.log("error in Get Inspections");
      //    return reject(null);
      //  });
      //});
    }

    //public static BulkAssign(InspectorId: number, InspectionIds: Array<number>): void
    //{
    //  let button: HTMLButtonElement = <HTMLButtonElement>document.getElementById("BulkAssignButton");
    //  IView.toggle('showSpin', true);
    //  let AssignData = {
    //    InspectorId: InspectorId,
    //    InspectionIds: InspectionIds
    //  }
    //  var x = XHR.Post("API/Assign/BulkAssign/",  JSON.stringify(AssignData));
    //  new Promise<boolean>(function (resolve, reject)
    //  {
    //    x.then(function (response)
    //    {
    //      IView.GetAllInspections();
    //      IView.toggle('showSpin', false);
    //      button.textContent = "Bulk Assign";
    //    }).catch(function ()
    //    {
    //      console.log("error in Bulk Assign Inspections");
    //      IView.toggle('showSpin', false);
    //      button.textContent = "Bulk Assign";
    //    });
    //  });
    //}

    



  }


}