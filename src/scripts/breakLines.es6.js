/*jshint esnext:true, eqnull:true, undef:true */
/*globals require, window */


var pathSegPolyfill = require('./vendor/pathseg');  // https://goo.gl/RAfPKC

import {BaseRenderingPlugin} from './plugin';
import {ColorTool} from './utils';

export class ContinuityLinesPlugin extends BaseRenderingPlugin {

  extractPathLineSegments(data) {
    /** parse SVG path data stream into Array or segments */
    var moveToInstruction = /[Mm]/,
        lineToInstruction = /[Ll]/,
        splitLine = v => v.split(lineToInstruction),
        //isLine = v => (splitLine(v).length > 1),
        isLine = v => (v !== ''),
        commaSplit = v => v.split(','),
        mkPoint = function (v) {
          var [x, y] = commaSplit(v);
          return {
            x: x,
            y: y
          };
        },
        toPoints = segment => splitLine(segment).map(mkPoint),
        segments = data.split(moveToInstruction).filter(isLine).map(toPoints);
    return segments;
  }

  missingLines(data) {
    /** given an Array of line segments in a path, return missing connector
      * lines as SVG path data, if and only if appropriate (otherwise, '').
      */
    var pathData = '';
    if (data.length < 2) return pathData;  // no segments need connection
    data.forEach(function (segment, idx) {
        var next = data[idx + 1],
            pointA,
            pointB;
        if (next === undefined) return;   // end of sequence
        pointA = segment.slice(-1).pop();
        pointB = next[0];
        pathData += `M${pointA.x},${pointA.y}L${pointB.x},${pointB.y}`;
      },
      this
    );
    return pathData;
  }

  renderMissing(group, missing, behavior, series) {
    var useDashes = (behavior === 'dashed'),
        path = group.append('path')
          .attr({
            d: missing
          })
          .classed('nv-line upiq-continuation-line', true);
    if (useDashes) {
      path.style({
        'stroke-dasharray': '4 4',
        stroke: ColorTool.lighten(series.color, 0.2)
      });
    }
  }

  adjustLines(series) {
    var idx = series.position,
        classname = 'nv-series-' + idx,
        baseSel = '.nv-linesWrap g.nv-line .nv-groups .nv-group.' + classname,
        baseGroup = this.svg.select(baseSel),
        path = baseGroup.select('path.nv-line'),
        segList = path[0][0].pathSegList,
        segLen = segList.numberOfItems,
        segments = [],
        data,
        missing,
        i,
        behavior = series.break_lines;  // either 'solid' or 'dashed'
    for (i=0; i < segLen; i++) {
      segments.push(segList.getItem(i));
    }
    data = this.extractPathLineSegments(
      segments
        .filter(s => s.pathSegTypeAsLetter !== 'z')
        .map(function (s) {
        return `${s.pathSegTypeAsLetter}${s.x},${s.y}`;
        },
        this
      ).join('')
    );
    missing = this.missingLines(data);
    if (missing) {
      this.renderMissing(baseGroup, missing, behavior, series);
    }
  }

  render() {
    var considered = this.data.series.filter(s => s.break_lines !== 'hidden');
    if (this.plotter.type !== 'line') return;
    considered.forEach(series => this.adjustLines(series));
  }

}
