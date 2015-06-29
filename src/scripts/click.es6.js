/*jshint esnext:true, eqnull:true, undef:true */
/*globals require, window */

var d3 = require('d3');
import {BaseRenderingPlugin} from './plugin';
import {ColorTool} from './utils';
import {Overlay} from './tinyOverlay';

var document = window.document;

function mkHTML(series, point, color) {
  var wrap = d3.select(document.createElement('div')),
      seriesLabel = series.title,
      title = wrap
        .append('h5')
        .text(series.title)
        .style({
          'background-color': color,
          color: (ColorTool.isLight(color)) ? '#000' : '#fff'
        }),
      detail = wrap.append('dl'),
      fmt = d3.format(series.display_format.replace('%', ',') || ',.1f'),
      displayValue = fmt(point.y);
  // Period title (series title):
       detail
    .append('dt')
      .classed('name', true)
      .append('span')
        .classed('point-title', true)
        .text(point.title);
  // Display value (final computed value, formatted):
       detail
    .append('dd')
      .classed('value', true)
      .text('Value: ' + (point.value !== null) ? displayValue : 'n/a (null)');
  // Note:
       detail
    .append('p')
      .classed('note', true)
      .text(point.note);
  if (point.uri) {
    detail
      .append('a')
        .attr({
          href: point.uri,
          target: '_blank'          
        })
        .text('View data source');
  }
  return wrap;
}


export class PointClickPlugin extends BaseRenderingPlugin {

  preRender() {
    super.preRender();
  }

  render() {
    this.xScale = this.plotter.timeScale;
    this.yScale = this.plotter.yScale;
  }

  scaledCoordinates(point) {
    /** get stable x,y from scale+data as event clientX, etc unreliable */
    var x = Math.floor(this.xScale(point.x) + this.margins.left),
        y = Math.floor(this.yScale(point.y) + this.margins.top);
    return [x, y];
  }

  showOverlay(marker, dataPoint, series) {
    var color = series.color,
        ct = ColorTool,
        titleColor = ct.isLight(color) ? ct.darken(color) : color,
        [x, y] = this.scaledCoordinates(dataPoint),
        useLeft = x < (this.plotter.plotWidth * 0.45),
        fontSize = Math.max(10, this.plotter.baseFontSize * 0.7),
        html = mkHTML(series, dataPoint, titleColor).html(),
        overlay = new Overlay(html, {
          container: this.plotCore[0][0],
          classname: (useLeft) ? 'left' : undefined,
          style: {
            left: (useLeft) ? `${x}px` : undefined,
            right: (!useLeft) ? `${this.plotter.plotWidth-x}px` : undefined,
            top: `${y}px`,
            width: '30%',
            'min-width': '160px',
            'max-width': '300px',
            border: '1.5% solid ' + color,
            'z-index': 10000
          }
        }),
        pad,
        w;
    overlay.open();
  }

  loadInteractiveFeatures() {
    var self = this,
        markers = this.svg.selectAll('.nv-point, .nv-bar'),
        data = markers.data(),
        onClick = function (d, i) {
          var marker = d3.select(this),
              dataPoint = marker.data()[0],
              series = self.data.series[dataPoint.seriesIndex];
          self.showOverlay(marker, dataPoint, series);
        };
    markers.on('click', onClick);
  }

}

