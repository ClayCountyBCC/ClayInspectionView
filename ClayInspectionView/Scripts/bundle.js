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
                IView.allUnits = units;
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
                "esri/dijit/HomeButton",
                //"esri/dijit/Legend",
                "dojo/_base/array",
                "dojo/parser",
                "esri/Color",
                "dijit/layout/BorderContainer",
                "esri/toolbars/draw",
                "dojo/domReady!"
            ], function (Map, ArcGISDynamicMapServiceLayer, GraphicsLayer, HomeButton, 
            //Legend,
            arrayUtils, Parser, Color, BorderContainer, Draw) {
                var defaultExtent = new esri.geometry.Extent(-82.31395416259558, 29.752280075700344, -81.28604583740163, 30.14732756963145, new esri.SpatialReference({ wkid: 4326 }));
                var mapOptions = {
                    basemap: "osm",
                    zoom: 11,
                    logo: false,
                    //center: [-81.80, 29.950]
                    extent: defaultExtent
                    //showInfoWindowOnClick: false
                };
                mapController.map = new Map(mapDiv, mapOptions);
                // default size is 250wide by 100 high
                mapController.map.on("load", function (evt) {
                    mapController.drawToolbar = new Draw(evt.map, { showTooltips: false });
                    mapController.drawToolbar.on("DrawEnd", IView.FindItemsInExtent);
                    console.log('map loaded');
                    IView.mapLoadCompleted();
                });
                var dynamicLayerOptions = {
                    opacity: .3
                };
                var home = new HomeButton({
                    map: mapController.map,
                    extent: defaultExtent
                }, "HomeButton");
                home.startup();
                var BuildingLayer = new ArcGISDynamicMapServiceLayer("https://maps.claycountygov.com:6443/arcgis/rest/services/Building/MapServer", dynamicLayerOptions);
                IView.location_layer = new GraphicsLayer();
                IView.location_layer.id = "locations";
                IView.location_layer.on("click", function (event) {
                    if (event === undefined)
                        return;
                    if (!event.graphic || !event.graphic.attributes)
                        return;
                    //console.log('graphics layer clicked - event', event); 
                    IView.last_symbol_color = event.graphic.symbol.color;
                    IView.last_selected_graphic = event.graphic;
                    event.graphic.symbol.color = new Color([255, 0, 0, 1]);
                    IView.location_layer.redraw();
                    MapController.GetLocation(event.graphic.attributes.LookupKey);
                });
                IView.unit_layer = new GraphicsLayer();
                IView.unit_layer.id = "units";
                mapController.map.addLayers([BuildingLayer, IView.location_layer, IView.unit_layer]);
            });
        }
        MapController.GetLocation = function (lookup_key) {
            var location = IView.filteredLocations.filter(function (j) { return j.lookup_key === lookup_key; });
            if (location.length === 0)
                return;
            IView.current_location = location[0];
            console.log('location found', location[0]);
            IView.mapController.CenterOnPoint(location[0].point_to_use);
            location[0].LocationView();
        };
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
                for (var _i = 0, locations_1 = locations; _i < locations_1.length; _i++) {
                    var l = locations_1[_i];
                    var p = l.point_to_use;
                    var pin = new arcgisPoint([p.Longitude, p.Latitude], new SpatialReference({ wkid: 4326 }));
                    var wmPin = webMercatorUtils.geographicToWebMercator(pin);
                    //var iT = new InfoTemplate();
                    //iT.setTitle('Inspections: ' + l.inspections.length.toString());
                    //iT.setContent(function (graphic:any)
                    //{
                    //  let value = l.LocationView().outerHTML;
                    //  console.log('html info template', value);
                    //  return value;
                    //});
                    //var g = new Graphic(wmPin, l.icons[0]);
                    //g.setInfoTemplate(iT);
                    //IView.location_layer.add(g);
                    //if (l.icons.length > 1)
                    //{
                    for (var i = 0; i < l.icons.length; i++) {
                        var g = new Graphic(wmPin, l.icons[i]);
                        g.setAttributes({
                            "LookupKey": l.lookup_key
                        });
                        //g.setInfoTemplate(iT);
                        //g.addEventListener("click", function (e)
                        //{
                        //  IView.mapController.CenterAndZoom(p);
                        //});
                        IView.location_layer.add(g);
                    }
                    //}
                    if (l.inspections.length > 1) {
                        var textSymbol = new TextSymbol(l.inspections.length.toString()); //esri.symbol.TextSymbol(data.Records[i].UnitName);
                        textSymbol.setColor(new dojo.Color([0, 100, 0]));
                        textSymbol.setOffset(0, -20);
                        textSymbol.setAlign(TextSymbol.ALIGN_MIDDLE);
                        var font = new esri.symbol.Font();
                        font.setSize("10pt");
                        font.setWeight(esri.symbol.Font.WEIGHT_BOLD);
                        textSymbol.setFont(font);
                        var graphicText = new Graphic(wmPin, textSymbol);
                        IView.location_layer.add(graphicText);
                    }
                    //g.setInfoTemplate(iT);
                }
                IView.location_layer.show();
            });
        };
        //public CreateLayers(inspectorData: Array<Inspector>, day: string, completed: boolean): Array<any>
        //{
        //  if (inspectorData.length === 0) return [];
        //  var layers: Array<any>;
        //  require([
        //    "esri/layers/GraphicsLayer",
        //    "esri/geometry/Point",
        //    "esri/symbols/SimpleMarkerSymbol",
        //    "esri/graphic",
        //    "esri/SpatialReference",
        //    "esri/Color",
        //    "esri/InfoTemplate",
        //    "esri/geometry/webMercatorUtils"],
        //    function (
        //      GraphicsLayer,
        //      arcgisPoint,
        //      SimpleMarkerSymbol,
        //      Graphic,
        //      SpatialReference,
        //      Color,
        //      InfoTemplate,
        //      webMercatorUtils)
        //    {
        //      layers = inspectorData.map(
        //        function (i: Inspector)
        //        {
        //          var l = new GraphicsLayer();
        //          l.id = i.Name + '-' + day + '-' + completed;
        //          l.inspector = i.Id;
        //          l.completed = completed;
        //          l.day = day;
        //          l.color = i.Color;
        //          l.numberInspections = i.Inspections.length;
        //          var c = Color.fromHex(i.Color);
        //          // ak is now a list of unique lookup keys for this user.
        //          var ak = i.Inspections.map(function (n) { return n.LookupKey });
        //          ak = ak.filter(function (v, i) { return ak.indexOf(v) == i });
        //          ak.forEach(function (n: string) //loop through each unique lookupkey
        //          {
        //            var inspections: Array<Inspection> = i.Inspections.filter(function (v)
        //            {
        //              return v.LookupKey == n;
        //            });
        //            // Need to get total number o                
        //            let p: Point = inspections[0].PointToUse;
        //            var compactAddress = inspections[0].StreetAddressCombined + '<br/> ' +
        //              inspections[0].City + ', ' + inspections[0].Zip;
        //            if (!p.IsValid)
        //            {
        //              console.log('Invalid data', n, i);
        //            }
        //            if (p.IsValid)
        //            {
        //              var iT = new InfoTemplate();
        //              iT.setTitle('Address: ${CompactAddress}');
        //              //iT.setContent(IView.mapAddressClick);
        //              var s = new SimpleMarkerSymbol({
        //                "color": c,
        //                "size": 12, // + inspections.length * 3
        //                "angle": 0,
        //                "xoffset": 0,
        //                "yoffset": -5,
        //                "type": "esriSMS",
        //                "style": "esriSMSCircle",
        //                "outline": { "color": [0, 0, 0, 255], "width": 1, "type": "esriSLS", "style": "esriSLSSolid" }
        //              });
        //              var inspection = new arcgisPoint([p.Longitude, p.Latitude], new SpatialReference({ wkid: 4326 }));
        //              var wmInspection = webMercatorUtils.geographicToWebMercator(inspection); 
        //              var g = new Graphic(wmInspection, s);
        //              g.setAttributes({                    
        //                "CompactAddress": compactAddress,
        //                "LookupKey": n
        //              });
        //              g.setInfoTemplate(iT);
        //              l.add(g);
        //            }
        //          });
        //          //l.visible = isVisible;
        //          return l;
        //        });
        //    });
        //  return layers;
        //}
        //public ApplyLayers(layers: Array<any>)
        //{
        //  var mapController = this;
        //  this.map.addLayers(layers);      
        //}
        //public ToggleLayers(inspectorId: number, day: string, isComplete:boolean, visible: boolean)
        //{
        //  let m = this.map;
        //  this.map.graphicsLayerIds.forEach(function (layerId)
        //  {
        //    let l = m.getLayer(layerId);
        //    if (l.inspector === inspectorId && l.day === day && l.completed === isComplete)
        //    {
        //      if (visible)
        //      {
        //        l.show();
        //      }
        //      else
        //      {
        //        l.hide();
        //      }
        //    }
        //  });
        //}
        //public ToggleLayersByDay(day: string, isComplete:boolean):void
        //{
        //  let m = this.map;
        //  m.graphicsLayerIds.forEach(function (layerId)
        //  {
        //    let l = m.getLayer(layerId);
        //    if (l.day === day && l.completed === isComplete)
        //    {
        //      l.show();
        //    }
        //    else
        //    {
        //      l.hide();
        //    }
        //  });
        //}
        //public ClearLayers()
        //{
        //  let m = this.map;
        //  if (!m.graphicsLayerIds) return;
        //  while (m.graphicsLayerIds.length > 0)
        //  {
        //    for (let glid of m.graphicsLayerIds)
        //    {
        //      m.removeLayer(m.getLayer(glid));
        //    }
        //  }
        //}
        MapController.prototype.FindItemsInExtent = function (extent) {
            var mapController = this;
            var m = this.map;
            var lookupKeys = [];
            require([
                "esri/symbols/SimpleMarkerSymbol",
                "esri/symbols/SimpleLineSymbol",
                "esri/Color"
            ], function (SimpleMarkerSymbol, SimpleLineSymbol, Color) {
                //m.graphicsLayerIds.forEach(function (layerId)
                //{
                //let l = m.getLayer(layerId);
                //if (l.visible)
                //{
                for (var _i = 0, _a = IView.location_layer.graphics; _i < _a.length; _i++) {
                    var g = _a[_i];
                    if (extent.contains(g.geometry) && g.attributes && g.attributes.LookupKey) {
                        var fluxSymbol = new SimpleMarkerSymbol();
                        fluxSymbol.color = g.symbol.color;
                        fluxSymbol.size = g.symbol.size;
                        fluxSymbol.style = SimpleMarkerSymbol.STYLE_CROSS;
                        fluxSymbol.outline = g.symbol.outline;
                        g.setSymbol(fluxSymbol);
                        if (lookupKeys.indexOf(g.attributes.LookupKey) === -1)
                            lookupKeys.push(g.attributes.LookupKey);
                    }
                }
                //}
                //});
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
        MapController.prototype.CenterOnPoint = function (p) {
            var mapController = this;
            var m = this.map;
            require(["esri/geometry/Point"], function (Point) {
                var pt = new Point([p.Longitude, p.Latitude]);
                m.centerAt(pt);
            });
        };
        MapController.prototype.GetCurrentZoom = function () {
            var m = document.getElementById("map");
            var zoom = m.getAttribute("data-zoom");
            return parseInt(zoom);
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
            if (!this.can_be_bulk_assigned) {
                console.log('this cannot be bulk assigned');
                return;
            }
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
            var offsets = this.GetOffsets();
            if (this.assigned_inspectors.length > 1) {
                //let t = this;
                //let bigicon = this.CreateIcon("esriSMSCircle", "#333333", offsets[x++], 20);
                //bigicon.then(function (j)
                //{
                //  t.icons.push(j);
                //});
                x = 1;
            }
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
        Location.prototype.CreateIcon = function (icon, color, offset, size) {
            if (size === void 0) { size = 12; }
            // this is our base function that we'll use to simplify our icon creation.
            var d = new dojo.Deferred();
            require(["esri/symbols/SimpleMarkerSymbol", "esri/Color"], function (SimpleMarkerSymbol, Color) {
                var s = new SimpleMarkerSymbol({
                    "color": Color.fromHex(color),
                    "size": size,
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
                [-4, 0],
                [4, 0],
                [0, -4],
                [0, 4],
                [-4, 4],
                [4, -4],
                [-4, -4],
                [4, 4]
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
            IView.dataLoaded = true;
            IView.BuildAndLoadInitialLayers();
        };
        Location.prototype.LocationView = function () {
            var title = document.getElementById("locationAddress");
            Utilities.Clear_Element(title);
            Utilities.Set_Text(title, this.Address());
            var bulkassignContainer = document.getElementById("bulkAssignInspectionsContainer");
            if (this.can_be_bulk_assigned) {
                Utilities.Show(bulkassignContainer);
                this.UpdateBulkAssignmentDropdown();
            }
            else {
                Utilities.Hide(bulkassignContainer);
            }
            var container = document.getElementById("locationInfoContainer");
            Utilities.Clear_Element(container);
            container.appendChild(this.CreateInspectionTable());
            document.getElementById("locationInfo").classList.add("is-active");
        };
        Location.prototype.Address = function () {
            var i = this.inspections[0];
            return i.StreetAddressCombined + ', ' + i.City + ', ' + i.Zip;
        };
        Location.prototype.CreateInspectionTable = function () {
            var table = document.createElement("table");
            table.classList.add("table");
            table.classList.add("is-fullwidth");
            table.appendChild(this.CreateInspectionTableHeading());
            var tbody = document.createElement("tbody");
            var master_permit = null;
            for (var _i = 0, _a = this.inspections; _i < _a.length; _i++) {
                var i = _a[_i];
                if (master_permit === null || master_permit !== i.MasterPermitNumber) {
                    // if it's null, we just started so we're going to build whatever is there.
                    tbody.appendChild(this.BuildMasterPermitPropUseRow(i));
                    master_permit = i.MasterPermitNumber;
                }
                var notes_row = null;
                if (i.PermitNo.substr(0, 1) !== '1') {
                    notes_row = document.createElement("tr");
                }
                tbody.appendChild(this.CreateInspectionRow(i, notes_row));
                if (notes_row !== null)
                    tbody.appendChild(notes_row);
            }
            table.appendChild(tbody);
            return table;
        };
        Location.prototype.BuildMasterPermitPropUseRow = function (inspection) {
            var tr = document.createElement("tr");
            if (inspection.MasterPermitNumber.length > 0) {
                var href = "/InspectionScheduler/#permit=" + inspection.MasterPermitNumber;
                tr.appendChild(this.CreateTableCellLink(inspection.MasterPermitNumber, href, "has-text-left"));
                var td = document.createElement("td");
                td.colSpan = 7;
                td.classList.add("has-text-left");
                td.appendChild(document.createTextNode(inspection.PropUseInfo));
                tr.appendChild(td);
            }
            else {
                tr.appendChild(document.createElement("td"));
                var td = document.createElement("td");
                td.colSpan = 7;
                td.classList.add("has-text-left");
                td.appendChild(document.createTextNode("NO MASTER PERMIT"));
                tr.appendChild(td);
            }
            return tr;
        };
        Location.prototype.CreateInspectionTableHeading = function () {
            var thead = document.createElement("thead");
            var tr = document.createElement("tr");
            tr.appendChild(this.CreateTableCell(true, "Permit"));
            tr.appendChild(this.CreateTableCell(true, "Scheduled"));
            tr.appendChild(this.CreateTableCell(true, "Inspection Type"));
            var button_column = this.CreateTableCell(true, "");
            button_column.style.width = "5%";
            tr.appendChild(button_column);
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
        Location.prototype.CreateTableCellLink = function (value, href, className) {
            if (className === void 0) { className = ""; }
            var td = document.createElement("td");
            if (className.length > 0)
                td.classList.add(className);
            var link = document.createElement("a");
            link.target = "_blank";
            link.href = href;
            link.appendChild(document.createTextNode(value));
            td.appendChild(link);
            return td;
        };
        Location.prototype.CreateInspectionRow = function (inspection, notes_row) {
            var tr = document.createElement("tr");
            var href = "/InspectionScheduler/#permit=" + inspection.PermitNo + "&inspectionid=" + inspection.InspReqID;
            tr.appendChild(this.CreateTableCellLink(inspection.PermitNo, href, "has-text-right"));
            tr.appendChild(this.CreateTableCell(false, Utilities.Format_Date(inspection.ScheduledDate)));
            tr.appendChild(this.CreateTableCell(false, inspection.InspectionCode + ' ' + inspection.InspectionDescription, "has-text-left"));
            var button_td = document.createElement("td");
            if (inspection.PermitNo.substr(0, 1) !== '1') {
                var notes_button_1 = document.createElement("button");
                notes_button_1.type = "button";
                notes_button_1.classList.add("button");
                notes_button_1.classList.add("is-info");
                notes_button_1.classList.add("is-small");
                notes_button_1.appendChild(document.createTextNode("Notes"));
                notes_button_1.onclick = function () {
                    if (notes_row.childElementCount === 0) {
                        // we haven't rendered anything yet
                        var base_td = document.createElement("td");
                        base_td.colSpan = 8;
                        IView.Inspection.GetPermitNotes(inspection.PermitNo, notes_button_1, base_td);
                        //base_td.appendChild(document.createTextNode("Test"));
                        notes_row.appendChild(base_td);
                    }
                    else {
                        notes_row.style.display = notes_row.style.display === "" ? "none" : "";
                        //console.log('notes_row display', notes_row.style.display);
                        //if (notes_row.style.display === "")
                        //{
                        //  notes_row.style.display = "none";
                        //}
                        //else
                        //{
                        //  notes_row.style.display = "table-row";
                        //}
                        return;
                    }
                };
                button_td.appendChild(notes_button_1);
            }
            tr.appendChild(button_td);
            tr.appendChild(this.CreateTableCell(false, inspection.IsCommercial ? "Commercial" : "Residential"));
            tr.appendChild(this.CreateTableCell(false, inspection.IsPrivateProvider ? "Yes" : "No"));
            tr.appendChild(this.CreateTableCell(false, inspection.IsCompleted ? "Completed" : "Incomplete"));
            if (inspection.IsCompleted) {
                tr.appendChild(this.CreateTableCell(false, inspection.InspectorName));
            }
            else {
                var td = document.createElement("td");
                td.appendChild(this.CreateInspectorDropdown(inspection));
                tr.appendChild(td);
            }
            return tr;
        };
        Location.prototype.CreateInspectorDropdown = function (inspection) {
            var control = document.createElement("div");
            control.classList.add("control");
            var container = document.createElement("div");
            container.classList.add("select");
            var select = document.createElement("select");
            for (var _i = 0, _a = inspection.ValidInspectors; _i < _a.length; _i++) {
                var i = _a[_i];
                var o = document.createElement("option");
                o.value = i.Name;
                o.selected = (i.Name === inspection.InspectorName);
                o.appendChild(document.createTextNode(i.Name));
                select.appendChild(o);
            }
            select.onchange = function (event) {
                var inspectors = IView.allInspectors.filter(function (i) { return i.Name === Utilities.Get_Value(event.srcElement); });
                var parent = event.srcElement.parentElement;
                if (inspectors.length === 1) {
                    var id = inspectors[0].Id;
                    var inspectionIds = [inspection.InspReqID];
                    IView.Inspection.BulkAssign(id, inspectionIds, parent);
                }
            };
            container.appendChild(select);
            control.appendChild(container);
            return control;
        };
        Location.prototype.UpdateBulkAssignmentDropdown = function () {
            var select = document.getElementById("bulkAssignInspections");
            Utilities.Clear_Element(select);
            var base = document.createElement("option");
            base.value = "";
            base.selected = true;
            base.appendChild(document.createTextNode("Select Inspector"));
            select.appendChild(base);
            for (var _i = 0, _a = this.valid_inspectors; _i < _a.length; _i++) {
                var i = _a[_i];
                var o = document.createElement("option");
                o.value = i.Name;
                o.selected = false;
                o.appendChild(document.createTextNode(i.Name));
                select.appendChild(o);
            }
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
/// <refrence path="point.ts" />
/// <reference path="ui.ts" />
/// <reference path="app.ts" />
var IView;
(function (IView) {
    var Inspector = /** @class */ (function () {
        function Inspector() {
            this.Id = -1;
            this.Active = false;
            this.Intl = "";
            this.Name = "";
            this.Color = "";
            this.Vehicle = "";
            this.RBL = false;
            this.CBL = false;
            this.REL = false;
            this.CEL = false;
            this.RME = false;
            this.CME = false;
            this.RPL = false;
            this.CPL = false;
            this.Fire = false;
            this.PrivateProvider = false;
            this.CurrentCount = 0;
        }
        Inspector.GetAllInspectors = function () {
            Utilities.Toggle_Loading_Button("refreshButton", true);
            Utilities.Toggle_Loading_Button("filterButton", true);
            var path = Utilities.Get_Path("/inspectionview");
            Utilities.Get(path + "API/Inspectors/List")
                .then(function (inspectors) {
                var initialRun = IView.allInspectors.length === 0;
                console.log('inspectors', inspectors);
                IView.allInspectors = inspectors;
                Inspector.BuildBulkAssignDropdown(inspectors);
                IView.Inspection.GetInspections();
                if (initialRun) {
                    Inspector.BuildInspectorList();
                    IView.LoadDefaultsFromCookie();
                    window.setInterval(IView.Inspection.GetInspections, 60 * 5 * 1000);
                    window.setInterval(IView.Unit.GetUnits, 60 * 1000);
                    Inspector.GetInspectorsToEdit();
                }
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
                    Utilities.Show_Flex("editInspectors");
                    Inspector.BuildInspectorControl(inspectors);
                }
            }, function (e) {
                console.log('error getting inspectors to edit');
            });
        };
        Inspector.BuildBulkAssignDropdown = function (inspectors) {
            var select = document.getElementById("bulkAssignSelect");
            Utilities.Clear_Element(select);
            var base = document.createElement("option");
            base.value = "-1";
            base.selected = true;
            base.appendChild(document.createTextNode("Select Inspector"));
            select.appendChild(base);
            for (var _i = 0, inspectors_1 = inspectors; _i < inspectors_1.length; _i++) {
                var i = inspectors_1[_i];
                var o = document.createElement("option");
                o.value = i.Id.toString();
                o.appendChild(document.createTextNode(i.Name));
                select.appendChild(o);
            }
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
        Inspector.BuildInspectorControl = function (inspectors) {
            var tbody = document.getElementById("inspectorControlList");
            Utilities.Clear_Element(tbody);
            for (var _i = 0, inspectors_2 = inspectors; _i < inspectors_2.length; _i++) {
                var i = inspectors_2[_i];
                if (i.Id !== 0)
                    tbody.appendChild(Inspector.BuildInspectorRow(i));
            }
        };
        Inspector.AddNewInspector = function (inspector) {
            var tbody = document.getElementById("inspectorControlList");
            if (inspector.Id !== 0)
                tbody.appendChild(Inspector.BuildInspectorRow(inspector));
        };
        Inspector.BuildInspectorRow = function (inspector) {
            var id = inspector.Id.toString();
            var tr = document.createElement("tr");
            tr.appendChild(Inspector.CreateInputTableCell(id, "name", inspector.Name));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "active", inspector.Active));
            tr.appendChild(Inspector.CreateTableCell(inspector.Intl));
            tr.appendChild(Inspector.CreateTableCell(inspector.Color));
            tr.appendChild(Inspector.CreateInputTableCell(id, "vehicle", inspector.Vehicle));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "c_b", inspector.CBL));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "c_e", inspector.CEL));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "c_p", inspector.CPL));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "c_m", inspector.CME));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "r_b", inspector.RBL));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "r_e", inspector.REL));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "r_p", inspector.RPL));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "r_m", inspector.RME));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "fire", inspector.Fire));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "private", inspector.PrivateProvider));
            tr.appendChild(Inspector.CreateSaveButtonTableCell(id));
            return tr;
        };
        Inspector.CreateTableCell = function (value) {
            var td = document.createElement("td");
            td.appendChild(document.createTextNode(value));
            return td;
        };
        Inspector.CreateSaveButtonTableCell = function (id) {
            var td = document.createElement("td");
            var control = document.createElement("div");
            control.classList.add("control");
            var button = document.createElement("button");
            button.classList.add("button");
            button.classList.add("is-success");
            button.type = "button";
            button.onclick = function () {
                Utilities.Toggle_Loading_Button(button, true);
                var i = new Inspector();
                i.LoadFromForm(id);
                i.Update(button);
            };
            button.appendChild(document.createTextNode("Save"));
            control.appendChild(button);
            td.appendChild(control);
            return td;
        };
        Inspector.CreateAddButtonTableCell = function (id, tr) {
            var td = document.createElement("td");
            var control = document.createElement("div");
            control.classList.add("control");
            var button = document.createElement("button");
            button.classList.add("button");
            button.classList.add("is-success");
            button.type = "button";
            button.onclick = function () {
                Utilities.Toggle_Loading_Button(button, true);
                var i = new Inspector();
                i.LoadFromForm(id, true);
                if (!i.ValidateInspector())
                    return;
                i.Insert(button, tr);
            };
            button.appendChild(document.createTextNode("Add"));
            control.appendChild(button);
            td.appendChild(control);
            return td;
        };
        Inspector.prototype.ValidateInspector = function () {
            if (this.Name.length === 0) {
                alert("Cannot add new inspector, missing Name.");
                return false;
            }
            if (this.Intl.length === 0) {
                alert("Cannot add new inspector, missing Initials.");
                return false;
            }
            var current = this;
            var initialtest = IView.inspectors_to_edit.filter(function (k) { return k.Intl.toLowerCase() === current.Intl.toLowerCase(); });
            if (initialtest.length > 0) {
                alert("Cannot add new inspector, Initials must be unique.");
                return false;
            }
            if (this.Color.length === 0) {
                alert("Cannot add new inspector, missing Color.  You can use the color assigned to an inactive inspector.");
                return false;
            }
            return true;
        };
        Inspector.CreateInputTableCell = function (id, name, value, max_length) {
            if (max_length === void 0) { max_length = null; }
            var td = document.createElement("td");
            var control = document.createElement("div");
            control.classList.add("control");
            var input = document.createElement("input");
            input.id = id + "_" + name;
            input.type = "text";
            if (max_length !== null)
                input.maxLength = max_length;
            input.classList.add("input");
            input.value = value;
            control.appendChild(input);
            td.appendChild(control);
            return td;
        };
        Inspector.CreateCheckBoxTableCell = function (id, name, checked) {
            var td = document.createElement("td");
            var control = document.createElement("div");
            control.classList.add("control");
            control.classList.add("has-text-centered");
            var input = document.createElement("input");
            input.id = id + "_" + name;
            input.type = "checkbox";
            input.classList.add("checkbox");
            input.checked = checked;
            control.appendChild(input);
            td.appendChild(control);
            return td;
        };
        Inspector.UpdateCurrentCount = function (inspectors, inspections) {
            var byinspector = [];
            var _loop_1 = function (inspector) {
                inspector.CurrentCount = 0;
                byinspector = inspections.filter(function (i) { return i.InspectorName === inspector.Name; });
                inspector.CurrentCount = byinspector.length;
            };
            for (var _i = 0, inspectors_3 = inspectors; _i < inspectors_3.length; _i++) {
                var inspector = inspectors_3[_i];
                _loop_1(inspector);
            }
        };
        Inspector.prototype.LoadFromForm = function (id, all) {
            if (all === void 0) { all = false; }
            this.Id = parseInt(id);
            this.Active = document.getElementById(id + "_active").checked;
            this.Name = Utilities.Get_Value(id + "_name").trim();
            this.Intl = all ? Utilities.Get_Value(id + "_initial").trim() : "";
            this.Color = all ? Utilities.Get_Value(id + "_color").trim() : "";
            this.Vehicle = Utilities.Get_Value(id + "_vehicle").trim();
            this.CBL = document.getElementById(id + "_c_b").checked;
            this.CEL = document.getElementById(id + "_c_e").checked;
            this.CPL = document.getElementById(id + "_c_p").checked;
            this.CME = document.getElementById(id + "_c_m").checked;
            this.RBL = document.getElementById(id + "_r_b").checked;
            this.REL = document.getElementById(id + "_r_e").checked;
            this.RPL = document.getElementById(id + "_r_p").checked;
            this.RME = document.getElementById(id + "_r_m").checked;
            this.Fire = document.getElementById(id + "_fire").checked;
            this.PrivateProvider = document.getElementById(id + "_private").checked;
        };
        Inspector.prototype.Update = function (button) {
            var path = Utilities.Get_Path("/inspectionview");
            Utilities.Post(path + "API/Inspectors/Update/", this)
                .then(function (inspectors) {
                if (inspectors.length === 0) {
                    alert("There was a problem saving your changes.  Please refresh the application and try again.  If this issue persists, please put in a help desk ticket.");
                    return;
                }
                Utilities.Set_Text("inspectorUpdateMessage", "Changes have been made, please refresh this application to see them.");
                IView.allInspectors = inspectors;
                Utilities.Toggle_Loading_Button(button, false);
            }, function (e) {
                console.log('error in Bulk Assign', e);
                Utilities.Toggle_Loading_Button(button, false);
            });
        };
        Inspector.prototype.Insert = function (button, tr) {
            var path = Utilities.Get_Path("/inspectionview");
            Utilities.Post(path + "API/Inspectors/Insert/", this)
                .then(function (inspector) {
                if (inspector === null) {
                    alert("There was a problem saving your changes.  Please refresh the application and try again.  If this issue persists, please put in a help desk ticket.");
                    return;
                }
                Inspector.AddNewInspector(inspector);
                tr.parentElement.removeChild(tr);
                Utilities.Toggle_Loading_Button(button, false);
                Utilities.Set_Text("inspectorUpdateMessage", "Changes have been made, please refresh this application to see them.");
            }, function (e) {
                console.log('error in Bulk Assign', e);
                Utilities.Toggle_Loading_Button(button, false);
            });
        };
        Inspector.AddInspectorToEdit = function () {
            var tbody = document.getElementById("inspectorControlList");
            var id = Inspector.GetNewInspectorId();
            var tr = document.createElement("tr");
            tr.appendChild(Inspector.CreateInputTableCell(id, "name", "", 50));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "active", false));
            tr.appendChild(Inspector.CreateInputTableCell(id, "initial", "", 3));
            tr.appendChild(Inspector.CreateInputTableCell(id, "color", "", 7));
            tr.appendChild(Inspector.CreateInputTableCell(id, "vehicle", "", 10));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "c_b", false));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "c_e", false));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "c_p", false));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "c_m", false));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "r_b", false));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "r_e", false));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "r_p", false));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "r_m", false));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "fire", false));
            tr.appendChild(Inspector.CreateCheckBoxTableCell(id, "private", false));
            tr.appendChild(Inspector.CreateAddButtonTableCell(id, tr));
            tbody.appendChild(tr);
        };
        Inspector.GetNewInspectorId = function () {
            for (var i = 10000; i < 11000; i++) {
                if (!document.getElementById(i.toString() + "_name"))
                    return i.toString();
            }
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
            this.MasterPermitNumber = "";
            this.PropUseInfo = "";
            this.Age = -1;
            this.ValidInspectors = [];
        }
        Inspection.GetValidInspectors = function (inspection) {
            return IView.allInspectors.filter(function (i) {
                return ((inspection.RBL === i.RBL === true) || !inspection.RBL) &&
                    ((inspection.CBL === i.CBL === true) || !inspection.CBL) &&
                    ((inspection.REL === i.REL === true) || !inspection.REL) &&
                    ((inspection.CEL === i.CEL === true) || !inspection.CEL) &&
                    ((inspection.RME === i.RME === true) || !inspection.RME) &&
                    ((inspection.CME === i.CME === true) || !inspection.CME) &&
                    ((inspection.RPL === i.RPL === true) || !inspection.RPL) &&
                    ((inspection.CPL === i.CPL === true) || !inspection.CPL) &&
                    ((inspection.Fire === i.Fire === true) || !inspection.Fire);
            });
        };
        Inspection.GetInspections = function () {
            Utilities.Toggle_Loading_Button("refreshButton", true);
            Utilities.Toggle_Loading_Button("filterButton", true);
            var path = Utilities.Get_Path("/inspectionview");
            Utilities.Get(path + "API/Inspections/GetInspections")
                .then(function (inspections) {
                Inspection.HandleInspections(inspections);
                Utilities.Toggle_Loading_Button("refreshButton", false);
                Utilities.Toggle_Loading_Button("filterButton", false);
            }, function (e) {
                console.log('error getting inspectors', e);
                IView.allInspectors = [];
                Utilities.Toggle_Loading_Button("refreshButton", false);
                Utilities.Toggle_Loading_Button("filterButton", false);
            });
        };
        Inspection.GetPermitNotes = function (PermitNo, button, target) {
            if (PermitNo.length === 0)
                return;
            Utilities.Toggle_Loading_Button(button, true);
            var path = Utilities.Get_Path("/inspectionview");
            Utilities.Get(path + "API/Inspections/GetPermitNotes?PermitNo=" + PermitNo)
                .then(function (notes) {
                if (notes.length > 0) {
                    for (var _i = 0, notes_1 = notes; _i < notes_1.length; _i++) {
                        var n = notes_1[_i];
                        var p = document.createElement("p");
                        p.classList.add("has-text-left");
                        p.appendChild(document.createTextNode(IView.Strip_Html(n)));
                        target.appendChild(p);
                    }
                }
                else {
                    var p = document.createElement("p");
                    p.classList.add("has-text-left");
                    p.appendChild(document.createTextNode("No notes found."));
                    target.appendChild(p);
                }
                Utilities.Toggle_Loading_Button(button, false);
            }, function (e) {
                console.log('error getting permit notes', e);
                Utilities.Toggle_Loading_Button(button, false);
            });
        };
        Inspection.HandleInspections = function (inspections) {
            for (var _i = 0, inspections_1 = inspections; _i < inspections_1.length; _i++) {
                var i = inspections_1[_i];
                i.ValidInspectors = Inspection.GetValidInspectors(i);
            }
            IView.allInspections = inspections;
            IView.Location.CreateLocations(IView.ApplyFilters(inspections));
            if (IView.current_location !== null) {
                var locations = IView.filteredLocations.filter(function (i) { return i.lookup_key === IView.current_location.lookup_key; });
                if (locations.length === 1) {
                    IView.current_location = locations[0];
                    IView.current_location.LocationView();
                }
            }
        };
        Inspection.BulkAssign = function (InspectorId, InspectionIds, parentElement) {
            if (parentElement === void 0) { parentElement = undefined; }
            if (InspectionIds.length === 0)
                return;
            if (parentElement)
                parentElement.classList.add("is-loading");
            var button = document.getElementById("bulkAssignButton");
            Utilities.Toggle_Loading_Button(button, true);
            var path = Utilities.Get_Path("/inspectionview");
            //IView.toggle('showSpin', true);
            var AssignData = {
                InspectorId: InspectorId,
                InspectionIds: InspectionIds
            };
            Utilities.Post(path + "API/Assign/BulkAssign/", AssignData)
                .then(function (inspections) {
                Utilities.Toggle_Loading_Button(button, false);
                if (inspections.length === 0) {
                    alert("Server error in Bulk Assign.");
                    return;
                }
                Inspection.HandleInspections(inspections);
                if (parentElement)
                    parentElement.classList.remove("is-loading");
            }, function (e) {
                console.log('error in Bulk Assign', e);
                Utilities.Toggle_Loading_Button(button, false);
                if (parentElement)
                    parentElement.classList.remove("is-loading");
            });
            //new Promise<boolean>(function (resolve, reject)
            //{
            //  x.then(function (response)
            //  {
            //    IView.GetAllInspections();
            //    IView.toggle('showSpin', false);
            //    button.textContent = "Bulk Assign";
            //  }).catch(function ()
            //  {
            //    console.log("error in Bulk Assign Inspections");
            //    IView.toggle('showSpin', false);
            //    button.textContent = "Bulk Assign";
            //  });
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
    IView.current_location = null;
    IView.day_filter = "today";
    IView.inspection_status_filter = "open";
    IView.permit_kind_filter = "all";
    IView.permit_type_filter = [];
    IView.inspector_filter = [];
    IView.private_provider_only = false;
    IView.invalid_address_only = false;
    IView.show_bulk_assign = true;
    IView.permit_types_toggle_status = false;
    IView.inspector_toggle_status = false;
    IView.mapLoaded = false;
    IView.dataLoaded = false;
    function Start() {
        // things to do:
        // setup default map
        IView.mapController = new IView.MapController("map");
        IView.Inspector.GetAllInspectors();
    }
    IView.Start = Start;
    function LoadDefaultsFromCookie() {
        var status = GetMapCookie("inspection_status_filter");
        var day = GetMapCookie("day_filter");
        var kind = GetMapCookie("permit_kind_filter");
        var private = GetMapCookie("private_provider_only");
        var invalid = GetMapCookie("invalid_address_only");
        var permittype = GetMapCookie("permit_type_filter");
        var inspector = GetMapCookie("inspector_filter");
        var bulk = GetMapCookie("show_bulk_assign");
        if (status === null)
            return;
        if (status !== null)
            IView.inspection_status_filter = status;
        if (day !== null)
            IView.day_filter = day;
        if (kind !== null)
            IView.permit_kind_filter = kind;
        if (private !== null)
            IView.private_provider_only = (private.toLowerCase() === "true");
        if (invalid !== null)
            IView.invalid_address_only = (invalid.toLowerCase() === "true");
        if (permittype !== null)
            IView.permit_type_filter = permittype.split(",");
        if (inspector !== null)
            IView.inspector_filter = inspector.split(",");
        if (bulk !== null)
            IView.show_bulk_assign = (bulk.toLowerCase() === "true");
        // load defaults into form
        if (IView.show_bulk_assign) {
            Utilities.Show("BulkAssignContainer");
        }
        else {
            Utilities.Hide("BulkAssignContainer");
        }
        document.querySelector("input[name='inspectionStatus'][value='" + IView.inspection_status_filter + "']").checked = true;
        document.querySelector("input[name='inspectionDay'][value='" + IView.day_filter + "']").checked = true;
        document.querySelector("input[name='commercialResidential'][value='" + IView.permit_kind_filter + "']").checked = true;
        document.getElementById("privateProviderFilter").checked = IView.private_provider_only;
        document.getElementById("invalidAddressFilter").checked = IView.invalid_address_only;
        Toggle_Input_Group("input[name='inspectorFilter']", false);
        for (var _i = 0, _a = IView.inspector_filter; _i < _a.length; _i++) {
            var i = _a[_i];
            document.querySelector("input[name='inspectorFilter'][value='" + i + "']").checked = true;
        }
        Toggle_Input_Group("input[name='permitType']", false);
        for (var _b = 0, _c = IView.permit_type_filter; _b < _c.length; _b++) {
            var p = _c[_b];
            document.querySelector("input[name='permitType'][value='" + p + "']").checked = true;
        }
    }
    IView.LoadDefaultsFromCookie = LoadDefaultsFromCookie;
    function SaveCookie() {
        UpdateFilters();
        SetMapCookie("inspection_status_filter", IView.inspection_status_filter);
        SetMapCookie("day_filter", IView.day_filter);
        SetMapCookie("permit_kind_filter", IView.permit_kind_filter);
        SetMapCookie("private_provider_only", IView.private_provider_only.toString());
        SetMapCookie("invalid_address_only", IView.invalid_address_only.toString());
        SetMapCookie("permit_type_filter", IView.permit_type_filter.join(","));
        SetMapCookie("inspector_filter", IView.inspector_filter.join(","));
        SetMapCookie("show_bulk_assign", IView.show_bulk_assign.toString());
    }
    IView.SaveCookie = SaveCookie;
    function GetMapCookie(name) {
        var value = "; " + document.cookie;
        var parts = value.split("; " + "inspectionview_" + name + "=");
        if (parts.length == 2) {
            return parts.pop().split(";").shift();
        }
        return null;
    }
    function SetMapCookie(name, value) {
        var expirationYear = new Date().getFullYear() + 1;
        var expirationDate = new Date();
        expirationDate.setFullYear(expirationYear);
        var cookie = "inspectionview_" + name + "=" + value + "; expires=" + expirationDate.toUTCString() + "; path=" + Utilities.Get_Path("/inspectionview");
        document.cookie = cookie;
    }
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
    function Toggle_Bulk_Assign() {
        IView.show_bulk_assign = !IView.show_bulk_assign;
        if (IView.show_bulk_assign) {
            Utilities.Show("BulkAssignContainer");
        }
        else {
            Utilities.Hide("BulkAssignContainer");
        }
    }
    IView.Toggle_Bulk_Assign = Toggle_Bulk_Assign;
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
        IView.Inspector.UpdateCurrentCount(IView.allInspectors, filtered);
        UpdateLegend(IView.allInspectors.filter(function (j) { return j.CurrentCount > 0; }));
        return filtered;
    }
    IView.ApplyFilters = ApplyFilters;
    function UpdateLegend(inspectors) {
        var ol = document.getElementById("InspectorList");
        Utilities.Clear_Element(ol);
        for (var _i = 0, inspectors_1 = inspectors; _i < inspectors_1.length; _i++) {
            var i = inspectors_1[_i];
            var li = document.createElement("li");
            li.style.color = i.Id === 0 ? "black" : "white";
            //li.id = "inspector" + i.Id;
            li.style.paddingLeft = "1em";
            li.style.paddingRight = "1em";
            li.style.backgroundColor = i.Color;
            li.style.display = "flex";
            li.style.justifyContent = "space-between";
            var inspectorName = document.createElement("span");
            inspectorName.appendChild(document.createTextNode(i.Name));
            inspectorName.style.textAlign = "left";
            var count = document.createElement("span");
            count.appendChild(document.createTextNode(i.CurrentCount.toString()));
            count.style.textAlign = "right";
            li.appendChild(inspectorName);
            li.appendChild(count);
            ol.appendChild(li);
        }
    }
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
        IView.Unit.GetUnits();
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
    function DrawToggle() {
        var select = document.getElementById("bulkAssignSelect");
        var button = document.getElementById("bulkAssignButton");
        var selectedInspector = Utilities.Get_Value(select);
        if (selectedInspector === "-1") {
            Utilities.Error_Show("bulkAssignError", "Please choose an inspector.", true);
            return;
        }
        IView.mapController.ToggleDraw();
    }
    IView.DrawToggle = DrawToggle;
    function ShowFilters() {
        document.getElementById("filters").classList.add("is-active");
    }
    IView.ShowFilters = ShowFilters;
    function ShowInspectors() {
        document.getElementById("inspectorEdit").classList.add("is-active");
    }
    IView.ShowInspectors = ShowInspectors;
    function CloseLocationModal() {
        IView.current_location = null;
        var symbol = IView.last_selected_graphic.symbol;
        var color = IView.last_symbol_color;
        window.setTimeout(function (j) {
            symbol.color = color;
            IView.location_layer.redraw();
        }, 10000);
        CloseModals();
    }
    IView.CloseLocationModal = CloseLocationModal;
    function CloseModals() {
        var modals = document.querySelectorAll(".modal");
        if (modals.length > 0) {
            for (var i = 0; i < modals.length; i++) {
                var modal = modals.item(i);
                modal.classList.remove("is-active");
            }
        }
    }
    IView.CloseModals = CloseModals;
    function Bulk_Assign_Location(event) {
        if (IView.current_location === null)
            return;
        var selectedInspector = Utilities.Get_Value(event.srcElement);
        if (selectedInspector.length === 0)
            return;
        var inspectors = IView.allInspectors.filter(function (i) { return i.Name === selectedInspector; });
        var parent = event.srcElement.parentElement;
        if (inspectors.length === 1) {
            var id = inspectors[0].Id;
            var inspectionIds = IView.current_location.inspections.map(function (i) { return i.InspReqID; });
            IView.Inspection.BulkAssign(id, inspectionIds, parent);
        }
    }
    IView.Bulk_Assign_Location = Bulk_Assign_Location;
    function Strip_Html(html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    }
    IView.Strip_Html = Strip_Html;
    function FindItemsInExtent(extent) {
        var LookupKeys = IView.mapController.FindItemsInExtent(extent);
        var InspectorId = parseInt(document.getElementById("bulkAssignSelect").value);
        BulkAssign(InspectorId, LookupKeys);
    }
    IView.FindItemsInExtent = FindItemsInExtent;
    function BulkAssign(InspectorId, LookupKeys) {
        var InspectionIds = [];
        for (var _i = 0, allInspections_1 = IView.allInspections; _i < allInspections_1.length; _i++) {
            var i = allInspections_1[_i];
            if (LookupKeys.indexOf(i.LookupKey) !== -1) {
                InspectionIds.push(i.InspReqID);
            }
        }
        //let i = new Inspection();
        IView.Inspection.BulkAssign(InspectorId, InspectionIds);
    }
})(IView || (IView = {}));
//# sourceMappingURL=app.js.map