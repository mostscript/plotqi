/*jshint esnext:true, eqnull:true, unused:true, undef: true */

import {timeLineChart} from './timeLineChart';
import {timeBarChart} from './timeBarChart';


// size plot div, first size width, get client width, then height accordingly:
function sizePlotDiv(node, data) {
  var width = +data.width || 100,
      units = data.width_units || '%',
      aspect = data.aspect_ratio,                               // [w,h]
      hasRatio = (aspect && aspect.length === 2),
      ratio = (hasRatio) ? (aspect[1] / aspect[0]) : undefined,   // h / w
      relHeight = (!hasRatio && data.height_units === '%'),
      widthSpec = '' + width + units,
      clientWidth,
      computedHeight;
  node.style('width', widthSpec);
  if (!data.series.length) {
    // minimal height, placeholder text:
    node.style('height', '15px');
    node.html('<em>No series data yet provided for plot.</em>');
    return;
  }
  clientWidth = node[0][0].clientWidth;
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
  node.style('height', '' + computedHeight + 'px');
}

export function LargeChart(mschart, node) {
  if(!node.attr('id')) node.attr('id', 'chart-div-' + (mschart.uid || Math.floor(Math.random() * 1000)));
  var parentNode = node;
  node = parentNode.append('div')
             .classed('chart-div', true)
             .style("width", mschart.width + mschart.width_units);

  sizePlotDiv(node, mschart);
  
  node = node.append('svg')
             .attr('class', 'upiq-chart chart-svg');

  node.outerNode = parentNode;
  mschart.margins = {top: 10, bottom: 75, left: 40, right: 10};
  return mschart.chart_type == 'line' ? timeLineChart(mschart, node) : timeBarChart(mschart, node);
}
