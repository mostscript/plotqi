/*jshint esnext:true, eqnull:true, undef:true */
/*globals require, window */

var d3 = require('d3');
var nv = require('./vendor/nvd3');
import {TimeSeriesPlotter} from './timeSeriesPlot';
import {forReportJSON} from './utils';
import {Chart} from './chartviz';

var INTERACT = true;   // default

export function chartLoader(node, data, opts) {
  var interactive, plotter;
  opts = opts || {};
  // Factory function for chart loader, creates plotter adapter and 
  // returns its bound update() method as callback for async/queued load
  if (opts.interactive === undefined) {
    opts.interactive = INTERACT;
  }
  // construct adapter
  plotter = new TimeSeriesPlotter(node, data, opts);
  // return bound callback
  return plotter.update.bind(plotter);
}

export function loadReport(container, url, opts) {
  opts = opts || {};

  function divKey(d, i) {
    /** key function for d3 to use existing plot wrapper divs rendered into
      * HTML by external system (e.g. server-side template) in update selection.
      */
    var exists = this instanceof window.HTMLElement,
        _prefix = (opts.prefix || 'plot') + '-',
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
        nv.addGraph(chartLoader(plotDiv, d, opts));
      });
      // Enter selection to add remaining plot DIVs as needed:
      plotDivs.enter()
        .append('div')
        .classed('plotdiv', true)
        .attr({
          id: chart => `${opts.prefix}-${chart.uid}`
        })
        .each(function (d, i) {
          var plotDiv = d3.select(this);
          nv.addGraph(chartLoader(plotDiv, d, opts));
        });
        //.call();
    }
  );
}

export function loadReports(opts) {
  // default options
  opts = opts || {};
  opts.interactive = opts.interactive || 'true';
  opts.prefix = opts.prefix || 'plot';
  // Let the HTML drive what gets loaded: any element that contains
  // class of 'report-core' and 'data-report-json' should get
  // loaded with the URL listed in data-report-json.
  d3.select('.report-core').each(function (d, i) {
    var container = d3.select(this),
        url = container.attr('data-report-json'),
        prefix = container.attr('data-report-prefix') || 'plot';
    loadReport(container, url, opts);
  });
}
