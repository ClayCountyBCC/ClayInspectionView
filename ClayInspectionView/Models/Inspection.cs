using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Dapper;

namespace ClayInspectionView.Models
{
  public class Inspection
  {
    public string LookupKey { get; set; }
    public string AddressNumber { get; set; }
    public string StreetName { get; set; }
    public string StreetAddressCombined { get; set; }
    public string City { get; set; }
    public string Zip { get; set; }
    public string InspectorName { get; set; }
    public string InspectionDescription { get; set; }
    public string PermitNo { get; set; }
    public string Color { get; set; }
    public string Parcel { get; set; }
    public string InspectionCode { get; set; }
    public DateTime ScheduledDate { get; set; }
    public DateTime InspDateTime { get; set; }
    public Point AddressPoint { get; set; } = new Point();
    public Point ParcelPoint { get; set; } = new Point();

    public Inspection()
    {

    }

    public static List<Inspection> GetInspections(int numDays = 0)
    {
      var dbArgs = new DynamicParameters();
      dbArgs.Add("@NumDays", numDays);
      string query = @"
        USE WATSC;

        DECLARE @Today DATE = CAST(GETDATE() AS DATE);
        DECLARE @Tomorrow DATE = DATEADD(dd, 1, @Today);

        SELECT 
          B.ProjAddrNumber + '-' + B.ProjStreet + '-' + B.ProjZip LookupKey,
          B.ProjAddrNumber AddressNumber, 
          B.ProjStreet StreetName, 
          B.ProjAddrCombined StreetAddressCombined,
          B.ProjCity City, 
          B.ProjZip Zip,
          ISNULL(LTRIM(RTRIM(I.Name)), 'Unassigned') AS InspectorName, 
          ISNULL(I.Color, '#FFFFFF') Color,
          IREF.InsDesc AS InspectionDescription, 
          IR.PermitNo, 
          IR.InspectionCode, 
          IR.SchecDateTime AS ScheduledDate,
          B.ParcelNo,
          IR.InspDateTime
        FROM bpINS_REQUEST IR
        LEFT OUTER JOIN bp_INSPECTORS I ON IR.Inspector = I.Intl
        LEFT OUTER JOIN bpINS_REF IREF ON IR.InspectionCode = IREF.InspCd
        INNER JOIN bpBASE_PERMIT B ON B.BaseID = IR.BaseId
        WHERE 
          CAST(IR.SchecDateTime AS DATE) BETWEEN @Today AND @Tomorrow";
      try
      {
        var li = Constants.Get_Data<Inspection>(query, dbArgs, Constants.csWATSC);
        var CIP = new System.Runtime.Caching.CacheItemPolicy() { AbsoluteExpiration = DateTime.Today.AddDays(1) };
        Dictionary<string, Point> points = myCache.GetItem("address", () => Lookup.GetPoints(li), CIP);
        li = UpdatePoints(li, points);
        // at this point none of the inspections should have an invalid address unless we used the cache and they weren't in it
        // if there are any, we'll basically run the same function again, but only for the missing
        var missing = (from i in li
                       where !i.AddressPoint.IsValid &&
                       !i.ParcelPoint.IsValid
                       select i).ToList();

        if (missing.Count() > 0)
        {
          var missingpoints = Lookup.GetPoints(missing);
          missingpoints.ToList().ForEach(x => points.Add(x.Key, x.Value));
          myCache.UpdateItem("address", points, CIP);
          UpdatePoints(li, points);
        }
        return li;
      }
      catch (Exception ex)
      {
        new ErrorLog(ex, query);
        return null;
      }

    }

    private static List<Inspection> UpdatePoints(List<Inspection> inspections, Dictionary<string, Point> points)
    {
      foreach (Inspection i in inspections)
      {
        if (!i.AddressPoint.IsValid && !i.ParcelPoint.IsValid)
        {
          if (points.ContainsKey(i.LookupKey))
          {
            i.AddressPoint = points[i.LookupKey];
          }
          else
          {
            if (points.ContainsKey(i.Parcel))
            {
              i.ParcelPoint = points[i.Parcel];
            }
          }
        }
      }
      return inspections;
    }

  }
}