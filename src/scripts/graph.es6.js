/*jshint esnext:true, eqnull:true, undef:true */
/*globals require, window, document */

var d3 = require('d3');
import {forReportJSON} from './utils';
import {Chart} from './chartviz';
import {chartLoader, loadReports} from './loader';

var nv = require('./vendor/nvd3');

function readySetGo(callback) {
  document.addEventListener('DOMContentLoaded', callback);
}

readySetGo(loadReports);

