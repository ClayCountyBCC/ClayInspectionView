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
  public class TotalInspectionsController : ApiController
  {
    // GET: api/TotalInspections
    // GET: api/Inspections
    [HttpGet]
    public List<Inspection> Today()
    {
      CacheItemPolicy CIP = new CacheItemPolicy()
      {
        AbsoluteExpiration = DateTime.Now.AddMinutes(10)
      };
      return (List<Inspection>)myCache.GetItem("totalinspections", CIP);
    }

    [HttpGet]
    public List<Inspection> Tomorrow()
    {
      CacheItemPolicy CIP = new CacheItemPolicy()
      {
        AbsoluteExpiration = DateTime.Now.AddMinutes(10)
      };
      return (List<Inspection>)myCache.GetItem("tomorrowtotalinspections", CIP);
    }


  }
}
