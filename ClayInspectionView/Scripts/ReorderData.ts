namespace IView
{
  interface IReorderData
  {
    inspection_id: number;
    inspection_order: number;
  }

  export class ReorderData implements IReorderData
  {
    public inspection_id: number;
    public inspection_order: number;

    constructor(id: number, order: number)
    {
      this.inspection_id = id;
      this.inspection_order = order;
    }

    public static Save(button: HTMLButtonElement):void
    {
      // this function will save the order of whatever items are in the IView.myLocations array
      Utilities.Toggle_Loading_Button(button, true);

      let data: Array<ReorderData> = [];
      for (let location of IView.myLocations)
      {
        location.unordered = false;
        for (let inspection of location.inspections)
        {
          data.push(new ReorderData(inspection.InspReqID, location.order));
        }
      }

      let path = Utilities.Get_Path("/inspectionview");

      Utilities.Post<Array<Inspection>>(path + "API/Inspections/Reorder", data)
        .then(function (inspections: Array<Inspection>)
        {
          if (inspections.length === 0)
          {
            alert("There was an error saving the order, your changes might not be saved.");
            Utilities.Toggle_Loading_Button(button, false);
            return;
          }
          Inspection.HandleInspections(inspections);
          Utilities.Toggle_Loading_Button(button, false);

        }, function (e)
          {
            console.log('error in Reordering Insepctions', e);
            Utilities.Toggle_Loading_Button(button, false);
          });

    }

  }
}