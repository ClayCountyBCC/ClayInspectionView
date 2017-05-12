using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Configuration;
using System.Runtime.Caching;
using Dapper;
using System.Data;
using System.Data.SqlClient;


namespace ClayInspectionView.Models
{
  public static class Constants
  {
    public const string csWATSC = "IVWATSC";
    public const string csGIS = "IVGIS";
    public const string csError = "LOG";

    public static List<T> Get_Data<T>(string query, DynamicParameters dbA, string cs)
    {
      try
      {
        using (IDbConnection db =
          new SqlConnection(
            Get_ConnStr(cs)))
        {
          return (List<T>)db.Query<T>(query, dbA);
        }
      }
      catch (Exception ex)
      {
        new ErrorLog(ex, query);
        return null;
      }
    }

    public static int Exec_Query(string query, DynamicParameters dbA, string cs)
    {
      try
      {
        using (IDbConnection db =
          new SqlConnection(
            Get_ConnStr(cs)))
        {
          return db.Execute(query, dbA);
        }
      }
      catch (Exception ex)
      {
        new ErrorLog(ex, query);
        return -1;
      }
    }

    //public static object GetInspectionGroups()
    //{
    //  CacheItemPolicy CIP = new CacheItemPolicy();
    //  CIP.AbsoluteExpiration = DateTime.Now.AddMinutes(5);
    //  var il = (List<Inspection>)myCache.GetItem("inspections", CIP);
    //  var groups = (from i in il where i.ll != null select i)
    //    .GroupBy(d => new { d.AddressKey, d.InspectorName, d.Color})
    //    .Select(d => new
    //    {
    //      inspection = d.Key,          
    //      inspectionCount = d.Count(),
    //      ll = d.First().ll
    //    });
    //  return groups;
    //}

    //private static List<Inspection> updateLocations(List<Inspection> li)
    //{
    //  Dictionary<string, LatLong> d = (Dictionary<string, LatLong>)myCache.GetItem("address");
    //  foreach(Inspection i in li)
    //  {
    //    if (d.ContainsKey(i.AddressKey))
    //    {
    //      i.ll = d[i.AddressKey];
    //    }
    //    else
    //    {
    //      i.ll = new LatLong();
    //    }
    //  }

    //  return li;
    //}

    public static string Get_ConnStr(string cs)
    {
      return ConfigurationManager.ConnectionStrings[cs].ConnectionString;
    }




  }
}