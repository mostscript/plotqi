/*jshint esnext:true, eqnull:true, undef:true */
/*globals require, window */

var d3 = require('d3');
var moment = require('moment');

import {ColorTool, uuid4} from './utils';
import {BaseRenderingPlugin} from './plugin';


export class PointLabelsRenderer extends BaseRenderingPlugin {

  constructor(plotter) {
    super(plotter);
  }

  preRender() {
    super.preRender();
    /** after div is sized, we need to possibly adjust for label headroom */
    if (this._needsLabelHeadroom()) {
      this.margins.top = 5 + Math.floor(this.plotter.plotHeight / 15);
    }
  }

  _needsLabelHeadroom() {
    var data = this.data,
        considered = data.series.filter(data.showLabels, data),
        highValued = function (series) {
          var values = [];
          series.data.forEach(function (k, point) {
            values.push(point.value || 0);
          });
          return (Math.max.apply(null, values) > 90);
        };
      considered = considered.filter(highValued);
      return (!!considered.length);  // high-val labeled series gets room
  }

  scalePoint(point) {
    /** return scaled point (plain) object */
    var scaled = Object.create(point),  // wrap with orig point as proto
        x = point.key.valueOf(),
        y = point.value;
    scaled.x = this.xScale(x);
    scaled.y = this.yScale(y);
    // default x2, y2 as label coordinate (default is used by bar chart, and
    // is above the marker data x,y):
    scaled.x2 = scaled.x + 5;
    scaled.y2 = scaled.y - Math.floor(this.plotter.plotWidth / 90);
    return scaled;
  }

  lineSlope(pointA, pointB) {
    /** slope between pointA and pointB, where points have attrs x, y */
    var rise, run;
    if (pointA === null || pointB === null) {
      // constant slope: in effect means horizontal tangent line for any
      // point that has no previous, next points in series.
      return 0;
    }
    rise = (pointB.y - pointA.y) * -1;  // *-1 compensates for svg origin@top
    run = pointB.x - pointA.x;
    return rise / run;
  }

  pointAngles(point, prev, next) {
    /** 
      * return array of: tangent line angle, perpendiculat angle, and
      * inflection angle
      */
    var slope = this.lineSlope,
        slopeA = (prev === null) ? slope(point, next) : slope(prev, point),
        slopeB = (next === null) ? slope(prev, point) : slope(point, next),
        avgSlope = (slopeA + slopeB) / 2.0,
        perpendicularSlope = -1 / avgSlope,
        tanLnAngle = Math.atan(avgSlope),
        positioningAngle = Math.atan(perpendicularSlope),
        inflectionAngle = Math.PI - Math.abs(Math.atan(slopeB)) - Math.abs(Math.atan(slopeA));
    return [tanLnAngle, positioningAngle, inflectionAngle];
  }

  scaledPoints(series) {
    var points = [],
        scaledPoints = [],
        gridZero = this.plotter.gridHeight() + this.margins.top,
        textSize = this.plotter.baseFontSize * 0.75;
    series.data.forEach(function (k, point) {
      if (point.value !== null) {
        points.push(point);
      }
    }); // map to Array of points, filtering out null-valued
    scaledPoints = points.map(this.scalePoint, this);
    if (this.plotter.type === 'line') {
      scaledPoints.forEach(function (point, idx, arr) {
          /** Trigonometric fit x₂,y₂, c distance on perpendicular to tangent
            * line to point, which should look better than simply displaying
            * above a point marker (insofar as chances of text overlapping
            * line-drawing for same series are minimized).
            */
          var prev = (idx === 0) ? null : arr[idx - 1],
              next = (idx === arr.length - 1) ? null : arr[idx + 1],
              //tanLnSlope = this.tangentLineSlope(point, prev, next),
              //perpendicularSlope = -1 / tanLnSlope,
              //positioningAngle = Math.atan(perpendicularSlope),
              [tanAngle, posAngle, inflectionAngle] = this.pointAngles(
                point,
                prev,
                next
              ),
              // angle multipler, *-1 if acute angle:
              acute = (inflectionAngle < Math.PI / 2),
              downward = (prev && next && prev.y < point.y && next.y < point.y),
              mult = (acute && downward) ? -1 : 1, 
              // text is wider than tall, so perceived hypotenuse difference
              // from marker to text should be shorter when tanLnSlope is
              // less than 1 (45°):
              textAbove = (!downward && Math.abs(tanAngle) < Math.PI/4),
              baseDistance = (textAbove) ? 60 : 52,
              distanceDenominator = (downward && acute) ? 33 : baseDistance,
              // ideal hypotenuse distance:
              c = Math.floor(this.plotter.plotWidth / distanceDenominator),
              // opposite leg, delta for Y
              a = mult * c * Math.sin(posAngle),
              // adjacent leg, delta for X
              b = mult * c * Math.cos(posAngle);
          // if tangent line has negative slope (going down left-to-right)
          // then we want to multiply a,b each by -1
          if (tanAngle < 0) {
            b *= -1;
            a *= -1;
          }
          point.x2 = point.x - b;
          point.y2 = point.y + a;
          if (point.y2 > gridZero - textSize) {
            point.y2 = point.y - a;
          }
        },
        this
      );
    }
    return scaledPoints;
  }

  mkGroup() {
    var group = this.plotGroup.selectAll('g.upiq-point-labels').data([null]),
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
    seriesGroup
      .append('text')
      .classed('upiq-point-label point-label-' + seriesIdx, true)
      .attr({
        'text-anchor': 'middle',
        x: point.x2,
        y: point.y2
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
    if (this.plotter.options.tiny) return;
    considered.forEach(function (series) {
        this.renderSeries(series, group);
      },
      this
    );
  }

}

