using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Dapper;

namespace ClayInspectionView.Models
{
  public class Inspection
  {
    public bool myInspection { get; set; } = false;
    public bool IsCommercial { get; set; }
    public bool IsPrivateProvider
    {
      get
      {
        return PrivateProviderInspectionRequestId > 0; 
      }
    }
    public string PermitTypeString
    {
      get
      {
        switch (this.PermitNo[0].ToString())
        {
          case "2":
            return "EL";
          case "3":
            return "PL";
          case "4":
            return "ME";
          case "6":
            return "FR";
          default:
            return "BL";
        }
      }
    }
    public string IMSLink
    {
      get
      {
        string host = Constants.UseProduction() ? "claybccims" : "claybccimstrn";
        if (this.PermitTypeString == "BL")
        {
          return $@"http://{host}/WATSWeb/Permit/MainBL.aspx?PermitNo={this.PermitNo}&Nav=PL&OperId=&PopUp=";
        }
        else
        {
          return $@"http://{host}/WATSWeb/Permit/APermit{this.PermitTypeString}.aspx?PermitNo={this.PermitNo}";
        }
      }
    }
    public int PrivateProviderInspectionRequestId { get; set; } = 0;
    public string LookupKey { get; set; }
    public string AddressNumber { get; set; }
    public string StreetName { get; set; }
    public string StreetAddressCombined { get; set; }
    public string ProjClass { get; set; } = "";
    public string ProjPreDir { get; set; } = "";
    public string ProjPostDir { get; set; } = "";
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
    public string MasterPermitNumber { get; set; } = "";
    public string MasterPermitIMSLink
    {
      get
      {
        if (MasterPermitNumber.Length == 0) return "";
        string host = Constants.UseProduction() ? "claybccims" : "claybccimstrn";
        return $@"http://{host}/WATSWeb/Permit/MainBL.aspx?PermitNo={this.MasterPermitNumber}&Nav=PL&OperId=&PopUp=";
      }
    }
    public string PropUseInfo { get; set; } = "";
    public DateTime? InspDateTime { get; set; }
    public bool CanBeAssigned { get; set; } = false;
    public string ScheduledDay
    {
      get
      {
        return ScheduledDate.Date <= DateTime.Today.Date ? "today" : "tomorrow";
      }
    }
    public int Age
    {
      get
      {
        return DateTime.Today.Date.Subtract(ScheduledDate.Date).Days;
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
    public int Sort_Order { get; set; }
    public string NTUsername { get; set; } = "";
    public string PreviousInspectionRemarks { get; set; } = "";

    public Inspection()
    {

    }

    public static List<Inspection> GetInspections(UserAccess UA)
    {

      string query = @"
        SELECT 
          RBL
          ,RME
          ,REL
          ,RPL
          ,CBL
          ,CME
          ,CEL
          ,CPL
          ,Fire
          ,LookupKey
          ,AddressNumber
          ,StreetName
          ,ProjClass
          ,ProjPreDir
          ,ProjPostDir
          ,StreetAddressCombined
          ,City
          ,Zip
          ,InspectorName
          ,Color
          ,InspectionDescription
          ,PermitNo
          ,ResultADC
          ,InspectionCode
          ,ScheduledDate
          ,MasterPermitNumber
          ,PropUseInfo
          ,ParcelNo
          ,InspReqID
          ,InspDateTime
          ,Project_Address_X
          ,Project_Address_Y
          ,Parcel_Centroid_X
          ,Parcel_Centroid_Y
          ,IsCommercial
          ,PrivateProviderInspectionRequestId
          ,NTUsername
          ,Sort_Order
          ,PreviousInspectionRemarks
        FROM WATSC.dbo.vwInspectionViewList
        ORDER BY 
          LTRIM(RTRIM(InspectorName)) ASC, 
          ISNULL(Sort_Order, 0) ASC, 
          StreetName, 
          ProjClass, 
          ProjPreDir, 
          ProjPostDir, 
          AddressNumber";
      try
      {
        var li = Constants.Get_Data<Inspection>(query, Constants.csWATSC);
        int badPointCount = 0;
        if (UA.current_access == UserAccess.access_type.contract_access)
        {
          var contractors = Inspector.GetCachedContractInspectors();
          var names = (from c in contractors
                      select c.Name).ToList().Distinct();
          li.RemoveAll((i) => !names.Contains(i.InspectorName));
          
        }
        foreach (Inspection i in li)
        {
          i.myInspection = (i.NTUsername.Length > 0 && UA.user_name.ToLower() == i.NTUsername.ToLower());
          i.AddressPoint = new Point(i.Project_Address_X, i.Project_Address_Y);
          i.ParcelPoint = new Point(i.Parcel_Centroid_X, i.Parcel_Centroid_Y);
          i.PointToUse = i.AddressPoint.IsValid ? i.AddressPoint : i.ParcelPoint;
          if (!i.PointToUse.IsValid)
          {
            i.PointToUse = new Point(440000, 2100000 - (25 * badPointCount));
            badPointCount += 1;
          }
          if (UA.current_access == UserAccess.access_type.inspector_access ||
            UA.current_access == UserAccess.access_type.admin_access)
          {

            if (i.ResultADC == "") i.CanBeAssigned = true;
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


    public static List<string> GetPermitNotes(string PermitNo)
    {
      var dp = new DynamicParameters();
      dp.Add("@PermitNo", PermitNo);
      string sql = @"
          SELECT DISTINCT            
            CAST(Note AS VARCHAR(MAX)) note
          FROM bpNotes n
          WHERE 
            permitno = @PermitNo
            AND INFOTYPE =  'T'";
      return Constants.Get_Data<string>(sql, dp, Constants.csWATSC);
    }
          

  }
}