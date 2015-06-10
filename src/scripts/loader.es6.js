/*jshint esnext:true, eqnull:true, undef:true */
/*globals require */

var d3 = require('d3');
var nv = require('./vendor/nvd3');
import {TimeSeriesPlotter} from './timeSeriesPlot';
import {forReportJSON} from './utils';
import {Chart} from './chartviz';

var INTERACT = true;   // default

export function chartLoader(node, data, interactive) {
  // Factory function for chart loader, creates plotter adapter and 
  // returns its bound update() method as callback for async/queued load
  var useInteractive = (interactive === undefined) ? INTERACT : interactive,
      // construct adapter
      plotter = new TimeSeriesPlotter(node, data, useInteractive);
  // return bound callback
  return plotter.update.bind(plotter);
}

export function loadReport(container, url, interactive) {
  forReportJSON(
    url,
    function (charts) {
      charts = charts.map( graph => new Chart(graph) );
      // TODO: use selectAll to get selection, then enter selection
      // enter and update existing by calling chartLoader
      container.selectAll('div.plotdiv').data(charts).enter()
        .append('div')
        .classed('plotdiv', true)
        .attr({
          id: chart => `plot-${chart.uid}`
        })
        .each(function (d, i) {
          var plotDiv = d3.select(this);
          nv.addGraph(chartLoader(plotDiv, d, interactive));
        });
        //.call();

      // TODO: make this ^^^ work on update too
    }
  );
}

export function loadReports(interactive) {
  // Let the HTML drive what gets loaded: any element that contains
  // class of 'report-core' and 'data-report-json' should get
  // loaded with the URL listed in data-report-json.
  d3.select('.report-core').each(function (d, i) {
    var container = d3.select(this),
        url = container.attr('data-report-json');
    loadReport(container, url, interactive);
  });
}
