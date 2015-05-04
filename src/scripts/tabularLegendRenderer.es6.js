/*jshint esnext:true, eqnull:true, undef:true */
/*globals require, window */

var d3 = require('d3');
var moment = require('moment');

import {d3textWrap, range, ColorTool, uuid4} from './utils';
import {BaseRenderingPlugin} from './plugin';

var LEGEND_CLASS = 'upiq-legend';
var SEL_LEGEND = 'g.' + LEGEND_CLASS;


export class TabularLegendRenderer extends BaseRenderingPlugin {

  constructor (plotter) {
    super(plotter);
    this.legendGroup = null;  // will be set by this.makeLegendGroup
    this.leftPad = 5;
    this.legPad = 10;
    // cell padding (within cells === margin of text), all unitx px
    this.cellPadding = {  // all units px
      top: 1,
      bottom: 1,
      left: 1,
      right: 1
    };
    // row padding (around cells === margin of cells), all units px
    this.rowPadding = {  // all units px
      top: 1,
      bottom: 1,
      left: 1,
      right: 1
    };
  }

  preRender() {
    super.preRender();
    // If rel-width & tabular legend: dynamic size for left margin, min 100px
    if (this.useTabularLegend() && this.plotter.relativeWidth) {
      this.margins.left = Math.max(80, Math.floor(this.plotter.plotWidth * 0.2));
    }
  }

  prepare() {
    /** prepare must be called after nvd3 render because we create a 
      * time scale from scale domain/range, which are not set initially
      * during preRender.
      */
    var xScale = this.plotter.xScale,
        /*
        timeScale = d3.time.scale()
          .domain(xScale.domain())
          .range(xScale.range()),
        */
        tickVals = this.plotter.tickVals;
    // force continuous scale in case of oridinal scale via bar chart:
    this.xScale = this.plotter.timeScale;
    this.xMax = this.xScale(this.xScale.domain()[1].valueOf());
    // column width interval based on sample of first data column, scaled:
    this.columnInterval = this.xScale(tickVals[1]) - this.xScale(tickVals[0]);
    this.yMin = this.plotter.yScale(this.data.range[0]);
  }

  clear() {
    // since we cannot use selection.html('') in SVG DOM (no innerHTML), we
    // cannot empty, and must remove the legend group, which will be re-added
    // in this.render().
    this.unloadInteractiveFeatures();
    this.svg.selectAll(SEL_LEGEND).remove();
  }

  makeLegendGroup() {
    var legendGroup = this.svg.selectAll(SEL_LEGEND).data([this.data.series]),
        legendEnterSelection = legendGroup
          .enter()
          .append('g')
          .classed(LEGEND_CLASS, true);
    this.legendGroup = this.svg.select(SEL_LEGEND);
  }

  setLegendMargins() {
    var margins = this.margins,
        yTop = this.yMin + margins.top + this.legPad;
    this.legendGroup.attr({
      transform: `translate(${this.leftPad}, ${(yTop)})`
    });
  }

  makeRow(rowStyle) {
    /** make row group and bagkground rect */
    var row = this.legendGroup.append('g').classed('upiq-legend-row', true),
        rowBgRect = row.selectAll('rect')
          .data([null])
          .enter()
          .append('rect')
          .classed('upiq-legend-table-row-bg', true);
    if (rowStyle.className) {
      row.classed(rowStyle.className, true);
    }
    rowBgRect.attr({
      height: 15,  // initial height
      width: this.xMax + (this.margins.left - this.leftPad),
      'fill-opacity': rowStyle['fill-opacity'] || '1.0',
      fill: rowStyle.fill || '#999'
    });
    return row;
  }

  fitRow(row) {
    var textHeight = d3.max(
          row.selectAll('text.upiq-legend-cell-text')[0]
            .map(function (element) {
              return element.getBoundingClientRect().height;
            }
          )
        ),
        cellPadding = this.cellPadding,
        rowPadding = this.rowPadding,
        cellHeight = textHeight + cellPadding.top + cellPadding.bottom,
        rowHeight = cellHeight + rowPadding.top + rowPadding.bottom,
        rowBgRect = row.select('rect.upiq-legend-table-row-bg');
    // TODO GET MAX HEIGHT
    rowBgRect.attr({
      height: rowHeight,
      width: this.xMax + (this.margins.left - this.leftPad)
    });
    return rowHeight;
  }

  drawCells(row, cellData, cellStyle) {
    var xOffset = this.margins.left,
        cellGroupClass = 'upiq-legend-table-cell',
        selectCellGroup = 'g.' + cellGroupClass,
        rowHeight = 30,
        textHeight,
        cellHeight,
        cellPadding = this.cellPadding,
        cellID = d => 'cell-' + uuid4(),
        minTextSize = 9,
        avgCellWidth = this.xMax / cellData.length,
        computedTextSize = Math.floor((avgCellWidth / 2.4) * 2) / 2.0,
        defaultTextSize = Math.max(computedTextSize, minTextSize);  // px

    row.selectAll(selectCellGroup).data(cellData).enter()
      .append('g')
      .classed(cellGroupClass, true)
      .attr({
        'data-timestamp': d => d.stamp,
        transform: function (cellPosition) {
          return `translate(${cellPosition.x}, ${cellPosition.y})`;
        }
      });

    // make defs for group, then add a clip path with rect same as cell bg
    row.selectAll(selectCellGroup)
      .append('defs')
      .append('clipPath')
      .classed('groupClip', true)  // see note [1] below
      .attr({
        id: cellID
      })
      .append('rect')
      .attr({
        x: 0,
        y: 0,
        width: cellPosition => cellPosition.width + 2,
        height: rowHeight,  // initial, will be sized to fit...
      });
   
    /* NOTE [1]: webkit/blink selector bug makes it impossible to select
     *            clipPath element or any other camelCase element by tagName;
     *            thus we must use a class attribute.
     *
     *  Appears to be long-standing bug with no resolution for clients we
     *  must support, so this workaround is here for a good long while...
     *
     *  Ref: 
     *  https://code.google.com/p/chromium/issues/detail?id=237435
     *  https://bugs.webkit.org/show_bug.cgi?id=83438
     *
     */
 
    row.selectAll(selectCellGroup).attr({
      'clip-path': `url(#${cellID})`
    });

    // make bg rects in each group, with width
    row.selectAll(selectCellGroup)
      .append('rect')
      .classed('upiq-legend-table-cell-bg', true)
      .attr({
        x: 0,
        y: 0,
        width: cellPosition => cellPosition.width,
        height: rowHeight,  // initial, will be sized to fit...
        fill: cellStyle.fill || '#d0e9d9',
        'fill-opacity': cellStyle['fill-opacity'] || '1.0',
        stroke: cellStyle.stroke
      });

    // make text elements, centered:
    row.selectAll(selectCellGroup)
      .each(function (data, i) {
        var group = d3.select(this);
        group
          .append('text')
          .classed('upiq-legend-cell-text', true)
          .classed('noValue', d=> (d.text === '--'))
          .classed('nullValue', d=> (d.text === 'N/A'))
          .text(d => d.text)
          .call(d3textWrap, data.width, 0)
          .attr({
            x: 0,
            y: cellPadding.top,
            lengthAdjust: 'spacingAndGlyphs',
            height: rowHeight,
          })
          .style({
            'text-anchor': 'middle',
            'font-family': 'Arial Narrow',
            'font-weight': 'bold',
            'font-size': function (d) {
              var subtle = (d.text === 'N/A' || d.text === '--'),
                  size = (subtle) ? defaultTextSize * 0.8 : defaultTextSize;
              return '' + size + 'px';
            },
            'fill': cellStyle.textColor || '#000'
          })
          .selectAll('tspan')
            .attr({
              x: (data.width / 2.0),
              dy: '' + defaultTextSize + 'px',
              lengthAdjust: 'spacingAndGlyphs',
            });
      });

    textHeight = d3.max(
      row.selectAll('text.upiq-legend-cell-text')[0]
        .map(function (element) {
            return element.getBoundingClientRect().height;
          }
        )
      );

    cellHeight = textHeight + cellPadding.top + cellPadding.bottom;

    // set height of cell bg rect and the clipping path rect
    // (must select by classname, due to blink/webkit bug, see note [1] above)
    row.selectAll('.upiq-legend-table-cell-bg, .groupClip rect')
      .attr({
        height: cellHeight
      });

    // dynamically size text length to fit cells, IFF too wide:
    row.selectAll('text, tspan')[0].forEach(function (element) {
        var selected = d3.select(element),
            desiredWidth = selected.datum().width,
            bRect = element.getBoundingClientRect(),
            textWidth = bRect.width;
        if (textWidth > desiredWidth) {
          selected.attr({
            textLength: desiredWidth,
          });
        }
        if (element.tagName === 'text' && textHeight > (bRect.height * 1.7)) {
          // other cells are multi-line, and this is likely single-line:
          selected.attr({
            y: (textHeight > bRect.height) ? textHeight / 4.0 : 1
          });
        }
      },
      this
    );

    // transparent opacity for bg of legend label (first) cell:
    d3.select(row.selectAll('.upiq-legend-table-cell-bg')[0][0])
      .attr({
        'fill-opacity': 0.0,
      });

    d3.select(row.selectAll('.upiq-legend-cell-text')[0][0])
      .attr({
        textLength: null,
      })
      .style({
        'font-size': '' + (defaultTextSize * 0.9) + 'px'
      });

  }

  renderLegendRow(cellData, rowStyle, cellStyle) {
    var row = this.makeRow(rowStyle || {}),
        rowHeight;
    this.drawCells(row, cellData, cellStyle);
    rowHeight = this.fitRow(row);
    return [row, rowHeight];
  }

  rowCellData(textGetter) {
    /** return Array of cellInfo objects each containing content and computed
     *      scaled layout/position data for row cells; text content is
     *      obtained by calling textGetter with a key (usually date); this
     *      iterates through all periods in plot using specified frequency,
     *      thus creating cells for 
     *
     *      Constraint: textGetter function must return an empty string if
     *      there is no text for the period/key; textGetter may also return
     *      strings such as 'N/A' for sentinel values depending upon what is
     *      appropriate.
     *
     *      This function should be usable to obtain basic cell positioning
     *      and content for both header and content rows.
     */
    if (typeof textGetter !== 'function') {
      throw new Error('rowCellData not passed textGetter function');
    }
    var [start, end] = this.data.domain,
        timePeriods = this.plotter.timeRange(start, end),
        timeStep = this.plotter.timeStep,
        timeScale = this.xScale,
        firstWidth = null,  // set once in first run of closure below
        scaleDomain = timeScale.domain(),
        barChart = (this.plotter.type === 'bar'),
        leftPadBar = Math.floor(timeScale.range().slice(-1)[0] / 200.0),
        groupSpacing = (barChart) ? this.plotter.chart.groupSpacing() : 0.0,
        padDenominator = 2 + (groupSpacing * 0.2),
        additionalPad = (this.plotter.type === 'line') ? 0 : (timeScale(
          this.plotter.timeOffset(scaleDomain[0], +1).valueOf() 
          ) - timeScale(scaleDomain[0])) / padDenominator,
        xOffset = Math.round(this.margins.left + additionalPad),
        dataStart = this.data.domain[0],
        cellInfo = timePeriods.map(
          function (d) {
            var periodStart = d,
                periodEnd = moment.utc(
                  this.plotter.timeOffset(d, timeStep).valueOf() - 1
                ).toDate(),
                startX = Math.round(timeScale(periodStart.valueOf())),
                endX = Math.round(timeScale(periodEnd.valueOf())),
                rectWidth = Math.round(endX - startX),
                groupLeft = Math.round(timeScale(d.valueOf()) - 5);
            firstWidth = firstWidth || rectWidth;
            groupLeft = Math.round(groupLeft - (firstWidth / 2.0));
            groupLeft -= (barChart) ? leftPadBar : 0;
            return {
              width: rectWidth - 2,
              x: xOffset + groupLeft,
              y: 0,
              stamp: d.toISOString(),
              text: textGetter(d) || ''
            };
          },
          this
        );
    return cellInfo;
  }


  headerTableData() {
    /** return Array of cellInfo objects each containing content and computed
     *      scaled layout/position data for column headings (axis labels).
     */
    var data = this.data,
        textGetter = d => data.axisLabel(d).label || '';
    return this.rowCellData(textGetter);
  }

  seriesRowData(series) {
    var baseData = series.data,  // d3.map (pseudo-ES6-Map) of DataPoint
        infoMap = {},   // ms (implicitly cast) key/name to datapoint
        noValue = '--',
        legendLabelCell = {
          x: 5,
          y: 0,
          width: this.plotter.margins.left - 10,
          text: series.title
        },
        textGetter = function (d) {
          var ms = d.valueOf(),
              format = v => (v === null) ? 'N/A' : d3.format(',.1f')(v),
              text;
          if (Object.keys(infoMap).indexOf(ms.toString()) === -1) {
            return noValue;
          }
          return format(infoMap[ms].value);
        };
    baseData.forEach(function (key, point) {
        infoMap[key] = point;
      },
      this
    );
    return [legendLabelCell].concat(this.rowCellData(textGetter));
  }

  renderLegendRows() {
    var headerData = this.headerTableData(),
        color = ColorTool,
        headerRowStyle = {
          fill: '#eee',
          'fill-opacity': '0.5',
          className: 'upiq-legend-header-row'
        },
        headerCellStyle = {
          fill: '#eee',
          'fill-opacity': '0',
          textColor: '#666'
        },
        baseRowStyle = {
          fill: '#cccccc'
        },
        baseCellStyle = {
          fill: '#ffffff',
          textColor: '#000'
        },
        top = 0,
        row,
        rowHeight;
    [row, rowHeight] = this.renderLegendRow(
      headerData,
      headerRowStyle,
      headerCellStyle
    );
    row.attr({
      transform: `translate(0,${top})`
    });
    top += rowHeight;
    this.data.series.forEach(function (series) {
        var rowData = this.seriesRowData(series),
            cellBgColor = color.lighten(series.color, 0.2),
            firstCellColor = series.color,
            textColor = (color.isDark(cellBgColor)) ? '#fff' : '#000',
            rowStyle = Object.create(baseRowStyle),
            cellStyle = Object.create(baseCellStyle),
            row,
            rowHeight;
        rowStyle.fill = series.color;
        cellStyle.fill = cellBgColor;
        cellStyle.textColor = textColor;
        cellStyle.first = Object.create(cellStyle);   // clone base, 1st col
        cellStyle.first.fill = firstCellColor;        // ...override bgcolor
        [row, rowHeight] = this.renderLegendRow(rowData, rowStyle, cellStyle);
        row.attr({
          transform: `translate(0,${top})`
        });
        top += rowHeight;
      },
      this
    );
  }

  unloadInteractiveFeatures() {
    /** called by this.clear(), should clear event handling before re-render */
    //console.log('TODO: unload previous interactive features');
  }

  loadInteractiveFeatures() {
    /** called by plotter after render */
    // TODO: implement click/hover for cell/column/row behaviors...
    //console.log('TODO: tabular legend interactive features');
  }

  postRender() {
    // adjustments as needed after rendering other bits
    var table = this.svg.select(SEL_LEGEND),
        rows = this.svg.selectAll('upiq-legend-table-row'),
        tableHeight = table[0][0].getBoundingClientRect().height,
        gridHeight = this.plotter.gridHeight(),
        intermediarySpacing = (this.margins.top || 10) + 10,
        tableOrigin = gridHeight + intermediarySpacing,
        plotHeight = tableHeight + gridHeight + intermediarySpacing,
        plotBottomMargin = 15;
    // size plotDiv and plotCore divs with enough space for legend:
    this.plotDiv.style({
      height: '' + (plotHeight + plotBottomMargin) + 'px'
    });
    this.plotCore.style({
      height: '' + plotHeight + 'px'
    });
    table.attr({
      transform: `translate(5, ${tableOrigin})`,
    });
  }

  render() {
    this.prepare();
    this.makeLegendGroup();
    this.renderLegendRows();
    // post-render adjustments (e.g. position fully rendered table)
    this.postRender();
  }

  useTabularLegend() {
    return this.data.legend_placement === 'tabular';
  }

  update() {
    if (!this.useTabularLegend()) {
      return;  // plugin not applicable to plot
    }
    this.clear();
    this.render();
  }

}
