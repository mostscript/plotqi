/*jshint esnext:true, eqnull:true */
/*globals require */
var moment = require('moment');
var d3 = require('d3');
var nv = require('imports?d3=d3!exports?window.nv!nvd3');
import {shapePath, shapes, legendMarkers} from './shapes';

export function SmallMultiplesChart(mschart, node, size) {
  node = node || d3.select('body').append('div').attr('id', 'small-chart-div-' + (mschart.uid || Math.floor(Math.random() * 1000)));
  node.classed('chart-div', true);
  size = size || [160, 160]
  var width = size[0] || 160;
  var height = size[1] || 160;
  node.style('width', width + 'px')
      .style('height', height + 'px');
  node = node.append('svg')
             .attr('class', 'upiq-small-chart chart-svg');
  var margins = {top: 10, bottom: 50, left: 25, right: 30};
  var data = extractData(mschart);
  var domain = croppedDomain(mschart);
  var tick_domain = domain.slice();
  tick_domain[1] = d3.time.month.offset(domain[1], 1);
  var tickVals = d3.time.months(...tick_domain).map( month => month.valueOf() );

  return function () {
    node.append('g')
    .attr('class', 'nv-background')
    .attr('transform', 'translate(' + margins.left + ',' + margins.top + ')');

    var chart = nv.models.lineChart()
                  .id('small-' + mschart.uid)
                  .showLegend(false)
                  .useInteractiveGuideline(false)
                  .interactive(false)
                  .tooltips(false)
                  .margin(margins)
                  .transitionDuration(500)
                  .tooltipContent(function(seriesName, x, y, graph) {
                    return '<h3>' + seriesName.slice(0, seriesName.lastIndexOf('::')) + '</h3>' + '<p>' + graph.point.note + '</p>'
                    + '<p class=\'footer\'>' + graph.point.title + ', ' + graph.series.format(y / 100) + '</p>';
                  })
                  chart.lines.scatter.onlyCircles(false).useVoronoi(false);

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
        .attr('visibility', 'hidden')
        .remove();

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

    //Graph Title
    node.append('g')
        .attr('class', 'nvd3 nv-small-chart nv-chart-title')
        .append('text')
        .attr('class', 'nv-small-chart nv-title')
        .attr('x', 5)
        .attr('y', height - 2)
        .text(mschart.title);

    //Legend
    var legend = node.append('g')
                     .attr('class', 'nvd3 nv-legend')
                     .attr('transform', 'translate(' + 5 + ',' + (height - 30) + ')')
                     .append('g')
                     .attr('class', 'nv-leg')
                     .selectAll('circle.legend-pt.nv-point')
                     .data(mschart.series.slice(0, 2))
                     .enter().append('g');
    legend.append('path')
          .attr('class', 'nv-legendpt nv-point')
          .attr('transform', (d, i) => 'translate(5.5,' + (i * 11) + ')')
          .style('stroke', d => d.color )
          .style('stroke-opacity', 1)
          .style('fill', d => d.color )
          .style('fill-opacity', 0.5)
          .call(legendMarkers, 8);
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
                     .attr('class', 'nv-dist nv-goal')
                     .attr('transform',
                      'translate(0,' + Math.floor(yscale(mschart.goal)) + ')')
                     .style('color', mschart.goal_color);
      goal.append('line')
          .attr('class', 'nv-goal-line')
          .attr('x2', xscale(domain[1].valueOf()));
      goal.append('text')
          .attr('class', 'nv-goal-lbl')
          .attr('text-anchor', 'start')
          .attr('x', xscale(domain[1].valueOf()) + 2)
          .attr('y', 2)
          .attr('textLength', margins.right - 2)
          .attr('lengthAdjust', 'spacing')
          .text(mschart.goal + ' (G)');
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
                 .selectAll("rect.nv-zebra")
                 .data(tickVals)
                 .enter().append('rect')
                 .attr('y', 0)
                 .attr('x', d => xscale(d))
                 .attr('height', yscale(mschart.range[0]))
                 .attr('width', tickDiff)
                 .attr('visibility', (d, i) => i !== (tickVals.length - 1) ? 'visible' : 'hidden' )
                 .style('fill', d => new Date(d).getFullYear() === domain[0].getFullYear() ? '#E6F0FF' : '#FFEBF5' )
                 .style('opacity', (d, i) => i % 2 === 0 ? 0.60 : 1.0 );

    /*chart.dispatch.on('changeState.fix_axes', function (e) {
      node.select('.nv-y.nv-axis .nvd3.nv-wrap.nv-axis .tick:nth-of-type(1) line')
        .attr('y1', 0.5)
        .attr('y2', 0.5);
    node.select('.nv-y.nv-axis .nvd3.nv-wrap.nv-axis .tick:nth-last-of-type(1) line')
        .attr('y1', -0.5)
        .attr('y2', -0.5);
    });*/
    return chart;
  };
}

export function croppedDomain(mschart) { //crop data to last 12 (actually, 13) months of data
  var domain = mschart.domain;
  if( moment(domain[1]).diff(moment(domain[0]), 'months') > 12) {
    domain[0] = d3.time.month.offset(domain[1], -12)
  }
  return domain;
}

function preprocessData(mschart) {
  var data = [];
  var domain = croppedDomain(mschart);
  domain[1] = d3.time.month.offset(domain[1], 2);
  var keys = d3.time.month.range(...domain);
  var chart_series = mschart.series;
  if(chart_series.length > 2) chart_series = chart_series.slice(-2);
  chart_series.forEach(function (series, index) {
    var obj = {
      key: series.title,
      color: series.color,
      values: [],
      format: d3.format(series.display_format),
      incomplete: series.break_lines
    };

    keys.forEach(function (key) {
      var datapoint = series.data.get(key);
      if(series.data.has(key))
        obj.values.push({
          x: moment(datapoint.key).valueOf(),
          y: datapoint.value,
          size: series.marker_size,
          shape: series.marker_style,
          note: datapoint.note,
          title: datapoint.title
          });
      else
        obj.values.push({
          x: moment(new Date(key)).valueOf(),
          missing: true
        });
    });
    data.push(obj);
  });
  return data;
}

function extractData(mschart) {
  var data = [];
  var oldData = preprocessData(mschart);
  oldData.forEach(function (series, i) {
    var poly_set = [];
    var poly_line, prev_pt = {missing: true};
    var hidden = series.incomplete === 'hidden';
    var solid = series.incomplete === 'solid';
    series.values.forEach(function (pt, i) {
      if(!pt.missing) {
        if(!poly_line) {
          poly_line = [];
          prev_pt = pt;
        }
         if(!prev_pt.missing) {
          poly_line.push(pt);
        } else {
          poly_line.push(pt);
          if(!solid) {
            poly_set.push(poly_line);
            poly_line = [ pt ];
          }
        }
        if(i === (series.values.length)) {
          poly_set.push(poly_line);
        }
      }
      if(pt.missing) {
         if(!prev_pt.missing && !solid) {
          poly_set.push(poly_line);
          poly_line = [ prev_pt ];
        }
      }
      prev_pt = pt;
    });
    if(solid)
      poly_set = [ poly_line ];
    poly_set.forEach(function (poly_line, i) {
      if(!hidden)
        data.push({
          key: series.key + '::' + i,
          color: series.color,
          values: poly_line,
          format: series.format,
          dashed: i % 2 === 1
        });
      else if(i % 2 === 0)
          data.push({
          key: series.key + '::' + i,
          color: series.color,
          values: poly_line,
          format: series.format,
          dashed: false
        });
    });
  });
  return data;
}