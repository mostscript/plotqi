/*jshint esnext:true, eqnull:true */
/*globals require */
var moment = require('moment');
var nv = require('imports?d3=d3!exports?window.nv!nvd3');
import {styleSheet} from './utils';
import {timeLineChart} from './timeLineChart';
import {timeBarChart} from './timeBarChart';

export function LargeChart(mschart, node) {
  node = node || d3.select('body').append('div');
  if(!node.attr('id')) node.attr('id', 'chart-div-' + (mschart.uid || Math.floor(Math.random() * 1000)));
  var parentNode = node;
  node = parentNode.append('div')
             .classed('chart-div', true)
             .style("width", mschart.width + mschart.width_units);

  var relative = (mschart.width_units == '%');
  var ratio = mschart.aspect_ratio ? (mschart.aspect_ratio[1] / mschart.aspect_ratio[0]) : undefined;
  var yMax, xMax;
  if(relative) {
    yMax = mschart.range_max - mschart.range_min;
    xMax = ratio * (mschart.range_max - mschart.range_min);
  } else {
    if(!ratio) {
      yMax = mschart.height;
      xMax = mschart.width;
    } else {
      yMax = ratio * mschart.width;
      xMax = mschart.width;
    }
  }

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
    else node.style('height', (ratio * mschart.width) + 'px')
  }

  node = node.append('svg')
             .attr('class', 'upiq-chart chart-svg');

  var margins = mschart.margins = {top: 10, bottom: 75, left: 40, right: 10};
  node.outerNode = parentNode;
  return mschart.chart_type == 'line' ? timeLineChart(mschart, node) : timeBarChart(mschart, node);
}