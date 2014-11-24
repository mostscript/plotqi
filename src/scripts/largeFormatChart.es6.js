/*jshint esnext:true, eqnull:true */
/*globals require */
var moment = require('moment');
var nv = require('imports?d3=d3!exports?window.nv!nvd3');
import {styleSheet, debounce, d3textWrap, colorIsDark} from './utils';

export function LargeChart(mschart, node) {
  node = node || d3.select('body').append('div').attr('id', 'chart-div-' + (mschart.uid || Math.floor(Math.random() * 1000)));
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
        `#${parentNode.attr('id')} .chart-div:after {` +
          'content: "";' +
          'display: block;' +
          `margin-top: ${(ratio * 100)}%;` +
        '}', styleSheet.cssRules.length
      );
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

  var margins = {top: 10, bottom: 75, left: 40, right: 10};
  var data = extractData(mschart);
  var domain = mschart.domain;
  domain = [d3.time.month.offset(domain[0], -1), d3.time.month.offset(domain[1], 1)];
  var tick_domain = domain.slice();
  tick_domain[1] = d3.time.month.offset(domain[1], 1);
  var tickVals = d3.time.months(...tick_domain).map( month => month.valueOf() );
  var yTickVals = function (n) {
    var out = [];
    var range = mschart.range;
    var interval = (range[1] - range[0]) / n;
    for(var i = range[0]; i <= range[1]; i += interval) {
      out.push(i);
    }
    return out;
  };
  var tabular = mschart.legend_placement === 'tabular';

  return function () {
    if(tabular) {
      margins.left = 125;
      margins.bottom = 150;
    } else {
      margins.right = 120;
    }
    var chart = nv.models.lineChart()
                  .id(mschart.uid)
                  .showLegend(false)
                  .useInteractiveGuideline(false)
                  .tooltips(false)
                  .interactive(false)
                  .margin(margins)
                  .transitionDuration(500)
                  .tooltipContent(function(seriesName, x, y, graph) {
                    return '<h3>' + seriesName.slice(0, seriesName.lastIndexOf('::')) + '</h3>' + '<p>' + graph.point.note + '</p>'
                    + '<p class=\'footer\'>' + graph.point.title + ', ' + graph.series.format(y / 100) + '</p>';
                  })
                  chart.lines.scatter.onlyCircles(false).useVoronoi(false);

    chart.xAxis
         .tickFormat( tabular ? () => '' : d => mschart.labels[moment(d).format('YYYY-MM-DD')] || '' )
          //d3.time.format('%B')(new Date(d)).slice(0,3) + " " + d3.time.format('%Y')(new Date(d)) :
         .tickValues(tickVals)
         .showMaxMin(false)
         .tickPadding(6)
         .rotateLabels(-45);
    chart.yAxis
         .tickFormat(d3.format(','))
         .tickValues(yTickVals(5))
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

    node.select('.nv-wrap.nv-lineChart > g')
        .insert('g', '.nv-linesWrap')
        .attr('class', 'nvd3 nv-distribution');

    //Dashed lines for all missing areas
    node.selectAll('.nv-wrap.nv-line > g > g.nv-groups .nv-group')
        .style('stroke-dasharray', d => d.dashed ? '5 5' : 'none' )
        .style('stroke-width', d => d.thickness );
    node.selectAll('.nv-linesWrap .nv-wrap.nv-line g.nv-scatterWrap .nv-wrap.nv-scatter .nv-groups g.nv-group')
        .style('stroke-width', d => d.markerThickness );

    //Fix Axis Ticks
    node.selectAll('.nv-y.nv-axis .nvd3.nv-wrap.nv-axis g.tick:not(:nth-of-type(1)):not(:nth-last-of-type(1))')
      .append('line')
      .attr('y2', 0)
      .attr('x2', 4)
      .style('stroke', 'dimgray');

    //Graph Title
    if(mschart.title) {
      parentNode.insert('h4', 'div.chart-div')
                .attr('class', 'chart-title')
                .text(mschart.title);
                if(mschart.description) {
                  parentNode.insert('p', 'div.chart-div')
                            .attr('class', 'chart-desc')
                            .text(mschart.description);
                }
    }

    render();
    console.log(chart);
    if(relative)
      nv.utils.windowResize(debounce(render, 250, false));
    return chart;

    function render() {
      function rightHandLegend() {
        //Legend
        if(mschart.series.length > 1) {
          var legPadding = 5, legWidth = margins.right - (2 * legPadding), markerWidth = 10;;
          var legWrap = node.selectAll('g.nv-legend').data([mschart.series]);
          var legWrapEnter = legWrap.enter().append('g')
                                     .attr('class', 'nvd3 nv-legend')
                                     .attr('transform', 'translate(' + (xMax + margins.left) + ',' + margins.top + ')');

          var legend = legWrap.selectAll('g.nv-leg-entry').data(mschart.series);
          var legEnter = legend.enter().append('g')
                                       .attr('class', 'nv-leg-entry');
          var dy = legPadding * 2;
          legEnter.each(function (d, i) {
            var el = d3.select(this);
            el.attr('transform', 'translate(' + (2 * legPadding) +  ',' + dy + ')');
            el.append('text')
              .text(d.title)
              .attr('y', markerWidth)
              .attr('transform', 'translate(' + (legPadding + markerWidth) + ',0)')
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

          legWrapEnter.append('rect')
                      .attr('x', legPadding)
                      .attr('height', legHeight)
                      .attr('width', legWidth)
                      .attr('stroke', 'black')
                      .attr('stroke-opacity', 0.5)
                      .attr('stroke-width', 1)
                      .attr('fill-opacity', 0);
          legWrap.transition().duration(500).attr('transform', 'translate(' + (margins.left + xMax) + ',' + (margins.top + (yRange / 2) - (legHeight / 2)) + ')');
        }
      }

      function tabularLegend() {
        var yformat = d3.format(',.1f');
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
                                          .text( d => d.label )//;
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
              .attr('y', -12)
              .style('fill', d.color);
            var cells = el.selectAll('.nv-leg-cell').data([d.title].concat(d.data.values()));
            var cellsEnter = cells.enter().append('text')
                                          .attr('class', 'nv-leg-cell')
                                          .style('text-anchor', (d, i) => i === 0 ? 'start' : 'middle')
                                          .classed(colorIsDark(d.color) ? 'light-text' : 'dark-text', true)
                                          .attr('lengthAdjust', (d,i) => i === 0 ? null : 'spacingAndGlyphs')
                                          .text( (d, i) => i === 0 ? d : yformat(d.value) );
            var numberOfLines = 0;
            cellsEnter.filter( (d,i) => i === 0 )
                      .call(d3textWrap, margins.left, legLeftPadding)
                      .selectAll('tspan')
                      .each( () => numberOfLines++ );
            if(!cellsEnter.empty()) {
              el.select('rect')
                .attr('height', 16 * numberOfLines);
              el.selectAll('.nv-leg-cell').filter( (d,i) => i !== 0 )
                .attr('y', ((16 * numberOfLines) / 2) - 8)
            }

            cells.transition().duration(500)
                 .attr('x', (d, i) => i === 0 ? legLeftPadding : margins.left - legLeftPadding + xscale(d.key.valueOf()) )
                 .attr('textLength', (d,i) => i === 0 ? null : (yformat(d.value).length <= 3 || intervalX > 35) ? null :
                 (yformat(d.value).length <= 4 && intervalX > 30) ? null : intervalX - (intervalX >= 20 ? 8 : 5));
            el.attr('transform', `translate(0, ${ycurr})`)
            el.select('rect').transition().duration(500)
                             .attr('width', xMax + (margins.left - legLeftPadding));
          }

          ycurr += this.getBoundingClientRect().height;
        });

        var legHeight = legWrap.node().getBoundingClientRect().height + 10;
        margins.bottom = legHeight;
        chart.margin(margins).update();
        var yMin = yscale(mschart.range[0]);
        legWrap.transition().duration(500).attr('transform', `translate(${legLeftPadding}, ${(yMin + margins.top + legPadding)})`);
      }


      chart.update();
      node.selectAll('.nv-linesWrap .nv-wrap.nv-line g.nv-scatterWrap .nv-wrap.nv-scatter .nv-groups g.nv-group').filter( d => d.dashed )
          .remove();

      var yscale = chart.yScale();
      var xscale = chart.xScale();
      var xMax = xscale(domain[1].valueOf());
      var yMax = yscale(mschart.range[1]);
      var yMin = yscale(mschart.range[0]);
      var yRange = yMin - yMax;
      var chartHeight = node.node().getBoundingClientRect().height;

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
                 .text('Goal: ' + mschart.goal)
                 .attr('text-anchor', 'start')
                 .attr('x', 3)
                 .attr('y', -5);

        goal.transition().duration(500).attr('transform', 'translate(0,' + (Math.floor(yscale(mschart.goal)) + 0.5) + ')');
        goal.select('line').transition().duration(500).attr('x2', xMax);
      }

      //Legend
      if(tabular)
        tabularLegend();
      else
        rightHandLegend();
    }
  };
}

function preprocessData(mschart) {
  var data = [];
  var domain = mschart.domain;
  domain[1] = d3.time.month.offset(domain[1], 2);
  var keys = d3.time.month.range(...domain);
  mschart.series.forEach(function (series, index) {
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
      if(series.data.has(key))
        obj.values.push({
          x: moment(datapoint.key).valueOf(),
          y: datapoint.value,
          size: series.marker_size,
          shape: series.marker_style,
          note: datapoint.note,
          title: datapoint.title,
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
          thickness: series.thickness,
          markerThickness: series.markerThickness,
          dashed: i % 2 === 1
        });
      else if(i % 2 === 0)
          data.push({
          key: series.key + '::' + i,
          color: series.color,
          values: poly_line,
          format: series.format,
          thickness: series.thickness,
          markerThickness: series.markerThickness,
          dashed: false
        });
    });
  });
  return data;
}