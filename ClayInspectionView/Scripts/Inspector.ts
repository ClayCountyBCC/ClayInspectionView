/// <refrence path="point.ts" />
/// <reference path="ui.ts" />
/// <reference path="app.ts" />


namespace IView
{
  interface IInspector
  {
    Id: number;
    Active: boolean;
    Intl: string;
    Name: string;
    Color: string;
    Vehicle: string;
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
    CurrentCount: number;
  }
  export class Inspector implements IInspector
  {
    public Id: number = -1;
    public Active: boolean = false;
    public Intl: string = "";
    public Name: string = "";
    public Color: string = "";
    public Vehicle: string = "";
    public RBL: boolean = false;
    public CBL: boolean = false;
    public REL: boolean = false;
    public CEL: boolean = false;
    public RME: boolean = false;
    public CME: boolean = false;
    public RPL: boolean = false;
    public CPL: boolean = false;
    public Fire: boolean = false;
    public PrivateProvider: boolean = false;
    public Inspections: Array<Inspection>;
    public CurrentCount: number = 0;

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
          let initialRun = IView.allInspectors.length === 0;
          console.log('inspectors', inspectors);
          IView.allInspectors = inspectors;
          Inspector.BuildBulkAssignDropdown(inspectors);
          Inspection.GetInspections();          
          if (initialRun)
          {
            Inspector.BuildInspectorList();
            IView.LoadDefaultsFromCookie();
            window.setInterval(Inspection.GetInspections, 60 * 5 * 1000);
            window.setInterval(Unit.GetUnits, 60 * 1000);
            Inspector.GetInspectorsToEdit();
          }

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
            Utilities.Show_Flex("editInspectors");
            Inspector.BuildInspectorControl(inspectors);
          }

        }, function (e)
          {
            console.log('error getting inspectors to edit');            
          });

    }

    static BuildBulkAssignDropdown(inspectors: Array<Inspector>):void
    {
      let select = <HTMLSelectElement>document.getElementById("bulkAssignSelect");
      Utilities.Clear_Element(select);
      let base = document.createElement("option");
      base.value = "-1";
      base.selected = true;
      base.appendChild(document.createTextNode("Select Inspector"));
      select.appendChild(base);
      for (let i of inspectors)
      {
        let o = document.createElement("option");
        o.value = i.Id.toString();
        o.appendChild(document.createTextNode(i.Name));
        select.appendChild(o);

      }
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

    static BuildInspectorControl(inspectors: Array<Inspector>): void
    {
      let tbody = document.getElementById("inspectorControlList");
      Utilities.Clear_Element(tbody);
      for (let i of inspectors)
      {
        if(i.Id !== 0) tbody.appendChild(Inspector.BuildInspectorRow(i));
      }
    }

    static AddNewInspector(inspector: Inspector): void
    {
      let tbody = document.getElementById("inspectorControlList");
      if (inspector.Id !== 0) tbody.appendChild(Inspector.BuildInspectorRow(inspector));
    }

    static BuildInspectorRow(inspector: Inspector): HTMLTableRowElement
    {
      let id = inspector.Id.toString();
      let tr = document.createElement("tr");
      tr.appendChild(Inspector.CreateInputTableCell(id, "name", inspector.Name));
      tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "active", inspector.Active));
      tr.appendChild(Inspector.CreateTableCell(inspector.Intl));
      tr.appendChild(Inspector.CreateTableCell(inspector.Color));
      tr.appendChild(Inspector.CreateInputTableCell(id, "vehicle", inspector.Vehicle));
      tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "c_b", inspector.CBL));
      tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "c_e", inspector.CEL));
      tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "c_p", inspector.CPL));
      tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "c_m", inspector.CME));
      tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "r_b", inspector.RBL));
      tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "r_e", inspector.REL));
      tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "r_p", inspector.RPL));
      tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "r_m", inspector.RME));
      tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "fire", inspector.Fire));
      tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "private", inspector.PrivateProvider));
      tr.appendChild(Inspector.CreateSaveButtonTableCell(id));
      return tr;
    }

    private static CreateTableCell(value: string): HTMLTableCellElement
    {
      let td = document.createElement("td");
      td.appendChild(document.createTextNode(value));
      return td;
    }

    private static CreateSaveButtonTableCell(id: string): HTMLTableCellElement
    {
      let td = document.createElement("td");
      let control = document.createElement("div");
      control.classList.add("control");
      let button = document.createElement("button");
      button.classList.add("button");
      button.classList.add("is-success");
      button.type = "button";
      button.onclick = function ()
      {
        Utilities.Toggle_Loading_Button(button, true);        
        let i = new Inspector();
        i.LoadFromForm(id);        
        i.Update(button);
      }
      button.appendChild(document.createTextNode("Save"))
      control.appendChild(button);
      td.appendChild(control);
      return td;
    }

    private static CreateAddButtonTableCell(id: string, tr: HTMLTableRowElement): HTMLTableCellElement
    {
      let td = document.createElement("td");
      let control = document.createElement("div");
      control.classList.add("control");
      let button = document.createElement("button");
      button.classList.add("button");
      button.classList.add("is-success");
      button.type = "button";
      button.onclick = function ()
      {
        Utilities.Toggle_Loading_Button(button, true);
        let i = new Inspector();
        i.LoadFromForm(id, true);
        if (!i.ValidateInspector()) return;        
        i.Insert(button, tr);
      }
      button.appendChild(document.createTextNode("Add"))
      control.appendChild(button);
      td.appendChild(control);
      return td;
    }

    private ValidateInspector(): boolean
    {
      if (this.Name.length === 0)
      {
        alert("Cannot add new inspector, missing Name.");
        return false;
      }
      if (this.Intl.length === 0)
      {
        alert("Cannot add new inspector, missing Initials.");
        return false;        
      }
      let current = this;
      let initialtest = IView.inspectors_to_edit.filter(function (k) { return k.Intl.toLowerCase() === current.Intl.toLowerCase(); });
      if (initialtest.length > 0)
      {
        alert("Cannot add new inspector, Initials must be unique.");
        return false;
      }
      if (this.Color.length === 0)
      {
        alert("Cannot add new inspector, missing Color.  You can use the color assigned to an inactive inspector.");
        return false;
      }
      return true;
    }

    private static CreateInputTableCell(id: string, name: string, value: string, max_length: number = null): HTMLTableCellElement
    {
      let td = document.createElement("td");
      let control = document.createElement("div");
      control.classList.add("control");
      let input = document.createElement("input");
      input.id = id + "_" + name;
      input.type = "text";
      if (max_length !== null) input.maxLength = max_length;
      input.classList.add("input");
      input.value = value;
      control.appendChild(input);
      td.appendChild(control);
      return td;
    }

    private static CreateCheckBoxTableCell(id: string, name: string, checked: boolean):HTMLTableCellElement
    {
      let td = document.createElement("td");
      let control = document.createElement("div");
      control.classList.add("control");
      control.classList.add("has-text-centered");
      let input = document.createElement("input");
      input.id = id + "_" + name;
      input.type = "checkbox";
      input.classList.add("checkbox");
      input.checked = checked;
      control.appendChild(input);
      td.appendChild(control);
      return td;
    }

    static UpdateCurrentCount(inspectors: Array<Inspector>, inspections: Array<Inspection>): void
    {
      let byinspector = [];
      for (let inspector of inspectors)
      {
        inspector.CurrentCount = 0;
        byinspector = inspections.filter(function (i) { return i.InspectorName === inspector.Name });
        inspector.CurrentCount = byinspector.length;
      }
    }

    private LoadFromForm(id: string, all: boolean = false):void
    {
      this.Id = parseInt(id);
      this.Active = (<HTMLInputElement>document.getElementById(id + "_active")).checked;
      this.Name = Utilities.Get_Value(id + "_name").trim();
      this.Intl = all ? Utilities.Get_Value(id + "_initial").trim() : ""; 
      this.Color = all ? Utilities.Get_Value(id + "_color").trim() : ""; 
      this.Vehicle = Utilities.Get_Value(id + "_vehicle").trim();
      this.CBL = (<HTMLInputElement>document.getElementById(id + "_c_b")).checked;
      this.CEL = (<HTMLInputElement>document.getElementById(id + "_c_e")).checked;
      this.CPL = (<HTMLInputElement>document.getElementById(id + "_c_p")).checked;
      this.CME = (<HTMLInputElement>document.getElementById(id + "_c_m")).checked;
      this.RBL = (<HTMLInputElement>document.getElementById(id + "_r_b")).checked;
      this.REL = (<HTMLInputElement>document.getElementById(id + "_r_e")).checked;
      this.RPL = (<HTMLInputElement>document.getElementById(id + "_r_p")).checked;
      this.RME = (<HTMLInputElement>document.getElementById(id + "_r_m")).checked;
      this.Fire = (<HTMLInputElement>document.getElementById(id + "_fire")).checked;
      this.PrivateProvider = (<HTMLInputElement>document.getElementById(id + "_private")).checked;
    }

    private Update(button:HTMLButtonElement): void
    {
      let path = Utilities.Get_Path("/inspectionview");
      Utilities.Post<Array<Inspector>>(path + "API/Inspectors/Update/", this)
        .then(function (inspectors: Array<Inspector>)
        {
          if (inspectors.length === 0)
          {
            alert("There was a problem saving your changes.  Please refresh the application and try again.  If this issue persists, please put in a help desk ticket.");
            return;
          }
          Utilities.Set_Text("inspectorUpdateMessage", "Changes have been made, please refresh this application to see them.");
          IView.allInspectors = inspectors;
          Utilities.Toggle_Loading_Button(button, false);

        }, function (e)
          {
            console.log('error in Bulk Assign', e);
            Utilities.Toggle_Loading_Button(button, false);
          });
    }

    private Insert(button: HTMLButtonElement, tr: HTMLTableRowElement): void
    {
      let path = Utilities.Get_Path("/inspectionview");
      Utilities.Post<Inspector>(path + "API/Inspectors/Insert/", this)
        .then(function (inspector: Inspector)
        {
          if (inspector === null)
          {
            alert("There was a problem saving your changes.  Please refresh the application and try again.  If this issue persists, please put in a help desk ticket.");
            return;
          }
          Inspector.AddNewInspector(inspector);
          tr.parentElement.removeChild(tr);
          Utilities.Toggle_Loading_Button(button, false);
          Utilities.Set_Text("inspectorUpdateMessage", "Changes have been made, please refresh this application to see them.");
        }, function (e)
          {
            console.log('error in Bulk Assign', e);
            Utilities.Toggle_Loading_Button(button, false);
          });
    }

    public static AddInspectorToEdit():void
    {
      let tbody = document.getElementById("inspectorControlList")
      let id = Inspector.GetNewInspectorId();
      let tr = document.createElement("tr");
      tr.appendChild(Inspector.CreateInputTableCell(id, "name", "", 50));
      tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "active", false));      
      tr.appendChild(Inspector.CreateInputTableCell(id, "initial", "", 3));
      tr.appendChild(Inspector.CreateInputTableCell(id, "color", "", 7));
      tr.appendChild(Inspector.CreateInputTableCell(id, "vehicle", "", 10));
      tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "c_b", false));
      tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "c_e", false));
      tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "c_p", false));
      tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "c_m", false));
      tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "r_b", false));
      tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "r_e", false));
      tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "r_p", false));
      tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "r_m", false));
      tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "fire", false));
      tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "private", false));
      tr.appendChild(Inspector.CreateAddButtonTableCell(id, tr));
      tbody.appendChild(tr);     
      
    }

    private static GetNewInspectorId():string
    {
      for (let i = 10000; i < 11000; i++)
      {
        if (!document.getElementById(i.toString() + "_name")) return i.toString();
      }
    }


  }


}