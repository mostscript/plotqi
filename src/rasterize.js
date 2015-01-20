var system = require('system'), args = system.args, stdin = system.stdin, stdout = system.stdout;
var page = require('webpage').create();

Function.prototype.bind = Function.prototype.bind || function (thisp) {
    var fn = this;
    return function () {
        return fn.apply(thisp, arguments);
    };
};
var json = JSON.parse(stdin.read());
var width;
width = args[1];
/*args.forEach( function (arg, i) {
  if(i > 0) {
    //
  }
}*/
page.open('build/headless.html', function (argument) {

  var rasterize = function () {
    page.evaluate(function (width, chart) {
      window.renderSVG(chart, width);
      //return document.querySelector('#chart-div').getBoundingClientRect();
    }, width, json);

    var clip = setTimeout(function () {
      var clipRect = page.evaluate(function() {return document.querySelector('#chart-div').getBoundingClientRect();});
      /*page.clipRect = {
          top:    clipRect.top,
          left:   clipRect.left,
          width:  clipRect.width,
          height: clipRect.height
      };*/

      var base64 = page.renderBase64('PNG');
      console.log(base64);
      phantom.exit();
    }, 3000);
  }

  var loading = setInterval(function () {
    var stillLoading = page.evaluate(function () {
      return typeof window.renderSVG === 'undefined';
    });
    if(stillLoading) {
    } else {
      clearInterval(loading);
      rasterize();
    }
  }, 250);
});