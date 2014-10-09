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
import {lineWithMarkersChart} from "./lineWithMarkers.es6.js";

export class ChartContainer {
  constructor(chart, parent) {
    this.chart = chart;
    this.parent = parent? parent.node() : document.documentElement;
  }

  get width() {
    if(this.chart.width_units === "px")
      return this.chart.width;
    var parentWidth = this.parent.clientWidth;
    var ratio = this.chart.width / 100;
    return Math.floor(ratio * parentWidth);
  }

  get height() {
    if(this.chart.height_units === "px")
      return this.chart.height;
    else if(this.chart.height_units === "%")
      var ratio = this.chart.height / 100;
    else if(this.chart.aspect_ratio)
      var ratio = this.chart.aspect_ratio[1] / this.chart.aspect_ratio[0];
    return Math.floor(ratio * this.width);
  }
}

export class Graph {
  constructor(chart) {
    this.container = new ChartContainer(chart);
    this.chart = chart;
    this.id = this.chart.uid;
    this[privateSym] = {};
    this.graph = nv.models.lineChart()
    .id(this.id)
    .showLegend(false)
    .margin({top: 10, bottom: 50, left: 30, right: 30});
    this.graph.lines.scatter.onlyCircles(false);
  }

  render() {
    var div = d3.select("body")
                //.select("#" + this.id)
                .append("div")
                .attr("id", this.id)
                .classed("chart-div", true)
                .style("position", "relative")
                .style("width", this.container.width + "px")
                .style("height", this.container.height + "px");

    var svg = div.append("svg")
                 .attr("width", "100%")
                 .attr("height", "100%")
                 .style("position", "absolute")
                 .style("top", "0")
                 .style("left", "0")
                 .style("background-color", "rgb(" + Math.round(Math.random() * 256) + "," + Math.round(Math.random() * 256) + "," + Math.round(Math.random() * 256) + ")");

    svg.data(this.chart.series);
  }

  get data() {
    var data = [];
    var keys = d3.map();
    this.chart.keys.forEach( key => keys.set(key, "defined") );
    //keys.forEach( key => xs.push(moment(key.key).format("YYYY-MM-DD")) );
    this.chart.series.forEach(function (series, index) {
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
      });
      obj.values.sort( (a, b) => a.x - b.x );
      data.push(obj);
    });
    return data;
  }

  get parent() {
    return this[privateSym].bound;
  }

  bindTo(parent) {
    this[privateSym].bound = d3.select(parent);
    return this;
  }

  on(event, callback) {
    this[privateSym].events = callback;
    return this;
  }

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
}

export class TimeGraph extends Graph {
  constructor(chart) {
    super(chart);
    //.showDistX(true).showDistY(true);
    //.y( function ({y}) { return y / 100; } );
  }

  axis() {
  if(this.chart.x_label)
    this.graph.xAxis.axisLabel(this.chart.x_label);
  this.graph.xAxis.tickFormat( d => d3.time.format("%B")(new Date(d))[0] )
  .tickValues(d3.time.months(...this.chart.domain).map( month => month.valueOf() ));
  this.graph.forceX(this.chart.domain.map( x => x.valueOf() ));
  this.graph.lines.forceX(this.chart.domain.map( x => x.valueOf() ));
  if(this.chart.y_label)
    this.graph.yAxis.axisLabel(this.chart.y_label);
  this.graph.yAxis.tickFormat(d3.format(","));
  this.graph.forceY(this.chart.range);
  this.graph.lines.forceY(this.chart.range);
  return this;
  }

  tooltips() {
    this.graph.tooltipContent(function(seriesName, x, y, graph) {
      return "<h3>" + seriesName + "</h3>" + "<p>" + graph.point.note + "</p>"
      + "<p class=\"tooltipFooter\">" + graph.point.title + ", " + graph.series.format(y / 100) + "</p>";
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
        .attr('y1', yscale(this.chart.goal) )
        .attr('y2', yscale(this.chart.goal) )
        .style('stroke-opacity', 0)
        .remove();
    goal
        .attr('class', 'nv-goalx nv-goal-line')
        .attr('x1', xscale(this.chart.domain[0].valueOf()))
        .attr('x2', xscale(this.chart.domain[1].valueOf()));
    goal
        .transition()
        .attr('y1', yscale(this.chart.goal) )
        .attr('y2', yscale(this.chart.goal) );
    goalWrap.selectAll("text.nv-goal-lbl")
        .data([this.chart.goal])
        .enter().append("text")
        .attr("class", "nv-goal-lbl")
        .attr("text-anchor", "left")
        .attr('x', xscale(this.chart.domain[1].valueOf()) + 3)
        .attr("y", yscale(this.chart.goal))
        .attr('textLength', margin.right - 3)
        .attr("lengthAdjust", "spacingAndGlyphs")
        .text("Goal: " + this.chart.goal);
  }
}