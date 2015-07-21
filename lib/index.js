'use strict'

var through = require('through2')
  , convertVector = require('./vector')
  , convertRaster = require('./raster')
  , stream = require('stream')
  , streamifier = require('streamifier')
  , extend = require('util-extend')
  , utils = require('./utils')
  , gutil = require('gulp-util')

module.exports = pdftocairo

function pdftocairo( options ) {

  var options = options || {}

  options = extend({
    resolution: 288,
    transparent: true,
    command: 'pdftocairo'
  },options)

  var format, formatFlag

  if( (format = options.format) === undefined ) {
    throw new gutil.PluginError('gulp-pdftocairo','output format not specified')
  }

  if( (formatFlag = utils.outputFormatFlags[format]) === undefined ) {
    throw new gutil.PluginError('gulp-pdftocairo','output format not valid')
  }

  var onData = function(file, enc, cb ) {

    if( file.isNull() ) {
      return cb(null,file)
    }
    var outfile = file.clone()

    outfile.extname = utils.outputExtensions[format]
    outfile.path = gutil.replaceExtension(outfile.path, utils.outputExtensions[format]);

    if( utils.isRaster( format ) ) {
      if( file.isStream() ) {
        throw new gutil.PluginError('gulp-pdftocairo','pdftocairo is buggy and doesn\'t stream raster formats :(')
        cb()
      } else {
        convertRaster( this, file, outfile, formatFlag, options, cb )
      }
    } else {
      convertVector( this, file, outfile, formatFlag, options, cb)
    }
  }

  return through.obj( onData )
}
