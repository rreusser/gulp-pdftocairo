'use strict'

var spawn = require('child_process').spawn
  , extend = require('util-extend')
  , tmp = require('tmp')
  , fs = require('fs')
  , onFinished = require('on-finished')
  , destroy = require('destroy')

module.exports = pdftocairo

var outputFormatFlags = {
  'svg': '-svg',
  'png': '-png',
  'ps': '-ps',
  'eps': '-eps',
  'jpeg': '-jpeg',
  'jpg': '-jpeg'
}

var outputExtensions = {
  'svg': '.svg',
  'png': '.png',
  'ps': '.ps',
  'eps': '.eps',
  'jpeg': '.jpg',
  'jpg': '.jpg'
}

function isRaster( format ) {
  switch(format) {
    case 'png':
    case 'jpeg':
    case 'jpg':
      return true
      break;
    default:
      return false
  }
}

function pdftocairo( pdfStream, outputStream, options, callback ) {

  var options = options || {}

  var errorDest = null, format, formatFlag, tmpFile

  if( (format = options.format) === undefined ) {
    if( callback ) callback( new Error('pdftocairo: output format not specified') )
    return false
  }

  if( (formatFlag = outputFormatFlags[format]) === undefined ) {
    if( callback ) callback( new Error('pdftocairo: output format not valid') )
    return false
  }

  if( options.stderr ) {
    errorDest = 'pipe'
  }

  if( isRaster( format ) ) {

    options = extend({
      resolution: 400,
      transparent: true
    },options)

    //
    // Due to a bug in the way pdftocairo handles raster output with stdout (it appends
    // .png to the file descriptor so tries to open fd://0.png instead of fd://0 and filing
    // a bug and submitting a patch is just too complex), perform raster conversion via a
    // tmp file:
    //
    tmp.tmpName(function (err, path) {

      if(err) {
        if( callback ) callback(err)
        return false
      }

      var args = [
        formatFlag,
        '-r',options.resolution,
        '-singlefile',
        '-',
        path
      ]

      if( format==='png' && options.transparent ) args.unshift('-transp')

      var converter = spawn('pdftocairo', args, {stdio: ['pipe',null,errorDest]})

      if( errorDest ) {
        converter.stderr.pipe(options.stderr)
      }

      pdfStream.pipe(converter.stdin)

      converter.on('exit',function(code,signal) {

        try {
          var tmpName = path + outputExtensions[format]
          var readStream = fs.createReadStream(tmpName)

          readStream.pipe(outputStream)

          readStream.on('end',function() {
            fs.unlink(tmpName,function(err) {
              if(callback) {
                if(err) {
                  callback( err )
                } else {
                  callback( null, outputStream ) // Success! Exit cleanly (no return value)
                }
              }
            })
          })
        } catch(e) {
          fs.unlink(tmpName,function(err) {
            if(callback) callback(e)
          })
        }

      })

    });

  } else {

    var converter = spawn('pdftocairo',[
      formatFlag,
      '-',
      '-'
    ],{stdio: ['pipe','pipe',errorDest]})

    // Send the input pdf into the converter:
    pdfStream.pipe(converter.stdin)

    // Send the output to a stream:
    converter.stdout.pipe(outputStream)

    // If error destination specified, send convert stderr to that stream:
    if( errorDest ) {
      converter.stderr.pipe(options.stderr)
    }

    converter.on('exit',function(code,signal) {
      if(callback) {
        if( code === 0 ) {
          callback( null, outputStream ) // Success! Exit cleanly (no return value)
        } else {
          callback( new Error('pdftocairo: exited with status ' + code) )
        }
      }
    })

  }

  return true
}
