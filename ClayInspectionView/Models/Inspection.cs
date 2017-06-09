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
    public string ParcelNo { get; set; }
    public string InspectionCode { get; set; }
    public DateTime ScheduledDate { get; set; }
    public DateTime? InspDateTime { get; set; }
    public bool CanBeAssigned { get; set; }
    public string ScheduledDay
    {
      get
      {
        return ScheduledDate.Date == DateTime.Today.Date ? "Today" : "Tomorrow";
      }
    }
    public bool IsCompleted {
      get
      {
        return InspDateTime.HasValue;
      }
    }
    public Point AddressPoint { get; set; } = new Point();
    public Point ParcelPoint { get; set; } = new Point();
    public Point PointToUse
    {
      get
      {
        return AddressPoint.IsValid ? AddressPoint : ParcelPoint;
      }
    }

    public Inspection()
    {

    }

    public static List<Inspection> GetInspections()
    {
      string query = @"
        USE WATSC;

        DECLARE @Today DATE = CAST(GETDATE() AS DATE);
        DECLARE @Tomorrow DATE = DATEADD(dd, 1, @Today);

        SELECT 
          B.ProjAddrNumber + '-' + 
            CASE WHEN LEN(LTRIM(RTRIM(B.ProjPreDir))) > 0 THEN '-' + LTRIM(RTRIM(B.ProjPreDir)) ELSE '' END + 
            B.ProjStreet + '-' + 
            CASE WHEN LEN(LTRIM(RTRIM(B.ProjPostDir))) > 0 THEN '-' + LTRIM(RTRIM(B.ProjPostDir)) ELSE '' END + 
            B.ProjZip LookupKey,
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
        var li = Constants.Get_Data<Inspection>(query, Constants.csWATSC);
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
            if (points.ContainsKey(i.ParcelNo))
            {
              i.ParcelPoint = points[i.ParcelNo];
            }
          }
        }
      }
      return inspections;
    }

    public static bool Assign(string LookupKey, int InspectorId, string Day)
    {
      string Inspector = "";
      if (InspectorId == 0) // how we handle the Unassigned
      {
        Inspector = null;
      }
      else
      {
        Inspector = (
          from i in (List<Inspector>)myCache.GetItem("inspectors")
          where i.Id == InspectorId
          select i.Intl
          ).First();
      }
      var d = DateTime.Today.Date;
      if(Day.ToLower() != "today")
      {
        d = DateTime.Today.AddDays(1).Date;
      }


      var dp = new DynamicParameters();
      dp.Add("@Inspector", Inspector);
      dp.Add("@LookupKey", LookupKey);
      dp.Add("@DateToUse", d);

      string sql = @"
        USE WATSC;

        DECLARE @Today DATE = CAST(GETDATE() AS DATE);
        DECLARE @Tomorrow DATE = DATEADD(dd, 1, @Today);

        UPDATE IR
          SET Inspector = @Inspector
        FROM bpINS_REQUEST IR
        LEFT OUTER JOIN bp_INSPECTORS I ON IR.Inspector = I.Intl
        LEFT OUTER JOIN bpINS_REF IREF ON IR.InspectionCode = IREF.InspCd
        INNER JOIN bpBASE_PERMIT B ON B.BaseID = IR.BaseId
        WHERE 
          CAST(IR.SchecDateTime AS DATE) = CAST(@DateToUse AS DATE)
          AND B.ProjAddrNumber + '-' + 
            CASE WHEN LEN(LTRIM(RTRIM(B.ProjPreDir))) > 0 THEN '-' + LTRIM(RTRIM(B.ProjPreDir)) ELSE '' END + 
            B.ProjStreet + '-' + 
            CASE WHEN LEN(LTRIM(RTRIM(B.ProjPostDir))) > 0 THEN '-' + LTRIM(RTRIM(B.ProjPostDir)) ELSE '' END + 
            B.ProjZip = @LookupKey;";
      try
      {
        var i = Constants.Exec_Query(sql, dp, Constants.csWATSC);
        return i > 0;
      }catch(Exception ex)
      {
        new ErrorLog(ex, sql);
        return false;
      }
    }

  }
}