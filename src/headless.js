/*jshint esnext:true, eqnull:true */
/*globals require */
'use strict';
require('./scripts/Symbol');
require('es5-shim');
var d3 = require('d3');
var moment = require('moment');
window.renderSVG = require('./scripts/renderSVG').renderSVG;