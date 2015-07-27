/*jshint esnext:true, eqnull:true, undef:true */
/*globals require, window */

var d3 = require('d3');
var moment = require('moment');

import {BaseRenderingPlugin} from './plugin';


export class TrendLineRenderer extends BaseRenderingPlugin {

  constructor(plotter) {
    super(plotter);
    // blacklist trident from mid-markers, due to bug:
    //  http://stackoverflow.com/a/21727740/835961
    this.showMarkers = window.navigator.userAgent.indexOf('Trident') === -1;
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
        midMarkers = this.showMarkers,
        group;
    if (!considered) {
      return;  // no trendlines!
    }

    group = this.plotGroup.append('g')
      .classed('upiq-trendlines', true)
      .attr({
        transform: `translate(${gridOffsetX}, ${gridOffsetY})`,
        opacity: '0.5'
      });

    scaledLines.forEach(function (line, idx) {
        var markerCount = Math.floor((line.point_count || 12) / 2),
            data = [],
            x1 = line.x1,
            y1 = line.y1,
            x2 = line.x2,
            y2 = line.y2,
            rise = (y2 - y1),
            run = (x2 - x1),
            slope = rise/run,
            markerRotation = Math.atan(slope) * (180/Math.PI);

        this.plotGroup.select('defs')
          .append('marker')
          .attr({
            id: `trendmarker-${idx}`,
            viewBox: '0 0 10 10',
            markerWidth: Math.floor(Math.sqrt(this.plotWidth / 160) + 2),
            markerHeight: Math.floor(Math.sqrt(this.plotWidth / 160) + 2),
            orient: markerRotation,
            refX: 0,
            refY: 5
          })
          .append('path')
            .attr({
              d: 'M 0 0 L 10 5 L 0 10 L 0 0 Z',
              fill: line.trend_color,
              opacity: 0.5
            });

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
            'marker-mid': (midMarkers) ? `url(#trendmarker-${idx})` : undefined,
            fill: 'none'
          });
      },
      this
    );
  }

}
