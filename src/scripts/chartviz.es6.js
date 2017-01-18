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
    var localprops = ['color'];
    obj = obj || {};
    obj.schema = obj.schema || dataSeriesSchema;
    super(obj, localprops);
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
    .map( point => new DataPoint(point) )
    .forEach( point => data.set(point.key, point) );
    this[dataSym] = data;
  }
 
  get color() {
    var explicitColor = this._color,
        pos = (!explicitColor) ? this.position : null,
        defaultColor = DEFAULT_COLORS[pos] || '#999999',
        color = (explicitColor !== 'auto') ? explicitColor : defaultColor;
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
  constructor(obj, context) {
    obj = obj || {};
    obj.schema = obj.schema || timeDataSeriesSchema;
    super(obj);
    this.data = obj.data || [];
    this.context = context;
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

  rawData() {
    /** uncropped all data for series */
    return this[dataSym];
  }

  get data() {
    /** return data filtered to be within any meaningful domain crop */
    var raw = this.rawData(),
        [min, max] = this.croppedDomain,
        result = raw;
    if (this.context.auto_crop) {
      result = d3.map();
      raw.values().forEach(function (point) {
        if (point.key >= min && point.key <= max) {
          result.set(point.key.valueOf(), point);
        }
      });
    }
    return result;
  }

  set data(d) {
    var data = d3.map(),
        isMap = v => (v instanceof Object && typeof v.values === 'function'),
        _key = function (point) {
          return point.key.valueOf();
        },
        input = (isMap(d)) ? d.values() : d;
    if (isMap(d)) {
      this[dataSym] = d;
      return;
    }
    input
      .sort( (a, b) => (a.key > b.key) ? 1 : -1 )
      .filter( (point, i) => (i === 0 || _key(point) != _key(input[i-1])) )
      .map( point => new TimeDataPoint(point) )
      .forEach( point => data.set(point.key.valueOf(), point) );
    this[dataSym] = data;
  }

  get domain() {
    var min = moment.min(...this.data.values().map( d => parseDate(d.key, true) )).toDate();
    var max = moment.max(...this.data.values().map( d => parseDate(d.key, true) )).toDate();
    return [min, max];
  }

  get croppedDomain() {
    /** crop empty, crop deliberately excluded if plot opts for auto_crop */
    var autoCrop = this.context.auto_crop,
        start = this.context.start,
        end = this.context.end,
        data = this.rawData().values()
          .filter( point => point.value != null )
          .filter( point => (autoCrop && start) ? point.key >= start : true )
          .filter( point => (autoCrop && end) ? point.key <= end : true);
    var min = moment.min(...data.map( d => parseDate(d.key, true) )).toDate();
    var max = moment.max(...data.map( d => parseDate(d.key, true) )).toDate();
    return [min, max];
  }

}

export class AnnualDataSeries extends TimeDataSeries {
  /** Takes ad-hoc annual series, and make more formal annual series on
   *  construction, such that all keys/dates are keyed to the first of
   *  the year in which they take place; constructing with duplicate
   *  data points within any given calendar year will result in
   *  a thrown error.
   */ 
  constructor(obj, context) {
    var data = obj.rawData(),
        points = data instanceof Array ? data : obj.data.values(),
        adjusted = d3.map();
    points.forEach(
      function (p) {
        var point = new TimeDataPoint(p),
            key = point.key,
            newKey = moment.utc(key).startOf('year'),
            stamp = (d => parseDate(d).toISOString().split('T')[0]),
            label = context.axisLabel(key);
        point.key = newKey;
        // adjust here
        adjusted.set(newKey.valueOf(), point);
        // use label against new key:
        if (label && label.label && label.label.length) {
          context.labels[stamp(newKey)] = label.label;
        }
      }
    );
    obj.data = adjusted;
    super(obj, context);
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
    .map( point => point.values() );
    data = d3.merge(data);
    return data.map( point => point.key );
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
    this.forceGenerated = [];
  }

  get series() {
    return this[dataSym];
  }

  set series(s) {
    this[dataSym] = s.map(
      function (dataSeries) {
        var isSeries = (dataSeries instanceof TimeDataSeries);
        return (isSeries) ? dataSeries : new TimeDataSeries(dataSeries, this);
      },
      this
    );
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
        autoCrop = this.auto_crop,
        domain = this.domain,
        rightSide = domain[1].valueOf(),
        sortfn = (a, b) => ( (a.toISOString() > b.toISOString()) ? 1 : -1 );
    if (!this._uniqueDates) {
      series.forEach(function (s) {
          var points = s.data.values();
          points.map(datapoint=>datapoint.key).forEach(function (key) {
            var ms = key.valueOf();
            if (!isNaN(key) && found.indexOf(ms) === -1) {
              if ((autoCrop && key.valueOf() <= rightSide) || !autoCrop) {
                result.push(key);
                found.push(ms);
              }
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

  dateFormat (key) {
    var force = this.forceGenerated,
        interval = (force) ? force[1] : INTERVALS[this.frequency][1],
        defaultFn = d => parseDate(d, true).format('M/D/YYYY'),
        fn = (interval === 'month') ? d3.time.format.utc('%b %Y') : defaultFn;
    return fn(parseDate(key));
  }

  // Given date key, return object with key, associated x-axis Label
  // should return empty string for any date not in data.
  axisLabel(key) {
    var dateKey = parseDate(key),         // as Date
        dateValue = dateKey.valueOf(),    // ms
        stamp = (d => parseDate(d).toISOString().split('T')[0]),
        generated = d => ({key: d, label: this.dateFormat(dateKey)}),
        configured = ((d, ds) => ({key: d, label: this.labels[ds]})),
        dateStamp = stamp(dateKey),
        forceGenerated = this.forceGenerated.length,
        considered = this.allDates().map(d => d.valueOf());
    if (!forceGenerated && this.labels.hasOwnProperty(dateStamp)) {
      return configured(dateKey, dateStamp);
    }
    if (forceGenerated && considered.indexOf(dateValue) !== -1) {
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
        quarterly = interval === 'month' && timeStep === 3,
        annual = interval === 'year' && timeStep === 3,
        intervalName = (quarterly) ? 'quarter' : (annual) ? 'year' : interval,
        ceiling = d => moment.utc(d).endOf(intervalName).toDate(),
        floor = d => moment.utc(d).startOf(intervalName).toDate();
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
        (explicitEnd) ? moment.utc(explicitEnd).endOf('day').toDate() : null || 
        moment.max(...seriesDomains.map(([min, max]) => moment.utc(max))).toDate()
      );
    }
    return [getStart(), getEnd()];
  }

}

export function Chart(data) {
  return data.x_axis_type === 'date' ? new TimeSeriesChart(data) : new MultiSeriesChart(data);
}
