/*jshint esnext:true, eqnull:true */
/*globals require */

import {TimeSeriesPlotter} from './timeSeriesPlot';

// size plot div, first size width of outer, set plot core inner div to 100%,
// get client width of inner/core, then height accordingly (this excludes
// elements above/below the plot core rendering, like title/description from
// consideration in aspect-ratio computation/application).
function sizePlotDiv(node, data) {
  var width = +data.width || 100,
      units = data.width_units || '%',
      aspect = data.aspect_ratio,                                 // [w,h]
      hasRatio = (aspect && aspect.length === 2),
      ratio = (hasRatio) ? (aspect[1] / aspect[0]) : undefined,   // h / w
      relHeight = (!hasRatio && data.height_units === '%'),
      widthSpec = '' + width + units,
      clientWidth,
      computedHeight,
      plotCore = node.select('div.chart-div');
  plotCore.style('width', '100%');
  node.style('width', widthSpec);
  if (!data.series.length) {
    // minimal height, placeholder text:
    plotCore.style('height', '15px');
    plotCore.html('<em>No series data yet provided for plot.</em>');
    return;
  }
  clientWidth = plotCore[0][0].clientWidth;
  if ((!hasRatio) && (data.height_units === 'px')) {
    // fixed pixel (absolute) height is specified:
    computedHeight = data.height;
  } else {
    if (relHeight && data.height) {
      // height relative to width, but no specified aspect ratio
      ratio = (data.height / 100.0);  // pct to ratio
    }
    // use explicitly provided or just-computed aspect ratio:
    computedHeight = Math.round(ratio * clientWidth);
  }
  plotCore.style('height', '' + computedHeight + 'px');
}


export function loadChart(node, data) {
  // given d3 node and data as Chart (model) object, load
  var plotCore, svg, plotter;
  // empty outer div of all content:
  node.html('');
  // add plot core div:
  plotCore = node.append('div')
    .classed('chart-div', true);
  // size outer node and inner plotCore divs:
  sizePlotDiv(node, data);
  // add svg node into plotCore:
  svg = plotCore.append('svg')
    .attr('class', 'upiq-chart chart-svg');
  svg.outerNode = node;
  data.margins = {top: 10, bottom: 75, left: 40, right: 10};
  plotter = new TimeSeriesPlotter(node, data);
  plotter.update();
}
