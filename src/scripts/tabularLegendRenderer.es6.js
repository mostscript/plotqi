/*jshint esnext:true, eqnull:true, undef:true */
/*globals require, window */

var d3 = require('d3');

var SEL_LEGEND = 'g.upiq-legend';


export class TabularLegendRenderer {

  constructor (plotter) {
    this.context = plotter;
    this.data = plotter.data;
    this.plotDiv = plotter.plotDiv;
    this.plotCore = plotter.plotCore;
    this.svg = plotter.svg;
    this.margins = plotter.margins;
    this.legendGroup = null;  // will be set by this.makeLegendGroup
    this.xMax = plotter.xScale(plotter.domain[1].valueOf());
  }

  clearLegend() {
    // since we cannot use selection.html('') in SVG DOM (no innerHTML), we
    // cannot empty, and must remove the legend group, which will be re-added
    // in this.render().
    this.svg.selectAll(SEL_LEGEND).remove();
  }

  makeLegendGroup() {
    var legendGroup = this.svg.selectAll(SEL_LEGEND).data([this.data.series]),
        legendEnterSelection = legendGroup
          .enter()
          .append('g')
          .classed('upiq-legend', true);
    this.legendGroup = this.svg.select(SEL_LEGEND);
  }

  setLegendMargins() {
    var margins = this.margins;
    // TODO: should this be using transform+translate or direct x,y?
    this.legendGroup.attr('transform', `translate(${(this.xMax + margins.left)}, ${margins.top})`);
  }

  render() {
    this.makeLegendGroup();
    this.setLegendMargins();
  }

  update() {
    this.clearLegend();
    this.render();
  }

}
