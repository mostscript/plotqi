/*jshint esnext:true, eqnull:true, unused:true, undef: true */

import {styleSheet} from './utils';
import {timeLineChart} from './timeLineChart';
import {timeBarChart} from './timeBarChart';


export function LargeChart(mschart, node) {
  if(!node.attr('id')) node.attr('id', 'chart-div-' + (mschart.uid || Math.floor(Math.random() * 1000)));
  var parentNode = node;
  node = parentNode.append('div')
             .classed('chart-div', true)
             .style("width", mschart.width + mschart.width_units);

  var relative = (mschart.width_units == '%');
  var ratio = mschart.aspect_ratio ? (mschart.aspect_ratio[1] / mschart.aspect_ratio[0]) : undefined;

  if(relative) {
    if(ratio)
      styleSheet.insertRule (
        `#${parentNode.attr('id')} .chart-div::after {` +
          'content: "";' +
          'display: block;' +
          `margin-top: ${(ratio * 100)}%;` +
        '}', styleSheet.cssRules.length
      );
    else
      node.style('height', mschart.height + mschart.height_units);
  } else {
    if(!ratio) node.style('height', mschart.height + mschart.height_units);
    else node.style('height', (ratio * mschart.width) + 'px');
  }

  node = node.append('svg')
             .attr('class', 'upiq-chart chart-svg');

  node.outerNode = parentNode;
  mschart.margins = {top: 10, bottom: 75, left: 40, right: 10};
  return mschart.chart_type == 'line' ? timeLineChart(mschart, node) : timeBarChart(mschart, node);
}
