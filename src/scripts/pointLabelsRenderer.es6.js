/*jshint esnext:true, eqnull:true, undef:true */
/*globals require, window */

var d3 = require('d3');
var moment = require('moment');

import {ColorTool, uuid4} from './utils';


export class PointLabelsRenderer {


  constructor(plotter) {
    this.plotter = plotter;
    this.data = plotter.data;
    this.svg = plotter.svg;
    this.margins = plotter.margins;
    this.xScale = plotter.xScale;
    this.yScale = plotter.yScale;
    this.showDefault = (this.data.point_labels === 'show') ? 'show' : 'omit';
  }

  scalePoint(point) {
    /** return scaled point (plain) object */
    var scaled = Object.create(point),  // wrap with orig point as proto
        x = point.key.valueOf(),
        y = point.value;
    scaled.x = this.xScale(x);
    scaled.y = this.yScale(y);
    return scaled;
  }

  scaledPoints(series) {
    var points = [];
    series.data.forEach(function (k, point) {
      points.push(point);
    }); // map to Array of points
    return points.map(this.scalePoint, this);
  }

  mkGroup() {
    var group = this.svg.selectAll('g.upiq-point-labels').data([null]),
        gridOffsetX = this.margins.left,
        gridOffsetY = this.margins.top;
    group.enter().append('g')
      .classed('upiq-point-labels', true)
      .attr({
        transform: `translate(${gridOffsetX}, ${gridOffsetY})`
      });
    return group;
  }

  renderPoint(point, seriesGroup, series) {
    var format = v => (v === null) ? '' : d3.format(',.1f')(v),
        seriesIdx = series.position,
        color = series.color,
        ct = ColorTool,
        yOffset = Math.floor(this.plotter.plotWidth / 60);
    // empty label? no element!
    if (point.value === null) {
      return;
    }
    // adjust color lighter or darker to contrast with line:
    color = (ct.isDark(color)) ? ct.lighten(color, 0.5) : ct.darken(color, 0.5);
    // draw point above marker... note: it may be better at some future date
    // to draw text perpendicular to the tangent line through the point with
    // respect to adjacent points to right/left on graph, and in some cases
    // on opposite poles (based on degree of inflection), but this kind of
    // algorithm is YAGNI for now (still worth noting).
    seriesGroup
      .append('text')
      .classed('upiq-point-label point-label-' + seriesIdx, true)
      .attr({
        'text-anchor': 'middle',
        x: point.x,
        y: point.y - yOffset
      })
      .style({
        fill: color,
      })
      .text(format(point.value));
  }

  renderSeries(series, group) {
    var scaledPoints = this.scaledPoints(series),
        seriesGroup = group.append('g')
          .classed('upiq-series-labels', true);
    seriesGroup.attr({
        fill: series.color,
        'font-family': 'Arial Narrow',
        'font-size': '75%'  // % of this.plotter.baseFontSize implied
      })
      .style({
        fill: series.color,
      });
    scaledPoints.forEach(p => this.renderPoint(p, seriesGroup, series));
  }

  render() {
    var considered = this.data.series.filter(s => (this.data.showLabels(s))),
        group = this.mkGroup();
    considered.forEach(function (series) {
        this.renderSeries(series, group);
      },
      this
    );
  }

  update() {
    this.render();
  }

}

