namespace IView
{
  interface IPoint
  {
    X: number;
    Y: number;
    IsValid: boolean;
  }

  export class Point implements IPoint
  {
    IsValid: boolean;

    constructor(public X: number, public Y: number)
    {

    }
  }
}