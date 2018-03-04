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
        UPDATE IR
          SET IR.Inspector = I.Intl
        FROM bpINS_REQUEST IR
        INNER JOIN bp_INSPECTORS I ON I.ID = @InspectorId
        LEFT OUTER JOIN bpASSOC_PERMIT A ON IR.PermitNo = A.PermitNo
        LEFT OUTER JOIN bpMASTER_PERMIT M ON IR.PermitNo = M.PermitNo
        WHERE 
          IR.InspReqID IN @Ids
          AND CASE WHEN IR.PermitType = 1 THEN I.BL
            WHEN IR.PermitType = 2 THEN I.EL
            WHEN IR.PermitType = 3 THEN I.PL
            WHEN IR.PermitType = 4 THEN I.ME  END = 1
          AND ((IR.PrivProvIRId IS NOT NULL AND I.PrivateProvider = 1)
            OR IR.PrivProvIRId IS NULL)
          AND ((ISNULL(A.Comm,M.Comm) = 1 AND I.Comm = 1)
            OR ISNULL(A.Comm,M.Comm) = 0)";
      Constants.Exec_Query(query, dp, Constants.csWATSC);
    }

    public void BulkAssign()
    {
      if (InspectionIds.Count == 0) return;
      if (InspectorId == 0)
      {
        BulkAssignToUnassigned();
      }
      else
      {
        BulkAssignToInspector();
      }
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