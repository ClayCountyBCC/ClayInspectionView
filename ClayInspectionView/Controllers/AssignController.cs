using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using ClayInspectionView.Models;

namespace ClayInspectionView.Controllers
{
  public class AssignController : ApiController
  {
    // GET: api/Assign
    public IHttpActionResult Put(string LookupKey, int InspectorId, string Day)
    {
      if (Inspection.Assign(LookupKey, InspectorId, Day) && 
        Constants.CheckAccess(User.Identity.Name))
      {
        return Ok();
      }
      else
      {
        return BadRequest();
      }
    }

  }
}
