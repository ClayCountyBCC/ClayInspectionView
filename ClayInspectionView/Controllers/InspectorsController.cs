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
  public class InspectorsController : ApiController
  {
    // GET: api/Inspectors
    public IHttpActionResult Get()
    {
      var CIP = new CacheItemPolicy()
      {
        AbsoluteExpiration = DateTime.Now.AddHours(16)
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
  }
}
