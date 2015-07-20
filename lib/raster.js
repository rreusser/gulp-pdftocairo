'use strict'

var tmp = require('tmp')
  , spawn = require('child_process').spawn
  , streamifier = require('streamifier')
  , fs = require('fs')
  , utils = require('./utils')

module.exports = convertRaster

//
// Due to a bug in the way pdftocairo handles raster output with stdout (it appends
// .png to the infile descriptor so tries to open fd://0.png instead of fd://0 and filing
// a bug and submitting a patch is just too complex), perform raster conversion via a
// tmp infile:
//
function convertRaster( outputStream, infile, outfile, formatFlag, options, cb) {

  var errBuffer = new Buffer('')
  var tmpName


  tmp.tmpName(function (err, path) {

    if(err) {
      outputStream.emit('error','gulp-pdftocairo: failed to create tmp directory')
      cb()
      return
    }

    var args = [
      formatFlag,
      '-r',options.resolution,
      '-singlefile',
      '-',
      path
    ]

    if( options.format==='png' && options.transparent ) args.unshift('-transp')

    var pdftocairo = spawn(options.command, args, {stdio: ['pipe',null,'pipe']})

    pdftocairo.stderr.on('data',function(chunk) {
      errBuffer = Buffer.concat([errBuffer,chunk])
    })

    streamifier.createReadStream(infile.contents).pipe(pdftocairo.stdin)

    function handleError( err ) {
      outputStream.emit('error','gulp-pdftocairo: '+err)
      cb()
    }
    pdftocairo.on('exit',function(code,signal) {
      if( code === 0 ) {

        tmpName = path + utils.outputExtensions[options.format]

        fs.readFile(tmpName,function(err,data) {

          if(err) {
            handleError(err)
            return
          }

          fs.unlink(tmpName,function(err) {
            if(err) {
              handleError(err)
              return
            }
            outfile.contents = data
            outputStream.push(outfile)
            cb()
          })
        })
      } else {
        handleError( errBuffer )
      }

    })

  });

}
