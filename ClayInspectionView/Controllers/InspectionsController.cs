using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using ClayInspectionView.Models;
using System.Runtime.Caching;

namespace ClayInspectionView.Controllers
{
  [RoutePrefix("API/Inspections")]
  public class InspectionsController : ApiController
  {
    // GET: api/Inspections
    [HttpGet]
    [Route("GetInspections")]
    public IHttpActionResult GetInspections()
    {
      try
      {
        try
        {
          var UA = UserAccess.GetUserAccess(User.Identity.Name);
          List<Inspection> li = Inspection.GetInspections(UA);


          return Ok(li);

        }
        catch (Exception ex)
        {
          new ErrorLog(ex);
          return InternalServerError();
        }
      }catch(Exception ex)
      {
        new ErrorLog(ex);
        return InternalServerError();
      }
    }

    [HttpGet]
    [Route("GetPermitNotes")]
    public IHttpActionResult GetPermitNotes(string PermitNo)
    {
      var notes = Inspection.GetPermitNotes(PermitNo);
      if(notes == null)
      {
        return InternalServerError();
      }
      return Ok(notes);
    }

    [HttpPost]
    [Route("Reorder")]
    public IHttpActionResult UpdateInspectionOrder(List<ReorderData> data)
    {
      var ua = UserAccess.GetUserAccess(User.Identity.Name);
      ReorderData.Save(data);
      return Ok(Inspection.GetInspections(ua));
    }

  }
}
