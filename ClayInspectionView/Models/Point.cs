using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace ClayInspectionView.Models
{
  public class Point
  {
    public double X { get; set; }
    public double Y { get; set; }
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