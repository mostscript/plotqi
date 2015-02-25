/*jshint esnext:true, eqnull:true, undef:true */
/*globals require, window */

var d3 = require('d3');
import {getObjects} from './utils';
import {Chart} from './chartviz';
import {SmallMultiplesChart} from './smallMultiplesChart';
import {LargeChart} from './largeFormatChart';
import {chartLoader} from './loader';

var nv = require('./vendor/nvd3');
getObjects('report.json', function (charts) {
  var lineChart, barChart,
      data = charts[0];

  charts = charts.map( graph => new Chart(graph) );
  lineChart = charts[0];
  barChart = new Chart(data);
   
  window.charts = charts;

  lineChart.width = 60;
  barChart.width = 45;
  barChart.chart_type = 'bar';

  var small_div = d3.select('#small-chart-div-test');
  var largeLinePlotDiv = d3.select('#chart-div-test-1');
  var largeBarPlotDiv = d3.select('#chart-div-test-2');
  var refactorLinePlotDiv = d3.select('#chart-div-refactor-1');
  var refactorBarPlotDiv = d3.select('#chart-div-refactor-2');
  nv.addGraph(SmallMultiplesChart(lineChart, small_div));
  nv.addGraph(LargeChart(lineChart, largeLinePlotDiv));
  nv.addGraph(LargeChart(barChart, largeBarPlotDiv));
  //nv.addGraph(chartLoader(refactorLinePlotDiv, lineChart));
  nv.addGraph(chartLoader(refactorLinePlotDiv, lineChart));
  nv.addGraph(chartLoader(refactorBarPlotDiv, barChart));
});
