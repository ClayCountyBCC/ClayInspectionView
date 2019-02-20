using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Dapper;

namespace ClayInspectionView.Models
{
  public class AssignData
  {
    public int InspectorId { get; set; } = 0;
    public List<int> InspectionIds { get; set; } = new List<int>();
    public AssignData()
    {

    }

    private void BulkAssignToInspector()
    {
      List<Inspector> inspectors = (List<Inspector>)myCache.GetItem("inspectors");
      if ((from i in inspectors
           where i.Id == InspectorId
           select i).Count() == 0) return;

      var dp = new DynamicParameters();
      dp.Add("@InspectorId", InspectorId);
      dp.Add("@Ids", InspectionIds);

      string query = @"
        USE WATSC;
        WITH FireInspections AS (
            SELECT 
              InspCd 
            FROM bpINS_REF 
            WHERE 
              InsDesc LIKE '%FIRE%'
              AND Retired = 0
        ), InspectionData AS (
        SELECT 
          IR.InspReqId,
          CASE WHEN IR.PermitType IN ('0', '1', '9') AND ISNULL(M.Comm, A.Comm) = 0 AND FI.InspCd IS NULL THEN 1 ELSE 0 END RBL,
          CASE WHEN IR.PermitType IN ('4') AND ISNULL(M.Comm, A.Comm) = 0 AND FI.InspCd IS NULL THEN 1 ELSE 0 END RME,
          CASE WHEN IR.PermitType IN ('2') AND ISNULL(M.Comm, A.Comm) = 0 AND FI.InspCd IS NULL THEN 1 ELSE 0 END REL,
          CASE WHEN IR.PermitType IN ('3') AND ISNULL(M.Comm, A.Comm) = 0 AND FI.InspCd IS NULL THEN 1 ELSE 0 END RPL,
          CASE WHEN IR.PermitType IN ('0', '1', '9') AND ISNULL(M.Comm, A.Comm) = 1 AND FI.InspCd IS NULL THEN 1 ELSE 0 END CBL,
          CASE WHEN IR.PermitType IN ('4') AND ISNULL(M.Comm, A.Comm) = 1 AND FI.InspCd IS NULL THEN 1 ELSE 0 END CME,
          CASE WHEN IR.PermitType IN ('2') AND ISNULL(M.Comm, A.Comm) = 1 AND FI.InspCd IS NULL THEN 1 ELSE 0 END CEL,
          CASE WHEN IR.PermitType IN ('3') AND ISNULL(M.Comm, A.Comm) = 1 AND FI.InspCd IS NULL THEN 1 ELSE 0 END CPL,
          CASE WHEN IR.PermitType IN ('6') OR FI.InspCd IS NOT NULL THEN 1 ELSE 0 END Fire,
          CASE WHEN ISNULL(IR.PrivProvIRId, 0) > 0 THEN 1 ELSE 0 END PrivateProvider
        FROM bpINS_REQUEST IR
        LEFT OUTER JOIN bpMASTER_PERMIT M ON M.PermitNo = IR.PermitNo
        LEFT OUTER JOIN bpASSOC_PERMIT A ON A.PermitNo = IR.PermitNo
        LEFT OUTER JOIN FireInspections FI ON IR.InspectionCode = FI.InspCd
        WHERE 
          InspReqID IN @Ids
        )

        UPDATE IR
        SET Inspector = I.Intl
        FROM bpINS_REQUEST IR   
        INNER JOIN InspectionData ID ON IR.InspReqID = ID.InspReqId
        INNER JOIN bp_INSPECTORS I ON I.ID=@InspectorId
        WHERE 
          (
          (ID.RBL = 1 AND I.RBL = 1) OR
          (ID.RME = 1 AND I.RME = 1) OR
          (ID.REL = 1 AND I.REL = 1) OR
          (ID.RPL = 1 AND I.RPL = 1) OR
          (ID.CBL = 1 AND I.CBL = 1) OR
          (ID.CME = 1 AND I.CME = 1) OR
          (ID.CEL = 1 AND I.CEL = 1) OR
          (ID.CPL = 1 AND I.CPL = 1) OR
          (ID.Fire = 1 AND I.Fire = 1)
          )
          AND ((ID.PrivateProvider = 1 AND I.PrivateProvider = 1)
          OR ID.PrivateProvider = 0);";
      Constants.Exec_Query(query, dp, Constants.csWATSC);      
    }

    public List<Inspection> BulkAssign()
    {
      if (InspectionIds.Count == 0) return new List<Inspection>();
      if (InspectorId == 0)
      {
        BulkAssignToUnassigned();
      }
      else
      {
        BulkAssignToInspector();
      }
      return Inspection.GetInspections();
    }

    private void BulkAssignToUnassigned()
    {
      var dp = new DynamicParameters();
      dp.Add("@Ids", InspectionIds);

      string query = @"
        UPDATE bpINS_REQUEST
          SET Inspector = NULL
        WHERE InspReqID IN @Ids";
      Constants.Exec_Query(query, dp, Constants.csWATSC);
    }




  }
}