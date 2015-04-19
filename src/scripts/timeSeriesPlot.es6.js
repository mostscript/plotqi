/*jshint esnext:true, eqnull:true, undef:true */
/*globals require, window */

var moment = require('moment');
var d3 = require('d3');
var nv = require('./vendor/nvd3');
import {styleSheet, d3textWrap} from './utils';
import {debounce} from './vendor/debounce';
import {TabularLegendRenderer} from './tabularLegendRenderer';
import {PointLabelsRenderer} from './pointLabelsRenderer';

// Map uu.chart frequency name to interval name (moment||d3.time), multiplier:
var INTERVALS = {
  daily: [1, 'day'],
  weekly: [1, 'week'],
  monthly: [1, 'month'],
  yearly: [1, 'year'],
  quarterly: [3, 'month'],
};

// Class names:
var SVG_CLASSNAME = 'upiq-chart chart-svg';

// Line chart selectors:
var SEL_LINECHART = '.nv-wrap.nv-lineChart';
var SEL_LINESWRAP = ' .nv-linesWrap';
var LINESWRAP_CLASSNAME = 'nv-linesWrap';
var SEL_SCATTERWRAP = '.nv-wrap.nv-line .nv-scatterWrap';
var SEL_LINEGROUPS = SEL_SCATTERWRAP + ' .nv-wrap.nv-scatter .nv-groups';
var SEL_LINEGROUP = SEL_LINEGROUPS + ' .nv-group';
var SEL_MARKER = SEL_LINEGROUPS + ' path.nv-point';
// Bar chart selectors:
var SEL_BARCHART = '.nv-wrap.nv-multiBarWithLegend';
var SEL_BARWRAP = ' .nv-barsWrap';
var BARWRAP_CLASSNAME = 'nv-barsWrap';
var SEL_BAR = SEL_BARWRAP + ' .nv-wrap.nv-multibar .nv-groups rect.nv-bar';
// Generic selectors:
var SEL_CHARTSVG = '.chart-svg';


// registration of custom marker symbols for NVD3 1.7.x+
nv.utils.symbolMap.set('x', function(size) {
    size = Math.sqrt(size) * 1.8;
    return 'M' + (-size/2) + ',' + (-size/2) +
            'l' + size + ',' + size +
            'm0,' + -(size) +
            'l' + (-size) + ',' + size;
});


export class TimeSeriesPlotter {
  // multi-adapter of D3-wrapped dom element (chart div) context and plot data

  constructor (plotDiv, data) {
    this.plotDiv = plotDiv;   // DOM (d3) node (outer plot div)
    this.data = data;         // TimeSeriesChart object
    this._loadConfig();
    // State to be created or re-created later, by this.render():
    this.chart = null;        // will be NVD3 chart obj
    this.plotCore = null;     // will be plot core inner div
    this.svg = null;          // will be svg inside the plot core div
  }

  _loadConfig() {
    var interval = INTERVALS[this.data.frequency || 'monthly'],
        domain = this.data.domain,
        dValue = x => x.valueOf(),
        type = this.data.chart_type || 'line',
        isLine = (type === 'line'),
        rightSidePadding = 0;
    // initial values:
    this.baseFontSize = 14;   // px
    // chart type:
    this.type = type;
    // whether plot is relative (not fixed-px) width:
    this.relativeWidth = (this.data.width_units == '%');
    // margins:
    this.margins = this._margins();
    // intverval bits:
    this.timeStep = interval[0];
    this.interval = interval[1];
    this.d3Interval = d3.time[this.interval].utc;
    // pad left/right with 0-1 periods of space:
    domain = [
      this.timeOffset(domain[0], -1),
      this.timeOffset(domain[1], rightSidePadding)
    ];
    this.domain = domain;
    // time range function:
    this.timeRange = (start, end) => {
      return this.d3Interval.range(start, end, this.timeStep);
    };
    // tick values:
    this.tickVals = this.timeRange(
      domain[0],
      this.timeOffset(domain[1], +1)
      ).map(dValue);
    // plot domain for bar chart is continouous, but not for bar chart, which
    // is merely sorted/discrete; therefore bar chart xDomain needs to
    // include all values:
    this.xDomain = (isLine) ? domain.map(dValue) : this.tickVals;
    // NVD3 selectors contingent on plot type:
    this.nvType = (isLine) ? SEL_LINECHART : SEL_BARCHART;
    this.wrapType = (isLine) ? LINESWRAP_CLASSNAME : BARWRAP_CLASSNAME;
  }

  _configAxes() {
    var range = this.data.range,
        chart = this.chart,
        labelFn = d => this.data.axisLabel(d).label,
        tabular = this.data.legend_placement === 'tabular',
        dFormat = d => moment.utc(d).format('YYYY-MM-DD'),
        yTickVals = n => {
          var out = [],
              interval = (range[1] - range[0]) / n,
              i;
          for (i = range[0]; i <= range[1]; i += interval) {
            out.push(i);
          }
          return out;
        };
    chart.xAxis
      .tickFormat(((tabular) ? (() => '') : labelFn.bind(this)) || '')
      .tickValues(this.tickVals)
      .showMaxMin(false)
      .tickPadding(6)
      .rotateLabels(-45);
    chart.yAxis
      .tickFormat(d3.format(','))
      .tickValues(yTickVals(5))
      .showMaxMin(false)
      .tickPadding(6);
    chart
      .xDomain(this.xDomain)
      .yDomain(this.data.range);
    // optional axis labels:
    if (!tabular && this.data.x_label) {
      chart.xAxis.axisLabel(this.data.x_label);
    }
    if (!tabular && this.data.x_label) {
      chart.xAxis.axisLabel(this.data.x_label);
    }
    if (this.data.y_label) {
      chart.yAxis.axisLabel(this.data.y_label).axisLabelDistance(48);
    }
  }

  timeOffset(date, n) {
    /** n can be +/- integer for direction, number of intervals to offset */
    return moment.utc(date).add(n, this.interval).toDate();
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

  _margins() {
    var margins = {top: 10, bottom: 75, left: 40, right: 10},
        tabular = this.data.legend_placement === 'tabular';
    // space for tabular legend, as needed, will override above:
    if (tabular) {
      margins.left = 120;
      margins.bottom = 100;
    } else {
      // space for right-hand-side legend, if more than one series:
      margins.right = this.data.series.length > 1 ? 120 : 10;
    }
    return margins;
  }

  nvChartFactory() {
    // factory for appropriate chart function to be used by 
    // d3 selection.call() or transition.call()
    var m = nv.models,
        type = this.data.chart_type || 'line',
        factory = (type === 'line') ? m.lineChart : m.multiBarChart,
        chart = factory(),
        markerSize = d => (d.size || 8) * Math.pow(this.plotWidth / 320, 2);
    chart
      .id(this.data.uid)
      .showLegend(false)
      .tooltips(false);
    if (type === 'line') {
      chart
        .useInteractiveGuideline(false)
        .pointSize(markerSize)
        .interactive(false);
    }
    if (type === 'bar') {
      chart.showControls(false)
        .reduceXTicks(false);
    }
    return chart;
  }

  yformat(y) {
    return ((typeof y === 'number') ? d3.format(',.1f')(y) : 'N/A');
  }

  allSeries() {
    var input = this.data,
        keys = this.timeRange(
          input.domain[0],
          this.timeOffset(input.domain[1], +2)
        ),
        // transform fn for series model to plot semantics:
        _transform = function (series, index) {
            var plotType = this.type,
                obj = {
                  key: series.title,
                  color: series.color,
                  values: [],
                  format: d3.format(series.display_format),
                };
            if (plotType === 'line') {
              obj.incomplete = series.break_lines;
              obj.thickness =  series.line_width || 2.0;
              obj.markerThickness = series.marker_width || 2.0;
            }
            keys.map(k => k.valueOf()).forEach(function (key) {
              var datapoint = series.data.get(key),
                  value,
                  info;
              if (series.data.has(key)) {
                value = datapoint.value;
                value = (isNaN(value)) ? null : value;
                info = {
                  x: moment.utc(datapoint.key).valueOf(),
                  y: value,
                  note: datapoint.note,
                  title: datapoint.title,
                  uri: datapoint.uri,
                  seriesIndex: index,
                  missing: (value === null)
                };
                if (plotType === 'line') {
                  info.size = series.marker_size;
                  info.shape = series.marker_style;
                }
                obj.values.push(info);
              } else if (plotType === 'line') {
                obj.values.push({
                  x: new Date(key).valueOf(),
                  missing: true
                });
              }
            });
            return obj;
        };
    return input.series.map(_transform, this);
  }

  extractData() {
    var output = [],
        series = this.allSeries(),
        output_poly_sets;
    // if series is for bar chart, we can return data:
    if (this.type === 'bar') {
      return series;
    }
    // for line plot, we have more work to do to support dotted-lines
    // between incongruous data-points on the time-series:
    if (this.type === 'line') {
      output_poly_sets = function (series, i) {
        var poly_set = [];
        var poly_line, prev_pt = {missing: true};
        var hidden = series.incomplete === 'hidden';
        var solid = series.incomplete === 'solid';
        series.values.forEach(function (pt, i) {
          if(!pt.missing) {
            if(!poly_line) {
              poly_line = [];
              prev_pt = pt;
            }
            if(!prev_pt.missing) poly_line.push(pt);

            else {
              poly_line.push(pt);
              if(!solid) {
                poly_set.push(poly_line);
                poly_line = [ pt ];
              }
            }
            if(i === (series.values.length)) poly_set.push(poly_line);
          } else {
            if( !(prev_pt.missing || solid) ) {
              poly_set.push(poly_line);
              poly_line = [ prev_pt ];
            }
          }
          prev_pt = pt;
        });

        if(solid) poly_set = [ poly_line ];

        output = output.concat( poly_set.map( function (poly_line, i) {
          if(!hidden) return {
            key: `${series.key}::${i}`,
            color: series.color,
            values: poly_line,
            format: series.format,
            thickness: series.thickness,
            markerThickness: series.markerThickness,
            dashed: i % 2 === 1
          }; else if(i % 2 === 0) return {
            key: `${series.key}::${i}`,
            color: series.color,
            values: poly_line,
            format: series.format,
            thickness: series.thickness,
            markerThickness: series.markerThickness,
            dashed: false
          };

        }) );
      };
      series.forEach(output_poly_sets);
    }
    return output;
  }

  drawGoal() {
    var goalValue = this.data.goal,
        hasGoal = !!goalValue,
        goalColor = this.data.goal_color || '#ff0000',
        xMax = this.xScale(this.domain[1].valueOf()),
        yPos = Math.floor(this.yScale(goalValue)),
        baseGroup = this.svg.select(this.nvType + ' > g'),
        goalGroup = baseGroup.select('g.nvd3.nv-distribution'),
        goal,
        text,
        line;
    if (!hasGoal) return;
    if (goalGroup.empty()) {
      // insert g.nvd3.nv-distribution before g.linesWrap in baseGroup:
      goalGroup = baseGroup.insert('g', '.' + this.wrapType)
        .attr('class', 'nvd3 nv-distribution');
    }
    // JOIN goal group (contains line, text) selection to singular null-data
    goal = goalGroup.selectAll('g.nv-dist.nv-goal').data([null]);
    // enter JOIN, set group to use goal color, add line, config coords:
    line = goal.enter()
      .append('g')
      .attr('class', 'nv-dist nv-goal')
      .style('color', this.data.goal_color)
      .append('line')
      .attr('class', 'nv-goal-line')
      .attr({
        x1: 0,
        y1: yPos,
        x2: xMax,
        y2: yPos
      });
    // add text with explicit coordinates
    text = goal
      .append('text')
      .attr('class', 'nv-goal-lbl')
      .text(`Goal: ${goalValue}`)
      .attr('text-anchor', 'start')
      .attr('x', 3)
      .attr('y', yPos - 3);
  }

  _updateLineDetail() {
    var lineGroups = this.svg.selectAll(
          '.nv-wrap.nv-line > g > g.nv-groups .nv-group'
        ),
        relStrokeWidthFactor = 0.25 + (this.gridWidth() / 600);
    lineGroups
      .style('stroke-dasharray', d => d.dashed ? '5 5' : 'none')
      .style('stroke-width', d => (d.thickness || 2) * relStrokeWidthFactor);
  }

  _updateMarkerDetail() {
    /** resize markers: d3 pointSize will draw paths of appropriate size,
      *      but will not scale stroke accordingly, we do this after
      *      initial rendering.
      */
    var relStrokeWidthFactor = 1 + this.plotWidth / 640,
        thickness = d => (d.markerThickness || 2) * relStrokeWidthFactor;
    this.svg.selectAll('.nv-point').style({
      'stroke-width': d => '' + thickness(d) + 'px'
    });
  }

  sizePlot() {
    var data = this.data,
        width = +data.width || 100,
        units = data.width_units || '%',
        aspect = data.aspect_ratio,                                 // [w,h]
        hasRatio = (aspect && aspect.length === 2),
        ratio = (hasRatio) ? (aspect[1] / aspect[0]) : undefined,   // h / w
        relHeight = (!hasRatio && data.height_units === '%'),
        widthSpec = '' + width + units,
        clientWidth,
        minHeight = 160,
        minFontSize = 9,  // px
        computedHeight;
    // plot core div is 100% width of outer:
    this.plotCore.style('width', '100%');
    // and outer is as wide as specified:
    this.plotDiv.style('width', widthSpec);
    if (!data.series.length) {
      // minimal height, placeholder text:
      this.plotCore.style('height', '15px');
      this.plotCore.html('<em>No series data yet provided for plot.</em>');
      return;
    }
    clientWidth = this.plotCore[0][0].clientWidth;
    if ((!hasRatio) && (data.height_units === 'px')) {
      // fixed pixel (absolute) height is specified:
      computedHeight = data.height;
    } else {
      if (relHeight && data.height) {
        // height relative to width, but no specified aspect ratio
        ratio = (data.height / 100.0);  // pct to ratio
      }
      // use explicitly provided or just-computed aspect ratio:
      computedHeight = Math.round(ratio * clientWidth);
    }
    // check computed vs. min:
    computedHeight = Math.max(minHeight, computedHeight);
    this.plotCore.style('height', '' + computedHeight + 'px');
    // If rel-width & tabular legend: dynamic size for left margin, min 100px
    if (this.useTabularLegend() && this.relativeWidth) {
      this.margins.left = Math.max(80, Math.floor(clientWidth * 0.2));
    }
    // save width, height of plotCore for reference by rendering:
    this.plotWidth = clientWidth;
    this.plotHeight = computedHeight;
    // set base font size on svg element:
    this.baseFontSize = Math.max(
      minFontSize,
      Math.floor(clientWidth/45 * 2) / 2.0    // rounded to 0.5px
    );
    // adjust top margin if it has headroom for point labels:
    if (this._needsLabelHeadroom()) {
      this.margins.top = 5 + Math.floor(computedHeight / 15);
    }
  }

  preRender() {
    // prepare the chart div context for rendering:
    // (1) Clear existing content:
    this.plotDiv.html('');
    // (2) Create inner (core) div:
    this.plotCore = this.plotDiv.append('div').classed('chart-div', true);
    // (3) Size div elements according to specifications:
    this.sizePlot();
    // (4) Add empty svg
    this.svg = this.plotCore.append('svg').attr('class', SVG_CLASSNAME);
    this.svg.outerNode = this.plotDiv;
    // (5) set initial base styles on svg element that will be inherited:
    this.svg.style({
      'font-size': '' + this.baseFontSize + 'px'
    });
    // (6) Add singleton 'defs' to svg:
    this.svg.append('defs');
  }

  _grid () {
    var barSel = '.nv-multiBarWithLegend .nv-x',
        lineSel = '.nv-lineChart g rect',
        sGrid = (this.type === 'bar') ? barSel : lineSel;
    return this.svg.select(sGrid).node();
  }

  gridWidth() {
    var grid = this._grid();
    return (!!grid) ? grid.getBoundingClientRect().width : 0;
  }

  gridHeight() {
    var grid = this._grid();
    return (!!grid) ? grid.getBoundingClientRect().height : 0;
  }

  // legend methods:

  useTabularLegend() {
    return this.data.legend_placement === 'tabular';
  }

  useBasicLegend() {
    var multi = this.data.series && this.data.series.length > 1;
    if (!multi) {
      return false;
    }
    return this.data.legend_location == null;
  }

  tabularLegend () {
    var adapter = new TabularLegendRenderer(this);
    adapter.update();
  }

  basicLegend() {
  }

  drawLegend() {
    var useTabular = this.useTabularLegend(),
        useBasic = (!useTabular && this.useBasicLegend());
    if (!useTabular && !useBasic) {
      return;  // no legend
    }
    return (useTabular) ? this.tabularLegend() : this.basicLegend();
  }

  scaleTrendLine(line) {
    /** given line coodinates in unscaled x1,y1,x2,y2 (object), return
      * object with scaled respective coordinate values.
      */
    return {
      x1: this.xScale(line.x1),
      y1: this.yScale(line.y1),
      x2: this.xScale(line.x2),
      y2: this.yScale(line.y2),
      trend_color: line.trend_color,
      trend_width: line.trend_width * Math.floor(this.plotWidth / 160) / 2
    };
  }

  drawTrendLines() {
    var considered = this.data.series.filter(s => (!!s.show_trend)),
        lines = considered.map(s => this.data.fittedTrendline(s), this),
        scaledLines = lines.map(this.scaleTrendLine, this),
        gridOffsetX = this.margins.left,
        gridOffsetY = this.margins.top,
        lineFn = d3.svg.line().x(d => d.x).y(d => d.y).interpolate('linear'),
        group;
    if (!considered) {
      return;  // no trendlines!
    }
    this.svg.select('defs')
      .append('marker')
      .attr({
        id: 'trendmarker',
        viewBox: '0 0 10 10',
        markerWidth: Math.floor(this.plotWidth / 160),
        markerHeight: Math.floor(this.plotWidth / 160),
        orient: 0,
        refX: 0,
        refY: 5
      })
      .append('path')
        .attr({
          d: 'M 0 0 L 10 5 L 0 10 z',
          fill: '#444',
          opacity: 0.5
        });

    group = this.svg.append('g')
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

  drawPointLabels() {
    var adapter = new PointLabelsRenderer(this);
    adapter.update();
  }

  render() {
    var data = this.extractData();
    //this.svg = this.plotDiv.select(SEL_CHARTSVG);
    this.preRender();
    // create an NVD3 chart object:
    this.chart = this.nvChartFactory()
      .margin(this.margins);
    // set scales:
    this.xScale = this.chart.xScale();
    this.yScale = this.chart.yScale();
    // now that we have chart, configure axes:
    this._configAxes();
    // Bind data to selection, call this.chart function in context
    // data-aware selection:
    this.svg.datum(data).call(this.chart);
    if (this.type === 'line') {
      // update line detail (e.g. dashes, thickness):
      this._updateLineDetail();
      this._updateMarkerDetail();
    }
    // Trend-lines, if applicable:
    this.drawTrendLines();
    // Draw point labels, if/as applicable:
    this.drawPointLabels();
    // goal-line, IFF goal exists:
    this.drawGoal();
    // legend:
    this.drawLegend();
    return this.chart;
  }

  refresh() {
    this.render();
  }

  update() {
    // rendering stuff:
    this.render();
    if (this.relativeWidth) {
      window.addEventListener('resize', debounce(this.refresh.bind(this), 500, false));
    }
  }
}
