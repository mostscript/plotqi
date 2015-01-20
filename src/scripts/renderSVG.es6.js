/*jshint esnext:true, eqnull:true */
/*globals require */
Function.prototype.bind = Function.prototype.bind || function (thisp) {
    var fn = this;
    return function () {
        return fn.apply(thisp, arguments);
    };
};
import {getObjects, styleSheet} from './utils';
var nv = require('imports?d3=d3!exports?window.nv!nvd3');
var moment = require('moment');
import {timeLineChart} from './timeLineChart';
import {timeBarChart} from './timeBarChart';
import {Chart} from './chartviz';
import {SmallMultiplesChart} from './smallMultiplesChart';
import {LargeChart} from './largeFormatChart';

export function renderSVG(chart, width) {
  chart = getChartObj(chart);
  chart = Chart(chart);
  var div = d3.select('#chart-div');
  nv.addGraph(LargeChart(chart, div, width));
};

function getChartObj(charts) {
    var obj = {};

    if(charts.length)
      obj = charts[0][1];
    else //if the JSON payload wasn't an array
      obj = charts; //then we were given a single object

    obj.series.forEach( function (serum) {
      serum.data = serum.data.map( function ([, datum]) { return datum; } )
    });
    return obj;
};

function LargeChart(mschart, node, width) {
  var ratio = mschart.aspect_ratio ? (mschart.aspect_ratio[1] / mschart.aspect_ratio[0]) : (mschart.height / mschart.width);

  var parentNode = node;
  node = parentNode.append('div')
             .classed('chart-div', true)
             .style("width", width)
             .style('height', ratio * width);

  node = node.append('svg')
             .attr('class', 'upiq-chart chart-svg');

  mschart.margins = {top: 10, bottom: 75, left: 40, right: 10};
  mschart.title = mschart.description = undefined;
  mschart.height = ratio * width;
  mschart.width = width;
  mschart.width_units = 'px';
  node.outerNode = parentNode;
  return mschart.chart_type === 'line' ? timeLineChart(mschart, node) : timeBarChart(mschart, node);
}