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

    GetAllInspectors(): Promise<Array<Inspector>>;
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

    GetAllInspectors(): Promise<Array<Inspector>>
    {
      var x = XHR.Get("API/Inspectors/");
      return new Promise<Array<Inspector>>(function (resolve, reject)
      {
        x.then(function (response)
        {
          let ar: Array<Inspector> = JSON.parse(response.Text);
          return resolve(ar);
        }).catch(function ()
        {
          console.log("error in Get Inspectors");
          return reject(null);
        });
      });
    }

  }


}