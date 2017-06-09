using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Dapper;
using System.Data;
using System.Data.SqlClient;
using System.Text;

namespace ClayInspectionView.Models
{
  public class Lookup
  {
    public string LookupKey { get; set; }
    public Point Point { get; set; }

    public Lookup()
    {

    }

    public static Dictionary<string, Point> GetPoints(List<Inspection> inspections)
    {
      var addresslist = (from i in inspections
                         where !i.AddressPoint.IsValid && !i.ParcelPoint.IsValid
                         select i.LookupKey).Distinct().ToList();

      var addresspoints = GetAddressPoints(addresslist);

      var parcellist = (from i in inspections
                        where !addresspoints.ContainsKey(i.LookupKey)
                        select i.ParcelNo).ToList();

      var parcelpoints = GetParcelPoints(parcellist);

      parcelpoints.ToList().ForEach(x => addresspoints.Add(x.Key, x.Value));
      return addresspoints;
    }

    private static Dictionary<string, Point> GetAddressPoints(List<string> LookupKeys)
    {
      StringBuilder keys = new StringBuilder();
      foreach(string l in LookupKeys)
      {
        keys.Append("'").Append(l).AppendLine("', ");
      }     

      string query = @"
        USE Clay; 
        SELECT 
          CAST(House AS VARCHAR(50)) + '-' +
            CASE WHEN LEN(Unit) > 0 THEN '-' + LTRIM(RTRIM(Unit)) ELSE '' END  + 
            CASE WHEN LEN(PreDir) > 0 THEN '-' + LTRIM(RTRIM(PreDir)) ELSE '' END + 
            StreetName + '-' + 
            CASE WHEN LEN(SuffixDir) > 0 THEN '-' + LTRIM(RTRIM(SuffixDir)) ELSE '' END + 
            CAST(Zip AS VARCHAR(50)) LookupKey,
          XCoord, 
          YCoord 
        FROM ADDRESS_SITE
        WHERE 
          CAST(House AS VARCHAR(50)) + '-' +
            CASE WHEN LEN(Unit) > 0 THEN '-' + LTRIM(RTRIM(Unit)) ELSE '' END  + 
            CASE WHEN LEN(PreDir) > 0 THEN '-' + LTRIM(RTRIM(PreDir)) ELSE '' END + 
            StreetName + '-' + 
            CASE WHEN LEN(SuffixDir) > 0 THEN '-' + LTRIM(RTRIM(SuffixDir)) ELSE '' END + 
            CAST(Zip AS VARCHAR(50)) IN @Keys";
      try
      {
        using (IDbConnection db =
          new SqlConnection(
            Constants.Get_ConnStr(Constants.csGIS)))
        {
          return db.Query(query, new { Keys = LookupKeys  })
            .ToDictionary(
            row => (string)row.LookupKey,
            row => new Point((double)row.XCoord, (double)row.YCoord));
        }
      }
      catch (Exception ex)
      {
        new ErrorLog(ex, query);
        return null;
      }


    //  var dict = conn.Query(sql, args).ToDictionary(
    //row => (string)row.UniqueString,
    //row => (int)row.Id);

      //return InspectionData.Get_Data<Address>(query, dbArgs, InspectionData.csWATSC);
      //var d = new Dictionary<string, LatLong>();
      //var la = db.Get_List<Address>(query);
      //foreach (Address a in la)
      //{
      //  if (!d.ContainsKey(a.AddressKey))
      //  {
      //    d.Add(a.AddressKey, new LatLong(a.XCoord, a.YCoord));
      //  }
      //}
      //return d;
    }

    private static Dictionary<string, Point> GetParcelPoints(List<string> LookupKeys)
    {
      string query = @"
        WITH PIN_Dupe_CTE (LookupKey, XCoord, YCoord) AS (
          SELECT 
            LookupKey, 
            Centroid.STX XCoord, 
            Centroid.STY YCoord
          FROM (
            SELECT 
             PIN LookupKey, 
             geometry::UnionAggregate(SHAPE).STCentroid() AS Centroid
            FROM PARCEL_INFO
            GROUP BY PIN
            HAVING COUNT(*) > 1
          ) AS P
        ), PIN_NoDupe_CTE(LookupKey, XCoord, YCoord) AS (
          SELECT 
            LookupKey, 
            Centroid.STX XCoord, 
            Centroid.STY YCoord
          FROM (
            SELECT
              PIN LookupKey,
              Shape.STCentroid() AS Centroid
            FROM PARCEL_INFO P
            LEFT OUTER JOIN PIN_Dupe_CTE D ON P.PIN = D.LookupKey
            WHERE D.LookupKey IS NULL
          ) AS T
        )

        SELECT * FROM (
        SELECT 
          LookupKey,
          XCoord,
          YCoord
        FROM PIN_Dupe_CTE
        UNION 
        SELECT 
          LookupKey,
          XCoord,
          YCoord
        FROM PIN_NoDupe_CTE
        ) TT
        WHERE LookupKey IN @Keys";
      try
      {
        using (IDbConnection db =
          new SqlConnection(
            Constants.Get_ConnStr(Constants.csGIS)))
        {
          return db.Query(query, new { Keys = LookupKeys })
            .ToDictionary(
            row => (string)row.LookupKey,
            row => new Point((double)row.XCoord, (double)row.YCoord));
        }
      }
      catch (Exception ex)
      {
        new ErrorLog(ex, query);
        return null;
      }


      //  var dict = conn.Query(sql, args).ToDictionary(
      //row => (string)row.UniqueString,
      //row => (int)row.Id);

      //return InspectionData.Get_Data<Address>(query, dbArgs, InspectionData.csWATSC);
      //var d = new Dictionary<string, LatLong>();
      //var la = db.Get_List<Address>(query);
      //foreach (Address a in la)
      //{
      //  if (!d.ContainsKey(a.AddressKey))
      //  {
      //    d.Add(a.AddressKey, new LatLong(a.XCoord, a.YCoord));
      //  }
      //}
      //return d;
    }
  }
}