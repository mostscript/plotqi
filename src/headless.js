/*jshint esnext:true, eqnull:true */
/*globals require, window */

'use strict';  /*jshint -W097 */
require('./scripts/Symbol');
require('es5-shim');
var d3 = require('d3');
var moment = require('moment');
window.renderSVG = require('./scripts/renderSVG').renderSVG;
