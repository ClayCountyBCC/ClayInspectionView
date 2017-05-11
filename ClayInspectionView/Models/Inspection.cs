using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Dapper;

namespace ClayInspectionView.Models
{
  public class Inspection
  {
    public string AddressKey { get; set; }
    public string AddressNumber { get; set; }
    public string StreetName { get; set; }
    public string StreetAddressCombined { get; set; }
    public string City { get; set; }
    public string Zip { get; set; }
    public string InspectorName { get; set; }
    public string InspectionDescription { get; set; }
    public string PermitNo { get; set; }
    public string Color { get; set; }
    public string InspectionCode { get; set; }
    public DateTime ScheduledDate { get; set; }
    public double AddressX { get; set; }
    public double AddressY { get; set; }
    public double ParcelX { get; set; }
    public double ParcelY { get; set; }

    public Inspection()
    {

    }

    public static List<Inspection> GetInspections(int numDays = 0)
    {
      var dbArgs = new DynamicParameters();
      dbArgs.Add("@NumDays", numDays);
      string query = @"
        USE WATSC;
        SELECT 
        B.ProjAddrNumber + '-' + B.ProjStreet + '-' + B.ProjZip AS AddressKey,
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
        IR.SchecDateTime AS ScheduledDate
        FROM bpINS_REQUEST IR
        LEFT OUTER JOIN bp_INSPECTORS I ON IR.Inspector = I.Intl
        LEFT OUTER JOIN bpINS_REF IREF ON IR.InspectionCode = IREF.InspCd
        INNER JOIN bpBASE_PERMIT B ON B.BaseID = IR.BaseId
        WHERE IR.InspDateTime IS NULL AND
        CAST(IR.SchecDateTime AS DATE) = 
        CAST(DATEADD(d, @NumDays, GETDATE()) AS DATE)";
      return InspectionData.Get_Data<Inspection>(query, dbArgs, InspectionData.csWATSC);
      
    }

    public static List<Inspection> GetTotalInspections(int numDays = 0)
    {
      var dbArgs = new DynamicParameters();
      dbArgs.Add("@NumDays", numDays);
      string query = @"
        USE WATSC;
        SELECT 
        B.ProjAddrNumber + '-' + B.ProjStreet + '-' + B.ProjZip AS AddressKey,
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
        IR.SchecDateTime AS ScheduledDate
        FROM bpINS_REQUEST IR
        LEFT OUTER JOIN bp_INSPECTORS I ON IR.Inspector = I.Intl
        LEFT OUTER JOIN bpINS_REF IREF ON IR.InspectionCode = IREF.InspCd
        INNER JOIN bpBASE_PERMIT B ON B.BaseID = IR.BaseId
        WHERE CAST(IR.SchecDateTime AS DATE) = 
        CAST(DATEADD(d, @NumDays, GETDATE()) AS DATE)";
      return InspectionData.Get_Data<Inspection>(query, dbArgs, InspectionData.csWATSC);
    }


  }
}