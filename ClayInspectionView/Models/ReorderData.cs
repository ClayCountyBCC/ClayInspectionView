using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Data;
using System.Data.SqlClient;
using Dapper;

namespace ClayInspectionView.Models
{
  public class ReorderData
  {
    public int inspection_order { get; set; } = -1;
    public int inspection_id { get; set; } = -1;

    public ReorderData() { }

    public static void Save(List<ReorderData> inspection_data)
    {
      var dt = CreateReorderDataTable();
      string query = $@"
          USE WATSC;
          UPDATE IR
            SET IR.Sort_Order = RI.inspection_order
          FROM bpINS_REQUEST IR
          INNER JOIN @ReorderInspection RI ON IR.InspReqID = RI.inspection_id
          WHERE 
            IR.ResultADC IS NULL";
      try
      {
        foreach (ReorderData d in inspection_data)
        {
          dt.Rows.Add(d.inspection_id, d.inspection_order);
        }

        using (IDbConnection db = new SqlConnection(Constants.Get_ConnStr(Constants.csWATSC)))
        {
          int i = db.Execute(query, new { ReorderInspection = dt.AsTableValuedParameter("ReorderInspection") }, commandTimeout: 60);
          return;
        }

      }
      catch (Exception ex)
      {
        new ErrorLog(ex, query);
        return;
      }
    }

    private static DataTable CreateReorderDataTable()
    {
      var dt = new DataTable("ReordreInspection");

      var inspection_id = new DataColumn("inspection_id", typeof(int));
      var inspection_order = new DataColumn("inspection_order", typeof(int));

      dt.Columns.Add(inspection_id);
      dt.Columns.Add(inspection_order);
      return dt;
    }

  }
}