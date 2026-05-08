"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/tsup/assets/cjs_shims.js
var getImportMetaUrl, importMetaUrl;
var init_cjs_shims = __esm({
  "node_modules/tsup/assets/cjs_shims.js"() {
    "use strict";
    getImportMetaUrl = () => typeof document === "undefined" ? new URL(`file:${__filename}`).href : document.currentScript && document.currentScript.tagName.toUpperCase() === "SCRIPT" ? document.currentScript.src : new URL("main.js", document.baseURI).href;
    importMetaUrl = /* @__PURE__ */ getImportMetaUrl();
  }
});

// node_modules/ultron/index.js
var require_ultron = __commonJS({
  "node_modules/ultron/index.js"(exports2, module2) {
    "use strict";
    init_cjs_shims();
    var has = Object.prototype.hasOwnProperty;
    var id = 0;
    function Ultron(ee) {
      if (!(this instanceof Ultron)) return new Ultron(ee);
      this.id = id++;
      this.ee = ee;
    }
    Ultron.prototype.on = function on(event, fn, context) {
      fn.__ultron = this.id;
      this.ee.on(event, fn, context);
      return this;
    };
    Ultron.prototype.once = function once(event, fn, context) {
      fn.__ultron = this.id;
      this.ee.once(event, fn, context);
      return this;
    };
    Ultron.prototype.remove = function remove() {
      var args = arguments, ee = this.ee, event;
      if (args.length === 1 && "string" === typeof args[0]) {
        args = args[0].split(/[, ]+/);
      } else if (!args.length) {
        if (ee.eventNames) {
          args = ee.eventNames();
        } else if (ee._events) {
          args = [];
          for (event in ee._events) {
            if (has.call(ee._events, event)) args.push(event);
          }
          if (Object.getOwnPropertySymbols) {
            args = args.concat(Object.getOwnPropertySymbols(ee._events));
          }
        }
      }
      for (var i = 0; i < args.length; i++) {
        var listeners = ee.listeners(args[i]);
        for (var j = 0; j < listeners.length; j++) {
          event = listeners[j];
          if (event.listener) {
            if (event.listener.__ultron !== this.id) continue;
          } else if (event.__ultron !== this.id) {
            continue;
          }
          ee.removeListener(args[i], event);
        }
      }
      return this;
    };
    Ultron.prototype.destroy = function destroy() {
      if (!this.ee) return false;
      this.remove();
      this.ee = null;
      return true;
    };
    module2.exports = Ultron;
  }
});

// node_modules/ws/node_modules/safe-buffer/index.js
var require_safe_buffer = __commonJS({
  "node_modules/ws/node_modules/safe-buffer/index.js"(exports2, module2) {
    "use strict";
    init_cjs_shims();
    var buffer = require("buffer");
    var Buffer3 = buffer.Buffer;
    function copyProps(src, dst) {
      for (var key in src) {
        dst[key] = src[key];
      }
    }
    if (Buffer3.from && Buffer3.alloc && Buffer3.allocUnsafe && Buffer3.allocUnsafeSlow) {
      module2.exports = buffer;
    } else {
      copyProps(buffer, exports2);
      exports2.Buffer = SafeBuffer;
    }
    function SafeBuffer(arg, encodingOrOffset, length) {
      return Buffer3(arg, encodingOrOffset, length);
    }
    copyProps(Buffer3, SafeBuffer);
    SafeBuffer.from = function(arg, encodingOrOffset, length) {
      if (typeof arg === "number") {
        throw new TypeError("Argument must not be a number");
      }
      return Buffer3(arg, encodingOrOffset, length);
    };
    SafeBuffer.alloc = function(size, fill, encoding) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      var buf = Buffer3(size);
      if (fill !== void 0) {
        if (typeof encoding === "string") {
          buf.fill(fill, encoding);
        } else {
          buf.fill(fill);
        }
      } else {
        buf.fill(0);
      }
      return buf;
    };
    SafeBuffer.allocUnsafe = function(size) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      return Buffer3(size);
    };
    SafeBuffer.allocUnsafeSlow = function(size) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      return buffer.SlowBuffer(size);
    };
  }
});

// node_modules/async-limiter/index.js
var require_async_limiter = __commonJS({
  "node_modules/async-limiter/index.js"(exports2, module2) {
    "use strict";
    init_cjs_shims();
    function Queue(options) {
      if (!(this instanceof Queue)) {
        return new Queue(options);
      }
      options = options || {};
      this.concurrency = options.concurrency || Infinity;
      this.pending = 0;
      this.jobs = [];
      this.cbs = [];
      this._done = done.bind(this);
    }
    var arrayAddMethods = [
      "push",
      "unshift",
      "splice"
    ];
    arrayAddMethods.forEach(function(method) {
      Queue.prototype[method] = function() {
        var methodResult = Array.prototype[method].apply(this.jobs, arguments);
        this._run();
        return methodResult;
      };
    });
    Object.defineProperty(Queue.prototype, "length", {
      get: function() {
        return this.pending + this.jobs.length;
      }
    });
    Queue.prototype._run = function() {
      if (this.pending === this.concurrency) {
        return;
      }
      if (this.jobs.length) {
        var job = this.jobs.shift();
        this.pending++;
        job(this._done);
        this._run();
      }
      if (this.pending === 0) {
        while (this.cbs.length !== 0) {
          var cb = this.cbs.pop();
          process.nextTick(cb);
        }
      }
    };
    Queue.prototype.onDone = function(cb) {
      if (typeof cb === "function") {
        this.cbs.push(cb);
        this._run();
      }
    };
    function done() {
      this.pending--;
      this._run();
    }
    module2.exports = Queue;
  }
});

// node_modules/ws/lib/BufferUtil.js
var require_BufferUtil = __commonJS({
  "node_modules/ws/lib/BufferUtil.js"(exports2, module2) {
    "use strict";
    init_cjs_shims();
    var safeBuffer = require_safe_buffer();
    var Buffer3 = safeBuffer.Buffer;
    var concat = (list, totalLength) => {
      const target = Buffer3.allocUnsafe(totalLength);
      var offset = 0;
      for (var i = 0; i < list.length; i++) {
        const buf = list[i];
        buf.copy(target, offset);
        offset += buf.length;
      }
      return target;
    };
    try {
      const bufferUtil = require("bufferutil");
      module2.exports = Object.assign({ concat }, bufferUtil.BufferUtil || bufferUtil);
    } catch (e) {
      const mask = (source, mask2, output, offset, length) => {
        for (var i = 0; i < length; i++) {
          output[offset + i] = source[i] ^ mask2[i & 3];
        }
      };
      const unmask = (buffer, mask2) => {
        const length = buffer.length;
        for (var i = 0; i < length; i++) {
          buffer[i] ^= mask2[i & 3];
        }
      };
      module2.exports = { concat, mask, unmask };
    }
  }
});

// node_modules/ws/lib/PerMessageDeflate.js
var require_PerMessageDeflate = __commonJS({
  "node_modules/ws/lib/PerMessageDeflate.js"(exports2, module2) {
    "use strict";
    init_cjs_shims();
    var safeBuffer = require_safe_buffer();
    var Limiter = require_async_limiter();
    var zlib = require("zlib");
    var bufferUtil = require_BufferUtil();
    var Buffer3 = safeBuffer.Buffer;
    var TRAILER = Buffer3.from([0, 0, 255, 255]);
    var EMPTY_BLOCK = Buffer3.from([0]);
    var kWriteInProgress = /* @__PURE__ */ Symbol("write-in-progress");
    var kPendingClose = /* @__PURE__ */ Symbol("pending-close");
    var kTotalLength = /* @__PURE__ */ Symbol("total-length");
    var kCallback = /* @__PURE__ */ Symbol("callback");
    var kBuffers = /* @__PURE__ */ Symbol("buffers");
    var kError = /* @__PURE__ */ Symbol("error");
    var kOwner = /* @__PURE__ */ Symbol("owner");
    var zlibLimiter;
    var PerMessageDeflate = class {
      /**
       * Creates a PerMessageDeflate instance.
       *
       * @param {Object} options Configuration options
       * @param {Boolean} options.serverNoContextTakeover Request/accept disabling
       *     of server context takeover
       * @param {Boolean} options.clientNoContextTakeover Advertise/acknowledge
       *     disabling of client context takeover
       * @param {(Boolean|Number)} options.serverMaxWindowBits Request/confirm the
       *     use of a custom server window size
       * @param {(Boolean|Number)} options.clientMaxWindowBits Advertise support
       *     for, or request, a custom client window size
       * @param {Number} options.level The value of zlib's `level` param
       * @param {Number} options.memLevel The value of zlib's `memLevel` param
       * @param {Number} options.threshold Size (in bytes) below which messages
       *     should not be compressed
       * @param {Number} options.concurrencyLimit The number of concurrent calls to
       *     zlib
       * @param {Boolean} isServer Create the instance in either server or client
       *     mode
       * @param {Number} maxPayload The maximum allowed message length
       */
      constructor(options, isServer, maxPayload) {
        this._maxPayload = maxPayload | 0;
        this._options = options || {};
        this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024;
        this._isServer = !!isServer;
        this._deflate = null;
        this._inflate = null;
        this.params = null;
        if (!zlibLimiter) {
          const concurrency = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
          zlibLimiter = new Limiter({ concurrency });
        }
      }
      /**
       * @type {String}
       */
      static get extensionName() {
        return "permessage-deflate";
      }
      /**
       * Create extension parameters offer.
       *
       * @return {Object} Extension parameters
       * @public
       */
      offer() {
        const params = {};
        if (this._options.serverNoContextTakeover) {
          params.server_no_context_takeover = true;
        }
        if (this._options.clientNoContextTakeover) {
          params.client_no_context_takeover = true;
        }
        if (this._options.serverMaxWindowBits) {
          params.server_max_window_bits = this._options.serverMaxWindowBits;
        }
        if (this._options.clientMaxWindowBits) {
          params.client_max_window_bits = this._options.clientMaxWindowBits;
        } else if (this._options.clientMaxWindowBits == null) {
          params.client_max_window_bits = true;
        }
        return params;
      }
      /**
       * Accept extension offer.
       *
       * @param {Array} paramsList Extension parameters
       * @return {Object} Accepted configuration
       * @public
       */
      accept(paramsList) {
        paramsList = this.normalizeParams(paramsList);
        var params;
        if (this._isServer) {
          params = this.acceptAsServer(paramsList);
        } else {
          params = this.acceptAsClient(paramsList);
        }
        this.params = params;
        return params;
      }
      /**
       * Releases all resources used by the extension.
       *
       * @public
       */
      cleanup() {
        if (this._inflate) {
          if (this._inflate[kWriteInProgress]) {
            this._inflate[kPendingClose] = true;
          } else {
            this._inflate.close();
            this._inflate = null;
          }
        }
        if (this._deflate) {
          if (this._deflate[kWriteInProgress]) {
            this._deflate[kPendingClose] = true;
          } else {
            this._deflate.close();
            this._deflate = null;
          }
        }
      }
      /**
       * Accept extension offer from client.
       *
       * @param {Array} paramsList Extension parameters
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsServer(paramsList) {
        const accepted = {};
        const result = paramsList.some((params) => {
          if (this._options.serverNoContextTakeover === false && params.server_no_context_takeover || this._options.serverMaxWindowBits === false && params.server_max_window_bits || typeof this._options.serverMaxWindowBits === "number" && typeof params.server_max_window_bits === "number" && this._options.serverMaxWindowBits > params.server_max_window_bits || typeof this._options.clientMaxWindowBits === "number" && !params.client_max_window_bits) {
            return;
          }
          if (this._options.serverNoContextTakeover || params.server_no_context_takeover) {
            accepted.server_no_context_takeover = true;
          }
          if (this._options.clientNoContextTakeover || this._options.clientNoContextTakeover !== false && params.client_no_context_takeover) {
            accepted.client_no_context_takeover = true;
          }
          if (typeof this._options.serverMaxWindowBits === "number") {
            accepted.server_max_window_bits = this._options.serverMaxWindowBits;
          } else if (typeof params.server_max_window_bits === "number") {
            accepted.server_max_window_bits = params.server_max_window_bits;
          }
          if (typeof this._options.clientMaxWindowBits === "number") {
            accepted.client_max_window_bits = this._options.clientMaxWindowBits;
          } else if (this._options.clientMaxWindowBits !== false && typeof params.client_max_window_bits === "number") {
            accepted.client_max_window_bits = params.client_max_window_bits;
          }
          return true;
        });
        if (!result) throw new Error("Doesn't support the offered configuration");
        return accepted;
      }
      /**
       * Accept extension response from server.
       *
       * @param {Array} paramsList Extension parameters
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsClient(paramsList) {
        const params = paramsList[0];
        if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) {
          throw new Error('Invalid value for "client_no_context_takeover"');
        }
        if (typeof this._options.clientMaxWindowBits === "number" && (!params.client_max_window_bits || params.client_max_window_bits > this._options.clientMaxWindowBits) || this._options.clientMaxWindowBits === false && params.client_max_window_bits) {
          throw new Error('Invalid value for "client_max_window_bits"');
        }
        return params;
      }
      /**
       * Normalize extensions parameters.
       *
       * @param {Array} paramsList Extension parameters
       * @return {Array} Normalized extensions parameters
       * @private
       */
      normalizeParams(paramsList) {
        return paramsList.map((params) => {
          Object.keys(params).forEach((key) => {
            var value = params[key];
            if (value.length > 1) {
              throw new Error(`Multiple extension parameters for ${key}`);
            }
            value = value[0];
            switch (key) {
              case "server_no_context_takeover":
              case "client_no_context_takeover":
                if (value !== true) {
                  throw new Error(`invalid extension parameter value for ${key} (${value})`);
                }
                params[key] = true;
                break;
              case "server_max_window_bits":
              case "client_max_window_bits":
                if (typeof value === "string") {
                  value = parseInt(value, 10);
                  if (Number.isNaN(value) || value < zlib.Z_MIN_WINDOWBITS || value > zlib.Z_MAX_WINDOWBITS) {
                    throw new Error(`invalid extension parameter value for ${key} (${value})`);
                  }
                }
                if (!this._isServer && value === true) {
                  throw new Error(`Missing extension parameter value for ${key}`);
                }
                params[key] = value;
                break;
              default:
                throw new Error(`Not defined extension parameter (${key})`);
            }
          });
          return params;
        });
      }
      /**
       * Decompress data. Concurrency limited by async-limiter.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      decompress(data, fin, callback) {
        zlibLimiter.push((done) => {
          this._decompress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Compress data. Concurrency limited by async-limiter.
       *
       * @param {Buffer} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      compress(data, fin, callback) {
        zlibLimiter.push((done) => {
          this._compress(data, fin, (err, result) => {
            done();
            callback(err, result);
          });
        });
      }
      /**
       * Decompress data.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _decompress(data, fin, callback) {
        const endpoint = this._isServer ? "client" : "server";
        if (!this._inflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._inflate = zlib.createInflateRaw({ windowBits });
          this._inflate[kTotalLength] = 0;
          this._inflate[kBuffers] = [];
          this._inflate[kOwner] = this;
          this._inflate.on("error", inflateOnError);
          this._inflate.on("data", inflateOnData);
        }
        this._inflate[kCallback] = callback;
        this._inflate[kWriteInProgress] = true;
        this._inflate.write(data);
        if (fin) this._inflate.write(TRAILER);
        this._inflate.flush(() => {
          const err = this._inflate[kError];
          if (err) {
            this._inflate.close();
            this._inflate = null;
            callback(err);
            return;
          }
          const data2 = bufferUtil.concat(
            this._inflate[kBuffers],
            this._inflate[kTotalLength]
          );
          if (fin && this.params[`${endpoint}_no_context_takeover`] || this._inflate[kPendingClose]) {
            this._inflate.close();
            this._inflate = null;
          } else {
            this._inflate[kWriteInProgress] = false;
            this._inflate[kTotalLength] = 0;
            this._inflate[kBuffers] = [];
          }
          callback(null, data2);
        });
      }
      /**
       * Compress data.
       *
       * @param {Buffer} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _compress(data, fin, callback) {
        if (!data || data.length === 0) {
          process.nextTick(callback, null, EMPTY_BLOCK);
          return;
        }
        const endpoint = this._isServer ? "server" : "client";
        if (!this._deflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._deflate = zlib.createDeflateRaw({
            memLevel: this._options.memLevel,
            level: this._options.level,
            flush: zlib.Z_SYNC_FLUSH,
            windowBits
          });
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          this._deflate.on("data", deflateOnData);
        }
        this._deflate[kWriteInProgress] = true;
        this._deflate.write(data);
        this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
          var data2 = bufferUtil.concat(
            this._deflate[kBuffers],
            this._deflate[kTotalLength]
          );
          if (fin) data2 = data2.slice(0, data2.length - 4);
          if (fin && this.params[`${endpoint}_no_context_takeover`] || this._deflate[kPendingClose]) {
            this._deflate.close();
            this._deflate = null;
          } else {
            this._deflate[kWriteInProgress] = false;
            this._deflate[kTotalLength] = 0;
            this._deflate[kBuffers] = [];
          }
          callback(null, data2);
        });
      }
    };
    module2.exports = PerMessageDeflate;
    function deflateOnData(chunk) {
      this[kBuffers].push(chunk);
      this[kTotalLength] += chunk.length;
    }
    function inflateOnData(chunk) {
      this[kTotalLength] += chunk.length;
      if (this[kOwner]._maxPayload < 1 || this[kTotalLength] <= this[kOwner]._maxPayload) {
        this[kBuffers].push(chunk);
        return;
      }
      this[kError] = new Error("max payload size exceeded");
      this[kError].closeCode = 1009;
      this.removeListener("data", inflateOnData);
      this.reset();
    }
    function inflateOnError(err) {
      this[kOwner]._inflate = null;
      this[kCallback](err);
    }
  }
});

// node_modules/ws/lib/EventTarget.js
var require_EventTarget = __commonJS({
  "node_modules/ws/lib/EventTarget.js"(exports2, module2) {
    "use strict";
    init_cjs_shims();
    var Event = class {
      /**
       * Create a new `Event`.
       *
       * @param {String} type The name of the event
       * @param {Object} target A reference to the target to which the event was dispatched
       */
      constructor(type, target) {
        this.target = target;
        this.type = type;
      }
    };
    var MessageEvent = class extends Event {
      /**
       * Create a new `MessageEvent`.
       *
       * @param {(String|Buffer|ArrayBuffer|Buffer[])} data The received data
       * @param {WebSocket} target A reference to the target to which the event was dispatched
       */
      constructor(data, target) {
        super("message", target);
        this.data = data;
      }
    };
    var CloseEvent = class extends Event {
      /**
       * Create a new `CloseEvent`.
       *
       * @param {Number} code The status code explaining why the connection is being closed
       * @param {String} reason A human-readable string explaining why the connection is closing
       * @param {WebSocket} target A reference to the target to which the event was dispatched
       */
      constructor(code, reason, target) {
        super("close", target);
        this.wasClean = target._closeFrameReceived && target._closeFrameSent;
        this.reason = reason;
        this.code = code;
      }
    };
    var OpenEvent = class extends Event {
      /**
       * Create a new `OpenEvent`.
       *
       * @param {WebSocket} target A reference to the target to which the event was dispatched
       */
      constructor(target) {
        super("open", target);
      }
    };
    var EventTarget = {
      /**
       * Register an event listener.
       *
       * @param {String} method A string representing the event type to listen for
       * @param {Function} listener The listener to add
       * @public
       */
      addEventListener(method, listener) {
        if (typeof listener !== "function") return;
        function onMessage(data) {
          listener.call(this, new MessageEvent(data, this));
        }
        function onClose(code, message) {
          listener.call(this, new CloseEvent(code, message, this));
        }
        function onError(event) {
          event.type = "error";
          event.target = this;
          listener.call(this, event);
        }
        function onOpen() {
          listener.call(this, new OpenEvent(this));
        }
        if (method === "message") {
          onMessage._listener = listener;
          this.on(method, onMessage);
        } else if (method === "close") {
          onClose._listener = listener;
          this.on(method, onClose);
        } else if (method === "error") {
          onError._listener = listener;
          this.on(method, onError);
        } else if (method === "open") {
          onOpen._listener = listener;
          this.on(method, onOpen);
        } else {
          this.on(method, listener);
        }
      },
      /**
       * Remove an event listener.
       *
       * @param {String} method A string representing the event type to remove
       * @param {Function} listener The listener to remove
       * @public
       */
      removeEventListener(method, listener) {
        const listeners = this.listeners(method);
        for (var i = 0; i < listeners.length; i++) {
          if (listeners[i] === listener || listeners[i]._listener === listener) {
            this.removeListener(method, listeners[i]);
          }
        }
      }
    };
    module2.exports = EventTarget;
  }
});

// node_modules/ws/lib/Extensions.js
var require_Extensions = __commonJS({
  "node_modules/ws/lib/Extensions.js"(exports2, module2) {
    "use strict";
    init_cjs_shims();
    var tokenChars = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 0 - 15
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 16 - 31
      0,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      1,
      1,
      0,
      1,
      1,
      0,
      // 32 - 47
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      // 48 - 63
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 64 - 79
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      1,
      // 80 - 95
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 96 - 111
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      1,
      0,
      1,
      0
      // 112 - 127
    ];
    function push(dest, name, elem) {
      if (Object.prototype.hasOwnProperty.call(dest, name)) dest[name].push(elem);
      else dest[name] = [elem];
    }
    function parse(header) {
      const offers = {};
      if (header === void 0 || header === "") return offers;
      var params = {};
      var mustUnescape = false;
      var isEscaping = false;
      var inQuotes = false;
      var extensionName;
      var paramName;
      var start = -1;
      var end = -1;
      for (var i = 0; i < header.length; i++) {
        const code = header.charCodeAt(i);
        if (extensionName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (code === 32 || code === 9) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) throw new Error(`unexpected character at index ${i}`);
            if (end === -1) end = i;
            const name = header.slice(start, end);
            if (code === 44) {
              push(offers, name, params);
              params = {};
            } else {
              extensionName = name;
            }
            start = end = -1;
          } else {
            throw new Error(`unexpected character at index ${i}`);
          }
        } else if (paramName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (code === 32 || code === 9) {
            if (end === -1 && start !== -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) throw new Error(`unexpected character at index ${i}`);
            if (end === -1) end = i;
            push(params, header.slice(start, end), true);
            if (code === 44) {
              push(offers, extensionName, params);
              params = {};
              extensionName = void 0;
            }
            start = end = -1;
          } else if (code === 61 && start !== -1 && end === -1) {
            paramName = header.slice(start, i);
            start = end = -1;
          } else {
            throw new Error(`unexpected character at index ${i}`);
          }
        } else {
          if (isEscaping) {
            if (tokenChars[code] !== 1) {
              throw new Error(`unexpected character at index ${i}`);
            }
            if (start === -1) start = i;
            else if (!mustUnescape) mustUnescape = true;
            isEscaping = false;
          } else if (inQuotes) {
            if (tokenChars[code] === 1) {
              if (start === -1) start = i;
            } else if (code === 34 && start !== -1) {
              inQuotes = false;
              end = i;
            } else if (code === 92) {
              isEscaping = true;
            } else {
              throw new Error(`unexpected character at index ${i}`);
            }
          } else if (code === 34 && header.charCodeAt(i - 1) === 61) {
            inQuotes = true;
          } else if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i;
          } else if (start !== -1 && (code === 32 || code === 9)) {
            if (end === -1) end = i;
          } else if (code === 59 || code === 44) {
            if (start === -1) throw new Error(`unexpected character at index ${i}`);
            if (end === -1) end = i;
            var value = header.slice(start, end);
            if (mustUnescape) {
              value = value.replace(/\\/g, "");
              mustUnescape = false;
            }
            push(params, paramName, value);
            if (code === 44) {
              push(offers, extensionName, params);
              params = {};
              extensionName = void 0;
            }
            paramName = void 0;
            start = end = -1;
          } else {
            throw new Error(`unexpected character at index ${i}`);
          }
        }
      }
      if (start === -1 || inQuotes) throw new Error("unexpected end of input");
      if (end === -1) end = i;
      const token = header.slice(start, end);
      if (extensionName === void 0) {
        push(offers, token, {});
      } else {
        if (paramName === void 0) {
          push(params, token, true);
        } else if (mustUnescape) {
          push(params, paramName, token.replace(/\\/g, ""));
        } else {
          push(params, paramName, token);
        }
        push(offers, extensionName, params);
      }
      return offers;
    }
    function format(value) {
      return Object.keys(value).map((token) => {
        var paramsList = value[token];
        if (!Array.isArray(paramsList)) paramsList = [paramsList];
        return paramsList.map((params) => {
          return [token].concat(Object.keys(params).map((k) => {
            var p = params[k];
            if (!Array.isArray(p)) p = [p];
            return p.map((v) => v === true ? k : `${k}=${v}`).join("; ");
          })).join("; ");
        }).join(", ");
      }).join(", ");
    }
    module2.exports = { format, parse };
  }
});

// node_modules/ws/lib/Constants.js
var require_Constants = __commonJS({
  "node_modules/ws/lib/Constants.js"(exports2) {
    "use strict";
    init_cjs_shims();
    var safeBuffer = require_safe_buffer();
    var Buffer3 = safeBuffer.Buffer;
    exports2.BINARY_TYPES = ["nodebuffer", "arraybuffer", "fragments"];
    exports2.GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
    exports2.EMPTY_BUFFER = Buffer3.alloc(0);
    exports2.NOOP = () => {
    };
  }
});

// node_modules/ws/lib/Validation.js
var require_Validation = __commonJS({
  "node_modules/ws/lib/Validation.js"(exports2, module2) {
    "use strict";
    init_cjs_shims();
    try {
      const isValidUTF8 = require("utf-8-validate");
      module2.exports = typeof isValidUTF8 === "object" ? isValidUTF8.Validation.isValidUTF8 : isValidUTF8;
    } catch (e) {
      module2.exports = () => true;
    }
  }
});

// node_modules/ws/lib/ErrorCodes.js
var require_ErrorCodes = __commonJS({
  "node_modules/ws/lib/ErrorCodes.js"(exports2, module2) {
    "use strict";
    init_cjs_shims();
    module2.exports = {
      isValidErrorCode: function(code) {
        return code >= 1e3 && code <= 1013 && code !== 1004 && code !== 1005 && code !== 1006 || code >= 3e3 && code <= 4999;
      },
      1e3: "normal",
      1001: "going away",
      1002: "protocol error",
      1003: "unsupported data",
      1004: "reserved",
      1005: "reserved for extensions",
      1006: "reserved for extensions",
      1007: "inconsistent or invalid data",
      1008: "policy violation",
      1009: "message too big",
      1010: "extension handshake missing",
      1011: "an unexpected condition prevented the request from being fulfilled",
      1012: "service restart",
      1013: "try again later"
    };
  }
});

// node_modules/ws/lib/Receiver.js
var require_Receiver = __commonJS({
  "node_modules/ws/lib/Receiver.js"(exports2, module2) {
    "use strict";
    init_cjs_shims();
    var safeBuffer = require_safe_buffer();
    var PerMessageDeflate = require_PerMessageDeflate();
    var isValidUTF8 = require_Validation();
    var bufferUtil = require_BufferUtil();
    var ErrorCodes = require_ErrorCodes();
    var constants = require_Constants();
    var Buffer3 = safeBuffer.Buffer;
    var GET_INFO = 0;
    var GET_PAYLOAD_LENGTH_16 = 1;
    var GET_PAYLOAD_LENGTH_64 = 2;
    var GET_MASK = 3;
    var GET_DATA = 4;
    var INFLATING = 5;
    var Receiver = class {
      /**
       * Creates a Receiver instance.
       *
       * @param {Object} extensions An object containing the negotiated extensions
       * @param {Number} maxPayload The maximum allowed message length
       * @param {String} binaryType The type for binary data
       */
      constructor(extensions, maxPayload, binaryType) {
        this._binaryType = binaryType || constants.BINARY_TYPES[0];
        this._extensions = extensions || {};
        this._maxPayload = maxPayload | 0;
        this._bufferedBytes = 0;
        this._buffers = [];
        this._compressed = false;
        this._payloadLength = 0;
        this._fragmented = 0;
        this._masked = false;
        this._fin = false;
        this._mask = null;
        this._opcode = 0;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragments = [];
        this._cleanupCallback = null;
        this._hadError = false;
        this._dead = false;
        this._loop = false;
        this.onmessage = null;
        this.onclose = null;
        this.onerror = null;
        this.onping = null;
        this.onpong = null;
        this._state = GET_INFO;
      }
      /**
       * Consumes bytes from the available buffered data.
       *
       * @param {Number} bytes The number of bytes to consume
       * @return {Buffer} Consumed bytes
       * @private
       */
      readBuffer(bytes) {
        var offset = 0;
        var dst;
        var l;
        this._bufferedBytes -= bytes;
        if (bytes === this._buffers[0].length) return this._buffers.shift();
        if (bytes < this._buffers[0].length) {
          dst = this._buffers[0].slice(0, bytes);
          this._buffers[0] = this._buffers[0].slice(bytes);
          return dst;
        }
        dst = Buffer3.allocUnsafe(bytes);
        while (bytes > 0) {
          l = this._buffers[0].length;
          if (bytes >= l) {
            this._buffers[0].copy(dst, offset);
            offset += l;
            this._buffers.shift();
          } else {
            this._buffers[0].copy(dst, offset, 0, bytes);
            this._buffers[0] = this._buffers[0].slice(bytes);
          }
          bytes -= l;
        }
        return dst;
      }
      /**
       * Checks if the number of buffered bytes is bigger or equal than `n` and
       * calls `cleanup` if necessary.
       *
       * @param {Number} n The number of bytes to check against
       * @return {Boolean} `true` if `bufferedBytes >= n`, else `false`
       * @private
       */
      hasBufferedBytes(n) {
        if (this._bufferedBytes >= n) return true;
        this._loop = false;
        if (this._dead) this.cleanup(this._cleanupCallback);
        return false;
      }
      /**
       * Adds new data to the parser.
       *
       * @public
       */
      add(data) {
        if (this._dead) return;
        this._bufferedBytes += data.length;
        this._buffers.push(data);
        this.startLoop();
      }
      /**
       * Starts the parsing loop.
       *
       * @private
       */
      startLoop() {
        this._loop = true;
        while (this._loop) {
          switch (this._state) {
            case GET_INFO:
              this.getInfo();
              break;
            case GET_PAYLOAD_LENGTH_16:
              this.getPayloadLength16();
              break;
            case GET_PAYLOAD_LENGTH_64:
              this.getPayloadLength64();
              break;
            case GET_MASK:
              this.getMask();
              break;
            case GET_DATA:
              this.getData();
              break;
            default:
              this._loop = false;
          }
        }
      }
      /**
       * Reads the first two bytes of a frame.
       *
       * @private
       */
      getInfo() {
        if (!this.hasBufferedBytes(2)) return;
        const buf = this.readBuffer(2);
        if ((buf[0] & 48) !== 0) {
          this.error(new Error("RSV2 and RSV3 must be clear"), 1002);
          return;
        }
        const compressed = (buf[0] & 64) === 64;
        if (compressed && !this._extensions[PerMessageDeflate.extensionName]) {
          this.error(new Error("RSV1 must be clear"), 1002);
          return;
        }
        this._fin = (buf[0] & 128) === 128;
        this._opcode = buf[0] & 15;
        this._payloadLength = buf[1] & 127;
        if (this._opcode === 0) {
          if (compressed) {
            this.error(new Error("RSV1 must be clear"), 1002);
            return;
          }
          if (!this._fragmented) {
            this.error(new Error(`invalid opcode: ${this._opcode}`), 1002);
            return;
          } else {
            this._opcode = this._fragmented;
          }
        } else if (this._opcode === 1 || this._opcode === 2) {
          if (this._fragmented) {
            this.error(new Error(`invalid opcode: ${this._opcode}`), 1002);
            return;
          }
          this._compressed = compressed;
        } else if (this._opcode > 7 && this._opcode < 11) {
          if (!this._fin) {
            this.error(new Error("FIN must be set"), 1002);
            return;
          }
          if (compressed) {
            this.error(new Error("RSV1 must be clear"), 1002);
            return;
          }
          if (this._payloadLength > 125) {
            this.error(new Error("invalid payload length"), 1002);
            return;
          }
        } else {
          this.error(new Error(`invalid opcode: ${this._opcode}`), 1002);
          return;
        }
        if (!this._fin && !this._fragmented) this._fragmented = this._opcode;
        this._masked = (buf[1] & 128) === 128;
        if (this._payloadLength === 126) this._state = GET_PAYLOAD_LENGTH_16;
        else if (this._payloadLength === 127) this._state = GET_PAYLOAD_LENGTH_64;
        else this.haveLength();
      }
      /**
       * Gets extended payload length (7+16).
       *
       * @private
       */
      getPayloadLength16() {
        if (!this.hasBufferedBytes(2)) return;
        this._payloadLength = this.readBuffer(2).readUInt16BE(0, true);
        this.haveLength();
      }
      /**
       * Gets extended payload length (7+64).
       *
       * @private
       */
      getPayloadLength64() {
        if (!this.hasBufferedBytes(8)) return;
        const buf = this.readBuffer(8);
        const num2 = buf.readUInt32BE(0, true);
        if (num2 > Math.pow(2, 53 - 32) - 1) {
          this.error(new Error("max payload size exceeded"), 1009);
          return;
        }
        this._payloadLength = num2 * Math.pow(2, 32) + buf.readUInt32BE(4, true);
        this.haveLength();
      }
      /**
       * Payload length has been read.
       *
       * @private
       */
      haveLength() {
        if (this._opcode < 8 && this.maxPayloadExceeded(this._payloadLength)) {
          return;
        }
        if (this._masked) this._state = GET_MASK;
        else this._state = GET_DATA;
      }
      /**
       * Reads mask bytes.
       *
       * @private
       */
      getMask() {
        if (!this.hasBufferedBytes(4)) return;
        this._mask = this.readBuffer(4);
        this._state = GET_DATA;
      }
      /**
       * Reads data bytes.
       *
       * @private
       */
      getData() {
        var data = constants.EMPTY_BUFFER;
        if (this._payloadLength) {
          if (!this.hasBufferedBytes(this._payloadLength)) return;
          data = this.readBuffer(this._payloadLength);
          if (this._masked) bufferUtil.unmask(data, this._mask);
        }
        if (this._opcode > 7) {
          this.controlMessage(data);
        } else if (this._compressed) {
          this._state = INFLATING;
          this.decompress(data);
        } else if (this.pushFragment(data)) {
          this.dataMessage();
        }
      }
      /**
       * Decompresses data.
       *
       * @param {Buffer} data Compressed data
       * @private
       */
      decompress(data) {
        const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
        perMessageDeflate.decompress(data, this._fin, (err, buf) => {
          if (err) {
            this.error(err, err.closeCode === 1009 ? 1009 : 1007);
            return;
          }
          if (this.pushFragment(buf)) this.dataMessage();
          this.startLoop();
        });
      }
      /**
       * Handles a data message.
       *
       * @private
       */
      dataMessage() {
        if (this._fin) {
          const messageLength = this._messageLength;
          const fragments = this._fragments;
          this._totalPayloadLength = 0;
          this._messageLength = 0;
          this._fragmented = 0;
          this._fragments = [];
          if (this._opcode === 2) {
            var data;
            if (this._binaryType === "nodebuffer") {
              data = toBuffer(fragments, messageLength);
            } else if (this._binaryType === "arraybuffer") {
              data = toArrayBuffer(toBuffer(fragments, messageLength));
            } else {
              data = fragments;
            }
            this.onmessage(data);
          } else {
            const buf = toBuffer(fragments, messageLength);
            if (!isValidUTF8(buf)) {
              this.error(new Error("invalid utf8 sequence"), 1007);
              return;
            }
            this.onmessage(buf.toString());
          }
        }
        this._state = GET_INFO;
      }
      /**
       * Handles a control message.
       *
       * @param {Buffer} data Data to handle
       * @private
       */
      controlMessage(data) {
        if (this._opcode === 8) {
          if (data.length === 0) {
            this.onclose(1e3, "");
            this._loop = false;
            this.cleanup(this._cleanupCallback);
          } else if (data.length === 1) {
            this.error(new Error("invalid payload length"), 1002);
          } else {
            const code = data.readUInt16BE(0, true);
            if (!ErrorCodes.isValidErrorCode(code)) {
              this.error(new Error(`invalid status code: ${code}`), 1002);
              return;
            }
            const buf = data.slice(2);
            if (!isValidUTF8(buf)) {
              this.error(new Error("invalid utf8 sequence"), 1007);
              return;
            }
            this.onclose(code, buf.toString());
            this._loop = false;
            this.cleanup(this._cleanupCallback);
          }
          return;
        }
        if (this._opcode === 9) this.onping(data);
        else this.onpong(data);
        this._state = GET_INFO;
      }
      /**
       * Handles an error.
       *
       * @param {Error} err The error
       * @param {Number} code Close code
       * @private
       */
      error(err, code) {
        this.onerror(err, code);
        this._hadError = true;
        this._loop = false;
        this.cleanup(this._cleanupCallback);
      }
      /**
       * Checks payload size, disconnects socket when it exceeds `maxPayload`.
       *
       * @param {Number} length Payload length
       * @private
       */
      maxPayloadExceeded(length) {
        if (length === 0 || this._maxPayload < 1) return false;
        const fullLength = this._totalPayloadLength + length;
        if (fullLength <= this._maxPayload) {
          this._totalPayloadLength = fullLength;
          return false;
        }
        this.error(new Error("max payload size exceeded"), 1009);
        return true;
      }
      /**
       * Appends a fragment in the fragments array after checking that the sum of
       * fragment lengths does not exceed `maxPayload`.
       *
       * @param {Buffer} fragment The fragment to add
       * @return {Boolean} `true` if `maxPayload` is not exceeded, else `false`
       * @private
       */
      pushFragment(fragment) {
        if (fragment.length === 0) return true;
        const totalLength = this._messageLength + fragment.length;
        if (this._maxPayload < 1 || totalLength <= this._maxPayload) {
          this._messageLength = totalLength;
          this._fragments.push(fragment);
          return true;
        }
        this.error(new Error("max payload size exceeded"), 1009);
        return false;
      }
      /**
       * Releases resources used by the receiver.
       *
       * @param {Function} cb Callback
       * @public
       */
      cleanup(cb) {
        this._dead = true;
        if (!this._hadError && (this._loop || this._state === INFLATING)) {
          this._cleanupCallback = cb;
        } else {
          this._extensions = null;
          this._fragments = null;
          this._buffers = null;
          this._mask = null;
          this._cleanupCallback = null;
          this.onmessage = null;
          this.onclose = null;
          this.onerror = null;
          this.onping = null;
          this.onpong = null;
          if (cb) cb();
        }
      }
    };
    module2.exports = Receiver;
    function toBuffer(fragments, messageLength) {
      if (fragments.length === 1) return fragments[0];
      if (fragments.length > 1) return bufferUtil.concat(fragments, messageLength);
      return constants.EMPTY_BUFFER;
    }
    function toArrayBuffer(buf) {
      if (buf.byteOffset === 0 && buf.byteLength === buf.buffer.byteLength) {
        return buf.buffer;
      }
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    }
  }
});

// node_modules/ws/lib/Sender.js
var require_Sender = __commonJS({
  "node_modules/ws/lib/Sender.js"(exports2, module2) {
    "use strict";
    init_cjs_shims();
    var safeBuffer = require_safe_buffer();
    var crypto = require("crypto");
    var PerMessageDeflate = require_PerMessageDeflate();
    var bufferUtil = require_BufferUtil();
    var ErrorCodes = require_ErrorCodes();
    var constants = require_Constants();
    var Buffer3 = safeBuffer.Buffer;
    var Sender = class _Sender {
      /**
       * Creates a Sender instance.
       *
       * @param {net.Socket} socket The connection socket
       * @param {Object} extensions An object containing the negotiated extensions
       */
      constructor(socket, extensions) {
        this._extensions = extensions || {};
        this._socket = socket;
        this._firstFragment = true;
        this._compress = false;
        this._bufferedBytes = 0;
        this._deflating = false;
        this._queue = [];
      }
      /**
       * Frames a piece of data according to the HyBi WebSocket protocol.
       *
       * @param {Buffer} data The data to frame
       * @param {Object} options Options object
       * @param {Number} options.opcode The opcode
       * @param {Boolean} options.readOnly Specifies whether `data` can be modified
       * @param {Boolean} options.fin Specifies whether or not to set the FIN bit
       * @param {Boolean} options.mask Specifies whether or not to mask `data`
       * @param {Boolean} options.rsv1 Specifies whether or not to set the RSV1 bit
       * @return {Buffer[]} The framed data as a list of `Buffer` instances
       * @public
       */
      static frame(data, options) {
        const merge = data.length < 1024 || options.mask && options.readOnly;
        var offset = options.mask ? 6 : 2;
        var payloadLength = data.length;
        if (data.length >= 65536) {
          offset += 8;
          payloadLength = 127;
        } else if (data.length > 125) {
          offset += 2;
          payloadLength = 126;
        }
        const target = Buffer3.allocUnsafe(merge ? data.length + offset : offset);
        target[0] = options.fin ? options.opcode | 128 : options.opcode;
        if (options.rsv1) target[0] |= 64;
        if (payloadLength === 126) {
          target.writeUInt16BE(data.length, 2, true);
        } else if (payloadLength === 127) {
          target.writeUInt32BE(0, 2, true);
          target.writeUInt32BE(data.length, 6, true);
        }
        if (!options.mask) {
          target[1] = payloadLength;
          if (merge) {
            data.copy(target, offset);
            return [target];
          }
          return [target, data];
        }
        const mask = crypto.randomBytes(4);
        target[1] = payloadLength | 128;
        target[offset - 4] = mask[0];
        target[offset - 3] = mask[1];
        target[offset - 2] = mask[2];
        target[offset - 1] = mask[3];
        if (merge) {
          bufferUtil.mask(data, mask, target, offset, data.length);
          return [target];
        }
        bufferUtil.mask(data, mask, data, 0, data.length);
        return [target, data];
      }
      /**
       * Sends a close message to the other peer.
       *
       * @param {(Number|undefined)} code The status code component of the body
       * @param {String} data The message component of the body
       * @param {Boolean} mask Specifies whether or not to mask the message
       * @param {Function} cb Callback
       * @public
       */
      close(code, data, mask, cb) {
        var buf;
        if (code === void 0) {
          code = 1e3;
        } else if (typeof code !== "number" || !ErrorCodes.isValidErrorCode(code)) {
          throw new Error("first argument must be a valid error code number");
        }
        if (data === void 0 || data === "") {
          if (code === 1e3) {
            buf = constants.EMPTY_BUFFER;
          } else {
            buf = Buffer3.allocUnsafe(2);
            buf.writeUInt16BE(code, 0, true);
          }
        } else {
          buf = Buffer3.allocUnsafe(2 + Buffer3.byteLength(data));
          buf.writeUInt16BE(code, 0, true);
          buf.write(data, 2);
        }
        if (this._deflating) {
          this.enqueue([this.doClose, buf, mask, cb]);
        } else {
          this.doClose(buf, mask, cb);
        }
      }
      /**
       * Frames and sends a close message.
       *
       * @param {Buffer} data The message to send
       * @param {Boolean} mask Specifies whether or not to mask `data`
       * @param {Function} cb Callback
       * @private
       */
      doClose(data, mask, cb) {
        this.sendFrame(_Sender.frame(data, {
          fin: true,
          rsv1: false,
          opcode: 8,
          mask,
          readOnly: false
        }), cb);
      }
      /**
       * Sends a ping message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} mask Specifies whether or not to mask `data`
       * @public
       */
      ping(data, mask) {
        var readOnly = true;
        if (!Buffer3.isBuffer(data)) {
          if (data instanceof ArrayBuffer) {
            data = Buffer3.from(data);
          } else if (ArrayBuffer.isView(data)) {
            data = viewToBuffer(data);
          } else {
            data = Buffer3.from(data);
            readOnly = false;
          }
        }
        if (this._deflating) {
          this.enqueue([this.doPing, data, mask, readOnly]);
        } else {
          this.doPing(data, mask, readOnly);
        }
      }
      /**
       * Frames and sends a ping message.
       *
       * @param {*} data The message to send
       * @param {Boolean} mask Specifies whether or not to mask `data`
       * @param {Boolean} readOnly Specifies whether `data` can be modified
       * @private
       */
      doPing(data, mask, readOnly) {
        this.sendFrame(_Sender.frame(data, {
          fin: true,
          rsv1: false,
          opcode: 9,
          mask,
          readOnly
        }));
      }
      /**
       * Sends a pong message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} mask Specifies whether or not to mask `data`
       * @public
       */
      pong(data, mask) {
        var readOnly = true;
        if (!Buffer3.isBuffer(data)) {
          if (data instanceof ArrayBuffer) {
            data = Buffer3.from(data);
          } else if (ArrayBuffer.isView(data)) {
            data = viewToBuffer(data);
          } else {
            data = Buffer3.from(data);
            readOnly = false;
          }
        }
        if (this._deflating) {
          this.enqueue([this.doPong, data, mask, readOnly]);
        } else {
          this.doPong(data, mask, readOnly);
        }
      }
      /**
       * Frames and sends a pong message.
       *
       * @param {*} data The message to send
       * @param {Boolean} mask Specifies whether or not to mask `data`
       * @param {Boolean} readOnly Specifies whether `data` can be modified
       * @private
       */
      doPong(data, mask, readOnly) {
        this.sendFrame(_Sender.frame(data, {
          fin: true,
          rsv1: false,
          opcode: 10,
          mask,
          readOnly
        }));
      }
      /**
       * Sends a data message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Object} options Options object
       * @param {Boolean} options.compress Specifies whether or not to compress `data`
       * @param {Boolean} options.binary Specifies whether `data` is binary or text
       * @param {Boolean} options.fin Specifies whether the fragment is the last one
       * @param {Boolean} options.mask Specifies whether or not to mask `data`
       * @param {Function} cb Callback
       * @public
       */
      send(data, options, cb) {
        var opcode = options.binary ? 2 : 1;
        var rsv1 = options.compress;
        var readOnly = true;
        if (!Buffer3.isBuffer(data)) {
          if (data instanceof ArrayBuffer) {
            data = Buffer3.from(data);
          } else if (ArrayBuffer.isView(data)) {
            data = viewToBuffer(data);
          } else {
            data = Buffer3.from(data);
            readOnly = false;
          }
        }
        const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
        if (this._firstFragment) {
          this._firstFragment = false;
          if (rsv1 && perMessageDeflate) {
            rsv1 = data.length >= perMessageDeflate._threshold;
          }
          this._compress = rsv1;
        } else {
          rsv1 = false;
          opcode = 0;
        }
        if (options.fin) this._firstFragment = true;
        if (perMessageDeflate) {
          const opts = {
            fin: options.fin,
            rsv1,
            opcode,
            mask: options.mask,
            readOnly
          };
          if (this._deflating) {
            this.enqueue([this.dispatch, data, this._compress, opts, cb]);
          } else {
            this.dispatch(data, this._compress, opts, cb);
          }
        } else {
          this.sendFrame(_Sender.frame(data, {
            fin: options.fin,
            rsv1: false,
            opcode,
            mask: options.mask,
            readOnly
          }), cb);
        }
      }
      /**
       * Dispatches a data message.
       *
       * @param {Buffer} data The message to send
       * @param {Boolean} compress Specifies whether or not to compress `data`
       * @param {Object} options Options object
       * @param {Number} options.opcode The opcode
       * @param {Boolean} options.readOnly Specifies whether `data` can be modified
       * @param {Boolean} options.fin Specifies whether or not to set the FIN bit
       * @param {Boolean} options.mask Specifies whether or not to mask `data`
       * @param {Boolean} options.rsv1 Specifies whether or not to set the RSV1 bit
       * @param {Function} cb Callback
       * @private
       */
      dispatch(data, compress, options, cb) {
        if (!compress) {
          this.sendFrame(_Sender.frame(data, options), cb);
          return;
        }
        const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
        this._deflating = true;
        perMessageDeflate.compress(data, options.fin, (_, buf) => {
          options.readOnly = false;
          this.sendFrame(_Sender.frame(buf, options), cb);
          this._deflating = false;
          this.dequeue();
        });
      }
      /**
       * Executes queued send operations.
       *
       * @private
       */
      dequeue() {
        while (!this._deflating && this._queue.length) {
          const params = this._queue.shift();
          this._bufferedBytes -= params[1].length;
          params[0].apply(this, params.slice(1));
        }
      }
      /**
       * Enqueues a send operation.
       *
       * @param {Array} params Send operation parameters.
       * @private
       */
      enqueue(params) {
        this._bufferedBytes += params[1].length;
        this._queue.push(params);
      }
      /**
       * Sends a frame.
       *
       * @param {Buffer[]} list The frame to send
       * @param {Function} cb Callback
       * @private
       */
      sendFrame(list, cb) {
        if (list.length === 2) {
          this._socket.write(list[0]);
          this._socket.write(list[1], cb);
        } else {
          this._socket.write(list[0], cb);
        }
      }
    };
    module2.exports = Sender;
    function viewToBuffer(view) {
      const buf = Buffer3.from(view.buffer);
      if (view.byteLength !== view.buffer.byteLength) {
        return buf.slice(view.byteOffset, view.byteOffset + view.byteLength);
      }
      return buf;
    }
  }
});

// node_modules/ws/lib/WebSocket.js
var require_WebSocket = __commonJS({
  "node_modules/ws/lib/WebSocket.js"(exports2, module2) {
    "use strict";
    init_cjs_shims();
    var EventEmitter6 = require("events");
    var crypto = require("crypto");
    var Ultron = require_ultron();
    var https2 = require("https");
    var http2 = require("http");
    var url = require("url");
    var PerMessageDeflate = require_PerMessageDeflate();
    var EventTarget = require_EventTarget();
    var Extensions = require_Extensions();
    var constants = require_Constants();
    var Receiver = require_Receiver();
    var Sender = require_Sender();
    var protocolVersions = [8, 13];
    var closeTimeout = 30 * 1e3;
    var WebSocket3 = class _WebSocket extends EventEmitter6 {
      /**
       * Create a new `WebSocket`.
       *
       * @param {String} address The URL to which to connect
       * @param {(String|String[])} protocols The subprotocols
       * @param {Object} options Connection options
       */
      constructor(address, protocols, options) {
        super();
        if (!protocols) {
          protocols = [];
        } else if (typeof protocols === "string") {
          protocols = [protocols];
        } else if (!Array.isArray(protocols)) {
          options = protocols;
          protocols = [];
        }
        this.readyState = _WebSocket.CONNECTING;
        this.bytesReceived = 0;
        this.extensions = {};
        this.protocol = "";
        this._binaryType = constants.BINARY_TYPES[0];
        this._finalize = this.finalize.bind(this);
        this._closeFrameReceived = false;
        this._closeFrameSent = false;
        this._closeMessage = "";
        this._closeTimer = null;
        this._finalized = false;
        this._closeCode = 1006;
        this._receiver = null;
        this._sender = null;
        this._socket = null;
        this._ultron = null;
        if (Array.isArray(address)) {
          initAsServerClient.call(this, address[0], address[1], options);
        } else {
          initAsClient.call(this, address, protocols, options);
        }
      }
      get CONNECTING() {
        return _WebSocket.CONNECTING;
      }
      get CLOSING() {
        return _WebSocket.CLOSING;
      }
      get CLOSED() {
        return _WebSocket.CLOSED;
      }
      get OPEN() {
        return _WebSocket.OPEN;
      }
      /**
       * @type {Number}
       */
      get bufferedAmount() {
        var amount = 0;
        if (this._socket) {
          amount = this._socket.bufferSize + this._sender._bufferedBytes;
        }
        return amount;
      }
      /**
       * This deviates from the WHATWG interface since ws doesn't support the required
       * default "blob" type (instead we define a custom "nodebuffer" type).
       *
       * @type {String}
       */
      get binaryType() {
        return this._binaryType;
      }
      set binaryType(type) {
        if (constants.BINARY_TYPES.indexOf(type) < 0) return;
        this._binaryType = type;
        if (this._receiver) this._receiver._binaryType = type;
      }
      /**
       * Set up the socket and the internal resources.
       *
       * @param {net.Socket} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @private
       */
      setSocket(socket, head) {
        socket.setTimeout(0);
        socket.setNoDelay();
        this._receiver = new Receiver(this.extensions, this._maxPayload, this.binaryType);
        this._sender = new Sender(socket, this.extensions);
        this._ultron = new Ultron(socket);
        this._socket = socket;
        this._ultron.on("close", this._finalize);
        this._ultron.on("error", this._finalize);
        this._ultron.on("end", this._finalize);
        if (head.length > 0) socket.unshift(head);
        this._ultron.on("data", (data) => {
          this.bytesReceived += data.length;
          this._receiver.add(data);
        });
        this._receiver.onmessage = (data) => this.emit("message", data);
        this._receiver.onping = (data) => {
          this.pong(data, !this._isServer, true);
          this.emit("ping", data);
        };
        this._receiver.onpong = (data) => this.emit("pong", data);
        this._receiver.onclose = (code, reason) => {
          this._closeFrameReceived = true;
          this._closeMessage = reason;
          this._closeCode = code;
          if (!this._finalized) this.close(code, reason);
        };
        this._receiver.onerror = (error, code) => {
          this._closeMessage = "";
          this._closeCode = code;
          this.readyState = _WebSocket.CLOSING;
          this.emit("error", error);
          this.finalize(true);
        };
        this.readyState = _WebSocket.OPEN;
        this.emit("open");
      }
      /**
       * Clean up and release internal resources.
       *
       * @param {(Boolean|Error)} error Indicates whether or not an error occurred
       * @private
       */
      finalize(error) {
        if (this._finalized) return;
        this.readyState = _WebSocket.CLOSING;
        this._finalized = true;
        if (typeof error === "object") this.emit("error", error);
        if (!this._socket) return this.emitClose();
        clearTimeout(this._closeTimer);
        this._closeTimer = null;
        this._ultron.destroy();
        this._ultron = null;
        this._socket.on("error", constants.NOOP);
        if (!error) this._socket.end();
        else this._socket.destroy();
        this._socket = null;
        this._sender = null;
        this._receiver.cleanup(() => this.emitClose());
        this._receiver = null;
      }
      /**
       * Emit the `close` event.
       *
       * @private
       */
      emitClose() {
        this.readyState = _WebSocket.CLOSED;
        this.emit("close", this._closeCode, this._closeMessage);
        if (this.extensions[PerMessageDeflate.extensionName]) {
          this.extensions[PerMessageDeflate.extensionName].cleanup();
        }
        this.extensions = null;
        this.removeAllListeners();
      }
      /**
       * Pause the socket stream.
       *
       * @public
       */
      pause() {
        if (this.readyState !== _WebSocket.OPEN) throw new Error("not opened");
        this._socket.pause();
      }
      /**
       * Resume the socket stream
       *
       * @public
       */
      resume() {
        if (this.readyState !== _WebSocket.OPEN) throw new Error("not opened");
        this._socket.resume();
      }
      /**
       * Start a closing handshake.
       *
       *            +----------+     +-----------+   +----------+
       *     + - - -|ws.close()|---->|close frame|-->|ws.close()|- - - -
       *            +----------+     +-----------+   +----------+       |
       *     |      +----------+     +-----------+         |
       *            |ws.close()|<----|close frame|<--------+            |
       *            +----------+     +-----------+         |
       *  CLOSING         |              +---+             |         CLOSING
       *                  |          +---|fin|<------------+
       *     |            |          |   +---+                          |
       *                  |          |   +---+      +-------------+
       *     |            +----------+-->|fin|----->|ws.finalize()| - - +
       *                             |   +---+      +-------------+
       *     |     +-------------+   |
       *      - - -|ws.finalize()|<--+
       *           +-------------+
       *
       * @param {Number} code Status code explaining why the connection is closing
       * @param {String} data A string explaining why the connection is closing
       * @public
       */
      close(code, data) {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          this._req.abort();
          this.finalize(new Error("closed before the connection is established"));
          return;
        }
        if (this.readyState === _WebSocket.CLOSING) {
          if (this._closeFrameSent && this._closeFrameReceived) this._socket.end();
          return;
        }
        this.readyState = _WebSocket.CLOSING;
        this._sender.close(code, data, !this._isServer, (err) => {
          if (err) return;
          this._closeFrameSent = true;
          if (!this._finalized) {
            if (this._closeFrameReceived) this._socket.end();
            this._closeTimer = setTimeout(this._finalize, closeTimeout, true);
          }
        });
      }
      /**
       * Send a ping message.
       *
       * @param {*} data The message to send
       * @param {Boolean} mask Indicates whether or not to mask `data`
       * @param {Boolean} failSilently Indicates whether or not to throw if `readyState` isn't `OPEN`
       * @public
       */
      ping(data, mask, failSilently) {
        if (this.readyState !== _WebSocket.OPEN) {
          if (failSilently) return;
          throw new Error("not opened");
        }
        if (typeof data === "number") data = data.toString();
        if (mask === void 0) mask = !this._isServer;
        this._sender.ping(data || constants.EMPTY_BUFFER, mask);
      }
      /**
       * Send a pong message.
       *
       * @param {*} data The message to send
       * @param {Boolean} mask Indicates whether or not to mask `data`
       * @param {Boolean} failSilently Indicates whether or not to throw if `readyState` isn't `OPEN`
       * @public
       */
      pong(data, mask, failSilently) {
        if (this.readyState !== _WebSocket.OPEN) {
          if (failSilently) return;
          throw new Error("not opened");
        }
        if (typeof data === "number") data = data.toString();
        if (mask === void 0) mask = !this._isServer;
        this._sender.pong(data || constants.EMPTY_BUFFER, mask);
      }
      /**
       * Send a data message.
       *
       * @param {*} data The message to send
       * @param {Object} options Options object
       * @param {Boolean} options.compress Specifies whether or not to compress `data`
       * @param {Boolean} options.binary Specifies whether `data` is binary or text
       * @param {Boolean} options.fin Specifies whether the fragment is the last one
       * @param {Boolean} options.mask Specifies whether or not to mask `data`
       * @param {Function} cb Callback which is executed when data is written out
       * @public
       */
      send(data, options, cb) {
        if (typeof options === "function") {
          cb = options;
          options = {};
        }
        if (this.readyState !== _WebSocket.OPEN) {
          if (cb) cb(new Error("not opened"));
          else throw new Error("not opened");
          return;
        }
        if (typeof data === "number") data = data.toString();
        const opts = Object.assign({
          binary: typeof data !== "string",
          mask: !this._isServer,
          compress: true,
          fin: true
        }, options);
        if (!this.extensions[PerMessageDeflate.extensionName]) {
          opts.compress = false;
        }
        this._sender.send(data || constants.EMPTY_BUFFER, opts, cb);
      }
      /**
       * Forcibly close the connection.
       *
       * @public
       */
      terminate() {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          this._req.abort();
          this.finalize(new Error("closed before the connection is established"));
          return;
        }
        this.finalize(true);
      }
    };
    WebSocket3.CONNECTING = 0;
    WebSocket3.OPEN = 1;
    WebSocket3.CLOSING = 2;
    WebSocket3.CLOSED = 3;
    ["open", "error", "close", "message"].forEach((method) => {
      Object.defineProperty(WebSocket3.prototype, `on${method}`, {
        /**
         * Return the listener of the event.
         *
         * @return {(Function|undefined)} The event listener or `undefined`
         * @public
         */
        get() {
          const listeners = this.listeners(method);
          for (var i = 0; i < listeners.length; i++) {
            if (listeners[i]._listener) return listeners[i]._listener;
          }
        },
        /**
         * Add a listener for the event.
         *
         * @param {Function} listener The listener to add
         * @public
         */
        set(listener) {
          const listeners = this.listeners(method);
          for (var i = 0; i < listeners.length; i++) {
            if (listeners[i]._listener) this.removeListener(method, listeners[i]);
          }
          this.addEventListener(method, listener);
        }
      });
    });
    WebSocket3.prototype.addEventListener = EventTarget.addEventListener;
    WebSocket3.prototype.removeEventListener = EventTarget.removeEventListener;
    module2.exports = WebSocket3;
    function initAsServerClient(socket, head, options) {
      this.protocolVersion = options.protocolVersion;
      this._maxPayload = options.maxPayload;
      this.extensions = options.extensions;
      this.protocol = options.protocol;
      this._isServer = true;
      this.setSocket(socket, head);
    }
    function initAsClient(address, protocols, options) {
      options = Object.assign({
        protocolVersion: protocolVersions[1],
        protocol: protocols.join(","),
        perMessageDeflate: true,
        handshakeTimeout: null,
        localAddress: null,
        headers: null,
        family: null,
        origin: null,
        agent: null,
        host: null,
        //
        // SSL options.
        //
        checkServerIdentity: null,
        rejectUnauthorized: null,
        passphrase: null,
        ciphers: null,
        ecdhCurve: null,
        cert: null,
        key: null,
        pfx: null,
        ca: null
      }, options);
      if (protocolVersions.indexOf(options.protocolVersion) === -1) {
        throw new Error(
          `unsupported protocol version: ${options.protocolVersion} (supported versions: ${protocolVersions.join(", ")})`
        );
      }
      this.protocolVersion = options.protocolVersion;
      this._isServer = false;
      this.url = address;
      const serverUrl = url.parse(address);
      const isUnixSocket = serverUrl.protocol === "ws+unix:";
      if (!serverUrl.host && (!isUnixSocket || !serverUrl.path)) {
        throw new Error("invalid url");
      }
      const isSecure = serverUrl.protocol === "wss:" || serverUrl.protocol === "https:";
      const key = crypto.randomBytes(16).toString("base64");
      const httpObj = isSecure ? https2 : http2;
      var perMessageDeflate;
      const requestOptions = {
        port: serverUrl.port || (isSecure ? 443 : 80),
        host: serverUrl.hostname,
        path: "/",
        headers: {
          "Sec-WebSocket-Version": options.protocolVersion,
          "Sec-WebSocket-Key": key,
          "Connection": "Upgrade",
          "Upgrade": "websocket"
        }
      };
      if (options.headers) Object.assign(requestOptions.headers, options.headers);
      if (options.perMessageDeflate) {
        perMessageDeflate = new PerMessageDeflate(
          options.perMessageDeflate !== true ? options.perMessageDeflate : {},
          false
        );
        requestOptions.headers["Sec-WebSocket-Extensions"] = Extensions.format({
          [PerMessageDeflate.extensionName]: perMessageDeflate.offer()
        });
      }
      if (options.protocol) {
        requestOptions.headers["Sec-WebSocket-Protocol"] = options.protocol;
      }
      if (options.origin) {
        if (options.protocolVersion < 13) {
          requestOptions.headers["Sec-WebSocket-Origin"] = options.origin;
        } else {
          requestOptions.headers.Origin = options.origin;
        }
      }
      if (options.host) requestOptions.headers.Host = options.host;
      if (serverUrl.auth) requestOptions.auth = serverUrl.auth;
      if (options.localAddress) requestOptions.localAddress = options.localAddress;
      if (options.family) requestOptions.family = options.family;
      if (isUnixSocket) {
        const parts = serverUrl.path.split(":");
        requestOptions.socketPath = parts[0];
        requestOptions.path = parts[1];
      } else if (serverUrl.path) {
        if (serverUrl.path.charAt(0) !== "/") {
          requestOptions.path = `/${serverUrl.path}`;
        } else {
          requestOptions.path = serverUrl.path;
        }
      }
      var agent = options.agent;
      if (options.rejectUnauthorized != null || options.checkServerIdentity || options.passphrase || options.ciphers || options.ecdhCurve || options.cert || options.key || options.pfx || options.ca) {
        if (options.passphrase) requestOptions.passphrase = options.passphrase;
        if (options.ciphers) requestOptions.ciphers = options.ciphers;
        if (options.ecdhCurve) requestOptions.ecdhCurve = options.ecdhCurve;
        if (options.cert) requestOptions.cert = options.cert;
        if (options.key) requestOptions.key = options.key;
        if (options.pfx) requestOptions.pfx = options.pfx;
        if (options.ca) requestOptions.ca = options.ca;
        if (options.checkServerIdentity) {
          requestOptions.checkServerIdentity = options.checkServerIdentity;
        }
        if (options.rejectUnauthorized != null) {
          requestOptions.rejectUnauthorized = options.rejectUnauthorized;
        }
        if (!agent) agent = new httpObj.Agent(requestOptions);
      }
      if (agent) requestOptions.agent = agent;
      this._req = httpObj.get(requestOptions);
      if (options.handshakeTimeout) {
        this._req.setTimeout(options.handshakeTimeout, () => {
          this._req.abort();
          this.finalize(new Error("opening handshake has timed out"));
        });
      }
      this._req.on("error", (error) => {
        if (this._req.aborted) return;
        this._req = null;
        this.finalize(error);
      });
      this._req.on("response", (res) => {
        if (!this.emit("unexpected-response", this._req, res)) {
          this._req.abort();
          this.finalize(new Error(`unexpected server response (${res.statusCode})`));
        }
      });
      this._req.on("upgrade", (res, socket, head) => {
        this.emit("headers", res.headers, res);
        if (this.readyState !== WebSocket3.CONNECTING) return;
        this._req = null;
        const digest = crypto.createHash("sha1").update(key + constants.GUID, "binary").digest("base64");
        if (res.headers["sec-websocket-accept"] !== digest) {
          socket.destroy();
          return this.finalize(new Error("invalid server key"));
        }
        const serverProt = res.headers["sec-websocket-protocol"];
        const protList = (options.protocol || "").split(/, */);
        var protError;
        if (!options.protocol && serverProt) {
          protError = "server sent a subprotocol even though none requested";
        } else if (options.protocol && !serverProt) {
          protError = "server sent no subprotocol even though requested";
        } else if (serverProt && protList.indexOf(serverProt) === -1) {
          protError = "server responded with an invalid protocol";
        }
        if (protError) {
          socket.destroy();
          return this.finalize(new Error(protError));
        }
        if (serverProt) this.protocol = serverProt;
        if (perMessageDeflate) {
          try {
            const serverExtensions = Extensions.parse(
              res.headers["sec-websocket-extensions"]
            );
            if (serverExtensions[PerMessageDeflate.extensionName]) {
              perMessageDeflate.accept(
                serverExtensions[PerMessageDeflate.extensionName]
              );
              this.extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
            }
          } catch (err) {
            socket.destroy();
            this.finalize(new Error("invalid Sec-WebSocket-Extensions header"));
            return;
          }
        }
        this.setSocket(socket, head);
      });
    }
  }
});

// node_modules/ws/lib/WebSocketServer.js
var require_WebSocketServer = __commonJS({
  "node_modules/ws/lib/WebSocketServer.js"(exports2, module2) {
    "use strict";
    init_cjs_shims();
    var safeBuffer = require_safe_buffer();
    var EventEmitter6 = require("events");
    var crypto = require("crypto");
    var Ultron = require_ultron();
    var http2 = require("http");
    var url = require("url");
    var PerMessageDeflate = require_PerMessageDeflate();
    var Extensions = require_Extensions();
    var constants = require_Constants();
    var WebSocket3 = require_WebSocket();
    var Buffer3 = safeBuffer.Buffer;
    var WebSocketServer = class extends EventEmitter6 {
      /**
       * Create a `WebSocketServer` instance.
       *
       * @param {Object} options Configuration options
       * @param {String} options.host The hostname where to bind the server
       * @param {Number} options.port The port where to bind the server
       * @param {http.Server} options.server A pre-created HTTP/S server to use
       * @param {Function} options.verifyClient An hook to reject connections
       * @param {Function} options.handleProtocols An hook to handle protocols
       * @param {String} options.path Accept only connections matching this path
       * @param {Boolean} options.noServer Enable no server mode
       * @param {Boolean} options.clientTracking Specifies whether or not to track clients
       * @param {(Boolean|Object)} options.perMessageDeflate Enable/disable permessage-deflate
       * @param {Number} options.maxPayload The maximum allowed message size
       * @param {Function} callback A listener for the `listening` event
       */
      constructor(options, callback) {
        super();
        options = Object.assign({
          maxPayload: 100 * 1024 * 1024,
          perMessageDeflate: false,
          handleProtocols: null,
          clientTracking: true,
          verifyClient: null,
          noServer: false,
          backlog: null,
          // use default (511 as implemented in net.js)
          server: null,
          host: null,
          path: null,
          port: null
        }, options);
        if (options.port == null && !options.server && !options.noServer) {
          throw new TypeError("missing or invalid options");
        }
        if (options.port != null) {
          this._server = http2.createServer((req, res) => {
            const body = http2.STATUS_CODES[426];
            res.writeHead(426, {
              "Content-Length": body.length,
              "Content-Type": "text/plain"
            });
            res.end(body);
          });
          this._server.listen(options.port, options.host, options.backlog, callback);
        } else if (options.server) {
          this._server = options.server;
        }
        if (this._server) {
          this._ultron = new Ultron(this._server);
          this._ultron.on("listening", () => this.emit("listening"));
          this._ultron.on("error", (err) => this.emit("error", err));
          this._ultron.on("upgrade", (req, socket, head) => {
            this.handleUpgrade(req, socket, head, (client) => {
              this.emit("connection", client, req);
            });
          });
        }
        if (options.perMessageDeflate === true) options.perMessageDeflate = {};
        if (options.clientTracking) this.clients = /* @__PURE__ */ new Set();
        this.options = options;
      }
      /**
       * Close the server.
       *
       * @param {Function} cb Callback
       * @public
       */
      close(cb) {
        if (this.clients) {
          for (const client of this.clients) client.terminate();
        }
        const server = this._server;
        if (server) {
          this._ultron.destroy();
          this._ultron = this._server = null;
          if (this.options.port != null) return server.close(cb);
        }
        if (cb) cb();
      }
      /**
       * See if a given request should be handled by this server instance.
       *
       * @param {http.IncomingMessage} req Request object to inspect
       * @return {Boolean} `true` if the request is valid, else `false`
       * @public
       */
      shouldHandle(req) {
        if (this.options.path && url.parse(req.url).pathname !== this.options.path) {
          return false;
        }
        return true;
      }
      /**
       * Handle a HTTP Upgrade request.
       *
       * @param {http.IncomingMessage} req The request object
       * @param {net.Socket} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @public
       */
      handleUpgrade(req, socket, head, cb) {
        socket.on("error", socketError);
        const version = +req.headers["sec-websocket-version"];
        const extensions = {};
        if (req.method !== "GET" || req.headers.upgrade.toLowerCase() !== "websocket" || !req.headers["sec-websocket-key"] || version !== 8 && version !== 13 || !this.shouldHandle(req)) {
          return abortConnection(socket, 400);
        }
        if (this.options.perMessageDeflate) {
          const perMessageDeflate = new PerMessageDeflate(
            this.options.perMessageDeflate,
            true,
            this.options.maxPayload
          );
          try {
            const offers = Extensions.parse(
              req.headers["sec-websocket-extensions"]
            );
            if (offers[PerMessageDeflate.extensionName]) {
              perMessageDeflate.accept(offers[PerMessageDeflate.extensionName]);
              extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
            }
          } catch (err) {
            return abortConnection(socket, 400);
          }
        }
        var protocol = (req.headers["sec-websocket-protocol"] || "").split(/, */);
        if (this.options.handleProtocols) {
          protocol = this.options.handleProtocols(protocol, req);
          if (protocol === false) return abortConnection(socket, 401);
        } else {
          protocol = protocol[0];
        }
        if (this.options.verifyClient) {
          const info = {
            origin: req.headers[`${version === 8 ? "sec-websocket-origin" : "origin"}`],
            secure: !!(req.connection.authorized || req.connection.encrypted),
            req
          };
          if (this.options.verifyClient.length === 2) {
            this.options.verifyClient(info, (verified, code, message) => {
              if (!verified) return abortConnection(socket, code || 401, message);
              this.completeUpgrade(
                protocol,
                extensions,
                version,
                req,
                socket,
                head,
                cb
              );
            });
            return;
          }
          if (!this.options.verifyClient(info)) return abortConnection(socket, 401);
        }
        this.completeUpgrade(protocol, extensions, version, req, socket, head, cb);
      }
      /**
       * Upgrade the connection to WebSocket.
       *
       * @param {String} protocol The chosen subprotocol
       * @param {Object} extensions The accepted extensions
       * @param {Number} version The WebSocket protocol version
       * @param {http.IncomingMessage} req The request object
       * @param {net.Socket} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @private
       */
      completeUpgrade(protocol, extensions, version, req, socket, head, cb) {
        if (!socket.readable || !socket.writable) return socket.destroy();
        const key = crypto.createHash("sha1").update(req.headers["sec-websocket-key"] + constants.GUID, "binary").digest("base64");
        const headers = [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${key}`
        ];
        if (protocol) headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
        if (extensions[PerMessageDeflate.extensionName]) {
          const params = extensions[PerMessageDeflate.extensionName].params;
          const value = Extensions.format({
            [PerMessageDeflate.extensionName]: [params]
          });
          headers.push(`Sec-WebSocket-Extensions: ${value}`);
        }
        this.emit("headers", headers, req);
        socket.write(headers.concat("\r\n").join("\r\n"));
        const client = new WebSocket3([socket, head], null, {
          maxPayload: this.options.maxPayload,
          protocolVersion: version,
          extensions,
          protocol
        });
        if (this.clients) {
          this.clients.add(client);
          client.on("close", () => this.clients.delete(client));
        }
        socket.removeListener("error", socketError);
        cb(client);
      }
    };
    module2.exports = WebSocketServer;
    function socketError() {
      this.destroy();
    }
    function abortConnection(socket, code, message) {
      if (socket.writable) {
        message = message || http2.STATUS_CODES[code];
        socket.write(
          `HTTP/1.1 ${code} ${http2.STATUS_CODES[code]}\r
Connection: close\r
Content-type: text/html\r
Content-Length: ${Buffer3.byteLength(message)}\r
\r
` + message
        );
      }
      socket.removeListener("error", socketError);
      socket.destroy();
    }
  }
});

// node_modules/ws/index.js
var require_ws = __commonJS({
  "node_modules/ws/index.js"(exports2, module2) {
    "use strict";
    init_cjs_shims();
    var WebSocket3 = require_WebSocket();
    WebSocket3.Server = require_WebSocketServer();
    WebSocket3.Receiver = require_Receiver();
    WebSocket3.Sender = require_Sender();
    module2.exports = WebSocket3;
  }
});

// src/index.ts
var index_exports = {};
__export(index_exports, {
  E2EEService: () => E2EEService,
  FBClient: () => FBClient
});
module.exports = __toCommonJS(index_exports);
init_cjs_shims();

// src/core/client.ts
init_cjs_shims();

// src/types/advanced-types.ts
init_cjs_shims();
var import_node_events = require("events");
var TypedEventEmitter = class extends import_node_events.EventEmitter {
  on(event, listener) {
    return super.on(event, listener);
  }
  once(event, listener) {
    return super.once(event, listener);
  }
  off(event, listener) {
    return super.off(event, listener);
  }
  emit(event, data) {
    return super.emit(event, data);
  }
  removeAllListeners(event) {
    return super.removeAllListeners(event);
  }
};

// src/controllers/client.controller.ts
init_cjs_shims();
var import_node_events5 = require("events");
var import_node_crypto11 = require("crypto");

// src/e2ee/transport/binary/wa-binary.ts
init_cjs_shims();

// src/e2ee/transport/binary/tokens.ts
init_cjs_shims();
var SingleByteTokens = [
  "",
  "xmlstreamstart",
  "xmlstreamend",
  "s.whatsapp.net",
  "type",
  "participant",
  "from",
  "receipt",
  "id",
  "notification",
  "disappearing_mode",
  "status",
  "jid",
  "broadcast",
  "user",
  "devices",
  "device_hash",
  "to",
  "offline",
  "message",
  "result",
  "class",
  "xmlns",
  "duration",
  "notify",
  "iq",
  "t",
  "ack",
  "g.us",
  "enc",
  "urn:xmpp:whatsapp:push",
  "presence",
  "config_value",
  "picture",
  "verified_name",
  "config_code",
  "key-index-list",
  "contact",
  "mediatype",
  "routing_info",
  "edge_routing",
  "get",
  "read",
  "urn:xmpp:ping",
  "fallback_hostname",
  "0",
  "chatstate",
  "business_hours_config",
  "unavailable",
  "download_buckets",
  "skmsg",
  "verified_level",
  "composing",
  "handshake",
  "device-list",
  "media",
  "text",
  "fallback_ip4",
  "media_conn",
  "device",
  "creation",
  "location",
  "config",
  "item",
  "fallback_ip6",
  "count",
  "w:profile:picture",
  "image",
  "business",
  "2",
  "hostname",
  "call-creator",
  "display_name",
  "relaylatency",
  "platform",
  "abprops",
  "success",
  "msg",
  "offline_preview",
  "prop",
  "key-index",
  "v",
  "day_of_week",
  "pkmsg",
  "version",
  "1",
  "ping",
  "w:p",
  "download",
  "video",
  "set",
  "specific_hours",
  "props",
  "primary",
  "unknown",
  "hash",
  "commerce_experience",
  "last",
  "subscribe",
  "max_buckets",
  "call",
  "profile",
  "member_since_text",
  "close_time",
  "call-id",
  "sticker",
  "mode",
  "participants",
  "value",
  "query",
  "profile_options",
  "open_time",
  "code",
  "list",
  "host",
  "ts",
  "contacts",
  "upload",
  "lid",
  "preview",
  "update",
  "usync",
  "w:stats",
  "delivery",
  "auth_ttl",
  "context",
  "fail",
  "cart_enabled",
  "appdata",
  "category",
  "atn",
  "direct_connection",
  "decrypt-fail",
  "relay_id",
  "mmg-fallback.whatsapp.net",
  "target",
  "available",
  "name",
  "last_id",
  "mmg.whatsapp.net",
  "categories",
  "401",
  "is_new",
  "index",
  "tctoken",
  "ip4",
  "token_id",
  "latency",
  "recipient",
  "edit",
  "ip6",
  "add",
  "thumbnail-document",
  "26",
  "paused",
  "true",
  "identity",
  "stream:error",
  "key",
  "sidelist",
  "background",
  "audio",
  "3",
  "thumbnail-image",
  "biz-cover-photo",
  "cat",
  "gcm",
  "thumbnail-video",
  "error",
  "auth",
  "deny",
  "serial",
  "in",
  "registration",
  "thumbnail-link",
  "remove",
  "00",
  "gif",
  "thumbnail-gif",
  "tag",
  "capability",
  "multicast",
  "item-not-found",
  "description",
  "business_hours",
  "config_expo_key",
  "md-app-state",
  "expiration",
  "fallback",
  "ttl",
  "300",
  "md-msg-hist",
  "device_orientation",
  "out",
  "w:m",
  "open_24h",
  "side_list",
  "token",
  "inactive",
  "01",
  "document",
  "te2",
  "played",
  "encrypt",
  "msgr",
  "hide",
  "direct_path",
  "12",
  "state",
  "not-authorized",
  "url",
  "terminate",
  "signature",
  "status-revoke-delay",
  "02",
  "te",
  "linked_accounts",
  "trusted_contact",
  "timezone",
  "ptt",
  "kyc-id",
  "privacy_token",
  "readreceipts",
  "appointment_only",
  "address",
  "expected_ts",
  "privacy",
  "7",
  "android",
  "interactive",
  "device-identity",
  "enabled",
  "attribute_padding",
  "1080",
  "03",
  "screen_height"
];
var DoubleByteTokens = [
  ["read-self", "active", "fbns", "protocol", "reaction", "screen_width", "heartbeat", "deviceid", "2:47DEQpj8", "uploadfieldstat", "voip_settings", "retry", "priority", "longitude", "conflict", "false", "ig_professional", "replaced", "preaccept", "cover_photo", "uncompressed", "encopt", "ppic", "04", "passive", "status-revoke-drop", "keygen", "540", "offer", "rate", "opus", "latitude", "w:gp2", "ver", "4", "business_profile", "medium", "sender", "prev_v_id", "email", "website", "invited", "sign_credential", "05", "transport", "skey", "reason", "peer_abtest_bucket", "America/Sao_Paulo", "appid", "refresh", "100", "06", "404", "101", "104", "107", "102", "109", "103", "member_add_mode", "105", "transaction-id", "110", "106", "outgoing", "108", "111", "tokens", "followers", "ig_handle", "self_pid", "tue", "dec", "thu", "joinable", "peer_pid", "mon", "features", "wed", "peer_device_presence", "pn", "delete", "07", "fri", "audio_duration", "admin", "connected", "delta", "rcat", "disable", "collection", "08", "480", "sat", "phash", "all", "invite", "accept", "critical_unblock_low", "group_update", "signed_credential", "blinded_credential", "eph_setting", "net", "09", "background_location", "refresh_id", "Asia/Kolkata", "privacy_mode_ts", "account_sync", "voip_payload_type", "service_areas", "acs_public_key", "v_id", "0a", "fallback_class", "relay", "actual_actors", "metadata", "w:biz", "5", "connected-limit", "notice", "0b", "host_storage", "fb_page", "subject", "privatestats", "invis", "groupadd", "010", "note.m4r", "uuid", "0c", "8000", "sun", "372", "1020", "stage", "1200", "720", "canonical", "fb", "011", "video_duration", "0d", "1140", "superadmin", "012", "Opening.m4r", "keystore_attestation", "dleq_proof", "013", "timestamp", "ab_key", "w:sync:app:state", "0e", "vertical", "600", "p_v_id", "6", "likes", "014", "500", "1260", "creator", "0f", "rte", "destination", "group", "group_info", "syncd_anti_tampering_fatal_exception_enabled", "015", "dl_bw", "Asia/Jakarta", "vp8/h.264", "online", "1320", "fb:multiway", "10", "timeout", "016", "nse_retry", "urn:xmpp:whatsapp:dirty", "017", "a_v_id", "web_shops_chat_header_button_enabled", "nse_call", "inactive-upgrade", "none", "web", "groups", "2250", "mms_hot_content_timespan_in_seconds", "contact_blacklist", "nse_read", "suspended_group_deletion_notification", "binary_version", "018", "https://www.whatsapp.com/otp/copy/", "reg_push", "shops_hide_catalog_attachment_entrypoint", "server_sync", ".", "ephemeral_messages_allowed_values", "019", "mms_vcache_aggregation_enabled", "iphone", "America/Argentina/Buenos_Aires", "01a", "mms_vcard_autodownload_size_kb", "nse_ver", "shops_header_dropdown_menu_item", "dhash", "catalog_status", "communities_mvp_new_iqs_serverprop", "blocklist", "default", "11", "ephemeral_messages_enabled", "01b", "original_dimensions", "8", "mms4_media_retry_notification_encryption_enabled", "mms4_server_error_receipt_encryption_enabled", "original_image_url", "sync", "multiway", "420", "companion_enc_static", "shops_profile_drawer_entrypoint", "01c", "vcard_as_document_size_kb", "status_video_max_duration", "request_image_url", "01d", "regular_high", "s_t", "abt", "share_ext_min_preliminary_image_quality", "01e", "32", "syncd_key_rotation_enabled", "data_namespace", "md_downgrade_read_receipts2", "patch", "polltype", "ephemeral_messages_setting", "userrate", "15", "partial_pjpeg_bw_threshold", "played-self", "catalog_exists", "01f", "mute_v2"],
  ["reject", "dirty", "announcement", "020", "13", "9", "status_video_max_bitrate", "fb:thrift_iq", "offline_batch", "022", "full", "ctwa_first_business_reply_logging", "h.264", "smax_id", "group_description_length", "https://www.whatsapp.com/otp/code", "status_image_max_edge", "smb_upsell_business_profile_enabled", "021", "web_upgrade_to_md_modal", "14", "023", "s_o", "smaller_video_thumbs_status_enabled", "media_max_autodownload", "960", "blocking_status", "peer_msg", "joinable_group_call_client_version", "group_call_video_maximization_enabled", "return_snapshot", "high", "America/Mexico_City", "entry_point_block_logging_enabled", "pop", "024", "1050", "16", "1380", "one_tap_calling_in_group_chat_size", "regular_low", "inline_joinable_education_enabled", "hq_image_max_edge", "locked", "America/Bogota", "smb_biztools_deeplink_enabled", "status_image_quality", "1088", "025", "payments_upi_intent_transaction_limit", "voip", "w:g2", "027", "md_pin_chat_enabled", "026", "multi_scan_pjpeg_download_enabled", "shops_product_grid", "transaction_id", "ctwa_context_enabled", "20", "fna", "hq_image_quality", "alt_jpeg_doc_detection_quality", "group_call_max_participants", "pkey", "America/Belem", "image_max_kbytes", "web_cart_v1_1_order_message_changes_enabled", "ctwa_context_enterprise_enabled", "urn:xmpp:whatsapp:account", "840", "Asia/Kuala_Lumpur", "max_participants", "video_remux_after_repair_enabled", "stella_addressbook_restriction_type", "660", "900", "780", "context_menu_ios13_enabled", "mute-state", "ref", "payments_request_messages", "029", "frskmsg", "vcard_max_size_kb", "sample_buffer_gif_player_enabled", "match_last_seen", "510", "4983", "video_max_bitrate", "028", "w:comms:chat", "17", "frequently_forwarded_max", "groups_privacy_blacklist", "Asia/Karachi", "02a", "web_download_document_thumb_mms_enabled", "02b", "hist_sync", "biz_block_reasons_version", "1024", "18", "web_is_direct_connection_for_plm_transparent", "view_once_write", "file_max_size", "paid_convo_id", "online_privacy_setting", "video_max_edge", "view_once_read", "enhanced_storage_management", "multi_scan_pjpeg_encoding_enabled", "ctwa_context_forward_enabled", "video_transcode_downgrade_enable", "template_doc_mime_types", "hq_image_bw_threshold", "30", "body", "u_aud_limit_sil_restarts_ctrl", "other", "participating", "w:biz:directory", "1110", "vp8", "4018", "meta", "doc_detection_image_max_edge", "image_quality", "1170", "02c", "smb_upsell_chat_banner_enabled", "key_expiry_time_second", "pid", "stella_interop_enabled", "19", "linked_device_max_count", "md_device_sync_enabled", "02d", "02e", "360", "enhanced_block_enabled", "ephemeral_icon_in_forwarding", "paid_convo_status", "gif_provider", "project_name", "server-error", "canonical_url_validation_enabled", "wallpapers_v2", "syncd_clear_chat_delete_chat_enabled", "medianotify", "02f", "shops_required_tos_version", "vote", "reset_skey_on_id_change", "030", "image_max_edge", "multicast_limit_global", "ul_bw", "21", "25", "5000", "poll", "570", "22", "031", "1280", "WhatsApp", "032", "bloks_shops_enabled", "50", "upload_host_switching_enabled", "web_ctwa_context_compose_enabled", "ptt_forwarded_features_enabled", "unblocked", "partial_pjpeg_enabled", "fbid:devices", "height", "ephemeral_group_query_ts", "group_join_permissions", "order", "033", "alt_jpeg_status_quality", "migrate", "popular-bank", "win_uwp_deprecation_killswitch_enabled", "web_download_status_thumb_mms_enabled", "blocking", "url_text", "035", "web_forwarding_limit_to_groups", "1600", "val", "1000", "syncd_msg_date_enabled", "bank-ref-id", "max_subject", "payments_web_enabled", "web_upload_document_thumb_mms_enabled", "size", "request", "ephemeral", "24", "receipt_agg", "ptt_remember_play_position", "sampling_weight", "enc_rekey", "mute_always", "037", "034", "23", "036", "action", "click_to_chat_qr_enabled", "width", "disabled", "038", "md_blocklist_v2", "played_self_enabled", "web_buttons_message_enabled", "flow_id", "clear", "450", "fbid:thread", "bloks_session_state", "America/Lima", "attachment_picker_refresh", "download_host_switching_enabled", "1792", "u_aud_limit_sil_restarts_test2", "custom_urls", "device_fanout", "optimistic_upload", "2000", "key_cipher_suite", "web_smb_upsell_in_biz_profile_enabled", "e", "039", "siri_post_status_shortcut", "pair-device", "lg", "lc", "stream_attribution_url", "model", "mspjpeg_phash_gen", "catalog_send_all", "new_multi_vcards_ui", "share_biz_vcard_enabled", "-", "clean", "200", "md_blocklist_v2_server", "03b", "03a", "web_md_migration_experience", "ptt_conversation_waveform", "u_aud_limit_sil_restarts_test1"],
  ["64", "ptt_playback_speed_enabled", "web_product_list_message_enabled", "paid_convo_ts", "27", "manufacturer", "psp-routing", "grp_uii_cleanup", "ptt_draft_enabled", "03c", "business_initiated", "web_catalog_products_onoff", "web_upload_link_thumb_mms_enabled", "03e", "mediaretry", "35", "hfm_string_changes", "28", "America/Fortaleza", "max_keys", "md_mhfs_days", "streaming_upload_chunk_size", "5541", "040", "03d", "2675", "03f", "...", "512", "mute", "48", "041", "alt_jpeg_quality", "60", "042", "md_smb_quick_reply", "5183", "c", "1343", "40", "1230", "043", "044", "mms_cat_v1_forward_hot_override_enabled", "user_notice", "ptt_waveform_send", "047", "Asia/Calcutta", "250", "md_privacy_v2", "31", "29", "128", "md_messaging_enabled", "046", "crypto", "690", "045", "enc_iv", "75", "failure", "ptt_oot_playback", "AIzaSyDR5yfaG7OG8sMTUj8kfQEb8T9pN8BM6Lk", "w", "048", "2201", "web_large_files_ui", "Asia/Makassar", "812", "status_collapse_muted", "1334", "257", "2HP4dm", "049", "patches", "1290", "43cY6T", "America/Caracas", "web_sticker_maker", "campaign", "ptt_pausable_enabled", "33", "42", "attestation", "biz", "04b", "query_linked", "s", "125", "04a", "810", "availability", "1411", "responsiveness_v2_m1", "catalog_not_created", "34", "America/Santiago", "1465", "enc_p", "04d", "status_info", "04f", "key_version", "..", "04c", "04e", "md_group_notification", "1598", "1215", "web_cart_enabled", "37", "630", "1920", "2394", "-1", "vcard", "38", "elapsed", "36", "828", "peer", "pricing_category", "1245", "invalid", "stella_ios_enabled", "2687", "45", "1528", "39", "u_is_redial_audio_1104_ctrl", "1025", "1455", "58", "2524", "2603", "054", "bsp_system_message_enabled", "web_pip_redesign", "051", "verify_apps", "1974", "1272", "1322", "1755", "052", "70", "050", "1063", "1135", "1361", "80", "1096", "1828", "1851", "1251", "1921", "key_config_id", "1254", "1566", "1252", "2525", "critical_block", "1669", "max_available", "w:auth:backup:token", "product", "2530", "870", "1022", "participant_uuid", "web_cart_on_off", "1255", "1432", "1867", "41", "1415", "1440", "240", "1204", "1608", "1690", "1846", "1483", "1687", "1749", "69", "url_number", "053", "1325", "1040", "365", "59", "Asia/Riyadh", "1177", "test_recommended", "057", "1612", "43", "1061", "1518", "1635", "055", "1034", "1375", "750", "1430", "event_code", "1682", "503", "55", "865", "78", "1309", "1365", "44", "America/Guayaquil", "535", "LIMITED", "1377", "1613", "1420", "1599", "1822", "05a", "1681", "password", "1111", "1214", "1376", "1478", "47", "1082", "4282", "Europe/Istanbul", "1307", "46", "058", "1124", "256", "rate-overlimit", "retail", "u_a_socket_err_fix_succ_test", "1292", "1370", "1388", "520", "861", "psa", "regular", "1181", "1766", "05b", "1183", "1213", "1304", "1537"],
  ["1724", "profile_picture", "1071", "1314", "1605", "407", "990", "1710", "746", "pricing_model", "056", "059", "061", "1119", "6027", "65", "877", "1607", "05d", "917", "seen", "1516", "49", "470", "973", "1037", "1350", "1394", "1480", "1796", "keys", "794", "1536", "1594", "2378", "1333", "1524", "1825", "116", "309", "52", "808", "827", "909", "495", "1660", "361", "957", "google", "1357", "1565", "1967", "996", "1775", "586", "736", "1052", "1670", "bank", "177", "1416", "2194", "2222", "1454", "1839", "1275", "53", "997", "1629", "6028", "smba", "1378", "1410", "05c", "1849", "727", "create", "1559", "536", "1106", "1310", "1944", "670", "1297", "1316", "1762", "en", "1148", "1295", "1551", "1853", "1890", "1208", "1784", "7200", "05f", "178", "1283", "1332", "381", "643", "1056", "1238", "2024", "2387", "179", "981", "1547", "1705", "05e", "290", "903", "1069", "1285", "2436", "062", "251", "560", "582", "719", "56", "1700", "2321", "325", "448", "613", "777", "791", "51", "488", "902", "Asia/Almaty", "is_hidden", "1398", "1527", "1893", "1999", "2367", "2642", "237", "busy", "065", "067", "233", "590", "993", "1511", "54", "723", "860", "363", "487", "522", "605", "995", "1321", "1691", "1865", "2447", "2462", "NON_TRANSACTIONAL", "433", "871", "432", "1004", "1207", "2032", "2050", "2379", "2446", "279", "636", "703", "904", "248", "370", "691", "700", "1068", "1655", "2334", "060", "063", "364", "533", "534", "567", "1191", "1210", "1473", "1827", "069", "701", "2531", "514", "prev_dhash", "064", "496", "790", "1046", "1139", "1505", "1521", "1108", "207", "544", "637", "final", "1173", "1293", "1694", "1939", "1951", "1993", "2353", "2515", "504", "601", "857", "modify", "spam_request", "p_121_aa_1101_test4", "866", "1427", "1502", "1638", "1744", "2153", "068", "382", "725", "1704", "1864", "1990", "2003", "Asia/Dubai", "508", "531", "1387", "1474", "1632", "2307", "2386", "819", "2014", "066", "387", "1468", "1706", "2186", "2261", "471", "728", "1147", "1372", "1961"]
];
var TokenToIndex = {};
SingleByteTokens.forEach((token, idx) => {
  if (token) TokenToIndex[token] = idx;
});
var DoubleTokenToIndex = {};
DoubleByteTokens.forEach((dict, dictIdx) => {
  dict.forEach((token, tokenIdx) => {
    if (token) DoubleTokenToIndex[token] = { dict: dictIdx, index: tokenIdx };
  });
});

// src/e2ee/transport/binary/decoder.ts
init_cjs_shims();
var import_node_zlib = require("zlib");
var BinaryDecoder = class {
  data;
  index = 0;
  constructor(data) {
    this.data = data;
  }
  readByte() {
    if (this.index >= this.data.length) throw new Error("EOF");
    const val = this.data[this.index++];
    if (val === void 0) throw new Error("EOF");
    return val;
  }
  readInt8() {
    return this.readByte();
  }
  readInt16() {
    const val = this.data.readUInt16BE(this.index);
    this.index += 2;
    return val;
  }
  readInt20() {
    const b1 = this.data[this.index];
    const b2 = this.data[this.index + 1];
    const b3 = this.data[this.index + 2];
    if (b1 === void 0 || b2 === void 0 || b3 === void 0) throw new Error("EOF");
    const val = ((b1 & 15) << 16) + (b2 << 8) + b3;
    this.index += 3;
    return val;
  }
  readInt32() {
    const val = this.data.readUInt32BE(this.index);
    this.index += 4;
    return val;
  }
  readListSize(tag) {
    switch (tag) {
      case 0 /* ListEmpty */:
        return 0;
      case 248 /* List8 */:
        return this.readInt8();
      case 249 /* List16 */:
        return this.readInt16();
      default:
        throw new Error("Invalid list size tag: " + tag);
    }
  }
  readString(tag) {
    if (tag >= 1 && tag < SingleByteTokens.length) {
      return SingleByteTokens[tag] || "";
    }
    switch (tag) {
      case 236 /* Dictionary0 */:
      case 237 /* Dictionary1 */:
      case 238 /* Dictionary2 */:
      case 239 /* Dictionary3 */:
        const dictIdx = tag - 236 /* Dictionary0 */;
        const innerIdx = this.readInt8();
        const dict = DoubleByteTokens[dictIdx];
        if (!dict) throw new Error("Invalid dictionary index: " + dictIdx);
        return dict[innerIdx] || "";
      case 252 /* Binary8 */:
        return this.readRaw(this.readInt8()).toString();
      case 253 /* Binary20 */:
        return this.readRaw(this.readInt20()).toString();
      case 254 /* Binary32 */:
        return this.readRaw(this.readInt32()).toString();
      case 255 /* Nibble8 */:
      case 251 /* Hex8 */:
        return this.readPacked8(tag);
      default:
        throw new Error("Invalid string tag: " + tag);
    }
  }
  readRaw(len) {
    if (this.index + len > this.data.length) {
      throw new Error(`BinaryReader: Read out of bounds (index=${this.index}, len=${len}, dataLen=${this.data.length})`);
    }
    const val = this.data.subarray(this.index, this.index + len);
    this.index += len;
    return val;
  }
  readPacked8(tag) {
    const startByte = this.readByte();
    const len = startByte & 127;
    let res = "";
    for (let i = 0; i < len; i++) {
      const b = this.readByte();
      res += this.unpackByte(tag, (b & 240) >> 4);
      res += this.unpackByte(tag, b & 15);
    }
    if (startByte >> 7 !== 0 && tag === 251 /* Hex8 */) res = res.slice(0, -1);
    return res;
  }
  unpackByte(tag, val) {
    if (tag === 255 /* Nibble8 */) {
      if (val < 10) return String.fromCharCode(48 + val);
      if (val === 10) return "-";
      if (val === 11) return ".";
      if (val === 15) return "";
    } else if (tag === 251 /* Hex8 */) {
      if (val < 10) return String.fromCharCode(48 + val);
      if (val < 16) return String.fromCharCode(65 + val - 10);
    }
    return "";
  }
  readNode() {
    const listSize = this.readListSize(this.readByte());
    const tag = this.readString(this.readByte());
    const attrs = {};
    const attrCount = listSize - 1 >> 1;
    for (let i = 0; i < attrCount; i++) {
      const key = this.readString(this.readByte());
      const val = this.read(true);
      attrs[key] = val;
    }
    let content;
    if (listSize % 2 === 0) {
      content = this.read(false);
    }
    return { tag, attrs, content };
  }
  read(asString) {
    const tag = this.readByte();
    if (tag === 0 /* ListEmpty */) return null;
    if (tag === 248 /* List8 */ || tag === 249 /* List16 */) {
      const size = this.readListSize(tag);
      const res = [];
      for (let i = 0; i < size; i++) res.push(this.readNode());
      return res;
    }
    if (tag === 252 /* Binary8 */) return this.readBytesOrString(this.readInt8(), asString);
    if (tag === 253 /* Binary20 */) return this.readBytesOrString(this.readInt20(), asString);
    if (tag === 254 /* Binary32 */) return this.readBytesOrString(this.readInt32(), asString);
    if (tag === 250 /* JIDPair */) {
      const user = this.read(true);
      const server = this.read(true);
      return (user ? user + "@" : "") + server;
    }
    if (tag === 246 /* FBJID */) {
      const user = this.read(true);
      const device = this.readInt16();
      const server = this.read(true);
      return `${user}.${device}@${server}`;
    }
    if (tag === 247 /* ADJID */) {
      const agent = this.readByte();
      const device = this.readByte();
      const user = this.read(true);
      return `${user}.${agent}:${device}@s.whatsapp.net`;
    }
    return this.readString(tag);
  }
  readBytesOrString(len, asString) {
    const raw = this.readRaw(len);
    return asString ? raw.toString() : raw;
  }
};
function unmarshal(data) {
  if (data.length === 0) throw new Error("Empty data in unmarshal");
  const dataType = data[0];
  let body = data.subarray(1);
  if (dataType !== void 0 && dataType & 2) {
    body = (0, import_node_zlib.inflateSync)(body);
  }
  return new BinaryDecoder(body).readNode();
}

// src/e2ee/transport/binary/encoder.ts
init_cjs_shims();
function marshal(node) {
  const buf = Buffer.isBuffer(node) ? node : encodeNode(node.tag, node.attrs, node.content);
  return Buffer.concat([Buffer.from([0]), buf]);
}
function encodeNode(tag, attrs, children) {
  const hasContent = children !== void 0;
  const listSize = 1 + Object.keys(attrs).length * 2 + (hasContent ? 1 : 0);
  const chunks = [encodeListStart(listSize), encodeString(tag)];
  const JID_ATTRIBUTES = /* @__PURE__ */ new Set(["to", "from", "jid", "participant", "recipient", "target"]);
  for (const [k, v] of Object.entries(attrs)) {
    chunks.push(encodeString(k));
    if (typeof v === "string" && (v.includes("@") || JID_ATTRIBUTES.has(k))) {
      chunks.push(encodeJID(v));
    } else {
      chunks.push(encodeString(String(v)));
    }
  }
  if (hasContent) {
    if (Array.isArray(children)) {
      chunks.push(encodeNodeList(children));
    } else if (Buffer.isBuffer(children)) {
      chunks.push(encodeStringRaw(children));
    } else {
      chunks.push(encodeString(String(children)));
    }
  }
  return Buffer.concat(chunks);
}
function encodeNodeList(nodes) {
  return Buffer.concat([encodeListStart(nodes.length), ...nodes]);
}
function encodeListStart(size) {
  if (size === 0) return Buffer.from([0 /* ListEmpty */]);
  if (size < 256) return Buffer.from([248 /* List8 */, size]);
  if (size < 65536) {
    const out = Buffer.alloc(3);
    out[0] = 249 /* List16 */;
    out.writeUInt16BE(size, 1);
    return out;
  }
  throw new Error("List too large");
}
function encodeString(val) {
  const token = TokenToIndex[val];
  if (typeof token === "number") return Buffer.from([token]);
  const doubleToken = DoubleTokenToIndex[val];
  if (doubleToken) {
    return Buffer.from([236 /* Dictionary0 */ + doubleToken.dict, doubleToken.index]);
  }
  return encodeStringRaw(Buffer.from(val));
}
function encodeStringRaw(buf) {
  if (buf.length < 256) return Buffer.concat([Buffer.from([252 /* Binary8 */, buf.length]), buf]);
  if (buf.length < 1048576) {
    const header2 = Buffer.alloc(4);
    header2[0] = 253 /* Binary20 */;
    header2[1] = buf.length >> 16 & 255;
    header2[2] = buf.length >> 8 & 255;
    header2[3] = buf.length & 255;
    return Buffer.concat([header2, buf]);
  }
  const header = Buffer.alloc(5);
  header[0] = 254 /* Binary32 */;
  header.writeUInt32BE(buf.length, 1);
  return Buffer.concat([header, buf]);
}
function encodeJID(jid) {
  const atIdx = jid.indexOf("@");
  if (atIdx === -1) return encodeString(jid);
  const userFull = jid.slice(0, atIdx);
  const server = jid.slice(atIdx + 1);
  if (server === "msgr") {
    let user = userFull;
    let device = 0;
    const dotIdx = userFull.indexOf(".");
    const colonIdx = userFull.indexOf(":");
    const splitIdx = dotIdx !== -1 ? dotIdx : colonIdx;
    if (splitIdx !== -1) {
      user = userFull.slice(0, splitIdx);
      device = parseInt(userFull.slice(splitIdx + 1));
    }
    const chunks2 = [Buffer.from([246 /* FBJID */]), encodeString(user)];
    const devBuf = Buffer.alloc(2);
    devBuf.writeUInt16BE(device);
    chunks2.push(devBuf);
    chunks2.push(encodeString(server));
    return Buffer.concat(chunks2);
  }
  if (server === "s.whatsapp.net" && (userFull.includes(".") || userFull.includes(":"))) {
    let user = userFull;
    let agent = 0;
    let device = 0;
    const dotIdx = userFull.indexOf(".");
    const colonIdx = userFull.indexOf(":");
    if (dotIdx !== -1 && colonIdx !== -1) {
      user = userFull.slice(0, dotIdx);
      agent = parseInt(userFull.slice(dotIdx + 1, colonIdx));
      device = parseInt(userFull.slice(colonIdx + 1));
    } else if (dotIdx !== -1) {
      user = userFull.slice(0, dotIdx);
      device = parseInt(userFull.slice(dotIdx + 1));
    }
    return Buffer.concat([
      Buffer.from([247 /* ADJID */, agent, device]),
      encodeString(user)
    ]);
  }
  const chunks = [Buffer.from([250 /* JIDPair */])];
  if (userFull) {
    chunks.push(encodeString(userFull));
  } else {
    chunks.push(Buffer.from([0 /* ListEmpty */]));
  }
  chunks.push(encodeString(server));
  return Buffer.concat(chunks);
}

// src/e2ee/transport/binary/stanzas.ts
init_cjs_shims();
var UNIFIED_OFFSET_MS = 3 * 24 * 60 * 60 * 1e3;
var WEEK_MS = 7 * 24 * 60 * 60 * 1e3;
function buildUnifiedSessionId(nowMs = Date.now(), serverOffsetMs = 0) {
  const unifiedTs = nowMs + serverOffsetMs + UNIFIED_OFFSET_MS;
  return String(unifiedTs % WEEK_MS);
}
function encodePresenceAvailable(passive) {
  const attrs = { type: "available" };
  if (passive !== void 0) attrs.passive = passive;
  return marshal(encodeNode("presence", attrs));
}
function encodePrimingNode(sessionId) {
  const unifiedSession = encodeNode("unified_session", { id: sessionId });
  const offlineNode = encodeNode("offline", {});
  const accountSync = encodeNode("dirty", { type: "account_sync" });
  return marshal(encodeNode("ib", {}, [unifiedSession, offlineNode, accountSync]));
}
function encodeKeepAlive(id) {
  return marshal(encodeNode("iq", {
    id,
    to: "s.whatsapp.net",
    type: "get",
    xmlns: "w:p"
  }));
}
function encodeSetPassive(id, passive) {
  return marshal(encodeNode("iq", {
    id,
    to: "s.whatsapp.net",
    type: "set",
    xmlns: "passive"
  }, [
    encodeNode(passive ? "passive" : "active", {})
  ]));
}
function encodeIQ(attrs, children) {
  return marshal(encodeNode("iq", attrs, children));
}
function encodePreKeyUpload(registrationId, identityPub, signedPreKey, preKeys) {
  const regBuf = Buffer.alloc(4);
  regBuf.writeUInt32BE(registrationId);
  const children = [
    encodeNode("registration", {}, regBuf),
    encodeNode("type", {}, Buffer.from([5])),
    encodeNode("identity", {}, identityPub),
    encodeNode("list", {}, preKeys.map((pk) => encodePreKeyNode(pk, "key"))),
    encodePreKeyNode(signedPreKey, "skey")
  ];
  return encodeIQ({
    id: `pk-${Date.now()}`,
    to: "s.whatsapp.net",
    type: "set",
    xmlns: "encrypt"
  }, children);
}
function encodePreKeyNode(pk, tag) {
  const idBuf = Buffer.alloc(4);
  idBuf.writeUInt32BE(pk.id);
  const children = [
    encodeNode("id", {}, idBuf.subarray(1)),
    // 3-byte ID
    encodeNode("value", {}, pk.pubKey)
  ];
  if (pk.signature) {
    children.push(encodeNode("signature", {}, pk.signature));
  }
  return encodeNode(tag, {}, children);
}

// src/services/auth.service.ts
init_cjs_shims();
var import_promises = require("fs/promises");
var AuthService = class {
  constructor(sessionRepository) {
    this.sessionRepository = sessionRepository;
  }
  sessionRepository;
  async readAppState(config) {
    let parsed;
    if (config.appState) {
      if (typeof config.appState === "string") {
        parsed = JSON.parse(config.appState);
      } else {
        parsed = config.appState;
      }
    } else if (config.appStatePath) {
      const raw = await (0, import_promises.readFile)(config.appStatePath, "utf-8");
      parsed = JSON.parse(raw);
    } else {
      throw new Error("Either appState or appStatePath must be provided");
    }
    if (!Array.isArray(parsed)) {
      throw new Error("Invalid appState format: expected an array");
    }
    return parsed.map((item) => {
      const cookie = item;
      return {
        key: String(cookie.key ?? cookie.name ?? ""),
        value: String(cookie.value ?? ""),
        domain: typeof cookie.domain === "string" ? cookie.domain : ".facebook.com",
        path: typeof cookie.path === "string" ? cookie.path : "/",
        expires: typeof cookie.expires === "number" && Number.isFinite(cookie.expires) ? cookie.expires : typeof cookie.expirationDate === "number" && Number.isFinite(cookie.expirationDate) ? cookie.expirationDate : Date.now() + 1e3 * 60 * 60 * 24 * 365
      };
    });
  }
  async saveSession(path, session) {
    await this.sessionRepository.write(path, session);
  }
  async loadSession(path) {
    return this.sessionRepository.read(path);
  }
};

// src/services/facebook-gateway.service.ts
init_cjs_shims();
var import_node_module = require("module");
var import_node_stream = require("stream");
var import_node_buffer = require("buffer");
var import_node_crypto = require("crypto");

// src/utils/logger.ts
init_cjs_shims();
var isDebug = !!process.env.DEBUG || process.env.NODE_ENV === "development";
var logger = {
  info: (...args) => {
    console.log(...args);
  },
  debug: (...args) => {
    if (isDebug) {
      console.log(...args);
    }
  },
  warn: (...args) => {
    console.warn(...args);
  },
  error: (...args) => {
    console.error(...args);
  }
};

// src/services/facebook-gateway.service.ts
var require2 = (0, import_node_module.createRequire)(importMetaUrl);
var fcaLogin = require2("fca-unofficial");
function normalizeError(error) {
  if (error instanceof Error) {
    return error;
  }
  if (typeof error === "string") {
    return new Error(error);
  }
  return new Error("Unknown FCA error");
}
var FacebookGatewayService = class {
  async login(appState) {
    return new Promise((resolve, reject) => {
      fcaLogin({ appState }, {}, (err, api) => {
        if (err) {
          reject(normalizeError(err));
          return;
        }
        if (!api) {
          reject(new Error("Login succeeded without API instance"));
          return;
        }
        resolve(api);
      });
    });
  }
  configure(api) {
    api.setOptions?.({
      selfListen: false,
      listenEvents: true,
      autoMarkRead: false,
      autoMarkDelivery: false,
      online: true
    });
  }
  async startListening(api, onEvent, onError) {
    await Promise.resolve(
      api.listenMqtt((err, event) => {
        if (err) {
          onError(normalizeError(err));
          return;
        }
        if (event && typeof event === "object") {
          onEvent(event);
        }
      })
    );
  }
  async sendMessage(api, threadId, text, replyToMessageId) {
    const response = await Promise.resolve(api.sendMessage(text, threadId, void 0, replyToMessageId));
    return response ?? {};
  }
  async sendAttachmentMessage(api, input) {
    const stream = import_node_stream.Readable.from(input.data);
    Object.assign(stream, { path: input.fileName });
    const payload = {
      body: input.caption ?? "",
      attachment: stream
    };
    const response = await Promise.resolve(
      api.sendMessage(payload, input.threadId, void 0, input.replyToMessageId)
    );
    return response ?? {};
  }
  async sendReaction(api, messageId, reaction) {
    if (!api.setMessageReaction) {
      throw new Error("setMessageReaction is not available in fca-unofficial");
    }
    await Promise.resolve(api.setMessageReaction(reaction, messageId, void 0, true));
  }
  async unsendMessage(api, messageId) {
    if (!api.unsendMessage) {
      throw new Error("unsendMessage is not available in fca-unofficial");
    }
    await Promise.resolve(api.unsendMessage(messageId));
  }
  async sendTyping(api, threadId, isTyping) {
    if (!api.sendTypingIndicator) {
      throw new Error("sendTypingIndicator is not available in fca-unofficial");
    }
    await Promise.resolve(api.sendTypingIndicator(isTyping, threadId));
  }
  async markAsRead(api, threadId) {
    if (!api.markAsRead) {
      throw new Error("markAsRead is not available in fca-unofficial");
    }
    await Promise.resolve(api.markAsRead(threadId, true));
  }
  async sendStickerMessage(api, input) {
    const payload = { sticker: input.stickerId };
    const response = await Promise.resolve(
      api.sendMessage(payload, input.threadId, void 0, input.replyToMessageId)
    );
    return response ?? {};
  }
  stop(api) {
    api.stopListenMqtt?.();
  }
  /**
   * Fetch the Crypto Auth Token (CAT) required for E2EE connection.
   * This uses the MAWCatQuery GraphQL document.
   */
  async fetchCAT(api) {
    const fb_dtsg = api.fb_dtsg;
    const userId = api.getCurrentUserID();
    logger.debug("FacebookGatewayService", "Fetching CAT via GraphQL...");
    const resText = await api.httpPost("https://www.facebook.com/api/graphql/", {
      fb_dtsg,
      variables: "{}",
      doc_id: "23999698219677129",
      __user: userId,
      __a: "1",
      __jssesw: "1",
      server_timestamps: "true"
    });
    const cleanText = resText.replace("for (;;);", "").trim();
    let data;
    try {
      data = JSON.parse(cleanText);
    } catch (e) {
      logger.error("FacebookGatewayService", "Failed to parse CAT response:", resText);
      throw new Error("Failed to parse CAT response");
    }
    const cat = data?.data?.secure_message_over_wa_cat_query?.encrypted_serialized_cat;
    if (!cat) {
      logger.error("FacebookGatewayService", "CAT GraphQL response (no cat):", resText);
      throw new Error("Failed to extract CAT token from GraphQL response");
    }
    logger.debug("FacebookGatewayService", `CAT fetched successfully. Length: ${cat.length}, Prefix: ${cat.slice(0, 20)}...`);
    return cat;
  }
  /**
   * Fetch ICDC metadata for the user.
   */
  async fetchICDC(api, fbid, deviceId, fbCat) {
    if (typeof api.httpPost !== "function") {
      throw new Error("api.httpPost is required for ICDC fetch");
    }
    const resText = await api.httpPost("https://reg-e2ee.facebook.com/v2/fb_icdc_fetch", {
      fbid,
      fb_cat: fbCat.toString("utf8"),
      // Assuming it's the base64 string
      app_id: "256002347743983",
      device_id: deviceId
    });
    if (!resText) throw new Error("Empty response from icdc_fetch");
    return JSON.parse(resText);
  }
  /**
   * Register the device for ICDC.
   */
  async registerICDC(api, fbid, deviceId, fbCat, payload) {
    if (typeof api.httpPost !== "function") {
      throw new Error("api.httpPost is required for ICDC register");
    }
    const fullPayload = {
      fbid,
      fb_cat: fbCat.toString("base64"),
      app_id: "256002347743983",
      device_id: deviceId,
      ...payload
    };
    const appState = api.getAppState?.();
    const cookies = (appState || []).map((c) => `${c.key}=${c.value}`).join("; ");
    const userAgent = "Facebook Messenger/441.1.0.32.115 (Android 13; 480dpi; 1080x2236; Xiaomi; 2210132G; cupid; qcom; en_US; 555627749)";
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(fullPayload)) {
      params.append(key, String(value));
    }
    logger.debug("FacebookGatewayService", "Sending ICDC registration via api.httpPost...");
    const resText = await api.httpPost("https://reg-e2ee.facebook.com/v2/fb_register_v2", fullPayload);
    logger.debug("FacebookGatewayService", "Raw Register Response:", resText);
    if (!resText) throw new Error("Empty response from icdc_register");
    return JSON.parse(resText);
  }
};

// src/services/media.service.ts
init_cjs_shims();
var https = __toESM(require("https"), 1);
var http = __toESM(require("http"), 1);

// src/utils/fca-utils.ts
init_cjs_shims();
function str(v) {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") return String(v);
  return "";
}
function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function now() {
  return Date.now();
}

// src/services/media.service.ts
var MediaService = class {
  constructor(gateway) {
    this.gateway = gateway;
  }
  gateway;
  // Media send
  async sendImage(api, input) {
    return this.gateway.sendAttachmentMessage(api, {
      threadId: input.threadId,
      data: input.data,
      fileName: input.fileName,
      caption: input.caption,
      replyToMessageId: input.replyToMessageId
    });
  }
  async sendVideo(api, input) {
    return this.gateway.sendAttachmentMessage(api, {
      threadId: input.threadId,
      data: input.data,
      fileName: input.fileName,
      caption: input.caption,
      replyToMessageId: input.replyToMessageId
    });
  }
  async sendAudio(api, input) {
    return this.gateway.sendAttachmentMessage(api, {
      threadId: input.threadId,
      data: input.data,
      fileName: input.fileName,
      caption: input.caption,
      replyToMessageId: input.replyToMessageId
    });
  }
  async sendFile(api, input) {
    return this.gateway.sendAttachmentMessage(api, {
      threadId: input.threadId,
      data: input.data,
      fileName: input.fileName,
      caption: input.caption,
      replyToMessageId: input.replyToMessageId
    });
  }
  async sendSticker(api, input) {
    return this.gateway.sendStickerMessage(api, {
      threadId: input.threadId,
      stickerId: input.stickerId,
      replyToMessageId: input.replyToMessageId
    });
  }
  // Media download
  /**
   * Downloads raw bytes from a Facebook CDN URL.
   * Uses Node's built-in https/http since fca-unofficial does not expose a
   * dedicated download API at the JS level (unlike the Go messagix client).
   */
  async downloadMedia(input) {
    return downloadUrl(input.url);
  }
  // Attachment normalisation helper (used by client controller)
  normalizeAttachment(item) {
    if (typeof item !== "object" || item === null) {
      return null;
    }
    const att = item;
    const type = typeof att.type === "string" ? att.type : "";
    if (!type) return null;
    const base = {
      url: str(att.url ?? att.previewUrl ?? att.largePreviewUrl),
      fileName: str(att.filename ?? att.name),
      mimeType: str(att.mimeType),
      fileSize: num(att.fileSize),
      mediaKey: str(att.mediaKey) || void 0,
      mediaSha256: str(att.mediaSha256) || void 0,
      mediaEncSha256: str(att.mediaEncSha256) || void 0,
      directPath: str(att.directPath) || void 0
    };
    switch (type) {
      case "image":
      case "gif":
      case "photo":
        return {
          ...base,
          type,
          width: num(att.width),
          height: num(att.height),
          previewUrl: str(att.thumbnailUrl ?? att.previewUrl)
        };
      case "video":
        return {
          ...base,
          type,
          width: num(att.width),
          height: num(att.height),
          duration: num(att.duration ?? att.durationMs),
          previewUrl: str(att.thumbnailUrl ?? att.previewUrl)
        };
      case "audio":
      case "voice":
        return {
          ...base,
          type,
          duration: num(att.duration ?? att.durationMs)
        };
      case "sticker":
        return {
          ...base,
          type,
          stickerID: num(att.stickerID)
        };
      case "location":
        return {
          ...base,
          type,
          latitude: num(att.latitude),
          longitude: num(att.longitude)
        };
      case "link":
        return {
          ...base,
          type,
          description: str(att.description),
          sourceText: str(att.source),
          previewUrl: str(att.thumbnailUrl ?? att.previewUrl)
        };
      default:
        return {
          ...base,
          type: "file"
        };
    }
  }
  // Thread / group management (mirrors bridge-go media.go)
  async muteThread(api, input) {
    if (!api.muteThread) {
      throw new Error("muteThread not available in fca-unofficial");
    }
    await Promise.resolve(api.muteThread(input.threadId, input.muteSeconds));
  }
  async renameThread(api, input) {
    if (!api.setTitle) {
      throw new Error("setTitle not available in fca-unofficial");
    }
    await Promise.resolve(api.setTitle(input.newName, input.threadId));
  }
  async setGroupPhoto(api, input) {
    if (!api.changeGroupImage) {
      throw new Error("changeGroupImage not available in fca-unofficial");
    }
    await Promise.resolve(api.changeGroupImage(input.data, input.threadId));
  }
  async deleteThread(api, input) {
    if (!api.deleteThread) {
      throw new Error("deleteThread not available in fca-unofficial");
    }
    await Promise.resolve(api.deleteThread(input.threadId));
  }
  // User / search (mirrors bridge-go media.go SearchUsers / GetUserInfo / CreateThread)
  async searchUsers(api, input) {
    if (!api.searchUsers) {
      throw new Error("searchUsers not available in fca-unofficial");
    }
    const raw = await Promise.resolve(api.searchUsers(input.query));
    if (!raw) return [];
    const entries = Array.isArray(raw) ? raw.flatMap((item) => Object.entries(item)) : Object.entries(raw);
    return entries.map(([id, infoRaw]) => {
      const info = infoRaw;
      return {
        id,
        name: info.name ?? "",
        firstName: info.firstName,
        username: info.vanity,
        profilePictureUrl: info.thumbSrc,
        gender: info.gender
      };
    });
  }
  async getUserInfo(api, input) {
    if (!api.getUserInfo) {
      throw new Error("getUserInfo not available in fca-unofficial");
    }
    const raw = await Promise.resolve(api.getUserInfo(input.userId));
    if (!raw) return null;
    const info = raw[input.userId];
    if (!info) return null;
    return {
      id: input.userId,
      name: info.name ?? "",
      firstName: info.firstName,
      username: info.vanity,
      profilePictureUrl: info.thumbSrc,
      gender: info.gender
    };
  }
  async createThread(api, input) {
    if (!api.createNewGroup) {
      return { id: input.userId, type: 1, name: "", lastActivityTimestampMs: Date.now() };
    }
    const result = await Promise.resolve(
      api.createNewGroup([input.userId], "", void 0)
    );
    const threadId = str(result?.threadID ?? input.userId) || input.userId;
    return { id: threadId, type: 1, name: "", lastActivityTimestampMs: Date.now() };
  }
};
function downloadUrl(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    mod.get(url, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

// src/services/messaging.service.ts
init_cjs_shims();

// src/services/icdc.service.ts
init_cjs_shims();
var import_node_crypto4 = require("crypto");
var import_libsignal_client = require("@signalapp/libsignal-client");

// src/e2ee/facebook/icdc-payload.ts
init_cjs_shims();

// src/e2ee/message/message-builder.ts
init_cjs_shims();

// src/e2ee/message/constants.ts
init_cjs_shims();
var FB_MESSAGE_APPLICATION_VERSION = 2;
var FB_CONSUMER_MESSAGE_VERSION = 1;

// src/e2ee/message/proto/proto-writer.ts
init_cjs_shims();
var ProtoWriter = class {
  chunks = [];
  encodeVarint(value) {
    const bytes = [];
    let v = value >>> 0;
    while (v > 127) {
      bytes.push(v & 127 | 128);
      v >>>= 7;
    }
    bytes.push(v);
    return Buffer.from(bytes);
  }
  fieldHeader(fieldNum, wireType) {
    return this.encodeVarint(fieldNum << 3 | wireType);
  }
  /** Wire type 0 (varint) but supports bigint */
  encodeVarintBigInt(value) {
    const bytes = [];
    let v = value;
    while (v > 127n) {
      bytes.push(Number(v & 0x7fn | 0x80n));
      v >>= 7n;
    }
    bytes.push(Number(v));
    return Buffer.from(bytes);
  }
  /** Wire type 0 (varint) for uint64 fields */
  uint64_varint(fieldNum, value) {
    this.chunks.push(this.fieldHeader(fieldNum, 0));
    this.chunks.push(this.encodeVarintBigInt(value));
    return this;
  }
  /** Wire type 2 (length-delimited) - bytes, string, embedded message */
  bytes(fieldNum, data) {
    const d = Buffer.from(data);
    this.chunks.push(this.fieldHeader(fieldNum, 2));
    this.chunks.push(this.encodeVarint(d.length));
    this.chunks.push(d);
    return this;
  }
  string(fieldNum, value) {
    return this.bytes(fieldNum, Buffer.from(value, "utf8"));
  }
  /** Wire type 0 (varint) */
  varint(fieldNum, value) {
    this.chunks.push(this.fieldHeader(fieldNum, 0));
    this.chunks.push(this.encodeVarint(value));
    return this;
  }
  /** Wire type 0, bool */
  bool(fieldNum, value) {
    return this.varint(fieldNum, value ? 1 : 0);
  }
  /** Wire type 1 (64-bit fixed) - uint64 */
  uint64(fieldNum, value) {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(value);
    this.chunks.push(this.fieldHeader(fieldNum, 1));
    this.chunks.push(buf);
    return this;
  }
  build() {
    return Buffer.concat(this.chunks);
  }
};

// src/e2ee/message/builders/client-payload.ts
init_cjs_shims();
function encodeClientPayload(opts) {
  const appVersion = new ProtoWriter().varint(1, 301).varint(2, 0).varint(3, 2).build();
  const userAgent = new ProtoWriter().varint(1, 32).bytes(2, appVersion).string(3, "000").string(4, "000").string(5, "").string(6, "Linux").string(7, "Chrome").string(8, "").varint(10, 3).string(11, "en").string(12, "en").build();
  const UserAgentStr = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";
  let w = new ProtoWriter().uint64_varint(1, opts.username).bool(3, false).bytes(5, userAgent).varint(12, 1).varint(13, 1).varint(18, opts.deviceId).varint(20, 1).bytes(21, opts.fbCatBase64 ? Buffer.from(opts.fbCatBase64) : Buffer.alloc(0)).bytes(22, opts.fbUserAgent ?? Buffer.from(UserAgentStr)).bool(33, true);
  return w.build();
}

// src/e2ee/message/builders/consumer-application.ts
init_cjs_shims();
var MessageBuilder = class {
  content;
  replyTo;
  setReply(id, senderJid) {
    this.replyTo = { id, senderJid };
    return this;
  }
  getReply() {
    return this.replyTo;
  }
  setText(text) {
    this.content = { type: "text", text };
    return this;
  }
  setImage(media) {
    this.content = { type: "image", media };
    return this;
  }
  setVideo(media) {
    this.content = { type: "video", media };
    return this;
  }
  setAudio(media) {
    this.content = { type: "audio", media };
    return this;
  }
  setDocument(media) {
    this.content = { type: "document", media };
    return this;
  }
  setSticker(media) {
    this.content = { type: "sticker", media };
    return this;
  }
  setReaction(emoji, targetId) {
    this.content = { type: "reaction", emoji, targetId };
    return this;
  }
  setEdit(text, targetId) {
    this.content = { type: "edit", text, targetId };
    return this;
  }
  setRevoke(targetId, fromMe) {
    this.content = { type: "revoke", targetId, fromMe };
    return this;
  }
  build() {
    if (!this.content) throw new Error("Message content not set");
    switch (this.content.type) {
      case "text":
        return encodeTextMessage(this.content.text);
      case "image":
        return encodeImageMessage(this.content.media);
      case "video":
        return encodeVideoMessage(this.content.media);
      case "audio":
        return encodeAudioMessage(this.content.media);
      case "document":
        return encodeDocumentMessage(this.content.media);
      case "sticker":
        return encodeStickerMessage(this.content.media);
      case "reaction":
        return encodeReactionMessage(this.content.targetId, this.content.emoji);
      case "edit":
        return encodeEditMessage(this.content.targetId, this.content.text);
      case "revoke":
        return encodeRevokeMessage(this.content.targetId, this.content.fromMe);
      default:
        throw new Error("Unknown content type");
    }
  }
};
function encodeTextMessage(text) {
  const msgText = encodeMessageText(text);
  const content = new ProtoWriter().bytes(1, msgText).build();
  const payload = new ProtoWriter().bytes(1, content).build();
  return new ProtoWriter().bytes(1, payload).build();
}
function encodeMessageText(text) {
  return new ProtoWriter().string(1, text).build();
}
var MEDIA_TRANSPORT_VERSION = 1;
function encodeMediaSubProtocol(payload) {
  return new ProtoWriter().bytes(1, payload).varint(2, MEDIA_TRANSPORT_VERSION).build();
}
function mediaKeyTimestampSeconds(m) {
  const seconds = m.mediaKeyTimestamp ?? Math.floor(Date.now() / 1e3);
  return BigInt(Math.max(0, Math.trunc(seconds)));
}
function optionalDimension(value) {
  return value === void 0 ? void 0 : Math.max(0, Math.trunc(value));
}
function encodeDownloadableThumbnailMetadata(m) {
  const width = optionalDimension(m.width);
  const height = optionalDimension(m.height);
  if (width === void 0 && height === void 0) return void 0;
  let thumbnail = new ProtoWriter();
  if (width !== void 0) thumbnail = thumbnail.varint(3, width);
  if (height !== void 0) thumbnail = thumbnail.varint(4, height);
  return thumbnail.build();
}
function encodeCommonMediaTransport(m, includeThumbnailMetadata) {
  const integral = new ProtoWriter().bytes(1, m.fileSHA256).bytes(2, m.mediaKey).bytes(3, m.fileEncSHA256).string(4, m.directPath).uint64_varint(5, mediaKeyTimestampSeconds(m)).build();
  let ancillary = new ProtoWriter().uint64_varint(1, BigInt(Math.max(0, Math.trunc(m.fileLength)))).string(2, m.mimeType);
  const thumbnail = includeThumbnailMetadata ? encodeDownloadableThumbnailMetadata(m) : void 0;
  if (thumbnail) ancillary = ancillary.bytes(3, thumbnail);
  if (m.objectId) ancillary = ancillary.string(4, m.objectId);
  return new ProtoWriter().bytes(1, integral).bytes(2, ancillary.build()).build();
}
function encodeMediaTransportIntegral(commonTransport) {
  return new ProtoWriter().bytes(1, commonTransport).build();
}
function encodeImageTransportPayload(m) {
  const width = optionalDimension(m.width);
  const height = optionalDimension(m.height);
  const transport = encodeCommonMediaTransport(m, true);
  let ancillary = new ProtoWriter();
  if (height !== void 0) ancillary = ancillary.varint(1, height);
  if (width !== void 0) ancillary = ancillary.varint(2, width);
  return new ProtoWriter().bytes(1, encodeMediaTransportIntegral(transport)).bytes(2, ancillary.build()).build();
}
function encodeVideoTransportPayload(m) {
  const width = optionalDimension(m.width);
  const height = optionalDimension(m.height);
  const seconds = optionalDimension(m.seconds);
  const transport = encodeCommonMediaTransport(m, true);
  let ancillary = new ProtoWriter();
  if (seconds !== void 0) ancillary = ancillary.varint(1, seconds);
  ancillary = ancillary.bool(3, false);
  if (height !== void 0) ancillary = ancillary.varint(4, height);
  if (width !== void 0) ancillary = ancillary.varint(5, width);
  return new ProtoWriter().bytes(1, encodeMediaTransportIntegral(transport)).bytes(2, ancillary.build()).build();
}
function encodeAudioTransportPayload(m) {
  const seconds = optionalDimension(m.seconds);
  const transport = encodeCommonMediaTransport(m, false);
  let ancillary = new ProtoWriter();
  if (seconds !== void 0) ancillary = ancillary.varint(1, seconds);
  return new ProtoWriter().bytes(1, encodeMediaTransportIntegral(transport)).bytes(2, ancillary.build()).build();
}
function encodeDocumentTransportPayload(m) {
  const transport = encodeCommonMediaTransport(m, false);
  return new ProtoWriter().bytes(1, encodeMediaTransportIntegral(transport)).bytes(2, Buffer.alloc(0)).build();
}
function encodeStickerTransportPayload(m) {
  const width = optionalDimension(m.width);
  const height = optionalDimension(m.height);
  const transport = encodeCommonMediaTransport(m, true);
  const integral = new ProtoWriter().bytes(1, transport).build();
  let ancillary = new ProtoWriter();
  if (height !== void 0) ancillary = ancillary.varint(2, height);
  if (width !== void 0) ancillary = ancillary.varint(3, width);
  return new ProtoWriter().bytes(1, integral).bytes(2, ancillary.build()).build();
}
function encodeImageMessage(m) {
  let w = new ProtoWriter().bytes(1, encodeMediaSubProtocol(encodeImageTransportPayload(m)));
  if (m.caption) w = w.bytes(2, encodeMessageText(m.caption));
  const content = new ProtoWriter().bytes(2, w.build()).build();
  const payload = new ProtoWriter().bytes(1, content).build();
  return new ProtoWriter().bytes(1, payload).build();
}
function encodeVideoMessage(m) {
  let w = new ProtoWriter().bytes(1, encodeMediaSubProtocol(encodeVideoTransportPayload(m)));
  if (m.caption) w = w.bytes(2, encodeMessageText(m.caption));
  const content = new ProtoWriter().bytes(9, w.build()).build();
  const payload = new ProtoWriter().bytes(1, content).build();
  return new ProtoWriter().bytes(1, payload).build();
}
function encodeAudioMessage(m) {
  let w = new ProtoWriter().bytes(1, encodeMediaSubProtocol(encodeAudioTransportPayload(m)));
  if (m.ptt) w = w.bool(2, true);
  const content = new ProtoWriter().bytes(8, w.build()).build();
  const payload = new ProtoWriter().bytes(1, content).build();
  return new ProtoWriter().bytes(1, payload).build();
}
function encodeDocumentMessage(m) {
  let w = new ProtoWriter().bytes(1, encodeMediaSubProtocol(encodeDocumentTransportPayload(m)));
  if (m.fileName) w = w.string(2, m.fileName);
  const content = new ProtoWriter().bytes(7, w.build()).build();
  const payload = new ProtoWriter().bytes(1, content).build();
  return new ProtoWriter().bytes(1, payload).build();
}
function encodeStickerMessage(m) {
  const stickerMsg = new ProtoWriter().bytes(1, encodeMediaSubProtocol(encodeStickerTransportPayload(m))).build();
  const content = new ProtoWriter().bytes(12, stickerMsg).build();
  const payload = new ProtoWriter().bytes(1, content).build();
  return new ProtoWriter().bytes(1, payload).build();
}
function encodeMessageKey(messageId, keyOpts = {}) {
  let key = new ProtoWriter();
  if (keyOpts.remoteJid) key = key.string(1, keyOpts.remoteJid);
  if (typeof keyOpts.fromMe === "boolean") key = key.bool(2, keyOpts.fromMe);
  key = key.string(3, messageId);
  if (keyOpts.participant) key = key.string(4, keyOpts.participant);
  return key.build();
}
function encodeReactionMessage(targetMessageId, emoji, keyOpts = {}) {
  const reaction = new ProtoWriter().bytes(1, encodeMessageKey(targetMessageId, keyOpts)).string(2, emoji).uint64_varint(4, BigInt(keyOpts.senderTimestampMs ?? Date.now())).build();
  const content = new ProtoWriter().bytes(16, reaction).build();
  const payload = new ProtoWriter().bytes(1, content).build();
  return new ProtoWriter().bytes(1, payload).build();
}
function encodeEditMessage(targetMessageId, newText) {
  const key = new ProtoWriter().string(3, targetMessageId).build();
  const msgText = new ProtoWriter().string(1, newText).build();
  const edit = new ProtoWriter().bytes(1, key).bytes(2, msgText).uint64_varint(3, BigInt(Date.now())).build();
  const content = new ProtoWriter().bytes(19, edit).build();
  const payload = new ProtoWriter().bytes(1, content).build();
  return new ProtoWriter().bytes(1, payload).build();
}
function encodeRevokeMessage(messageId, keyOptsOrFromMe = true) {
  const keyOpts = typeof keyOptsOrFromMe === "boolean" ? { fromMe: keyOptsOrFromMe } : keyOptsOrFromMe;
  const revoke = new ProtoWriter().bytes(1, encodeMessageKey(messageId, keyOpts)).build();
  const applicationData = new ProtoWriter().bytes(1, revoke).build();
  const payload = new ProtoWriter().bytes(2, applicationData).build();
  return new ProtoWriter().bytes(1, payload).build();
}

// src/e2ee/message/builders/message-application.ts
init_cjs_shims();
var import_node_crypto2 = require("crypto");
function encodeMessageApplication(consumerAppBytes, replyTo) {
  const frankingKey = (0, import_node_crypto2.randomBytes)(32);
  const subProtocol = new ProtoWriter().bytes(1, consumerAppBytes).varint(2, FB_CONSUMER_MESSAGE_VERSION).build();
  const payloadSubProto = new ProtoWriter().varint(1, 0).bytes(2, subProtocol).build();
  const appPayload = new ProtoWriter().bytes(4, payloadSubProto).build();
  let metadataWriter = new ProtoWriter().bytes(8, frankingKey).varint(9, 0);
  if (replyTo) {
    const quoted = new ProtoWriter().string(1, replyTo.id).string(2, replyTo.senderJid).build();
    metadataWriter = metadataWriter.bytes(10, quoted);
  }
  const metadata = metadataWriter.build();
  const messageApp = new ProtoWriter().bytes(1, appPayload).bytes(2, metadata).build();
  const frankingTag = (0, import_node_crypto2.createHmac)("sha256", frankingKey).update(messageApp).digest();
  return { messageApp, frankingKey, frankingTag };
}

// src/e2ee/message/builders/message-transport.ts
init_cjs_shims();
var import_node_crypto3 = require("crypto");
function encodeMessageTransport(opts) {
  const padding = opts.padding ?? generatePadding();
  let payload;
  if (opts.messageApp) {
    const appPayload = new ProtoWriter().bytes(1, opts.messageApp).varint(2, FB_MESSAGE_APPLICATION_VERSION).build();
    payload = new ProtoWriter().bytes(1, appPayload).varint(3, 0).build();
  }
  let integral = new ProtoWriter().bytes(1, padding);
  if (opts.dsm) {
    const dsmMsg = new ProtoWriter().string(1, opts.dsm.destinationJid).string(2, opts.dsm.phash).build();
    integral = integral.bytes(2, dsmMsg);
  }
  let ancillary = new ProtoWriter();
  if (opts.skdm) {
    const skdmMsg = new ProtoWriter().string(1, opts.skdm.groupId).bytes(2, opts.skdm.skdmBytes).build();
    ancillary = ancillary.bytes(2, skdmMsg);
  }
  if (opts.backupDirective) {
    const actionType = opts.backupDirective.actionType === "REMOVE" ? 2 : 1;
    const backupDirectiveMsg = new ProtoWriter().string(1, opts.backupDirective.messageId).varint(2, actionType).build();
    ancillary = ancillary.bytes(5, backupDirectiveMsg);
  }
  const protocol = new ProtoWriter().bytes(1, integral.build()).bytes(2, ancillary.build()).build();
  const transport = new ProtoWriter();
  if (payload) transport.bytes(1, payload);
  return transport.bytes(2, protocol).build();
}
function generatePadding() {
  const len = (0, import_node_crypto3.randomBytes)(1)[0] & 255 || 1;
  const pad = (0, import_node_crypto3.randomBytes)(len);
  pad[len - 1] = len;
  return pad;
}

// src/e2ee/message/codecs/protobuf-codecs.ts
init_cjs_shims();
var protobuf = __toESM(require("protobufjs"), 1);
var import_node_url = require("url");
var import_node_path = require("path");
var __filename2 = (0, import_node_url.fileURLToPath)(importMetaUrl);
var __dirname = (0, import_node_path.dirname)(__filename2);
var root = new (protobuf.default?.Root || protobuf.Root)();
root.resolvePath = (origin, target) => {
  return (0, import_node_path.join)(__dirname, "../proto", target);
};
root.loadSync([
  "WACommon.proto",
  "MessageTransport.proto",
  "WAMediaTransport.proto",
  "MessageApplication.proto",
  "ConsumerApplication.proto",
  "ArmadilloApplication.proto",
  "ArmadilloICDC.proto"
]);
var MsgTransportType = root.lookupType("waMsgTransport.MessageTransport");
var MsgApplicationType = root.lookupType("WAMsgApplication.MessageApplication");
var ConsumerAppType = root.lookupType("waConsumerApplication.ConsumerApplication");
var ArmadilloAppType = root.lookupType("waArmadilloApplication.Armadillo");
var ICDCIdentityListType = root.lookupType("waArmadilloICDC.ICDCIdentityList");
var SignedICDCIdentityListType = root.lookupType("waArmadilloICDC.SignedICDCIdentityList");
var ImageTransportType = root.lookupType("WAMediaTransport.ImageTransport");
var VideoTransportType = root.lookupType("WAMediaTransport.VideoTransport");
var AudioTransportType = root.lookupType("WAMediaTransport.AudioTransport");
var DocumentTransportType = root.lookupType("WAMediaTransport.DocumentTransport");
var StickerTransportType = root.lookupType("WAMediaTransport.StickerTransport");
function decodeMessageTransport(buffer) {
  const msg = MsgTransportType.decode(buffer);
  return MsgTransportType.toObject(msg, { longs: Number, enums: String, bytes: Buffer });
}
function decodeMessageApplication(buffer) {
  const msg = MsgApplicationType.decode(buffer);
  return MsgApplicationType.toObject(msg, { longs: Number, enums: String, bytes: Buffer });
}
function decodeConsumerApplication(buffer) {
  const msg = ConsumerAppType.decode(buffer);
  return ConsumerAppType.toObject(msg, { longs: String, enums: String, bytes: Buffer });
}
function decodeArmadillo(buffer) {
  const msg = ArmadilloAppType.decode(buffer);
  return ArmadilloAppType.toObject(msg, { longs: String, enums: String, bytes: Buffer });
}

// src/e2ee/facebook/icdc-payload.ts
function encodeICDCIdentityList(opts) {
  const w = new ProtoWriter();
  w.varint(1, opts.seq);
  w.uint64_varint(2, BigInt(opts.timestamp));
  for (const device of opts.devices) {
    w.bytes(3, Buffer.from(device));
  }
  w.varint(4, opts.signingDeviceIndex);
  return w.build();
}
function encodeSignedICDCIdentityList(opts) {
  const w = new ProtoWriter();
  w.bytes(1, opts.details);
  w.bytes(2, opts.signature);
  return w.build();
}

// src/services/icdc.service.ts
var ICDCService = class {
  constructor(userAgent, initialCookies) {
    this.userAgent = userAgent;
    if (initialCookies) this.cookies = initialCookies;
  }
  userAgent;
  baseUrl = "https://reg-e2ee.facebook.com/v2";
  origin = "https://www.messenger.com";
  referer = "https://www.messenger.com/messages/";
  cookies = "";
  setCookies(cookies) {
    this.cookies = cookies;
  }
  async register(fbid, fbCat, appId, deviceStore) {
    logger.debug("ICDCService", "Starting ICDC registration...");
    const fetchResp = await this.fetchICDC(fbid, deviceStore.facebookUUID, appId, fbCat);
    if (fetchResp.status !== 200) {
      throw new Error(`ICDC fetch failed with status ${fetchResp.status}`);
    }
    const deviceIdentities = fetchResp.device_identities.map(
      (id) => Buffer.from(id, "base64")
    );
    const ownIdentityPub = deviceStore.getIdentityPublicKey();
    let ownIdentityIndex = deviceIdentities.findIndex(
      (id) => Buffer.compare(id, ownIdentityPub) === 0
    );
    let nextSeq = fetchResp.icdc_seq;
    if (ownIdentityIndex === -1) {
      logger.debug("ICDCService", "Own identity not found in list, adding...");
      ownIdentityIndex = deviceIdentities.length;
      deviceIdentities.push(Buffer.from(ownIdentityPub));
      nextSeq++;
    } else {
      logger.debug("ICDCService", `Own identity found at index ${ownIdentityIndex}`);
    }
    const icdcTs = Math.floor(Date.now() / 1e3);
    const unsignedList = encodeICDCIdentityList({
      seq: nextSeq,
      timestamp: icdcTs,
      devices: deviceIdentities,
      signingDeviceIndex: ownIdentityIndex
    });
    const privKey = import_libsignal_client.PrivateKey.deserialize(Buffer.from(deviceStore.getIdentityPrivateKey()));
    const signature = Buffer.from(privKey.sign(unsignedList));
    const signedList = encodeSignedICDCIdentityList({
      details: unsignedList,
      signature
    });
    const identitiesHash = this.calculateIdentitiesHash(deviceIdentities);
    const form = new URLSearchParams();
    form.set("fbid", fbid);
    form.set("fb_cat", fbCat);
    form.set("app_id", appId);
    form.set("device_id", deviceStore.facebookUUID);
    const regIdBuf = Buffer.alloc(4);
    regIdBuf.writeUInt32BE(deviceStore.registrationId);
    form.set("e_regid", regIdBuf.toString("base64"));
    form.set("e_keytype", Buffer.from([5]).toString("base64"));
    form.set("e_ident", ownIdentityPub.toString("base64"));
    const skeyIdBuf = Buffer.alloc(4);
    skeyIdBuf.writeUInt32BE(deviceStore.signedPreKeyId);
    form.set("e_skey_id", skeyIdBuf.subarray(1).toString("base64"));
    form.set("e_skey_val", deviceStore.getSignedPreKeyPublicKey().toString("base64"));
    form.set("e_skey_sig", deviceStore.signedPreKeySig.toString("base64"));
    form.set("icdc_list", signedList.toString("base64"));
    form.set("icdc_ts", icdcTs.toString());
    form.set("icdc_seq", nextSeq.toString());
    form.set("ihash", identitiesHash.toString("base64"));
    const registerResp = await this.post(
      "fb_register_v2",
      form
    );
    if (registerResp.status !== 200) {
      throw new Error(`ICDC register failed with status ${registerResp.status}`);
    }
    logger.info("ICDCService", `ICDC registration successful. WA Device ID: ${registerResp.wa_device_id}`);
    return registerResp.wa_device_id;
  }
  async fetchICDC(fbid, facebookUUID, appId, fbCat) {
    const form = new URLSearchParams();
    form.set("fbid", fbid);
    form.set("device_id", facebookUUID);
    form.set("app_id", appId);
    form.set("fb_cat", fbCat);
    return this.post("fb_icdc_fetch", form);
  }
  async post(endpoint, body) {
    const url = `${this.baseUrl}/${endpoint}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": this.userAgent,
        "Origin": this.origin,
        "Referer": this.referer,
        "Cookie": this.cookies,
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site"
      },
      body: body.toString()
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP error ${response.status}: ${text}`);
    }
    return response.json();
  }
  calculateIdentitiesHash(identities) {
    const sorted = [...identities].sort(Buffer.compare);
    const hash = (0, import_node_crypto4.createHash)("sha256");
    for (const identity of sorted) {
      hash.update(identity);
    }
    return hash.digest().subarray(0, 10);
  }
};

// src/services/thread.service.ts
init_cjs_shims();

// src/e2ee/store/device-store.ts
init_cjs_shims();
var import_node_crypto5 = require("crypto");
var import_node_crypto6 = require("crypto");
var import_libsignal_client2 = require("@signalapp/libsignal-client");

// src/e2ee/store/device-json.ts
init_cjs_shims();
var DEVICE_STORE_SCHEMA_VERSION = 1;
function parseDeviceJSON(json) {
  return migrateDeviceJSON(JSON.parse(json));
}
function migrateDeviceJSON(data) {
  return {
    ...data,
    schema_version: data.schema_version ?? DEVICE_STORE_SCHEMA_VERSION,
    next_pre_key_id: data.next_pre_key_id ?? 1,
    identities: data.identities ?? {},
    sessions: data.sessions ?? {},
    pre_keys: data.pre_keys ?? {},
    sender_keys: data.sender_keys ?? {},
    signed_pre_keys: data.signed_pre_keys ?? {}
  };
}
function decodeBase64(value) {
  return Buffer.from(value, "base64");
}
function encodeBase64(value) {
  return Buffer.from(value).toString("base64");
}
function mapFromBase64Record(record, keyFromString) {
  const out = /* @__PURE__ */ new Map();
  for (const [key, value] of Object.entries(record ?? {})) {
    out.set(keyFromString(key), Buffer.from(value, "base64"));
  }
  return out;
}
function base64RecordFromMap(map) {
  const out = {};
  for (const [key, value] of map) {
    out[String(key)] = encodeBase64(value);
  }
  return out;
}

// src/e2ee/store/device-repository.ts
init_cjs_shims();
var import_node_fs = require("fs");
function readDeviceJSONFile(path) {
  if (!(0, import_node_fs.existsSync)(path)) return null;
  return parseDeviceJSON((0, import_node_fs.readFileSync)(path, "utf8"));
}
function writeDeviceJSONFile(path, data) {
  (0, import_node_fs.writeFileSync)(path, data, { mode: 384 });
}

// src/e2ee/store/device-store.ts
var u8 = (b) => Buffer.isBuffer(b) ? b : Buffer.from(b.buffer, b.byteOffset, b.byteLength);
var DeviceStore = class _DeviceStore {
  identities = /* @__PURE__ */ new Map();
  sessions = /* @__PURE__ */ new Map();
  preKeys = /* @__PURE__ */ new Map();
  signedPreKeys = /* @__PURE__ */ new Map();
  senderKeys = /* @__PURE__ */ new Map();
  kyberKeys = /* @__PURE__ */ new Map();
  // Noise transport key (not Signal - used in Noise XX handshake)
  noiseKeyPriv;
  // Signal identity
  identityKeyPriv;
  signedPreKeyPriv;
  signedPreKeyId;
  signedPreKeySig;
  registrationId;
  // Messenger-specific
  advSecretKey;
  facebookUUID;
  jidUser;
  jidDevice;
  nextPreKeyId;
  // Test helper: when true, skip identity trust checks (TOFU bypass)
  autoTrust = false;
  path;
  onDataChanged;
  constructor(path) {
    this.path = path;
    this.noiseKeyPriv = Buffer.alloc(32);
    this.identityKeyPriv = Buffer.alloc(32);
    this.signedPreKeyPriv = Buffer.alloc(32);
    this.signedPreKeyId = 1;
    this.signedPreKeySig = Buffer.alloc(64);
    this.registrationId = 0;
    this.advSecretKey = Buffer.alloc(32);
    this.facebookUUID = "";
    this.nextPreKeyId = 1;
  }
  // Factory methods
  /** Create or load from a JSON file path. */
  /** Persist the Messenger JID assigned to this registered E2EE device. */
  setJIDs(id1, id2) {
    const jid = id1 || id2;
    const [userPart = "", server = ""] = jid.split("@");
    if (server !== "msgr" || !userPart) return;
    const colonIdx = userPart.indexOf(":");
    const dotIdx = userPart.indexOf(".");
    const userEnd = dotIdx !== -1 ? dotIdx : colonIdx !== -1 ? colonIdx : userPart.length;
    const user = userPart.slice(0, userEnd) || userPart;
    const rawDevice = colonIdx !== -1 ? userPart.slice(colonIdx + 1) : dotIdx !== -1 ? userPart.slice(dotIdx + 1) : "0";
    const device = Number(rawDevice) || 0;
    let changed = false;
    if (user && this.jidUser !== user) {
      this.jidUser = user;
      changed = true;
    }
    if (device > 0 && this.jidDevice !== device) {
      this.jidDevice = device;
      changed = true;
    }
    if (changed) this.saveToFile();
  }
  static async fromFile(path) {
    const ds = new _DeviceStore(path);
    const json = readDeviceJSONFile(path);
    if (json) {
      await ds.loadJSON(json);
    } else {
      await ds.initNew();
      ds.saveToFile();
    }
    return ds;
  }
  /** Load from a JSON string (no file I/O). */
  static async fromData(json, onDataChanged) {
    const ds = new _DeviceStore("");
    ds.onDataChanged = onDataChanged;
    await ds.loadJSON(parseDeviceJSON(json));
    return ds;
  }
  /** Create a fresh in-memory device (nothing persisted). */
  static async memoryOnly() {
    const ds = new _DeviceStore("");
    await ds.initNew();
    return ds;
  }
  // Init / load
  async initNew() {
    const { PrivateKey: PK, IdentityKeyPair: IKP } = await import("@signalapp/libsignal-client");
    this.noiseKeyPriv = (0, import_node_crypto5.randomBytes)(32);
    const identityPriv = PK.generate();
    this.identityKeyPriv = Buffer.from(identityPriv.serialize());
    const signedPreKeyPriv = PK.generate();
    this.signedPreKeyPriv = Buffer.from(signedPreKeyPriv.serialize());
    this.signedPreKeyId = 1;
    this.signedPreKeySig = Buffer.from(
      identityPriv.sign(signedPreKeyPriv.getPublicKey().serialize())
    );
    const buf = (0, import_node_crypto5.randomBytes)(2);
    this.registrationId = buf.readUInt16BE(0) & 16383 || 1;
    this.advSecretKey = (0, import_node_crypto5.randomBytes)(32);
    this.facebookUUID = (0, import_node_crypto6.randomUUID)();
    logger.debug("DeviceStore", "Generated new Facebook UUID:", this.facebookUUID);
    this.nextPreKeyId = 1;
  }
  async loadJSON(input) {
    const d = migrateDeviceJSON(input);
    this.noiseKeyPriv = decodeBase64(d.noise_key_priv);
    this.identityKeyPriv = decodeBase64(d.identity_key_priv);
    this.signedPreKeyPriv = decodeBase64(d.signed_pre_key_priv);
    this.signedPreKeyId = d.signed_pre_key_id;
    this.signedPreKeySig = decodeBase64(d.signed_pre_key_sig);
    this.registrationId = d.registration_id;
    this.advSecretKey = decodeBase64(d.adv_secret_key);
    this.facebookUUID = d.facebook_uuid;
    this.jidUser = d.jid_user;
    this.jidDevice = d.jid_device;
    this.nextPreKeyId = d.next_pre_key_id;
    this.identities = mapFromBase64Record(d.identities, (key) => key);
    this.sessions = mapFromBase64Record(d.sessions, (key) => key);
    this.preKeys = mapFromBase64Record(d.pre_keys, Number);
    this.senderKeys = mapFromBase64Record(d.sender_keys, (key) => key);
    this.signedPreKeys = mapFromBase64Record(d.signed_pre_keys, Number);
  }
  // Serialization
  toJSON() {
    const d = {
      schema_version: DEVICE_STORE_SCHEMA_VERSION,
      noise_key_priv: encodeBase64(this.noiseKeyPriv),
      identity_key_priv: encodeBase64(this.identityKeyPriv),
      signed_pre_key_priv: encodeBase64(this.signedPreKeyPriv),
      signed_pre_key_id: this.signedPreKeyId,
      signed_pre_key_sig: encodeBase64(this.signedPreKeySig),
      registration_id: this.registrationId,
      adv_secret_key: encodeBase64(this.advSecretKey),
      facebook_uuid: this.facebookUUID,
      next_pre_key_id: this.nextPreKeyId,
      identities: base64RecordFromMap(this.identities),
      sessions: base64RecordFromMap(this.sessions),
      pre_keys: base64RecordFromMap(this.preKeys),
      sender_keys: base64RecordFromMap(this.senderKeys),
      signed_pre_keys: base64RecordFromMap(this.signedPreKeys)
    };
    if (this.jidUser) d.jid_user = this.jidUser;
    if (this.jidDevice) d.jid_device = this.jidDevice;
    return d;
  }
  getData() {
    return JSON.stringify(this.toJSON(), null, 2);
  }
  saveToFile() {
    if (this.path) {
      writeDeviceJSONFile(this.path, this.getData());
    } else if (this.onDataChanged) {
      this.onDataChanged(this.getData());
    }
  }
  getIdentityPublicKey() {
    return Buffer.from(import_libsignal_client2.PrivateKey.deserialize(u8(this.identityKeyPriv)).getPublicKey().serialize()).subarray(1);
  }
  getIdentityPrivateKey() {
    return this.identityKeyPriv;
  }
  getSignedPreKeyPublicKey() {
    return Buffer.from(import_libsignal_client2.PrivateKey.deserialize(u8(this.signedPreKeyPriv)).getPublicKey().serialize()).subarray(1);
  }
  // libsignal IdentityKeyStore
  async getIdentityKey() {
    return import_libsignal_client2.PrivateKey.deserialize(u8(this.identityKeyPriv));
  }
  async _getIdentityKey() {
    const key = import_libsignal_client2.PrivateKey.deserialize(u8(this.identityKeyPriv));
    return key._nativeHandle;
  }
  async getLocalRegistrationId() {
    return this.registrationId;
  }
  async _getLocalRegistrationId() {
    return this.registrationId;
  }
  async _saveIdentity(name, key) {
    return this.saveIdentity(
      import_libsignal_client2.ProtocolAddress._fromNativeHandle(name),
      import_libsignal_client2.PublicKey._fromNativeHandle(key)
    );
  }
  async saveIdentity(name, key) {
    const addr = name.toString();
    const existing = this.identities.get(addr);
    const keyBytes = key.serialize();
    const changed = existing == null || !Buffer.from(existing).equals(Buffer.from(keyBytes));
    this.identities.set(addr, new Uint8Array(keyBytes));
    this.saveToFile();
    return changed;
  }
  async isTrustedIdentity(name, key, _direction) {
    if (this.autoTrust) return true;
    const addr = name.toString();
    const existing = this.identities.get(addr);
    if (existing == null) return true;
    return Buffer.from(existing).equals(Buffer.from(key.serialize()));
  }
  async _isTrustedIdentity(name, key, sending) {
    const addr = import_libsignal_client2.ProtocolAddress._fromNativeHandle(name).toString();
    if (this.autoTrust) return true;
    const existing = this.identities.get(addr);
    if (existing == null) return true;
    const pub = import_libsignal_client2.PublicKey._fromNativeHandle(key);
    return Buffer.from(existing).equals(Buffer.from(pub.serialize()));
  }
  async getIdentity(name) {
    const bytes = this.identities.get(name.toString());
    if (!bytes) return null;
    return import_libsignal_client2.PublicKey.deserialize(Buffer.from(bytes));
  }
  async _getIdentity(name) {
    const key = await this.getIdentity(import_libsignal_client2.ProtocolAddress._fromNativeHandle(name));
    return key ? key._nativeHandle : null;
  }
  // libsignal SessionStore
  async saveSession(name, record) {
    this.sessions.set(name.toString(), record.serialize());
    this.saveToFile();
  }
  async _saveSession(name, record) {
    return this.saveSession(
      import_libsignal_client2.ProtocolAddress._fromNativeHandle(name),
      import_libsignal_client2.SessionRecord._fromNativeHandle(record)
    );
  }
  async getSession(name) {
    const bytes = this.sessions.get(name.toString());
    if (!bytes) return null;
    return import_libsignal_client2.SessionRecord.deserialize(Buffer.from(bytes));
  }
  async _getSession(name) {
    const r = await this.getSession(import_libsignal_client2.ProtocolAddress._fromNativeHandle(name));
    return r ? r._nativeHandle : null;
  }
  async getExistingSessions(addresses) {
    const records = [];
    for (const addr of addresses) {
      const r = await this.getSession(addr);
      if (r) records.push(r);
    }
    return records;
  }
  // libsignal PreKeyStore
  async savePreKey(id, record) {
    logger.debug("DeviceStore", `savePreKey: ID=${id}`);
    this.preKeys.set(id, record.serialize());
    this.saveToFile();
  }
  async _savePreKey(id, record) {
    return this.savePreKey(id, import_libsignal_client2.PreKeyRecord._fromNativeHandle(record));
  }
  async getPreKey(id) {
    const bytes = this.preKeys.get(id);
    if (!bytes) throw new Error(`PreKey ${id} not found`);
    return import_libsignal_client2.PreKeyRecord.deserialize(Buffer.from(bytes));
  }
  async _getPreKey(id) {
    const r = await this.getPreKey(id);
    return r._nativeHandle;
  }
  async removePreKey(id) {
    this.preKeys.delete(id);
    this.saveToFile();
  }
  async _removePreKey(id) {
    return this.removePreKey(id);
  }
  // libsignal SignedPreKeyStore
  async saveSignedPreKey(id, record) {
    this.signedPreKeys.set(id, Buffer.from(record.serialize()));
    this.signedPreKeyId = id;
    this.saveToFile();
  }
  async _saveSignedPreKey(id, record) {
    return this.saveSignedPreKey(id, import_libsignal_client2.SignedPreKeyRecord._fromNativeHandle(record));
  }
  async getSignedPreKey(id) {
    logger.debug("DeviceStore", `getSignedPreKey called for ID: ${id} (type: ${typeof id})`);
    logger.debug("DeviceStore", `Current signedPreKeys IDs:`, Array.from(this.signedPreKeys.keys()));
    const bytes = this.signedPreKeys.get(id);
    if (!bytes) {
      logger.debug("DeviceStore", `Key ${id} not found in map.`);
      if (id === this.signedPreKeyId && this.signedPreKeyPriv && this.signedPreKeySig) {
        logger.debug("DeviceStore", `Using fallback for key ${id}`);
        const priv = import_libsignal_client2.PrivateKey.deserialize(u8(this.signedPreKeyPriv));
        return import_libsignal_client2.SignedPreKeyRecord.new(
          this.signedPreKeyId,
          0,
          priv.getPublicKey(),
          priv,
          u8(this.signedPreKeySig)
        );
      }
      throw new Error(`SignedPreKey ${id} not found`);
    }
    return import_libsignal_client2.SignedPreKeyRecord.deserialize(u8(bytes));
  }
  async _getSignedPreKey(id) {
    const r = await this.getSignedPreKey(id);
    return r._nativeHandle;
  }
  // libsignal SenderKeyStore
  async saveSenderKey(senderAddress, distributionId, record) {
    const key = `${senderAddress.toString()}::${distributionId}`;
    logger.debug("DeviceStore", `saveSenderKey: ${key}`);
    this.senderKeys.set(key, record.serialize());
    this.saveToFile();
  }
  async _saveSenderKey(sender, distributionId, record) {
    return this.saveSenderKey(
      import_libsignal_client2.ProtocolAddress._fromNativeHandle(sender),
      distributionId.toString(),
      import_libsignal_client2.SenderKeyRecord._fromNativeHandle(record)
    );
  }
  async getSenderKey(senderAddress, distributionId) {
    const key = `${senderAddress.toString()}::${distributionId}`;
    const bytes = this.senderKeys.get(key);
    logger.debug("DeviceStore", `getSenderKey: ${key}, found=${!!bytes}`);
    if (!bytes) return null;
    return import_libsignal_client2.SenderKeyRecord.deserialize(Buffer.from(bytes));
  }
  listSenderKeyDistributionIds(senderAddress) {
    const prefix = `${senderAddress.toString()}::`;
    const distributionIds = [];
    for (const key of this.senderKeys.keys()) {
      const keyString = String(key);
      if (keyString.startsWith(prefix)) {
        distributionIds.push(keyString.slice(prefix.length));
      }
    }
    return distributionIds;
  }
  async _getSenderKey(sender, distributionId) {
    const r = await this.getSenderKey(
      import_libsignal_client2.ProtocolAddress._fromNativeHandle(sender),
      distributionId.toString()
    );
    return r ? r._nativeHandle : null;
  }
  // libsignal KyberPreKeyStore (Memory only - Messenger doesn't use Kyber)
  async saveKyberPreKey(id, record) {
    this.kyberKeys.set(id, Buffer.from(record.serialize()));
  }
  async _saveKyberPreKey(id, record) {
    return this.saveKyberPreKey(id, import_libsignal_client2.KyberPreKeyRecord._fromNativeHandle(record));
  }
  async getKyberPreKey(id) {
    const data = this.kyberKeys.get(id);
    if (!data) throw new Error(`Kyber pre-key ${id} not found`);
    return import_libsignal_client2.KyberPreKeyRecord.deserialize(u8(data));
  }
  async _getKyberPreKey(id) {
    const r = await this.getKyberPreKey(id);
    return r._nativeHandle;
  }
  async markKyberPreKeyUsed(id) {
    this.kyberKeys.delete(id);
  }
  async _markKyberPreKeyUsed(id) {
    return this.markKyberPreKeyUsed(id);
  }
  // Convenience: build IdentityKeyPair for libsignal operations
  async getIdentityKeyPair() {
    const priv = await this.getIdentityKey();
    return new import_libsignal_client2.IdentityKeyPair(priv.getPublicKey(), priv);
  }
  /** Get a fresh unused prekey ID and bump the counter */
  allocPreKeyId() {
    return this.nextPreKeyId++;
  }
  /** True if store has an established session for this address */
  hasSession(address) {
    return this.sessions.has(address);
  }
  getPreKeyCount() {
    return this.preKeys.size;
  }
};

// src/e2ee/application/e2ee-client.ts
init_cjs_shims();

// src/e2ee/media/media-crypto.ts
init_cjs_shims();
var import_node_crypto7 = require("crypto");
var MediaType = {
  image: "WhatsApp Image Keys",
  video: "WhatsApp Video Keys",
  audio: "WhatsApp Audio Keys",
  document: "WhatsApp Document Keys",
  sticker: "WhatsApp Image Keys",
  // same as image
  history: "WhatsApp History Keys",
  appstate: "WhatsApp App State Keys"
};
var MmsType = {
  image: "image",
  video: "video",
  audio: "ptt",
  // Messenger only allows PTT (push-to-talk), not generic audio
  document: "document",
  sticker: "image",
  history: "md-msg-hist",
  appstate: "md-app-state"
};
function expandMediaKey(mediaKey, type) {
  const info = MediaType[type];
  const expanded = Buffer.from(
    (0, import_node_crypto7.hkdfSync)("sha256", mediaKey, Buffer.alloc(0), info, 112)
  );
  return {
    iv: expanded.subarray(0, 16),
    cipherKey: expanded.subarray(16, 48),
    macKey: expanded.subarray(48, 80),
    refKey: expanded.subarray(80, 112)
  };
}
function encryptMedia(plaintext, type) {
  const mediaKey = (0, import_node_crypto7.randomBytes)(32);
  const { iv, cipherKey, macKey } = expandMediaKey(mediaKey, type);
  const cipher = (0, import_node_crypto7.createCipheriv)("aes-256-cbc", cipherKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const mac = (0, import_node_crypto7.createHmac)("sha256", macKey).update(iv).update(ciphertext).digest().subarray(0, 10);
  const dataToUpload = Buffer.concat([ciphertext, mac]);
  return {
    mediaKey,
    fileSHA256: Buffer.from((0, import_node_crypto7.createHash)("sha256").update(plaintext).digest()),
    fileEncSHA256: Buffer.from((0, import_node_crypto7.createHash)("sha256").update(dataToUpload).digest()),
    fileLength: plaintext.length,
    dataToUpload
  };
}
var MEDIA_MAC_LENGTH = 10;
function decryptMedia(opts) {
  const { data, mediaKey, type, fileSHA256: expectedFileSHA256, fileEncSHA256: expectedFileEncSHA256 } = opts;
  if (data.length <= MEDIA_MAC_LENGTH) {
    throw new Error(`Media data too short (${data.length} bytes)`);
  }
  if (expectedFileEncSHA256) {
    const actual = (0, import_node_crypto7.createHash)("sha256").update(data).digest();
    if (!actual.equals(expectedFileEncSHA256)) {
      throw new Error("Invalid media enc SHA256 - data corrupted or tampered");
    }
  }
  const ciphertext = data.subarray(0, -MEDIA_MAC_LENGTH);
  const mac = data.subarray(-MEDIA_MAC_LENGTH);
  const { iv, cipherKey, macKey } = expandMediaKey(mediaKey, type);
  const expectedMac = (0, import_node_crypto7.createHmac)("sha256", macKey).update(iv).update(ciphertext).digest().subarray(0, MEDIA_MAC_LENGTH);
  if (!expectedMac.equals(mac)) {
    throw new Error("Invalid media HMAC - data corrupted or wrong key");
  }
  const decipher = (0, import_node_crypto7.createDecipheriv)("aes-256-cbc", cipherKey, iv);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  if (expectedFileSHA256) {
    const actual = (0, import_node_crypto7.createHash)("sha256").update(plaintext).digest();
    if (!actual.equals(expectedFileSHA256)) {
      throw new Error("Invalid media SHA256 - file corrupted after decryption");
    }
  }
  return plaintext;
}

// src/e2ee/signal/signal-manager.ts
init_cjs_shims();
var import_libsignal_client5 = require("@signalapp/libsignal-client");
var import_node_crypto8 = require("crypto");

// src/e2ee/signal/prekey-manager.ts
init_cjs_shims();
var import_libsignal_client3 = require("@signalapp/libsignal-client");

// src/models/e2ee.ts
init_cjs_shims();

// src/e2ee/signal/prekey-manager.ts
var WANTED_PREKEY_COUNT = 50;
var MIN_PREKEY_COUNT = 5;
var u82 = (b) => Buffer.isBuffer(b) ? b : Buffer.from(b.buffer, b.byteOffset, b.byteLength);
async function generatePreKeys(store, count = WANTED_PREKEY_COUNT) {
  const result = [];
  for (let i = 0; i < count; i++) {
    const id = store.allocPreKeyId();
    const priv = import_libsignal_client3.PrivateKey.generate();
    const record = import_libsignal_client3.PreKeyRecord.new(id, priv.getPublicKey(), priv);
    await store.savePreKey(id, record);
    result.push({ id, record });
  }
  return result;
}
async function generateSignedPreKey(store) {
  const identityPriv = await store.getIdentityKey();
  const priv = import_libsignal_client3.PrivateKey.generate();
  const pub = priv.getPublicKey();
  const sig = identityPriv.sign(pub.serialize());
  const id = store.signedPreKeyId + 1;
  const record = import_libsignal_client3.SignedPreKeyRecord.new(id, Date.now(), pub, priv, u82(sig));
  await store.saveSignedPreKey(id, record);
  return record;
}
function buildPreKeyBundle(raw) {
  const identityKey = PublicKey_deserialize(raw.identityKey);
  const spkPub = PublicKey_deserialize(raw.signedPreKey.publicKey);
  let kyberPub = null;
  let kyberSig = null;
  let kyberKeyId = null;
  if (raw.kyberPreKey) {
    kyberPub = import_libsignal_client3.KEMPublicKey.deserialize(u82(raw.kyberPreKey.publicKey));
    kyberSig = u82(raw.kyberPreKey.signature);
    kyberKeyId = raw.kyberPreKey.keyId;
  }
  if (raw.preKey) {
    const pkPub = PublicKey_deserialize(raw.preKey.publicKey);
    return import_libsignal_client3.PreKeyBundle.new(
      raw.registrationId,
      raw.deviceId,
      raw.preKey.keyId,
      pkPub,
      raw.signedPreKey.keyId,
      spkPub,
      u82(raw.signedPreKey.signature),
      identityKey,
      kyberKeyId,
      kyberPub,
      kyberSig
    );
  }
  return import_libsignal_client3.PreKeyBundle.new(
    raw.registrationId,
    raw.deviceId,
    null,
    null,
    raw.signedPreKey.keyId,
    spkPub,
    u82(raw.signedPreKey.signature),
    identityKey,
    kyberKeyId,
    kyberPub,
    kyberSig
  );
}
function PublicKey_deserialize(bytes) {
  return import_libsignal_client3.PublicKey.deserialize(u82(bytes));
}

// src/e2ee/facebook/facebook-protocol-utils.ts
init_cjs_shims();
var import_crypto = require("crypto");
var import_libsignal_client4 = require("@signalapp/libsignal-client");
function encodeVarint(v) {
  const res = [];
  while (v >= 128) {
    res.push(v % 128 | 128);
    v = Math.floor(v / 128);
  }
  res.push(v);
  return Buffer.from(res);
}
function decodeVarint(buf, pos) {
  let value = 0;
  let shift = 1;
  let length = 0;
  while (true) {
    const byte = buf[pos + length];
    if (byte === void 0) throw new Error("Unexpected EOF in varint");
    value += (byte & 127) * shift;
    length++;
    if (!(byte & 128)) break;
    shift *= 128;
    if (length > 10) throw new Error("Varint too long");
  }
  return { value, length };
}
function uuidStringify(buf) {
  const hex = Buffer.from(buf).toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32)
  ].join("-");
}
function uuidParse(uuid) {
  return Buffer.from(uuid.replace(/-/g, ""), "hex");
}
function getMockPrivateKey(jid) {
  const hash = (0, import_crypto.createHash)("sha256").update(`MOCK_SIG_KEY:${jid}`).digest();
  return import_libsignal_client4.PrivateKey.deserialize(hash);
}
function stableDistributionId(groupJid, senderJid) {
  const raw = `${groupJid}:${senderJid}`;
  const bytes = Buffer.alloc(16);
  for (let i = 0; i < raw.length && i < 16; i++) {
    bytes[i] = raw.charCodeAt(i) & 255;
  }
  bytes[6] = bytes[6] & 15 | 64;
  bytes[8] = bytes[8] & 63 | 128;
  return uuidStringify(bytes);
}
function parseFBProtobufSKMSG(buf) {
  let pos = 0;
  let id = 0;
  let iteration = 0;
  let ciphertext = Buffer.alloc(0);
  try {
    while (pos < buf.length) {
      const { value: tagValue, length: tagLen } = decodeVarint(buf, pos);
      pos += tagLen;
      const field = tagValue >> 3;
      if (field === 1) {
        const { value, length } = decodeVarint(buf, pos);
        id = value;
        pos += length;
      } else if (field === 2) {
        const { value, length } = decodeVarint(buf, pos);
        iteration = value;
        pos += length;
      } else if (field === 3) {
        const { value, length } = decodeVarint(buf, pos);
        pos += length;
        ciphertext = buf.slice(pos, pos + value);
        pos += value;
      } else {
        const tag = tagValue & 7;
        if (tag === 0) {
          const { length } = decodeVarint(buf, pos);
          pos += length;
        } else if (tag === 2) {
          const { value, length } = decodeVarint(buf, pos);
          pos += length + value;
        } else break;
      }
    }
    return { id, iteration, ciphertext };
  } catch (e) {
    return null;
  }
}
function wrapAsSignalSKMSG(params) {
  const { distributionId, id, iteration, ciphertext, senderJid } = params;
  const uuidBuf = uuidParse(distributionId);
  const protoChunks = [
    Buffer.from([10, 16]),
    uuidBuf,
    // Tag 1 (distributionId)
    Buffer.from([16]),
    encodeVarint(id),
    // Tag 2 (id)
    Buffer.from([24]),
    encodeVarint(iteration),
    // Tag 3 (iteration)
    Buffer.from([34]),
    encodeVarint(ciphertext.length),
    ciphertext
    // Tag 4 (ct)
  ];
  const protobuf2 = Buffer.concat(protoChunks);
  const header = Buffer.from([51]);
  const toSign = Buffer.concat([header, protobuf2]);
  const privKey = getMockPrivateKey(senderJid);
  const signature = privKey.sign(toSign);
  return Buffer.concat([toSign, signature]);
}

// src/e2ee/signal/signal-manager.ts
var u83 = (b) => {
  if (!b) return Buffer.alloc(0);
  return Buffer.isBuffer(b) ? b : Buffer.from(b.buffer, b.byteOffset, b.byteLength);
};
function jidToAddress(jid) {
  const [userPartRaw = jid, server = ""] = jid.split("@");
  if (server === "msgr") {
    const colonIdx = userPartRaw.indexOf(":");
    const dotIdx = userPartRaw.indexOf(".");
    const userEnd = dotIdx !== -1 ? dotIdx : colonIdx !== -1 ? colonIdx : userPartRaw.length;
    const user2 = userPartRaw.slice(0, userEnd) || userPartRaw;
    const rawDevice = colonIdx !== -1 ? userPartRaw.slice(colonIdx + 1) : dotIdx !== -1 ? userPartRaw.slice(dotIdx + 1) : "0";
    const device2 = Number(rawDevice) || 0;
    return import_libsignal_client5.ProtocolAddress.new(user2, device2);
  }
  const [userAndAgent = jid, rawDevicePart = ""] = userPartRaw.split(":");
  const [user = jid, rawAgentPart = ""] = userAndAgent.split(".");
  const signalUser = rawAgentPart ? `${user}_${rawAgentPart}` : user;
  const device = rawDevicePart ? Number(rawDevicePart) : 0;
  return import_libsignal_client5.ProtocolAddress.new(signalUser, device);
}
function legacyJidToAddress(jid) {
  const [userPart] = jid.split("@");
  const [userAndAgent = jid, rawDevicePart = ""] = (userPart ?? jid).split(":");
  const [user = jid, rawAgentPart = ""] = userAndAgent.split(".");
  const signalUser = rawAgentPart ? `${user}_${rawAgentPart}` : user;
  const device = rawDevicePart ? Number(rawDevicePart) : 0;
  return import_libsignal_client5.ProtocolAddress.new(signalUser, device);
}
function addressCandidatesForJid(jid) {
  const candidates = [jidToAddress(jid), legacyJidToAddress(jid)];
  const seen = /* @__PURE__ */ new Set();
  return candidates.filter((addr) => {
    const key = addr.toString();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function listSenderKeyDistributionIds(store, senderAddr) {
  const list = store.listSenderKeyDistributionIds;
  return typeof list === "function" ? list.call(store, senderAddr) : [];
}
async function establishSession(store, recipient, rawBundle) {
  const bundle = buildPreKeyBundle(rawBundle);
  await (0, import_libsignal_client5.processPreKeyBundle)(bundle, recipient, store, store);
}
async function encryptDM(store, recipient, selfAddress, plaintext) {
  const cipherMsg = await (0, import_libsignal_client5.signalEncrypt)(u83(plaintext), recipient, store, store);
  const type = cipherMsg.type() === import_libsignal_client5.CiphertextMessageType.Whisper ? "msg" : "pkmsg";
  return { type, ciphertext: cipherMsg.serialize() };
}
async function decryptDM(store, sender, ciphertext) {
  const msg = import_libsignal_client5.SignalMessage.deserialize(u83(ciphertext));
  return Buffer.from(await (0, import_libsignal_client5.signalDecrypt)(msg, sender, store, store));
}
async function decryptDMPreKey(store, sender, selfAddress, ciphertext) {
  const msg = import_libsignal_client5.PreKeySignalMessage.deserialize(u83(ciphertext));
  return Buffer.from(
    await (0, import_libsignal_client5.signalDecryptPreKey)(msg, sender, store, store, store, store, store)
  );
}
async function createSenderKeyDistributionMessage(store, groupJid, senderJid) {
  const distributionId = (0, import_node_crypto8.randomUUID)();
  const senderAddr = jidToAddress(senderJid);
  const skdm = await import_libsignal_client5.SenderKeyDistributionMessage.create(senderAddr, distributionId, store);
  return { skdm, distributionId };
}
async function processSKDM(store, senderJid, skdmBytes, groupJid) {
  const senderAddr = jidToAddress(senderJid);
  const buf = u83(skdmBytes);
  const processAndAlias = async (skdm) => {
    const distributionId = String(skdm.distributionId());
    await (0, import_libsignal_client5.processSenderKeyDistributionMessage)(senderAddr, skdm, store);
    if (groupJid) {
      const stableId = stableDistributionId(groupJid, senderJid);
      if (stableId !== distributionId) {
        const record = await store.getSenderKey(senderAddr, distributionId);
        if (record) {
          await store.saveSenderKey(senderAddr, stableId, record);
          logger.debug("signal-manager", `Aliased sender key ${distributionId} -> ${stableId} for ${senderJid} in ${groupJid}`);
        }
      }
    }
  };
  try {
    await processAndAlias(import_libsignal_client5.SenderKeyDistributionMessage.deserialize(buf));
    return;
  } catch (primaryErr) {
    if (buf[0] === 51 && buf.length > 1) {
      await processAndAlias(import_libsignal_client5.SenderKeyDistributionMessage.deserialize(buf.slice(1)));
      return;
    }
    throw primaryErr;
  }
}
async function encryptGroup(store, groupJid, senderJid, plaintext, distributionId) {
  const activeDistributionId = distributionId ?? (0, import_node_crypto8.randomUUID)();
  const senderAddr = jidToAddress(senderJid);
  const cipherMsg = await (0, import_libsignal_client5.groupEncrypt)(senderAddr, activeDistributionId, store, u83(plaintext));
  const buf = u83(cipherMsg.serialize());
  if (buf && buf.length > 0 && buf[0] === 51) {
    try {
      const parsed = parseFBProtobufSKMSG(buf.slice(1));
      if (parsed) {
        const wrapped = wrapAsSignalSKMSG({ distributionId: activeDistributionId, id: parsed.id, iteration: parsed.iteration, ciphertext: parsed.ciphertext, senderJid });
        return wrapped;
      }
      if (buf.length >= 21 && buf[1] !== 8) {
        const distId = uuidStringify(buf.slice(1, 17));
        const id = buf.readUInt32BE(17);
        const iteration = 0;
        const ct = buf.slice(21);
        const wrapped = wrapAsSignalSKMSG({ distributionId: distId, id, iteration, ciphertext: ct, senderJid });
        return wrapped;
      }
    } catch (e) {
    }
  }
  return buf;
}
async function decryptGroup(store, senderJid, ciphertext, groupJid) {
  const senderAddrs = addressCandidatesForJid(senderJid);
  const senderAddr = senderAddrs[0];
  let buf = u83(ciphertext);
  let activeDistributionId;
  let rewrapInfo = null;
  if (buf[0] === 51) {
    try {
      const msg = import_libsignal_client5.SenderKeyMessage.deserialize(buf);
      activeDistributionId = String(msg.distributionId());
    } catch (e) {
      logger.debug("signal-manager", `Re-encoding Facebook-style SKMSG from ${senderJid}`);
      let id, iteration, ct, distId;
      if (buf.length >= 21 && buf[1] !== 8) {
        distId = uuidStringify(buf.slice(1, 17));
        id = buf.readUInt32BE(17);
        iteration = 0;
        ct = buf.slice(21);
      } else {
        const parsed = parseFBProtobufSKMSG(buf.slice(1));
        if (!parsed) throw new Error("Failed to parse Facebook Protobuf SKMSG");
        id = parsed.id;
        iteration = parsed.iteration;
        ct = parsed.ciphertext;
        distId = stableDistributionId(groupJid || "unknown", senderJid);
      }
      activeDistributionId = distId;
      rewrapInfo = { id, iteration, ciphertext: ct };
      buf = wrapAsSignalSKMSG({ distributionId: distId, id, iteration, ciphertext: ct, senderJid });
    }
  }
  try {
    const result = await (0, import_libsignal_client5.groupDecrypt)(senderAddr, store, buf);
    return Buffer.from(result);
  } catch (primaryErr) {
    const tried = /* @__PURE__ */ new Set([`${senderAddr.toString()}::${activeDistributionId ?? "original"}`]);
    for (const candidateAddr of senderAddrs.slice(1)) {
      const attemptKey = `${candidateAddr.toString()}::${activeDistributionId ?? "original"}`;
      if (tried.has(attemptKey)) continue;
      tried.add(attemptKey);
      try {
        const result = await (0, import_libsignal_client5.groupDecrypt)(candidateAddr, store, buf);
        logger.debug("signal-manager", `groupDecrypt succeeded with legacy sender address ${candidateAddr.toString()}`);
        return Buffer.from(result);
      } catch (candidateErr) {
        logger.debug("signal-manager", `groupDecrypt fallback failed for ${attemptKey}: ${candidateErr.message}`);
      }
    }
    if (rewrapInfo) {
      for (const candidateAddr of senderAddrs) {
        for (const distributionId of listSenderKeyDistributionIds(store, candidateAddr)) {
          const attemptKey = `${candidateAddr.toString()}::${distributionId}`;
          if (tried.has(attemptKey)) continue;
          tried.add(attemptKey);
          const candidateBuf = wrapAsSignalSKMSG({
            distributionId,
            id: rewrapInfo.id,
            iteration: rewrapInfo.iteration,
            ciphertext: rewrapInfo.ciphertext,
            senderJid
          });
          try {
            const result = await (0, import_libsignal_client5.groupDecrypt)(candidateAddr, store, candidateBuf);
            logger.debug("signal-manager", `groupDecrypt succeeded with sender key ${attemptKey}`);
            return Buffer.from(result);
          } catch (candidateErr) {
            logger.debug("signal-manager", `groupDecrypt fallback failed for ${attemptKey}: ${candidateErr.message}`);
          }
        }
      }
    }
    logger.error("signal-manager", `groupDecrypt failed: ${primaryErr.message} (op: ${primaryErr.operation})`);
    throw primaryErr;
  }
}
async function hasSession(store, address) {
  const record = await store.getSession(address);
  return record != null;
}

// src/e2ee/media/media-upload.ts
init_cjs_shims();
function toMediaUploadToken(fileEncSHA256) {
  return fileEncSHA256.toString("base64").replace(/\+/g, "-").replace(/\//g, "_");
}
async function uploadMedia(config, data, fileEncSHA256, mmsType, options) {
  if (!config.auth) {
    throw new Error("Missing media upload auth token; query media_conn before uploading E2EE media");
  }
  const token = toMediaUploadToken(fileEncSHA256);
  const maxRetries = options?.maxRetries ?? 1;
  let currentConfig = config;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const uploadUrl = `https://${currentConfig.host}/wa-msgr/mms/${mmsType}/${token}?auth=${encodeURIComponent(currentConfig.auth)}&token=${encodeURIComponent(token)}`;
    const resp = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(data.length),
        "Origin": "https://www.facebook.com",
        "Referer": "https://www.facebook.com/"
      },
      body: data
    });
    if (resp.ok) {
      const json = await resp.json();
      const stringField = (...keys) => {
        for (const key of keys) {
          const value = json[key];
          if (typeof value === "string") return value;
          if (typeof value === "number") return String(value);
        }
        return "";
      };
      return {
        url: stringField("url"),
        directPath: stringField("direct_path", "directPath"),
        handle: stringField("handle"),
        objectId: stringField("object_id", "objectID", "objectId")
      };
    }
    if (resp.status === 401 && attempt < maxRetries && options?.refreshConfig) {
      const body2 = await resp.text().catch(() => "");
      console.warn(`Media upload 401 (attempt ${attempt + 1}), refreshing config...`, body2.slice(0, 200));
      currentConfig = await options.refreshConfig();
      if (!currentConfig.auth) {
        throw new Error("Media upload refresh returned empty auth token");
      }
      continue;
    }
    const body = await resp.text().catch(() => "");
    throw new Error(`Media upload failed: HTTP ${resp.status} - ${body}`);
  }
  throw new Error("Media upload failed after retries");
}

// src/e2ee/application/e2ee-client.ts
var E2EEClient = class {
  store;
  constructor(store) {
    this.store = store;
  }
  // Session management
  /** Establish a session with a contact using their prekey bundle (X3DH). */
  async establishSession(recipientJid, bundle) {
    const addr = jidToAddress(recipientJid);
    await establishSession(this.store, addr, bundle);
  }
  async processSenderKeyDistribution(senderJid, skdmBytes, groupJid) {
    await processSKDM(this.store, senderJid, skdmBytes, groupJid);
  }
  // Message encrypt (DM)
  /** Build DM text transports for V3 participant fanout. */
  async buildDMTextFanoutPayloads(opts) {
    const builder = new MessageBuilder().setText(opts.text);
    if (opts.replyToId && opts.replyToSenderJid) {
      builder.setReply(opts.replyToId, opts.replyToSenderJid);
    }
    const consumerApp = builder.build();
    const { messageApp, frankingTag } = encodeMessageApplication(consumerApp, builder.getReply());
    return {
      type: "dm",
      messageApp,
      devicePayload: encodeMessageTransport({ messageApp }),
      selfDevicePayload: encodeMessageTransport({
        messageApp,
        dsm: { destinationJid: opts.toJid, phash: "" }
      }),
      frankingTag
    };
  }
  /**
   * Build and encrypt a DM text message for Signal transport.
   * Kept for low-level callers; production send should fan out through participants.
   */
  async encryptDMText(opts) {
    const fanout = await this.buildDMTextFanoutPayloads(opts);
    const recipientAddr = jidToAddress(opts.toJid);
    const selfAddr = jidToAddress(opts.selfJid);
    const encrypted = await encryptDM(this.store, recipientAddr, selfAddr, fanout.devicePayload);
    return {
      type: "dm",
      encrypted: { type: encrypted.type, ciphertext: Buffer.from(encrypted.ciphertext) },
      frankingTag: fanout.frankingTag,
      messageApp: fanout.messageApp
    };
  }
  /** Build and encrypt a group text message. */
  async encryptGroupText(groupJid, selfJid, text, messageId, replyToId, replyToSenderJid) {
    const builder = new MessageBuilder().setText(text);
    if (replyToId && replyToSenderJid) {
      builder.setReply(replyToId, replyToSenderJid);
    }
    const consumerApp = builder.build();
    const { messageApp, frankingTag } = encodeMessageApplication(consumerApp, builder.getReply());
    const { skdm, distributionId } = await createSenderKeyDistributionMessage(this.store, groupJid, selfJid);
    const groupTransport = encodeMessageTransport({
      messageApp,
      backupDirective: { messageId, actionType: "UPSERT" }
    });
    const deviceTransport = encodeMessageTransport({
      skdm: { groupId: groupJid, skdmBytes: Buffer.from(skdm.serialize()) }
    });
    const selfDeviceTransport = encodeMessageTransport({
      skdm: { groupId: groupJid, skdmBytes: Buffer.from(skdm.serialize()) },
      dsm: { destinationJid: groupJid, phash: "" }
    });
    const groupCiphertext = await encryptGroup(this.store, groupJid, selfJid, groupTransport, distributionId);
    return {
      type: "group",
      messageApp,
      groupCiphertext: Buffer.from(groupCiphertext),
      devicePayload: Buffer.from(deviceTransport),
      selfDevicePayload: Buffer.from(selfDeviceTransport),
      skdmPayload: Buffer.from(groupTransport),
      skdm: {
        groupId: groupJid,
        skdmBytes: Buffer.from(skdm.serialize()),
        distributionId
      },
      frankingTag
    };
  }
  /** Build and encrypt a pre-built MessageApplication for a group send. */
  async encryptGroupMessageApplication(groupJid, selfJid, messageApp, messageId) {
    const { skdm, distributionId } = await createSenderKeyDistributionMessage(this.store, groupJid, selfJid);
    const groupTransport = encodeMessageTransport({
      messageApp,
      backupDirective: { messageId, actionType: "UPSERT" }
    });
    const deviceTransport = encodeMessageTransport({
      skdm: { groupId: groupJid, skdmBytes: Buffer.from(skdm.serialize()) }
    });
    const selfDeviceTransport = encodeMessageTransport({
      skdm: { groupId: groupJid, skdmBytes: Buffer.from(skdm.serialize()) },
      dsm: { destinationJid: groupJid, phash: "" }
    });
    const groupCiphertext = await encryptGroup(this.store, groupJid, selfJid, groupTransport, distributionId);
    return {
      type: "group",
      messageApp,
      groupCiphertext: Buffer.from(groupCiphertext),
      devicePayload: Buffer.from(deviceTransport),
      selfDevicePayload: Buffer.from(selfDeviceTransport),
      skdmPayload: Buffer.from(groupTransport),
      skdm: {
        groupId: groupJid,
        skdmBytes: Buffer.from(skdm.serialize()),
        distributionId
      }
    };
  }
  /** Create a sender-key distribution payload for targeted group retry responses. */
  async createSenderKeyDistributionPayload(groupJid, selfJid) {
    const { skdm, distributionId } = await createSenderKeyDistributionMessage(this.store, groupJid, selfJid);
    return { groupId: groupJid, skdmBytes: Buffer.from(skdm.serialize()), distributionId };
  }
  /** Encrypt a MessageApplication payload directly to one device (used for retry responses). */
  async encryptMessageAppForDevice(recipientJid, selfJid, messageApp, opts = {}) {
    const transport = encodeMessageTransport({
      messageApp,
      skdm: opts.skdm,
      dsm: opts.dsm,
      backupDirective: opts.backupDirective
    });
    return this.encryptDevicePayload(recipientJid, selfJid, transport);
  }
  /** Check if a session exists for a given device JID. */
  async hasSession(jid) {
    const addr = jidToAddress(jid);
    return hasSession(this.store, addr);
  }
  /** Encrypt an SKDM for a specific device DM. */
  async encryptSKDM(recipientJid, selfJid, skdm) {
    const transport = encodeMessageTransport({
      skdm
      // No application payload for SKDM-only DM
    });
    const recipientAddr = jidToAddress(recipientJid);
    const selfAddr = jidToAddress(selfJid);
    const encrypted = await encryptDM(this.store, recipientAddr, selfAddr, transport);
    return {
      type: encrypted.type,
      ciphertext: Buffer.from(encrypted.ciphertext)
    };
  }
  async encryptDevicePayload(recipientJid, selfJid, payload) {
    const recipientAddr = jidToAddress(recipientJid);
    const selfAddr = jidToAddress(selfJid);
    const encrypted = await encryptDM(this.store, recipientAddr, selfAddr, payload);
    return {
      type: encrypted.type,
      ciphertext: Buffer.from(encrypted.ciphertext)
    };
  }
  // Message decrypt
  /** Decrypt a DM Signal message (type = "msg"). Returns raw MessageTransport bytes. */
  async decryptDMMessage(senderJid, ciphertext) {
    const addr = jidToAddress(senderJid);
    return decryptDM(this.store, addr, ciphertext);
  }
  /** Decrypt a DM PreKeySignalMessage (first message from sender). */
  async decryptDMPreKeyMessage(senderJid, selfJid, ciphertext) {
    const senderAddr = jidToAddress(senderJid);
    const selfAddr = jidToAddress(selfJid);
    return decryptDMPreKey(this.store, senderAddr, selfAddr, ciphertext);
  }
  async decryptGroupMessage(senderJid, ciphertext, groupJid) {
    return decryptGroup(this.store, senderJid, ciphertext, groupJid);
  }
  // Media
  /** Encrypt media bytes for upload. Returns crypto fields + uploadable buffer. */
  encryptMedia(data, type) {
    return encryptMedia(data, type);
  }
  /** Decrypt downloaded E2EE media. */
  decryptMedia(opts) {
    return decryptMedia(opts);
  }
  /**
   * Encrypt + upload media in one step.
   * Returns all fields needed to build a ConsumerApplication media message.
   * @param refreshConfig Optional callback to refresh upload config on 401.
   */
  async encryptAndUploadMedia(uploadConfig, data, type, mimeType, refreshConfig) {
    const mmsTypeStr = MmsType[type];
    const encrypted = encryptMedia(data, type);
    const uploaded = await uploadMedia(uploadConfig, encrypted.dataToUpload, encrypted.fileEncSHA256, mmsTypeStr, {
      refreshConfig
    });
    const mediaKeyTimestamp = Math.floor(Date.now() / 1e3);
    return {
      mediaKey: encrypted.mediaKey,
      fileSHA256: encrypted.fileSHA256,
      fileEncSHA256: encrypted.fileEncSHA256,
      fileLength: encrypted.fileLength,
      directPath: uploaded.directPath,
      handle: uploaded.handle,
      objectId: uploaded.objectId,
      mediaFields: {
        mimeType,
        fileSHA256: encrypted.fileSHA256,
        fileLength: encrypted.fileLength,
        mediaKey: encrypted.mediaKey,
        fileEncSHA256: encrypted.fileEncSHA256,
        directPath: uploaded.directPath,
        objectId: uploaded.objectId,
        mediaKeyTimestamp
      }
    };
  }
  // Message builder helpers (passthrough)
  buildTextMessage = encodeTextMessage;
  buildImageMessage = encodeImageMessage;
  buildVideoMessage = encodeVideoMessage;
  buildAudioMessage = encodeAudioMessage;
  buildDocumentMessage = encodeDocumentMessage;
  buildStickerMessage = encodeStickerMessage;
  buildReactionMessage = encodeReactionMessage;
  buildEditMessage = encodeEditMessage;
  buildRevokeMessage = encodeRevokeMessage;
  buildMessageApplication = encodeMessageApplication;
  buildMessageTransport = encodeMessageTransport;
};

// src/e2ee/transport/noise/noise-socket.ts
init_cjs_shims();
var import_node_events2 = require("events");
var import_node_fs2 = require("fs");

// src/e2ee/transport/noise/noise-handshake.ts
init_cjs_shims();
var import_node_crypto9 = require("crypto");
var import_node_zlib2 = require("zlib");
var SPKI_HEADER = Buffer.from("302a300506032b656e032100", "hex");
var PKCS8_HEADER = Buffer.from("302e020100300506032b656e04220420", "hex");
function generateX25519() {
  const { privateKey, publicKey } = (0, import_node_crypto9.generateKeyPairSync)("x25519");
  const privRaw = privateKey.export({ type: "pkcs8", format: "der" });
  const pubRaw = publicKey.export({ type: "spki", format: "der" });
  return {
    priv: Buffer.from(privRaw.subarray(privRaw.length - 32)),
    pub: Buffer.from(pubRaw.subarray(pubRaw.length - 32))
  };
}
function getX25519PublicKey(privKeyRaw) {
  const priv = (0, import_node_crypto9.createPrivateKey)({ key: Buffer.concat([PKCS8_HEADER, privKeyRaw]), format: "der", type: "pkcs8" });
  const pubDer = (0, import_node_crypto9.createPublicKey)(priv).export({ type: "spki", format: "der" });
  return Buffer.from(pubDer.subarray(pubDer.length - 32));
}
function x25519DH(privKeyRaw, pubKeyRaw) {
  const pub = (0, import_node_crypto9.createPublicKey)({ key: Buffer.concat([SPKI_HEADER, pubKeyRaw]), format: "der", type: "spki" });
  const priv = (0, import_node_crypto9.createPrivateKey)({ key: Buffer.concat([PKCS8_HEADER, privKeyRaw]), format: "der", type: "pkcs8" });
  return (0, import_node_crypto9.diffieHellman)({ privateKey: priv, publicKey: pub });
}
var WA_CERT_PUB_KEY = Buffer.from(
  "142375574d0a587166aae71ebe516437c4a28b73e3695c6ce1f7f9545da8ee6b",
  "hex"
);
var NOISE_START_PATTERN = Buffer.from("Noise_XX_25519_AESGCM_SHA256\0\0\0\0");
var WA_HEADER = Buffer.from([87, 65, 6, 3]);
var NoiseHandshakeState = class {
  h;
  // hash (chaining key / handshake hash)
  ck;
  // chaining key
  k = null;
  // current symmetric key
  n = 0;
  // nonce counter
  constructor(startPattern, header) {
    if (startPattern.length === 32) {
      this.h = Buffer.from(startPattern);
    } else {
      this.h = this.sha256(startPattern);
    }
    this.ck = this.h;
    this.mixHash(header);
  }
  sha256(data) {
    return Buffer.from((0, import_node_crypto9.createHash)("sha256").update(data).digest());
  }
  mixHash(data) {
    this.h = this.sha256(Buffer.concat([this.h, data]));
  }
  mixKey(input) {
    const expanded = Buffer.from((0, import_node_crypto9.hkdfSync)("sha256", input, this.ck, "", 64));
    this.ck = expanded.subarray(0, 32);
    this.k = expanded.subarray(32, 64);
    this.n = 0;
  }
  mixSharedSecretIntoKey(privKey, pubKey) {
    const sharedSecret = x25519DH(privKey, pubKey);
    this.mixKey(sharedSecret);
  }
  /** AES-256-GCM encrypt; ad = current h; updates h */
  encrypt(plaintext) {
    if (!this.k) throw new Error("No key set in Noise state");
    const nonce = this.buildNonce(this.n++);
    const cipher = (0, import_node_crypto9.createCipheriv)("aes-256-gcm", this.k, nonce);
    cipher.setAAD(this.h);
    const enc = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
    this.mixHash(enc);
    return enc;
  }
  /** AES-256-GCM decrypt; ad = current h; updates h */
  decrypt(ciphertext) {
    if (!this.k) throw new Error("No key set in Noise state");
    const nonce = this.buildNonce(this.n++);
    const tag = ciphertext.subarray(-16);
    const body = ciphertext.subarray(0, -16);
    try {
      const decipher = (0, import_node_crypto9.createDecipheriv)("aes-256-gcm", this.k, nonce);
      decipher.setAAD(this.h);
      decipher.setAuthTag(tag);
      const plain = Buffer.concat([decipher.update(body), decipher.final()]);
      this.mixHash(ciphertext);
      return plain;
    } catch (err) {
      logger.error("CipherState", `Decrypt error at n=${this.n - 1}:`, err);
      logger.error("CipherState", `  - Key: ${this.k.toString("hex")}`);
      logger.error("CipherState", `  - Nonce: ${nonce.toString("hex")}`);
      logger.error("CipherState", `  - AAD: ${this.h.toString("hex")}`);
      throw err;
    }
  }
  /** Derive final send/recv keys from the completed handshake */
  finish() {
    const expanded = Buffer.from((0, import_node_crypto9.hkdfSync)("sha256", Buffer.alloc(0), this.ck, Buffer.alloc(0), 64));
    return {
      sendKey: expanded.subarray(0, 32),
      recvKey: expanded.subarray(32, 64)
    };
  }
  get handshakeHash() {
    return this.h;
  }
  buildNonce(counter) {
    const nonce = Buffer.alloc(12);
    nonce.writeUInt32BE(counter, 8);
    return nonce;
  }
};
function verifyCertChain(certChainRaw, serverStaticPub) {
  void certChainRaw;
  void serverStaticPub;
}
var EncryptedFrameSocket = class {
  ws;
  sendKey;
  recvKey;
  sendCounter = 0;
  recvCounter = 0;
  constructor(ws, sendKey, recvKey) {
    this.ws = ws;
    this.sendKey = sendKey;
    this.recvKey = recvKey;
  }
  buildNonce(counter) {
    const n = Buffer.alloc(12);
    n.writeBigUInt64BE(BigInt(counter), 4);
    return n;
  }
  encryptFrame(plaintext) {
    const nonce = this.buildNonce(this.sendCounter++);
    const cipher = (0, import_node_crypto9.createCipheriv)("aes-256-gcm", this.sendKey, nonce);
    const enc = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
    const header = Buffer.alloc(3);
    header.writeUIntBE(enc.length, 0, 3);
    const fullFrame = Buffer.concat([header, enc]);
    logger.debug("noise-handshake", `Sending frame (${fullFrame.length} bytes): ${fullFrame.toString("hex").slice(0, 32)}...`);
    return fullFrame;
  }
  decryptFrame(data) {
    if (data.length <= 16) {
      return Buffer.alloc(0);
    }
    const nonce = this.buildNonce(this.recvCounter++);
    const tag = data.subarray(-16);
    const body = data.subarray(0, -16);
    const decipher = (0, import_node_crypto9.createDecipheriv)("aes-256-gcm", this.recvKey, nonce);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(body), decipher.final()]);
  }
  async sendFrame(data) {
    this.ws.send(this.encryptFrame(data));
  }
  async readFrame() {
    const header = await this.ws.readRaw(3);
    if (!header) {
      throw new Error("Socket closed while reading frame header");
    }
    const len = header.readUIntBE(0, 3);
    logger.debug("FacebookE2EESocket", `RAW frame header: ${header.toString("hex")} (len=${len})`);
    const payload = await this.ws.readRaw(len);
    try {
      const decrypted = this.decryptFrame(payload);
      logger.debug("FacebookE2EESocket", `Decrypt successful, result length: ${decrypted.length}`);
      return decrypted;
    } catch (err) {
      logger.error("FacebookE2EESocket", "Decrypt FAILED:", err);
      throw err;
    }
  }
  close() {
    this.ws.close();
  }
};
async function doHandshake(ws, noiseKeyPriv, clientPayload) {
  const state = new NoiseHandshakeState(NOISE_START_PATTERN, WA_HEADER);
  const eph = generateX25519();
  const ephPriv = eph.priv;
  const ephPub = eph.pub;
  logger.debug("debug", `ClientEphPriv: ${ephPriv.toString("hex")}`);
  logger.debug("debug", `ClientEphPub:  ${ephPub.toString("hex")}`);
  state.mixHash(ephPub);
  const clientHello = encodeHandshakeMessage({ clientHello: { ephemeral: ephPub } });
  ws.send(prependHeader(clientHello));
  const serverHelloRaw = await readRawFrame(ws);
  const serverHello = decodeServerHello(serverHelloRaw);
  const serverEphPub = Buffer.from(serverHello.ephemeral);
  const serverStaticEnc = Buffer.from(serverHello.static);
  logger.debug("debug", `ServerStaticEnc: ${serverStaticEnc.toString("hex")}`);
  const certEnc = Buffer.from(serverHello.payload);
  logger.debug("noise-handshake", `Eph: ${serverEphPub.length}, StaticEnc: ${serverStaticEnc.length}, CertEnc: ${certEnc.length}`);
  logger.debug("debug", `ServerEphPub:  ${serverEphPub.toString("hex")}`);
  state.mixHash(serverEphPub);
  state.mixSharedSecretIntoKey(ephPriv, serverEphPub);
  logger.debug("debug", `After ServerHello mix: k=${state["k"]?.toString("hex")}, h=${state["h"]?.toString("hex")}`);
  const serverStaticPub = state.decrypt(serverStaticEnc);
  logger.debug("noise-handshake", `Decrypted Server Static Pub: ${serverStaticPub.toString("hex")}`);
  state.mixSharedSecretIntoKey(ephPriv, serverStaticPub);
  const certDecrypted = state.decrypt(certEnc);
  verifyCertChain(certDecrypted, serverStaticPub);
  const noiseKeyPub = getX25519PublicKey(noiseKeyPriv);
  const encNoisePub = state.encrypt(noiseKeyPub);
  state.mixSharedSecretIntoKey(noiseKeyPriv, serverEphPub);
  const encPayload = state.encrypt(clientPayload);
  const clientFinish = encodeHandshakeMessage({
    clientFinish: { static: encNoisePub, payload: encPayload }
  });
  const finishFrame = prependLength(clientFinish);
  logger.debug("noise-handshake", `Sending clientFinish frame (${finishFrame.length} bytes): ${finishFrame.toString("hex").slice(0, 32)}...`);
  ws.send(finishFrame);
  const { sendKey, recvKey } = state.finish();
  return {
    socket: new EncryptedFrameSocket(ws, sendKey, recvKey)
  };
}
function encodeHandshakeMessage(msg) {
  const chunks = [];
  if (msg.clientHello) {
    const hello = encLenDelim(1, msg.clientHello.ephemeral);
    chunks.push(encLenDelim(2, hello));
  }
  if (msg.clientFinish) {
    const finish = Buffer.concat([
      encLenDelim(1, msg.clientFinish.static),
      encLenDelim(2, msg.clientFinish.payload)
    ]);
    chunks.push(encLenDelim(4, finish));
  }
  return Buffer.concat(chunks);
}
function decodeServerHello(data) {
  const serverHelloRaw = decodeLenDelim(data, 3);
  return {
    ephemeral: decodeLenDelim(serverHelloRaw, 1),
    static: decodeLenDelim(serverHelloRaw, 2),
    payload: decodeLenDelim(serverHelloRaw, 3)
  };
}
function encVarint(n) {
  const bytes = [];
  let v = n >>> 0;
  while (v > 127) {
    bytes.push(v & 127 | 128);
    v >>>= 7;
  }
  bytes.push(v);
  return Buffer.from(bytes);
}
function encLenDelim(field, data) {
  return Buffer.concat([encVarint(field << 3 | 2), encVarint(data.length), data]);
}
function decodeLenDelim(data, targetField) {
  let pos = 0;
  while (pos < data.length) {
    const tag = data[pos];
    pos++;
    const field = tag >> 3;
    const wire = tag & 7;
    if (wire === 2) {
      let len = 0, shift = 0;
      while (true) {
        const b = data[pos];
        pos++;
        len |= (b & 127) << shift;
        if (!(b & 128)) break;
        shift += 7;
      }
      const value = data.subarray(pos, pos + len);
      pos += len;
      if (field === targetField) return Buffer.from(value);
    } else if (wire === 0) {
      while (pos < data.length && data[pos] & 128) pos++;
      pos++;
    } else break;
  }
  throw new Error(`Field ${targetField} not found in handshake message`);
}
function prependHeader(data) {
  return Buffer.concat([WA_HEADER, prependLength(data)]);
}
function prependLength(data) {
  const header = Buffer.alloc(3);
  header.writeUIntBE(data.length, 0, 3);
  return Buffer.concat([header, data]);
}
async function readRawFrame(ws) {
  const header = await ws.readRaw(3);
  const len = header.readUIntBE(0, 3);
  const payload = await ws.readRaw(len);
  logger.debug("noise-handshake", `Raw Frame received: header=${header.toString("hex")} (len=${len}), payload_head=${payload.toString("hex").slice(0, 32)}...`);
  return payload;
}

// src/e2ee/transport/noise/noise-socket.ts
var FacebookE2EESocket = class extends import_node_events2.EventEmitter {
  ws = null;
  noiseSocket = null;
  url;
  heartbeatInterval = null;
  isConnected = false;
  constructor(endpoint) {
    super();
    this.url = endpoint;
  }
  async connect(noisePrivKey, authPayload) {
    return new Promise((resolve, reject) => {
      try {
        let readFromBuffer2 = function(len) {
          let res = Buffer.alloc(len);
          let offset = 0;
          while (offset < len && streamBuffer.length > 0) {
            const first = streamBuffer[0];
            const remaining = len - offset;
            if (first && first.length <= remaining) {
              first.copy(res, offset);
              offset += first.length;
              streamBuffer.shift();
            } else if (first) {
              first.copy(res, offset, 0, remaining);
              streamBuffer[0] = first.subarray(remaining);
              offset += remaining;
            } else {
              break;
            }
          }
          streamLen -= len;
          return res;
        };
        var readFromBuffer = readFromBuffer2;
        const wsUrl = new URL(this.url);
        wsUrl.searchParams.set("cid", "client-" + Date.now());
        const UserAgentStr = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";
        this.ws = new WebSocket(wsUrl.toString(), void 0, {
          headers: {
            "Origin": "https://www.facebook.com",
            "User-Agent": UserAgentStr
          }
        });
        this.ws.binaryType = "arraybuffer";
        let handshakeResolved = false;
        let streamBuffer = [];
        let streamLen = 0;
        let waitingResolver = null;
        let waitingLen = 0;
        this.ws.addEventListener("message", (ev) => {
          const frame = Buffer.from(ev.data);
          streamBuffer.push(frame);
          streamLen += frame.length;
          if (waitingResolver && streamLen >= waitingLen) {
            const res = waitingResolver;
            const len = waitingLen;
            waitingResolver = null;
            waitingLen = 0;
            res(readFromBuffer2(len));
          }
        });
        const rawWs = {
          send: (data) => {
            if (this.ws?.readyState === WebSocket.OPEN) {
              this.ws.send(data);
            }
          },
          readRaw: (len) => {
            const targetLen = len || 0;
            if (targetLen === 0) {
              if (streamLen > 0) return Promise.resolve(readFromBuffer2(streamLen));
              return new Promise((resolve2) => {
                waitingLen = 1;
                waitingResolver = () => resolve2(readFromBuffer2(streamLen));
              });
            }
            if (streamLen >= targetLen) {
              return Promise.resolve(readFromBuffer2(targetLen));
            }
            if (this.ws?.readyState !== WebSocket.OPEN) {
              return Promise.reject(new Error("WebSocket not open"));
            }
            return new Promise((resolve2) => {
              waitingLen = targetLen;
              waitingResolver = resolve2;
            });
          },
          close: () => this.ws?.close()
        };
        this.ws.addEventListener("close", () => {
          this.isConnected = false;
          this.stopHeartbeat();
          if (waitingResolver) {
            waitingResolver(null);
            waitingResolver = null;
          }
          this.emit("disconnected");
        });
        this.ws.addEventListener("open", async () => {
          try {
            const { socket } = await doHandshake(rawWs, noisePrivKey, authPayload);
            this.noiseSocket = socket;
            handshakeResolved = true;
            this.isConnected = true;
            this.emit("connected");
            resolve();
            this.startReading();
            this.startHeartbeat();
          } catch (err) {
            reject(err);
            this.ws?.close();
          }
        });
        this.ws.addEventListener("error", (ev) => {
          if (!handshakeResolved) reject(new Error("WebSocket error"));
          this.emit("error", ev);
        });
      } catch (err) {
        reject(err);
      }
    });
  }
  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(async () => {
      try {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          logger.debug("NoiseSocket", "Sending Noise heartbeat (0,0,0)...");
          this.ws.send(Buffer.from([0, 0, 0]));
        }
      } catch (err) {
        logger.error("FacebookE2EESocket", "Heartbeat failed:", err);
      }
    }, 15e3);
  }
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  async startReading() {
    if (!this.noiseSocket) return;
    try {
      while (this.isConnected && this.noiseSocket) {
        logger.debug("FacebookE2EESocket", "Waiting for frame...");
        const frame = await this.noiseSocket.readFrame();
        if (frame && frame.length > 0) {
          try {
            logger.debug("FacebookE2EESocket", `Unmarshaling frame (${frame.length} bytes)...`);
            const node = unmarshal(frame);
            logger.debug("FacebookE2EESocket", `Decrypted node: <${node.tag}>`, JSON.stringify(node.attrs, null, 2));
            if (node.content) {
              logger.debug("FacebookE2EESocket", `Node content type: ${Array.isArray(node.content) ? "Array[" + node.content.length + "]" : typeof node.content}`);
            }
          } catch (e) {
            logger.error("FacebookE2EESocket", `Received decrypted frame (${frame.length} bytes), but failed to unmarshal: ${e}`);
            logger.debug("FacebookE2EESocket", `Frame hex: ${frame.toString("hex").slice(0, 100)}`);
          }
          this.emit("frame", frame);
        } else if (frame) {
          logger.debug("FacebookE2EESocket", "Received empty frame (heartbeat from server)");
        }
      }
    } catch (err) {
      if (!this.isConnected) {
        logger.debug("FacebookE2EESocket", "Read loop stopped after intentional socket close");
        return;
      }
      logger.error("FacebookE2EESocket", "Read loop stopped due to error:", err);
      this.isConnected = false;
      this.emit("error", err);
    }
  }
  async sendFrame(data) {
    if (!this.noiseSocket) throw new Error("Socket not connected");
    try {
      const node = unmarshal(data);
      logger.debug("NoiseSocket", `Sending encrypted node: <${node.tag}>`, JSON.stringify(node.attrs, null, 2));
      try {
        const record = { ts: Date.now(), tag: node.tag, attrs: node.attrs, hex: data.toString("hex") };
        (0, import_node_fs2.appendFileSync)("./outbound_frames.log", JSON.stringify(record) + "\n");
      } catch (e) {
        logger.debug("NoiseSocket", "Failed to write outbound frame log:", e);
      }
    } catch (e) {
      logger.debug("NoiseSocket", `Sending raw encrypted frame (${data.length} bytes)`);
      try {
        const record = { ts: Date.now(), tag: null, attrs: null, hex: data.toString("hex") };
        (0, import_node_fs2.appendFileSync)("./outbound_frames.log", JSON.stringify(record) + "\n");
      } catch (e2) {
        logger.debug("NoiseSocket", "Failed to write outbound frame log:", e2);
      }
    }
    await this.noiseSocket.sendFrame(data);
  }
  close() {
    this.isConnected = false;
    this.stopHeartbeat();
    this.noiseSocket?.close();
    this.ws?.close();
  }
};

// src/e2ee/transport/dgw/dgw-socket.ts
init_cjs_shims();
var import_node_events3 = require("events");
var import_ws = __toESM(require_ws(), 1);
var FRAME_PING = 9;
var FRAME_PONG = 10;
var FRAME_ACK = 12;
var FRAME_DATA = 13;
var FRAME_OPEN = 15;
var FacebookDGWSocket = class extends import_node_events3.EventEmitter {
  sockets = {};
  pingTimer = null;
  async connect(opts) {
    const entries = Object.entries(opts.endpoints).filter(([, u]) => Boolean(u));
    if (entries.length === 0) {
      throw new Error("No DGW endpoint provided");
    }
    await Promise.all(entries.map(([kind, url]) => this.connectOne(kind, url, opts)));
    if (opts.bootstrap) {
      const targets = opts.bootstrap.targets ?? ["realtime", "streamcontroller"];
      for (const target of targets) {
        const ws = this.sockets[target];
        if (!ws || ws.readyState !== import_ws.default.OPEN) continue;
        try {
          const open = this.buildOpenFrame({
            streamId: opts.bootstrap.streamId ?? 1,
            method: opts.bootstrap.method ?? "FBGQLS:FRLightSpeedLiveQuery",
            docId: opts.bootstrap.docId ?? "8364718423641772",
            routingHint: opts.bootstrap.routingHint ?? "FRLightSpeedLiveQuery",
            body: opts.bootstrap.body ?? JSON.stringify({
              input_data: {
                sync_params: JSON.stringify({
                  filter: ["lightspeed"]
                })
              }
            }),
            acceptAck: opts.bootstrap.acceptAck ?? "RSAck",
            referer: opts.bootstrap.referer ?? "https://www.facebook.com/"
          });
          ws.send(open);
          this.emit("debug", { type: "bootstrap_open_sent", target });
        } catch (err) {
          this.emit("debug", { type: "bootstrap_open_failed", target, error: err.message });
        }
      }
      if (opts.bootstrap.dataPayload && opts.bootstrap.dataPayload.length > 0) {
        const dataTargets = opts.bootstrap.dataTargets ?? targets;
        for (const target of dataTargets) {
          const ws = this.sockets[target];
          if (!ws || ws.readyState !== import_ws.default.OPEN) continue;
          try {
            const dataFrame = this.buildDataFrame(
              opts.bootstrap.streamId ?? 1,
              opts.bootstrap.dataPayload,
              opts.bootstrap.dataRequiresAck ?? true,
              opts.bootstrap.dataAckId ?? 0
            );
            ws.send(dataFrame);
            this.emit("debug", {
              type: "bootstrap_data_sent",
              target,
              payloadLen: opts.bootstrap.dataPayload.length,
              requiresAck: opts.bootstrap.dataRequiresAck ?? true,
              ackId: opts.bootstrap.dataAckId ?? 0
            });
          } catch (err) {
            this.emit("debug", { type: "bootstrap_data_failed", target, error: err.message });
          }
        }
      }
    }
    this.startPingLoop(opts.pingIntervalMs ?? 15e3);
    this.emit("connected");
  }
  close() {
    this.stopPingLoop();
    for (const ws of Object.values(this.sockets)) {
      ws?.close();
    }
    this.sockets = {};
  }
  sendDataFrame(target, streamId, payload, requiresAck = true, ackId = 0) {
    const ws = this.sockets[target];
    if (!ws || ws.readyState !== import_ws.default.OPEN) {
      throw new Error(`Socket for ${target} is not open`);
    }
    const frame = this.buildDataFrame(streamId, payload, requiresAck, ackId);
    ws.send(frame);
    this.emit("debug", { type: "data_sent", target, streamId, payloadLen: payload.length });
  }
  async connectOne(kind, url, opts) {
    await new Promise((resolve, reject) => {
      const host = new URL(url).hostname;
      const ws = new import_ws.default(url, {
        headers: {
          Origin: opts.origin,
          "User-Agent": opts.userAgent,
          Cookie: opts.cookieHeader,
          Referer: opts.referer ?? `${opts.origin}/`,
          Host: host,
          "Accept-Language": opts.acceptLanguage ?? "en-US,en;q=0.9"
        },
        perMessageDeflate: true
      });
      ws.on("open", () => {
        this.sockets[kind] = ws;
        this.emit("socket_open", { kind, url });
        resolve();
      });
      ws.on("message", (data, isBinary) => {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
        if (!isBinary || buf.length === 0) {
          this.emit("frame", { kind, isBinary, text: buf.toString("utf8") });
          return;
        }
        this.handleIncomingFrame(kind, buf);
      });
      ws.on("error", (err) => {
        this.emit("error", new Error(`DGW:${kind}] ${err.message}`));
        reject(err);
      });
      ws.on("close", (code, reason) => {
        this.emit("socket_close", { kind, code, reason: reason.toString() });
      });
    });
  }
  startPingLoop(intervalMs) {
    this.stopPingLoop();
    this.pingTimer = setInterval(() => {
      for (const [kind, ws] of Object.entries(this.sockets)) {
        if (!ws || ws.readyState !== import_ws.default.OPEN) continue;
        ws.send(Buffer.from([FRAME_PING]));
        this.emit("debug", { type: "ping_sent", target: kind });
      }
    }, intervalMs);
  }
  stopPingLoop() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }
  handleIncomingFrame(kind, buf) {
    const parsed = this.parseFrame(buf);
    if (!parsed) {
      this.emit("frame", { kind, rawHex: buf.toString("hex") });
      return;
    }
    const payloadPreview = parsed.payload ? this.tryParsePayload(parsed.payload) : null;
    this.emit("frame", {
      kind,
      frameType: parsed.frameType,
      streamId: parsed.streamId,
      payloadLength: parsed.payloadLength,
      requiresAck: parsed.requiresAck,
      ackId: parsed.ackId,
      payloadHexHead: parsed.payload?.subarray(0, 48).toString("hex"),
      payloadTextHead: payloadPreview?.textHead,
      payloadJson: payloadPreview?.json
    });
    const ws = this.sockets[kind];
    if (!ws || ws.readyState !== import_ws.default.OPEN) return;
    if (parsed.frameType === FRAME_PING) {
      ws.send(Buffer.from([FRAME_PONG]));
      return;
    }
    if (parsed.frameType === FRAME_DATA && parsed.requiresAck && typeof parsed.streamId === "number" && typeof parsed.ackId === "number") {
      ws.send(this.buildAckFrame(parsed.streamId, parsed.ackId));
      return;
    }
  }
  parseFrame(buf) {
    if (buf.length < 1) return null;
    const frameType = buf[0] ?? 0;
    if (frameType === FRAME_PING || frameType === FRAME_PONG) {
      return { frameType };
    }
    if (frameType === 14) {
      this.emit("debug", { type: "frame_0e_len", len: buf.length, hex: buf.toString("hex") });
    }
    if ((frameType === FRAME_OPEN || frameType === FRAME_ACK || frameType === FRAME_DATA || frameType === 14) && buf.length >= 6) {
      const streamId = buf.readUInt16LE(1);
      const payloadLength = buf.readUInt16LE(3);
      if (frameType === FRAME_ACK) {
        if (buf.length < 8) return null;
        const ackId = buf.readUInt16LE(6);
        return { frameType, streamId, payloadLength, ackId };
      }
      if (frameType === FRAME_DATA) {
        if (buf.length < 8) return null;
        const ackRaw = buf.readUInt16LE(6);
        const requiresAck = (ackRaw & 32768) > 0;
        const ackId = ackRaw & 32767;
        const payload2 = buf.subarray(8, 8 + Math.max(0, payloadLength - 2));
        return { frameType, streamId, payloadLength, requiresAck, ackId, payload: payload2 };
      }
      const payload = buf.subarray(6, 6 + payloadLength);
      return { frameType, streamId, payloadLength, payload };
    }
    return { frameType };
  }
  buildAckFrame(streamId, ackId) {
    const out = Buffer.alloc(8);
    out[0] = FRAME_ACK;
    out.writeUInt16LE(streamId & 65535, 1);
    out.writeUInt16LE(2, 3);
    out[5] = 0;
    out.writeUInt16LE(ackId & 65535, 6);
    return out;
  }
  buildDataFrame(streamId, payload, requiresAck, ackId) {
    const out = Buffer.alloc(8 + payload.length);
    out[0] = FRAME_DATA;
    out.writeUInt16LE(streamId & 65535, 1);
    out.writeUInt16LE(payload.length + 2, 3);
    out[5] = 0;
    let ackRaw = ackId & 32767;
    if (requiresAck) ackRaw |= 32768;
    out.writeUInt16LE(ackRaw, 6);
    payload.copy(out, 8);
    return out;
  }
  buildOpenFrame(params) {
    const jsonPayload = Buffer.from(JSON.stringify({
      "x-dgw-app-XRSS-method": params.method,
      "x-dgw-app-XRSS-doc_id": params.docId,
      "x-dgw-app-XRSS-routing_hint": params.routingHint,
      "x-dgw-app-xrs-body": params.body,
      "x-dgw-app-XRS-Accept-Ack": params.acceptAck,
      "x-dgw-app-XRSS-http_referer": params.referer
    }));
    const out = Buffer.alloc(6 + jsonPayload.length);
    out[0] = FRAME_OPEN;
    out.writeUInt16LE(params.streamId & 65535, 1);
    out.writeUInt16LE(jsonPayload.length, 3);
    out[5] = 0;
    jsonPayload.copy(out, 6);
    return out;
  }
  tryParsePayload(payload) {
    const text = payload.toString("utf8");
    const textHead = text.slice(0, 240);
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const jsonStr = text.slice(start, end + 1);
      try {
        return { textHead, json: JSON.parse(jsonStr) };
      } catch {
        return { textHead };
      }
    }
    return { textHead };
  }
};

// src/controllers/event-mapper.ts
init_cjs_shims();
var import_node_events4 = require("events");
var EventMapper = class {
  constructor(eventBus, mediaService, e2eeService) {
    this.eventBus = eventBus;
    this.mediaService = mediaService;
    this.e2eeService = e2eeService;
  }
  eventBus;
  mediaService;
  e2eeService;
  emitMappedEvent(rawEvent) {
    const type = str(rawEvent.type);
    if (type === "message" || type === "message_reply") {
      const msg = {
        id: str(rawEvent.messageID),
        threadId: str(rawEvent.threadID),
        senderId: str(rawEvent.senderID),
        text: str(rawEvent.body),
        timestampMs: num(rawEvent.timestamp) || now(),
        attachments: this.mapAttachments(rawEvent.attachments),
        mentions: this.mapMentions(rawEvent)
      };
      const reply = rawEvent.messageReply;
      if (reply?.messageID) {
        msg.replyTo = {
          messageId: str(reply.messageID),
          senderId: str(reply.senderID),
          text: str(reply.body)
        };
      }
      this.emit({ type: "message", data: msg });
      return;
    }
    if (type === "message_edit" || type === "messageEdit") {
      this.emit({
        type: "messageEdit",
        data: {
          messageId: str(rawEvent.messageID),
          threadId: str(rawEvent.threadID),
          newText: str(rawEvent.newText ?? rawEvent.text ?? rawEvent.body),
          editCount: num(rawEvent.editCount),
          timestampMs: num(rawEvent.timestamp) || now()
        }
      });
      return;
    }
    if (type === "message_reaction" || type === "reaction") {
      this.emit({
        type: "reaction",
        data: {
          messageId: str(rawEvent.messageID),
          threadId: str(rawEvent.threadID),
          actorId: str(rawEvent.userID ?? rawEvent.senderID),
          reaction: str(rawEvent.reaction),
          timestampMs: num(rawEvent.timestamp) || now()
        }
      });
      return;
    }
    if (type === "typ") {
      this.emit({
        type: "typing",
        data: {
          threadId: str(rawEvent.threadID),
          senderId: str(rawEvent.from ?? rawEvent.senderID),
          isTyping: Boolean(rawEvent.isTyping)
        }
      });
      return;
    }
    if (type === "message_unsend") {
      this.emit({
        type: "message_unsend",
        data: {
          messageId: str(rawEvent.messageID),
          threadId: str(rawEvent.threadID),
          actorId: str(rawEvent.senderID),
          timestampMs: num(rawEvent.timestamp) || now()
        }
      });
      return;
    }
    if (type === "read_receipt") {
      this.emit({
        type: "read_receipt",
        data: {
          threadId: str(rawEvent.threadID),
          readerId: str(rawEvent.reader ?? rawEvent.readerID),
          readWatermarkTimestampMs: num(rawEvent.readWatermarkTimestampMs),
          timestampMs: num(rawEvent.time ?? rawEvent.timestamp) || now()
        }
      });
      return;
    }
    if (type === "presence") {
      this.emit({
        type: "presence",
        data: {
          userId: str(rawEvent.userID),
          isOnline: Boolean(rawEvent.userStatus ?? rawEvent.isOnline),
          lastActiveTimestampMs: num(rawEvent.timestamp)
        }
      });
      return;
    }
    if (type === "disconnected") {
      this.emit({ type: "disconnected", data: { isE2EE: Boolean(rawEvent.isE2EE) } });
      return;
    }
    if (type === "reconnected") {
      this.emit({ type: "reconnected", data: {} });
      return;
    }
    if (type === "ready") {
      this.emit({ type: "ready", data: { isNewSession: Boolean(rawEvent.isNewSession) } });
      return;
    }
    if (type === "e2ee_connected" || type === "e2eeConnected") {
      this.e2eeService.markConnected();
      this.emit({ type: "e2ee_connected", data: {} });
      return;
    }
    if (type === "e2ee_message" || type === "e2eeMessage") {
      const e2eeData = rawEvent.data;
      if (!e2eeData) return;
      const rawChatJid = str(e2eeData.chatJid || e2eeData.threadId);
      const senderInfo = this.parseMessengerJid(str(e2eeData.senderJid));
      const senderId = str(e2eeData.senderId) || senderInfo.user || senderInfo.rawUser || senderInfo.jid;
      const senderJid = this.canonicalMessengerDeviceJid(str(e2eeData.senderJid), senderId, senderInfo.device);
      const chat = this.normalizeE2EEChat(rawChatJid || senderJid);
      if (e2eeData.type === "decryption_failed") {
        this.emit({
          type: "error",
          data: {
            message: `E2EE decrypt failed${chat.chatJid ? ` in ${chat.chatJid}` : ""}${senderJid ? ` from ${senderJid}` : ""}: ${str(e2eeData.error)}`
          }
        });
        return;
      }
      const kind = this.normalizeE2EEKind(e2eeData.kind || e2eeData.type, e2eeData);
      const data = {
        id: str(e2eeData.messageId || e2eeData.messageID),
        threadId: chat.threadId,
        chatJid: chat.chatJid,
        senderJid,
        senderId,
        isGroup: chat.isGroup,
        kind,
        text: str(e2eeData.text || e2eeData.body || ""),
        timestampMs: num(e2eeData.timestampMs || e2eeData.timestamp) || now()
      };
      if (senderInfo.device > 0) data.senderDeviceId = senderInfo.device;
      if (Array.isArray(e2eeData.attachments) && e2eeData.attachments.length > 0) data.attachments = e2eeData.attachments;
      if (Array.isArray(e2eeData.mentions) && e2eeData.mentions.length > 0) data.mentions = e2eeData.mentions;
      if (e2eeData.media) data.media = e2eeData.media;
      if (e2eeData.raw) data.raw = e2eeData.raw;
      if (e2eeData.emoji || e2eeData.reaction) data.reaction = str(e2eeData.emoji || e2eeData.reaction);
      if (e2eeData.targetId) data.targetId = str(e2eeData.targetId);
      if (typeof e2eeData.fromMe === "boolean") data.fromMe = e2eeData.fromMe;
      if (e2eeData.replyToId) {
        const replySender = this.parseMessengerJid(str(e2eeData.replyToSenderJid));
        data.replyTo = {
          messageId: str(e2eeData.replyToId),
          senderId: replySender.user || str(e2eeData.replyToSenderJid)
        };
      }
      this.emit({
        type: "e2ee_message",
        data
      });
      return;
    }
    if (type === "e2ee_reaction" || type === "e2eeReaction") {
      const d = rawEvent.data ?? rawEvent;
      this.emit({
        type: "e2ee_reaction",
        data: {
          messageId: str(d.messageId),
          chatJid: str(d.chatJid),
          senderJid: str(d.senderJid),
          senderId: str(d.senderId),
          reaction: str(d.reaction)
        }
      });
      return;
    }
    if (type === "e2ee_receipt" || type === "e2eeReceipt") {
      const d = rawEvent.data ?? rawEvent;
      this.emit({
        type: "e2ee_receipt",
        data: {
          type: str(d.type),
          chat: str(d.chat),
          sender: str(d.sender),
          messageIds: Array.isArray(d.messageIds) ? d.messageIds.map(str) : []
        }
      });
      return;
    }
    this.emit({ type: "raw", data: rawEvent });
  }
  normalizeE2EEKind(value, data) {
    const kind = str(value);
    if (this.isE2EEMessageKind(kind)) return kind;
    if (data.media && typeof data.media === "object" && data.media !== null) {
      const mediaType = str(data.media.type);
      if (this.isE2EEMessageKind(mediaType)) return mediaType;
    }
    if (str(data.text || data.body)) return "text";
    return "unknown";
  }
  isE2EEMessageKind(value) {
    return ["text", "image", "video", "audio", "document", "sticker", "reaction", "edit", "revoke", "unknown"].includes(value);
  }
  normalizeE2EEChat(jid) {
    if (!jid) return { threadId: "", chatJid: "", isGroup: false };
    if (this.isGroupJid(jid)) return { threadId: jid, chatJid: jid, isGroup: true };
    const parsed = this.parseMessengerJid(jid);
    if (parsed.server === "msgr" && parsed.user) {
      return {
        threadId: parsed.user,
        chatJid: `${parsed.user}.0@msgr`,
        isGroup: false
      };
    }
    if (/^\d+$/.test(jid)) {
      return { threadId: jid, chatJid: `${jid}.0@msgr`, isGroup: false };
    }
    return { threadId: jid, chatJid: jid, isGroup: false };
  }
  isGroupJid(jid) {
    return jid.endsWith("@g.us") || jid.includes(".g.");
  }
  canonicalMessengerDeviceJid(jid, fallbackUser, fallbackDevice = 0) {
    const parsed = this.parseMessengerJid(jid);
    if (parsed.server === "msgr" && parsed.user) return `${parsed.user}.${parsed.device}@msgr`;
    if (!jid && fallbackUser) return `${fallbackUser}.${fallbackDevice}@msgr`;
    return jid;
  }
  parseMessengerJid(jid) {
    const [userPart = jid, server = ""] = jid.split("@");
    const colonIdx = userPart.indexOf(":");
    const dotIdx = userPart.indexOf(".");
    const userEnd = dotIdx !== -1 ? dotIdx : colonIdx !== -1 ? colonIdx : userPart.length;
    const user = userPart.slice(0, userEnd) || userPart;
    const rawDevice = colonIdx !== -1 ? userPart.slice(colonIdx + 1) : dotIdx !== -1 ? userPart.slice(dotIdx + 1) : "0";
    return { jid, rawUser: userPart, user, device: Number(rawDevice) || 0, server };
  }
  emit(event) {
    if (event.type !== "error" || this.eventBus.listenerCount("error") > 0) {
      this.eventBus.emit(event.type, event.data);
    }
    this.eventBus.emit("event", event);
  }
  mapAttachments(raw) {
    if (!Array.isArray(raw) || raw.length === 0) return void 0;
    const mapped = raw.map((item) => this.mediaService.normalizeAttachment(item)).filter((item) => item !== null);
    return mapped.length > 0 ? mapped : void 0;
  }
  mapMentions(rawEvent) {
    const mentions = rawEvent.mentions;
    if (!Array.isArray(mentions) || mentions.length === 0) return void 0;
    return mentions.flatMap((m) => {
      if (typeof m !== "object" || m === null) return [];
      const item = m;
      return [
        {
          userId: str(item.id ?? item.userId),
          offset: num(item.fromIndex ?? item.offset),
          length: num(item.length),
          type: str(item.type) || "user"
        }
      ];
    });
  }
};

// src/controllers/dgw-handler.ts
init_cjs_shims();
var DGWHandler = class {
  constructor(eventMapper) {
    this.eventMapper = eventMapper;
  }
  eventMapper;
  seenDGWMessageIds = /* @__PURE__ */ new Set();
  handleDGWFrame(frame) {
    const payloadJson = frame.payloadJson;
    const root2 = this.unwrapDGWPayloadRoot(payloadJson);
    if (!root2) return;
    const operations = [];
    this.collectDGWStoredProcedures(root2, operations);
    for (const op of operations) {
      const normalized = this.normalizeDGWStoredProcedureMessage(op.name, op.args);
      if (!normalized) continue;
      if (normalized.messageId && this.seenDGWMessageIds.has(normalized.messageId)) {
        continue;
      }
      if (normalized.messageId) {
        if (this.seenDGWMessageIds.size > 5e3) {
          this.seenDGWMessageIds.clear();
        }
        this.seenDGWMessageIds.add(normalized.messageId);
      }
      this.eventMapper.emitMappedEvent({ type: "e2ee_message", data: normalized });
    }
  }
  buildDGWBootstrapDataPayload(userId, deviceId) {
    const explicitHex = process.env.FB_DGW_BOOTSTRAP_DATA_PAYLOAD_HEX;
    if (explicitHex && explicitHex.trim().length > 0) {
      const clean = explicitHex.trim().replace(/^0x/i, "").replace(/\s+/g, "");
      try {
        return Buffer.from(clean, "hex");
      } catch {
        return void 0;
      }
    }
    const jsonStr = process.env.FB_DGW_BOOTSTRAP_DATA_JSON;
    const autoEnabled = process.env.FB_DGW_BOOTSTRAP_DATA_AUTO !== "0";
    const defaultJson = JSON.stringify({
      input_data: {
        user_id: userId,
        device_id: deviceId || process.env.FB_DGW_DEVICE_ID || "31c42901-eb7a-417b-9969-ef3bcc71b1fc",
        entity_fbid: userId,
        sync_params: JSON.stringify({
          filter: ["lightspeed"],
          force_full_sync: true
        }),
        database: 1,
        client_capabilities: 7
      },
      batch_id: 1,
      terminate_at_indices: [],
      request_id: 1,
      "%options": {
        useOSSResponseFormat: true,
        client_has_ods_usecase_counters: true
      }
    });
    const effectiveJson = jsonStr && jsonStr.trim().length > 0 ? jsonStr : autoEnabled ? defaultJson : "";
    if (!effectiveJson) return void 0;
    const prefixHex = process.env.FB_DGW_BOOTSTRAP_DATA_PREFIX_HEX ?? "2c1878";
    const suffixHex = process.env.FB_DGW_BOOTSTRAP_DATA_SUFFIX_HEX ?? "0000";
    try {
      const normalizedJson = JSON.stringify(JSON.parse(effectiveJson));
      return Buffer.concat([
        Buffer.from(prefixHex, "hex"),
        Buffer.from(normalizedJson, "utf8"),
        Buffer.from(suffixHex, "hex")
      ]);
    } catch {
      return void 0;
    }
  }
  unwrapDGWPayloadRoot(payloadJson) {
    if (payloadJson && typeof payloadJson === "object") {
      const obj = payloadJson;
      if (typeof obj.payload === "string") {
        try {
          const parsed = JSON.parse(obj.payload);
          if (parsed && typeof parsed === "object") {
            return this.unwrapDGWPayloadRoot(parsed);
          }
        } catch {
        }
      }
      return obj;
    }
    if (typeof payloadJson === "string") {
      try {
        const parsed = JSON.parse(payloadJson);
        if (parsed && typeof parsed === "object") {
          return this.unwrapDGWPayloadRoot(parsed);
        }
      } catch {
      }
    }
    return null;
  }
  collectDGWStoredProcedures(node, out) {
    if (Array.isArray(node)) {
      if (node[0] === 5 && typeof node[1] === "string") {
        const decodedArgs = node.slice(2).map((value) => this.decodeDGWStepValue(value));
        out.push({ name: node[1], args: decodedArgs });
      }
      for (const child of node) {
        this.collectDGWStoredProcedures(child, out);
      }
      return;
    }
    if (node && typeof node === "object") {
      for (const value of Object.values(node)) {
        this.collectDGWStoredProcedures(value, out);
      }
    }
  }
  decodeDGWStepValue(value) {
    if (!Array.isArray(value)) return value;
    if (value.length === 0) return value;
    const op = value[0];
    if (op === 9) return void 0;
    if (op === 19) return value[1];
    return value.map((item) => this.decodeDGWStepValue(item));
  }
  normalizeDGWStoredProcedureMessage(name, args) {
    if (name !== "insertMessage" && name !== "upsertMessage") return null;
    const messageId = str(args[8]);
    const chatJid = str(args[3]);
    const senderJid = str(args[10]);
    const isUnsent = Boolean(args[17]);
    if (!messageId || !chatJid || isUnsent) {
      return null;
    }
    const timestampMs = num(args[5]) || now();
    const rawText = str(args[0]);
    const translatedText = str(args[74]);
    const text = rawText || translatedText || "[non-text message]";
    return { text, chatJid, senderJid, messageId, timestampMs };
  }
};

// src/controllers/e2ee-handler.ts
init_cjs_shims();
var E2EEHandler = class {
  constructor(eventMapper, getSocket, getStore, onRetryReceipt) {
    this.eventMapper = eventMapper;
    this.getSocket = getSocket;
    this.getStore = getStore;
    this.onRetryReceipt = onRetryReceipt;
  }
  eventMapper;
  getSocket;
  getStore;
  onRetryReceipt;
  pendingIQs = /* @__PURE__ */ new Map();
  retryReceipts = /* @__PURE__ */ new Map();
  maxRetryReceiptsPerMessage = 2;
  async handleEncryptedMessage(node, selfUserId, e2eeClient) {
    const fromJid = node.attrs.from;
    const participantJid = node.attrs.participant || node.attrs.from;
    const senderJid = participantJid;
    let chatJid = node.attrs.from;
    const selfDevice = this.getStore()?.jidDevice ?? 0;
    const selfJid = `${selfUserId}.${selfDevice}@msgr`;
    const participantsNode = Array.isArray(node.content) ? node.content.find((c) => c.tag === "participants") : null;
    let emittedParticipantApp = false;
    if (participantsNode && Array.isArray(participantsNode.content)) {
      const selfToNodes = participantsNode.content.filter(
        (n) => n.tag === "to" && this.sameMessengerUser(n.attrs.jid, selfJid)
      );
      let processedSKDM = false;
      for (const toNode of selfToNodes) {
        if (!Array.isArray(toNode.content)) continue;
        const targetJid = typeof toNode.attrs.jid === "string" ? toNode.attrs.jid : selfJid;
        const myEnc = toNode.content.find((n) => n.tag === "enc");
        if (!myEnc || !Buffer.isBuffer(myEnc.content)) continue;
        logger.debug("E2EEHandler", `Trying participant SKDM DM from ${senderJid} to ${targetJid}`);
        try {
          let dmDecrypted = null;
          if (myEnc.attrs.type === "msg") {
            dmDecrypted = await e2eeClient.decryptDMMessage(senderJid, myEnc.content);
          } else if (myEnc.attrs.type === "pkmsg") {
            dmDecrypted = await e2eeClient.decryptDMPreKeyMessage(senderJid, targetJid, myEnc.content);
          }
          if (!dmDecrypted) continue;
          const transport = decodeMessageTransport(dmDecrypted);
          const participantChatJid = this.chatJidFromTransport(transport, chatJid);
          if (this.emitTransportApplication(transport, senderJid, participantChatJid, node.attrs.id)) {
            emittedParticipantApp = true;
          }
          const skdm = transport?.protocol?.ancillary?.skdm;
          const gid = skdm?.groupID || skdm?.groupId || chatJid;
          const skBytes = skdm?.axolotlSenderKeyDistributionMessage || skdm?.skdmBytes;
          if (skBytes) {
            logger.info("E2EEHandler", `Processing SKDM from participants node for group ${gid} from ${senderJid}`);
            await e2eeClient.processSenderKeyDistribution(senderJid, skBytes, gid);
            processedSKDM = true;
            if (!emittedParticipantApp) break;
          }
        } catch (err) {
          logger.debug("E2EEHandler", `Participant SKDM decrypt failed for ${targetJid}: ${err}`);
        }
      }
      if (selfToNodes.length > 0 && !processedSKDM && !emittedParticipantApp) {
        logger.warn("E2EEHandler", `Found ${selfToNodes.length} participant node(s) for self but no SKDM could be processed from ${senderJid}`);
      }
    }
    const enc = Array.isArray(node.content) ? node.content.find((c) => c.tag === "enc") : node.content?.tag === "enc" ? node.content : null;
    if (!enc) {
      const unavailable = Array.isArray(node.content) ? node.content.find((c) => c.tag === "unavailable") : node.content?.tag === "unavailable" ? node.content : null;
      if (emittedParticipantApp) {
        this.sendAck(node);
        return;
      }
      if (unavailable) {
        const err = new Error(`unavailable encrypted message${unavailable.attrs?.type ? `: ${unavailable.attrs.type}` : ""}`);
        await this.maybeSendRetryReceipt(node, senderJid, chatJid, err);
        this.eventMapper.emitMappedEvent({
          type: "e2ee_message",
          data: {
            type: "decryption_failed",
            error: err.message,
            chatJid,
            threadId: chatJid,
            senderJid,
            senderId: this.parseMessengerJid(senderJid).user,
            messageId: node.attrs.id,
            timestampMs: now()
          }
        });
      }
      this.sendAck(node);
      return;
    }
    const type = enc.attrs.type;
    const ciphertext = enc.content;
    if (!Buffer.isBuffer(ciphertext)) {
      this.sendAck(node);
      return;
    }
    try {
      let decrypted;
      if (type === "msg") {
        decrypted = await e2eeClient.decryptDMMessage(senderJid, ciphertext);
      } else if (type === "pkmsg") {
        decrypted = await e2eeClient.decryptDMPreKeyMessage(senderJid, selfJid, ciphertext);
      } else if (type === "skmsg") {
        decrypted = await e2eeClient.decryptGroupMessage(senderJid, ciphertext, fromJid);
      } else {
        this.sendAck(node);
        return;
      }
      const transport = decodeMessageTransport(decrypted);
      logger.debug("E2EEHandler", "Decrypted transport:", JSON.stringify(transport, null, 2));
      chatJid = this.chatJidFromTransport(transport, chatJid);
      this.emitTransportApplication(transport, senderJid, chatJid, node.attrs.id);
      if (transport?.protocol?.ancillary?.skdm) {
        const skdm = transport.protocol.ancillary.skdm;
        const gid = skdm.groupID || skdm.groupId || fromJid;
        const skBytes = skdm.axolotlSenderKeyDistributionMessage || skdm.skdmBytes;
        if (skBytes) {
          await e2eeClient.processSenderKeyDistribution(participantJid, skBytes, gid);
        }
      }
      this.sendAck(node);
    } catch (err) {
      logger.error("E2EEHandler", "Decryption failed:", err);
      await this.maybeSendRetryReceipt(node, senderJid, chatJid, err);
      this.sendAck(node);
      this.eventMapper.emitMappedEvent({
        type: "e2ee_message",
        data: {
          type: "decryption_failed",
          error: err.message,
          chatJid,
          threadId: chatJid,
          senderJid,
          senderId: this.parseMessengerJid(senderJid).user,
          messageId: node.attrs.id,
          timestampMs: now()
        }
      });
    }
  }
  parseMessengerJid(jid) {
    const value = jid ?? "";
    const [userPart = value, server = ""] = value.split("@");
    const colonIdx = userPart.indexOf(":");
    const dotIdx = userPart.indexOf(".");
    const userEnd = dotIdx !== -1 ? dotIdx : colonIdx !== -1 ? colonIdx : userPart.length;
    const user = userPart.slice(0, userEnd) || userPart;
    const rawDevice = colonIdx !== -1 ? userPart.slice(colonIdx + 1) : dotIdx !== -1 ? userPart.slice(dotIdx + 1) : "0";
    return { user, device: Number(rawDevice) || 0, server };
  }
  sameMessengerDevice(a, b) {
    const pa = this.parseMessengerJid(a);
    const pb = this.parseMessengerJid(b);
    return pa.server === "msgr" && pb.server === "msgr" && pa.user === pb.user && pa.device === pb.device;
  }
  sameMessengerUser(a, b) {
    const pa = this.parseMessengerJid(a);
    const pb = this.parseMessengerJid(b);
    return pa.server === "msgr" && pb.server === "msgr" && pa.user === pb.user;
  }
  async maybeSendRetryReceipt(node, senderJid, chatJid, err) {
    const messageId = node.attrs.id;
    if (!messageId) return;
    const message = err instanceof Error ? err.message : String(err ?? "");
    const retryable = /missing sender key state|No session|decrypt|invalid|unavailable/i.test(message);
    if (!retryable) return;
    const key = `${chatJid}:${senderJid}:${messageId}`;
    const count = (this.retryReceipts.get(key) ?? 0) + 1;
    if (count > this.maxRetryReceiptsPerMessage) {
      logger.warn("E2EEHandler", `Skip retry receipt for ${messageId}; retry limit reached`);
      return;
    }
    this.retryReceipts.set(key, count);
    try {
      await this.sendRetryReceipt(node, senderJid, count);
      logger.info("E2EEHandler", `Sent retry receipt #${count} for ${messageId} to recover missing E2EE keys`);
    } catch (retryErr) {
      logger.warn("E2EEHandler", `Failed to send retry receipt for ${messageId}: ${retryErr}`);
    }
  }
  async sendRetryReceipt(node, senderJid, retryCount) {
    const socket = this.getSocket();
    const store = this.getStore();
    if (!socket || !store?.registrationId) return;
    const receiptAttrs = {
      id: node.attrs.id,
      to: node.attrs.from,
      type: "retry"
    };
    if (node.attrs.participant || node.attrs.from?.endsWith("@g.us")) {
      receiptAttrs.participant = node.attrs.participant || senderJid;
    }
    const retryAttrs = {
      count: String(retryCount),
      id: node.attrs.id,
      t: String(node.attrs.t || Math.floor(now() / 1e3)),
      v: "1"
    };
    const regBuf = Buffer.alloc(4);
    regBuf.writeUInt32BE(store.registrationId);
    const children = [
      encodeNode("retry", retryAttrs),
      encodeNode("registration", {}, regBuf)
    ];
    const keysNode = await this.buildRetryKeysNode(store).catch((err) => {
      logger.debug("E2EEHandler", `Could not build retry keys node: ${err}`);
      return null;
    });
    if (keysNode) children.push(keysNode);
    const receipt = encodeNode("receipt", receiptAttrs, children);
    await socket.sendFrame(marshal(receipt));
  }
  async buildRetryKeysNode(store) {
    const [preKey] = await generatePreKeys(store, 1);
    if (!preKey) throw new Error("failed to generate retry prekey");
    let signedPreKey = await store.getSignedPreKey(store.signedPreKeyId).catch(() => null);
    if (!signedPreKey) signedPreKey = await generateSignedPreKey(store);
    return encodeNode("keys", {}, [
      encodeNode("type", {}, Buffer.from([5])),
      encodeNode("identity", {}, store.getIdentityPublicKey()),
      this.encodeSignalKeyNode("key", preKey.id, Buffer.from(preKey.record.publicKey().getPublicKeyBytes())),
      this.encodeSignalKeyNode(
        "skey",
        signedPreKey.id(),
        Buffer.from(signedPreKey.publicKey().getPublicKeyBytes()),
        Buffer.from(signedPreKey.signature())
      ),
      encodeNode("device-identity", {}, this.encodeDummyDeviceIdentity())
    ]);
  }
  encodeDummyDeviceIdentity() {
    return new ProtoWriter().bytes(1, Buffer.alloc(0)).bytes(2, Buffer.alloc(32)).bytes(3, Buffer.alloc(64)).bytes(4, Buffer.alloc(64)).build();
  }
  encodeSignalKeyNode(tag, id, publicKey, signature) {
    const idBuf = Buffer.alloc(4);
    idBuf.writeUInt32BE(id);
    const children = [
      encodeNode("id", {}, idBuf.subarray(1)),
      encodeNode("value", {}, publicKey)
    ];
    if (signature) children.push(encodeNode("signature", {}, signature));
    return encodeNode(tag, {}, children);
  }
  async handleReceipt(node) {
    const d = {
      type: node.attrs.type || "delivery",
      chat: node.attrs.from || "",
      sender: node.attrs.participant || node.attrs.from || "",
      messageIds: node.attrs.id ? [node.attrs.id] : []
    };
    this.eventMapper.emitMappedEvent({ type: "e2ee_receipt", data: d });
    if (node.attrs.type === "retry") {
      await this.onRetryReceipt?.(node);
    }
  }
  async handleNotification(node) {
    const notifType = node.attrs.type;
    if (notifType === "encrypt") {
      await this.handleEncryptNotification(node);
    } else {
      logger.debug("E2EEHandler", `Unhandled notification type ${notifType || "<none>"}`);
    }
  }
  async handleEncryptNotification(node) {
    const children = Array.isArray(node.content) ? node.content : node.content ? [node.content] : [];
    const countNode = children.find((child) => child.tag === "count");
    const value = Number(countNode?.attrs?.value);
    if (Number.isFinite(value)) {
      logger.info("E2EEHandler", `Server encrypt notification reports ${value} prekeys remaining`);
      if (value < 5) await this.uploadPreKeys(50);
      return;
    }
    const identityNode = children.find((child) => child.tag === "identity");
    if (identityNode) {
      logger.warn("E2EEHandler", `Received identity-change notification from ${node.attrs.from}; sessions may need refresh`);
      return;
    }
    logger.debug("E2EEHandler", `Unhandled encrypt notification from ${node.attrs.from || "server"}`);
  }
  chatJidFromTransport(transport, fallback) {
    const integral = transport?.protocol?.integral;
    const dsm = integral?.DSM || integral?.dsm;
    return dsm?.destinationJID || dsm?.destinationJid || fallback;
  }
  emitTransportApplication(transport, senderJid, chatJid, messageId) {
    const appPayload = transport?.payload?.applicationPayload?.payload;
    if (!appPayload) return false;
    const messageApp = decodeMessageApplication(appPayload);
    logger.debug("E2EEHandler", "Decrypted messageApp:", JSON.stringify(messageApp, null, 2));
    const subProtocol = messageApp.payload?.subProtocol;
    let appMessage = null;
    let isArmadillo = false;
    if (subProtocol?.consumerMessage?.payload) {
      appMessage = decodeConsumerApplication(subProtocol.consumerMessage.payload);
    } else if (subProtocol?.armadillo?.payload) {
      appMessage = decodeArmadillo(subProtocol.armadillo.payload);
      isArmadillo = true;
    }
    if (!appMessage) return false;
    const normalized = this.normalizeE2EEMessage(appMessage, senderJid, chatJid, messageId, messageApp);
    if (!normalized) return false;
    normalized.isArmadillo = isArmadillo;
    this.eventMapper.emitMappedEvent({ type: "e2ee_message", data: normalized });
    return true;
  }
  handleIQ(node) {
    const id = node.attrs.id;
    const xmlns = node.attrs.xmlns;
    const type = node.attrs.type;
    if (xmlns === "urn:xmpp:ping" && type === "get") {
      const pong = encodeIQ({ id, to: node.attrs.from, type: "result" });
      this.getSocket()?.sendFrame(marshal(pong));
    }
    logger.debug("E2EEHandler", `Handling IQ: id=${id}, type=${type}, xmlns=${node.attrs.xmlns}`);
    if (type === "result") {
      const content = node.content;
      let countNode = null;
      if (Array.isArray(content)) {
        countNode = content.find((n) => n && typeof n === "object" && n.tag === "count");
      } else if (content && typeof content === "object" && content.tag === "count") {
        countNode = content;
      }
      if (countNode) {
        const count = parseInt(countNode.attrs.value ?? "0");
        this.pendingIQs.get(id)?.resolve(count);
        this.pendingIQs.delete(id);
        return;
      }
      this.pendingIQs.get(id)?.resolve(node);
      this.pendingIQs.delete(id);
    } else if (type === "error") {
      this.pendingIQs.get(id)?.reject(new Error(`IQ Error: ${JSON.stringify(node.content)}`));
      this.pendingIQs.delete(id);
    }
  }
  handleIB(node) {
    const children = Array.isArray(node.content) ? node.content : node.content ? [node.content] : [];
    for (const child of children) {
      if (child.tag === "dirty") {
        const type = child.attrs.type;
        const timestamp = child.attrs.timestamp;
        if (type === "account_sync") {
          this.sendCleanIQ(type, timestamp).catch(() => {
          });
        }
      }
    }
  }
  async getMediaUploadConfig() {
    const id = `mc-${now()}`;
    const iq = encodeIQ({ id, to: "s.whatsapp.net", type: "set", xmlns: "w:m" }, [
      encodeNode("media_conn", {}, void 0)
    ]);
    logger.debug("E2EEHandler", `Sending media_conn IQ (id=${id})`);
    const res = await new Promise((resolve, reject) => {
      this.pendingIQs.set(id, { resolve, reject });
      this.getSocket()?.sendFrame(iq).catch(reject);
      setTimeout(() => {
        if (this.pendingIQs.has(id)) {
          this.pendingIQs.delete(id);
          reject(new Error("media_conn timeout (10s)"));
        }
      }, 1e4);
    });
    const findTag = (node, tag) => {
      if (node?.tag === tag) return node;
      if (Array.isArray(node?.content)) {
        for (const child of node.content) {
          const found = findTag(child, tag);
          if (found) return found;
        }
      }
      return null;
    };
    const mediaConn = findTag(res, "media_conn");
    if (!mediaConn) {
      logger.error("E2EEHandler", `media_conn IQ response missing <media_conn> node. Full response: ${JSON.stringify(res)}`);
      throw new Error("Missing media_conn in response");
    }
    const children = Array.isArray(mediaConn.content) ? mediaConn.content : [];
    const hosts = children.filter((child) => child.tag === "host" && child.attrs?.hostname).map((child) => String(child.attrs.hostname));
    const host = hosts.at(-1) || process.env.FB_E2EE_MEDIA_UPLOAD_HOST || "rupload.facebook.com";
    const auth = str(mediaConn.attrs?.auth);
    const ttl = num(mediaConn.attrs?.ttl);
    const authTtl = num(mediaConn.attrs?.auth_ttl);
    logger.debug("E2EEHandler", `media_conn received: host=${host}, auth=${auth ? `${auth.slice(0, 12)}...` : "(empty)"}, ttl=${ttl}, auth_ttl=${authTtl}`);
    if (!auth) {
      logger.error("E2EEHandler", `media_conn response has no auth attribute. Attrs: ${JSON.stringify(mediaConn.attrs)}`);
      throw new Error("Missing media_conn auth token");
    }
    return {
      host,
      auth,
      ttl,
      authTtl,
      fetchedAtMs: now()
    };
  }
  async getServerPreKeyCount() {
    const id = `pkc-${now()}`;
    const iq = encodeIQ({ id, to: "s.whatsapp.net", type: "get", xmlns: "encrypt" }, [
      encodeNode("count", {}, void 0)
    ]);
    return new Promise((resolve, reject) => {
      this.pendingIQs.set(id, { resolve, reject });
      this.getSocket()?.sendFrame(iq).catch(reject);
      setTimeout(() => {
        if (this.pendingIQs.has(id)) {
          this.pendingIQs.delete(id);
          resolve(0);
        }
      }, 5e3);
    });
  }
  async getGroupParticipants(groupJid) {
    const id = `gp-${now()}`;
    const iq = encodeIQ({ id, to: groupJid, type: "get", xmlns: "w:g2" }, [
      encodeNode("query", { request: "interactive" }, void 0)
    ]);
    logger.debug("E2EEHandler", `Sending getGroupParticipants IQ for ${groupJid}, id: ${id}`);
    const res = await new Promise((resolve, reject) => {
      this.pendingIQs.set(id, { resolve, reject });
      this.getSocket()?.sendFrame(iq).catch((err) => {
        logger.error("E2EEHandler", `Failed to send getGroupParticipants IQ:`, err);
        reject(err);
      });
      setTimeout(() => {
        if (this.pendingIQs.has(id)) {
          logger.error("E2EEHandler", `getGroupParticipants IQ timeout for ${id}`);
          this.pendingIQs.delete(id);
          reject(new Error(`getGroupParticipants timeout for ${groupJid}`));
        }
      }, 1e4);
    });
    logger.debug("E2EEHandler", `Received getGroupParticipants response for ${id}`);
    const groupNode = Array.isArray(res.content) ? res.content.find((n) => n.tag === "group") : null;
    if (!groupNode || !Array.isArray(groupNode.content)) {
      logger.warn("E2EEHandler", `No group node found in getGroupParticipants response for ${groupJid}`);
      return [];
    }
    const participants = groupNode.content.filter((n) => n.tag === "participant" && n.attrs.jid).map((n) => n.attrs.jid);
    logger.info("E2EEHandler", `Found ${participants.length} participants for ${groupJid}`);
    return participants;
  }
  async getDeviceList(userJids) {
    if (userJids.length === 0) return [];
    const id = `${now()}`;
    const iq = encodeIQ({
      id,
      to: "s.whatsapp.net",
      type: "get",
      xmlns: "fbid:devices"
    }, [
      encodeNode("users", {}, userJids.map((jid) => encodeNode("user", { jid })))
    ]);
    logger.debug("E2EEHandler", `Sending getDeviceList IQ for ${userJids.length} users, id: ${id}`);
    const res = await new Promise((resolve, reject) => {
      this.pendingIQs.set(id, { resolve, reject });
      this.getSocket()?.sendFrame(iq).catch((err) => {
        logger.error("E2EEHandler", `Failed to send getDeviceList IQ:`, err);
        reject(err);
      });
      setTimeout(() => {
        if (this.pendingIQs.has(id)) {
          logger.error("E2EEHandler", `getDeviceList IQ timeout for ${id}`);
          this.pendingIQs.delete(id);
          reject(new Error(`getDeviceList timeout for ${userJids.length} users`));
        }
      }, 1e4);
    });
    logger.debug("E2EEHandler", `Received getDeviceList response for ${id}`);
    const usersNode = Array.isArray(res.content) ? res.content.find((n) => n.tag === "users") : null;
    if (!usersNode || !Array.isArray(usersNode.content)) return [];
    const deviceJids = [];
    for (const userNode of usersNode.content) {
      if (userNode.tag !== "user" || !Array.isArray(userNode.content)) continue;
      const devicesNode = userNode.content.find((n) => n.tag === "devices");
      if (!devicesNode || !Array.isArray(devicesNode.content)) continue;
      const baseJid = userNode.attrs.jid;
      const parsed = this.parseMessengerJid(baseJid);
      const userId = parsed.user;
      const server = parsed.server;
      for (const deviceNode of devicesNode.content) {
        if (deviceNode.tag === "device" && deviceNode.attrs.id) {
          deviceJids.push(`${userId}.${deviceNode.attrs.id}@${server}`);
        }
      }
    }
    logger.info("E2EEHandler", `Discovered ${deviceJids.length} devices for ${userJids.length} users`);
    return deviceJids;
  }
  async getPreKeyBundle(jid) {
    const id = `pkb-${now()}`;
    const iq = encodeIQ({ id, to: "s.whatsapp.net", type: "get", xmlns: "encrypt" }, [
      encodeNode("key", {}, [
        encodeNode("user", { jid }, void 0)
      ])
    ]);
    const res = await new Promise((resolve, reject) => {
      this.pendingIQs.set(id, { resolve, reject });
      this.getSocket()?.sendFrame(iq).catch(reject);
      setTimeout(() => {
        if (this.pendingIQs.has(id)) {
          this.pendingIQs.delete(id);
          reject(new Error(`getPreKeyBundle timeout for ${jid}`));
        }
      }, 1e4);
    });
    logger.debug("E2EEHandler", `getPreKeyBundle response for ${jid}: ${JSON.stringify(res, (k, v) => Buffer.isBuffer(v) ? v.toString("hex") : v)}`);
    const findTag = (node, tag) => {
      if (node?.tag === tag) return node;
      if (Array.isArray(node?.content)) {
        for (const child of node.content) {
          const found = findTag(child, tag);
          if (found) return found;
        }
      }
      return null;
    };
    const userNode = findTag(res, "user");
    const keyNode = findTag(res, "key");
    if (!userNode) throw new Error(`Missing user node in prekey bundle for ${jid}`);
    if (!keyNode) throw new Error(`Missing key node in prekey bundle for ${jid}`);
    const registration = findTag(userNode, "registration")?.content;
    const identity = findTag(userNode, "identity")?.content;
    const skey = findTag(userNode, "skey");
    const key = findTag(keyNode, "key") || keyNode;
    if (!registration || !identity || !skey) throw new Error(`Missing required prekey components for ${jid}`);
    const requireBuffer = (value, field) => {
      if (Buffer.isBuffer(value)) return value;
      throw new Error(`Missing or invalid ${field} in prekey bundle for ${jid}`);
    };
    const keyWithPrefix = (value, field) => {
      const keyBytes = requireBuffer(value, field);
      return keyBytes.length === 32 ? Buffer.concat([Buffer.from([5]), keyBytes]) : keyBytes;
    };
    const readKeyId = (value) => {
      if (!Buffer.isBuffer(value) || value.length === 0) return 0;
      return value.readUIntBE(0, Math.min(value.length, 3));
    };
    const parseDeviceId = (deviceJid) => {
      const parsed = this.parseMessengerJid(deviceJid);
      return Number.isFinite(parsed.device) && parsed.device > 0 ? parsed.device : 1;
    };
    const signedPreKeyId = findTag(skey, "id")?.content;
    const signedPreKeyValue = findTag(skey, "value")?.content;
    const signedPreKeySignature = findTag(skey, "signature")?.content;
    const preKeyId = findTag(key, "id")?.content;
    const preKeyValue = findTag(key, "value")?.content;
    const hasPreKey = Boolean(findTag(key, "value"));
    const bundle = {
      registrationId: Buffer.isBuffer(registration) && registration.length === 4 ? registration.readUInt32BE(0) : 0,
      deviceId: parseDeviceId(jid),
      identityKey: keyWithPrefix(identity, "identity"),
      signedPreKey: {
        keyId: readKeyId(signedPreKeyId),
        publicKey: keyWithPrefix(signedPreKeyValue, "signed prekey public key"),
        signature: requireBuffer(signedPreKeySignature, "signed prekey signature")
      },
      preKey: hasPreKey ? {
        keyId: readKeyId(preKeyId),
        publicKey: keyWithPrefix(preKeyValue, "prekey public key")
      } : void 0
    };
    return bundle;
  }
  async uploadPreKeys(count) {
    const ds = this.getStore();
    if (!ds) throw new Error("DeviceStore not loaded");
    const preKeys = await generatePreKeys(ds, count);
    const spk = await generateSignedPreKey(ds);
    const idPair = await ds.getIdentityKeyPair();
    const payload = encodePreKeyUpload(
      ds.registrationId,
      Buffer.from(idPair.publicKey.getPublicKeyBytes()),
      {
        id: spk.id(),
        pubKey: Buffer.from(spk.publicKey().getPublicKeyBytes()),
        signature: Buffer.from(spk.signature())
      },
      preKeys.map((pk) => ({
        id: pk.id,
        pubKey: Buffer.from(pk.record.publicKey().getPublicKeyBytes())
      }))
    );
    await this.getSocket()?.sendFrame(payload);
  }
  sendAck(node) {
    const socket = this.getSocket();
    if (!socket) return;
    const attrs = {
      class: node.tag,
      id: node.attrs.id,
      to: node.attrs.from
    };
    if (node.attrs.participant) attrs.participant = node.attrs.participant;
    if (node.attrs.recipient) attrs.recipient = node.attrs.recipient;
    if (node.tag !== "message" && node.attrs.type) attrs.type = node.attrs.type;
    const ackNode = encodeNode("ack", attrs, void 0);
    socket.sendFrame(marshal(ackNode)).catch(() => {
    });
  }
  async sendCleanIQ(type, timestamp) {
    const socket = this.getSocket();
    if (!socket) return;
    const id = `clean-${now()}`;
    const cleanIQ = encodeIQ({ id, to: "s.whatsapp.net", type: "set", xmlns: "urn:xmpp:whatsapp:dirty" }, [
      encodeNode("clean", { type, timestamp }, void 0)
    ]);
    await socket.sendFrame(marshal(cleanIQ));
  }
  normalizeE2EEMessage(appMessage, senderJid, chatJid, messageId, messageApp) {
    const payload = appMessage?.payload;
    if (!payload) return null;
    const senderId = this.parseMessengerJid(senderJid).user;
    const common = {
      chatJid,
      senderJid,
      senderId,
      threadId: chatJid,
      messageId,
      timestampMs: now(),
      replyToId: messageApp?.metadata?.quotedMessage?.stanzaID,
      replyToSenderJid: messageApp?.metadata?.quotedMessage?.remoteJID || messageApp?.metadata?.quotedMessage?.participant
    };
    const applicationData = payload.applicationData;
    if (applicationData?.revoke) {
      return {
        ...common,
        kind: "revoke",
        targetId: applicationData.revoke.key?.ID || applicationData.revoke.targetMessageID,
        fromMe: applicationData.revoke.key?.fromMe
      };
    }
    const content = payload.content;
    if (!content) return null;
    if (content.messageText) return { ...common, kind: "text", text: content.messageText.text };
    if (content.extendedTextMessage) return { ...common, kind: "text", text: content.extendedTextMessage.text?.text, extended: content.extendedTextMessage };
    if (content.imageMessage) return { ...common, kind: "image", media: content.imageMessage };
    if (content.videoMessage) return { ...common, kind: "video", media: content.videoMessage };
    if (content.audioMessage) return { ...common, kind: "audio", media: content.audioMessage };
    if (content.documentMessage) return { ...common, kind: "document", media: content.documentMessage };
    if (content.stickerMessage) return { ...common, kind: "sticker", media: content.stickerMessage };
    if (content.reactionMessage) {
      return {
        ...common,
        kind: "reaction",
        emoji: content.reactionMessage.text,
        targetId: content.reactionMessage.key?.ID || content.reactionMessage.targetMessageID
      };
    }
    if (content.editMessage) {
      return {
        ...common,
        kind: "edit",
        text: content.editMessage.message?.text || content.editMessage.messageText?.text,
        targetId: content.editMessage.key?.ID || content.editMessage.targetMessageID
      };
    }
    if (content.revokeMessage) {
      return {
        ...common,
        kind: "revoke",
        targetId: content.revokeMessage.key?.ID || content.revokeMessage.targetMessageID,
        fromMe: content.revokeMessage.key?.fromMe
      };
    }
    return { ...common, kind: "unknown", raw: content };
  }
};

// src/e2ee/application/outbound-message-cache.ts
init_cjs_shims();
var OutboundMessageCache = class {
  records = /* @__PURE__ */ new Map();
  ttlMs;
  maxEntries;
  constructor(opts = {}) {
    this.ttlMs = opts.ttlMs ?? 15 * 60 * 1e3;
    this.maxEntries = opts.maxEntries ?? 200;
  }
  remember(record) {
    this.prune();
    this.records.set(record.messageId, record);
    while (this.records.size > this.maxEntries) {
      const oldest = this.records.keys().next().value;
      if (!oldest) break;
      this.records.delete(oldest);
    }
  }
  get(messageId) {
    this.prune();
    return this.records.get(messageId);
  }
  prune(nowMs = now()) {
    const cutoff = nowMs - this.ttlMs;
    for (const [messageId, record] of this.records) {
      if (record.createdAtMs < cutoff) this.records.delete(messageId);
    }
  }
  clear() {
    this.records.clear();
  }
};

// src/e2ee/application/retry-manager.ts
init_cjs_shims();

// src/e2ee/application/fanout-planner.ts
init_cjs_shims();
var import_node_crypto10 = require("crypto");
function parseMessengerJid(jid) {
  const [userPart = jid, server = ""] = jid.split("@");
  const colonIdx = userPart.indexOf(":");
  const dotIdx = userPart.indexOf(".");
  const userEnd = dotIdx !== -1 ? dotIdx : colonIdx !== -1 ? colonIdx : userPart.length;
  const user = userPart.slice(0, userEnd) || userPart;
  const rawDevice = colonIdx !== -1 ? userPart.slice(colonIdx + 1) : dotIdx !== -1 ? userPart.slice(dotIdx + 1) : "0";
  return { user, device: Number(rawDevice) || 0, server };
}
function toBareMessengerJid(jid) {
  const parsed = parseMessengerJid(jid);
  return parsed.server === "msgr" ? `${parsed.user}.0@msgr` : jid;
}
function normalizeDMThreadToJid(threadId) {
  const jid = threadId.includes("@") ? threadId : threadId.includes(".") || threadId.includes(":") ? `${threadId}@msgr` : `${threadId}.0@msgr`;
  return toBareMessengerJid(jid);
}
function sameMessengerUser(a, b) {
  const pa = parseMessengerJid(a);
  const pb = parseMessengerJid(b);
  return pa.server === "msgr" && pb.server === "msgr" && pa.user === pb.user;
}
function sameMessengerDevice(a, b) {
  const pa = parseMessengerJid(a);
  const pb = parseMessengerJid(b);
  return pa.server === "msgr" && pb.server === "msgr" && pa.user === pb.user && pa.device === pb.device;
}
function uniqueJids(jids) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const jid of jids) {
    if (!jid) continue;
    const parsed = parseMessengerJid(jid);
    const key = parsed.server === "msgr" ? `${parsed.user}:${parsed.device}@${parsed.server}` : jid;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(jid);
  }
  return out;
}
function toADString(jid) {
  const [userPart = "", server = ""] = jid.split("@");
  if (server === "msgr") {
    const parsed = parseMessengerJid(jid);
    if (!parsed.user) return jid;
    return `${parsed.user}.0:${parsed.device}@${server}`;
  }
  const [userAndAgent = "", devicePart = ""] = userPart.split(":");
  const [user = "", rawAgentPart = ""] = userAndAgent.split(".");
  const rawAgent = rawAgentPart ? Number(rawAgentPart) : 0;
  const device = devicePart ? Number(devicePart) : 0;
  if (!user) return jid;
  return `${user}.${rawAgent}:${device}@${server}`;
}
function buildParticipantListHash(participants) {
  const sorted = [...participants].map((jid) => toADString(jid)).sort();
  const hash = (0, import_node_crypto10.createHash)("sha256").update(sorted.join("")).digest();
  return `2:${hash.subarray(0, 6).toString("base64").replace(/=+$/, "")}`;
}

// src/e2ee/application/retry-manager.ts
var E2EERetryManager = class {
  constructor(opts) {
    this.opts = opts;
  }
  opts;
  async handleReceipt(node) {
    const retryNode = this.findChild(node, "retry");
    const messageId = str(retryNode?.attrs?.id || node.attrs.id);
    if (!messageId) return;
    const cached = this.opts.cache.get(messageId);
    if (!cached) {
      logger.warn("E2EERetryManager", `Received retry receipt for unknown/out-of-cache E2EE message ${messageId}`);
      return;
    }
    const requesterJid = this.resolveRetryRequesterJid(node, cached);
    if (!requesterJid) {
      logger.warn("E2EERetryManager", `Cannot resolve retry requester for E2EE message ${messageId}`);
      return;
    }
    const retryCount = Number(retryNode?.attrs?.count ?? "1") || 1;
    if (retryCount >= 10) {
      logger.warn("E2EERetryManager", `Ignoring retry receipt #${retryCount} for ${messageId}`);
      return;
    }
    const e2eeClient = this.opts.getClient();
    const selfJid = this.opts.getSelfJid();
    const retryBundle = this.preKeyBundleFromRetryReceipt(node, requesterJid);
    if (retryBundle) {
      await e2eeClient.establishSession(requesterJid, retryBundle);
    } else if (!await e2eeClient.hasSession(requesterJid)) {
      const bundle = await this.opts.getPreKeyBundle(requesterJid);
      await e2eeClient.establishSession(requesterJid, bundle);
    }
    const t = String(retryNode?.attrs?.t || node.attrs.t || Math.floor(now() / 1e3));
    let encrypted;
    const attrs = {
      to: cached.chatJid,
      type: cached.messageType,
      id: messageId,
      t
    };
    if (cached.kind === "group") {
      attrs.participant = requesterJid;
      const skdm = await e2eeClient.createSenderKeyDistributionPayload(cached.chatJid, selfJid);
      encrypted = await e2eeClient.encryptMessageAppForDevice(requesterJid, selfJid, cached.messageApp, {
        skdm,
        backupDirective: { messageId, actionType: "UPSERT" }
      });
    } else {
      attrs.device_fanout = "false";
      if (node.attrs.participant) attrs.participant = node.attrs.participant;
      encrypted = await e2eeClient.encryptMessageAppForDevice(requesterJid, selfJid, cached.messageApp, {
        dsm: sameMessengerUser(requesterJid, selfJid) ? { destinationJid: cached.chatJid, phash: "" } : void 0
      });
    }
    const msgNode = encodeNode("message", attrs, [
      encodeNode("enc", { v: "3", type: encrypted.type, count: String(retryCount) }, encrypted.ciphertext),
      encodeNode("franking", {}, [
        encodeNode("franking_tag", {}, cached.frankingTag)
      ])
    ]);
    await this.opts.getSocket()?.sendFrame(marshal(msgNode));
    logger.info("E2EERetryManager", `Resent E2EE message ${messageId} for retry #${retryCount} to ${requesterJid}`);
  }
  resolveRetryRequesterJid(node, cached) {
    if (cached.kind === "group") {
      return str(node.attrs.participant || node.attrs.recipient);
    }
    return str(node.attrs.participant || node.attrs.from || node.attrs.recipient || cached.chatJid);
  }
  preKeyBundleFromRetryReceipt(node, jid) {
    const keysNode = this.findChild(node, "keys");
    if (!keysNode) return null;
    const registration = this.findChild(node, "registration")?.content;
    const identity = this.findChild(keysNode, "identity")?.content;
    const keyNode = this.findChild(keysNode, "key");
    const skeyNode = this.findChild(keysNode, "skey");
    const signedPreKeyId = this.findChild(skeyNode, "id")?.content;
    const signedPreKeyValue = this.findChild(skeyNode, "value")?.content;
    const signedPreKeySignature = this.findChild(skeyNode, "signature")?.content;
    const preKeyId = this.findChild(keyNode, "id")?.content;
    const preKeyValue = this.findChild(keyNode, "value")?.content;
    if (!Buffer.isBuffer(registration) || !Buffer.isBuffer(identity) || !Buffer.isBuffer(signedPreKeyValue) || !Buffer.isBuffer(signedPreKeySignature)) {
      return null;
    }
    const bundle = {
      registrationId: registration.length === 4 ? registration.readUInt32BE(0) : 0,
      deviceId: parseMessengerJid(jid).device,
      identityKey: this.keyWithSignalPrefix(identity),
      signedPreKey: {
        keyId: this.readSignalKeyId(signedPreKeyId),
        publicKey: this.keyWithSignalPrefix(signedPreKeyValue),
        signature: signedPreKeySignature
      }
    };
    if (Buffer.isBuffer(preKeyValue)) {
      bundle.preKey = {
        keyId: this.readSignalKeyId(preKeyId),
        publicKey: this.keyWithSignalPrefix(preKeyValue)
      };
    }
    return bundle;
  }
  findChild(node, tag) {
    if (!node) return null;
    if (node.tag === tag) return node;
    const children = Array.isArray(node.content) ? node.content : [];
    for (const child of children) {
      const found = this.findChild(child, tag);
      if (found) return found;
    }
    return null;
  }
  keyWithSignalPrefix(value) {
    return value.length === 32 ? Buffer.concat([Buffer.from([5]), value]) : value;
  }
  readSignalKeyId(value) {
    if (!Buffer.isBuffer(value) || value.length === 0) return 0;
    return value.readUIntBE(0, Math.min(value.length, 3));
  }
};

// src/e2ee/application/prekey-maintenance.ts
init_cjs_shims();
var PreKeyMaintenance = class {
  constructor(opts) {
    this.opts = opts;
  }
  opts;
  interval;
  start() {
    this.stop();
    const intervalMs = Number(process.env.FB_E2EE_PREKEY_SYNC_INTERVAL_MS ?? "1800000");
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) return;
    this.interval = setInterval(() => {
      void this.sync("periodic").catch((err) => {
        logger.error("PreKeyMaintenance", "Periodic prekey sync failed:", err);
      });
    }, intervalMs);
  }
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = void 0;
    }
  }
  async sync(reason) {
    if (!this.opts.getSocket() || !this.opts.getStore()) return;
    const minCount = Number(process.env.FB_E2EE_PREKEY_MIN_COUNT ?? String(MIN_PREKEY_COUNT));
    const uploadCount = Number(process.env.FB_E2EE_PREKEY_UPLOAD_COUNT ?? String(WANTED_PREKEY_COUNT));
    try {
      const serverCount = await this.opts.getServerPreKeyCount();
      logger.info("PreKeyMaintenance", `E2EE prekey sync (${reason}): server has ${serverCount} prekeys`);
      if (serverCount < minCount) {
        await this.opts.uploadPreKeys(uploadCount);
        logger.info("PreKeyMaintenance", `Uploaded ${uploadCount} E2EE prekeys without changing registered device`);
      }
    } catch (err) {
      logger.error("PreKeyMaintenance", `Prekey sync failed (${reason}) at ${now()}:`, err);
    }
  }
};

// src/controllers/client.controller.ts
var ClientController = class {
  constructor(authService, gateway, messagingService, mediaService, threadService, e2eeService, icdcService, eventBus) {
    this.authService = authService;
    this.gateway = gateway;
    this.messagingService = messagingService;
    this.mediaService = mediaService;
    this.threadService = threadService;
    this.e2eeService = e2eeService;
    this.icdcService = icdcService;
    this.eventBus = eventBus;
    this.eventMapper = new EventMapper(this.eventBus, this.mediaService, this.e2eeService);
    this.dgwHandler = new DGWHandler(this.eventMapper);
    this.e2eeHandler = new E2EEHandler(
      this.eventMapper,
      () => this.e2eeSocket,
      () => this.activeDeviceStore,
      (node) => this.retryManager.handleReceipt(node)
    );
    this.retryManager = new E2EERetryManager({
      cache: this.outgoingE2EECache,
      getClient: () => this.e2eeService.getClient(),
      getSocket: () => this.e2eeSocket,
      getSelfJid: () => this.getSelfE2EEJid(),
      getPreKeyBundle: (jid) => this.e2eeHandler.getPreKeyBundle(jid)
    });
    this.preKeyMaintenance = new PreKeyMaintenance({
      getSocket: () => this.e2eeSocket,
      getStore: () => this.activeDeviceStore,
      getServerPreKeyCount: () => this.e2eeHandler.getServerPreKeyCount(),
      uploadPreKeys: (count) => this.e2eeHandler.uploadPreKeys(count)
    });
  }
  authService;
  gateway;
  messagingService;
  mediaService;
  threadService;
  e2eeService;
  icdcService;
  eventBus;
  api = null;
  dgwSocket = null;
  e2eeSocket = null;
  activeDeviceStore = null;
  e2eeConnected = false;
  heartbeatInterval;
  userId = "";
  outgoingE2EECache = new OutboundMessageCache();
  e2eeUploadConfig = null;
  eventMapper;
  dgwHandler;
  e2eeHandler;
  retryManager;
  preKeyMaintenance;
  // Lifecycle
  async connect(authConfig, sessionStorePath) {
    const appState = await this.authService.readAppState(authConfig);
    const api = await this.gateway.login(appState);
    this.gateway.configure(api);
    const userId = str(api.getCurrentUserID?.());
    const session = {
      userId,
      appState: appState.map((cookie) => ({ key: cookie.key, value: cookie.value })),
      platform: authConfig.platform,
      updatedAt: now()
    };
    if (sessionStorePath) {
      await this.authService.saveSession(sessionStorePath, session);
    }
    this.api = api;
    void this.gateway.startListening(
      api,
      (event) => this.eventMapper.emitMappedEvent(event),
      (error) => this.eventBus.emit("event", {
        type: "error",
        data: { message: error.message }
      })
    );
    this.userId = userId;
    return { userId };
  }
  async disconnect() {
    this.cleanup();
    this.dgwSocket?.close();
    this.dgwSocket = null;
    this.e2eeSocket?.close();
    this.e2eeSocket = null;
    if (!this.api) return;
    this.gateway.stop(this.api);
    this.api = null;
  }
  // E2EE
  async sendNoiseKeepAlive() {
    if (!this.e2eeSocket) throw new Error("E2EE not connected");
    const id = (now() % 1e3).toString();
    await this.e2eeSocket.sendFrame(encodeKeepAlive(id));
  }
  async connectE2EE(deviceStorePath, userId) {
    this.userId = userId;
    const ds = await DeviceStore.fromFile(deviceStorePath);
    this.activeDeviceStore = ds;
    const client = new E2EEClient(ds);
    this.e2eeUploadConfig = process.env.FB_E2EE_MEDIA_UPLOAD_AUTH ? {
      host: process.env.FB_E2EE_MEDIA_UPLOAD_HOST ?? "rupload.facebook.com",
      auth: process.env.FB_E2EE_MEDIA_UPLOAD_AUTH,
      fetchedAtMs: now()
    } : null;
    this.e2eeService.setProvider(client, this.e2eeUploadConfig ?? {
      host: process.env.FB_E2EE_MEDIA_UPLOAD_HOST ?? "rupload.facebook.com",
      auth: ""
    });
    const endpoint = "wss://web-chat-e2ee.facebook.com/ws/chat?cid=client-" + now();
    const noiseSocket = new FacebookE2EESocket(endpoint);
    noiseSocket.on("connected", () => {
      this.eventMapper.emit({ type: "e2ee_connected", data: {} });
    });
    noiseSocket.on("disconnected", () => {
      this.cleanup();
      this.eventMapper.emit({ type: "disconnected", data: { isE2EE: true } });
    });
    noiseSocket.on("error", (err) => {
      this.eventMapper.emit({ type: "error", data: { message: err.message } });
    });
    logger.debug("ClientController", "Fetching CAT...");
    const fbCat = await this.gateway.fetchCAT(this.requireApi());
    if (!ds.jidDevice) {
      const api = this.requireApi();
      const appState = api.getAppState?.() || [];
      const cookieStr = appState.map((c) => `${c.key}=${c.value}`).join("; ");
      this.icdcService.setCookies(cookieStr);
      logger.info("ClientController", "Registering new device via ICDC...");
      const waDeviceId = await this.icdcService.register(userId, fbCat, "2220391788200892", ds);
      ds.jidDevice = waDeviceId;
      ds.jidUser = userId;
      ds.saveToFile();
    }
    const clientPayload = encodeClientPayload({
      username: BigInt(userId),
      deviceId: ds.jidDevice ?? 0,
      fbCatBase64: fbCat
    });
    noiseSocket.on("frame", async (rawFrame) => {
      if (rawFrame.length === 0) return;
      try {
        const node = unmarshal(rawFrame);
        if (["receipt", "notification", "iq", "presence", "call", "chatstate"].includes(node.tag) && node.attrs.id) {
          this.e2eeHandler.sendAck(node);
        }
        switch (node.tag) {
          case "success":
            this.e2eeConnected = true;
            if (node.attrs.jid) this.activeDeviceStore?.setJIDs(node.attrs.jid, node.attrs.jid);
            await noiseSocket.sendFrame(encodePresenceAvailable("false"));
            break;
          case "iq":
            this.e2eeHandler.handleIQ(node);
            break;
          case "presence":
            this.dispatchPresence(node);
            break;
          case "receipt":
            await this.e2eeHandler.handleReceipt(node);
            break;
          case "notification":
            await this.e2eeHandler.handleNotification(node);
            break;
          case "message":
          case "appdata":
            await this.e2eeHandler.handleEncryptedMessage(node, userId, client);
            break;
          case "ib":
            this.e2eeHandler.handleIB(node);
            break;
        }
      } catch (err) {
        logger.error("E2EE", "Frame error:", err);
      }
    });
    await noiseSocket.connect(ds.noiseKeyPriv, clientPayload);
    this.e2eeSocket = noiseSocket;
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Handshake timeout")), 1e4);
      const onFrame = (frame) => {
        const node = unmarshal(frame);
        if (node.tag === "success") {
          noiseSocket.off("frame", onFrame);
          clearTimeout(timeout);
          resolve();
        } else if (node.tag === "failure") {
          noiseSocket.off("frame", onFrame);
          clearTimeout(timeout);
          reject(new Error(`Login failure: ${node.attrs.reason}`));
        }
      };
      noiseSocket.on("frame", onFrame);
    });
    this.eventBus.emit("event", { type: "e2ee_connected", data: {} });
    await noiseSocket.sendFrame(encodePrimingNode(buildUnifiedSessionId()));
    await noiseSocket.sendFrame(encodeSetPassive("active-stream", false));
    await this.preKeyMaintenance.sync("startup");
    this.preKeyMaintenance.start();
    this.fetchMediaUploadConfigProactively().catch((err) => {
      logger.warn("ClientController", "Proactive media_conn fetch failed (will retry on first media send):", err);
    });
    this.startHeartbeat();
    await this.connectDGWIfEnabled(userId);
  }
  dispatchPresence(node) {
    const userId = node.attrs.from?.split("@")[0];
    const type = node.attrs.type;
    this.eventMapper.emit({
      type: "presence",
      data: {
        userId,
        isOnline: type === "available",
        lastActiveTimestampMs: now()
      }
    });
  }
  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(async () => {
      try {
        if (!this.e2eeSocket) return;
        await this.sendNoiseKeepAlive();
      } catch (err) {
        logger.error("ClientController", "E2EE heartbeat failed:", err);
        this.eventMapper.emit({
          type: "error",
          data: { message: `E2EE heartbeat failed: ${err.message}` }
        });
      }
    }, 3e4);
  }
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = void 0;
    }
  }
  cleanup() {
    this.stopHeartbeat();
    this.preKeyMaintenance.stop();
    this.e2eeConnected = false;
  }
  async connectDGWIfEnabled(userId) {
    if (process.env.FB_DGW_ENABLE !== "1") return;
    const endpoints = {
      lightspeed: process.env.FB_DGW_URL_LIGHTSPEED,
      streamcontroller: process.env.FB_DGW_URL_STREAMCONTROLLER,
      realtime: process.env.FB_DGW_URL_REALTIME
    };
    if (!Object.values(endpoints).some(Boolean)) return;
    const api = this.requireApi();
    const appState = api.getAppState?.() || [];
    const cookieHeader = appState.map((c) => `${c.key}=${c.value}`).join("; ");
    const dgw = new FacebookDGWSocket();
    dgw.on("connected", () => this.eventMapper.emit({ type: "raw", data: { source: "dgw", type: "connected" } }));
    dgw.on("frame", (ev) => {
      this.eventMapper.emit({ type: "raw", data: { source: "dgw", userId, ...ev } });
      this.dgwHandler.handleDGWFrame({ ...ev, kind: ev.target });
    });
    dgw.on("error", (err) => this.eventMapper.emit({ type: "error", data: { message: err.message } }));
    const bootstrapTargets = this.resolveDGWTargets(process.env.FB_DGW_BOOTSTRAP_TARGETS, ["lightspeed"], endpoints);
    const dataTargets = this.resolveDGWTargets(process.env.FB_DGW_BOOTSTRAP_DATA_TARGETS, bootstrapTargets, endpoints);
    await dgw.connect({
      endpoints,
      cookieHeader,
      userAgent: process.env.FB_DGW_UA || "Mozilla/5.0",
      origin: process.env.FB_DGW_ORIGIN || "https://www.facebook.com",
      referer: process.env.FB_DGW_REFERER || "https://www.facebook.com/",
      acceptLanguage: process.env.FB_DGW_ACCEPT_LANGUAGE || "en-US,en;q=0.9",
      pingIntervalMs: Number(process.env.FB_DGW_PING_INTERVAL_MS ?? "15000"),
      bootstrap: {
        targets: bootstrapTargets,
        streamId: Number(process.env.FB_DGW_STREAM_ID ?? "1"),
        dataTargets,
        dataPayload: void 0
      }
    });
    for (const target of dataTargets) {
      const url = endpoints[target];
      if (!url) continue;
      const deviceId = new URL(url).searchParams.get("x-dgw-deviceid") || "";
      const payload = this.dgwHandler.buildDGWBootstrapDataPayload(userId, deviceId);
      if (payload) dgw.sendDataFrame(target, Number(process.env.FB_DGW_STREAM_ID ?? "1"), payload, true, 0);
    }
    this.dgwSocket = dgw;
  }
  resolveDGWTargets(raw, fallback, endpoints) {
    const allowed = ["lightspeed", "streamcontroller", "realtime"];
    const base = (raw ?? "").split(",").map((s) => s.trim()).filter((s) => allowed.includes(s));
    return (base.length > 0 ? base : fallback).filter((t) => !!endpoints[t]);
  }
  // Messaging delegate methods
  async sendMessage(input) {
    const isE2EE = this.isE2EEThreadId(input.threadId);
    const isGroup = input.threadId.includes("@g.us") || input.threadId.includes(".g.");
    if (this.e2eeConnected && isE2EE) {
      if (isGroup) {
        await this.sendE2EEGroupText(input.threadId, input.text, input.replyToMessageId);
      } else {
        await this.sendE2EEText(input.threadId, input.text, input.replyToMessageId);
      }
      return { messageId: `e2ee-${now()}`, timestampMs: now() };
    }
    return this.messagingService.sendText(this.requireApi(), input);
  }
  async sendE2EEText(threadId, text, replyToMessageId) {
    if (!this.e2eeSocket) throw new Error("E2EE not connected");
    const e2eeClient = this.e2eeService.getClient();
    const selfJid = this.getSelfE2EEJid();
    const toJid = normalizeDMThreadToJid(threadId);
    const messageId = String(BigInt(Math.floor(Math.random() * 1e15)));
    const result = await e2eeClient.buildDMTextFanoutPayloads({
      toJid,
      selfJid,
      text,
      isGroup: false,
      replyToId: replyToMessageId,
      replyToSenderJid: replyToMessageId ? toJid : void 0
    });
    const participantNodes = [];
    const deviceJids = uniqueJids(await this.e2eeHandler.getDeviceList([toJid, toBareMessengerJid(selfJid)]));
    if (deviceJids.length === 0) {
      logger.warn("ClientController", `No E2EE devices discovered for ${toJid}; sending empty participant list`);
    }
    for (const deviceJid of deviceJids) {
      if (sameMessengerDevice(deviceJid, selfJid)) continue;
      try {
        if (!await e2eeClient.hasSession(deviceJid)) {
          logger.info("ClientController", `Establishing new session with ${deviceJid}`);
          const bundle = await this.e2eeHandler.getPreKeyBundle(deviceJid);
          await e2eeClient.establishSession(deviceJid, bundle);
        }
        const payload = sameMessengerUser(deviceJid, selfJid) ? result.selfDevicePayload : result.devicePayload;
        const encrypted = await e2eeClient.encryptDevicePayload(deviceJid, selfJid, payload);
        participantNodes.push(encodeNode("to", { jid: deviceJid }, [
          encodeNode("enc", { v: "3", type: encrypted.type }, encrypted.ciphertext)
        ]));
      } catch (err) {
        logger.error("ClientController", `Failed to encrypt DM fanout to ${deviceJid}:`, err);
      }
    }
    const msgNode = encodeNode("message", { to: toJid, type: "text", id: messageId }, [
      encodeNode("participants", {}, participantNodes),
      encodeNode("franking", {}, [
        encodeNode("franking_tag", {}, result.frankingTag)
      ]),
      encodeNode("trace", {}, [
        encodeNode("request_id", {}, Buffer.from((0, import_node_crypto11.randomUUID)().replace(/-/g, ""), "hex"))
      ])
    ]);
    await this.e2eeSocket.sendFrame(marshal(msgNode));
    this.outgoingE2EECache.remember({
      kind: "dm",
      chatJid: toJid,
      messageId,
      messageType: "text",
      messageApp: result.messageApp,
      frankingTag: result.frankingTag,
      createdAtMs: now()
    });
    logger.info("ClientController", `E2EE DM message sent to ${toJid} with ${participantNodes.length} devices`);
  }
  async sendE2EEGroupText(groupJid, text, replyToMessageId) {
    if (!this.e2eeSocket) throw new Error("E2EE not connected");
    const e2eeClient = this.e2eeService.getClient();
    const selfJid = this.getSelfE2EEJid();
    logger.debug("ClientController", `Fetching participants for group: ${groupJid}`);
    const memberJids = await this.e2eeHandler.getGroupParticipants(groupJid);
    const deviceUsers = uniqueJids([...memberJids, toBareMessengerJid(selfJid)]);
    logger.debug("ClientController", `Fetching devices for ${deviceUsers.length} members`);
    const deviceJids = uniqueJids(await this.e2eeHandler.getDeviceList(deviceUsers)).filter((jid) => !sameMessengerDevice(jid, selfJid));
    const messageId = String(BigInt(Math.floor(Math.random() * 1e15)));
    const result = await e2eeClient.encryptGroupText(
      groupJid,
      selfJid,
      text,
      messageId,
      replyToMessageId,
      void 0
    );
    const participantNodes = [];
    for (const deviceJid of deviceJids) {
      try {
        if (!await e2eeClient.hasSession(deviceJid)) {
          logger.info("ClientController", `Establishing new session with ${deviceJid}`);
          const bundle = await this.e2eeHandler.getPreKeyBundle(deviceJid);
          await e2eeClient.establishSession(deviceJid, bundle);
        }
        const payload = sameMessengerUser(deviceJid, selfJid) ? result.selfDevicePayload : result.devicePayload;
        const skdmEnc = await e2eeClient.encryptDevicePayload(deviceJid, selfJid, payload);
        participantNodes.push(encodeNode("to", { jid: deviceJid }, [
          encodeNode("enc", { v: "3", type: skdmEnc.type }, skdmEnc.ciphertext)
        ]));
      } catch (err) {
        logger.error("ClientController", `Failed to distribute SKDM to ${deviceJid}:`, err);
      }
    }
    const phash = buildParticipantListHash(deviceJids);
    const participantsNode = encodeNode("participants", {}, participantNodes);
    const frankingNode = encodeNode("franking", {}, [
      encodeNode("franking_tag", {}, result.frankingTag)
    ]);
    const traceNode = encodeNode("trace", {}, [
      encodeNode("request_id", {}, Buffer.from((0, import_node_crypto11.randomUUID)().replace(/-/g, ""), "hex"))
    ]);
    const skmsgNode = encodeNode("enc", { v: "3", type: "skmsg" }, result.groupCiphertext);
    const msgNode = encodeNode("message", { to: groupJid, type: "text", id: messageId, phash }, [
      participantsNode,
      frankingNode,
      traceNode,
      skmsgNode
    ]);
    await this.e2eeSocket.sendFrame(marshal(msgNode));
    this.outgoingE2EECache.remember({
      kind: "group",
      chatJid: groupJid,
      messageId,
      messageType: "text",
      messageApp: result.messageApp,
      frankingTag: result.frankingTag,
      createdAtMs: now()
    });
    logger.info("ClientController", `E2EE Group message sent to ${groupJid} with ${participantNodes.length} devices`);
  }
  getSelfE2EEJid() {
    const device = this.activeDeviceStore?.jidDevice ?? 0;
    return `${this.userId}.${device}@msgr`;
  }
  isE2EEThreadId(threadId) {
    return /^\d+$/.test(threadId) || threadId.includes("@msgr") || threadId.includes("@g.us") || threadId.includes(".g.");
  }
  async sendReaction(input) {
    await this.messagingService.react(this.requireApi(), input);
  }
  async unsendMessage(messageId) {
    await this.messagingService.unsend(this.requireApi(), messageId);
  }
  async sendTyping(input) {
    await this.messagingService.sendTyping(this.requireApi(), input);
  }
  async markAsRead(input) {
    await this.messagingService.markAsRead(this.requireApi(), input);
  }
  // --- E2EE Media Upload Config ---
  async getE2EEMediaUploadConfig() {
    if (this.e2eeUploadConfig && !this.isMediaUploadConfigExpired(this.e2eeUploadConfig)) {
      return this.e2eeUploadConfig;
    }
    logger.info("ClientController", "Fetching E2EE media upload auth via media_conn...");
    this.e2eeUploadConfig = await this.e2eeHandler.getMediaUploadConfig();
    this.e2eeService.setProvider(this.e2eeService.getClient(), this.e2eeUploadConfig);
    return this.e2eeUploadConfig;
  }
  async fetchMediaUploadConfigProactively() {
    if (!this.e2eeConnected) return;
    try {
      const config = await this.e2eeHandler.getMediaUploadConfig();
      this.e2eeUploadConfig = config;
      this.e2eeService.setProvider(this.e2eeService.getClient(), config);
      logger.debug("ClientController", `Proactive media_conn fetched: host=${config.host}, auth=${config.auth ? `${config.auth.slice(0, 12)}...` : "(empty)"}`);
    } catch (err) {
      logger.warn("ClientController", "Proactive media_conn fetch failed (will retry on first media send):", err);
      throw err;
    }
  }
  isMediaUploadConfigExpired(config) {
    if (!config.auth) return true;
    const ttlSeconds = config.authTtl ?? config.ttl;
    if (!config.fetchedAtMs || !ttlSeconds) return false;
    const refreshSkewMs = 6e4;
    return now() >= config.fetchedAtMs + ttlSeconds * 1e3 - refreshSkewMs;
  }
  async sendE2EEImage(input) {
    return this.sendE2EEMediaDM(input, "image", (fields) => this.e2eeService.getClient().buildImageMessage({ ...fields, caption: input.caption }));
  }
  async sendE2EEVideo(input) {
    return this.sendE2EEMediaDM(input, "video", (fields) => this.e2eeService.getClient().buildVideoMessage({ ...fields, caption: input.caption }));
  }
  async sendE2EEAudio(input) {
    return this.sendE2EEMediaDM(input, "audio", (fields) => this.e2eeService.getClient().buildAudioMessage(fields));
  }
  async sendE2EEFile(input) {
    return this.sendE2EEMediaDM(input, "document", (fields) => this.e2eeService.getClient().buildDocumentMessage({ ...fields, fileName: input.fileName, caption: input.caption }));
  }
  /**
   * Common E2EE media send for DM (fanout per-device encrypted message).
   * All E2EE media messages use type="text" because the server cannot see the actual content.
   */
  async sendE2EEMediaDM(input, mediaType, buildMessage) {
    if (!this.e2eeSocket) throw new Error("E2EE not connected");
    if (input.threadId.includes("@g.us") || input.threadId.includes(".g.")) {
      throw new Error(`E2EE group ${mediaType} send is not implemented yet`);
    }
    const e2eeClient = this.e2eeService.getClient();
    const selfJid = this.getSelfE2EEJid();
    const toJid = normalizeDMThreadToJid(input.threadId);
    const messageId = String(BigInt(Math.floor(Math.random() * 1e15)));
    const uploadConfig = await this.getE2EEMediaUploadConfig();
    const defaultMime = mediaType === "image" ? "image/png" : mediaType === "video" ? "video/mp4" : mediaType === "audio" ? "audio/ogg" : "application/octet-stream";
    const media = await e2eeClient.encryptAndUploadMedia(
      uploadConfig,
      input.data,
      mediaType,
      input.mimeType || defaultMime,
      async () => {
        logger.info("ClientController", `Media upload 401, refreshing media_conn config...`);
        const refreshed = await this.e2eeHandler.getMediaUploadConfig();
        this.e2eeUploadConfig = refreshed;
        this.e2eeService.setProvider(this.e2eeService.getClient(), refreshed);
        return refreshed;
      }
    );
    const consumerApp = buildMessage(media.mediaFields);
    const { messageApp, frankingTag } = e2eeClient.buildMessageApplication(
      consumerApp,
      input.replyToMessageId ? { id: input.replyToMessageId, senderJid: toJid } : void 0
    );
    const devicePayload = e2eeClient.buildMessageTransport({ messageApp });
    const selfDevicePayload = e2eeClient.buildMessageTransport({
      messageApp,
      dsm: { destinationJid: toJid, phash: "" }
    });
    const participantNodes = [];
    const deviceJids = uniqueJids(await this.e2eeHandler.getDeviceList([toJid, toBareMessengerJid(selfJid)]));
    if (deviceJids.length === 0) {
      logger.warn("ClientController", `No E2EE devices discovered for ${toJid}; sending empty participant list`);
    }
    for (const deviceJid of deviceJids) {
      if (sameMessengerDevice(deviceJid, selfJid)) continue;
      try {
        if (!await e2eeClient.hasSession(deviceJid)) {
          logger.info("ClientController", `Establishing new session with ${deviceJid}`);
          const bundle = await this.e2eeHandler.getPreKeyBundle(deviceJid);
          await e2eeClient.establishSession(deviceJid, bundle);
        }
        const payload = sameMessengerUser(deviceJid, selfJid) ? selfDevicePayload : devicePayload;
        const encrypted = await e2eeClient.encryptDevicePayload(deviceJid, selfJid, payload);
        participantNodes.push(encodeNode("to", { jid: deviceJid }, [
          encodeNode("enc", { v: "3", type: encrypted.type }, encrypted.ciphertext)
        ]));
      } catch (err) {
        logger.error("ClientController", `Failed to encrypt E2EE ${mediaType} fanout to ${deviceJid}:`, err);
      }
    }
    const msgNode = encodeNode("message", { to: toJid, type: "text", id: messageId }, [
      encodeNode("participants", {}, participantNodes),
      encodeNode("franking", {}, [
        encodeNode("franking_tag", {}, frankingTag)
      ]),
      encodeNode("trace", {}, [
        encodeNode("request_id", {}, Buffer.from((0, import_node_crypto11.randomUUID)().replace(/-/g, ""), "hex"))
      ])
    ]);
    await this.e2eeSocket.sendFrame(marshal(msgNode));
    this.outgoingE2EECache.remember({
      kind: "dm",
      chatJid: toJid,
      messageId,
      messageType: mediaType,
      messageApp,
      frankingTag,
      createdAtMs: now()
    });
    logger.info("ClientController", `E2EE ${mediaType} sent to ${toJid} with ${participantNodes.length} devices`);
    return { messageId, timestampMs: now(), directPath: media.directPath };
  }
  async sendImage(input) {
    if (this.e2eeConnected && this.isE2EEThreadId(input.threadId)) {
      return this.sendE2EEImage(input);
    }
    return this.mediaService.sendImage(this.requireApi(), input);
  }
  async sendVideo(input) {
    if (this.e2eeConnected && this.isE2EEThreadId(input.threadId)) {
      return this.sendE2EEVideo(input);
    }
    return this.mediaService.sendVideo(this.requireApi(), input);
  }
  async sendAudio(input) {
    if (this.e2eeConnected && this.isE2EEThreadId(input.threadId)) {
      return this.sendE2EEAudio(input);
    }
    return this.mediaService.sendAudio(this.requireApi(), input);
  }
  async sendFile(input) {
    if (this.e2eeConnected && this.isE2EEThreadId(input.threadId)) {
      return this.sendE2EEFile(input);
    }
    return this.mediaService.sendFile(this.requireApi(), input);
  }
  async sendSticker(input) {
    return this.mediaService.sendSticker(this.requireApi(), input);
  }
  async downloadMedia(input) {
    return this.mediaService.downloadMedia(input);
  }
  async muteThread(input) {
    await this.mediaService.muteThread(this.requireApi(), input);
  }
  async renameThread(input) {
    await this.mediaService.renameThread(this.requireApi(), input);
  }
  async setGroupPhoto(input) {
    await this.mediaService.setGroupPhoto(this.requireApi(), input);
  }
  async deleteThread(input) {
    await this.mediaService.deleteThread(this.requireApi(), input);
  }
  async createThread(input) {
    return this.mediaService.createThread(this.requireApi(), input);
  }
  async searchUsers(input) {
    return this.mediaService.searchUsers(this.requireApi(), input);
  }
  async getUserInfo(input) {
    return this.mediaService.getUserInfo(this.requireApi(), input);
  }
  async getThreadList(input) {
    return this.threadService.getThreadList(this.requireApi(), input);
  }
  async getThreadHistory(input) {
    return this.threadService.getThreadHistory(this.requireApi(), input);
  }
  async forwardAttachment(input) {
    await this.threadService.forwardAttachment(this.requireApi(), input);
  }
  async createPoll(input) {
    await this.threadService.createPoll(this.requireApi(), input);
  }
  async editMessage(input) {
    return this.threadService.editMessage(this.requireApi(), input);
  }
  async addGroupMember(input) {
    await this.threadService.addGroupMember(this.requireApi(), input);
  }
  async removeGroupMember(input) {
    await this.threadService.removeGroupMember(this.requireApi(), input);
  }
  async changeAdminStatus(input) {
    await this.threadService.changeAdminStatus(this.requireApi(), input);
  }
  async getFriendsList() {
    return this.threadService.getFriendsList(this.requireApi());
  }
  requireApi() {
    if (!this.api) throw new Error("Client is not connected");
    return this.api;
  }
};

// src/repositories/session.repository.ts
init_cjs_shims();
var import_promises2 = require("fs/promises");
var import_node_path2 = require("path");
var FileSessionRepository = class {
  async read(path) {
    try {
      const content = await (0, import_promises2.readFile)(path, "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  async write(path, session) {
    await (0, import_promises2.mkdir)((0, import_node_path2.dirname)(path), { recursive: true });
    await (0, import_promises2.writeFile)(path, JSON.stringify(session, null, 2), "utf-8");
  }
};

// src/services/e2ee.service.ts
init_cjs_shims();
var E2EEService = class {
  _connected = false;
  e2eeClient;
  uploadConfig;
  setProvider(client, uploadConfig) {
    this.e2eeClient = client;
    this.uploadConfig = uploadConfig;
    this._connected = true;
  }
  get isConnected() {
    return this._connected;
  }
  /** Called by an external E2EE provider when it establishes a connection. */
  markConnected() {
    this._connected = true;
  }
  /** Called when the E2EE connection drops. */
  markDisconnected() {
    this._connected = false;
  }
  ensureEnabled() {
    if (!this._connected || !this.e2eeClient) {
      throw new Error("E2EE provider not connected");
    }
  }
  getClient() {
    this.ensureEnabled();
    return this.e2eeClient;
  }
  // Typed implementations wrapping E2EEClient
  /** Send an E2EE image. Requires a concrete provider implementation. */
  async sendImage(opts) {
    this.ensureEnabled();
    await this.e2eeClient.encryptAndUploadMedia(
      this.uploadConfig,
      opts.data,
      "image",
      opts.mimeType || "image/jpeg"
    );
    return {
      messageId: "mock-id",
      timestampMs: Date.now()
    };
  }
  /** Send an E2EE video. */
  async sendVideo(opts) {
    this.ensureEnabled();
    await this.e2eeClient.encryptAndUploadMedia(
      this.uploadConfig,
      opts.data,
      "video",
      opts.mimeType || "video/mp4"
    );
    return { messageId: "mock-id", timestampMs: Date.now() };
  }
  /** Send an E2EE audio/voice message. */
  async sendAudio(opts) {
    this.ensureEnabled();
    await this.e2eeClient.encryptAndUploadMedia(
      this.uploadConfig,
      opts.data,
      "audio",
      opts.mimeType || "audio/ogg; codecs=opus"
    );
    return { messageId: "mock-id", timestampMs: Date.now() };
  }
  /** Send an E2EE document/file. */
  async sendDocument(opts) {
    this.ensureEnabled();
    await this.e2eeClient.encryptAndUploadMedia(
      this.uploadConfig,
      opts.data,
      "document",
      opts.mimeType || "application/octet-stream"
    );
    return { messageId: "mock-id", timestampMs: Date.now() };
  }
  /** Send an E2EE sticker. */
  async sendSticker(opts) {
    this.ensureEnabled();
    await this.e2eeClient.encryptAndUploadMedia(
      this.uploadConfig,
      opts.data,
      "image",
      opts.mimeType || "image/webp"
    );
    return { messageId: "mock-id", timestampMs: Date.now() };
  }
  /** Download E2EE media by decrypting it with the provided keys. */
  async downloadMedia(opts) {
    this.ensureEnabled();
    const resp = await fetch(opts.directPath);
    if (!resp.ok) {
      throw new Error(`Failed to fetch media from CDN: ${resp.status}`);
    }
    const encryptedData = Buffer.from(await resp.arrayBuffer());
    let type;
    switch (opts.mediaType) {
      case "image":
        type = "image";
        break;
      case "video":
        type = "video";
        break;
      case "audio":
        type = "audio";
        break;
      case "voice":
        type = "audio";
        break;
      case "document":
        type = "document";
        break;
      case "sticker":
        type = "image";
        break;
      // stickers use IMAGE crypto
      default:
        type = "document";
        break;
    }
    const mediaKey = Buffer.from(opts.mediaKey, "base64");
    const fileSHA256 = Buffer.from(opts.mediaSha256, "base64");
    const fileEncSHA256 = opts.mediaEncSha256 ? Buffer.from(opts.mediaEncSha256, "base64") : void 0;
    const decrypted = this.e2eeClient.decryptMedia({
      data: encryptedData,
      mediaKey,
      type,
      fileSHA256,
      fileEncSHA256
    });
    return {
      data: decrypted,
      mimeType: opts.mimeType || "application/octet-stream",
      fileSize: decrypted.length
    };
  }
};

// src/core/client.ts
var FBClient = class {
  constructor(options) {
    this.options = options;
    const sessionRepository = new FileSessionRepository();
    const authService = new AuthService(sessionRepository);
    const gateway = new FacebookGatewayService();
    const mediaService = new MediaService(gateway);
    const e2eeService = new E2EEService();
    const icdcService = new ICDCService(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
    );
    this.controller = new ClientController(
      authService,
      gateway,
      mediaService,
      e2eeService,
      icdcService,
      this.eventBus
    );
  }
  options;
  eventBus = new TypedEventEmitter();
  controller;
  onEvent(arg1, arg2) {
    if (typeof arg1 === "function") {
      this.eventBus.on("event", arg1);
    } else {
      this.eventBus.on(arg1, arg2);
    }
  }
  offEvent(arg1, arg2) {
    if (typeof arg1 === "function") {
      this.eventBus.off("event", arg1);
    } else {
      this.eventBus.off(arg1, arg2);
    }
  }
  /** Legacy helper for the catch-all wrapper event. */
  onAnyEvent(listener) {
    this.eventBus.on("event", listener);
  }
  // Lifecycle
  /**
   * Login with appState and prepare auth/CAT bootstrap state.
   * This does not start plaintext/non-E2EE MQTT listening.
   */
  async connect() {
    return this.controller.connect(
      {
        appStatePath: this.options.appStatePath,
        appState: this.options.appState,
        platform: this.options.platform ?? "facebook"
      },
      this.options.sessionStorePath
    );
  }
  async disconnect() {
    await this.controller.disconnect();
  }
  // E2EE lifecycle
  async connectE2EE(deviceStorePath, userId) {
    await this.controller.connectE2EE(deviceStorePath, userId);
  }
  async sendNoiseKeepAlive() {
    await this.controller.sendNoiseKeepAlive();
  }
  // E2EE messaging
  async sendMessage(input) {
    return this.controller.sendMessage(input);
  }
  async sendReaction(input) {
    await this.controller.sendReaction(input);
  }
  async unsendMessage(messageId, threadId) {
    await this.controller.unsendMessage(messageId, threadId);
  }
  async sendTyping(input) {
    await this.controller.sendTyping(input);
  }
  // E2EE media send
  async sendImage(input) {
    return this.controller.sendImage(input);
  }
  async sendVideo(input) {
    return this.controller.sendVideo(input);
  }
  async sendAudio(input) {
    return this.controller.sendAudio(input);
  }
  async sendFile(input) {
    return this.controller.sendFile(input);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  E2EEService,
  FBClient
});
/*! Bundled license information:

ws/lib/BufferUtil.js:
ws/lib/Validation.js:
ws/lib/ErrorCodes.js:
ws/lib/Receiver.js:
ws/lib/Sender.js:
ws/lib/WebSocket.js:
ws/lib/WebSocketServer.js:
ws/index.js:
  (*!
   * ws: a node.js websocket client
   * Copyright(c) 2011 Einar Otto Stangvik <einaros@gmail.com>
   * MIT Licensed
   *)
*/
//# sourceMappingURL=index.cjs.map