using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Configuration;
using System.Runtime.Caching;
using Dapper;
using System.Data;
using System.Data.SqlClient;
using System.DirectoryServices;

namespace ClayInspectionView.Models
{
  public static class Constants
  {
    public const string csWATSC = "IVWATSC";
    public const string csGIS = "IVGIS";
    public const string csError = "LOG";

    public static bool CheckAccess(string UserName)
    {
      if (UserName.Contains("\\"))
      {
        UserName = UserName.Split('\\')[1].ToLower();
      }
      string defaultPath = "LDAP://OU=DomainUsers,DC=CLAYBCC,DC=local";
      DirectoryEntry de = new DirectoryEntry();
      de.AuthenticationType = AuthenticationTypes.Secure;
      de.Path = defaultPath;
      DirectorySearcher ds = new DirectorySearcher(de);
      ds.Filter = "(sAMAccountName=" + UserName + ")";
      SearchResult sr = ds.FindOne();
      var distinguishedName = GetADProperty_string(sr, "distinguishedName");
      var memberOf = GetADProperty_string(sr, "memberOf");
      return (
        UserName.ToLower() == "parkern" |
        distinguishedName.Contains("OU=MIS") |
        distinguishedName.Contains("OU=GIS") |
        memberOf.Contains("CN=Building Inspectors")
        );
    }

    private static string GetADProperty_string(SearchResult sr, string propertyName)
    {
      if (sr == null)
      {
        return "";
      }
      else
      {
        string s = "";
        var tmp = sr.Properties[propertyName];
        for (int v = 0; v < tmp.Count; v++)
        {
          s += tmp[v].ToString();
          //if (tmp[v].ToString().Contains(adLibraryGroups[i]))
          //{
          //  return (libraryAccess)i;
          //}
        }
        return s;
        //return sr.Properties[propertyName].Count > 0 ? sr.Properties[propertyName][0].ToString() : "";
      }
    }

    public static List<T> Get_Data<T>(string query, string cs)
    {
      try
      {
        using (IDbConnection db = new SqlConnection(Get_ConnStr(cs)))
        {
          return (List<T>)db.Query<T>(query);
        }
      }
      catch (Exception ex)
      {
        new ErrorLog(ex, query);
        return null;
      }
    }

    public static List<T> Get_Data<T>(string query, DynamicParameters dbA, string cs, int timeOut = 60)
    {
      try
      {
        using (IDbConnection db =
          new SqlConnection(
            Get_ConnStr(cs)))
        {
          return (List<T>)db.Query<T>(query, dbA, commandTimeout: timeOut);
        }
      }
      catch (Exception ex)
      {
        new ErrorLog(ex, query);
        return null;
      }
    }

    public static int Exec_Query(string query, DynamicParameters dbA, string cs)
    {
      try
      {
        using (IDbConnection db =
          new SqlConnection(
            Get_ConnStr(cs)))
        {
          return db.Execute(query, dbA);
        }
      }
      catch (Exception ex)
      {
        new ErrorLog(ex, query);
        return -1;
      }
    }

    public static string Get_ConnStr(string cs)
    {
      return ConfigurationManager.ConnectionStrings[cs].ConnectionString;
    }

  }
}