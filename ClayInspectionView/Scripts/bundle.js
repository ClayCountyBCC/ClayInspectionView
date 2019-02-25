(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(factory());
}(this, (function () { 'use strict';

/**
 * @this {Promise}
 */
function finallyConstructor(callback) {
  var constructor = this.constructor;
  return this.then(
    function(value) {
      return constructor.resolve(callback()).then(function() {
        return value;
      });
    },
    function(reason) {
      return constructor.resolve(callback()).then(function() {
        return constructor.reject(reason);
      });
    }
  );
}

// Store setTimeout reference so promise-polyfill will be unaffected by
// other code modifying setTimeout (like sinon.useFakeTimers())
var setTimeoutFunc = setTimeout;

function noop() {}

// Polyfill for Function.prototype.bind
function bind(fn, thisArg) {
  return function() {
    fn.apply(thisArg, arguments);
  };
}

/**
 * @constructor
 * @param {Function} fn
 */
function Promise(fn) {
  if (!(this instanceof Promise))
    throw new TypeError('Promises must be constructed via new');
  if (typeof fn !== 'function') throw new TypeError('not a function');
  /** @type {!number} */
  this._state = 0;
  /** @type {!boolean} */
  this._handled = false;
  /** @type {Promise|undefined} */
  this._value = undefined;
  /** @type {!Array<!Function>} */
  this._deferreds = [];

  doResolve(fn, this);
}

function handle(self, deferred) {
  while (self._state === 3) {
    self = self._value;
  }
  if (self._state === 0) {
    self._deferreds.push(deferred);
    return;
  }
  self._handled = true;
  Promise._immediateFn(function() {
    var cb = self._state === 1 ? deferred.onFulfilled : deferred.onRejected;
    if (cb === null) {
      (self._state === 1 ? resolve : reject)(deferred.promise, self._value);
      return;
    }
    var ret;
    try {
      ret = cb(self._value);
    } catch (e) {
      reject(deferred.promise, e);
      return;
    }
    resolve(deferred.promise, ret);
  });
}

function resolve(self, newValue) {
  try {
    // Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
    if (newValue === self)
      throw new TypeError('A promise cannot be resolved with itself.');
    if (
      newValue &&
      (typeof newValue === 'object' || typeof newValue === 'function')
    ) {
      var then = newValue.then;
      if (newValue instanceof Promise) {
        self._state = 3;
        self._value = newValue;
        finale(self);
        return;
      } else if (typeof then === 'function') {
        doResolve(bind(then, newValue), self);
        return;
      }
    }
    self._state = 1;
    self._value = newValue;
    finale(self);
  } catch (e) {
    reject(self, e);
  }
}

function reject(self, newValue) {
  self._state = 2;
  self._value = newValue;
  finale(self);
}

function finale(self) {
  if (self._state === 2 && self._deferreds.length === 0) {
    Promise._immediateFn(function() {
      if (!self._handled) {
        Promise._unhandledRejectionFn(self._value);
      }
    });
  }

  for (var i = 0, len = self._deferreds.length; i < len; i++) {
    handle(self, self._deferreds[i]);
  }
  self._deferreds = null;
}

/**
 * @constructor
 */
function Handler(onFulfilled, onRejected, promise) {
  this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
  this.onRejected = typeof onRejected === 'function' ? onRejected : null;
  this.promise = promise;
}

/**
 * Take a potentially misbehaving resolver function and make sure
 * onFulfilled and onRejected are only called once.
 *
 * Makes no guarantees about asynchrony.
 */
function doResolve(fn, self) {
  var done = false;
  try {
    fn(
      function(value) {
        if (done) return;
        done = true;
        resolve(self, value);
      },
      function(reason) {
        if (done) return;
        done = true;
        reject(self, reason);
      }
    );
  } catch (ex) {
    if (done) return;
    done = true;
    reject(self, ex);
  }
}

Promise.prototype['catch'] = function(onRejected) {
  return this.then(null, onRejected);
};

Promise.prototype.then = function(onFulfilled, onRejected) {
  // @ts-ignore
  var prom = new this.constructor(noop);

  handle(this, new Handler(onFulfilled, onRejected, prom));
  return prom;
};

Promise.prototype['finally'] = finallyConstructor;

Promise.all = function(arr) {
  return new Promise(function(resolve, reject) {
    if (!arr || typeof arr.length === 'undefined')
      throw new TypeError('Promise.all accepts an array');
    var args = Array.prototype.slice.call(arr);
    if (args.length === 0) return resolve([]);
    var remaining = args.length;

    function res(i, val) {
      try {
        if (val && (typeof val === 'object' || typeof val === 'function')) {
          var then = val.then;
          if (typeof then === 'function') {
            then.call(
              val,
              function(val) {
                res(i, val);
              },
              reject
            );
            return;
          }
        }
        args[i] = val;
        if (--remaining === 0) {
          resolve(args);
        }
      } catch (ex) {
        reject(ex);
      }
    }

    for (var i = 0; i < args.length; i++) {
      res(i, args[i]);
    }
  });
};

Promise.resolve = function(value) {
  if (value && typeof value === 'object' && value.constructor === Promise) {
    return value;
  }

  return new Promise(function(resolve) {
    resolve(value);
  });
};

Promise.reject = function(value) {
  return new Promise(function(resolve, reject) {
    reject(value);
  });
};

Promise.race = function(values) {
  return new Promise(function(resolve, reject) {
    for (var i = 0, len = values.length; i < len; i++) {
      values[i].then(resolve, reject);
    }
  });
};

// Use polyfill for setImmediate for performance gains
Promise._immediateFn =
  (typeof setImmediate === 'function' &&
    function(fn) {
      setImmediate(fn);
    }) ||
  function(fn) {
    setTimeoutFunc(fn, 0);
  };

Promise._unhandledRejectionFn = function _unhandledRejectionFn(err) {
  if (typeof console !== 'undefined' && console) {
    console.warn('Possible Unhandled Promise Rejection:', err); // eslint-disable-line no-console
  }
};

/** @suppress {undefinedVars} */
var globalNS = (function() {
  // the only reliable means to get the global object is
  // `Function('return this')()`
  // However, this causes CSP violations in Chrome apps.
  if (typeof self !== 'undefined') {
    return self;
  }
  if (typeof window !== 'undefined') {
    return window;
  }
  if (typeof global !== 'undefined') {
    return global;
  }
  throw new Error('unable to locate global object');
})();

if (!('Promise' in globalNS)) {
  globalNS['Promise'] = Promise;
} else if (!globalNS.Promise.prototype['finally']) {
  globalNS.Promise.prototype['finally'] = finallyConstructor;
}

})));

(function(self) {
  'use strict';

  if (self.fetch) {
    return
  }

  var support = {
    searchParams: 'URLSearchParams' in self,
    iterable: 'Symbol' in self && 'iterator' in Symbol,
    blob: 'FileReader' in self && 'Blob' in self && (function() {
      try {
        new Blob()
        return true
      } catch(e) {
        return false
      }
    })(),
    formData: 'FormData' in self,
    arrayBuffer: 'ArrayBuffer' in self
  }

  if (support.arrayBuffer) {
    var viewClasses = [
      '[object Int8Array]',
      '[object Uint8Array]',
      '[object Uint8ClampedArray]',
      '[object Int16Array]',
      '[object Uint16Array]',
      '[object Int32Array]',
      '[object Uint32Array]',
      '[object Float32Array]',
      '[object Float64Array]'
    ]

    var isDataView = function(obj) {
      return obj && DataView.prototype.isPrototypeOf(obj)
    }

    var isArrayBufferView = ArrayBuffer.isView || function(obj) {
      return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1
    }
  }

  function normalizeName(name) {
    if (typeof name !== 'string') {
      name = String(name)
    }
    if (/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(name)) {
      throw new TypeError('Invalid character in header field name')
    }
    return name.toLowerCase()
  }

  function normalizeValue(value) {
    if (typeof value !== 'string') {
      value = String(value)
    }
    return value
  }

  // Build a destructive iterator for the value list
  function iteratorFor(items) {
    var iterator = {
      next: function() {
        var value = items.shift()
        return {done: value === undefined, value: value}
      }
    }

    if (support.iterable) {
      iterator[Symbol.iterator] = function() {
        return iterator
      }
    }

    return iterator
  }

  function Headers(headers) {
    this.map = {}

    if (headers instanceof Headers) {
      headers.forEach(function(value, name) {
        this.append(name, value)
      }, this)
    } else if (Array.isArray(headers)) {
      headers.forEach(function(header) {
        this.append(header[0], header[1])
      }, this)
    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function(name) {
        this.append(name, headers[name])
      }, this)
    }
  }

  Headers.prototype.append = function(name, value) {
    name = normalizeName(name)
    value = normalizeValue(value)
    var oldValue = this.map[name]
    this.map[name] = oldValue ? oldValue+','+value : value
  }

  Headers.prototype['delete'] = function(name) {
    delete this.map[normalizeName(name)]
  }

  Headers.prototype.get = function(name) {
    name = normalizeName(name)
    return this.has(name) ? this.map[name] : null
  }

  Headers.prototype.has = function(name) {
    return this.map.hasOwnProperty(normalizeName(name))
  }

  Headers.prototype.set = function(name, value) {
    this.map[normalizeName(name)] = normalizeValue(value)
  }

  Headers.prototype.forEach = function(callback, thisArg) {
    for (var name in this.map) {
      if (this.map.hasOwnProperty(name)) {
        callback.call(thisArg, this.map[name], name, this)
      }
    }
  }

  Headers.prototype.keys = function() {
    var items = []
    this.forEach(function(value, name) { items.push(name) })
    return iteratorFor(items)
  }

  Headers.prototype.values = function() {
    var items = []
    this.forEach(function(value) { items.push(value) })
    return iteratorFor(items)
  }

  Headers.prototype.entries = function() {
    var items = []
    this.forEach(function(value, name) { items.push([name, value]) })
    return iteratorFor(items)
  }

  if (support.iterable) {
    Headers.prototype[Symbol.iterator] = Headers.prototype.entries
  }

  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError('Already read'))
    }
    body.bodyUsed = true
  }

  function fileReaderReady(reader) {
    return new Promise(function(resolve, reject) {
      reader.onload = function() {
        resolve(reader.result)
      }
      reader.onerror = function() {
        reject(reader.error)
      }
    })
  }

  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader()
    var promise = fileReaderReady(reader)
    reader.readAsArrayBuffer(blob)
    return promise
  }

  function readBlobAsText(blob) {
    var reader = new FileReader()
    var promise = fileReaderReady(reader)
    reader.readAsText(blob)
    return promise
  }

  function readArrayBufferAsText(buf) {
    var view = new Uint8Array(buf)
    var chars = new Array(view.length)

    for (var i = 0; i < view.length; i++) {
      chars[i] = String.fromCharCode(view[i])
    }
    return chars.join('')
  }

  function bufferClone(buf) {
    if (buf.slice) {
      return buf.slice(0)
    } else {
      var view = new Uint8Array(buf.byteLength)
      view.set(new Uint8Array(buf))
      return view.buffer
    }
  }

  function Body() {
    this.bodyUsed = false

    this._initBody = function(body) {
      this._bodyInit = body
      if (!body) {
        this._bodyText = ''
      } else if (typeof body === 'string') {
        this._bodyText = body
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body
      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
        this._bodyText = body.toString()
      } else if (support.arrayBuffer && support.blob && isDataView(body)) {
        this._bodyArrayBuffer = bufferClone(body.buffer)
        // IE 10-11 can't handle a DataView body.
        this._bodyInit = new Blob([this._bodyArrayBuffer])
      } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
        this._bodyArrayBuffer = bufferClone(body)
      } else {
        throw new Error('unsupported BodyInit type')
      }

      if (!this.headers.get('content-type')) {
        if (typeof body === 'string') {
          this.headers.set('content-type', 'text/plain;charset=UTF-8')
        } else if (this._bodyBlob && this._bodyBlob.type) {
          this.headers.set('content-type', this._bodyBlob.type)
        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
          this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8')
        }
      }
    }

    if (support.blob) {
      this.blob = function() {
        var rejected = consumed(this)
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return Promise.resolve(this._bodyBlob)
        } else if (this._bodyArrayBuffer) {
          return Promise.resolve(new Blob([this._bodyArrayBuffer]))
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as blob')
        } else {
          return Promise.resolve(new Blob([this._bodyText]))
        }
      }

      this.arrayBuffer = function() {
        if (this._bodyArrayBuffer) {
          return consumed(this) || Promise.resolve(this._bodyArrayBuffer)
        } else {
          return this.blob().then(readBlobAsArrayBuffer)
        }
      }
    }

    this.text = function() {
      var rejected = consumed(this)
      if (rejected) {
        return rejected
      }

      if (this._bodyBlob) {
        return readBlobAsText(this._bodyBlob)
      } else if (this._bodyArrayBuffer) {
        return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer))
      } else if (this._bodyFormData) {
        throw new Error('could not read FormData body as text')
      } else {
        return Promise.resolve(this._bodyText)
      }
    }

    if (support.formData) {
      this.formData = function() {
        return this.text().then(decode)
      }
    }

    this.json = function() {
      return this.text().then(JSON.parse)
    }

    return this
  }

  // HTTP methods whose capitalization should be normalized
  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT']

  function normalizeMethod(method) {
    var upcased = method.toUpperCase()
    return (methods.indexOf(upcased) > -1) ? upcased : method
  }

  function Request(input, options) {
    options = options || {}
    var body = options.body

    if (input instanceof Request) {
      if (input.bodyUsed) {
        throw new TypeError('Already read')
      }
      this.url = input.url
      this.credentials = input.credentials
      if (!options.headers) {
        this.headers = new Headers(input.headers)
      }
      this.method = input.method
      this.mode = input.mode
      if (!body && input._bodyInit != null) {
        body = input._bodyInit
        input.bodyUsed = true
      }
    } else {
      this.url = String(input)
    }

    this.credentials = options.credentials || this.credentials || 'omit'
    if (options.headers || !this.headers) {
      this.headers = new Headers(options.headers)
    }
    this.method = normalizeMethod(options.method || this.method || 'GET')
    this.mode = options.mode || this.mode || null
    this.referrer = null

    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
    this._initBody(body)
  }

  Request.prototype.clone = function() {
    return new Request(this, { body: this._bodyInit })
  }

  function decode(body) {
    var form = new FormData()
    body.trim().split('&').forEach(function(bytes) {
      if (bytes) {
        var split = bytes.split('=')
        var name = split.shift().replace(/\+/g, ' ')
        var value = split.join('=').replace(/\+/g, ' ')
        form.append(decodeURIComponent(name), decodeURIComponent(value))
      }
    })
    return form
  }

  function parseHeaders(rawHeaders) {
    var headers = new Headers()
    // Replace instances of \r\n and \n followed by at least one space or horizontal tab with a space
    // https://tools.ietf.org/html/rfc7230#section-3.2
    var preProcessedHeaders = rawHeaders.replace(/\r?\n[\t ]+/g, ' ')
    preProcessedHeaders.split(/\r?\n/).forEach(function(line) {
      var parts = line.split(':')
      var key = parts.shift().trim()
      if (key) {
        var value = parts.join(':').trim()
        headers.append(key, value)
      }
    })
    return headers
  }

  Body.call(Request.prototype)

  function Response(bodyInit, options) {
    if (!options) {
      options = {}
    }

    this.type = 'default'
    this.status = options.status === undefined ? 200 : options.status
    this.ok = this.status >= 200 && this.status < 300
    this.statusText = 'statusText' in options ? options.statusText : 'OK'
    this.headers = new Headers(options.headers)
    this.url = options.url || ''
    this._initBody(bodyInit)
  }

  Body.call(Response.prototype)

  Response.prototype.clone = function() {
    return new Response(this._bodyInit, {
      status: this.status,
      statusText: this.statusText,
      headers: new Headers(this.headers),
      url: this.url
    })
  }

  Response.error = function() {
    var response = new Response(null, {status: 0, statusText: ''})
    response.type = 'error'
    return response
  }

  var redirectStatuses = [301, 302, 303, 307, 308]

  Response.redirect = function(url, status) {
    if (redirectStatuses.indexOf(status) === -1) {
      throw new RangeError('Invalid status code')
    }

    return new Response(null, {status: status, headers: {location: url}})
  }

  self.Headers = Headers
  self.Request = Request
  self.Response = Response

  self.fetch = function(input, init) {
    return new Promise(function(resolve, reject) {
      var request = new Request(input, init)
      var xhr = new XMLHttpRequest()

      xhr.onload = function() {
        var options = {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseHeaders(xhr.getAllResponseHeaders() || '')
        }
        options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL')
        var body = 'response' in xhr ? xhr.response : xhr.responseText
        resolve(new Response(body, options))
      }

      xhr.onerror = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.ontimeout = function() {
        reject(new TypeError('Network request failed'))
      }

      xhr.open(request.method, request.url, true)

      if (request.credentials === 'include') {
        xhr.withCredentials = true
      } else if (request.credentials === 'omit') {
        xhr.withCredentials = false
      }

      if ('responseType' in xhr && support.blob) {
        xhr.responseType = 'blob'
      }

      request.headers.forEach(function(value, name) {
        xhr.setRequestHeader(name, value)
      })

      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit)
    })
  }
  self.fetch.polyfill = true
})(typeof self !== 'undefined' ? self : this);

/// <reference path="menuitem.ts" />
var Utilities;
(function (Utilities) {
    function Hide(e) {
        if (typeof e == "string") {
            e = document.getElementById(e);
        }
        e.classList.add("hide");
        e.classList.remove("show");
        e.classList.remove("show-inline");
        e.classList.remove("show-flex");
    }
    Utilities.Hide = Hide;
    function Show(e) {
        if (typeof e == "string") {
            e = document.getElementById(e);
        }
        e.classList.add("show");
        e.classList.remove("hide");
        e.classList.remove("show-inline");
        e.classList.remove("show-flex");
    }
    Utilities.Show = Show;
    function Show_Inline(e) {
        if (typeof e == "string") {
            e = document.getElementById(e);
        }
        e.classList.add("show-inline");
        e.classList.remove("hide");
        e.classList.remove("show");
        e.classList.remove("show-flex");
    }
    Utilities.Show_Inline = Show_Inline;
    function Show_Inline_Flex(e) {
        if (typeof e == "string") {
            e = document.getElementById(e);
        }
        e.classList.add("show-inline-flex");
        e.classList.remove("hide");
        e.classList.remove("show");
        e.classList.remove("show-flex");
    }
    Utilities.Show_Inline_Flex = Show_Inline_Flex;
    function Show_Flex(e) {
        if (typeof e == "string") {
            e = document.getElementById(e);
        }
        e.classList.add("show-flex");
        e.classList.remove("hide");
        e.classList.remove("show-inline");
        e.classList.remove("show");
    }
    Utilities.Show_Flex = Show_Flex;
    function Error_Show(e, errorText, timeout) {
        if (typeof e == "string") {
            e = document.getElementById(e);
        }
        if (errorText) {
            //Set_Text(e, errorText);
            Clear_Element(e);
            var notification = document.createElement("div");
            notification.classList.add("notification");
            notification.classList.add("is-danger");
            var deleteButton = document.createElement("button");
            deleteButton.classList.add("delete");
            deleteButton.onclick = function () {
                Hide(e);
            };
            notification.appendChild(deleteButton);
            if (Array.isArray(errorText)) {
                // we're assuming that errorText is an array if we get here.
                var ul_1 = document.createElement("ul");
                errorText.forEach(function (et) {
                    var li = document.createElement("li");
                    li.appendChild(document.createTextNode(et));
                    ul_1.appendChild(li);
                });
                notification.appendChild(ul_1);
            }
            else {
                notification.appendChild(document.createTextNode(errorText));
            }
            e.appendChild(notification);
        }
        Show(e);
        if (timeout == undefined || timeout === true) {
            window.setTimeout(function (j) {
                Hide(e);
            }, 10000);
        }
    }
    Utilities.Error_Show = Error_Show;
    function Clear_Element(node) {
        if (node === null || node === undefined)
            return;
        while (node.firstChild) {
            node.removeChild(node.firstChild);
        }
    }
    Utilities.Clear_Element = Clear_Element;
    function Create_Option(value, label, selected) {
        if (selected === void 0) { selected = false; }
        var o = document.createElement("option");
        o.value = value;
        o.text = label;
        o.selected = selected;
        return o;
    }
    Utilities.Create_Option = Create_Option;
    function Get_Value(e) {
        if (typeof e == "string") {
            e = document.getElementById(e);
        }
        return e.value;
    }
    Utilities.Get_Value = Get_Value;
    function Set_Value(e, value) {
        if (typeof e == "string") {
            e = document.getElementById(e);
        }
        e.value = value;
    }
    Utilities.Set_Value = Set_Value;
    function Set_Text(e, value) {
        if (typeof e == "string") {
            e = document.getElementById(e);
        }
        Clear_Element(e);
        e.appendChild(document.createTextNode(value));
    }
    Utilities.Set_Text = Set_Text;
    function Show_Menu(elementId) {
        //let element = e.srcElement;
        // we expect the element's id to be in a "nav-XXX" name format, where 
        // XXX is the element we want to show 
        var id = elementId.replace("nav-", "");
        var menuItems = document.querySelectorAll("#menuTabs > li > a");
        if (menuItems.length > 0) {
            for (var i = 0; i < menuItems.length; i++) {
                var item = menuItems.item(i);
                if (item.id === elementId) {
                    item.parentElement.classList.add("is-active");
                }
                else {
                    item.parentElement.classList.remove("is-active");
                }
            }
        }
        Show_Hide_Selector("#views > section", id);
    }
    Utilities.Show_Menu = Show_Menu;
    function Handle_Tabs(tabSelector, containerSelector, id) {
        Activate_Inactivate_Selector(tabSelector, "nav-" + id);
        Show_Hide_Selector(containerSelector, id);
    }
    Utilities.Handle_Tabs = Handle_Tabs;
    function Activate_Inactivate_Selector(selector, id) {
        var sections = document.querySelectorAll(selector);
        if (sections.length > 0) {
            for (var i = 0; i < sections.length; i++) {
                var item = sections.item(i);
                if (item.id === id) {
                    item.classList.add("is-active");
                }
                else {
                    item.classList.remove("is-active");
                }
            }
        }
    }
    Utilities.Activate_Inactivate_Selector = Activate_Inactivate_Selector;
    function Show_Hide_Selector(selector, id) {
        var sections = document.querySelectorAll(selector);
        if (sections.length > 0) {
            for (var i = 0; i < sections.length; i++) {
                var item = sections.item(i);
                if (item.id === id) {
                    Show(item);
                }
                else {
                    Hide(item);
                }
            }
        }
    }
    Utilities.Show_Hide_Selector = Show_Hide_Selector;
    function Get(url) {
        return fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json" //,"Upgrade-Insecure-Requests": "1"
            },
            cache: "no-cache",
            credentials: "include"
        })
            .then(function (response) {
            if (!response.ok) {
                throw new Error(response.statusText);
            }
            return response.json();
        });
    }
    Utilities.Get = Get;
    function Post(url, data) {
        return fetch(url, {
            method: "POST",
            body: JSON.stringify(data),
            cache: "no-cache",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include"
        }).then(function (response) {
            console.log('Post Response', response);
            if (!response.ok) {
                throw new Error(response.statusText);
            }
            return response.json();
        });
    }
    Utilities.Post = Post;
    function Post_Empty(url, data) {
        return fetch(url, {
            method: "POST",
            body: data !== null ? JSON.stringify(data) : "",
            cache: "no-cache",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include"
        }).then(function (response) {
            return response;
            //console.log('Post Response', response);
            //if (!response.ok)
            //{
            //  throw new Error(response.statusText)
            //}
            //return response;
        });
    }
    Utilities.Post_Empty = Post_Empty;
    function Format_Amount(amount) {
        return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    }
    Utilities.Format_Amount = Format_Amount;
    function Format_Date(date) {
        if (date instanceof Date) {
            return date.toLocaleDateString('en-us');
        }
        return new Date(date).toLocaleDateString('en-US');
    }
    Utilities.Format_Date = Format_Date;
    function Format_DateTime(date) {
        if (date instanceof Date) {
            return date.toLocaleString('en-us');
        }
        return new Date(date).toLocaleString('en-US');
    }
    Utilities.Format_DateTime = Format_DateTime;
    function Validate_Text(e, errorElementId, errorText) {
        // this should only be used for required elements.
        if (typeof e == "string") {
            e = document.getElementById(e);
        }
        var ele = e;
        ele.tagName.toLowerCase() === "select" ? ele.parentElement.classList.remove("is-danger") : ele.classList.remove("is-danger");
        var v = Get_Value(ele).trim();
        if (v.length == 0) {
            ele.tagName.toLowerCase() === "select" ? ele.parentElement.classList.add("is-danger") : ele.classList.add("is-danger");
            Error_Show(errorElementId, errorText);
            ele.focus();
            ele.scrollTo();
            return "";
        }
        return v;
    }
    Utilities.Validate_Text = Validate_Text;
    function Toggle_Loading_Button(e, disabled) {
        if (typeof e == "string") {
            e = document.getElementById(e);
        }
        var b = e;
        b.disabled = disabled;
        b.classList.toggle("is-loading", disabled);
    }
    Utilities.Toggle_Loading_Button = Toggle_Loading_Button;
    function Create_Menu_Element(menuItem) {
        var li = document.createElement("li");
        if (menuItem.selected)
            li.classList.add("is-active");
        var a = document.createElement("a");
        a.id = menuItem.id;
        a.onclick = function () {
            Update_Menu(menuItem);
        };
        if (menuItem.icon.length > 0) {
            var span = document.createElement("span");
            span.classList.add("icon");
            span.classList.add("is-medium");
            var i = document.createElement("i");
            var icons = menuItem.icon.split(" ");
            for (var _i = 0, icons_1 = icons; _i < icons_1.length; _i++) {
                var icon = icons_1[_i];
                i.classList.add(icon);
            }
            span.appendChild(i);
            a.appendChild(span);
        }
        a.appendChild(document.createTextNode(menuItem.label));
        li.appendChild(a);
        return li;
    }
    Utilities.Create_Menu_Element = Create_Menu_Element;
    function Update_Menu(menuItem) {
        Set_Text("menuTitle", menuItem.title);
        Set_Text("menuSubTitle", menuItem.subTitle);
        Show_Menu(menuItem.id);
        document.getElementById(menuItem.autofocusId).focus();
    }
    Utilities.Update_Menu = Update_Menu;
    function Build_Menu_Elements(target, Menus) {
        var menu = document.getElementById(target);
        for (var _i = 0, Menus_1 = Menus; _i < Menus_1.length; _i++) {
            var menuItem = Menus_1[_i];
            menu.appendChild(Utilities.Create_Menu_Element(menuItem));
        }
    }
    Utilities.Build_Menu_Elements = Build_Menu_Elements;
    function CheckBrowser() {
        var browser = "";
        if ((navigator.userAgent.indexOf("Opera") || navigator.userAgent.indexOf('OPR')) != -1) {
            browser = 'Opera';
        }
        else if (navigator.userAgent.indexOf("Chrome") != -1) {
            browser = 'Chrome';
        }
        else if (navigator.userAgent.indexOf("Safari") != -1) {
            browser = 'Safari';
        }
        else if (navigator.userAgent.indexOf("Firefox") != -1) {
            browser = 'Firefox';
        }
        else if ((navigator.userAgent.indexOf("MSIE") != -1) || (!!document.DOCUMENT_NODE == true)) //IF IE > 10
         {
            browser = 'IE';
        }
        else {
            browser = 'unknown';
        }
        return browser;
    }
    Utilities.CheckBrowser = CheckBrowser;
    function Get_Path(appName) {
        var path = "/";
        var i = window.location.pathname.toLowerCase().indexOf(appName);
        if (i == 0) {
            path = appName + "/";
        }
        return path;
    }
    Utilities.Get_Path = Get_Path;
})(Utilities || (Utilities = {}));
//# sourceMappingURL=Utilities.js.map
/// <reference path="point.ts" />
/// <reference path="ui.ts" />
/// <reference path="app.ts" />
var IView;
(function (IView) {
    var Unit = /** @class */ (function () {
        function Unit() {
        }
        Unit.GetUnits = function () {
            var path = Utilities.Get_Path("/inspectionview");
            Utilities.Get(path + "API/Unit/List")
                .then(function (units) {
                console.log('units', units);
                IView.allUnits = units;
                console.log('build units layer');
                IView.mapController.UpdateUnitLayer(units);
            }, function (e) {
                console.log('error getting units');
                IView.allUnits = [];
            });
        };
        Unit.UnitView = function (unit) {
            var ol = document.createElement("ol");
            var li = document.createElement("li");
            li.appendChild(document.createTextNode("Date Last Updated: " + Utilities.Format_DateTime(unit.Date_Last_Communicated)));
            ol.appendChild(li);
            return ol.outerHTML;
        };
        return Unit;
    }());
    IView.Unit = Unit;
})(IView || (IView = {}));
//# sourceMappingURL=unit.js.map
/// <reference path="app.ts" />
//# sourceMappingURL=ui.js.map
/// <reference path="Typings/arcgis-js-api.d.ts" />
var IView;
(function (IView) {
    var MapController = /** @class */ (function () {
        function MapController(mapDiv) {
            this.mapDiv = mapDiv;
            this.isDrawing = false;
            var mapController = this;
            require([
                "esri/map",
                "esri/layers/ArcGISDynamicMapServiceLayer",
                "esri/layers/GraphicsLayer",
                "esri/dijit/Legend",
                "dojo/_base/array",
                "dojo/parser",
                "dijit/layout/BorderContainer",
                "esri/toolbars/draw",
                "dojo/domReady!"
            ], function (Map, ArcGISDynamicMapServiceLayer, GraphicsLayer, Legend, arrayUtils, Parser, BorderContainer, Draw) {
                var mapOptions = {
                    basemap: "osm",
                    zoom: 11,
                    logo: false,
                    center: [-81.80, 29.950]
                    //showInfoWindowOnClick: false
                };
                mapController.map = new Map(mapDiv, mapOptions);
                mapController.map.infoWindow.resize(600, 100);
                //map.infoWindow.resize(300, 200); // changes the size of the info window used in the InfoTemplate
                // default size is 250wide by 100 high
                mapController.map.on("load", function (evt) {
                    //  mapController.drawToolbar = new Draw(evt.map, { showTooltips: false });
                    //  mapController.drawToolbar.on("DrawEnd", IView.FindItemsInExtent);
                    IView.mapLoadCompleted();
                });
                var dynamicLayerOptions = {
                    opacity: .3
                };
                var BuildingLayer = new ArcGISDynamicMapServiceLayer("https://maps.claycountygov.com:6443/arcgis/rest/services/Building/MapServer", dynamicLayerOptions);
                IView.location_layer = new GraphicsLayer();
                IView.location_layer.id = "locations";
                IView.unit_layer = new GraphicsLayer();
                IView.unit_layer.id = "units";
                mapController.map.addLayers([BuildingLayer, IView.location_layer, IView.unit_layer]);
            });
        }
        MapController.prototype.ToggleDraw = function (toggle) {
            if (toggle === void 0) { toggle = null; }
            var mapController = this;
            require(["esri/toolbars/draw"], function (Draw) {
                if (toggle !== null) {
                    mapController.isDrawing = toggle;
                }
                else {
                    mapController.isDrawing = !mapController.isDrawing;
                }
                if (mapController.isDrawing) {
                    mapController.drawToolbar.activate(Draw.EXTENT);
                }
                else {
                    mapController.drawToolbar.deactivate();
                }
            });
        };
        MapController.prototype.UpdateUnitLayer = function (units) {
            //if (locations.length === 0) return;
            require([
                "esri/layers/GraphicsLayer",
                "esri/geometry/Point",
                "esri/symbols/SimpleMarkerSymbol",
                "esri/symbols/PictureMarkerSymbol",
                "esri/graphic",
                "esri/SpatialReference",
                "esri/Color",
                "esri/InfoTemplate",
                "esri/geometry/webMercatorUtils",
                "esri/symbols/TextSymbol"
            ], function (GraphicsLayer, arcgisPoint, SimpleMarkerSymbol, PictureMarkerSymbol, Graphic, SpatialReference, Color, InfoTemplate, webMercatorUtils, TextSymbol) {
                IView.unit_layer.clear();
                var _loop_1 = function (u) {
                    pin = new arcgisPoint([u.Longitude, u.Latitude], new SpatialReference({ wkid: 4326 }));
                    wmPin = webMercatorUtils.geographicToWebMercator(pin);
                    iT = new InfoTemplate();
                    iT.setTitle('Vehicle: ' + u.Name);
                    iT.setContent(function (graphic) {
                        var value = IView.Unit.UnitView(u);
                        console.log('html info template', value);
                        return value;
                    });
                    icon = new PictureMarkerSymbol({
                        "angle": 0,
                        "xoffset": 0,
                        "yoffset": 0,
                        "type": "esriPMS",
                        "url": u.Unit_Icon_URL,
                        "contentType": "image/png",
                        "width": 30,
                        "height": 30
                    });
                    g = new Graphic(wmPin, icon);
                    g.setInfoTemplate(iT);
                    IView.unit_layer.add(g);
                    textSymbol = new TextSymbol(u.Name); //esri.symbol.TextSymbol(data.Records[i].UnitName);
                    textSymbol.setColor(new dojo.Color([0, 100, 0]));
                    textSymbol.setOffset(0, -20);
                    textSymbol.setAlign(TextSymbol.ALIGN_MIDDLE);
                    font = new esri.symbol.Font();
                    font.setSize("10pt");
                    font.setWeight(esri.symbol.Font.WEIGHT_BOLD);
                    textSymbol.setFont(font);
                    graphicText = new Graphic(wmPin, textSymbol);
                    IView.unit_layer.add(graphicText);
                    //g.setInfoTemplate(iT);
                };
                var pin, wmPin, iT, icon, g, textSymbol, font, graphicText;
                for (var _i = 0, units_1 = units; _i < units_1.length; _i++) {
                    var u = units_1[_i];
                    _loop_1(u);
                }
                IView.unit_layer.show();
            });
        };
        MapController.prototype.UpdateLocationLayer = function (locations) {
            //if (locations.length === 0) return;
            require([
                "esri/layers/GraphicsLayer",
                "esri/geometry/Point",
                "esri/symbols/SimpleMarkerSymbol",
                "esri/graphic",
                "esri/SpatialReference",
                "esri/Color",
                "esri/InfoTemplate",
                "esri/geometry/webMercatorUtils",
                "esri/symbols/TextSymbol"
            ], function (GraphicsLayer, arcgisPoint, SimpleMarkerSymbol, Graphic, SpatialReference, Color, InfoTemplate, webMercatorUtils, TextSymbol) {
                IView.location_layer.clear();
                var _loop_2 = function (l) {
                    var p = l.point_to_use;
                    pin = new arcgisPoint([p.Longitude, p.Latitude], new SpatialReference({ wkid: 4326 }));
                    wmPin = webMercatorUtils.geographicToWebMercator(pin);
                    iT = new InfoTemplate();
                    iT.setTitle('Inspections: ' + l.inspections.length.toString());
                    iT.setContent(function (graphic) {
                        var value = l.LocationView().outerHTML;
                        console.log('html info template', value);
                        return value;
                    });
                    if (l.icons.length > 1) {
                        for (var i = 0; i < l.icons.length; i++) {
                            g = new Graphic(wmPin, l.icons[i]);
                            g.setInfoTemplate(iT);
                            IView.location_layer.add(g);
                        }
                        // need to add circle around grouped inspections
                    }
                    else {
                        g = new Graphic(wmPin, l.icons[0]);
                        g.setInfoTemplate(iT);
                        IView.location_layer.add(g);
                    }
                    if (l.inspections.length > 1) {
                        textSymbol = new TextSymbol(l.inspections.length.toString()); //esri.symbol.TextSymbol(data.Records[i].UnitName);
                        textSymbol.setColor(new dojo.Color([0, 100, 0]));
                        textSymbol.setOffset(0, -20);
                        textSymbol.setAlign(TextSymbol.ALIGN_MIDDLE);
                        font = new esri.symbol.Font();
                        font.setSize("8pt");
                        font.setWeight(esri.symbol.Font.WEIGHT_BOLD);
                        textSymbol.setFont(font);
                        graphicText = new Graphic(wmPin, textSymbol);
                        IView.location_layer.add(graphicText);
                    }
                    //g.setInfoTemplate(iT);
                };
                var pin, wmPin, iT, g, g, textSymbol, font, graphicText;
                for (var _i = 0, locations_1 = locations; _i < locations_1.length; _i++) {
                    var l = locations_1[_i];
                    _loop_2(l);
                }
                IView.location_layer.show();
            });
        };
        MapController.prototype.CreateLayers = function (inspectorData, day, completed) {
            if (inspectorData.length === 0)
                return [];
            var layers;
            require([
                "esri/layers/GraphicsLayer",
                "esri/geometry/Point",
                "esri/symbols/SimpleMarkerSymbol",
                "esri/graphic",
                "esri/SpatialReference",
                "esri/Color",
                "esri/InfoTemplate",
                "esri/geometry/webMercatorUtils"
            ], function (GraphicsLayer, arcgisPoint, SimpleMarkerSymbol, Graphic, SpatialReference, Color, InfoTemplate, webMercatorUtils) {
                layers = inspectorData.map(function (i) {
                    var l = new GraphicsLayer();
                    l.id = i.Name + '-' + day + '-' + completed;
                    l.inspector = i.Id;
                    l.completed = completed;
                    l.day = day;
                    l.color = i.Color;
                    l.numberInspections = i.Inspections.length;
                    var c = Color.fromHex(i.Color);
                    // ak is now a list of unique lookup keys for this user.
                    var ak = i.Inspections.map(function (n) { return n.LookupKey; });
                    ak = ak.filter(function (v, i) { return ak.indexOf(v) == i; });
                    ak.forEach(function (n) {
                        var inspections = i.Inspections.filter(function (v) {
                            return v.LookupKey == n;
                        });
                        // Need to get total number o                
                        var p = inspections[0].PointToUse;
                        var compactAddress = inspections[0].StreetAddressCombined + '<br/> ' +
                            inspections[0].City + ', ' + inspections[0].Zip;
                        if (!p.IsValid) {
                            console.log('Invalid data', n, i);
                        }
                        if (p.IsValid) {
                            var iT = new InfoTemplate();
                            iT.setTitle('Address: ${CompactAddress}');
                            //iT.setContent(IView.mapAddressClick);
                            var s = new SimpleMarkerSymbol({
                                "color": c,
                                "size": 12,
                                "angle": 0,
                                "xoffset": 0,
                                "yoffset": -5,
                                "type": "esriSMS",
                                "style": "esriSMSCircle",
                                "outline": { "color": [0, 0, 0, 255], "width": 1, "type": "esriSLS", "style": "esriSLSSolid" }
                            });
                            var inspection = new arcgisPoint([p.Longitude, p.Latitude], new SpatialReference({ wkid: 4326 }));
                            var wmInspection = webMercatorUtils.geographicToWebMercator(inspection);
                            var g = new Graphic(wmInspection, s);
                            g.setAttributes({
                                "CompactAddress": compactAddress,
                                "LookupKey": n
                            });
                            g.setInfoTemplate(iT);
                            l.add(g);
                        }
                    });
                    //l.visible = isVisible;
                    return l;
                });
            });
            return layers;
        };
        MapController.prototype.ApplyLayers = function (layers) {
            var mapController = this;
            this.map.addLayers(layers);
        };
        MapController.prototype.ToggleLayers = function (inspectorId, day, isComplete, visible) {
            var m = this.map;
            this.map.graphicsLayerIds.forEach(function (layerId) {
                var l = m.getLayer(layerId);
                if (l.inspector === inspectorId && l.day === day && l.completed === isComplete) {
                    if (visible) {
                        l.show();
                    }
                    else {
                        l.hide();
                    }
                }
            });
        };
        MapController.prototype.ToggleLayersByDay = function (day, isComplete) {
            var m = this.map;
            m.graphicsLayerIds.forEach(function (layerId) {
                var l = m.getLayer(layerId);
                if (l.day === day && l.completed === isComplete) {
                    l.show();
                }
                else {
                    l.hide();
                }
            });
        };
        MapController.prototype.ClearLayers = function () {
            var m = this.map;
            if (!m.graphicsLayerIds)
                return;
            while (m.graphicsLayerIds.length > 0) {
                for (var _i = 0, _a = m.graphicsLayerIds; _i < _a.length; _i++) {
                    var glid = _a[_i];
                    m.removeLayer(m.getLayer(glid));
                }
            }
        };
        MapController.prototype.FindItemsInExtent = function (extent) {
            var mapController = this;
            var m = this.map;
            var lookupKeys = [];
            require([
                "esri/symbols/SimpleMarkerSymbol",
                "esri/symbols/SimpleLineSymbol",
                "esri/Color"
            ], function (SimpleMarkerSymbol, SimpleLineSymbol, Color) {
                m.graphicsLayerIds.forEach(function (layerId) {
                    var l = m.getLayer(layerId);
                    if (l.visible) {
                        for (var _i = 0, _a = l.graphics; _i < _a.length; _i++) {
                            var g = _a[_i];
                            if (extent.contains(g.geometry)) {
                                var fluxSymbol = new SimpleMarkerSymbol();
                                fluxSymbol.color = g.symbol.color;
                                fluxSymbol.size = g.symbol.size;
                                fluxSymbol.style = SimpleMarkerSymbol.STYLE_SQUARE;
                                fluxSymbol.outline = g.symbol.outline;
                                g.setSymbol(fluxSymbol);
                                lookupKeys.push(g.attributes.LookupKey);
                            }
                        }
                    }
                });
            });
            mapController.isDrawing = false;
            mapController.drawToolbar.deactivate();
            return lookupKeys;
        };
        MapController.prototype.CenterAndZoom = function (p) {
            var mapController = this;
            var m = this.map;
            require(["esri/geometry/Point"], function (Point) {
                var pt = new Point([p.Longitude, p.Latitude]);
                m.centerAndZoom(pt, 18);
            });
        };
        return MapController;
    }());
    IView.MapController = MapController;
})(IView || (IView = {}));
//# sourceMappingURL=map.js.map
var IView;
(function (IView) {
    var Location = /** @class */ (function () {
        function Location(inspections) {
            this.lookup_key = "";
            this.point_to_use = null;
            this.icons = [];
            this.valid_inspectors = [];
            this.inspections = [];
            this.all_inspections = [];
            this.has_commercial = false;
            this.has_residential = false;
            this.has_private_provider = false;
            this.can_be_bulk_assigned = true;
            this.assigned_inspectors = [];
            this.RBL = false;
            this.CBL = false;
            this.REL = false;
            this.CEL = false;
            this.RME = false;
            this.CME = false;
            this.RPL = false;
            this.CPL = false;
            this.Fire = false;
            this.inspections = inspections;
            if (inspections.length === 0)
                return;
            var i = inspections[0];
            this.lookup_key = i.LookupKey;
            this.point_to_use = i.PointToUse;
            this.UpdateFlags();
            this.CreateIcons();
            this.AddValidInspectors(IView.allInspectors);
        }
        Location.prototype.UpdateFlags = function () {
            // this will update the has_commercial, residential, and private provider flags.
            // they'll be set to false, then we just loop through them all and update them to true
            // if we find any      
            this.assigned_inspectors = [];
            for (var _i = 0, _a = this.inspections; _i < _a.length; _i++) {
                var i = _a[_i];
                if (!i.CanBeAssigned)
                    this.can_be_bulk_assigned = false;
                if (i.IsCommercial) {
                    this.has_commercial = true;
                }
                else {
                    this.has_residential = true;
                }
                if (i.IsPrivateProvider)
                    this.has_private_provider = true;
                // now we start collecting data on the assigned inspectors
                // we need to know what they have assigned in order to figure out
                // what their icon should be, and what color it should be.
                if (this.assigned_inspectors.indexOf(i.InspectorName) === -1) {
                    this.assigned_inspectors.push(i.InspectorName);
                    this[i.InspectorName] = { commercial: 0, residential: 0, hexcolor: i.Color };
                }
                if (i.IsCommercial) {
                    this[i.InspectorName].commercial += 1;
                }
                else {
                    this[i.InspectorName].residential += 1;
                }
                // let's check the inspector type flags now
                if (i.RBL)
                    this.RBL = true;
                if (i.CBL)
                    this.CBL = true;
                if (i.REL)
                    this.REL = true;
                if (i.CEL)
                    this.CEL = true;
                if (i.RME)
                    this.RME = true;
                if (i.CME)
                    this.CME = true;
                if (i.RPL)
                    this.RPL = true;
                if (i.CPL)
                    this.CPL = true;
                if (i.Fire)
                    this.Fire = true;
            }
        };
        Location.prototype.AddValidInspectors = function (inspectors) {
            // List the people who can perform all of these inspections
            // not all groups of inspections can be bulk assigned
            // ie: if there are 3 inspections, 1 fire and 1 building and 1 electrical
            // chances are we won't be able to bulk assign this group because no one person can do
            // all of those inspections.
            // What we need to do to calculate this at the point level is to 
            // iterate through every permit and count the types
            // here are the types that matter:
            //    permit type
            //    commercial
            //    residential
            //    private provider
            //    fire
            // Some people can have combinations, like Commercial / Electrical, and not others.
            if (!this.can_be_bulk_assigned)
                return;
            var current = this;
            this.valid_inspectors = inspectors.filter(function (i) {
                //console.log('location', current.lookup_key, current.Fire, i.Name, i.Fire, ((current.Fire === true && i.Fire === true) || current.Fire === false))
                //return ((current.Fire === true && i.Fire === true) || current.Fire === false);
                return ((current.RBL === i.RBL === true) || !current.RBL) &&
                    ((current.CBL === i.CBL === true) || !current.CBL) &&
                    ((current.REL === i.REL === true) || !current.REL) &&
                    ((current.CEL === i.CEL === true) || !current.CEL) &&
                    ((current.RME === i.RME === true) || !current.RME) &&
                    ((current.CME === i.CME === true) || !current.CME) &&
                    ((current.RPL === i.RPL === true) || !current.RPL) &&
                    ((current.CPL === i.CPL === true) || !current.CPL) &&
                    ((current.Fire === i.Fire === true) || !current.Fire);
            });
            if (this.valid_inspectors.length === 0)
                this.can_be_bulk_assigned = false;
        };
        Location.prototype.CreateIcons = function () {
            // this function is going to parse the inspections to figure out 
            // how to build the map icon objects.
            // if there are multiple inspectors assigned to this address,
            // we'll need to give each inspector their own icon with their
            // own color.  
            // commerical permits are given a square icon
            // residential permits are given a circle icon
            // If this address has both residential and commercial permits (usually an error)
            // then we'll give it a diamond icon.
            var x = 0;
            if (this.assigned_inspectors.length > 1)
                x = 1;
            var offsets = this.GetOffsets();
            var _loop_1 = function (i) {
                if (x > offsets.length)
                    return { value: void 0 };
                var icontype = "";
                if (this_1[i].commercial > 0 && this_1[i].residential > 0) {
                    icontype = "esriSMSDiamond";
                }
                else {
                    if (this_1[i].commercial > 0) {
                        icontype = "esriSMSSquare";
                    }
                    else {
                        icontype = "esriSMSCircle";
                    }
                }
                var icon = this_1.CreateIcon(icontype, this_1[i].hexcolor, offsets[x++]);
                var test = this_1;
                icon.then(function (j) {
                    test.icons.push(j);
                });
                //this.icons.push(icon);
            };
            var this_1 = this;
            for (var _i = 0, _a = this.assigned_inspectors; _i < _a.length; _i++) {
                var i = _a[_i];
                var state_1 = _loop_1(i);
                if (typeof state_1 === "object")
                    return state_1.value;
            }
        };
        Location.prototype.CreateIcon = function (icon, color, offset) {
            // this is our base function that we'll use to simplify our icon creation.
            var d = new dojo.Deferred();
            require(["esri/symbols/SimpleMarkerSymbol", "esri/Color"], function (SimpleMarkerSymbol, Color) {
                var s = new SimpleMarkerSymbol({
                    "color": Color.fromHex(color),
                    "size": 12,
                    "angle": 0,
                    "xoffset": offset[0],
                    "yoffset": offset[1],
                    "type": "esriSMS",
                    "style": icon,
                    "outline": { "color": [0, 0, 0, 255], "width": 1, "type": "esriSLS", "style": "esriSLSSolid" }
                });
                d.resolve(s);
            });
            return d;
        };
        Location.prototype.GetOffsets = function () {
            return [
                [0, 0],
                [-5, 5],
                [5, -5],
                [-5, -5],
                [5, 5],
                [-5, 0],
                [0, 5],
                [5, 0],
                [0, 5]
            ];
        };
        Location.CreateLocations = function (inspections) {
            var inspectionCount = inspections.length.toString();
            Utilities.Set_Text(document.getElementById("inspectionCount"), inspectionCount);
            var lookupKeys = [];
            IView.filteredLocations = [];
            for (var _i = 0, inspections_1 = inspections; _i < inspections_1.length; _i++) {
                var i = inspections_1[_i];
                if (lookupKeys.indexOf(i.LookupKey) === -1)
                    lookupKeys.push(i.LookupKey);
            }
            var _loop_2 = function (key) {
                var filtered = inspections.filter(function (k) { return k.LookupKey === key; });
                IView.filteredLocations.push(new Location(filtered));
            };
            for (var _a = 0, lookupKeys_1 = lookupKeys; _a < lookupKeys_1.length; _a++) {
                var key = lookupKeys_1[_a];
                _loop_2(key);
            }
            console.log('locations', IView.filteredLocations);
            console.log('inspectors > 1', IView.filteredLocations.filter(function (k) { return k.icons.length > 2; }));
            console.log('inspections > 2', IView.filteredLocations.filter(function (k) { return k.inspections.length > 2; }));
            console.log('mixed inspections', IView.filteredLocations.filter(function (k) { return k.has_commercial && k.has_residential; }));
            IView.dataLoaded = true;
            IView.BuildAndLoadInitialLayers();
        };
        Location.prototype.LocationView = function () {
            var container = document.createElement("div");
            var df = document.createDocumentFragment();
            df.appendChild(this.AddressView());
            df.appendChild(this.BulkAssignControl());
            df.appendChild(this.CreateInspectionTable());
            container.appendChild(df);
            return container;
        };
        Location.prototype.AddressView = function () {
            var i = this.inspections[0];
            var p = document.createElement("p");
            p.appendChild(document.createTextNode(i.StreetAddressCombined));
            p.appendChild(document.createTextNode(i.City + ', ' + i.Zip));
            return p;
        };
        Location.prototype.BulkAssignControl = function () {
            var container = document.createElement("div");
            container.appendChild;
            return container;
        };
        Location.prototype.CreateInspectionTable = function () {
            var table = document.createElement("table");
            table.classList.add("table");
            table.classList.add("is-fullwidth");
            table.appendChild(this.CreateInspectionTableHeading());
            var tbody = document.createElement("tbody");
            for (var _i = 0, _a = this.inspections; _i < _a.length; _i++) {
                var i = _a[_i];
                tbody.appendChild(this.CreateInspectionRow(i));
            }
            table.appendChild(tbody);
            return table;
        };
        Location.prototype.CreateInspectionTableHeading = function () {
            var thead = document.createElement("thead");
            var tr = document.createElement("tr");
            tr.appendChild(this.CreateTableCell(true, "Permit"));
            tr.appendChild(this.CreateTableCell(true, "Inspection Type"));
            tr.appendChild(this.CreateTableCell(true, "Kind"));
            tr.appendChild(this.CreateTableCell(true, "Private Provider"));
            tr.appendChild(this.CreateTableCell(true, "Status"));
            tr.appendChild(this.CreateTableCell(true, "Assigned"));
            thead.appendChild(tr);
            return thead;
        };
        Location.prototype.CreateTableCell = function (header, value, className) {
            if (className === void 0) { className = ""; }
            var td = document.createElement(header ? "th" : "td");
            if (className.length > 0)
                td.classList.add(className);
            td.appendChild(document.createTextNode(value));
            return td;
        };
        Location.prototype.CreateInspectionRow = function (inspection) {
            var tr = document.createElement("tr");
            tr.appendChild(this.CreateTableCell(false, inspection.PermitNo));
            tr.appendChild(this.CreateTableCell(false, inspection.InspectionCode + ' ' + inspection.InspectionDescription));
            tr.appendChild(this.CreateTableCell(false, inspection.IsCommercial ? "Commercial" : "Residential"));
            tr.appendChild(this.CreateTableCell(false, inspection.IsPrivateProvider ? "Yes" : "No"));
            tr.appendChild(this.CreateTableCell(false, inspection.IsCompleted ? "Completed" : "Incomplete"));
            tr.appendChild(this.CreateTableCell(false, inspection.InspectorName));
            return tr;
        };
        return Location;
    }());
    IView.Location = Location;
})(IView || (IView = {}));
//# sourceMappingURL=Location.js.map
var IView;
(function (IView) {
    var LocationHash // implements ILocationHash
     = /** @class */ (function () {
        function LocationHash(locationHash) {
            this.InspectionId = 0;
            var ha = locationHash.split("&");
            for (var i = 0; i < ha.length; i++) {
                var k = ha[i].split("=");
                switch (k[0].toLowerCase()) {
                    case "inspectionid":
                        this.InspectionId = parseInt(k[1]);
                        break;
                }
            }
        }
        LocationHash.prototype.ToHash = function () {
            var h = "";
            if (this.InspectionId > 0)
                h += "&inspectionid=" + this.InspectionId.toString();
            if (h.length > 0)
                h = "#" + h.substring(1);
            return h;
        };
        return LocationHash;
    }());
    IView.LocationHash = LocationHash;
})(IView || (IView = {}));
//# sourceMappingURL=LocationHash.js.map
/// <reference path="point.ts" />
/// <reference path="ui.ts" />
/// <reference path="app.ts" />
var IView;
(function (IView) {
    var Inspector = /** @class */ (function () {
        function Inspector() {
        }
        Inspector.GetAllInspectors = function () {
            Utilities.Toggle_Loading_Button("refreshButton", true);
            Utilities.Toggle_Loading_Button("filterButton", true);
            var path = Utilities.Get_Path("/inspectionview");
            Utilities.Get(path + "API/Inspectors/List")
                .then(function (inspectors) {
                console.log('inspectors', inspectors);
                IView.allInspectors = inspectors;
                IView.Inspection.GetInspections();
                IView.Unit.GetUnits();
                window.setInterval(IView.Inspection.GetInspections, 60 * 5 * 1000);
                window.setInterval(IView.Unit.GetUnits, 60 * 1000);
                Inspector.BuildInspectorList();
            }, function (e) {
                console.log('error getting inspectors');
                IView.allInspectors = [];
            });
        };
        Inspector.GetInspectorsToEdit = function () {
            var path = Utilities.Get_Path("/inspectionview");
            Utilities.Get(path + "API/Inspectors/Edit")
                .then(function (inspectors) {
                console.log('inspectors to edit', inspectors);
                IView.inspectors_to_edit = inspectors;
                if (inspectors.length > 0) {
                    Utilities.Show_Inline_Flex("editInspectors");
                }
            }, function (e) {
                console.log('error getting inspectors');
                IView.allInspectors = [];
            });
        };
        Inspector.BuildInspectorList = function () {
            var container = document.getElementById("inspectorList");
            Utilities.Clear_Element(container);
            container.appendChild(Inspector.AddInspector("All"));
            for (var _i = 0, _a = IView.allInspectors; _i < _a.length; _i++) {
                var i = _a[_i];
                container.appendChild(Inspector.AddInspector(i.Name));
            }
            IView.FilterInputEvents();
        };
        Inspector.AddInspector = function (name) {
            var df = document.createDocumentFragment();
            var label = document.createElement("label");
            label.classList.add("label");
            label.classList.add("checkbox");
            label.classList.add("is-medium");
            var input = document.createElement("input");
            input.type = "checkbox";
            input.classList.add("checkbox");
            input.classList.add("is-medium");
            input.name = "inspectorFilter";
            input.value = name;
            input.checked = name === "All";
            label.appendChild(input);
            label.appendChild(document.createTextNode(name));
            df.appendChild(label);
            //df.appendChild(document.createElement("br"));
            return df;
        };
        Inspector.BuildInspectorControl = function () {
        };
        return Inspector;
    }());
    IView.Inspector = Inspector;
})(IView || (IView = {}));
//# sourceMappingURL=Inspector.js.map
/// <reference path="point.ts" />
/// <reference path="ui.ts" />
/// <reference path="app.ts" />
var IView;
(function (IView) {
    var Inspection = /** @class */ (function () {
        function Inspection() {
            this.Age = -1;
            this.ValidInspectors = [];
        }
        Inspection.GetInspections = function () {
            Utilities.Toggle_Loading_Button("refreshButton", true);
            Utilities.Toggle_Loading_Button("filterButton", true);
            var path = Utilities.Get_Path("/inspectionview");
            Utilities.Get(path + "API/Inspections/GetInspections")
                .then(function (inspections) {
                IView.allInspections = inspections;
                Utilities.Toggle_Loading_Button("refreshButton", false);
                Utilities.Toggle_Loading_Button("filterButton", false);
                IView.Location.CreateLocations(IView.ApplyFilters(inspections));
                IView.Inspector.GetInspectorsToEdit();
            }, function (e) {
                console.log('error getting inspectors', e);
                IView.allInspectors = [];
                Utilities.Toggle_Loading_Button("refreshButton", false);
                Utilities.Toggle_Loading_Button("filterButton", false);
            });
            //var x = XHR.Get("API/Inspections/GetInspections");
            //return new Promise<Array<Inspection>>(function (resolve, reject)
            //{
            //  x.then(function (response)
            //  {
            //    let ar: Array<Inspection> = JSON.parse(response.Text);
            //    return resolve(ar);
            //  }).catch(function ()
            //  {
            //    console.log("error in Get Inspections");
            //    return reject(null);
            //  });
            //});
        };
        return Inspection;
    }());
    IView.Inspection = Inspection;
})(IView || (IView = {}));
//# sourceMappingURL=Inspection.js.map
/// <reference path="map.ts" />
/// <reference path="unit.ts" />
//import MapController from "./map";
var IView;
(function (IView) {
    IView.allInspections = []; // populated from web service
    IView.inspectors_to_edit = []; // only populated if the user has admin access.
    IView.allInspectors = []; // populated from web service
    IView.allUnits = [];
    IView.filteredLocations = [];
    //export let currentDay: string = "today";
    //export let currentIsComplete: boolean = false;
    IView.day_filter = "today";
    IView.inspection_status_filter = "open";
    IView.permit_kind_filter = "all";
    IView.permit_type_filter = [];
    IView.inspector_filter = [];
    IView.private_provider_only = false;
    IView.invalid_address_only = false;
    IView.permit_types_toggle_status = false;
    IView.inspector_toggle_status = false;
    IView.mapLoaded = false;
    IView.dataLoaded = false;
    function Start() {
        // things to do:
        // setup default map
        IView.mapController = new IView.MapController("map");
        // get the data for today/tomorrow
        IView.Inspector.GetAllInspectors();
    }
    IView.Start = Start;
    function ResetFilters() {
        // let's set the actual filter backing first.
        IView.day_filter = "today";
        IView.inspection_status_filter = "open";
        IView.permit_kind_filter = "all";
        IView.permit_type_filter = [];
        IView.inspector_filter = [];
        IView.private_provider_only = false;
        IView.invalid_address_only = false;
        document.querySelector("input[name='inspectionStatus'][value='open']").checked = true;
        document.querySelector("input[name='inspectionDay'][value='today']").checked = true;
        document.querySelector("input[name='commercialResidential'][value='all']").checked = true;
        document.getElementById("privateProviderFilter").checked = false;
        document.getElementById("invalidAddressFilter").checked = false;
        Toggle_Input_Group("input[name='inspectorFilter']", false);
        document.querySelector("input[name='inspectorFilter'][value='All']").checked = true;
        Toggle_Input_Group("input[name='permitType']", false);
        document.querySelector("input[name='permitType'][value='all']").checked = true;
        IView.Location.CreateLocations(ApplyFilters(IView.allInspections));
    }
    IView.ResetFilters = ResetFilters;
    function Toggle_Group(group) {
        if (group === "inspectors") {
            IView.inspector_toggle_status = !IView.inspector_toggle_status;
            Toggle_Input_Group("input[name='inspectorFilter']", IView.inspector_toggle_status);
        }
        else {
            IView.permit_types_toggle_status = !IView.permit_types_toggle_status;
            Toggle_Input_Group("input[name='permitType']", IView.permit_types_toggle_status);
        }
        IView.Location.CreateLocations(ApplyFilters(IView.allInspections));
    }
    IView.Toggle_Group = Toggle_Group;
    function Toggle_Input_Group(querystring, checked) {
        var inputs = document.querySelectorAll(querystring);
        for (var i = 0; i < inputs.length; i++) {
            inputs.item(i).checked = checked;
        }
    }
    function FilterInputEvents() {
        var inputs = document.querySelectorAll("#filters input");
        for (var i = 0; i < inputs.length; i++) {
            inputs.item(i).addEventListener("click", function (e) {
                IView.Location.CreateLocations(ApplyFilters(IView.allInspections));
            });
        }
    }
    IView.FilterInputEvents = FilterInputEvents;
    function UpdateFilters() {
        IView.inspection_status_filter = Get_Single_Filter('input[name="inspectionStatus"]:checked');
        IView.day_filter = Get_Single_Filter('input[name="inspectionDay"]:checked');
        IView.permit_kind_filter = Get_Single_Filter('input[name="commercialResidential"]:checked');
        IView.private_provider_only = document.getElementById("privateProviderFilter").checked;
        IView.invalid_address_only = document.getElementById("invalidAddressFilter").checked;
        IView.permit_type_filter = Get_Filters('input[name="permitType"]:checked');
        IView.inspector_filter = Get_Filters('input[name="inspectorFilter"]:checked');
    }
    function ApplyFilters(inspections) {
        UpdateFilters();
        // filter by status
        var filtered = inspections;
        if (IView.inspection_status_filter !== "all") {
            var is_completed_1 = IView.inspection_status_filter !== "open";
            filtered = IView.allInspections.filter(function (j) {
                return j.IsCompleted === is_completed_1;
            });
        }
        // filter by day
        if (IView.day_filter !== "all") {
            if (IView.day_filter !== "prior") {
                filtered = filtered.filter(function (j) { return j.ScheduledDay === IView.day_filter; });
            }
            else {
                filtered = filtered.filter(function (j) { return j.Age > 0; });
            }
        }
        // filter by kind
        if (IView.permit_kind_filter !== "all") {
            var is_commercial_1 = IView.permit_kind_filter === "commercial";
            filtered = filtered.filter(function (j) { return j.IsCommercial === is_commercial_1; });
        }
        // filter by permit type
        if (IView.permit_type_filter.indexOf("all") === -1) {
            filtered = filtered.filter(function (j) {
                return IView.permit_type_filter.indexOf(j.PermitNo.substr(0, 1)) !== -1;
            });
        }
        // filter by private provider
        if (IView.private_provider_only) {
            filtered = filtered.filter(function (j) { return j.IsPrivateProvider; });
        }
        // filter by invalid address
        if (IView.invalid_address_only) {
            filtered = filtered.filter(function (j) { return !j.AddressPoint.IsValid || !j.ParcelPoint.IsValid; });
        }
        // filter by inspector
        if (IView.inspector_filter.indexOf("All") === -1) {
            filtered = filtered.filter(function (j) {
                return IView.inspector_filter.indexOf(j.InspectorName) !== -1;
            });
        }
        return filtered;
    }
    IView.ApplyFilters = ApplyFilters;
    function Get_Single_Filter(selector) {
        return document.querySelector(selector).value;
    }
    function Get_Filters(selector) {
        var inputs = document.querySelectorAll(selector);
        var values = [];
        for (var i = 0; i < inputs.length; i++) {
            values.push(inputs.item(i).value);
        }
        return values;
    }
    function HandleHash() {
        var hash = location.hash;
        var currentHash = new IView.LocationHash(location.hash.substring(1));
        if (currentHash.InspectionId > 0) {
            var i_1 = IView.allInspections.filter(function (j) { return j.InspReqID === currentHash.InspectionId; });
            if (i_1.length > 0) {
                console.log('inspection based on passed id', i_1, 'inspection point to use', i_1[0].PointToUse);
                IView.mapController.CenterAndZoom(i_1[0].PointToUse);
                var ii = IView.allInspections.filter(function (j) { return j.PointToUse.Latitude === i_1[0].PointToUse.Latitude; });
                console.log('all points', ii);
            }
        }
    }
    IView.HandleHash = HandleHash;
    function mapLoadCompleted() {
        IView.mapLoaded = true;
        console.log("map load completed");
        BuildAndLoadInitialLayers();
    }
    IView.mapLoadCompleted = mapLoadCompleted;
    function BuildAndLoadInitialLayers() {
        if (!IView.mapLoaded || !IView.dataLoaded)
            return;
        window.onhashchange = HandleHash;
        HandleHash();
        IView.mapController.UpdateLocationLayer(IView.filteredLocations);
        //mapController.ClearLayers();
        //let days = ["Today", "Tomorrow"];
        //if (currentDay === "") currentDay = days[0];
        //for (let d of days)
        //{
        //  let inspections = allInspections.filter(
        //    function (k)
        //    {
        //      return k.ScheduledDay === d && !k.IsCompleted;
        //    }); // todays incompleted inspections
        //  let inspectors = buildInspectorData(inspections);
        //  mapController.ApplyLayers(
        //    mapController.CreateLayers(inspectors, d, false) // , days[0] === currentDay
        //  );
        //  inspections = allInspections.filter(
        //    function (k)
        //    {
        //      return k.ScheduledDay === d;
        //    }); // todays incompleted inspections
        //  //inspectors = buildInspectorData(inspections);
        //  mapController.ApplyLayers(
        //    mapController.CreateLayers(inspectors, d, true) // , days[0] === currentDay
        //  );
        //}
        //mapController.ToggleLayersByDay(currentDay, currentIsComplete);
        //BuildLegend();
    }
    IView.BuildAndLoadInitialLayers = BuildAndLoadInitialLayers;
    //function BuildLegend(): void
    //{
    //  console.log("exiting build legend call early");
    //  return;
    //  let legend = <HTMLElement>document.getElementById("LegendInspectorList");
    //  clearElement(legend);
    //  let inspections = allInspections.filter(
    //    function (k)
    //    {
    //      if (currentIsComplete)
    //      {
    //        return k.ScheduledDay === currentDay;
    //      }
    //      else
    //      {
    //        return k.ScheduledDay === currentDay && k.IsCompleted === false;
    //      }
    //    });
    //  let inspectors = buildInspectorData(inspections);    
    //  let ol = document.createElement("ol");
    //  inspectors.forEach(function (i)
    //  {
    //    let li = document.createElement("li");
    //    li.id = "inspector" + i.Id;
    //    li.style.backgroundColor = i.Color;      
    //    li.style.display = "flex";
    //    li.style.justifyContent = "space-between";
    //    li.onclick = () => OnInspectorClick(i);
    //    let inspectorName = document.createElement("span");
    //    inspectorName.appendChild(document.createTextNode(i.Name));
    //    inspectorName.style.textAlign = "left";
    //    inspectorName.style.marginLeft = "1em";
    //    let count = document.createElement("span");
    //    count.appendChild(document.createTextNode(i.Inspections.length.toString()));
    //    count.style.textAlign = "right";
    //    count.style.marginRight = "1em";      
    //    li.appendChild(inspectorName);
    //    li.appendChild(count);
    //    ol.appendChild(li);
    //  });
    //  legend.appendChild(ol);
    //}
    //function OnInspectorClick(i: Inspector)
    //{
    //  //let x = document.querySelector("ul.nav li.active").id.toLowerCase().split("-");
    //  //currentIsComplete = (x[x.length - 1] === "incomplete" ? false : true);
    //  let e = document.getElementById("inspector" + i.Id);
    //  if (e.classList.contains("strike"))
    //  {
    //    e.classList.remove("strike"); // it's already hidden, let's show it
    //    mapController.ToggleLayers(i.Id, currentDay, currentIsComplete, true);
    //  }
    //  else
    //  {
    //    e.classList.add("strike"); // let's add a strikethrough
    //    mapController.ToggleLayers(i.Id, currentDay, currentIsComplete, false);
    //  }
    //}
    //export function DrawToggle():void
    //{
    //  let select: HTMLSelectElement = <HTMLSelectElement>document.getElementById("BulkAssignSelect");
    //  let button: HTMLButtonElement = <HTMLButtonElement>document.getElementById("BulkAssignButton");
    //  let o = select.selectedOptions[0];
    //  if (!button.disabled)
    //  {
    //    button.textContent = "Bulk Assigning to: " + o.label;
    //  }
    //  else
    //  {
    //    button.textContent = "Bulk Assign";
    //  }
    //  mapController.ToggleDraw();
    //}
    //export function toggle(id: string, show: boolean): void
    //{
    //  document.getElementById(id).style.display = show ? "inline-block" : "none";
    //}
    //export function GetAllInspections(): void
    //{
    //  toggle('showSpin', true);
    //  let button = (<HTMLButtonElement>document.getElementById("refreshButton"));
    //  button.disabled = true;
    //  console.log('GetallInspections');
    //  Inspection.GetInspections()
    //    .then(
    //    function (inspections: Array<Inspection>): void
    //    {
    //      console.log('inspections', inspections);
    //      allInspections = inspections;
    //      Location.GetAllLocations(inspections);
    //      dataLoaded = true;
    //      BuildAndLoadInitialLayers();
    //       update the counts
    //      UpdateCounts(currentDay);
    //      toggle('showSpin', false);
    //      button.disabled = false;
    //    }, function (): void
    //    {
    //      console.log('error getting All inspections');
    //      allInspections = [];
    //      toggle('showSpin', false);
    //      button.disabled = false;
    //    });
    //}
    //function UpdateCounts(day: string)
    //{    
    //  let i = allInspections.filter(function (k) { return k.ScheduledDay === day }); // our total
    //  let total = i.length;
    //  i = i.filter(function (k) { return !k.IsCompleted }); // let's weed out the ones that are completed.'
    //  let current = i.length;
    //  let e = (<HTMLElement>document.getElementById("OpenInspectionsNav"));// update our totals.
    //  clearElement(e);
    //  let count = "Open Inspections: " + current + " of " + total;
    //  e.appendChild(document.createTextNode(count));
    //}
    //function UpdateInspectors(): void
    //{
    //  Inspector.GetAllInspectors().then(function (inspectors: Array<Inspector>)
    //  {
    //    allInspectors = inspectors;
    //    //BuildBulkInspectorSelect();
    //    GetAllInspections();
    //    window.setInterval(GetAllInspections, 60 * 5 * 1000);
    //  }, function ()
    //    {
    //      console.log('error getting inspectors');
    //      // do something with the error here
    //      allInspectors = [];
    //    });
    //}
    //function BuildBulkInspectorSelect():void
    //{
    //  let select:HTMLSelectElement = <HTMLSelectElement>document.getElementById("BulkAssignSelect");
    //  for (let i of allInspectors)
    //  {
    //    let o = document.createElement("option");
    //    o.value = i.Id.toString();
    //    o.text = i.Name;
    //    select.options.add(o);
    //  }
    //}
    //export function BulkAssignChange()
    //{
    //  let select: HTMLSelectElement = <HTMLSelectElement>document.getElementById("BulkAssignSelect");
    //  let button: HTMLButtonElement = <HTMLButtonElement>document.getElementById("BulkAssignButton");
    //  let o = select.selectedOptions[0];
    //  button.disabled = (o.value === "");
    //  //if (!button.disabled)
    //  //{
    //  //  let inspector: Inspector = allInspectors.filter(function (i) { return i.Id.toString() === o.value; })[0];
    //  //  let lookupKeys: Array<string> = [];
    //  //  lookupKeys = GetInvalidInspections(inspector);
    //  //  mapController.MarkItemsToIndicateNoMatch(lookupKeys);
    //  //}
    //  button.textContent = "Bulk Assign";
    //  mapController.ToggleDraw(false);
    //}
    //function GetInvalidInspections(inspector: Inspector): Array<string>
    //{
    //  // this function returns a list of the lookupkeys that the selected
    //  // inspector doesn't have the necessary licenses to inspect.
    //  let lookupKeys: Array<string> = [];
    //  for (let i of allInspections)
    //  {
    //    if (i.IsPrivateProvider && !inspector.PrivateProvider)
    //    {
    //      if (lookupKeys.indexOf(i.LookupKey) === -1) lookupKeys.push(i.LookupKey);
    //    } else
    //    {
    //      if (
    //        i.CBL && !inspector.CBL || 
    //        i.CEL && !inspector.CEL ||
    //        i.CME && !inspector.CME ||
    //        i.CPL && !inspector.CPL ||
    //        i.RBL && !inspector.RBL ||
    //        i.REL && !inspector.REL ||
    //        i.RME && !inspector.RME ||
    //        i.RPL && !inspector.RPL ||
    //        i.Fire && !inspector.Fire)
    //      {
    //        if (i.LookupKey === '2821-BOLTON-ORANGE PARK32073')
    //        {
    //          console.log('found');
    //        }
    //        if(lookupKeys.indexOf(i.LookupKey) === -1) lookupKeys.push(i.LookupKey);
    //      }
    //    }
    //  }
    //  console.log('invalid lookupkeys', lookupKeys);
    //  if (lookupKeys.indexOf('2821-BOLTON-ORANGE PARK32073') != -1)
    //  {
    //    console.log('found in array');
    //  }
    //  return lookupKeys;
    //}
    function buildInspectorData(inspections) {
        var iData = IView.allInspectors.map(function (i) {
            var x = new IView.Inspector();
            x.Id = i.Id;
            x.Name = i.Name;
            x.Inspections = inspections.filter(function (v) {
                return v.InspectorName === x.Name;
            });
            if (x.Inspections.length > 0) {
                x.Color = x.Inspections[0].Color;
            }
            else {
                x.Color = '#FFFFFF';
            }
            return x;
        });
        iData = iData.filter(function (v) { return v.Inspections.length > 0; });
        return iData;
    }
    function buildAddressDisplayByDay(i, day) {
        var x = [];
        x.push("<li><span>");
        x.push(day);
        x.push(" - Total Inspections: ");
        x.push(i.length);
        x.push("</span></li>");
        i.map(function (n) {
            x.push("<li><a target='clayinspections' href='/InspectionScheduler/#permit=");
            x.push(n.PermitNo);
            x.push("&inspectionid=");
            x.push(n.InspReqID);
            x.push("'>");
            x.push(n.PermitNo);
            x.push(" - ");
            x.push(n.InspectionDescription);
            x.push(" - ");
            x.push(n.IsCommercial ? "Commercial" : "Residential");
            x.push(" - ");
            x.push(n.IsPrivateProvider ? "Private Provider" : "Not Private");
            x.push("</a></li>");
        });
        return x.join('');
    }
    //export function Assign(e: HTMLElement, InspectorId:number)
    //{
    //  let LookupKey = e.id;
    //  let lk: Array<string> = [LookupKey];
    //  BulkAssign(InspectorId, lk);
    //}
    function buildInspectorAssign(assignedTo, lookupKey) {
        var x = [];
        x.push("<li style='margin-bottom: .5em;'><span>Assigned to:</span>");
        x.push("<select id='");
        x.push(lookupKey);
        x.push("' onchange='IView.Assign(this, this.value);'>");
        IView.allInspectors.forEach(function (i) {
            x.push("<option value='");
            x.push(i.Id);
            if (i.Name === assignedTo) {
                x.push("' selected>");
            }
            else {
                x.push("'>");
            }
            x.push(i.Name);
            x.push("</option>");
        });
        x.push("</select></li>");
        return x.join('');
    }
    //export function mapAddressClick(graphic):string
    //{
    //  let inspections:Array<Inspection> = allInspections.filter(function (k: Inspection)
    //  {
    //    return k.LookupKey === graphic.attributes.LookupKey;
    //  });
    //  let today = inspections.filter(function (k) { return k.ScheduledDay === "Today" });
    //  let tomorrow = inspections.filter(function (k) { return k.ScheduledDay !== "Today" });
    //  var x = [];
    //  x.push("<ol>");
    //  let InspectorName: string = currentDay === "Today" ? today[0].InspectorName : tomorrow[0].InspectorName;
    //  let isCompletedCheck: boolean = currentDay === "Today" ? today[0].IsCompleted : tomorrow[0].IsCompleted;
    //  console.log('Inspector Name', InspectorName, 'completedcheck', isCompletedCheck, inspections[0].CanBeAssigned);
    //  if (!isCompletedCheck && inspections[0].CanBeAssigned)
    //  {
    //    x.push(buildInspectorAssign(InspectorName, graphic.attributes.LookupKey));
    //  }
    //  else
    //  {
    //    if (isCompletedCheck)
    //    {
    //      x.push("<li>This inspection is already completed.</li>");
    //    }
    //  }
    //  x.push(buildAddressDisplayByDay(today, "Today"));
    //  x.push(buildAddressDisplayByDay(tomorrow, "Tomorrow"));
    //  x.push("</ol>");
    //  return x.join('');
    //}
    function ShowFilters() {
        document.getElementById("filters").classList.add("is-active");
    }
    IView.ShowFilters = ShowFilters;
    function ShowInspectors() {
        document.getElementById("inspectorEdit").classList.add("is-active");
    }
    IView.ShowInspectors = ShowInspectors;
    function CloseModals() {
        //Location.CreateLocations(IView.ApplyFilters(IView.allInspections));
        var modals = document.querySelectorAll(".modal");
        if (modals.length > 0) {
            for (var i = 0; i < modals.length; i++) {
                var modal = modals.item(i);
                modal.classList.remove("is-active");
            }
        }
    }
    IView.CloseModals = CloseModals;
    //export function ChangeDay()
    //{
    //  var ddl = <HTMLSelectElement>document.getElementById("selectDay");
    //  switch (ddl.value)
    //  {
    //    case "today-open":
    //      toggleNavDisplay('Today', false);
    //      break;
    //    case "today-all":
    //      toggleNavDisplay('Today', true);
    //      break;
    //    case "tomorrow-open":
    //      toggleNavDisplay('Tomorrow', false);
    //      break;
    //    case "tomorrow-all":
    //      toggleNavDisplay('Tomorrow', true);
    //      break;
    //  }
    //}
    //export function toggleNavDisplay(key:string, isCompleted:boolean):void
    //{
    //  currentIsComplete = isCompleted;
    //  currentDay = key;
    //  mapController.ToggleLayersByDay(key, isCompleted);
    //  BuildLegend();
    //  UpdateCounts(key);
    //}
    //export function clearElement(node: HTMLElement): void
    //{ // this function just emptys an element of all its child nodes.
    //  while (node.firstChild)
    //  {
    //    node.removeChild(node.firstChild);
    //  }
    //}
    //export function FindItemsInExtent(extent: any): void
    //{
    //  let LookupKeys: Array<string> = mapController.FindItemsInExtent(extent);
    //  let InspectorId: number = parseInt((<HTMLSelectElement>document.getElementById("BulkAssignSelect")).value);
    //  BulkAssign(InspectorId, LookupKeys);
    //}
    //function BulkAssign(InspectorId: number, LookupKeys: Array<string>)
    //{
    //  let InspectionIds: Array<number> = [];
    //  for (let i of allInspections)
    //  {
    //    if (LookupKeys.indexOf(i.LookupKey) !== -1 &&
    //      i.ScheduledDay === currentDay)
    //    {
    //      if (currentIsComplete || (!currentIsComplete && !i.IsCompleted))
    //      {
    //        InspectionIds.push(i.InspReqID);
    //      }
    //    }
    //  }
    //  //let i = new Inspection();
    //  Inspection.BulkAssign(InspectorId, InspectionIds);
    //}
})(IView || (IView = {}));
//# sourceMappingURL=app.js.map