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
    public IHttpActionResult BulkAssign(AssignData AD)
    {
      var ua = UserAccess.GetUserAccess(User.Identity.Name);
      if (ua.current_access == UserAccess.access_type.inspector_access ||
        ua.current_access == UserAccess.access_type.admin_access)
      {
        return Ok(AD.BulkAssign(ua));
      }
      else
      {
        return Unauthorized();

      }
    }

  }
}
