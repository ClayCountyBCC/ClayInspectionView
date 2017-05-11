using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Dapper;
using System.Data;
using System.Data.SqlClient;

namespace ClayInspectionView.Models
{
  public class Address
  {
    public string AddressKey { get; set; }
    public Point AddressPoint { get; set; }

    public Address()
    {

    }
    public static Dictionary<string, Point> GetAddresses()
    {
      string query = @"
        USE Clay; 
        SELECT CAST(House AS VARCHAR(50))+ CASE WHEN LEN(Unit) > 0 THEN '-' + LTRIM(RTRIM(Unit)) ELSE '' END +  + '-' + StreetName + 
        '-' + CAST(Zip AS VARCHAR(50)) AS AddressKey,
        XCoord, 
        YCoord 
        FROM ADDRESS_SITE";
      try
      {
        using (IDbConnection db =
          new SqlConnection(
            InspectionData.Get_ConnStr(InspectionData.csGIS)))
        {
          return db.Query(query).ToDictionary(
            row => (string)row.AddressKey,
            row => new Point(row.XCoord, row.YCoord));
        }
      }
      catch (Exception ex)
      {
        Logging.Log(ex, InspectionData.toolsAppId, query, Logging.LogType.Database);
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