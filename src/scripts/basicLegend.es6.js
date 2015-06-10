/*jshint esnext:true, eqnull:true, undef:true */
/*globals require, window */

var d3 = require('d3');
import {BaseRenderingPlugin} from './plugin';
import {d3textWrap} from './utils';

export class BasicLegendRenderer extends BaseRenderingPlugin {

  constructor(plotter) {
    super(plotter);
    this.all_locations = ['e', 'n'];  // note 'east' is really northeast...
  }

  preRender() {
    super.preRender();
    this.placement = this.data.legend_placement;
    this.loc = this._location();
    this.enabled = this._enabled();
    if (this.enabled) {
      this.initialPositioning();
    }
    this.textSize = this.plotter.baseFontSize * 0.75; 
  }

  initialPositioning() {
    /** set width, height;
      * adjust margins and if needed positioning of plot relative to legend
      */
    var loc = this.loc,
        isEast = (this.loc === 'e'),
        plotWidth = this.plotter.plotWidth,
        plotHeight = (!isEast) ? 30 : this.plotter.plotHeight,
        gridLeft = this.plotter.margins.left,
        topWidth = plotWidth - gridLeft - this.margins.right,
        legendWidth = (isEast) ? Math.floor(plotWidth * 0.2) : topWidth,
        legendMargin = Math.floor(0.01 * this.plotter.plotWidth),
        gridRight = plotWidth - legendWidth - legendMargin;
    this.width = legendWidth - 1;
    this.left = (isEast) ? gridRight + legendMargin : gridLeft;
    this.top = (isEast) ? this.plotter.margins.top - 1 : 1;
    this.height = plotHeight - this.top - 1;
    if (isEast) {
      this.margins.right = this.width + legendMargin + 2;
    }
  }

  _enabled() {
    var nonTabularPlacement = (this.placement && this.placement !== 'tabular'),
        multiSeries = (this.data.series.length > 1);
    return nonTabularPlacement && this.loc !== null && multiSeries;
  }

  _location() {
    var specifiedLocation = this.data.legend_location,
        unsupported = (this.all_locations.indexOf(specifiedLocation) === -1),
        plotWidth = this.plotter.plotWidth,
        smallPlot = (plotWidth < 400),
        loc = (unsupported) ? 'e' : specifiedLocation;
    if (!specifiedLocation) return null;  // no legend
    return (smallPlot) ? 'n' : loc;
  }

  _legendOrigin() {
    return [this.left, this.top];  // x,y
  }

  container() {
    /** outermost container for the legend */
    return (this.loc === 'n') ? this.abovePlotGroup : this.plotGroup;
  }

  mkGroup() {
    var group = this.container().selectAll('g.upiq-basic-legend').data([null]),
        [x, y] = this._legendOrigin();
    group.enter().append('g')
      .classed('upiq-basic-legend', true)
      .attr({
        transform: `translate(${x}, ${y})`
      });
    this.group = group;
  }

  drawBgRect() {
    this.group.append('rect')
      .classed('legend-bg', true)
      .attr({
        height: this.height,
        width: Math.floor(this.width),
        'fill': '#fff',
        'fill-opacity': 0,
        'stroke-opacity': 0
      })
      .style({
        'stroke-width': '0.175%',
        'stroke': '#999'
      });
  }

  mkElementGroup(idx, left) {
    var group = this.group.append('g')
      .classed('upiq-legend-series', true)
      .attr({
        transform: `translate(${left}, ${this.top})`
      });
    return group;
  }

  drawElement(series) {
    var color = series.color,
        label = series.title,
        padding = Math.floor(this.plotter.plotWidth * 0.01),
        innerPadding = Math.floor(padding/2),
        leftPadding = (this.loc === 'n') ? 0 : padding,
        idx = series.position,
        left = ((this.loc === 'n') ? idx * this.itemWidth : 0) + leftPadding,
        group = this.mkElementGroup(idx, left),
        groupY = 0 + ((this.loc === 'n') ? 1 : idx) * this.textSize,
        colorBoxSize = Math.floor(this.plotter.plotWidth / 45),
        textWidth = this.itemWidth - colorBoxSize - innerPadding * 3,
        text;
    // draw background rectangle (transparent by default, used for sizing)
    group.append('rect')
      .classed('legend-series-bg', true)
      .attr({
        x: 0,
        y: 0,
        width: this.itemWidth,
        height: 30
      })
      .style({
        stroke: '#aaa',
        'stroke-width': '0.2%',
        'fill': '#fff',
        'fill-opacity': 0,
        'stroke-opacity': 0
      });
    // draw color swatch for series:
    group.append('rect')
      .classed('legend-series-color', true)
      .attr({
        x: innerPadding,
        y: groupY,
        width: colorBoxSize,
        height: colorBoxSize
      })
      .style({
        fill: color
      });
    // draw label for series
    group.append('g')
      .attr({
        transform: `translate(${colorBoxSize + innerPadding * 2} ${groupY})`
      })
      .append('text')
        .attr({
          x: 0,
          y: 0,
          'font-size': `${this.textSize}px`
        })
        .style({
          'dominant-baseline': 'middle'
        })
        .text(label)
        .call(d3textWrap, textWidth, 0);
  }

  drawElements() {
    var n = this.data.series.length,
        isEast = (this.loc === 'e');
    this.itemWidth = Math.floor((isEast) ? this.width * 0.9 : this.width / n);
    this.data.series.forEach(function (series) {
      this.drawElement(series);
      },
      this
    );
  }

  render() {
    if (!this.enabled) {
      return;
    }
    this.mkGroup();
    this.drawBgRect();
    this.drawElements();
  }

  _postRender() {
    var seriesGroups = this.group.selectAll('g.upiq-legend-series'),
        selParent = this.group[0][0],
        groupSelections = seriesGroups[0].map(function (group, idx) {
            return d3.select(group).call(g => g[0].parentNode = selParent);
          },
          this
        ),
        numSeries = groupSelections.length,
        _height = g => Math.ceil(g[0][0].getBoundingClientRect().height * 1.1),
        height = Math.max.apply(null, groupSelections.map(_height)),
        isTop = (this.loc === 'n'),
        margin = Math.floor(this.plotter.plotWidth / 120);
    // distribute series groups (evenly size, evenly spaced):
    groupSelections.forEach(function (group, index) {
        var yOffset = (isTop) ? margin : index * height + margin,
            xOffset = d3.transform(group.attr('transform')).translate[0],
            bgRect = group.select('rect.legend-series-bg');
        // space:
        group.attr({
          transform: `translate(${xOffset} ${yOffset})` 
        });
        // size: even height for background rectangles:
        bgRect.attr({
          height: height
        });
      },
      this
    );
    // align elements within each series group:
    groupSelections.forEach(function (group, index) {
        var middle = Math.round(height / 2.0);
        group.select('rect.legend-series-color').call(function (rect) {
          var rectHeight = rect[0][0].getBoundingClientRect().height,
              rectTop = middle - Math.floor(rectHeight / 2);
          rect.attr({
            y: rectTop
          });
        });
        group.select('g').call(function (textGroup) {
          var [x, y] = d3.transform(textGroup.attr('transform')).translate,
              text = textGroup.select('text'),
              tHeight = text[0][0].getBoundingClientRect().height,
              numSpans = text.selectAll('tspan').size(),
              multi = numSpans > 1,
              lineHeight = Math.round(tHeight / numSpans),
              multiLineOffset = middle - Math.floor((tHeight - lineHeight) / 2),
              textMiddle = (multi) ? multiLineOffset : middle;
          textGroup.attr({
            transform: `translate(${x} ${textMiddle})`
          });
        });
      },
      this
    );
    // adjust height of bg rect to content
    this.group.select('rect.legend-bg').attr({
      height: Math.floor(height * ((isTop) ? 1 : numSeries)) + (margin * 2)
    });
  }

  postRender() {
    if (!this.enabled) {
      return;
    }
    this._postRender();
  }

}

