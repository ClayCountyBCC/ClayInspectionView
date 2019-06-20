using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace ClayInspectionView.Models
{
  public class Unit
  {
    public string Name { get; set; }
    public DateTime Date_Last_Communicated { get; set; }
    public decimal Longitude { get; set; }
    public decimal Latitude { get; set; }
    public string Assigned_Inspector { get; set; } = "";
    public string Unit_Icon_URL
    {
      get
      {
        switch (DateTime.Now.Subtract(Date_Last_Communicated).TotalMinutes)
        {
          case double n when (n > -1 && n < 21):
            return "//static.arcgis.com/images/Symbols/Transportation/CarGreenFront.png";
          case double n when n > 20.999 && n < 61:
            return "//static.arcgis.com/images/Symbols/Transportation/CarYellowFront.png";
          case double n when n > 60.999 && n < 121:
            return "//static.arcgis.com/images/Symbols/Transportation/CarRedFront.png";
          case double n when n > 120.999 && n < 721:
            return "//static.arcgis.com/images/Symbols/Transportation/CarRedFront.png";
          default:
            return "//static.arcgis.com/images/Symbols/Transportation/CarRedFront.png";
        }
      }
    }
    public string Unit_Status_Icon_URL
    {
      get
      {
        switch (DateTime.Now.Subtract(Date_Last_Communicated).TotalMinutes)
        {
          case double n when (n > -1 && n < 21):
            return "//static.arcgis.com/images/Symbols/Shapes/GreenSquareLargeB.png";
          case double n when n > 20.999 && n < 61:
            return "//static.arcgis.com/images/Symbols/Shapes/YellowSquareLargeB.png";
          case double n when n > 60.999 && n < 121:
            return "//static.arcgis.com/images/Symbols/Shapes/OrangeSquareLargeB.png";
          case double n when n > 120.999 && n < 721:
            return "//static.arcgis.com/images/Symbols/Shapes/RedSquareLargeB.png";
          default:
            return "//static.arcgis.com/images/Symbols/Shapes/BlackSquareLargeB.png";
        }
      }
    }

    public Unit()
    {
    }

    public static List<Unit> GetInspectionUnits()
    {
      string query = @"
      SELECT 
        UD.unitcode Name, 
        UD.longitude, 
        UD.latitude, 
        UD.date_last_communicated 
      FROM unit_tracking_data UD
      INNER JOIN unit_group UG ON UD.unitcode = UG.unitcode AND UG.group_name = 'INSPECTOR'       
      ORDER BY UD.unitcode ASC";

      var units = Constants.Get_Data<Unit>(query, Constants.csTracking);
      var inspectors = Inspector.GetCachedInspectors();
      foreach(Unit u in units)
      {
        foreach(Inspector i in inspectors)
        {
          if(i.Vehicle == u.Name)
          {
            u.Assigned_Inspector = i.Name;
            break;
          }
        }
      }
      return units;
    }

    public static List<Unit> GetCachedInspectionUnits()
    {
      return (List<Unit>)myCache.GetItem("units");
    }
  }
}