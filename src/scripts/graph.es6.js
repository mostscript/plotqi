/*jshint esnext:true, eqnull:true */
/*globals require */
import {getObjects} from './utils';
import {Chart} from './chartviz';
import {SmallMultiplesChart} from './smallMultiplesChart';
import {LargeChart} from './largeFormatChart';
var d3 = require('d3');
var nv = require('imports?d3=d3!exports?window.nv!nvd3');
getObjects('report.json', function (charts) {
  charts = charts.map( graph => Chart(graph) )
  window.charts = charts;

  var small_div = d3.select('#small-chart-div-test_numero_dos');
  var lg_div = d3.select('#chart-div-test_numero_dos');
  nv.addGraph(SmallMultiplesChart(charts[0], small_div));
  nv.addGraph(LargeChart(charts[0], lg_div));
});