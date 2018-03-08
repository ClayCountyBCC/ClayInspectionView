using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Runtime.Caching;

namespace ClayInspectionView.Models
{
  public class myCache
  {
    private static MemoryCache _cache = new MemoryCache("myCache");

 
    public static object GetItem(string key)
    {
      return GetOrAddExisting(key, () => InitItem(key));
    }

    public static object GetItem(string key, CacheItemPolicy CIP)
    {
      return GetOrAddExisting(key, () => InitItem(key), CIP);
    }

    public static T GetItem<T>(string key, Func<T> valuefactory, CacheItemPolicy CIP)
    {
      return GetOrAddExisting(key, valuefactory, CIP);
    }

    public static void UpdateItem(string key, object newvalue, CacheItemPolicy CIP)
    {
      _cache.Set(key, newvalue, CIP);
    }

    private static T GetOrAddExisting<T>(string key, Func<T> valueFactory, CacheItemPolicy CIP)
    {

      Lazy<T> newValue = new Lazy<T>(valueFactory);
      var oldValue = _cache.AddOrGetExisting(key, newValue, CIP) as Lazy<T>;
      try
      {
        return (oldValue ?? newValue).Value;
      }
      catch(Exception ex)
      {
        // Handle cached lazy exception by evicting from cache. Thanks to Denis Borovnev for pointing this out!
        new ErrorLog(ex);
        _cache.Remove(key);
        throw;
      }
    }

    private static T GetOrAddExisting<T>(string key, Func<T> valueFactory)
    {

      Lazy<T> newValue = new Lazy<T>(valueFactory);
      var oldValue = _cache.AddOrGetExisting(key, newValue, GetCIP()) as Lazy<T>;
      try
      {
        return (oldValue ?? newValue).Value;
      }
      catch
      {
        // Handle cached lazy exception by evicting from cache. Thanks to Denis Borovnev for pointing this out!
        _cache.Remove(key);
        throw;
      }
    }

    private static CacheItemPolicy GetCIP()
    {
      CacheItemPolicy CIP = new CacheItemPolicy()
      {
        AbsoluteExpiration = DateTime.Now.AddHours(4)
      };
      return CIP;
    }

    private static object InitItem(string key)
    {
      switch (key.Trim().ToLower())
      {
        case "units":
          return Unit.GetInspectionUnits();
        case "inspectors":
          return Inspector.Get();
        case "useraccess":
          return UserAccess.GetAllUserAccess();
        default:
          return null;
      }
    }


  }
}