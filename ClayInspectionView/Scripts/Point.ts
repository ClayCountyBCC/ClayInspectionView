namespace IView
{
  interface IPoint
  {
    X: number;
    Y: number;
    Longitude: number;
    Latitude: number;
    IsValid: boolean;
  }

  export class Point implements IPoint
  {
    IsValid: boolean;
    Latitude: number;
    Longitude: number;

    constructor(public X: number, public Y: number)
    {

    }
  }
}