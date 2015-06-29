/*jshint esnext:true, eqnull:true, undef:true */
/*globals require, window */

var d3 = require('d3');
import {BaseRenderingPlugin} from './plugin';
import {ColorTool} from './utils';


export class PointHoverPlugin extends BaseRenderingPlugin {

  preRender() {
    super.preRender();
    this.overlay = null;  // will be set in render(), used in interactive...
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

  glowMarker(marker) {
    marker.classed('highlighted', true);
  }

  clearGlow() {
    this.svg.selectAll('path.nv-point.highlighted')
      .classed('highlighted', false);
  }

  showOverlay(marker, dataPoint, series) {
    var color = ColorTool.lighten(series.color, 0.8),
        borderColor = series.color,
        [x, y] = this.scaledCoordinates(dataPoint),
        useLeft = x < (this.plotter.plotWidth * 0.85),
        fontSize = Math.max(10, this.plotter.baseFontSize * 0.7),
        overlay,
        pad,
        w;
    // if marker is null, traverse to it:
    if (marker === null) {
      // .nv-scatterWrap .nv-groups .nv-series-0 path
      marker = d3.select(
        this.svg.selectAll(
            '.nv-scatterWrap .nv-groups .nv-series-' +
            series.position + ' path.nv-point'
          )[0]
          .filter(m => (d3.select(m).data()[0].x === dataPoint.x))[0]
      );
    }
    this.glowMarker(marker);
    // adjust border/text color if not dark enough:
    if (ColorTool.isLight(borderColor)) {
       borderColor = ColorTool.darken(borderColor, 0.4);
    }
    // pad x, y for use in overlay, so that overlay not on top of part of pt:
    w = this.plotter.plotWidth;
    pad = Math.max(5, w * 0.02) * ((this.plotter.type === 'bar') ? 1.8 : 1);
    x = Math.floor((useLeft) ? x + pad : x);
    // create on-hover overlay:
    overlay = this.plotCore.append('div')
      .classed('point-hover-tip', true)
      .style({
        border: `0.1em solid ${borderColor}`,
        'background-color': color,
        position: 'absolute',
        left: (useLeft) ? `${x}px` : undefined,
        right: (!useLeft) ? `${this.plotter.plotWidth - x}px` : undefined,
        top: `${y}px`,
        'font-size': `${fontSize}px`
      });
    overlay
      .append('p')
        .classed('value-info', true)
        .style('color', borderColor)
        .append('span')
          .text(this.plotter.yformat(dataPoint.y));
    overlay.append('p')
      .classed('click-hint', true)
      .text('Click datapoint for details.');
    this.plotter.highlightX(dataPoint.x);
    if (this.plotter.pluginEnabled('TabularLegendRenderer')) {
      this.plotter.getPlugin('TabularLegendRenderer').highlightColumn(dataPoint.x);
    } 
  }

  clearOverlays() {
    this.plotCore.selectAll('.point-hover-tip')
      .transition(3000)
        .style('opacity', 0)
        .remove();
    this.plotter.clearHighlights();
    this.clearGlow();
    if (this.plotter.pluginEnabled('TabularLegendRenderer')) {
      this.plotter.getPlugin('TabularLegendRenderer').clearHighlights();
    } 
  }

  loadInteractiveFeatures() {
    var self = this,
        markers = this.svg.selectAll('.nv-point, .nv-bar'),
        data = markers.data(),
        onHover = function (d, i) {
          var marker = d3.select(this),
              dataPoint = marker.data()[0],
              series = self.data.series[dataPoint.seriesIndex];
          self.showOverlay(marker, dataPoint, series);
        },
        onMouseOut = function (d, i) {
          self.clearOverlays();
        };
    markers
      .on('mouseover', onHover)
      .on('mouseout', onMouseOut);
  }

}

