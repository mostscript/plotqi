/*jshint esnext:true, eqnull:true, undef:true */
/*globals require, window */

var d3 = require('d3');
var moment = require('moment');

import {BaseRenderingPlugin} from './plugin';


export class TrendLineRenderer extends BaseRenderingPlugin {

  constructor(plotter) {
    super(plotter);
  }

  preRender() {
    super.preRender();
    this.plotWidth = this.plotter.plotWidth;
  }

  scaleTrendLine(line) {
    /** given line coodinates in unscaled x1,y1,x2,y2 (object), return
      * object with scaled respective coordinate values.
      */
    var r = {
          x1: this.plotter.timeScale(line.x1),
          y1: this.yScale(line.y1),
          x2: this.plotter.timeScale(line.x2),
          y2: this.yScale(line.y2),
          trend_color: line.trend_color,
          trend_width: line.trend_width * Math.floor(this.plotWidth / 160) / 2
        },
        decline = (r.y1 > r.y2);
    // slope on normal axis, not top-down SVG coordinate system:
    r.slope = -1 * (r.y2 - r.y1) / (r.x2 - r.x1);
    r.slope = (decline) ? -1 * r.slope : r.slope;
    return r;
  }

  render() {
    var considered = this.data.series.filter(s => (!!s.show_trend)),
        lines = considered.map(s => this.data.fittedTrendline(s), this),
        scaledLines = lines.map(this.scaleTrendLine, this),
        firstLine = (scaledLines.length) ? scaledLines[0] : null,
        slope = (firstLine) ? firstLine.slope : 0,
        markerRotation = -1 * Math.atan(slope) * (180/Math.PI),
        gridOffsetX = this.margins.left,
        gridOffsetY = this.margins.top,
        lineFn = d3.svg.line().x(d => d.x).y(d => d.y).interpolate('linear'),
        group;
    if (!considered) {
      return;  // no trendlines!
    }
    this.plotGroup.select('defs')
      .append('marker')
      .attr({
        id: 'trendmarker',
        viewBox: '0 0 10 10',
        markerWidth: Math.floor(Math.sqrt(this.plotWidth / 160) + 2),
        markerHeight: Math.floor(Math.sqrt(this.plotWidth / 160) + 2),
        orient: markerRotation,
        refX: 0,
        refY: 5
      })
      .append('path')
        .attr({
          d: 'M 0 0 L 10 5 L 0 10 z',
          fill: '#444',
          opacity: 0.5
        });

    group = this.plotGroup.append('g')
      .classed('upiq-trendlines', true)
      .attr({
        transform: `translate(${gridOffsetX}, ${gridOffsetY})`,
        opacity: '0.5'
      });

    scaledLines.forEach(function (line) {
        var markerCount = Math.floor((line.point_count || 12) / 2),
            data = [],
            x1 = line.x1,
            y1 = line.y1,
            x2 = line.x2,
            y2 = line.y2,
            rise = (y2 - y1),
            run = (x2 - x1);
        data.push({x: x1, y: y1});
        d3.range(1, markerCount + 1).forEach(function (i) {
          data.push({
            x: x2 - (run * i/markerCount),
            y: y2 - (rise * i/markerCount)
          });
        });
        data.push({x: x2, y: y2});
        group.append('path')
          .attr({
            d: lineFn(data),
            stroke: line.trend_color,
            'stroke-width': line.trend_width,
            'marker-mid': 'url(#trendmarker)',
            fill: 'none'
          });
      },
      this
    );
  }

}
