/*jshint esnext:true, eqnull:true, undef:true */
/*globals require, window */

var d3 = require('d3');
import {TimeSeriesPlotter} from './timeSeriesPlot';
import {forReportJSON, geometricBatch} from './utils';
import {Chart} from './chartviz';

var INTERACT = true;   // default

function batchURLs(base, spec, total) {
  var cacheBust = 'cache_bust=' + Math.floor(Math.random() * Math.pow(10,8)),
      _bSpec = pair => 'b_size=' + pair[1] + '&b_start=' + pair[0],
      _qs = pair => _bSpec(pair) + '&' + cacheBust,
      _url = pair => base + '?' + _qs(pair);
  if (spec === 'geometric') {
    return geometricBatch(total).map(_url);
  }
  return [base + '?' + cacheBust];  // default is all reports in one url fetch
}


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

function loadReportBatched(container, url, opts, keyFn) {
  /** Given container, base URL to JSON, options, get size of total
    * for all plots in report, load batches on respective data receipt.
    */

  function size() {
    if (typeof opts.size === 'number') {
      return opts.size;
    }
    return container.selectAll('div.plotdiv').size();
  }

  function divFor(uid) {
    var _prefix = (opts.prefix || 'plot') + '-',
        divId = _prefix + uid,
        plotDiv = container.select('#' + divId);
    if (!plotDiv.size()) {
      plotDiv = container.append('div')
        .classed('plotdiv', true)
        .attr('id', divId);
    }
    return plotDiv;
  }

  var chartIds = [],
      uniqueChart = c => chartIds.indexOf(c.uid) === -1,
      processChart = function (chart) {
        divFor(chart.uid).call(plotDiv => chartLoader(plotDiv, chart, opts)());
      };

  batchURLs(url, opts.batching, size()).forEach(function (url) {
    forReportJSON(
      url,
      function (charts) {
        // improbable chance of race condition across de-dupe next 2 lines
        // but likelihood and impact thereof not a practical issue:
        charts = charts.filter(uniqueChart).map(graph => new Chart(graph));
        chartIds.push(...charts.map(c => c.uid));
        charts.forEach(processChart);
      }
    );
  }); 
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

  // If batched, as we cannot stream and do d3 data-join - process one-by-one:
  if (opts.batching === 'geometric') {
    loadReportBatched(container, url, opts, divKey);
    return;
  }

  // non-batched, still use batchURLs just to get single cache-busting URL:
  url = batchURLs(url, 'all', opts)[0];

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
        chartLoader(plotDiv, d, opts)();
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
          chartLoader(plotDiv, d, opts)();
        });
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
        size = parseInt(container.attr('data-report-size'), 10),
        reportOptions = Object.create(opts);
    reportOptions.prefix = container.attr('data-report-prefix') || opts.prefix;
    reportOptions.batching = container.attr('data-report-batch-step') || 'all';
    reportOptions.size = (isNaN(size)) ? null : size;
    loadReport(container, url, reportOptions);
  });
}
