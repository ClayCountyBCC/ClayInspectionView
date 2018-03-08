﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace ClayInspectionView.Models
{
  public class Unit
  {
    public string Name { get; set; }
    public DateTime Date_Last_Communicated { get; set; }
    public double Longitude { get; set; }
    public double Latitude { get; set; }
    public string Unit_Icon_URL
    {
      get
      {
        return "//static.arcgis.com/images/Symbols/Transportation/CarGreenFront.png";
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
        unitcode Name, 
        longitude, 
        latitude, 
        date_last_communicated 
      FROM unit_tracking_data
      WHERE 
        unitcode LIKE 'DS%' OR
        unitcode LIKE 'MB%'
      ORDER BY unitcode ASC";
      return Constants.Get_Data<Unit>(query, Constants.csTracking);
    }

    public static List<Unit> GetCachedInspectionUnits()
    {
      return (List<Unit>)myCache.GetItem("units");
    }
  }
}