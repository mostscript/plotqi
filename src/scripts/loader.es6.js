/*jshint esnext:true, eqnull:true, undef:true */
/*globals require */

import {TimeSeriesPlotter} from './timeSeriesPlot';

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
