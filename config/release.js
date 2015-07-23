/*
 * Webpack configuration for release
 */

var webpack = require('webpack');

module.exports = function () {

  var release = true;

  return {
    output: {
      path: './build/',
      filename: '[name].min.js',
      publicPatch: './build/'
    },

    cache: !release,
    debug: !release,
    devtool: (!release) ? 'source-map' : false,
    entry: {
      plotqi: './src/plotqi-entry.js',
    },

    stats: {
      colors: true,
      reasons: !release
    },

    plugins: release ? [
      new webpack.DefinePlugin({'process.env.NODE_ENV': '"production"'}),
      new webpack.optimize.DedupePlugin(),
      new webpack.optimize.UglifyJsPlugin(),
      new webpack.optimize.OccurenceOrderPlugin(),
      new webpack.optimize.AggressiveMergingPlugin(),
      new webpack.dependencies.LabeledModulesPlugin(),
      new webpack.IgnorePlugin(/^\.\/locale$/, [/moment$/])
    ] : [
      new webpack.IgnorePlugin(/^\.\/locale$/, [/moment$/]),
      new webpack.dependencies.LabeledModulesPlugin()
    ],

    resolve: {
      extensions: ['', '.webpack.js', '.web.js', '.js', '.es6.js'],
      modulesDirectories: ['node_modules'],
    },

    module: {
      preLoaders: [
        {
          test: '\\.js$',
          exclude: 'node_modules',
          loader: 'jshint'
        } //,
      ],

      loaders: [
        {
          test: /\.css$/,
          loader: 'style!css'
        },
        {
          test: /\.gif/,
          loader: 'url-loader?limit=10000&mimetype=image/gif'
        },
        {
          test: /\.jpg/,
          loader: 'url-loader?limit=10000&mimetype=image/jpg'
        },
        {
          test: /\.png/,
          loader: 'url-loader?limit=10000&mimetype=image/png'
        },
        {
          test: /\.es6(\.js)?$/,
          exclude: 'node_modules',
          loader: 'babel-loader'
        }
      ]
    }
  };
};
