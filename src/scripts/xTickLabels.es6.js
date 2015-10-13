/*jshint esnext:true, eqnull:true, undef:true */
/*globals require, window */

import {BaseRenderingPlugin} from './plugin';


export class XTickLabelsRenderer extends BaseRenderingPlugin {

  constructor(plotter) {
    super(plotter);
    this.type = this.plotter.type;
  }

  preRender() {
    super.preRender();
    this.tiny = this.plotter.options.tiny;
    this.enabled = (this.data.legend_placement !== 'tabular' || this.tiny);
    if (!this.enabled) return;
    this.angle = (this.type === 'bar' || this.plotter.plotWidth < 360) ? 90 : 45;
    this.angleRadians = (Math.PI / 180) * this.angle;
    this.relSize = (this.type === 'bar') ? 0.8 : 0.9;
    this.labels = this.data.axisLabels();
    this.height = this.labelHeight();
    this.margins.bottom += this.height;
  }

  mkGroup() {
    var group = this.plotGroup.selectAll('g.upiq-x-tick-labels').data([null]),
        isBar = this.type === 'bar',
        linePlotFontSize = (this.tiny) ? '75%' : '90%',
        tickVals = this.plotter.tickVals,
        columnWidth = this.scale(tickVals[1]) - this.scale(tickVals[0]),
        padLeft = (this.type === 'bar') ? Math.floor(columnWidth/2) + 1 : 5,
        groupTop = this.plotter.plotHeight * 1.02 - this.margins.bottom;
    group.enter().append('g')
      .classed('upiq-x-tick-labels', true)
      .style({
        'font-size': (this.type === 'bar') ? '80%' : linePlotFontSize
      })
      .attr({
        transform: `translate(${padLeft}, ${groupTop})`
      });
    this.group = group;
  }

  labelHeight() {
    /* y-height of largest-length label */
    var maxLabel = Math.max.apply(null, this.labels.map(v => v.label.length)),
        fontSize = this.plotter.baseFontSize * this.relSize,
        multiplier = 0.5875,
        estimatedPx = fontSize * (maxLabel + 2) * multiplier,
        heightNeeded = Math.floor(estimatedPx * Math.sin(this.angleRadians));
    return heightNeeded;
  }

  drawLabel(info) {
    var x = Math.floor(this.scale(info.key) + this.margins.left),
        y = 5,
        angle = -1 * this.angle;
    this.group.append('text')
      .text(info.label)
      .style({
        'text-anchor': 'end',
      })
      .attr({
        x: x,
        y: y,
        transform: `rotate(${angle} ${x} ${y})`
      });
  }

  drawLabels() {
    /** draw labels */
    this.labels.forEach(info => this.drawLabel(info));
  }

  render() {
    if (!this.enabled) {
      return;
    }
    this.scale = this.plotter.timeScale;
    this.mkGroup();
    this.drawLabels();
  }

}

