/// <reference path="point.ts" />
/// <reference path="ui.ts" />
/// <reference path="app.ts" />


namespace IView
{
  interface IInspector
  {
    Id: number;
    Name: string;
    Color: string;
    RBL: boolean;
    CBL: boolean;
    REL: boolean;
    CEL: boolean;
    RME: boolean;
    CME: boolean;
    RPL: boolean;
    CPL: boolean;
    Fire: boolean;
    PrivateProvider: boolean;
    Inspections: Array<Inspection>;

  }
  export class Inspector implements IInspector
  {
    public Id: number;
    public Name: string;
    public Color: string;
    public RBL: boolean;
    public CBL: boolean;
    public REL: boolean;
    public CEL: boolean;
    public RME: boolean;
    public CME: boolean;
    public RPL: boolean;
    public CPL: boolean;
    public Fire: boolean;
    public PrivateProvider: boolean;
    public Inspections: Array<Inspection>;

    constructor()
    {
    }

    public static GetAllInspectors(): void
    {
      Utilities.Toggle_Loading_Button("refreshButton", true);
      Utilities.Toggle_Loading_Button("filterButton", true);

      let path = Utilities.Get_Path("/inspectionview");
      Utilities.Get<Array<Inspector>>(path + "API/Inspectors/List")
        .then(function (inspectors: Array<Inspector>)
        {
          console.log('inspectors', inspectors);
          IView.allInspectors = inspectors;
          Inspection.GetInspections();
          Unit.GetUnits();
          window.setInterval(Inspection.GetInspections, 60 * 5 * 1000);
          window.setInterval(Unit.GetUnits, 60 * 1000);
          Inspector.BuildInspectorList();


        }, function (e)
          {
          console.log('error getting inspectors');
          IView.allInspectors = [];
          });

    }

    public static GetInspectorsToEdit(): void
    {
      let path = Utilities.Get_Path("/inspectionview");
      Utilities.Get<Array<Inspector>>(path + "API/Inspectors/Edit")
        .then(function (inspectors: Array<Inspector>)
        {
          console.log('inspectors to edit', inspectors);
          IView.inspectors_to_edit = inspectors;
          if (inspectors.length > 0)
          {
            Utilities.Show_Inline_Flex("editInspectors");
          }

        }, function (e)
          {
            console.log('error getting inspectors');
            IView.allInspectors = [];
          });

    }

    static BuildInspectorList(): void
    {
      let container = document.getElementById("inspectorList");
      Utilities.Clear_Element(container);
      container.appendChild(Inspector.AddInspector("All"));
      for (let i of IView.allInspectors)
      {
        container.appendChild(Inspector.AddInspector(i.Name));
      }
      IView.FilterInputEvents();
    }

    static AddInspector(name: string): DocumentFragment
    {
      let df = document.createDocumentFragment();
      let label = document.createElement("label");
      label.classList.add("label");
      label.classList.add("checkbox");
      label.classList.add("is-medium");
      let input = document.createElement("input");
      input.type = "checkbox";
      input.classList.add("checkbox");
      input.classList.add("is-medium");
      input.name = "inspectorFilter";
      input.value = name;
      input.checked = name === "All";
      label.appendChild(input);
      label.appendChild(document.createTextNode(name));
      df.appendChild(label);
      //df.appendChild(document.createElement("br"));
      return df;
    }

    static BuildInspectorControl(): void
    {

    }
  }


}