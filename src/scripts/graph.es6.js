/*jshint esnext:true, eqnull:true, undef:true */
/*globals require, window, document */

var d3 = require('d3');
import {forReportJSON} from './utils';
import {Chart} from './chartviz';
import {SmallMultiplesChart} from './smallMultiplesChart';
import {LargeChart} from './largeFormatChart';
import {chartLoader, loadReports} from './loader';

var nv = require('./vendor/nvd3');

function readySetGo(callback) {
  document.addEventListener('DOMContentLoaded', callback);
}

readySetGo(loadReports);


// vvv LEGACY LOADER: vvv
readySetGo(
  forReportJSON(
      'report.json',
      function (charts) {
        var lineChart, barChart,
            data = charts[0];

        charts = charts.map( graph => new Chart(graph) );

        lineChart = charts[0];
        barChart = new Chart(data);
        
        window.charts = charts;

        lineChart.width = 100;
        barChart.width = 100;
        barChart.chart_type = 'bar';

        var refactorLinePlotDiv = d3.select('#chart-div-refactor-1');
        var refactorBarPlotDiv = d3.select('#chart-div-refactor-2');
        nv.addGraph(chartLoader(refactorLinePlotDiv, lineChart));
        nv.addGraph(chartLoader(refactorBarPlotDiv, barChart));
      }
  )
);
