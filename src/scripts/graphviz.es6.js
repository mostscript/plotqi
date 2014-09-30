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
var c3 = require("../c3.js");

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
    this.series = chart.series;
    this.id = "chart-div-" + this.chart.uid;
    this[privateSym] = {events: {}};
    this.initData();
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
                 .style("background-color", "red");

    svg.data(this.series);
  }

  get data() {
    return this[privateSym].data;
  }

  initData() {
    var obj = {x: "x", columns: [], colors: {}};
    var keys = d3.map();
    this.chart.keys.forEach( key => keys.set(key, "defined") );
    var xs = ["x"];
    keys.forEach( key => xs.push(moment(key.key).format("YYYY-MM-DD")) );
    obj.columns.push(xs);
    this.chart.series.forEach(function (series, index) {
      var col = [series.title];
      keys.forEach(function (key) {
        if(series.data.has(key)) col.push(series.data.get(key).value);
        else col.push(0);
      });
      obj.columns.push(col);
      obj.colors[series.title] = series.color;
    });
    this[privateSym].data = obj;
  }

  get bindto() {
    return this[privateSym].bound;
  }

  bindTo(parent) {
    this[privateSym].bound = "#" + parent.attr("id");
    return this;
  }

  get axis() {
    var obj = {y: {show: true}, x: {show: true}};
    if(this.chart.y_label) obj.y.label = {text: this.chart.y_label, position: "outer-middle"};
    if(this.chart.x_label) obj.x.label = {text: this.chart.x_label, position: "outer-middle"};
    obj.x.type = "timeseries";
    obj.x.tick = {format: "%M %Y"}
    [obj.y.min, obj.y.max] = this.chart.range;
    return obj;
  }

  on(event, callback) {
    this[privateSym].events[event] = callback;
    return this;
  }

  get onclick() {return this[privateSym].events["click"];}
  get onmouseover() {return this[privateSym].events["mouseover"];}
  get onmouseout() {return this[privateSym].events["mouseout"];}
  get onresize() {return this[privateSym].events["resize"];}
  get onresized() {return this[privateSym].events["resized"];}
}