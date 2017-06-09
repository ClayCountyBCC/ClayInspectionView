using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace ClayInspectionView.Models
{
  public class Inspector
  {
    public int Id { get; set; }
    public string Intl { get; set; }
    public string Name { get; set; }
    public string Color { get; set; }

    public Inspector()
    {

    }

    public static List<Inspector>Get()
    {
      string query = @"
        SELECT 
            id,
            Intl,
            LTRIM(RTRIM(Name)) Name,
            Color
          FROM bp_INSPECTORS
          WHERE 
            Active=1
          UNION ALL
          SELECT 
            0,
            '',
            'Unassigned',
            '#FFFFFF'
          ORDER BY Name ASC";
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