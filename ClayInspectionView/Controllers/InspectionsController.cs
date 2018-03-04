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
  public class InspectionsController : ApiController
  {
    // GET: api/Inspections
    [HttpGet]
    public IHttpActionResult GetInspections()
    {
      try
      {
        try
        {

          List<Inspection> li = Inspection.GetInspections();
          bool CanBeAssigned = UserAccess.GetUserAccess(User.Identity.Name).current_access == UserAccess.access_type.inspector_access;
          foreach (var i in li)
          {
            i.CanBeAssigned = CanBeAssigned;
          }
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

  }
}
