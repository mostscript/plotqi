import {getObjects} from "./init.es6.js";
import {Schema, Field, Klass} from "./classviz.es6.js";
import {DataPointSchema, dataPointSchema, timeSeriesDataPointSchema} from "./schemaviz.es6.js";
import {Chart} from "./chartviz.es6.js";
import {ChartContainer, TimeGraph} from "./graphviz.es6.js";
//var dataviz = require("imports?moment=moment!exports?uu!../../spec/modelref/dataviz.js");
require: "./Symbol.js";
var d3 = require("d3");
var nv = require("imports?d3=d3!exports?window.nv!nvd3");
getObjects("report.json", function (charts) {
  console.log(charts);
  charts = charts.map( graph => Chart(graph) )
  console.log(charts);
  window.graph = charts[0];
  console.log(graph.series[0].title)
  //let c = Chart(graph);
  //console.log(c);
  window.charts = charts;
  window.sym = new Symbol("This is unique");
  window.Field = Field;
  window.DPS = DataPointSchema;
  window.dps = dataPointSchema;
  window.tps = timeSeriesDataPointSchema;
  window.Klass = Klass;
  window.myObj = {};
  window.container = ChartContainer;
  myObj[sym] = "HEHEHE THIS IS HIDDEN";

  window.graphs = charts.map( chart => new TimeGraph(chart) );
  function renderAll() {
    graphs.forEach(function (g) {
      g.render();
    });
  }
  renderAll();
  //d3.select(window).on("resize", renderAll);
  var div = d3.select("#chart-div-test_numero_dos");
  var svg = div.append("svg");
  window.nvchart = graphs[0].bindTo(svg.node()).prepare();
  nv.addGraph( () => nvchart );
});
export default "hi";