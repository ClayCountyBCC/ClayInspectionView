using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Runtime.Caching;

namespace ClayInspectionView.Models
{
  public class Inspector
  {
    public int Id { get; set; }
    public bool Active { get; set; }
    public string Intl { get; set; }
    public string Name { get; set; }
    public string Color { get; set; }
    public string Vehicle { get; set; }
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

    public static List<Inspector> GetCachedInspectors()
    {
      var CIP = new CacheItemPolicy()
      {
        AbsoluteExpiration = DateTime.Now.AddHours(1)
      };
      return (List<Inspector>)myCache.GetItem("inspectors", CIP);
    }

    public static List<Inspector>Get()
    {
      string query = @"
        SELECT 
          id,
          Active,
          Intl,
          LTRIM(RTRIM(Name)) Name,
          Color,
          Vehicle,
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
          0,
          '',
          'Unassigned',
          '#FFFFFF',
          '',
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

    public static List<Inspector> GetEditList()
    {
      string query = @"
        SELECT 
          id,
          Active,
          Intl,
          LTRIM(RTRIM(Name)) Name,
          ISNULL(Color, '') Color,
          Vehicle,
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
        ORDER BY Name ASC";
      try
      {
        return Constants.Get_Data<Inspector>(query, Constants.csWATSC);
      }
      catch (Exception ex)
      {
        new ErrorLog(ex, query);
        return null;
      }
    }

    public List<Inspector> Update()
    {
      string sql = @"
        UPDATE bp_INSPECTORS
        SET 
          Active = @Active,
          Name = @Name,
          Vehicle = @Vehicle,
          RBL = @RBL,
          CBL = @CBL,
          REL = @REL,
          CEL = @CEL,
          RME = @RME,
          CME = @CME,
          RPL = @RPL,
          CPL = @CPL,
          PrivateProvider = @PrivateProvider,
          Fire = @Fire
        WHERE 
          ID = @Id";
      var i = Constants.Exec_Query<Inspector>(sql, this, Constants.csWATSC);

      if (i > -1)
      {
        Inspector.UpdateInspectorCache();
        return GetCachedInspectors();
      }
      return new List<Inspector>();
    }

    private static void UpdateInspectorCache()
    {
      var CIP = new CacheItemPolicy()
      {
        AbsoluteExpiration = DateTime.Now.AddHours(1)
      };
      var inspectors = Inspector.Get();
      myCache.UpdateItem("inspectors", inspectors, CIP);
    }

    public Inspector Insert()
    {
      string sql = @"
        INSERT INTO bp_INSPECTORS (
          PhoneNbr,
          Name, 
          Intl, 
          Active, 
          Vehicle, 
          RBL, 
          CBL, 
          REL, 
          CEL, 
          RME, 
          CME, 
          RPL, 
          CPL, 
          PrivateProvider, 
          Fire, 
          Color
          )
        VALUES (
          '',
          @Name, 
          @Intl, 
          @Active, 
          @Vehicle, 
          @RBL, 
          @CBL, 
          @REL, 
          @CEL, 
          @RME, 
          @CME, 
          @RPL, 
          @CPL, 
          @PrivateProvider, 
          @Fire, 
          @Color
          );

        SELECT
          id,
          Active,
          Intl,
          LTRIM(RTRIM(Name)) Name,
          ISNULL(Color, '') Color,
          Vehicle,
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
        WHERE Id = @@IDENTITY;";

      var inspectors = Constants.Get_Data<Inspector>(sql, this, Constants.csWATSC);
      if (inspectors.Count() == 1)
      {
        Inspector.UpdateInspectorCache();
        return inspectors.First();
      }
      return null;
    }



  }
}