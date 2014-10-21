var moment = require('moment');
export function getObjects(jsonFile, callback) {
	d3.json(jsonFile, function (jsonData) {
		var objs = [];
		if(jsonData.length)
			objs = jsonData.map( function ([, obj]) { return obj; } );
		else //if the JSON payload wasn't an array
			objs = [ jsonData ]; //then we were given a single object
		/*objs.forEach(function (val, index) {
			this[index].series.forEach(function (v, i) {
				this[i].data.forEach(function (datum, n) {
					this[n] = datum[1];
					this[n].key = moment(this[n].key);
				}, this[i].data);
			}, this[index].series);
		}, objs);*/
    objs.forEach( obj => ( 
      obj.series.forEach( serum => (
        serum.data = serum.data.map( function([, datum]) { return datum; } )
        ) ) 
      ) );
		callback(objs);
	});
};

export function addStylesheetRules (rules) {
  var styleEl = document.createElement('style'),
      styleSheet;

  // Apparently some version of Safari needs the following line? I dunno.
  styleEl.appendChild(document.createTextNode(''));

  // Append style element to head
  document.head.appendChild(styleEl);

  // Grab style sheet
  styleSheet = styleEl.sheet;

  for (var i = 0, rl = rules.length; i < rl; i++) {
    var j = 1, rule = rules[i], selector = rules[i][0], propStr = '';
    // If the second argument of a rule is an array of arrays, correct our variables.
    if (Object.prototype.toString.call(rule[1][0]) === '[object Array]') {
      rule = rule[1];
      j = 0;
    }

    for (var pl = rule.length; j < pl; j++) {
      var prop = rule[j];
      propStr += prop[0] + ':' + prop[1] + (prop[2] ? ' !important' : '') + ';\n';
    }

    // Insert CSS Rule
    styleSheet.insertRule(selector + '{' + propStr + '}', styleSheet.cssRules.length);
  }
};

export function calcDomain(mschart) {
  var domain = mschart.domain;
  if( moment(domain[1]).diff(moment(domain[0]), 'months') > 12) {
    domain[0] = d3.time.month.offset(domain[1], -12)
  }
  return domain;
}

function preprocessData(mschart) {
  var data = [];
  var domain = calcDomain(mschart);
  domain[1] = d3.time.month.offset(domain[1], 2);
  var keys = d3.time.month.range(...domain);
  var chart_series = mschart.series;
  if(chart_series.length > 2) chart_series = chart_series.slice(-2);
  chart_series.forEach(function (series, index) {
    var obj = {
      key: series.title,
      color: series.color,
      values: [],
      format: d3.format(series.display_format),
    };

    keys.forEach(function (key) {
      var datapoint = series.data.get(key);
      if(series.data.has(key))
        obj.values.push({
          x: moment(datapoint.key).valueOf(),
          y: datapoint.value,
          size: series.marker_size,
          shape: series.marker_style,
          note: datapoint.note,
          title: datapoint.title
          });
      else
        obj.values.push({
          x: moment(new Date(key)).valueOf(),
          missing: true
        });
    });
    data.push(obj);
  });
  return data;
}

export function extractData(mschart) {
  var data = [];
  var oldData = preprocessData(mschart);
  oldData.forEach(function (series, i) {
    var poly_set = [];
    var poly_line, prev_pt = {missing: true};
    series.values.forEach(function (pt, i) {
      if(!pt.missing) {
        if(!poly_line) {
          poly_line = [];
          prev_pt = pt;
        }
         if(!prev_pt.missing) {
          poly_line.push(pt);
        } else {
          poly_line.push(pt);
          poly_set.push(poly_line);
          poly_line = [ pt ];
        }
        if(i === (series.values.length)) {
          poly_set.push(poly_line);
        }
      }
      if(pt.missing) {
         if(!prev_pt.missing) {
          poly_set.push(poly_line);
          poly_line = [ prev_pt ];
        }
      }
      prev_pt = pt;
    });

    poly_set.forEach(function (poly_line, i) {
      data.push({
        key: series.key + '::' + i,
        color: series.color,
        values: poly_line,
        format: series.format,
        dashed: i % 2 == 1
      });
    });
  });
  return data;
}