var system = require('system'), args = system.args, stdin = system.stdin, stdout = system.stdout;
var page = require('webpage').create();

var json = JSON.parse(stdin.read());
var height, width, dpi = 72; 
args.forEach( function (arg, i) {
  if(i > 0) {
    //
  }
}

var base64 = page.renderBase64('PNG');
console.log(base64);
phantom.exit();