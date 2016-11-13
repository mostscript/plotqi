/*jshint esnext:true, eqnull:true, undef:true */
/*globals require, window */

var moment = require('moment');
var d3 = require('d3');
import {BaseRenderingPlugin} from './plugin';

var DAY_MS = 24 * 60 * 60 * 1000;

// Map uu.chart frequency name to interval name (moment||d3.time), multiplier:
export var INTERVALS = {
  daily: [1, 'day'],
  weekly: [1, 'monday'],
  biweekly: [2, 'week'],
  semimonthly: [0.5, 'month'],
  monthly: [1, 'month'],
  bimonthly: [2, 'month'],
  quarterly: [3, 'month'],
  semiannual: [2, 'year'],
  yearly: [1, 'year'],
};

export var submonthly = function (v) {
  var consider = v && v.length ===2,
      unitsNotMonths = (consider) ? v[1] !== 'month' && v[1] !== 'year' : false;
  return (v[0] === 0.5 || unitsNotMonths);
};

// d3 intervals for weeks need consistent day of week:
export var WEEKDAYS = moment.weekdays().map(v => v.toLowerCase());

export class AutoIntervalPlugin extends BaseRenderingPlugin {

  constructor(plotter) {
    super(plotter);
    this.autodetect();
  }

  attemptAutoInterval() {
    /** Returns true if data eligible for auto-interval */
    var monthlyDefault = this.plotter._intervalConfig() == INTERVALS.monthly,
        multiPoint = this.series.size() > 1;
    return (monthlyDefault && multiPoint);
  }

  setInterval(v) {
    this.plotter._loadConfig(v);
  }

  isSubMonthly() {
    var known = [],
        duplicate = [],
        firstDay = true;
    this.points.forEach(function (point) {
      var key, monthStart;
      key = moment.utc(point.key);
      if (!key.isValid()) return;
      monthStart = key.startOf('month').valueOf();
      if (key.date() !== 1) {
        firstDay = false;
      }
      if (duplicate.length || known.indexOf(monthStart) !== -1) {
        duplicate.push(monthStart);
        return;
      }
      known.push(monthStart);
    });
    return (duplicate.length > 0) || (this.points.length === 2 && !firstDay);
  }

  // helper functions for data points:

  dayOfWeeks(points) {
    /** detect day of week for an array of points, if same; otherwise null */
    var sameday = names => names.reduce(
          (a, b) => (a===b) ? a : null,
          names[0] || null
        ),
        dayOf = d => moment.utc(d).locale('en-us').format('dddd').toLowerCase(),
        days = this.points.map(dayOf);
    return sameday(days);
  }

  dayOfMonths(points) {
    /** detect day of month for an array of points, if same; otherwise null */
    var dayOf = p => moment.utc(p.key).date(),
        days = points.map(dayOf),
        sameday = days.reduce(
          (a, b) => (a === b) ? a : null,
          days[0] || null
        );
    return sameday;
  }

  _adjacencyList(points) {
    /** adjacency list, vertices between array of points;
     *  returns array of segment pairs */
    var vertices = [], i;
    for (i=0; i <= points.length - 2; i++) {
      vertices.push([points[i], points[i+1]]);
    }
    return vertices;
  }

  distanceDays(points) {
    /** return array of min, max spread of days between adjacent points */
    var segments = this._adjacencyList(points),
        daySpread = function (pair) {
          var abs = Math.abs,
              [a, b] = pair;
          return abs((moment.utc(a.key) - moment.utc(b.key)) / DAY_MS);
        },
        spreads = segments.map(daySpread),
        min = Math.min.apply(null, spreads),
        max = Math.max.apply(null, spreads);
    return [min, max];
  }

  // subMonthly detection methods:
 
  detectBiWeekly() {
    var dayOfWeek = this.dayOfWeeks(this.points),
        [min, max] = this.distanceDays(this.points);
    return (min === max) && (min === 14) && (dayOfWeek !== null);
  }

  detectSemiMonthly() {
    var [min, max] = this.distanceDays(this.points);
    return (max < 20) && (min > 10);
  }

  detectWeekly() {
    var dayOfWeek = this.dayOfWeeks(this.points),
        max = s => Math.max.apply(null, s),
        monthPoints = d3.map();
    if (!dayOfWeek) {
      return false;
    }
    this.points.forEach(function (p) {
      var d = moment.utc(p.key),
          month = '' + d.month();
      if (monthPoints.keys().indexOf(month) === -1) {
        monthPoints.set(month, 0);
      }
      monthPoints.set(month, monthPoints.get(month) + 1);
    });
    return (max(monthPoints.values()) <= 5);
  }

  // multi-monthly detection methods:

  detectAnnual(split) {
    var max = s => Math.max.apply(null, s),
        yearPoints = d3.map(),
        firstDay = this.dayOfMonths(this.points) === 1;
    this.points.forEach(function (p) {
      var d = moment.utc(p.key),
          year = '' + d.year();
      if (yearPoints.keys().indexOf(year) === -1) {
        yearPoints.set(year, 0);
      }
      yearPoints.set(year, yearPoints.get(year) + 1);
    });
    return firstDay && max(yearPoints.values()) <= (1 * (split || 1));
  }

  detectSemiAnnual() {
    var twoPerYearOrLess = this.detectAnnual(2),
        [min, max] = this.distanceDays(this.points),
        firstDay = this.dayOfMonths(this.points) === 1;
    return firstDay && min > 180 && twoPerYearOrLess;
  }

  detectQuarterly() {
    var fourPerYearOrLess = this.detectAnnual(4),
        [min, max] = this.distanceDays(this.points),
        firstDay = this.dayOfMonths(this.points) === 1;
    return firstDay && max <= 180 && min > 63 && fourPerYearOrLess;
  }

  detectBiMonthly() {
    var [min, max] = this.distanceDays(this.points),
        firstDay = this.dayOfMonths(this.points) === 1;
    return firstDay && max <= 63 && min >= 32;
  }

  inferInterval() {
    var subMonthly = this.isSubMonthly();
    if (subMonthly) {
      // interval smaller than monthly
      if (this.detectBiWeekly()) {
        return INTERVALS.biweekly;
      }
      if (this.detectSemiMonthly()) {
        return INTERVALS.semimonthly;
      }
      if (this.detectWeekly()) {
        return INTERVALS.weekly;
      }
      return INTERVALS.daily;
    } else {
      // month or multi-month:
      if (this.detectAnnual()) {
        return INTERVALS.yearly;
      }
      if (this.detectSemiAnnual()) {
        return INTERVALS.semiannual;
      }
      if (this.detectQuarterly()) {
        return INTERVALS.quarterly;
      }
      if (this.detectBiMonthly()) {
        return INTERVALS.bimonthly;
      }
      return [1, 'month'];
    }
  }

  largestSeries() {
    var result = d3.map();
    this.plotter.data.series.forEach(function(s) {
      if (s.data.size() > result.size()) {
        result = s.data;
      }
    });
    return result;
  }

  autodetect() {
    this.series = this.largestSeries();
    this.points = this.series.values();
    if (this.attemptAutoInterval()) {
      this.setInterval(this.inferInterval());
    }
  }

}
