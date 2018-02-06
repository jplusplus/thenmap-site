var Thenmap = {

  debug: false,
  apiUrl: "//thenmap-api.herokuapp.com/v2/",
  el: null, //container element
  svg: null, //svg element
  css: null, //css element for dynamically adding styles
  defaultColor: "#e2e2e2",

  // Default settings that can be overridden by passing arguments to Thenmap
  settings: {
    width: 800,
    height: null,
    language: null,
    projection: null,
    dataKey: null,
    dataset: "world-2",
    date: new Date().toISOString(), //current date, works in any browser that can display SVG
    callback: null
  },

  /* Entry point
  */
  init: function(elIdentifier, options) {
    var self = this;
    self.ColorLayer.thenmap = self;

    // Clean up some values
    options.width = options.width ? parseInt(options.width) : null;
    options.height = options.height ? parseInt(options.height) : null;
    // Apply settings
    self.settings = self.utils.extend(self.settings, options);

    if (typeof elIdentifier === "string") {
      // If first character is #, remove. While technically a valid
      // character in an HTML5 id, it's likely meant as id selector
      elIdentifier = elIdentifier.replace(/^#/, '');
      self.el = document.getElementById(elIdentifier);
    } else if (elIdentifier.nodeType) {
      // User gave us a valid reference to an element
      self.el = elIdentifier;
    } else {
      // not a valid identifier
      self.log(elIdentifier + " is not a valid id name or DOM node.")
    }
    if (self.settings.width){
      self.el.style.width = self.settings.width + "px"
    }
    if (self.settings.height){
      self.el.style.height = self.settings.height + "px"
    }

    // create CSS element for dynamic styling
    var css = document.createElement("style");
    document.getElementsByTagName("head")[0].appendChild(css);
    this.css = css;

    // set global styles
    var CSS = CSS || {};
CSS["src/styles.css"] = 'svg.thenmap {\n  stroke: white;\n  stroke-width: .5px\n}\n@keyframes loading_data {\n  0% {fill-opacity: .25}\n  100% {fill-opacity: .75}\n}\n.loading_data path {\n  animation: loading_data 1s linear infinite alternate;\n}\n\n@media screen and (-webkit-min-device-pixel-ratio:0){\n	svg.thenmap path:hover {\n	  filter: url("#sepia") !important; /*Chrome*/\n	}	\n}\nsvg.thenmap path:hover {\n  -webkit-filter: sepia(50%);\n  filter: sepia(50%);\n}';
;
    self.extendCss(CSS["src/styles.css"]);

    var httpClient = self.HttpClient;
    httpClient.get(self.createApiUrl(), function(svgString) {

      // Something of an hack, to make sure SVG is rendered
      // Creating a SVG element will not make the SVG render
      // in all browsers. innerHTML will.
      var tmp = document.createElement("div");
      tmp.innerHTML = svgString;
      self.svg = tmp.getElementsByTagName('svg')[0];

      //Add filter for hover effect in Chrome
      var defsEl = self.svg.getElementsByTagName('defs')[0];
      var svgNS = "http://www.w3.org/2000/svg";
      var filterEl = document.createElementNS(svgNS, "filter");
      filterEl.id = "sepia";
      filterEl.innerHTML = "<feColorMatrix type='matrix' values='0.35 0.35 0.35 0 0 \
        0.25 0.25 0.25 0 0 \
        0.15 0.15 0.15 0 0 \
        0.50 0.50 0.50 1 0'/>";
      defsEl.appendChild(filterEl);

      self.el.appendChild(self.svg);

      //Apply classes, add titles
      var paths=self.el.getElementsByTagName('path');
      var i = paths.length;
      while(i--) {
        //There will only be one entity for each shape
        var title = document.createElementNS(svgNS,"title");
        title.textContent = paths[i].getAttribute("thenmap:name");
        paths[i].appendChild(title);

        //element.className is not available for SVG elements
        paths[i].setAttribute("class", paths[i].getAttribute("thenmap:class"));
      }

      // Color the map if a spreadsheet key is given
      if (self.settings.dataKey) {
        self.ColorLayer.init(self.settings.dataKey);
      }

      if (typeof self.settings.callback === "function"){
        self.settings.callback(null, this);
      }

    });

  },  // function init

  createApiUrl: function() {
    var self = this;
    var apiUrl = this.apiUrl;
    apiUrl += [this.settings.dataset, "svg", this.settings.date].join("/");
    // Add url parameters
    var options = ["svg_props=name|class"];
    var paramDict = {width: "svg_width",
                     height: "svg_height",
                     projection: "svg_proj",
                     language: "language"};
    for (var key in paramDict) {
      var attr = paramDict[key];
      if (self.settings[key] !== null){
        options.push(attr + "=" + self.settings[key]);
      }
    }
    apiUrl += "?" + options.join("&");
    return apiUrl;
  },  // function createApiUrl

  /* Add code to the global stylesheet
  */
  extendCss: function(code) {

    if (this.css.styleSheet) {
        // IE
        this.css.styleSheet.cssText += code;
    } else {
        // Other browsers
        this.css.innerHTML += code;
    }

  },

  HttpClient: {
    get: function(url, callback) {
      var httpRequest = new XMLHttpRequest();
      httpRequest.onreadystatechange = function() {
        if (httpRequest.readyState == 4 && httpRequest.status == 200) {
          callback(httpRequest.responseText);
        }
      }

      httpRequest.open("GET", url, true);
      httpRequest.send(null);
    }
  },  // HttpClient

  ColorLayer: {

    /* Fetches data from a Google Spreadsheet using Tabletop
    */
    getSpreadsheetData: function(spreadsheetKey, callback) {
      Tabletop.init({
        key: spreadsheetKey,
        callback: callback,
        simpleSheet: true
      })
    }, // getSpreadsheetData

    /* Sanitize and validate a SVG color code
       Accepts "#99cccc", "9cc", "green", and "rgb(1,32,42)"
    */
    getColorCode: function(string){

      var string = string.trim();
      var allowedColorNames = ["aliceblue","antiquewhite","aqua","aquamarine","azure","beige","bisque","black","blanchedalmond","blue","blueviolet","brown","burlywood","cadetblue","chartreuse","chocolate","coral","cornflowerblue","cornsilk","crimson","cyan","darkblue","darkcyan","darkgoldenrod","darkgray","darkgreen","darkgrey","darkkhaki","darkmagenta","darkolivegreen","darkorange","darkorchid","darkred","darksalmon","darkseagreen","darkslateblue","darkslategray","darkslategrey","darkturquoise","darkviolet","deeppink","deepskyblue","dimgray","dimgrey","dodgerblue","firebrick","floralwhite","forestgreen","fuchsia","gainsboro","ghostwhite","gold","goldenrod","gray","grey","green","greenyellow","honeydew","hotpink","indianred","indigo","ivory","khaki","lavender","lavenderblush","lawngreen","lemonchiffon","lightblue","lightcoral","lightcyan","lightgoldenrodyellow","lightgray","lightgreen","lightgrey","    ","","lightpink","lightsalmon","lightseagreen","lightskyblue","lightslategray","lightslategrey","lightsteelblue","lightyellow","lime","limegreen","linen","magenta","maroon","mediumaquamarine","mediumblue","mediumorchid","mediumpurple","mediumseagreen","mediumslateblue","mediumspringgreen","mediumturquoise","mediumvioletred","midnightblue","mintcream","mistyrose","moccasin","navajowhite","navy","oldlace","olive","olivedrab","orange","orangered","orchid","palegoldenrod","palegreen","paleturquoise","palevioletred","papayawhip","peachpuff","peru","pink","plum","powderblue","purple","red","rosybrown","royalblue","saddlebrown","salmon","sandybrown","seagreen","seashell","sienna","silver","skyblue","slateblue","slategray","slategrey","snow","springgreen","steelblue","tan","teal","thistle","tomato","turquoise","violet","wheat","white","whitesmoke","yellow","yellowgreen"];
      if (/(^#[0-9A-F]{6}$){1,2}/i.test(string)) {
        // #00cccc
        return string;
      } else if (/(^[0-9A-F]{6}$){1,2}/i.test(string)) {
        // 00cccc
        return "#" + string;
      } else if (allowedColorNames.indexOf(string.toLowerCase()) > -1) { // will work for all SVG capable browsers
        // green
        return string.toLowerCase();
      } else if (/rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i.test(string)){
        // rgb(123,231,432)
        return string.toLowerCase();
      } else {
        // *invalid
        return this.thenmap.defaultColor;
      }

    },

    /* Colorize map
    */
    render: function(data) {
      var self = this;
      var colors = {}

      /* Create a colors object like this:
        { green: [class1, class2], ... }
      */
      var i = data.length;
      while(i--) {
        var d = data[i];
        if (d.color) {
          var colorCode = self.getColorCode(d.color);
          var selector = "path." + d.id;
          if (colorCode in colors){
            colors[colorCode].push(selector);
          } else {
            colors[colorCode] = [selector];
          }
        }
      }

      /* build and apply CSS */
      var cssCode = "";
      for (var color in colors){
        cssCode += colors[color].join(", ") + "{fill:" + color + "}\n";
      }
      self.thenmap.extendCss(cssCode);
    }, // ColorLayer.render

    /* Constructor for thenmap.ColorLayer
    */
    init: function(spreadsheetKey) {
      var self = this;

      // Add loader class while loading
      var oldClassName = self.thenmap.el.className || "";
      self.thenmap.el.className = [oldClassName, "loading_data"].join(" ");
      self.getSpreadsheetData(spreadsheetKey, function(data) {
        // Remove loader class
        self.thenmap.el.className = oldClassName;
        //Use data
        self.render(data);
      });
    } // ColorLayer.init

  }, // ColorLayer

  utils: {
    /* Object.assign() replacement, more or less */
    extend: function ( defaults, options ) {
      var extended = {};
      var prop;
      for (prop in defaults) {
        if (Object.prototype.hasOwnProperty.call(defaults, prop)) {
          extended[prop] = defaults[prop];
        }
      }
      for (prop in options) {
        if (Object.prototype.hasOwnProperty.call(options, prop)) {
          extended[prop] = options[prop];
        }
      }
      return extended;
    } // Extend js object
  },// Utils

  /* Print debug message to the console
  */
  log: function(string) {
    if (this.debug) {
      console.log(string + "\nIn function:"+arguments.callee.caller.name);
    }
  }
};

/*Copyright (c) 2012-2013 Jonathan Soma

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/
(function() {
  'use strict';

  var inNodeJS = typeof process !== 'undefined' && !process.browser;

  var request = function requestNotProvided() {
    throw new Error("The 'request' module is only available while running in Node.");
  };
  if(inNodeJS) { // This will get stripped out by Uglify, and Webpack will not include it
    request = require('request');
  }

  var supportsCORS = false;
  var inLegacyIE = false;
  try {
    var testXHR = new XMLHttpRequest();
    if (typeof testXHR.withCredentials !== 'undefined') {
      supportsCORS = true;
    } else {
      if ('XDomainRequest' in window) {
        supportsCORS = true;
        inLegacyIE = true;
      }
    }
  } catch (e) { }

  // Create a simple indexOf function for support
  // of older browsers.  Uses native indexOf if
  // available.  Code similar to underscores.
  // By making a separate function, instead of adding
  // to the prototype, we will not break bad for loops
  // in older browsers
  var indexOfProto = Array.prototype.indexOf;
  var ttIndexOf = function(array, item) {
    var i = 0, l = array.length;

    if (indexOfProto && array.indexOf === indexOfProto) {
      return array.indexOf(item);
    }

    for (; i < l; i++) {
      if (array[i] === item) {
        return i;
      }
    }
    return -1;
  };

  /*
    Initialize with Tabletop.init( { key: '0AjAPaAU9MeLFdHUxTlJiVVRYNGRJQnRmSnQwTlpoUXc' } )
      OR!
    Initialize with Tabletop.init( { key: 'https://docs.google.com/spreadsheet/pub?hl=en_US&hl=en_US&key=0AjAPaAU9MeLFdHUxTlJiVVRYNGRJQnRmSnQwTlpoUXc&output=html&widget=true' } )
      OR!
    Initialize with Tabletop.init('0AjAPaAU9MeLFdHUxTlJiVVRYNGRJQnRmSnQwTlpoUXc')
  */

  var Tabletop = function(options) {
    // Make sure Tabletop is being used as a constructor no matter what.
    if(!this || !(this instanceof Tabletop)) {
      return new Tabletop(options);
    }

    if(typeof(options) === 'string') {
      options = { key : options };
    }

    this.callback = options.callback;
    this.wanted = options.wanted || [];
    this.key = options.key;
    this.simpleSheet = !!options.simpleSheet;
    this.parseNumbers = !!options.parseNumbers;
    this.wait = !!options.wait;
    this.reverse = !!options.reverse;
    this.postProcess = options.postProcess;
    this.debug = !!options.debug;
    this.query = options.query || '';
    this.orderby = options.orderby;
    this.endpoint = options.endpoint || 'https://spreadsheets.google.com';
    this.singleton = !!options.singleton;
    this.simpleUrl = !!(options.simpleUrl || options.simple_url); //jshint ignore:line
    this.authkey = options.authkey;
    this.sheetPrivacy = this.authkey ? 'private' : 'public'

    this.callbackContext = options.callbackContext;
    // Default to on, unless there's a proxy, in which case it's default off
    this.prettyColumnNames = typeof(options.prettyColumnNames) === 'undefined' ? !options.proxy : options.prettyColumnNames;

    if(typeof(options.proxy) !== 'undefined') {
      // Remove trailing slash, it will break the app
      this.endpoint = options.proxy.replace(/\/$/,'');
      this.simpleUrl = true;
      this.singleton = true;
      // Let's only use CORS (straight JSON request) when
      // fetching straight from Google
      supportsCORS = false;
    }

    this.parameterize = options.parameterize || false;

    if (this.singleton) {
      if (typeof(Tabletop.singleton) !== 'undefined') {
        this.log('WARNING! Tabletop singleton already defined');
      }
      Tabletop.singleton = this;
    }

    /* Be friendly about what you accept */
    if (/key=/.test(this.key)) {
      this.log('You passed an old Google Docs url as the key! Attempting to parse.');
      this.key = this.key.match('key=(.*?)(&|#|$)')[1];
    }

    if (/pubhtml/.test(this.key)) {
      this.log('You passed a new Google Spreadsheets url as the key! Attempting to parse.');
      this.key = this.key.match('d\\/(.*?)\\/pubhtml')[1];
    }

    if(/spreadsheets\/d/.test(this.key)) {
      this.log('You passed the most recent version of Google Spreadsheets url as the key! Attempting to parse.');
      this.key = this.key.match('d\\/(.*?)\/')[1];
    }

    if (!this.key) {
      this.log('You need to pass Tabletop a key!');
      return;
    }

    this.log('Initializing with key ' + this.key);

    this.models = {};
    this.modelNames = [];
    this.model_names = this.modelNames; //jshint ignore:line

    this.baseJsonPath = '/feeds/worksheets/' + this.key + '/' + this.sheetPrivacy +'/basic?alt=';

    if (inNodeJS || supportsCORS) {
      this.baseJsonPath += 'json';
    } else {
      this.baseJsonPath += 'json-in-script';
    }

    if(!this.wait) {
      this.fetch();
    }
  };

  // A global storage for callbacks.
  Tabletop.callbacks = {};

  // Backwards compatibility.
  Tabletop.init = function(options) {
    return new Tabletop(options);
  };

  Tabletop.sheets = function() {
    this.log('Times have changed! You\'ll want to use var tabletop = Tabletop.init(...); tabletop.sheets(...); instead of Tabletop.sheets(...)');
  };

  Tabletop.prototype = {

    fetch: function(callback) {
      if (typeof(callback) !== 'undefined') {
        this.callback = callback;
      }
      this.requestData(this.baseJsonPath, this.loadSheets);
    },

    /*
      This will call the environment appropriate request method.

      In browser it will use JSON-P, in node it will use request()
    */
    requestData: function(path, callback) {
      this.log('Requesting', path);

      if (inNodeJS) {
        this.serverSideFetch(path, callback);
      } else {
        //CORS only works in IE8/9 across the same protocol
        //You must have your server on HTTPS to talk to Google, or it'll fall back on injection
        var protocol = this.endpoint.split('//').shift() || 'http';
        if (supportsCORS && (!inLegacyIE || protocol === location.protocol)) {
          this.xhrFetch(path, callback);
        } else {
          this.injectScript(path, callback);
        }
      }
    },

    /*
      Use Cross-Origin XMLHttpRequest to get the data in browsers that support it.
    */
    xhrFetch: function(path, callback) {
      //support IE8's separate cross-domain object
      var xhr = inLegacyIE ? new XDomainRequest() : new XMLHttpRequest();
      xhr.open('GET', this.endpoint + path);
      var self = this;
      xhr.onload = function() {
        var json;
        try {
          json = JSON.parse(xhr.responseText);
        } catch (e) {
          console.error(e);
        }
        callback.call(self, json);
      };
      xhr.send();
    },

    /*
      Insert the URL into the page as a script tag. Once it's loaded the spreadsheet data
      it triggers the callback. This helps you avoid cross-domain errors
      http://code.google.com/apis/gdata/samples/spreadsheet_sample.html

      Let's be plain-Jane and not use jQuery or anything.
    */
    injectScript: function(path, callback) {
      var script = document.createElement('script');
      var callbackName;

      if (this.singleton) {
        if (callback === this.loadSheets) {
          callbackName = 'Tabletop.singleton.loadSheets';
        } else if (callback === this.loadSheet) {
          callbackName = 'Tabletop.singleton.loadSheet';
        }
      } else {
        var self = this;
        callbackName = 'tt' + (+new Date()) + (Math.floor(Math.random()*100000));
        // Create a temp callback which will get removed once it has executed,
        // this allows multiple instances of Tabletop to coexist.
        Tabletop.callbacks[ callbackName ] = function () {
          var args = Array.prototype.slice.call( arguments, 0 );
          callback.apply(self, args);
          script.parentNode.removeChild(script);
          delete Tabletop.callbacks[callbackName];
        };
        callbackName = 'Tabletop.callbacks.' + callbackName;
      }

      var url = path + '&callback=' + callbackName;

      if (this.simpleUrl) {
        // We've gone down a rabbit hole of passing injectScript the path, so let's
        // just pull the sheet_id out of the path like the least efficient worker bees
        if(path.indexOf('/list/') !== -1) {
          script.src = this.endpoint + '/' + this.key + '-' + path.split('/')[4];
        } else {
          script.src = this.endpoint + '/' + this.key;
        }
      } else {
        script.src = this.endpoint + url;
      }

      if (this.parameterize) {
        script.src = this.parameterize + encodeURIComponent(script.src);
      }

      this.log('Injecting', script.src);

      document.getElementsByTagName('script')[0].parentNode.appendChild(script);
    },

    /*
      This will only run if tabletop is being run in node.js
    */
    serverSideFetch: function(path, callback) {
      var self = this;

      this.log('Fetching', this.endpoint + path);
      request({url: this.endpoint + path, json: true}, function(err, resp, body) {
        if (err) {
          return console.error(err);
        }
        callback.call(self, body);
      });
    },

    /*
      Is this a sheet you want to pull?
      If { wanted: ["Sheet1"] } has been specified, only Sheet1 is imported
      Pulls all sheets if none are specified
    */
    isWanted: function(sheetName) {
      if (this.wanted.length === 0) {
        return true;
      } else {
        return (ttIndexOf(this.wanted, sheetName) !== -1);
      }
    },

    /*
      What gets send to the callback
      if simpleSheet === true, then don't return an array of Tabletop.this.models,
      only return the first one's elements
    */
    data: function() {
      // If the instance is being queried before the data's been fetched
      // then return undefined.
      if (this.modelNames.length === 0) {
        return undefined;
      }
      if (this.simpleSheet) {
        if (this.modelNames.length > 1 && this.debug) {
          this.log('WARNING You have more than one sheet but are using simple sheet mode! Don\'t blame me when something goes wrong.');
        }
        return this.models[this.modelNames[0]].all();
      } else {
        return this.models;
      }
    },

    /*
      Add another sheet to the wanted list
    */
    addWanted: function(sheet) {
      if(ttIndexOf(this.wanted, sheet) === -1) {
        this.wanted.push(sheet);
      }
    },

    /*
      Load all worksheets of the spreadsheet, turning each into a Tabletop Model.
      Need to use injectScript because the worksheet view that you're working from
      doesn't actually include the data. The list-based feed (/feeds/list/key..) does, though.
      Calls back to loadSheet in order to get the real work done.

      Used as a callback for the worksheet-based JSON
    */
    loadSheets: function(data) {
      var i, ilen;
      var toLoad = [];
      this.googleSheetName = data.feed.title.$t;
      this.foundSheetNames = [];

      for (i = 0, ilen = data.feed.entry.length; i < ilen ; i++) {
        this.foundSheetNames.push(data.feed.entry[i].title.$t);
        // Only pull in desired sheets to reduce loading
        if (this.isWanted(data.feed.entry[i].content.$t)) {
          var linkIdx = data.feed.entry[i].link.length-1;
          var sheetId = data.feed.entry[i].link[linkIdx].href.split('/').pop();
          var jsonPath = '/feeds/list/' + this.key + '/' + sheetId + '/' + this.sheetPrivacy + '/values?alt=';
          if (inNodeJS || supportsCORS) {
            jsonPath += 'json';
          } else {
            jsonPath += 'json-in-script';
          }
          if (this.query) {
            // Query Language Reference (0.7)
            jsonPath += '&tq=' + this.query;
          }
          if (this.orderby) {
            jsonPath += '&orderby=column:' + this.orderby.toLowerCase();
          }
          if (this.reverse) {
            jsonPath += '&reverse=true';
          }
          toLoad.push(jsonPath);
        }
      }

      this.sheetsToLoad = toLoad.length;
      for(i = 0, ilen = toLoad.length; i < ilen; i++) {
        this.requestData(toLoad[i], this.loadSheet);
      }
    },

    /*
      Access layer for the this.models
      .sheets() gets you all of the sheets
      .sheets('Sheet1') gets you the sheet named Sheet1
    */
    sheets: function(sheetName) {
      if (typeof sheetName === 'undefined') {
        return this.models;
      } else {
        if (typeof(this.models[sheetName]) === 'undefined') {
          // alert( "Can't find " + sheetName );
          return;
        } else {
          return this.models[sheetName];
        }
      }
    },

    sheetReady: function(model) {
      this.models[model.name] = model;
      if (ttIndexOf(this.modelNames, model.name) === -1) {
        this.modelNames.push(model.name);
      }

      this.sheetsToLoad--;
      if (this.sheetsToLoad === 0) {
        this.doCallback();
      }
    },

    /*
      Parse a single list-based worksheet, turning it into a Tabletop Model

      Used as a callback for the list-based JSON
    */
    loadSheet: function(data) {
      var that = this;
      new Tabletop.Model({
        data: data,
        parseNumbers: this.parseNumbers,
        postProcess: this.postProcess,
        tabletop: this,
        prettyColumnNames: this.prettyColumnNames,
        onReady: function() {
          that.sheetReady(this);
        }
      });
    },

    /*
      Execute the callback upon loading! Rely on this.data() because you might
        only request certain pieces of data (i.e. simpleSheet mode)
      Tests this.sheetsToLoad just in case a race condition happens to show up
    */
    doCallback: function() {
      if(this.sheetsToLoad === 0) {
        this.callback.apply(this.callbackContext || this, [this.data(), this]);
      }
    },

    log: function() {
      if(this.debug) {
        if(typeof console !== 'undefined' && typeof console.log !== 'undefined') {
          Function.prototype.apply.apply(console.log, [console, arguments]);
        }
      }
    }

  };

  /*
    Tabletop.Model stores the attribute names and parses the worksheet data
      to turn it into something worthwhile

    Options should be in the format { data: XXX }, with XXX being the list-based worksheet
  */
  Tabletop.Model = function(options) {
    var i, j, ilen, jlen;
    this.columnNames = [];
    this.column_names = this.columnNames; // jshint ignore:line
    this.name = options.data.feed.title.$t;
    this.tabletop = options.tabletop;
    this.elements = [];
    this.onReady = options.onReady;
    this.raw = options.data; // A copy of the sheet's raw data, for accessing minutiae

    if (typeof(options.data.feed.entry) === 'undefined') {
      options.tabletop.log('Missing data for ' + this.name + ', make sure you didn\'t forget column headers');
      this.originalColumns = [];
      this.elements = [];
      this.ready();
      return;
    }

    for (var key in options.data.feed.entry[0]){
      if (/^gsx/.test(key)) {
        this.columnNames.push(key.replace('gsx$',''));
      }
    }

    this.originalColumns = this.columnNames;
    this.original_columns = this.originalColumns; // jshint ignore:line

    for (i = 0, ilen =  options.data.feed.entry.length ; i < ilen; i++) {
      var source = options.data.feed.entry[i];
      var element = {};
      for (j = 0, jlen = this.columnNames.length; j < jlen ; j++) {
        var cell = source['gsx$' + this.columnNames[j]];
        if (typeof(cell) !== 'undefined') {
          if (options.parseNumbers && cell.$t !== '' && !isNaN(cell.$t)) {
            element[this.columnNames[j]] = +cell.$t;
          } else {
            element[this.columnNames[j]] = cell.$t;
          }
        } else {
          element[this.columnNames[j]] = '';
        }
      }
      if (element.rowNumber === undefined) {
        element.rowNumber = i + 1;
      }

      this.elements.push(element);
    }

    if (options.prettyColumnNames) {
      this.fetchPrettyColumns();
    } else {
      this.ready();
    }
  };

  Tabletop.Model.prototype = {
    /*
      Returns all of the elements (rows) of the worksheet as objects
    */
    all: function() {
      return this.elements;
    },

    fetchPrettyColumns: function() {
      if (!this.raw.feed.link[3]) {
        return this.ready();
      }

      var cellurl = this.raw.feed.link[3].href.replace('/feeds/list/', '/feeds/cells/').replace('https://spreadsheets.google.com', '');
      var that = this;
      this.tabletop.requestData(cellurl, function(data) {
        that.loadPrettyColumns(data);
      });
    },

    beforeReady: function() {
      if(this.postProcess) {
        for (i = 0, ilen = this.elements.length; i < ilen; i++) {
          this.postProcess(element);
        }
      }
    },

    ready: function() {
      this.beforeReady();
      this.onReady.call(this);
    },

    /*
     * Store column names as an object
     * with keys of Google-formatted "columnName"
     * and values of human-readable "Column name"
     */
    loadPrettyColumns: function(data) {
      var prettyColumns = {};

      var columnNames = this.columnNames;

      var i = 0;
      var l = columnNames.length;

      for (; i < l; i++) {
        if (typeof data.feed.entry[i].content.$t !== 'undefined') {
          prettyColumns[columnNames[i]] = data.feed.entry[i].content.$t;
        } else {
          prettyColumns[columnNames[i]] = columnNames[i];
        }
      }

      this.prettyColumns = prettyColumns;
      this.pretty_columns = this.prettyColumns; // jshint ignore:line
      this.prettifyElements();
      this.ready();
    },

    /*
     * Go through each row, substitutiting
     * Google-formatted "columnName"
     * with human-readable "Column name"
     */
    prettifyElements: function() {
      var prettyElements = [],
          orderedPrettyNames = [],
          i, j, ilen, jlen;

      for (j = 0, jlen = this.columnNames.length; j < jlen ; j++) {
        orderedPrettyNames.push(this.prettyColumns[this.columnNames[j]]);
      }

      for (i = 0, ilen = this.elements.length; i < ilen; i++) {
        var newElement = {};
        for (j = 0, jlen = this.columnNames.length; j < jlen ; j++) {
          var newColumnName = this.prettyColumns[this.columnNames[j]];
          newElement[newColumnName] = this.elements[i][this.columnNames[j]];
        }
        prettyElements.push(newElement);
      }
      this.elements = prettyElements;
      this.columnNames = orderedPrettyNames;
    },

    /*
      Return the elements as an array of arrays, instead of an array of objects
    */
    toArray: function() {
      var array = [],
          i, j, ilen, jlen;
      for (i = 0, ilen = this.elements.length; i < ilen; i++) {
        var row = [];
        for (j = 0, jlen = this.columnNames.length; j < jlen ; j++) {
          row.push(this.elements[i][ this.columnNames[j]]);
        }
        array.push(row);
      }

      return array;
    }
  };

  if(typeof module !== 'undefined' && module.exports) { //don't just use inNodeJS, we may be in Browserify
    module.exports = Tabletop;
  } else if (typeof define === 'function' && define.amd) {
    define(function () {
      return Tabletop;
    });
  } else {
    window.Tabletop = Tabletop;
  }

})();
