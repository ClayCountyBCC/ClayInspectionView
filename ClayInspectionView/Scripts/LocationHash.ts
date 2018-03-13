namespace IView
{
  interface ILocationHash
  {
    InspectionId: number;
    constructor(locationHash: string);
  }

  export class LocationHash// implements ILocationHash
  {
    public InspectionId: number = 0;

    constructor(locationHash: string)
    {
      let ha: Array<string> = locationHash.split("&")
      for (let i = 0; i < ha.length; i++)
      {
        let k: Array<string> = ha[i].split("=");
        switch (k[0].toLowerCase())
        {
          case "inspectionid":
            this.InspectionId = parseInt(k[1]);
            break;
        }
      }
    }

    ToHash(): string
    {
      let h: string = "";
      if (this.InspectionId > 0) h += "&inspectionid=" + this.InspectionId.toString();
      if (h.length > 0) h = "#" + h.substring(1);
      return h;
    }

  }


}