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
    public List<Inspection> Today()
    {
      CacheItemPolicy CIP = new CacheItemPolicy();
      CIP.AbsoluteExpiration = DateTime.Now.AddMinutes(1);
      return (List<Inspection>)myCache.GetItem("inspections", CIP);
    }

    [HttpGet]
    public List<Inspection> Tomorrow()
    {
      CacheItemPolicy CIP = new CacheItemPolicy();
      CIP.AbsoluteExpiration = DateTime.Now.AddMinutes(1);
      return (List<Inspection>)myCache.GetItem("tomorrowinspections", CIP);
    }


  }
}
