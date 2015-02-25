/*jshint esnext:true, eqnull:true, undef:true */
/*globals require, window */

var moment = require('moment');
var d3 = require('d3');
var document = window.document;

// singleton app style element:
var styleEl = document.createElement('style');
document.head.appendChild(styleEl);
export var styleSheet = styleEl.sheet;

export function getObjects(jsonFile, callback) {
	d3.json(jsonFile, function (jsonData) {
		var objs = [];

		if(jsonData.length)
			objs = jsonData.map( function ([, obj]) { return obj; } );
		else //if the JSON payload wasn't an array
			objs = [ jsonData ]; //then we were given a single object

    objs.forEach( function (obj) { 
      obj.series.forEach( function (serum) {
        serum.data = serum.data.map( function ([, datum]) { return datum; } );
        });
      });
		callback(objs);
	});
}

/*
Taken from an upcoming version of d3, heavily altered to suit needs of UPIQ
 */
export function d3textWrap(text, width, paddingRightLeft, paddingTopBottom, ignorePadding) {
    paddingRightLeft = paddingRightLeft != null ? paddingRightLeft : 5; //Default padding (5px)
    paddingTopBottom = (paddingTopBottom != null ? paddingTopBottom : 5) - 2; //Default padding (5px), remove 2 pixels because of the borders
    var maxWidth = width; //I store the tooltip max width
    width = ignorePadding ? width : width - (paddingRightLeft * 2); //Take the padding into account

    var arrLineCreatedCount = [];
    text.each(function() {
        var text = d3.select(this),
            words = text.text().split(' ').reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.2, //Ems
            y = parseFloat(text.attr("y")),
            dy = parseFloat(text.attr("dy")),
            createdLineCount = 1, //Total line created count
            textAlign = text.style('text-anchor') || 'start'; //'start' by default (start, middle, end, inherit)

        //Clean the data in case <text> does not define those values
        if (isNaN(dy)) dy = 0; //Default padding (0em) : the 'dy' attribute on the first <tspan> _must_ be identical to the 'dy' specified on the <text> element, or start at '0em' if undefined

        y = +((null === y)?paddingTopBottom:y);

        var tspan = text.text(null).append("tspan").attr("x", paddingRightLeft).attr("dy", dy + "em");
        while (!!(word = words.pop())) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width && line.length > 1) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan").attr("x", paddingRightLeft).attr("dy", lineHeight + dy + "em").text(word);
                ++createdLineCount;
            }
        }

        arrLineCreatedCount.push(createdLineCount); //Store the line count in the array
    });
    return arrLineCreatedCount;
}

export function colorIsDark(color) {
    color = d3.rgb(color);
    color = [color.r, color.g, color.b];
    return (color.reduce( (a, b) => a + b ) / 3) < 128;
}
