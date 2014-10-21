import {getObjects} from './init';
import {Chart} from './chartviz';
import {SmallMultiplesChart} from './smallMultiplesChart';
import {LargeChart} from './largeFormatChart';
var d3 = require('d3');
var nv = require('imports?d3=d3!exports?window.nv!nvd3');
getObjects('report.json', function (charts) {
  console.log(charts);
  charts = charts.map( graph => Chart(graph) )
  window.charts = charts;
  /* window.container = ChartContainer;
  window.graphs = charts.map( chart => new TimeGraph(chart) );
  function renderAll() {
    graphs.forEach(function (g) {
    var div = d3.select('body')
                .append('div')
                .attr('id', g.id)
                .classed('chart-div', true)
                .style('position', 'relative')
                .style('width', g.container.width + 'px')
                .style('height', g.container.height + 'px');

    var svg = div.append('svg')
                 .attr('width', '100%')
                 .attr('height', '100%')
                 .style('position', 'absolute')
                 .style('top', '0')
                 .style('left', '0')
                 .style('background-color', 'rgb(' + Math.round(Math.random() * 256) + ',' + Math.round(Math.random() * 256) + ',' + Math.round(Math.random() * 256) + ')');

    svg.data(g.chart.series);
    });
  }
  renderAll();
  //d3.select(window).on('resize', renderAll);*/
  var small_div = d3.select('#small-chart-div-test_numero_dos');
  var lg_div = d3.select('#chart-div-test_numero_dos');
  /*window.nvchart = graphs[0].bindTo(svg.node());
  nv.addGraph( () => {
    var c = nvchart.prepare();
    d3.select('#chart-div-test_numero_dos svg')
      .append('text')
      .attr('x', 5)
      .attr('y', 160 - 2)
      .attr('text-anchor', 'left')
      //.style('font-size', '8pt')
      .style('letter-spacing', '-0.1em')
      //.attr('textLength', '160')
      //.attr('lengthAdjust', 'spacingAndGlyphs')
      .text(nvchart.chart.title);
    nvchart.goal();
    nvchart.legend();
    return c;
  } );*/
  nv.addGraph(SmallMultiplesChart(charts[0], small_div));
  nv.addGraph(LargeChart(charts[0], lg_div));
});