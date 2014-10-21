require: './Symbol.js';
var privateSym = new Symbol();
import {
  DataPoint,
  TimeDataPoint,
  DataSeries,
  TimeDataSeries,
  MultiSeriesChart,
  TimeSeriesChartSchema
} from './chartviz';
var moment = require('moment');
var d3 = require('d3');
var nv = require('imports?d3=d3!exports?window.nv!nvd3');
import {addStylesheetRules, extractData, calcDomain} from './init';

export function LargeChart(mschart, node) {
  node = node || d3.select('body').append('div').attr('id', 'chart-div-' + (mschart.uid || Math.floor(Math.random() * 1000)));
  node.classed('chart-div', true)
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
      addStylesheetRules([
        ['#' + node.attr('id') + ':after',
          ['content', '""'],
          ['display', 'block'],
          ['margin-top', (ratio * 100) + '%']
        ]
      ]);
    else
      node.style('height', mschart.height + mschart.height_units);
  } else {
    if(!ratio)
      node.style('height', mschart.height + mschart.height_units);
    else
      node.style('height', (ratio * mschart.width) + 'px')
  }

  node = node.append('svg')
             .attr('class', 'upiq-chart chart-svg');
  var margins = {top: 10, bottom: 50, left: 25, right: 30};
  var data = extractData(mschart);
  var domain = calcDomain(mschart);
  var tick_domain = domain.slice();
  tick_domain[1] = d3.time.month.offset(domain[1], 1);
  var tickVals = d3.time.months(...tick_domain).map( month => month.valueOf() );

  return function () {
    node.append('g')
    .attr('class', 'nv-background')
    .attr('transform', 'translate(' + margins.left + ',' + margins.top + ')');

    var chart = nv.models.lineChart()
                  .id(mschart.uid)
                  .showLegend(false)
                  .margin(margins)
                  .transitionDuration(500)
                  .tooltipContent(function(seriesName, x, y, graph) {
                    return '<h3>' + seriesName.slice(0, seriesName.lastIndexOf('::')) + '</h3>' + '<p>' + graph.point.note + '</p>'
                    + '<p class=\'footer\'>' + graph.point.title + ', ' + graph.series.format(y / 100) + '</p>';
                  })
                  chart.lines.scatter.onlyCircles(false);

    chart.xAxis
         .tickFormat( d => d3.time.format('%B')(new Date(d))[0] )
         .tickValues(tickVals)
         .showMaxMin(false)
         .tickPadding(3)
    chart.yAxis
         .tickFormat(d3.format(','))
         .showMaxMin(false);
    chart
         .xDomain(domain.map( x => x.valueOf() ))
         .yDomain(mschart.range);

    node.datum(data).call(chart);

    var yscale = chart.yScale();
    var xscale = chart.xScale();

    //Dashed lines for all missing areas
    node.selectAll('.nv-wrap.nv-line > g > g.nv-groups .nv-group').filter( d => d.dashed )
        .style('stroke-dasharray', '3 3');
    node.selectAll('.nv-linesWrap .nv-wrap.nv-line g.nv-scatterWrap .nv-wrap.nv-scatter .nv-groups g.nv-group').filter( d => d.dashed )
        .attr('visibility', 'hidden');

    //Fix Axis Ticks
    node.selectAll('.nv-y.nv-axis .nvd3.nv-wrap.nv-axis g.tick:not(:nth-of-type(1)):not(:nth-last-of-type(1))')
      .append('line')
      .attr('y2', 0)
      .attr('x2', 4)
      .style('stroke', 'dimgray');

    /*//Fix for Firefox - 2px lines must be shifted by .5px to align to pixel boundaries
    node.select('.nv-y.nv-axis .nvd3.nv-wrap.nv-axis .tick:nth-of-type(1) line')
        .attr('y1', 0.5)
        .attr('y2', 0.5);
    node.select('.nv-y.nv-axis .nvd3.nv-wrap.nv-axis .tick:nth-last-of-type(1) line')
        .attr('y1', -0.5)
        .attr('y2', -0.5);*/
    /*
    //Graph Title
    node.append('g')
        .attr('class', 'nvd3 nv-small-chart nv-chart-title')
        .append('text')
        .attr('class', 'nv-small-chart nv-title')
        .attr('x', 5)
        .attr('y', 10)
        .text(mschart.title);

    var legend = node.append('g')
                     .attr('class', 'nvd3 nv-legend')
                     .attr('transform', 'translate(' + 5 + ',' + '100' + ')')
                     .append('g')
                     .attr('class', 'nv-leg')
                     .selectAll('circle.legend-pt.nv-point')
                     .data(mschart.series.slice(0, 2))
                     .enter().append('g');

    //Graph Legend
    legend.append('circle')
          .attr('class', 'nv-legendpt nv-point')
          .attr('cx', 5 )
          .attr('cy', (d, i) => i * 12 )
          .attr('r', 4)
          .style('stroke', d => d.color )
          .style('stroke-opacity', 1)
          .style('fill', d => d.color )
          .style('fill-opacity', 0.5);
    legend.append('text')
          .attr('class', 'nv-goal-lbl')
          .attr('text-anchor', 'start')
          .attr('x', 15)
          .attr('y', (d, i) => (i * 12) + 3 )
          .attr('dy', '0.1em')
          .text( d => d.title );

    //Goal Line
    if(mschart.goal) {
      var goal = node.append('g')
                     .attr('class', 'nvd3 nv-distribution')
                     .attr('transform', 'translate(' + margins.left + ',' + margins.top + ')')
                     .selectAll('line.nv-goal')
                     .data([mschart.goal])
                     .enter().append('g')
                     .attr('class', 'nv-dist nv-goal');
      goal.append('line')
          .attr('class', 'nv-goal-line')
          .attr('x1', xscale(domain[0].valueOf()))
          .attr('x2', xscale(domain[1].valueOf()))
          .attr('y1', Math.floor(yscale(mschart.goal)) )
          .attr('y2', Math.floor(yscale(mschart.goal)) )
          .style('stroke', mschart.goal_color);
      goal.append('text')
          .attr('class', 'nv-goal-lbl')
          .attr('text-anchor', 'start')
          .attr('x', xscale(domain[1].valueOf()) + 3)
          .attr('y', Math.floor(yscale(mschart.goal)) + 2)
          //.attr('textLength', margins.right - 3)
          //.attr('lengthAdjust', 'spacingAndGlyphs')
          .text(mschart.goal + ' (G)')
          .style('fill', mschart.goal_color);
    }

    //Year Labels
    var yrs = node.append('g')
                   .attr('class', 'nvd3 nv-year-wrap')
                   .attr('transform', 'translate(' + margins.left + ',0)')
                   .selectAll('line.nv-goal')
                   .data([true])
                   .enter().append('g')
                   .attr('class', 'nv-years');
    yrs.append('text')
       .attr('class', 'nv-year-lbl')
       .attr('text-anchor', 'start')
       .attr('x', xscale(domain[0].valueOf()))
       .attr('y', margins.top - 5)
       .text(domain[0].getFullYear());
    if(domain[1].getFullYear() !== domain[0].getFullYear()) {
      yrs.append('text')
         .attr('class', 'nv-year-lbl')
         .attr('text-anchor', 'end')
         .attr('x', xscale(domain[1].valueOf()))
         .attr('y', margins.top - 5)
         .text(domain[1].getFullYear());
    }

    //Zebra striped background
    var tickDiff = xscale(tickVals[1]) - xscale(tickVals[0]);
    var bg = node.select('.nv-background')
                 .selectAll('rect.nv-zebra')
                 .data(tickVals)
                 .enter().append('rect')
                 .attr('y', 0)
                 .attr('x', d => xscale(d))
                 .attr('height', yscale(mschart.range[0]))
                 .attr('width', tickDiff)
                 .attr('visibility', (d, i) => i !== (tickVals.length - 1) ? 'visible' : 'hidden' )
                 .style('fill', d => new Date(d).getFullYear() === domain[0].getFullYear() ? '#E6F0FF' : '#FFEBF5' )
                 .style('opacity', (d, i) => i % 2 === 0 ? 0.55 : 1.0 );

    /*chart.dispatch.on('changeState.fix_axes', function (e) {
      node.select('.nv-y.nv-axis .nvd3.nv-wrap.nv-axis .tick:nth-of-type(1) line')
        .attr('y1', 0.5)
        .attr('y2', 0.5);
    node.select('.nv-y.nv-axis .nvd3.nv-wrap.nv-axis .tick:nth-last-of-type(1) line')
        .attr('y1', -0.5)
        .attr('y2', -0.5);
    });*/
    console.log(chart);
    if(relative)
      nv.utils.windowResize( () => chart.update() );
    return chart;
  };
}