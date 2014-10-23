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

export function croppedDomain(mschart) {
  var domain = mschart.domain;
  if( moment(domain[1]).diff(moment(domain[0]), 'months') > 12) {
    domain[0] = d3.time.month.offset(domain[1], -12)
  }
  return domain;
}

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

//Taken from Underscore, licensed under the MIT license
//Copyright (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//Full MIT copyright notice can be found in the project root
export function debounce(func, wait, immediate) {
  var timeout;
  return function() {
    var context = this, args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};