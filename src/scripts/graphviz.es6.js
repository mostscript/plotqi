require: "./Symbol.js";
var privateSym = new Symbol();
var d3 = require("d3");
import {
  DataPoint,
  TimeDataPoint,
  DataSeries,
  TimeDataSeries,
  MultiSeriesChart,
  TimeSeriesChartSchema
} from "./chartviz.es6.js";
var moment = require("moment");

export class ChartContainer {
  constructor(chart) {
    this.chart = chart;
  }

  get width() {
    if(this.chart.width_units === "px")
      return this.chart.width;
    var winWidth = document.documentElement.clientWidth;
    var ratio = this.chart.width / 100;
    return Math.floor(ratio * winWidth);
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
}