import {getObjects} from "./init.es6.js";
import {Schema, Field, Klass} from "./classviz.es6.js";
import {DataPointSchema, dataPointSchema, timeSeriesDataPointSchema} from "./schemaviz.es6.js";
import {Chart} from "./chartviz.es6.js";
import {ChartContainer, TimeGraph} from "./graphviz.es6.js";
import {SmallMultiplesChart} from './smallMultiplesChart';
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
      /*
            var div = d3.select("body")
                //.select("#" + g.id)
                .append("div")
                .attr("id", g.id)
                .classed("chart-div", true)
                .style("position", "relative")
                .style("width", g.container.width + "px")
                .style("height", g.container.height + "px");

    var svg = div.append("svg")
                 .attr("width", "100%")
                 .attr("height", "100%")
                 .style("position", "absolute")
                 .style("top", "0")
                 .style("left", "0")
    nv.addGraph( () => g.bindTo(svg.node()).prepare() );
      */
    });
  }
  renderAll();
  //d3.select(window).on("resize", renderAll);
  var div = d3.select("#chart-div-test_numero_dos");
  /*window.nvchart = graphs[0].bindTo(svg.node());
  nv.addGraph( () => {
    var c = nvchart.prepare();
    d3.select("#chart-div-test_numero_dos svg")
      .append("text")
      .attr("x", 5)
      .attr("y", 160 - 2)
      .attr("text-anchor", "left")
      //.style('font-size', '8pt')
      .style('letter-spacing', '-0.1em')
      //.attr('textLength', "160")
      //.attr("lengthAdjust", "spacingAndGlyphs")
      .text(nvchart.chart.title);
    nvchart.goal();
    nvchart.legend();
    return c;
  } );*/
  nv.addGraph(SmallMultiplesChart(charts[0], div));
});
export default "hi";