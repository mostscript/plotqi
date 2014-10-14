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

export function SmallMultiplesChart(
 mschart,
 node = d3.select('body').append('div').attr('id', 'small-chart-div-' + (mschart.uid || Math.floor(Math.random() * 1000))),
 [height = 160, width = 160]) {
  node.style('width', width)
      .style('height', height)
      ;
  //
  return function () {
    var chart = nv.models.lineChart()
                  .id(mschart.uid)
                  .showLegend(false)
                  .margin({top: 10, bottom: 60, left: 30, right: 30})
                  .lines.scatter.onlyCircles(false)
                  ;
  chart.xAxis
       .tickFormat( d => d3.time.format("%B")(new Date(d))[0] )
       .tickValues(d3.time.months(...mschart.domain).map( month => month.valueOf() ));
  chart.yAxis
       .tickFormat(d3.format(","))
       .innerTickSize(6);
  chart
       .xDomain(mschart.domain.map( x => x.valueOf() ))
       .yDomain(mschart.range);
  };
}

extractData(mschart) {
  var data = [];
  var keys = d3.map();
  mschart.keys.forEach( key => keys.set(key, "defined"));
  keys = keys.keys();
  keys.sort( (a, b) => moment(new Date(a)).valueOf() - moment(new Date(b)).valueOf() );
  mschart.series.forEach(function (series, index) {
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
        obj.values.push({missing: true});
    });
    data.push(obj);
  });
  return data;
}


export class Graph {
  apply() {
    this.parent.call(this.graph);
    return this;
  }

  transition(duration) {
    if(duration == null) duration = 250;
    this.parent.transition().duration(duration);
    return this;
  }

  bindData() {
    this.parent.datum(this.data);
    return this;
  }

  autoResize() {
    nv.utils.windowResize(this.graph.update);
    return this;
  }

  title() {
    this.parent.select("svg")
      .append("text")
      .attr("x", this.parent.clientWidth / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style('font-size', '9pt')
      .text(this.chart.title);
      return this;
  }

  legend() {
    var wrap = this.parent.selectAll('g.nv-legend').data(["hola"]);
    var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-legend').append('g');
    var g = wrap.select('g');
    wrap.attr('transform', 'translate(' + 5 + ',' + (160 - 30) + ')');

    var legendWrap = g.selectAll('g.nv-leg').data(["hola"]);
    legendWrap.enter().append('g').attr('class', 'nv-leg');
    
    var legend = legendWrap.selectAll('circle.legend-pt.nv-point')
        .data(this.chart.series.map( s => s.color ));
    legend.enter().append('circle')
        .attr('cx', 5 )
        .attr('cy', (d, i) => i * 12 )
        .attr('r', 4)
        .style("stroke", (d) => d )
        .style("fill", (d) => d );
    legendWrap.exit().selectAll('circle.legend-pt.nv-point')
        .transition()
        .attr('cx', 0 )
        .attr('cy', 0 )
        .style('stroke-opacity', 0)
        .remove();
    legendWrap.selectAll("text.nv-goal-lbl").data(this.chart.series)
        .enter().append("text")
        .attr("class", "nv-goal-lbl")
        .attr("text-anchor", "left")
        .attr('x', 15)
        .attr("y", (d, i) => (i * 12) + 3 )
        .attr('dy', "0.1em")
        //.attr('textLength', 160 - 22)
        //.attr("lengthAdjust", "spacing")
        .text( d => d.title );
  }
}

export class TimeGraph extends Graph {
  constructor(chart) {
    super(chart);
    //.showDistX(true).showDistY(true);
    //.y( function ({y}) { return y / 100; } );
  }

  tooltips() {
    this.graph.tooltipContent(function(seriesName, x, y, graph) {
      return "<h3>" + seriesName + "</h3>" + "<p>" + graph.point.note + "</p>"
      + "<p class=\"footer\">" + graph.point.title + ", " + graph.series.format(y / 100) + "</p>";
    });
    return this;
  }

  prepare() {
    return this.axis().tooltips().bindData().transition().apply().autoResize().graph;
  }

  goal() {
    var margin = this.graph.margin();
    var yscale = this.graph.yScale();
    var xscale = this.graph.xScale();
    var wrap = this.parent.selectAll('g.nv-distribution').data([this.chart.goal]);
    var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-distribution').append('g');
    var g = wrap.select('g');

    wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var goalWrap = g.selectAll('g.nv-dist')
        .data([this.chart.goal]);

    goalWrap.enter().append('g');
    goalWrap
        .attr('class', 'nv-dist nv-goal-line')
        .style('stroke', this.chart.goal_color)
        .style('fill', this.chart.goal_color);

    var goal = goalWrap.selectAll('line.nv-goaly')
        .data([this.chart.goal]);
    goal.enter().append('line')
        .attr('x1', xscale(this.chart.goal) )
        .attr('x2', xscale(this.chart.goal) );
    goalWrap.exit().selectAll('line.nv-goaly')
        .transition()
        .attr('y1', Math.floor(yscale(this.chart.goal)) )
        .attr('y2', Math.floor(yscale(this.chart.goal)) )
        .style('stroke-opacity', 0)
        .remove();
    goal
        .attr('class', 'nv-goalx nv-goal-line')
        .attr('x1', xscale(this.chart.domain[0].valueOf()))
        .attr('x2', xscale(this.chart.domain[1].valueOf()));
    goal
        .transition()
        .attr('y1', Math.floor(yscale(this.chart.goal)) )
        .attr('y2', Math.floor(yscale(this.chart.goal)) );
    goalWrap.selectAll("text.nv-goal-lbl")
        .data([this.chart.goal])
        .enter().append("text")
        .attr("class", "nv-goal-lbl")
        .attr("text-anchor", "left")
        .attr('x', xscale(this.chart.domain[1].valueOf()) + 3)
        .attr("y", Math.floor(yscale(this.chart.goal)) + 2)
        .attr('textLength', margin.right - 3)
        .attr("lengthAdjust", "spacingAndGlyphs")
        .text(this.chart.goal + " (G)");
    return this;
  }
}