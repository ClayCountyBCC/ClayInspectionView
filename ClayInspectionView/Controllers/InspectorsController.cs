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
  [RoutePrefix("API/Inspectors")]
  public class InspectorsController : ApiController
  {
    // GET: api/Inspectors
    [HttpGet]
    [Route("List")]
    public IHttpActionResult Get()
    {
      if (UserAccess.GetUserAccess(User.Identity.Name).current_access == UserAccess.access_type.contract_access)
      {
        var inspectors = Inspector.GetCachedContractInspectors();
        return Ok(inspectors);
      }
      else
      {
        var inspectors = Inspector.GetCachedInspectors();
        return Ok(inspectors);
      }
    }

    [HttpGet]
    [Route("Edit")]
    public IHttpActionResult Edit()
    {
      if (UserAccess.GetUserAccess(User.Identity.Name).current_access == UserAccess.access_type.admin_access)
      {
        return Ok(Inspector.GetEditList());
      }
      else
      {
        return Ok();
      }
    }

    [HttpPost]
    [Route("Update")]
    public IHttpActionResult Update(Inspector inspector)
    {
      if (UserAccess.GetUserAccess(User.Identity.Name).current_access == UserAccess.access_type.admin_access)
      {
        return Ok(inspector.Update());
      }
      else
      {
        return Ok();
      }
    }
    // Add something to update the inspector cache when this or the update is run.
    [HttpPost]
    [Route("Insert")]
    public IHttpActionResult Insert(Inspector inspector)
    {
      if (UserAccess.GetUserAccess(User.Identity.Name).current_access == UserAccess.access_type.admin_access)
      {
        return Ok(inspector.Insert());
      }
      else
      {
        return Ok();
      }
    }

  }
}
