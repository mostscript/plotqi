import {Klass} from './classviz.es6.js';
require: './Symbol.js';
var dataSym = new Symbol();
var d3 = require('d3');
import {
  dataPointSchema,
  timeDataPointSchema,
  dataSeriesSchema,
  timeDataSeriesSchema,
  multiSeriesChartSchema,
  timeSeriesChartSchema
} from './schemaviz.es6.js';
var moment = require('moment');

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
    obj.schema = obj.schema || dataSeriesSchema;
    super(obj);
    /*Object.defineProperty(this, 'data', function () {
      var data = [];
      return {
        enumerable: true,
        configurable: true,
        get: () => data,
        set: function (d) {
          data = d.sort( (a, b) => (a.key > b.key) ? 1 : -1 )
          .filter( (v, i) => (i === 0 || v.key != d[i-1].key) )
          .map( datum => new DataPoint(datum) );
        }
      };
    }());*/
    this.data = obj.data || [];
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

  get data() {
    return this[dataSym];
  }

  set data(d) {
    var data = d3.map();
    d.sort( (a, b) => (a.key > b.key) ? 1 : -1 )
    .filter( (v, i) => (i === 0 || v.key.toString() != d[i-1].key.toString()) )
    .map( datum => new TimeDataPoint(datum) )
    .forEach( datum => data.set(datum.key, datum) );
    this[dataSym] = data;
  }

  get domain() {
    var min = moment.min(...this.data.values().map( d => moment(d.key) )).toDate();
    var max = moment.max(...this.data.values().map( d => moment(d.key) )).toDate();
    return [min, max];
  }

  get croppedDomain() {
    var data = this.data.values().filter( datum => datum.value != null );
    var min = moment.min(...data.map( d => moment(d.key) )).toDate();
    var max = moment.max(...data.map( d => moment(d.key) )).toDate();
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
    if(this.range_min != null && this.range_max != null)
      return [this.range_min, this.range_max];
    var ranges = this.series.map( serum => serum.range );
    return [
      d3.min(ranges, function ([min, ]) { return min; } ),
      d3.max(ranges, function ([, max]) { return max; } )
    ];
  }

  get keys() {
    var data = this.series.map( serum => serum.data )
    .map( datum => datum.values() );
    data = d3.merge(data);
    return data.map( datum => datum.key )
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
    this[dataSym] = s.map( serum => new TimeDataSeries(serum) );
  }

  get domain() {
    var start, end;
    [start, end] = [this.start || undefined, this.end || undefined];
    var domains = this.series.map( serum => this.auto_crop ? serum.croppedDomain : serum.domain );
    if(!domains) return [start || new Date(), end || new Date()];
    domains = domains.map( function([a,b]) { return [moment(a), moment(b)]; } );
    return [
      start || moment.min(...domains.map( function ([min, ]) { return min; } ) ).toDate(),
      end || moment.max(...domains.map( function ([, max]) { return max; } ) ).toDate()
    ];
  }
}

export function Chart(data) {
  return data.x_axis_type === 'date' ? new TimeSeriesChart(data) : new MultiSeriesChart(data);
}