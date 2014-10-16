require: "./Symbol.js";
var privateSym = new Symbol();
import {
  DataPoint,
  TimeDataPoint,
  DataSeries,
  TimeDataSeries,
  MultiSeriesChart,
  TimeSeriesChartSchema
} from "./chartviz.es6.js";
var moment = require("moment");
var d3 = require("d3");
var nv = require("imports?d3=d3!exports?window.nv!nvd3");

export function SmallMultiplesChart(mschart, node, size) {
  node = node || d3.select('body').append('div').attr('id', 'small-chart-div-' + (mschart.uid || Math.floor(Math.random() * 1000)));
  size = size || [160, 160]
  var width = size[0] || 160;
  var height = size[1] || 160;
  node.style('width', width + "px")
      .style('height', height + "px");
  node = node.append("svg");
  var margins = {top: 10, bottom: 60, left: 30, right: 30};
  var data = calculateMissingValues(mschart);

  return function () {
    var chart = nv.models.lineChart()
                  .id(mschart.uid)
                  .showLegend(false)
                  .margin(margins)
                  .transitionDuration(500)
                  .tooltipContent(function(seriesName, x, y, graph) {
                    return "<h3>" + seriesName + "</h3>" + "<p>" + graph.point.note + "</p>"
                    + "<p class=\"footer\">" + graph.point.title + ", " + graph.series.format(y / 100) + "</p>";
                  })
                  ;
                  chart.lines.scatter.onlyCircles(false);
    chart.xAxis
         .tickFormat( d => d3.time.format("%B")(new Date(d))[0] )
         .tickValues(d3.time.months(...mschart.domain).map( month => month.valueOf() ));
    chart.yAxis
         .tickFormat(d3.format(","));
    chart
         .xDomain(mschart.domain.map( x => x.valueOf() ))
         .yDomain(mschart.range);

    node.datum(data).call(chart);

    var yscale = chart.yScale();
    var xscale = chart.xScale();

    //Dashed lines for all missing areas
    node.selectAll(".nv-wrap.nv-line > g > g.nv-groups .nv-group").filter( d => d.dashed )
        .style("stroke-dasharray", "5 5");

    //Fix Axis Ticks
    node.selectAll(".nv-y.nv-axis .nvd3.nv-wrap.nv-axis g.tick:not(:nth-of-type(1)):not(:nth-last-of-type(1))")
      .append("line")
      .attr('y2', 0)
      .attr('x2', 4)
      .style("stroke", "dimgray");

    //Fix for Firefox - 2px lines must be shifted by .5px to align to pixel boundaries
    node.select(".nv-y.nv-axis .nvd3.nv-wrap.nv-axis .tick:nth-of-type(1) line")
        .attr("y1", 0.5)
        .attr("y2", 0.5);
    node.select(".nv-y.nv-axis .nvd3.nv-wrap.nv-axis .tick:nth-last-of-type(1) line")
        .attr("y1", -0.5)
        .attr("y2", -0.5);

    //Graph Title
    node.append("g")
        .attr('class', 'nvd3 nv-small-chart nv-chart-title')
        .append("text")
        .attr("class", "nv-small-chart nv-title")
        .attr("x", 5)
        .attr("y", height - 2)
        .text(mschart.title);

    var legend = node.append('g')
                     .attr('class', 'nvd3 nv-legend')
                     .attr('transform', 'translate(' + 5 + ',' + (height - 30) + ')')
                     .append('g')
                     .attr('class', 'nv-leg')
                     .selectAll('circle.legend-pt.nv-point')
                     .data(mschart.series)
                     .enter().append('g');

    //Graph Legend
    legend.append('circle')
          .attr('class', 'nv-legendpt nv-point')
          .attr('cx', 5 )
          .attr('cy', (d, i) => i * 12 )
          .attr('r', 4)
          .style("stroke", d => d.color )
          .style('stroke-opacity', 1)
          .style("fill", d => d.color )
          .style('fill-opacity', 0.5);
    legend.append("text")
          .attr("class", "nv-goal-lbl")
          .attr("text-anchor", "left")
          .attr('x', 15)
          .attr("y", (d, i) => (i * 12) + 3 )
          .attr('dy', "0.1em")
          .text( d => d.title );

    //Goal Line
    if(mschart.goal) {
      var goal = node.append('g')
                     .attr('class', 'nvd3 nv-distribution')
                     .attr('transform', 'translate(' + margins.left + ',' + margins.top + ')')
                     .selectAll("line.nv-goal")
                     .data([mschart.goal])
                     .enter().append('g')
                     .attr('class', 'nv-dist nv-goal');
      goal.append('line')
          .attr('class', 'nv-goal-line')
          .attr('x1', xscale(mschart.domain[0].valueOf()))
          .attr('x2', xscale(mschart.domain[1].valueOf()))
          .attr('y1', Math.floor(yscale(mschart.goal)) )
          .attr('y2', Math.floor(yscale(mschart.goal)) )
          .style('stroke', mschart.goal_color);
      goal.append("text")
          .attr("class", "nv-goal-lbl")
          .attr("text-anchor", "left")
          .attr('x', xscale(mschart.domain[1].valueOf()) + 3)
          .attr("y", Math.floor(yscale(mschart.goal)) + 2)
          //.attr('textLength', margins.right - 3)
          //.attr("lengthAdjust", "spacingAndGlyphs")
          .text(mschart.goal + " (G)")
          .style('fill', mschart.goal_color);
    }

    return chart;
  };
}

function extractData(mschart) {
  var data = [];
  var keys = d3.map();
  mschart.keys.forEach( key => keys.set(key, "defined"));
  keys = keys.keys();
  keys.sort( (a, b) => moment(new Date(a)).valueOf() - moment(new Date(b)).valueOf() );
  if( moment( new Date(keys[keys.length - 1]) ).diff( moment( new Date(keys[0] ) ) ) > 12) {
    //stuff
  }
  var chart_series = mschart.series;
  if(chart_series.length > 2) chart_series = chart_series.slice(-2);
  chart_series.forEach(function (series, index) {
    var obj = {
      key: series.title,
      color: series.color,
      values: [],
      format: d3.format(series.display_format),
    };

    keys.forEach(function (key) {
      var datapoint = series.data.get(key);
      if(series.data.has(key))
        obj.values.push({
          x: moment(datapoint.key).valueOf(),
          y: datapoint.value,
          size: datapoint.marker_size,
          shape: "circle",
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

function calculateMissingValues(mschart) {
  var data = [];
  var oldData = extractData(mschart);
  oldData.forEach(function (series, i) {
    var poly_set = [];
    var poly_line, prev_pt = {missing: true};
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
          poly_set.push(poly_line);
          poly_line = [ pt ];
        }
        if(i === (series.values.length - 1)) {
          poly_set.push(poly_line);
        }
      }
      if(pt.missing) {
         if(!prev_pt.missing) {
          poly_set.push(poly_line);
          poly_line = [ prev_pt ];
        }
      }
      prev_pt = pt;
    });

    poly_set.forEach(function (poly_line, i) {
      data.push({
        key: series.key + "$#" + i,
        color: series.color,
        values: poly_line,
        format: series.format,
        dashed: i % 2 == 1
      });
    });
  });
  console.log(data);
  return data;
}