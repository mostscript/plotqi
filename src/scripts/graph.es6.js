/*jshint esnext:true, eqnull:true, undef:true */
/*globals require, window, document */

var d3 = require('d3');
import {forReportJSON} from './utils';
import {Chart} from './chartviz';
import {chartLoader, loadReports} from './loader';
import {BaseRenderingPlugin} from './plugin';

var nv = require('./vendor/nvd3');

function readySetGo(callback) {
  document.addEventListener('DOMContentLoaded', callback);
}

window.plotqi = window.plotqi || {};
window.plotqi.ready = readySetGo;
window.plotqi.load = loadReports;
window.plotqi.BaseRenderingPlugin = BaseRenderingPlugin;

// Calling semantics:
//  <script type="text/javascript">
//    (function () {
//      // break if no reasonable ES5 support:
//      if (!Array.prototype.forEach || !Object.create) {
//        alert('Your browser does not support this application.');
//        return;
//      }
//      // add any integration-specific custom plugins:
//      window.plotqi.ADDITIONAL_PLUGINS.push(MyCustomPlugin);
//      window.plotqi.ready(window.plotqi.load);
//    }());
//  </script>
