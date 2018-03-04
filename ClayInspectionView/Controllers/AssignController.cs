using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using ClayInspectionView.Models;
using Newtonsoft.Json;

namespace ClayInspectionView.Controllers
{
  [RoutePrefix("API/Assign")]
  public class AssignController : ApiController
  {
    [HttpPost]
    [Route("BulkAssign")]
    public IHttpActionResult Assign(AssignData AD)
    {
      if (UserAccess.GetUserAccess(User.Identity.Name).current_access != UserAccess.access_type.inspector_access)
      {
        return Unauthorized();
      }
      else
      {
        AD.BulkAssign();
        return Ok();
      }

    }

  }
}
