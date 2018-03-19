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
    public bool RBL { get; set; }
    public bool CBL { get; set; }
    public bool REL { get; set; }
    public bool CEL { get; set; }
    public bool RME { get; set; }
    public bool CME { get; set; }
    public bool RPL { get; set; }
    public bool CPL { get; set; }
    public bool PrivateProvider { get; set; }
    public bool Fire { get; set; }
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
          Color,
          RBL,
          CBL,
          REL,
          CEL,
          RME,
          CME,
          RPL,
          CPL,
          PrivateProvider,
          Fire
        FROM bp_INSPECTORS
        WHERE 
          Active=1
        UNION ALL
        SELECT 
          0,
          '',
          'Unassigned',
          '#FFFFFF',
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1,
          1
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