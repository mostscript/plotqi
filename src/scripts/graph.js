import {getObjects} from './init.es6.js';
var dataviz = require('imports?moment=moment!exports?uu!../../spec/modelref/dataviz.js');
getObjects('report.json', function (graphs) {
  graphs.forEach(function (v, i) {
    graphs[i] = dataviz.plotqi.chart(v);
  });
  console.log(graphs);
  window.graph = graphs[0];
  console.log(graph.series[0].title)
});
module.exports = 'Hi';