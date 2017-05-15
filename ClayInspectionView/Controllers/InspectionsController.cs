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
    public IHttpActionResult Today()
    {
      CacheItemPolicy CIP = new CacheItemPolicy()
      {
        AbsoluteExpiration = DateTime.Now.AddMinutes(1)
      };

      try
      {
        List<Inspection> li = (List<Inspection>)myCache.GetItem("inspections", CIP);
        return Ok((from i in li
                where i.ScheduledDate.Date == DateTime.Today.Date &&
                !i.InspDateTime.HasValue
                select i).ToList());
      }
      catch(Exception ex)
      {
        new ErrorLog(ex);
        return InternalServerError();
      }

    }

    [HttpGet]
    public IHttpActionResult Tomorrow()
    {
      CacheItemPolicy CIP = new CacheItemPolicy()
      {
        AbsoluteExpiration = DateTime.Now.AddMinutes(1)
      };
      try
      {
        List<Inspection> li = (List<Inspection>)myCache.GetItem("tomorrowinspections", CIP);
        return Ok((from i in li
                where i.ScheduledDate.Date == DateTime.Today.AddDays(1).Date &&
                !i.InspDateTime.HasValue
                select i).ToList());
      }
      catch (Exception ex)
      {
        new ErrorLog(ex);
        return InternalServerError();
      }
    }


  }
}
