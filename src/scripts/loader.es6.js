/*jshint esnext:true, eqnull:true */
/*globals require */

import {TimeSeriesPlotter} from './timeSeriesPlot';

export function chartLoader(node, data) {
  // Factory function for chart loader, creates plotter adapter and 
  // returns its bound update() method as callback for async/queued load
  var plotter = new TimeSeriesPlotter(node, data);    // construct adapter
  return plotter.update.bind(plotter);                // bound callback
}
