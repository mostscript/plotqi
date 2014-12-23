/*jshint esnext:true, eqnull:true */
/*globals require */
import {getObjects, styleSheet} from './utils';
import {Chart} from './chartviz';
import {SmallMultiplesChart} from './smallMultiplesChart';
var nv = require('imports?d3=d3!exports?window.nv!nvd3');
var moment = require('moment');
import {timeLineChart} from './timeLineChart';
import {timeBarChart} from './timeBarChart';

window.renderSVG = function(chart, height, width) {
  chart = Chart(chart);
  window.charts = charts;
  var div = d3.select('#chart-div');
  nv.addGraph(LargeChart(chart, div, height, width));
};

function LargeChart(mschart, node, height, width) {
  var parentNode = node;
  node = parentNode.append('div')
             .classed('chart-div', true)
             .style("width", width)
             .style('height', height);

  node = node.append('svg')
             .attr('class', 'upiq-chart chart-svg');

  mschart.margins = {top: 10, bottom: 75, left: 40, right: 10};
  mschart.title = mschart.description = undefined;
  mschart.height = height;
  mschart.width = width;
  mschart.width_units = 'px';
  node.outerNode = parentNode;
  return mschart.chart_type === 'line' ? timeLineChart(mschart, node) : timeBarChart(mschart, node);
}