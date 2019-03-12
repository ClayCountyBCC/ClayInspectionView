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
    MasterPermitNumber: string;
    PropUseInfo: string;
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
    public MasterPermitNumber: string = "";
    public PropUseInfo: string = "";
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

    public static GetValidInspectors(inspection: Inspection): Array<Inspector>
    {
      return IView.allInspectors.filter(function (i)
      {
        return ((inspection.RBL === i.RBL === true) || !inspection.RBL) &&
          ((inspection.CBL === i.CBL === true) || !inspection.CBL) &&
          ((inspection.REL === i.REL === true) || !inspection.REL) &&
          ((inspection.CEL === i.CEL === true) || !inspection.CEL) &&
          ((inspection.RME === i.RME === true) || !inspection.RME) &&
          ((inspection.CME === i.CME === true) || !inspection.CME) &&
          ((inspection.RPL === i.RPL === true) || !inspection.RPL) &&
          ((inspection.CPL === i.CPL === true) || !inspection.CPL) &&
          ((inspection.Fire === i.Fire === true) || !inspection.Fire);
      });
    }

    public static GetInspections(): void
    {
      Utilities.Toggle_Loading_Button("refreshButton", true);
      Utilities.Toggle_Loading_Button("filterButton", true);
      let path = Utilities.Get_Path("/inspectionview");
      Utilities.Get<Array<Inspection>>(path + "API/Inspections/GetInspections")
        .then(function (inspections: Array<Inspection>)
        {
          Inspection.HandleInspections(inspections);
          
          Utilities.Toggle_Loading_Button("refreshButton", false);
          Utilities.Toggle_Loading_Button("filterButton", false);
          
        }, function (e)
          {
            console.log('error getting inspectors', e);
            IView.allInspectors = [];
          Utilities.Toggle_Loading_Button("refreshButton", false);
          Utilities.Toggle_Loading_Button("filterButton", false);
          });
    }

    public static GetPermitNotes(PermitNo: string, button: HTMLButtonElement, target: HTMLElement): void
    {
      if (PermitNo.length === 0) return;
      Utilities.Toggle_Loading_Button(button, true);      
      let path = Utilities.Get_Path("/inspectionview");
      Utilities.Get<Array<string>>(path + "API/Inspections/GetPermitNotes?PermitNo=" + PermitNo)
        .then(function (notes: Array<string>)
        {
          if (notes.length > 0)
          {
            for (let n of notes)
            {
              let p = document.createElement("p");
              p.classList.add("has-text-left");
              p.appendChild(document.createTextNode(IView.Strip_Html(n)));
              target.appendChild(p);
            }
          }
          else
          {
            let p = document.createElement("p");
            p.classList.add("has-text-left");
            p.appendChild(document.createTextNode("No notes found."));
            target.appendChild(p);
          }


          Utilities.Toggle_Loading_Button(button, false);
        }, function (e)
          {
            console.log('error getting permit notes', e);
          
            Utilities.Toggle_Loading_Button(button, false);
          });
    }



    static HandleInspections(inspections: Array<Inspection>): void
    {
      for (let i of inspections)
      {
        i.ValidInspectors = Inspection.GetValidInspectors(i);
      }
      IView.allInspections = inspections;
      Location.CreateLocations(IView.ApplyFilters(inspections));
      if (IView.current_location !== null)
      {
        let locations = IView.filteredLocations.filter(function (i) { return i.lookup_key === IView.current_location.lookup_key; });
        if (locations.length === 1)
        {
          IView.current_location = locations[0];
          IView.current_location.LocationView();
        }
      }
    }

    public static BulkAssign(InspectorId: number, InspectionIds: Array<number>, parentElement: HTMLElement = undefined): void
    {
      if (InspectionIds.length === 0) return;
      if (parentElement) parentElement.classList.add("is-loading");
      let button: HTMLButtonElement = <HTMLButtonElement>document.getElementById("bulkAssignButton");
      Utilities.Toggle_Loading_Button(button, true);
      let path = Utilities.Get_Path("/inspectionview");
      //IView.toggle('showSpin', true);
      let AssignData = {
        InspectorId: InspectorId,
        InspectionIds: InspectionIds
      };
      Utilities.Post<Array<Inspection>>(path + "API/Assign/BulkAssign/", AssignData)
        .then(function (inspections: Array<Inspection>)
        {
          Utilities.Toggle_Loading_Button(button, false);
          if (inspections.length === 0)
          {
            alert("Server error in Bulk Assign.");
            return;
          }
          Inspection.HandleInspections(inspections);
          if (parentElement) parentElement.classList.remove("is-loading");

        }, function (e)
          {
            console.log('error in Bulk Assign', e);
            Utilities.Toggle_Loading_Button(button, false);
            if (parentElement) parentElement.classList.remove("is-loading");
          });
      //new Promise<boolean>(function (resolve, reject)
      //{
      //  x.then(function (response)
      //  {
      //    IView.GetAllInspections();
      //    IView.toggle('showSpin', false);
      //    button.textContent = "Bulk Assign";
      //  }).catch(function ()
      //  {
      //    console.log("error in Bulk Assign Inspections");
      //    IView.toggle('showSpin', false);
      //    button.textContent = "Bulk Assign";
      //  });
    }

  }


}