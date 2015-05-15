/*jshint esnext:true, eqnull:true, undef:true */
/*globals require */

'use strict';  /*jshint -W097 */

import {Klass} from './classviz.es6.js';
import {DEFAULT_COLORS} from './utils.es6.js';
var dataSym = Symbol();
var d3 = require('d3');
import {
  dataPointSchema,
  timeDataPointSchema,
  dataSeriesSchema,
  timeDataSeriesSchema,
  multiSeriesChartSchema,
  timeSeriesChartSchema
} from './schemaviz.es6.js';
import {parseDate, fittedTrendline} from './utils.es6.js';

var moment = require('moment');


// Map between uu.chart frequency and d3.time interval name, multiplier:
var INTERVALS = {
  daily: [1, 'day'],
  weekly: [1, 'week'],
  monthly: [1, 'month'],
  yearly: [1, 'year'],
  quarterly: [3, 'month'],
};

export class DataPoint extends Klass {
  constructor(obj) {
    obj = obj || {key: '[none]'};
    obj.schema = obj.schema || dataPointSchema;
    super(obj);
  }

}

export class TimeDataPoint extends DataPoint {
  constructor(obj) {
    obj = obj || {key: new Date()};
    obj.schema = obj.schema || timeDataPointSchema;
    super(obj);
  }
}

export class DataSeries extends Klass {
  constructor(obj) {
    obj = obj || {};
    this.localprops = ['color'];
    obj.schema = obj.schema || dataSeriesSchema;
    super(obj);
    this.data = obj.data || [];
    this._color = obj.color || null;
    this.position = 0;  // default, may be overwritten by chart managing this
  }

  get data() {
    return this[dataSym];
  }

  set data(d) {
    var data = d3.map();
    d.sort( (a, b) => (a.key > b.key) ? 1 : -1 )
    .filter( (v, i) => (i === 0 || v.key != d[i-1].key) )
    .map( datum => new DataPoint(datum) )
    .forEach( datum => data.set(datum.key, datum) );
    this[dataSym] = data;
  }
 
  get color() {
    var explicitColor = this._color,
        pos = (!explicitColor) ? this.position : null,
        color = (explicitColor !== 'auto') ? explicitColor : DEFAULT_COLORS[pos];
    return color;
  }

  set color(v) {
    this._color = v;
  }

  get range() {
    return d3.extent(this.data.values(), d => d.value) || [-Infinity, Infinity];
  }
}

export class TimeDataSeries extends DataSeries {
  constructor(obj) {
    obj = obj || {};
    obj.schema = obj.schema || timeDataSeriesSchema;
    super(obj);
    this.data = obj.data || [];
  }

  get color() {
    var explicitColor = this._color,
        pos = (!explicitColor) ? this.position : null,
        color = (explicitColor) ? explicitColor : DEFAULT_COLORS[pos];
    return color;
  }

  set color(v) {
    this._color = v;
  }

  get data() {
    return this[dataSym];
  }

  set data(d) {
    var data = d3.map();
    d.sort( (a, b) => (a.key > b.key) ? 1 : -1 )
    .filter( (v, i) => (i === 0 || v.key.toString() != d[i-1].key.toString()) )
    .map( datum => new TimeDataPoint(datum) )
    .forEach( datum => data.set(datum.key.valueOf(), datum) );
    this[dataSym] = data;
  }

  get domain() {
    var min = moment.min(...this.data.values().map( d => parseDate(d.key, true) )).toDate();
    var max = moment.max(...this.data.values().map( d => parseDate(d.key, true) )).toDate();
    return [min, max];
  }

  get croppedDomain() {
    var data = this.data.values().filter( datum => datum.value != null );
    var min = moment.min(...data.map( d => parseDate(d.key, true) )).toDate();
    var max = moment.max(...data.map( d => parseDate(d.key, true) )).toDate();
    return [min, max];
  }

}

export class MultiSeriesChart extends Klass {
  constructor(obj) {
    obj = obj || {};
    obj.schema = obj.schema || multiSeriesChartSchema;
    super(obj);
    this.series = obj.series || [];
  }

  get series() {
    return this[dataSym];
  }

  set series(s) {
    this[dataSym] = s.map( serum => new DataSeries(serum) );
  }

  get range() {
    var rMin = this.range_min,
        rMax = this.range_max,
        fMin = function([min, max]) { return min; },
        fMax = function([min, max]) { return max; };
    if (rMin != null && rMax != null) {
      // both specified explicitly:
      return [rMin, rMax];
    }
    var ranges = this.series.map( serum => serum.range );
    return [
      (rMin != null) ? rMin : d3.min(ranges, fMin),
      (rMax != null) ? rMax : d3.max(ranges, fMax)
    ];
  }

  get keys() {
    var data = this.series.map( serum => serum.data )
    .map( datum => datum.values() );
    data = d3.merge(data);
    return data.map( datum => datum.key );
  }

  fittedTrendline(series) {
    /** fitted trendline for series in context of this chart's domain/range */
    var allData = series.data.values(),
        data = allData
          .filter(d => d.value !== null)
          .map(d => [d.key.valueOf(), d.value]),
        domain = this.domain.map(d => d.valueOf()),
        line = fittedTrendline(data, domain, this.range);
    line.trend_width = series.trend_width || 2;
    line.trend_color = series.trend_color || series.color || '#999';
    line.point_count = series.data.size();
    return line;
  }

  showLabels(series) {
    var showDefault = (this.point_labels === 'show') ? 'show' : 'omit',
        behavior = series.point_labels || 'defer',
        visible = (behavior === 'defer') ? showDefault : behavior;
    return (visible === 'show');
  }

}

export class TimeSeriesChart extends MultiSeriesChart {
  constructor(obj) {
    obj = obj || {};
    obj.schema = obj.schema || timeSeriesChartSchema;
    super(obj);
    this.series = obj.series || [];
  }

  get series() {
    return this[dataSym];
  }

  set series(s) {
    this[dataSym] = s.map( serum => new TimeDataSeries(serum, this) );
    this[dataSym].map(function (series, index) {
        series.position = index;
      },
      this
    );
  }

  allDates() {
    var result = [],
        found = [],
        series = this.series,
        sortfn = (a, b) => ( (a.toISOString() > b.toISOString()) ? 1 : -1 );
    if (!this._uniqueDates) {
      series.forEach(function (s) {
          var points = s.data.values();
          points.map(datapoint=>datapoint.key).forEach(function (key) {
            var ms = key.valueOf();
            if (!isNaN(key) && found.indexOf(ms) === -1) {
              result.push(key);
              found.push(ms);
            }
          });
        },
        this
      );
      result.sort(sortfn);  // lexical sort by ISO8601===chronological
      this._uniqueDates = result;
    }
    return this._uniqueDates;  // may be cached after 1st call
  }

  /**
   * axisLabels(): returns array of key/value objects for date, x-axis label,
   * prefering explicitly specified label for date if provided, otherwise
   * falling back to generated date label.
   */
  axisLabels() {
    var dataKeys = this.allDates(),
        labels = [];
    return dataKeys.map(this.axisLabel, this);
  }

  // Given date key, return object with key, associated x-axis Label
  // should return empty string for any date not in data.
  axisLabel(key) {
    var dateKey = parseDate(key),         // as Date
        dateValue = dateKey.valueOf(),    // ms
        stamp = (d => parseDate(d).toISOString().split('T')[0]),
        generated = d => ({key: d, label: parseDate(d, true).format('M/D/YYYY')}),
        configured = ((d, ds) => ({key: d, label: this.labels[ds]})),
        dateStamp = stamp(dateKey),
        considered = this.allDates().map(d => d.valueOf());
    if (this.labels.hasOwnProperty(dateStamp)) {
      return configured(dateKey, dateStamp);
    }
    if (considered.indexOf(dateValue) !== -1) {
      return generated(dateKey);
    }
    return {key: dateKey, label: ''};
  }

  get domain() {
    var domainGetter = s => this.auto_crop ? s.croppedDomain : s.domain,
        seriesDomains,
        explicitStart = this.start,
        explicitEnd = this.end,
        timeStep = INTERVALS[this.frequency][0],
        interval = INTERVALS[this.frequency][1],
        ceiling = function (d) {
          /** ceiling(): date ceiling for timeStep+interval */
          var d3Interval = d3.time[interval],
              intervalFloor = d3Interval.utc.floor(d),
              offsetCeiling = new Date(
                d3Interval.utc.offset(intervalFloor, timeStep) - 1
              );
          return offsetCeiling;
        };
    if (explicitStart && explicitEnd) {
      return [d3.time.day.floor(explicitStart), d3.time.day.ceil(explicitEnd)];
    }
    seriesDomains = this.series.map(domainGetter);
    // normalizing (floor/ceil) getters: start, end; favor explicit to computed
    function getStart() {
      return d3.time.day.utc.floor(
        explicitStart || 
        moment.min(...seriesDomains.map(([min, max]) => moment.utc(min))).toDate()
      );
    }
    function getEnd() {
      return ceiling(
        explicitEnd || 
        moment.max(...seriesDomains.map(([min, max]) => moment.utc(max))).toDate()
      );
    }
    return [getStart(), getEnd()];
  }

}


export function Chart(data) {
  return data.x_axis_type === 'date' ? new TimeSeriesChart(data) : new MultiSeriesChart(data);
}
