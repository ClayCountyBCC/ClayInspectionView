using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace ClayInspectionView.Models
{
  public class Inspector
  {
    public string Name { get; set; }
    public string Color { get; set; }

    public Inspector()
    {

    }

    public static List<Inspector>Get()
    {
      string query = @"
        SELECT 
            LTRIM(RTRIM(Name)) Name,
            Color
          FROM bp_INSPECTORS
          WHERE 
            Active=1
          ORDER BY Name ASC;";
      try
      {
        return Constants.Get_Data<Inspector>(query, Constants.csWATSC); 
      }
      catch(Exception ex)
      {
        new ErrorLog(ex, query);
        return null;
      }
    }
  }
}