using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using ClayInspectionView.Models;

namespace ClayInspectionView.Controllers
{
  [RoutePrefix("API/Unit")]
  public class UnitController : ApiController
  {
    // GET: api/Unit
    [HttpGet]
    [Route("List")]
    public IHttpActionResult Get()
    {
      var ua = UserAccess.GetUserAccess(User.Identity.Name);
      if (ua.current_access == UserAccess.access_type.inspector_access || 
        ua.current_access == UserAccess.access_type.admin_access )
      {
        return Ok(Unit.GetCachedInspectionUnits());
      }
      else
      {
        return Ok("");
      }
    }


  }
}
