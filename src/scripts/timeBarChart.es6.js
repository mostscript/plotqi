/*jshint esnext:true, eqnull:true */
/*globals require */
var moment = require('moment');
var nv = require('imports?d3=d3!exports?window.nv!nvd3');
import {styleSheet, debounce, d3textWrap, colorIsDark} from './utils';

export function timeBarChart(mschart, node) { return function() {
  var relative = (mschart.width_units == '%');
  var margins = mschart.margins;

  var interval = ({
    'weekly': 'week', 'monthly': 'month', 'yearly': 'year', 'quarterly': 'month'
  })[mschart.frequency] || 'month';
  var timeStep = (mschart.frequency === 'quarterly') ? 3 : 1;
  var time = d3.time[interval];
  var timeOffset = (date, n) => time.offset(date, n * timeStep);
  var timeRange = (start, stop) => time.range(start, stop, timeStep);

  var domain = mschart.domain;
  var tickVals = timeRange(domain[0], timeOffset(domain[1], +1))
    .map( date => date.valueOf() );

  var yTickVals = function (n) {
    var out = [];
    var range = mschart.range;
    var interval = (range[1] - range[0]) / n;
    for(var i = range[0]; i <= range[1]; i += interval) {
      out.push(i);
    }
    return out;
  };
  var yformat = ( y => (typeof y === 'number') ? d3.format(',.1f')(y) : 'N/A' );

  var data = extractData(mschart);

  var tabular = mschart.legend_placement === 'tabular';
  if(tabular) {
    margins.left = 120;
    margins.bottom = 100;
  } else {
    margins.right = mschart.series.length > 1 ? 120 : 10;
  }

  var chart = nv.models.multiBarChart()
                .id(mschart.uid)
                .showLegend(false)
                .showControls(false)
                .tooltips(false)
                .margin(margins)
                //.transitionDuration(500);
  console.log(chart);

  chart.xAxis
       .tickFormat( tabular ? () => '' : d => mschart.labels[moment(d).format('YYYY-MM-DD')] || '' )
       .tickValues(tickVals)
       .showMaxMin(false)
       .tickPadding(6)
       .rotateLabels(-45);
  chart.yAxis
       .tickFormat( d3.format(',') )
       .tickValues( yTickVals(5) )
       .showMaxMin(false)
       .tickPadding(6);
  chart
       .xDomain(tickVals)
       .yDomain(mschart.range);
  if(!tabular && mschart.x_label)
    chart.xAxis.axisLabel(mschart.x_label)
  if(mschart.y_label)
    chart.yAxis.axisLabel(mschart.y_label)
               .axisLabelDistance(48);

  node.datum(data).transition().duration(500).call(chart);

  var yscale = chart.multibar.yScale();
  var xscale = chart.multibar.xScale();

  //Manually insert the layer for the Goal Line before the graph layer in the DOM (Since SVG has no z-order)
  node.select('.nv-wrap.nv-multiBarWithLegend > g')
      .insert('g', '.nv-barsWrap')
      .attr('class', 'nvd3 nv-distribution');

  //Add axis ticks for the y-axis
  node.selectAll('.nv-y.nv-axis .nv-wrap.nv-axis g.tick:not(:nth-of-type(1)):not(:nth-last-of-type(1))')
    .append('line')
    .attr('y2', 0)
    .attr('x2', 4)
    .style('stroke', 'dimgray');

  //Graph Title
  if(mschart.title) {
    node.outerNode.insert('h4', 'div.chart-div')
              .attr('class', 'chart-title')
              .text(mschart.title);
              if(mschart.description) {
                node.outerNode.insert('p', 'div.chart-div')
                          .attr('class', 'chart-desc')
                          .text(mschart.description);
              }
  }

  render();
  console.log(chart);
  if(relative) nv.utils.windowResize(debounce(render, 250, false));
  return chart;

  function render() {
    chart.update();
    var domain = [ chart.xDomain()[0], chart.xDomain()[chart.xDomain().length - 1] ];
    var xInterval = xscale(chart.xDomain()[1]) - xscale(chart.xDomain()[0]);
    var xMax = xscale(domain[1]) + xInterval;
    var yMax = yscale(mschart.range[1]);
    var yMin = yscale(mschart.range[0]);
    var yRange = yMin - yMax;
    var chartHeight = node.node().getBoundingClientRect().height;
    var xTicks = tickVals.concat(domain);

    //Legend
    if(tabular) tabularLegend();
    else rightHandLegend();

    //Goal Line
    if(mschart.goal) {
      var goal = node.select('g.nv-distribution').selectAll('g.nv-dist.nv-goal').data([mschart.goal]);
      var goalEnter = goal.enter().append('g')
                          .attr('class', 'nv-dist nv-goal')
                          .style('color', mschart.goal_color);
      goalEnter.append('line')
               .attr('class', 'nv-goal-line');
      goalEnter.append('text')
               .attr('class', 'nv-goal-lbl')
               .text(`Goal: ${mschart.goal}`)
               .attr('text-anchor', 'start')
               .attr('x', 3)
               .attr('y', -5);

      goal.transition().duration(500).attr('transform', `translate(0, ${(Math.floor(yscale(mschart.goal)) + 0.5)})`);
      goal.select('line').transition().duration(500).attr('x2', xMax);
    }

    //Fix hidden ticks
    node.selectAll('.nv-x.nv-axis .nv-wrap.nv-axis g.tick > *')
        .style('opacity', 1);


    function rightHandLegend() {
      if(mschart.series.length > 1) {
        var firstRun = false;
        var legPadding = 5, legWidth = margins.right - (2 * legPadding), markerWidth = 10;
        var legWrap = node.selectAll('g.nv-legend').data([mschart.series]);
        var legWrapEnter = legWrap.enter().append('g')
                                   .attr('class', 'nvd3 nv-legend')
                                   .attr('transform', `translate(${(xMax + margins.left)}, ${margins.top})`)
                                .append('rect')
                                   .attr('class', 'nv-leg-bg');
        var firstRun = !legWrapEnter.empty();

        var legend = legWrap.selectAll('g.nv-leg-entry').data(mschart.series);
        var legEnter = legend.enter().append('g')
                                     .attr('class', 'nv-leg-entry');
        var dy = legPadding * 2;
        legEnter.each(function (d, i) {
          var el = d3.select(this);
          el.attr('transform', `translate(${(2 * legPadding)}, ${dy})`);
          el.append('text')
            .text(d.title)
            .attr('y', markerWidth)
            .attr('transform', `translate(${(legPadding + markerWidth)}, 0)`)
            .call(d3textWrap, legWidth - markerWidth - (2 * legPadding), 0);
          dy += this.getBoundingClientRect().height + 10;
          el.append('rect')
              .attr('x', 0)
              .attr('y', 0)
              .attr('width', 10)
              .attr('height', 10)
              .style('fill', (d, i) => d.color )
              .style('stroke', (d, i) => d.color )
              .style('fill-opacity', 0.5 );
        });
        var legHeight = legWrap.node().getBoundingClientRect().height + 15;
        if(firstRun) {
          legWrap.select('rect')
                 .attr('x', legPadding)
                 .attr('height', legHeight)
                 .attr('width', legWidth)
                 .attr('stroke', 'black')
                 .attr('stroke-opacity', 0.5)
                 .attr('stroke-width', 1)
                 .attr('fill-opacity', 0);
        }
        legWrap.transition().duration(500)
               .attr('transform', `translate(${(margins.left + xMax)}, ${(margins.top + (yRange / 2) - (legHeight / 2))})`);
      }
    }

    function tabularLegend() {
      var firstRun = false;
      var legPadding = 10;
      var legLeftPadding = 5;
      var legWrap = node.selectAll('g.nv-legend').data([mschart.series]);
      var legWrapEnter = legWrap.enter().append('g')
                                 .attr('class', 'nvd3 nv-legend')
                                 .attr('transform', `translate(${legLeftPadding}, ${(yMin + margins.top + legPadding)})`);
      var legend = legWrap.selectAll('g.nv-leg-row').data(['header'].concat(mschart.series));
      legend.enter().append('g')
                    .attr('class', 'nv-leg-row');

      var ycurr = legPadding + 3;
      var intervalX = Math.floor(xscale(tickVals[1]) - xscale(tickVals[0]));
      legend.each(function (d, i) {
        var el = d3.select(this);

        if(i === 0) {

          el.selectAll('rect').data(['bg']).enter()
            .append('rect')
            .attr('class', 'nv-leg-header-bg');
          var labels = [];
          for(var lbl in mschart.labels) {
            if(mschart.labels.hasOwnProperty(lbl)) {
              labels.push({label: mschart.labels[lbl], x: moment(lbl, 'YYYY-MM-DD')})
            }
          }
          var cells = el.selectAll('.nv-leg-cell').data(labels);
          var cellsEnter = cells.enter().append('text')
                                        .attr('class', 'nv-leg-cell')
                                        .attr('y', ycurr)
                                        .style('text-anchor', 'middle')
                                        .style('font-size', '12px')
                                        .text( d => d.label )
                                        .call(d3textWrap, 45, 0)
                                        .attr('textLength', intervalX)
                                        .attr('lengthAdjust', 'spacingAndGlyphs')
                                      .selectAll('tspan')
                                        .attr('textLength', intervalX)
                                        .attr('lengthAdjust', 'spacingAndGlyphs');

          cells.transition().duration(500)
               .attr('transform', d => `translate(${(margins.left - legLeftPadding + xscale(d.x) + (xInterval / 2))}, 0)` )
               .style('font-family', intervalX <= 25 ? 'silkscreennormal' : null)
               .style('font-size', intervalX <= 25 ? '6pt' : intervalX <= 35 ? '11px' : null)
               .attr('textLength', intervalX <= 50 ? intervalX : null)
            .selectAll('tspan')
               .attr('textLength', intervalX <= 30 ? intervalX : null);
          el.select('rect').transition().duration(500)
                           .attr('height', this.getBoundingClientRect().height)
                           .attr('width', xMax + (margins.left - legLeftPadding));
        } else {

          el.selectAll('rect').data(['bg']).enter()
            .append('rect')
            .attr('y', -12)
            .style('fill', d.color);
          var $d;
          var data = d.data;
          var cells = el.selectAll('.nv-leg-cell').data([d.title].concat(xTicks));
          var cellsEnter = cells.enter().append('text')
                                        .attr('class', 'nv-leg-cell')
                                        .style('text-anchor', (d, i) => i === 0 ? 'start' : 'middle')
                                        .classed(colorIsDark(d.color) ? 'light-text' : 'dark-text', true)
                                        .attr('lengthAdjust', (d,i) => i === 0 ? null : 'spacingAndGlyphs')
                                        .text( (d, i) => i === 0 ? d :
                                          i === 1 || i === tickVals.length ? null :
                                          ($d = data.get(new Date(d))) !== undefined ? yformat($d.value) : '--' );
          var numberOfLines = 0;
          cellsEnter.filter( (d,i) => i === 0)
                    .call(d3textWrap, margins.left, legLeftPadding)
                    .selectAll('tspan')
                    .each( () => numberOfLines++ );
          if(!cellsEnter.empty()) {
            firstRun = true;
            el.selectAll('.nv-leg-cell').filter( (d,i) => i !== 0 )
              .attr('y', `${((numberOfLines / 2) - .5)}em`)
          }

          cells.transition().duration(500)
               .attr('x', (d, i) => i === 0 ? legLeftPadding : margins.left - legLeftPadding + xscale(d) + (xInterval / 2) )
               .attr('textLength', (d,i) => i === 0 ? null : (d3.select(this).text().length <= 3 || intervalX > 35) ? null :
               (d3.select(this).text().length <= 4 && intervalX > 30) ? null : intervalX - (intervalX >= 20 ? 8 : 5));
          el.attr('transform', `translate(0, ${ycurr})`)
          el.select('rect').transition().duration(500)
                           .attr('height', this.getBoundingClientRect().height)
                           .attr('width', xMax + (margins.left - legLeftPadding));
        }

        ycurr += Math.floor(this.getBoundingClientRect().height) + 4;

      });

      if(firstRun) {
        var legHeight = legWrap.node().getBoundingClientRect().height + 20;
        margins.bottom = Math.floor(legHeight);
        chart.margin(margins).update();
        yscale = chart.multibar.yScale();
        yMin = yscale(mschart.range[0]);
        yMax = yscale(mschart.range[1]);
        yRange = yMin - yMax;
      }

      legWrap.transition().duration(500)
             .attr('transform', `translate(${legLeftPadding}, ${(yMin + margins.top + legPadding)})`);
    }

  }

  function extractData(mschart) {
    var keys = timeRange(mschart.domain[0], timeOffset(mschart.domain[1], +2));
    return mschart.series.map(function (series, index) {
      var obj = {
        key: series.title,
        color: series.color,
        values: [],
        format: d3.format(series.display_format)
      };

      keys.forEach(function (key) {
        var datapoint = series.data.get(key);
        if(series.data.has(key))
          obj.values.push({
            x: moment(datapoint.key).valueOf(),
            y: datapoint.value,
            note: datapoint.note,
            title: datapoint.title,
            });
        else
          obj.values.push({
            x: new Date(key).valueOf(),
            y: NaN,
            missing: true
          });
      });

      return obj;

    });
  }
} }