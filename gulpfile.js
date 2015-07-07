/*!
 * gulpfile.js for UPIQ data plot rendering https://github.com/upiq/plotqi
 *  Modifications to boilerplate Copyright 2014-2015 University of Utah
 *  Licensed under same MIT-style license as upstream.
 * 
 * UPSTREAM: Modified from boilerplate, via:
 *  React Starter Kit | https://github.com/kriasoft/react-starter-kit
 *  Copyright (c) KriaSoft, LLC. All rights reserved. See LICENSE.txt
 */

(function () {
  'use strict';

  // Include Gulp and other build automation tools and utilities
  // See: https://github.com/gulpjs/gulp/blob/master/docs/API.md
  var gulp = require('gulp');
  var $ = require('gulp-load-plugins')();
  var del = require('del');
  var runSequence = require('run-sequence');
  var webpack = require('webpack');
  var browserSync = require('browser-sync');
  var argv = require('minimist')(process.argv.slice(2));

  // Settings
  var DEST = './build';             // The build output folder
  var RELEASE = !!argv.release;     // Minimize and optimize during a build?
  var AUTOPREFIXER_BROWSERS = [     // https://github.com/ai/autoprefixer
    'ie >= 9',
    'ie_mob >= 9',
    'ff ESR',
    'chrome >= 34',
    'safari >= 7',
    'opera >= 23',
    'ios >= 7',
    'android >= 4.4',
    'bb >= 10'
  ];
  var DEFAULT_TASK = (
    (Object.keys(argv).indexOf('serve') !== -1) ? 'serve' : 'build'
    );

  var src = {};
  var watch = false;
  var reload = browserSync.reload;
  var pkgs = (function () {
    var temp = {};
    var map = function (source) {
      for (var key in source) {
        temp[key.replace(/[^a-z0-9]/gi, '')] = source[key].substring(1);
      }
    };
    map(require('./package.json').dependencies);
    return temp;
  }());

  // The default task
  gulp.task('default', [DEFAULT_TASK]);

  // Clean up
  gulp.task('clean', del.bind(null, [DEST]));

  // Static files
  gulp.task('assets', function () {
    src.assets = 'src/assets/**';
    return gulp.src(src.assets)
      .pipe(gulp.dest(DEST))
      .pipe($.if(watch, reload({stream: true})));
  });

  // Images
  gulp.task('images', function () {
    src.images = 'src/images/**';
    return gulp.src(src.images)
      .pipe($.cache($.imagemin({
        progressive: true,
        interlaced: true
      })))
      .pipe(gulp.dest(DEST + '/images'))
      .pipe($.if(watch, reload({stream: true})));
  });

  // HTML pages
  gulp.task('pages', function () {
    src.pages = 'src/pages/**/*.html';
    return gulp.src(src.pages)
      .pipe($.if(RELEASE, $.htmlmin({
        removeComments: true,
        collapseWhitespace: true,
        minifyJS: true
      })))
      .pipe(gulp.dest(DEST))
      .pipe($.if(watch, reload({stream: true})));
  });

  // CSS style sheets
  gulp.task('styles', function () {
    src.styles = 'src/styles/**/*.{css,less}';
    return gulp.src('src/styles/plotqi.less')
    .pipe($.plumber())
      .pipe($.less({sourceMap: !RELEASE, sourceMapBasepath: __dirname}))
      .on('error', $.util.log)
      .pipe($.autoprefixer(AUTOPREFIXER_BROWSERS))
      .pipe($.if(RELEASE, $.minifyCss()))
      .pipe(gulp.dest(DEST))
      .pipe($.if(watch, reload({stream: true})));
  });

  // Bundle
  gulp.task('bundle', function (cb) {
    var started = false;
    var specs = ['./config/webpack.js'];

    if (RELEASE) {
      specs.push('./config/release.js');
    }

  
    specs.forEach(function (path) {
      var config = require(path)(),
          bundler = webpack(config);
      
      function bundle (err, stats) {
        if (err) {
          throw new $.util.PluginError('webpack', err);
        }
        if (argv.verbose) {
          $.util.log('[webpack]', stats.toString({colors: true}));
        }
        if (watch) {
          reload(config.output.filename);
        }
        if (!started) {
          started = true;
          return cb();
        }
      }

      if (watch) {
        bundler.watch(200, bundle);
      } else {
        bundler.run(bundle);
      }
    });
      
  });

  // Build the app from source code
  gulp.task('build', ['clean'], function (cb) {
    runSequence(['assets', 'images', 'pages', 'styles', 'bundle'], cb);
  });

  // Launch a lightweight HTTP Server
  gulp.task('serve', function (cb) {
    watch = true;
    runSequence('build', function () {
      browserSync({
      notify: false,
      // Run as an https by uncommenting 'https: true'
      // Note: this uses an unsigned certificate which on first access
      //     will present a certificate warning in the browser.
      // https: true,
      server: {
        baseDir: ['build']
      }
      });

      gulp.watch(src.assets, ['assets']);
      gulp.watch(src.images, ['images']);
      gulp.watch(src.pages, ['pages']);
      gulp.watch(src.styles, ['styles']);
      cb();
    });
  });

}());

