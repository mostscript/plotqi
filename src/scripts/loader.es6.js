/*jshint esnext:true, eqnull:true, undef:true */
/*globals require, window */

var d3 = require('d3');
var nv = require('./vendor/nvd3');
import {TimeSeriesPlotter} from './timeSeriesPlot';
import {forReportJSON} from './utils';
import {Chart} from './chartviz';

var INTERACT = true;   // default

export function chartLoader(node, data, interactive, prefix) {
  // Factory function for chart loader, creates plotter adapter and 
  // returns its bound update() method as callback for async/queued load
  var useInteractive = (interactive === undefined) ? INTERACT : interactive,
      // construct adapter
      plotter = new TimeSeriesPlotter(node, data, useInteractive, prefix);
  // return bound callback
  return plotter.update.bind(plotter);
}

export function loadReport(container, url, interactive, prefix) {

  function divKey(d, i) {
    /** key function for d3 to use existing plot wrapper divs rendered into
      * HTML by external system (e.g. server-side template) in update selection.
      */
    var exists = this instanceof window.HTMLElement,
        _prefix = (prefix || 'plot') + '-',
        uid = (exists) ? this.getAttribute('id').replace(_prefix, '') : null;
    return uid || ((d) ? d.uid : null);
  }

  forReportJSON(
    url,
    function (charts) {
      var plotDivs;
      charts = charts.map( graph => new Chart(graph) );
      plotDivs = container
        .selectAll('div.plotdiv')
        .data(charts, divKey);
      // Update selection for any (if applicable) existing plot DIVs,
      //  -- this favors order set in HTML source over JSON:
      plotDivs.each(function (d, i) {
        var plotDiv = d3.select(this);
        nv.addGraph(chartLoader(plotDiv, d, interactive));
      });
      // Enter selection to add remaining plot DIVs as needed:
      plotDivs.enter()
        .append('div')
        .classed('plotdiv', true)
        .attr({
          id: chart => `${prefix}-${chart.uid}`
        })
        .each(function (d, i) {
          var plotDiv = d3.select(this);
          nv.addGraph(chartLoader(plotDiv, d, interactive));
        });
        //.call();
    }
  );
}

export function loadReports(interactive) {
  // Let the HTML drive what gets loaded: any element that contains
  // class of 'report-core' and 'data-report-json' should get
  // loaded with the URL listed in data-report-json.
  d3.select('.report-core').each(function (d, i) {
    var container = d3.select(this),
        url = container.attr('data-report-json'),
        prefix = container.attr('data-report-prefix') || 'plot';
    loadReport(container, url, interactive, prefix);
  });
}
