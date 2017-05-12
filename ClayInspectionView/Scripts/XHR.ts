/// <reference path="typings/es6-promise/es6-promise.d.ts" />

/*  This code was written by macromaniac
 *  Originally pulled from: https://gist.github.com/macromaniac/e62ed27781842b6c8611 on 7/14/2016
 *  and from https://gist.github.com/takanori-ugai/8262008944769419e614
 *
 */
module XHR
{

  export class Header
  {
    header: string;
    data: string;
    constructor(header: string, data: string)
    {
      this.header = header;
      this.data = data;
    }
  }

  export class Data
  {
    Headers: string;
    Text: string;
    Type: string;
    Status: number;
    StatusText: string;
  }

  function DataFromJSXHR(jsXHR: XMLHttpRequest): Data
  {
    var data = new Data();
    data.Headers = jsXHR.getAllResponseHeaders();
    data.Text = jsXHR.responseText;
    data.Type = jsXHR.responseType;
    data.Status = jsXHR.status;
    data.StatusText = jsXHR.statusText;
    return data;
  }

  function SendCommand(
    method: string,
    url: string,
    headers: Array<Header>,
    data: string = ""): Promise<Data>
  {
    return new Promise(function (resolve, reject)
    {
      var jsXHR = new XMLHttpRequest();
      jsXHR.open(method, url);
      if (headers != null)
        headers.forEach(header =>
          jsXHR.setRequestHeader(header.header, header.data));

      jsXHR.onload = (ev) =>
      {
        if (jsXHR.status < 200 || jsXHR.status >= 300)
        {
          reject(DataFromJSXHR(jsXHR));
        }
        resolve(DataFromJSXHR(jsXHR));
      }     

      jsXHR.onerror = (ev) =>
      {
        reject("There was an error communicating with the server.  Please check your connection and try again.");
      };

      if (data.length > 0)
        jsXHR.send(data);
      else
        jsXHR.send();
    });
  }

  function addJSONHeader(headers: Array<Header>): Array<Header>
  {
    if (headers === null)
    {
      headers = [
        new XHR.Header("Content-Type", "application/json; charset=utf-8"),
        new XHR.Header("Accept", "application/json")];
    }
    else
    {
      headers.push(new XHR.Header("Content-Type", "application/json; charset=utf-8"));
      headers.push(new XHR.Header("Accept", "application/json"));
    }
    return headers;
  }

  export function Get(
    url: string,
    headers: Array<Header> = null,
    isJSON: boolean = true): Promise<Data>
  {
    headers = (isJSON ? addJSONHeader(headers) : headers);    
    return SendCommand('GET', url, headers);
  }

  export function Post(
    url: string,
    data: string = "",
    headers: Array<Header> = null,
    isJSON: boolean = true): Promise<Data>
  {
    headers = (isJSON ? addJSONHeader(headers) : headers);
    return SendCommand('POST', url, headers, data);
  }

  export function Put(
    url: string,
    data: string = "",
    headers: Array<Header> = null,
    isJSON: boolean = true): Promise<Data>
  {
    headers = (isJSON ? addJSONHeader(headers) : headers);
    return SendCommand('PUT', url, headers, data);
  }

  export function Delete(
    url: string,
    data: string = "",
    headers: Array<Header> = null,
    isJSON: boolean = true): Promise<Data>
  {
    headers = (isJSON ? addJSONHeader(headers) : headers);
    return SendCommand('DELETE', url, headers, data);
  }

}