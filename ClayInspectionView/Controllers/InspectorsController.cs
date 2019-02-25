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
  [RoutePrefix("API/Inspector")]
  public class InspectorsController : ApiController
  {
    // GET: api/Inspectors
    [HttpGet]
    [Route("List")]
    public IHttpActionResult Get()
    {
      var CIP = new CacheItemPolicy()
      {
        AbsoluteExpiration = DateTime.Now.AddHours(1)
      };
      List<Inspector> inspectors = (List<Inspector>)myCache.GetItem("inspectors", CIP);
      if (inspectors != null)
      {
        return Ok(inspectors);
      }
      else
      {
        return InternalServerError();
      }
    }

    [HttpGet]
    [Route("Edit")]
    public IHttpActionResult Edit()
    {
      if (UserAccess.GetUserAccess(User.Identity.Name).current_access == UserAccess.access_type.admin_access)
      {
        return Ok(Inspector.Get());
      }
      else
      {
        return Ok();
      }
    }

  }
}
