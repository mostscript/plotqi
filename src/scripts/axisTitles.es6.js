/*jshint esnext:true, eqnull:true, undef:true */
/*globals require, window */

import {BaseRenderingPlugin} from './plugin';


export class AxisTitleRenderer extends BaseRenderingPlugin {

  preRender() {
    var minMargin = Math.floor(this.plotter.baseFontSize * 4),
        superTiny = this.plotter.plotWidth < 165;
    super.preRender();
    this.titleX = this.data.x_label || '';
    this.titleY = this.data.y_label || '';
    this.hasLabels = (!!this.titleX || !!this.titleY);
    this.superTiny = superTiny;
    // adjust room for each (in margins):
    if (this.titleY && this.margins.left < minMargin && !superTiny) {
      this.margins.left = minMargin;
    }
    if (this.titleX) {
      this.margins.bottom += this.plotter.baseFontSize * 1.2;
    }
  }

  mkGroup() {
    var group = this.plotGroup.selectAll('g.upiq-axis-titles').data([null]);
    group.enter().append('g')
      .classed('upiq-axis-titles', true);
    this.group = group;
  }

  renderX() {
    var tabularLegend = (this.data.legend_placement === 'tabular'),
        topMargin = this.margins.top,
        x = Math.floor(this.plotter.gridWidth() / 2.0) + this.margins.left + 5,
        y = this.plotter.plotHeight - 5,
        element;
    if (tabularLegend) {
      return;
    }
    element = this.group.append('text')
      .classed('x-title', true)
      .text(this.titleX)
      .style({
          'font-family': 'Arial',
          'text-anchor': 'middle',
        })
      .attr({
          transform: `translate(${x},${y})`
        });
  }

  renderY() {
    var element = this.group.append('text').classed('y-title', true),
        topMargin = this.margins.top,
        x = this.plotter.baseFontSize + 5,
        y = Math.floor(this.plotter.gridHeight() / 2.0) + topMargin;
    element
      .text(this.titleY)
      .style({
          'font-family': 'Arial',
          'text-anchor': 'middle',
        })
      .attr({
          transform: `translate(${x},${y}) rotate(-90)`
        });
  }

  render() {
    if (!this.hasLabels) {
      return;  // no labels to render
    }
    this.mkGroup();
    if (this.titleX) {
      this.renderX();
    }
    if (this.titleY && !this.superTiny) {
      this.renderY();
    }
  }

}

