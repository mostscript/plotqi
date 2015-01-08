/*jshint esnext:true, eqnull:true */
/*globals require */
var moment = require('moment');
var nv = require('imports?d3=d3!exports?window.nv!nvd3');
import {styleSheet, debounce, d3textWrap, colorIsDark} from './utils';

export function timeLineChart(mschart, node) { return function() {
  var relative = (mschart.width_units == '%');
  var margins = mschart.margins;

  var interval = ({
    'weekly': 'week', 'monthly': 'month', 'yearly': 'year', 'quarterly': 'month'
  })[mschart.frequency] || 'month';
  var timeStep = (mschart.frequency === 'quarterly') ? 3 : 1;
  var time = d3.time[interval];
  var timeOffset = (date, n) => time.offset(date, n * timeStep);
  var timeRange = (start, stop) => time.range(start, stop, timeStep);

  var domain = [ timeOffset(mschart.domain[0], -1), timeOffset(mschart.domain[1], +1) ];
  var tickVals = timeRange(domain[0], timeOffset(domain[1], +1) ).map( date => date.valueOf() );

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

  var chart = nv.models.lineChart()
                .id(mschart.uid)
                .showLegend(false)
                .useInteractiveGuideline(false)
                .tooltips(false)
                .interactive(false)
                .margin(margins)
                .transitionDuration(500);
  chart.lines.scatter.onlyCircles(false).useVoronoi(false);

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
       .xDomain(domain.map( x => x.valueOf() ))
       .yDomain(mschart.range);
  if(!tabular && mschart.x_label)
    chart.xAxis.axisLabel(mschart.x_label)
  if(mschart.y_label)
    chart.yAxis.axisLabel(mschart.y_label)
               .axisLabelDistance(48);

  node.datum(data).call(chart);

  var yscale = chart.yScale();
  var xscale = chart.xScale();

  //Manually insert the layer for the Goal Line before the graph layer in the DOM (Since SVG has no z-order)
  node.select('.nv-wrap.nv-lineChart > g')
      .insert('g', '.nv-linesWrap')
      .attr('class', 'nvd3 nv-distribution');

  //Dashed lines for all gaps in the data labeled as dashed. Also, apply line thickness
  node.selectAll('.nv-wrap.nv-line > g > g.nv-groups .nv-group')
      .style('stroke-dasharray', d => d.dashed ? '5 5' : 'none' )
      .style('stroke-width', d => d.thickness );
  node.selectAll('.nv-linesWrap .nv-wrap.nv-line g.nv-scatterWrap .nv-wrap.nv-scatter .nv-groups g.nv-group')
      .style('stroke-width', d => d.markerThickness );

  //Add axis ticks for the y-axis
  node.selectAll('.nv-y.nv-axis .nvd3.nv-wrap.nv-axis g.tick:not(:nth-of-type(1)):not(:nth-last-of-type(1))')
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

  //Click events
  node.selectAll('.nv-wrap.nv-line .nv-scatterWrap .nv-wrap.nv-scatter .nv-groups path.nv-point')
      .on('click', onPtClick)
      .on('mouseenter', onPtMouseOver)
      .on('mouseleave', onPtMouseOut);

  render();
  console.log(chart);
  if(relative) nv.utils.windowResize(debounce(render, 250, false));
  return chart;

  function render() {
    chart.update();

    var xMax = xscale(domain[1].valueOf());
    var yMax = yscale(mschart.range[1]);
    var yMin = yscale(mschart.range[0]);
    var yRange = yMin - yMax;
    var chartHeight = node.node().getBoundingClientRect().height;

    //Legend
    if(tabular) tabularLegend();
    else rightHandLegend();

    node.selectAll('.nv-scatterWrap .nv-wrap.nv-scatter .nv-groups g.nv-group').filter( d => d.dashed )
        .remove();

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

      var ycurr = 0;
      var intervalX = Math.floor(xscale(tickVals[1]) - xscale(tickVals[0]));
      legend.each(function (d, i) {
        var el = d3.select(this);

        if(i === 0) {

          el.selectAll('rect').data(['bg']).enter()
            .append('rect')
            .attr('class', 'nv-leg-header-bg');
          var labels = [];
          for(var lbl in mschart.labels) {
            if(mschart.labels.hasOwnProperty(lbl)) labels.push(
              {
                label: mschart.labels[lbl],
                x: moment(lbl, 'YYYY-MM-DD').valueOf()
              });
          }
          var cells = el.selectAll('.nv-leg-cell').data(labels);
          var cellsEnter = cells.enter().append('text')
                                        .attr('class', 'nv-leg-cell')
                                        .attr('y', '1em')
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
               .attr('transform', d => `translate(${(margins.left - legLeftPadding + xscale(d.x))}, 0)` )
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
            .style('fill', d.color);
          var $d;
          var data = d.data;
          var cells = el.selectAll('.nv-leg-cell').data([d.title].concat(tickVals));
          var cellsEnter = cells.enter().append('text')
                                        .attr('class', 'nv-leg-cell')
                                        .attr('y', '1em')
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
              .attr('y', `${((numberOfLines / 2) + .5)}em`)
          }

          cells.transition().duration(500)
               .attr('x', (d, i) => i === 0 ? legLeftPadding : margins.left - legLeftPadding + xscale(d) )
               .attr('textLength', (d,i) => i === 0 ? null : (d3.select(this).text().length <= 3 || intervalX > 35) ? null :
               (d3.select(this).text().length <= 4 && intervalX > 30) ? null : intervalX - (intervalX >= 20 ? 8 : 5));
          el.attr('transform', `translate(0, ${ycurr})`)
          el.select('rect').transition().duration(500)
                           .attr('height', this.getBoundingClientRect().height)
                           .attr('width', xMax + (margins.left - legLeftPadding));
        }

        ycurr += this.getBoundingClientRect().height + 4;
        //el.on('click', (d, i, j) => console.log(`${i} ${j}Legend Clicked`, d) );
      });

      if(firstRun) {
        var legHeight = legWrap.node().getBoundingClientRect().height + 20;
        margins.bottom = Math.floor(legHeight);
        chart.margin(margins).update();
        yscale = chart.yScale();
        yMin = yscale(mschart.range[0]);
        yMax = yscale(mschart.range[1]);
        yRange = yMin - yMax;
      }
      legWrap.selectAll('.nv-leg-row').filter( (d, i) => i > 0 ).selectAll('text').filter( (d, i) => i > 0 )
             .on('click', showLegendPopup)

      legWrap.transition().duration(500)
             .attr('transform', `translate(${legLeftPadding}, ${(yMin + margins.top + legPadding)})`);
    }

  }

  function calcDataPosition(d) {
    var n;
    var seriesIndex = d.seriesIndex;
    var seriesData = mschart.series[seriesIndex].data.values().sort( (a, b) => a.key - b.key );
    for(var i in seriesData) {
      if(d.x === seriesData[i].key.valueOf()) n = i;
    }
    var pt = seriesData[n];
    seriesData = mschart.series[seriesIndex];
    return [seriesData, pt];
  }

  function onPtClick(d) {
    showClickPopup.apply(null, calcDataPosition(d));
  }

  function showLegendPopup(d, i, j) {
    var parent = d3.select(this.parentElement);
    var series = parent.datum();
    var pt = series.data.get(new Date(d));
    showClickPopup(series, pt);
  }
  function showClickPopup(series, pt) {
    var format = d3.format(series.display_format);
    node.select('.nv-tooltip').remove();
    if(!pt) return;
    var el = node.append('g').attr('class', 'nv-tooltip')
                 .attr('transform', `translate(${(xscale(pt.key.valueOf()) + margins.left - 150)}, ` +
                  `${(yscale(pt.value) + margins.top)})`);
    el.append('rect').attr('width', 150).attr('x', -5);
    var lineCt = d3textWrap(el.append('text')
                              .attr('class', 'nv-header')
                              .attr('y', '1.25em')
                              .attr('x', 72.5)
                              .style('text-anchor', 'middle')
                              .text(series.title)
      , 140, 72.5, null, true)[0];
  lineCt += 2;
  lineCt += d3textWrap(el.append('text')
                         .attr('y', `${lineCt}em`)
                         .attr('x', 72.5)
                         .style('text-anchor', 'middle')
                         .text(pt.note)
    , 140, 72.5, null, true)[0] * 1.2;
  lineCt += .25;
  el.append('text')
    .attr('y', `${lineCt}em`)
    .attr('x', 72.5)
    .style('text-anchor', 'middle')
    .text(`${format(pt.value / 100)} (${pt.title})`)
    .classed('svg-link', !!pt.uri)
    .on('click', pt.uri ? () => window.open(pt.uri) : undefined);
  var height = el.node().getBoundingClientRect().height + 5;
  el.select('rect').attr('height', height);
  el.append('circle')
    .attr('cx', 150)
    .attr('r', 8)
    .on('click', () => (el.remove(), d3.event.stopPropagation()));
  el.append('path')
    .attr('d', 'M 150 0 m -4 -4 l 8 8 M 150 0 m -4 4 l 8 -8');
  }

  function onPtMouseOver(d) {
    var series = mschart.series[d.seriesIndex];
    var format = d3.format(series.display_format);
    node.selectAll('.nv-hover').remove();
    var el = node.append('g').attr('class', 'nv-hover')
                 .attr('transform', `translate(${(xscale(d.x) + margins.left)}, ` +
                  `${(yscale(d.y) + margins.top)})`);
    el.append('rect');
    el.append('text').attr('x', -5).text(format(d.y / 100));
    var width = el.node().getBoundingClientRect().width;
    el.select('rect').attr('y', '-1em').attr('height', '1.5em').attr('x', -width - 5).attr('width', width + 5);
  }

  function onPtMouseOut() {
    node.selectAll('.nv-hover').remove();
  }

  function extractData(mschart) {
    var data = [];
    var keys = timeRange(mschart.domain[0], timeOffset(mschart.domain[1], +2));
    mschart.series.map(function (series, index) {
      var obj = {
        key: series.title,
        color: series.color,
        values: [],
        format: d3.format(series.display_format),
        incomplete: series.break_lines,
        thickness: series.line_width,
        markerThickness: series.marker_width
      };

      keys.forEach(function (key) {
        var datapoint = series.data.get(key);
        if(series.data.has(key)) obj.values.push({
          x: moment(datapoint.key).valueOf(),
          y: datapoint.value,
          size: series.marker_size,
          shape: series.marker_style,
          note: datapoint.note,
          title: datapoint.title,
          uri: datapoint.uri,
          seriesIndex: index
        });
        else obj.values.push({
          x: new Date(key).valueOf(),
          missing: true
        });
      });

      return obj;

    }).forEach(function (series, i) {
      var poly_set = [];
      var poly_line, prev_pt = {missing: true};
      var hidden = series.incomplete === 'hidden';
      var solid = series.incomplete === 'solid';
      series.values.forEach(function (pt, i) {
        if(!pt.missing) {
          if(!poly_line) poly_line = [], prev_pt = pt;
          if(!prev_pt.missing) poly_line.push(pt);

          else {
            poly_line.push(pt);
            if(!solid) {
              poly_set.push(poly_line);
              poly_line = [ pt ];
            }
          }
          if(i === (series.values.length)) poly_set.push(poly_line);
        } else {
           if( !(prev_pt.missing || solid) ) {
            poly_set.push(poly_line);
            poly_line = [ prev_pt ];
          }
        }
        prev_pt = pt;
      });

      if(solid) poly_set = [ poly_line ];

      data = data.concat( poly_set.map( function (poly_line, i) {
        if(!hidden) return {
          key: `${series.key}::${i}`,
          color: series.color,
          values: poly_line,
          format: series.format,
          thickness: series.thickness,
          markerThickness: series.markerThickness,
          dashed: i % 2 === 1
        }; else if(i % 2 === 0) return {
          key: `${series.key}::${i}`,
          color: series.color,
          values: poly_line,
          format: series.format,
          thickness: series.thickness,
          markerThickness: series.markerThickness,
          dashed: false
        };

      }) );
    });

    return data;
  }
} }