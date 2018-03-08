using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using ClayInspectionView.Models;

namespace ClayInspectionView.Controllers
{
  public class UnitController : ApiController
  {
    // GET: api/Unit
    public IHttpActionResult Get()
    {
      if(UserAccess.GetUserAccess(User.Identity.Name).current_access == UserAccess.access_type.inspector_access)
      {
        return Ok(Unit.GetCachedInspectionUnits());
      }
      else
      {
        return Ok();
      }
    }


  }
}
