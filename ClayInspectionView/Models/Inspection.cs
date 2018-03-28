using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Dapper;

namespace ClayInspectionView.Models
{
  public class Inspection
  {
    public bool IsCommercial { get; set; }
    public bool IsPrivateProvider
    {
      get
      {
        return PrivateProviderInspectionRequestId > 0; 
      }
    }
    public int PrivateProviderInspectionRequestId { get; set; } = 0;
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
    public int InspReqID {get;set;}
    public string InspectionCode { get; set; }
    public string ResultADC { get; set; } = "";
    public DateTime ScheduledDate { get; set; }
    public DateTime? InspDateTime { get; set; }
    public bool CanBeAssigned { get; set; }
    public string ScheduledDay
    {
      get
      {
        return ScheduledDate.Date <= DateTime.Today.Date ? "Today" : "Tomorrow";
      }
    }
    public bool IsCompleted {
      get
      {
        return ResultADC.Length > 0;
      }
    }
    public Point AddressPoint { get; set; } = new Point();
    public double Project_Address_X { get; set; } = 0;
    public double Project_Address_Y { get; set; } = 0;
    public Point ParcelPoint { get; set; } = new Point();
    public double Parcel_Centroid_X { get; set; } = 0;
    public double Parcel_Centroid_Y { get; set; } = 0;
    public Point PointToUse { get; set; }
    public bool RBL { get; set; }
    public bool CBL { get; set; }
    public bool REL { get; set; }
    public bool CEL { get; set; }
    public bool RME { get; set; }
    public bool CME { get; set; }
    public bool RPL { get; set; }
    public bool CPL { get; set; }
    public bool Fire { get; set; } // can do fire inspections

    public Inspection()
    {

    }

    public static List<Inspection> GetInspections()
    {

      string query = @"
        USE WATSC;

        DECLARE @Today DATE = CAST(GETDATE() AS DATE);
        DECLARE @Tomorrow DATE = (
          SELECT TOP 1 calendar_date 
          FROM Calendar.dbo.Dates
          WHERE calendar_date > @Today
          AND day_of_week NOT IN (1, 7)
          AND observed_holiday = 0
        );

        SELECT 
          CASE WHEN IR.PermitType IN ('0', '1', '9') AND ISNULL(M.Comm, A.Comm) = 0 THEN 1 ELSE 0 END RBL,
          CASE WHEN IR.PermitType IN ('4') AND ISNULL(M.Comm, A.Comm) = 0 THEN 1 ELSE 0 END RME,
          CASE WHEN IR.PermitType IN ('2') AND ISNULL(M.Comm, A.Comm) = 0 THEN 1 ELSE 0 END REL,
          CASE WHEN IR.PermitType IN ('3') AND ISNULL(M.Comm, A.Comm) = 0 THEN 1 ELSE 0 END RPL,
          CASE WHEN IR.PermitType IN ('0', '1', '9') AND ISNULL(M.Comm, A.Comm) = 1 THEN 1 ELSE 0 END CBL,
          CASE WHEN IR.PermitType IN ('4') AND ISNULL(M.Comm, A.Comm) = 1 THEN 1 ELSE 0 END CME,
          CASE WHEN IR.PermitType IN ('2') AND ISNULL(M.Comm, A.Comm) = 1 THEN 1 ELSE 0 END CEL,
          CASE WHEN IR.PermitType IN ('3') AND ISNULL(M.Comm, A.Comm) = 1 THEN 1 ELSE 0 END CPL,
          CASE WHEN IR.PermitType IN ('6') THEN 1 ELSE 0 END Fire,
          ISNULL(B.ProjAddrNumber, '') + '-' + 
            CASE WHEN LEN(LTRIM(RTRIM(B.ProjPreDir))) > 0 THEN '-' + LTRIM(RTRIM(B.ProjPreDir)) ELSE '' END + 
            ISNULL(B.ProjStreet, '') + '-' + 
            CASE WHEN LEN(LTRIM(RTRIM(B.ProjPostDir))) > 0 THEN '-' + LTRIM(RTRIM(B.ProjPostDir)) ELSE '' END + 
            ISNULL(B.ProjCity, '') + 
            CASE WHEN LEN(LTRIM(RTRIM(ISNULL(B.ProjZip, '')))) > 0 THEN B.ProjZip ELSE '99999' END LookupKey,
          ISNULL(B.ProjAddrNumber, '') AddressNumber, 
          ISNULL(B.ProjStreet, '') StreetName, 
          B.ProjAddrCombined StreetAddressCombined,
          B.ProjCity City, 
          B.ProjZip Zip,
          ISNULL(LTRIM(RTRIM(I.Name)), 'Unassigned') AS InspectorName, 
          ISNULL(I.Color, '#FFFFFF') Color,
          IREF.InsDesc AS InspectionDescription, 
          IR.PermitNo, 
          ISNULL(LTRIM(RTRIM(IR.ResultADC)), '') ResultADC,
          IR.InspectionCode, 
          IR.SchecDateTime AS ScheduledDate,
          B.ParcelNo,
          IR.InspReqID,
          IR.InspDateTime,
          Project_Address_X,
          Project_Address_Y,
          Parcel_Centroid_X,
          Parcel_Centroid_Y,
          ISNULL(M.Comm, A.Comm) IsCommercial,
          PrivProvIRId PrivateProviderInspectionRequestId
        FROM bpINS_REQUEST IR
        LEFT OUTER JOIN bp_INSPECTORS I ON IR.Inspector = I.Intl
        LEFT OUTER JOIN bpINS_REF IREF ON IR.InspectionCode = IREF.InspCd
        LEFT OUTER JOIN bpMASTER_PERMIT M ON M.PermitNo = IR.PermitNo
        LEFT OUTER JOIN bpASSOC_PERMIT A ON A.PermitNo = IR.PermitNo
        INNER JOIN bpBASE_PERMIT B ON B.BaseID = IR.BaseId
        WHERE 
          CAST(IR.SchecDateTime AS DATE) IN (@Today, @Tomorrow)
          OR (CAST(IR.SchecDateTime AS DATE) < @Today
            AND ResultADC IS NULL)";
      try
      {
        var li = Constants.Get_Data<Inspection>(query, Constants.csWATSC);
        int badPointCount = 0;
        foreach(Inspection i in li)
        {
          i.AddressPoint = new Point(i.Project_Address_X, i.Project_Address_Y);
          i.ParcelPoint = new Point(i.Parcel_Centroid_X, i.Parcel_Centroid_Y);
          i.PointToUse = i.AddressPoint.IsValid ? i.AddressPoint : i.ParcelPoint;
          if (!i.PointToUse.IsValid)
          {
            i.PointToUse = new Point(440000, 2100000 - (25 * badPointCount));
            badPointCount += 1;
          }
        }
        return li;
      }
      catch (Exception ex)
      {
        new ErrorLog(ex, query);
        return null;
      }

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
        switch (d.DayOfWeek) // if Tomorrow is:
        {
          case DayOfWeek.Saturday:
            d = d.AddDays(2).Date;
            break;
          case DayOfWeek.Sunday:
            d = d.AddDays(1).Date;
            break;
          default:
            d = DateTime.Today.AddDays(1).Date;
            break;
        }
      }


      var dp = new DynamicParameters();
      dp.Add("@Inspector", Inspector);
      dp.Add("@LookupKey", LookupKey);
      dp.Add("@DateToUse", d);

      string sql = @"
        USE WATSC;

        UPDATE IR
          SET Inspector = @Inspector
        FROM bpINS_REQUEST IR
        LEFT OUTER JOIN bp_INSPECTORS I ON IR.Inspector = I.Intl
        LEFT OUTER JOIN bpINS_REF IREF ON IR.InspectionCode = IREF.InspCd
        INNER JOIN bpBASE_PERMIT B ON B.BaseID = IR.BaseId
        WHERE 
          CAST(IR.SchecDateTime AS DATE) = CAST(@DateToUse AS DATE)
          AND IR.InspDateTime IS NULL
          AND B.ProjAddrNumber + '-' + 
            CASE WHEN LEN(LTRIM(RTRIM(B.ProjPreDir))) > 0 THEN '-' + LTRIM(RTRIM(B.ProjPreDir)) ELSE '' END + 
            B.ProjStreet + '-' + 
            CASE WHEN LEN(LTRIM(RTRIM(B.ProjPostDir))) > 0 THEN '-' + LTRIM(RTRIM(B.ProjPostDir)) ELSE '' END + 
            B.ProjCity + 
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