/*jshint esnext:true, eqnull:true */
/*globals require */
Function.prototype.bind = Function.prototype.bind || function (thisp) {
    var fn = this;
    return function () {
        return fn.apply(thisp, arguments);
    };
};
var nv = require('imports?d3=d3!exports?window.nv!nvd3');
var moment = require('moment');
import {styleSheet} from './utils';
import {timeLineChart} from './timeLineChart';
import {timeBarChart} from './timeBarChart';
import {Chart} from './chartviz';
import {LargeChart} from './largeFormatChart'

export function renderSVG(chart, width) {
  chart = getChartObj(chart);

  var ratio = chart.aspect_ratio ? (chart.aspect_ratio[1] / chart.aspect_ratio[0]) : (chart.height / chart.width);
  chart.margins = {top: 10, bottom: 75, left: 40, right: 10};
  chart.title = chart.description = undefined;
  chart.height = ratio * width;
  chart.width = width;
  chart.width_units = chart.height_units = 'px';

  chart = Chart(chart);

  var div = d3.select('#chart-div');
  window._data1 = chart.series[0].data;
  nv.addGraph(LargeChart(chart, div));
};

function getChartObj(jsonData) {
    var objs = [];

    if(jsonData.length)
      objs = jsonData.map( function ([, obj]) { return obj; } );
    else //if the JSON payload wasn't an array
      objs = [ jsonData ]; //then we were given a single object

    objs.forEach( function (obj) { 
      obj.series.forEach( function (serum) {
        serum.data = serum.data.map( function ([, datum]) { return datum; } )
        })
    });
    return objs[0];
};

function aLargeChart(mschart, node, width) {
  var parentNode = node;
  node = parentNode.append('div')
             .classed('chart-div', true)
             .style('width', `${width}px`);

  var ratio = mschart.aspect_ratio ? (mschart.aspect_ratio[1] / mschart.aspect_ratio[0]) : (mschart.height / mschart.width);

  styleSheet.insertRule (
    `#${parentNode.attr('id')} .chart-div::after {` +
      'content: "";' +
      'display: block;' +
      `margin-top: ${(ratio * 100)}%;` +
    '}', styleSheet.cssRules.length
  );

  node = node.append('svg')
             .attr('class', 'upiq-chart chart-svg');

  var margins = mschart.margins = {top: 10, bottom: 75, left: 40, right: 10};
  node.outerNode = parentNode;
  return mschart.chart_type == 'line' ? timeLineChart(mschart, node) : timeBarChart(mschart, node);
}