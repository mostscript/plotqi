/*jshint esnext:true, eqnull:true, unused:true, undef: true */

import {timeLineChart} from './timeLineChart';
import {timeBarChart} from './timeBarChart';


// size plot div, first size width of outer, set plot core inner div to 100%,
// get client width of inner/core, then height accordingly (this excludes
// elements above/below the plot core rendering, like title/description from
// consideration in aspect-ratio computation/application).
function sizePlotDiv(node, data) {
  var width = +data.width || 100,
      units = data.width_units || '%',
      aspect = data.aspect_ratio,                               // [w,h]
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

export function LargeChart(mschart, node) {
  if(!node.attr('id')) node.attr('id', 'chart-div-' + (mschart.uid || Math.floor(Math.random() * 1000)));
  var parentNode = node;
  parentNode.classed('chart', true);
  node = parentNode.append('div')
             .classed('chart-div', true)
             .style("width", mschart.width + mschart.width_units);

  sizePlotDiv(parentNode, mschart);
  
  node = node.append('svg')
             .attr('class', 'upiq-chart chart-svg');

  node.outerNode = parentNode;
  mschart.margins = {top: 10, bottom: 75, left: 40, right: 10};
  return mschart.chart_type == 'line' ? timeLineChart(mschart, node) : timeBarChart(mschart, node);
}
