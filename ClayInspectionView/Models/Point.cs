using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace ClayInspectionView.Models
{
  public class Point
  {
    public double X { get; set; } = double.MinValue;
    public double Y { get; set; } = double.MinValue;
    public bool IsValid
    {
      get
      {
        return X != double.MinValue;
      }
    }
    public Point()
    {

    }
    public Point(double NewX, double NewY)
    {
      X = NewX;
      Y = NewY;
    }
  }
}