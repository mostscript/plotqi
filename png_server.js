var path = require('path')
var childProcess = require('child_process')
var phantomjs = require('phantomjs')
var phantomPath = phantomjs.path

var express = require('express')
var bodyParser = require('body-parser')
var gm = require('gm');

var app = express()

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

app.post('/', function (req, res) {
//TODO: do stuff to req
  var childArgs = [
    path.join(__dirname, 'src/rasterize.js'),
    'url (passed to phantomjs script)'
  ]

  var height = +req.body.param('height'), width = +req.body.param('width');
  var dpi = +req.param('dpi') || 72;
  var zoom = +req.body.param('zoom') || dpi / 72;
  var json = req.body.param('json');

  childProcess.execFile(phantomPath, childArgs, function(err, stdout, stderr) {
    res.type('png');
    gm(stdout).density(width, height).stream(function(err, stdout, stderr) {
      stdout.pipe(res);
    });
  });

  childProcess.spawn(phantomPath)

});

var server = app.listen(4000, function () {

  var host = server.address().address
  var port = server.address().port

  console.log('Example app listening at http://%s:%s', host, port)

})


//Another file for phantom
page.open('http://phantomjs.org', function (status) {
  var base64 = page.renderBase64('PNG');
  console.log(base64);
  phantom.exit();
});