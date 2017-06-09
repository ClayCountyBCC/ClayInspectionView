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
    Inspections: Array<Inspection>;

    GetAllInspectors(): Promise<Array<Inspector>>;
  }
  export class Inspector implements IInspector
  {
    public Id: number;
    public Name: string;
    public Color: string;
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