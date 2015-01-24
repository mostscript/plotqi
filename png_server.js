var path = require('path')
var childProcess = require('child_process')
var stream = require('stream')
var Readable = stream.Readable

var express = require('express')
var bodyParser = require('body-parser')
//var gm = require('gm');

var app = express()

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

app.post('/', function (req, res) {
//TODO: do stuff to req
  var width = +req.body.width;
  var json = JSON.parse(req.body.json);

  var childArgs = [
    path.join(__dirname, 'src/rasterize.js'),
    '' + width
  ]
  res.type('png');

  /*childProcess.execFile(phantomPath, childArgs, function(err, stdout, stderr) {
    //res.type('png');
    /*gm(stdout).density(width, height).stream(function(err, stdout, stderr) {
      stdout.pipe(res);
    });
    stdout.pipe(res);
  });*/
  var phant = childProcess.spawn("phantomjs", childArgs);
  phant.stdin.write(JSON.stringify(json));
  phant.stdin.end();
  phant.stdout.on('data', function (data) {
    res.write(data);
  })
  phant.on('close', function () {
    res.end();
  })
});

var server = app.listen(4000, function () {})