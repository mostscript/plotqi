/*jshint esnext:true, eqnull:true, undef:true */
/*globals require, window */

var moment = require('moment');
var d3 = require('d3');
var nv = require('./vendor/nvd3');
import {styleSheet, d3textWrap, colorIsDark} from './utils';
import {debounce} from './vendor/debounce';

// Map between uu.chart frequency and d3.time interval name, multiplier:
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
        isLine = (type === 'line');
    // chart type:
    this.type = type;
    // margins:
    this.margins = this._margins();
    // intverval bits:
    this.timeStep = interval[0];
    this.interval = interval[1];
    this.d3Interval = d3.time[this.interval];
    // whether plot is relative (not fixed-px) width:
    this.relativeWidth = (this.data.width_units == '%');
    // pad left/right with one period of space:
    domain = [
      this.timeOffset(domain[0], -1),
      this.timeOffset(domain[1], +1)
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
        labels = this.data.labels || {},
        tabular = this.data.legend_placement === 'tabular',
        dFormat = d => moment(d).format('YYYY-MM-DD'),
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
      .tickFormat((tabular) ? () => '' : d => labels[dFormat(d)] || '')
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
    return this.d3Interval.offset(date, n * this.timeStep);
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
        chart = factory();
    chart
      .id(this.data.uid)
      .showLegend(false)
      .tooltips(false);
    if (type === 'line') {
      chart
        .useInteractiveGuideline(false)
        .interactive(false);
    }
    if (type === 'bar') {
      chart.showControls(false);
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
            keys.forEach(function (key) {
              var datapoint = series.data.get(key),
                  value,
                  info;
              if (series.data.has(key)) {
                value = datapoint.value;
                value = (isNaN(value)) ? null : value;
                info = {
                  x: moment(datapoint.key).valueOf(),
                  y: value,
                  note: datapoint.note,
                  title: datapoint.title,
                  uri: datapoint.uri,
                  seriesIndex: index
                };
                if (plotType === 'line') {
                  info.size = series.marker_size;
                  info.shape = series.marker_style;
                }
                obj.values.push(info);
              } else {
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
        );
    lineGroups
      .style('stroke-dasharray', d => d.dashed ? '5 5' : 'none')
      .style('stroke-width', d => d.thickness || 2);
  }

  _updateMarkerDetail() {
    var thickness = d => d.markerThickness;
    this.svg.selectAll(SEL_LINEGROUP).style('stroke-width', thickness);
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
    this.plotCore.style('height', '' + computedHeight + 'px');
  }

  preRender() {
    // prepare the chart div context for rendering:
    this.plotDiv.html('');                          // clear existing content
    this.plotCore = this.plotDiv.append('div').classed('chart-div', true);     // create inner div
    this.sizePlot();
    this.svg = this.plotCore.append('svg').attr('class', SVG_CLASSNAME);
    this.svg.outerNode = this.plotDiv;
  }

  // legend methods:


  useTabularLegend() {
    return this.plotDiv.legend_placement === 'tabular';
  }

  useBasicLegend() {
    var multi = this.plotDiv.series && this.content.series.length > 1;
    if (!multi) {
      return false;
    }
    return this.plotDiv.legend_location == null;
  }

  tabularLegend () {
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
      nv.utils.windowResize(debounce(this.refresh.bind(this), 250, false));
    }
  }
}
