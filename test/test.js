'use strict'

var assert = require('chai').assert,
    pdftocairo = require('../lib'),
    fs = require('fs'),
    stream = require('stream'),
    mkdirp = require('mkdirp'),
    path = require('path'),
    promisify = require('es6-promisify')


mkdirp.sync(path.join(__dirname,'tmp'))


describe( "pdftocairo", function() {

  var pdfStream,errorStream,garbageStream,errorBuffer,outputBuffer, outputStream

  beforeEach(function() {
    pdfStream = fs.createReadStream('test/fixtures/x-plus-y.pdf')
    garbageStream = fs.createReadStream('test/fixtures/nonsense.pdf')

    outputBuffer = ''
    outputStream = new stream.Writable()
    outputStream._write = function(chunk, encoding, done) {
      outputBuffer += chunk.toString()
      done()
    }

    errorBuffer = ''
    errorStream = new stream.Writable();
    errorStream._write = function (chunk, encoding, done) {
      errorBuffer += chunk.toString()
      done();
    };
  })

  it("converts a pdf to an svg",function(done) {
    pdftocairo( pdfStream, outputStream, {format: 'svg', stderr: errorStream}, function( err, result ) {
      assert.isNull( err, 'callback err is null' )
      assert.equal( result, outputStream, 'callback result is the output stream' )
      assert.match( outputBuffer, /^<svg/m, 'output appears to be an svg document' )
      done()
    })
  })

  it("converts a pdf to eps",function(done) {
    pdftocairo( pdfStream, outputStream, {format: 'eps', stderr: errorStream}, function( err, result ) {
      assert.isNull( err, 'callback err is null' )
      assert.equal( result, outputStream, 'callback result is the output stream' )
      assert.match( outputBuffer, /^%!PS-Adobe-.* EPSF-.*$/m, 'output appears to be an eps document' )
      done()
    })
  })

  it("converts a pdf to ps",function(done) {
    pdftocairo( pdfStream, outputStream, {format: 'ps', stderr: errorStream}, function( err, result ) {
      assert.isNull( err, 'callback err is null' )
      assert.equal( result, outputStream, 'callback result is the output stream' )
      assert.match( outputBuffer, /^%!PS-Adobe-.*$/m, 'output appears to be an eps document' )
      done()
    })
  })

  it("converts a pdf to a png",function(done) {
    pdftocairo( pdfStream, outputStream, {format: 'png'}, function( err, result ) {
      assert.match(outputBuffer,/.PNG/m,'appears to be a png')
      done()
    })
  })

  it("converts a pdf to jpeg",function(done) {
    pdftocairo( pdfStream, outputStream, {format: 'jpeg', stderr: errorStream}, function( code, signal ) {
      assert.match(outputBuffer,/.{0,10}JFIF/m,'appears to be a jpeg')
      done()
    })
  })


  it("fails on non-pdf input",function(done) {
    pdftocairo( garbageStream, outputStream, {format: 'svg', stderr: errorStream}, function( err, result ) {
      assert.throw(function() { if( err ) throw err }, Error, /pdftocairo: exited with status/ )
      assert.match( errorBuffer, /Syntax Error/, 'returns a syntax error' )
      done()
    })
  })

  it('returns true if initial call succeeded', function(done) {
    assert( pdftocairo( pdfStream, outputStream, {format: 'svg'}, function() {
      done()
    }), 'returns true')
  })

  it('returns false and callback has error if no output format specified',function(done) {
    function errCallback( err, result ) {
      assert.throw(function() { if(err) throw err }, Error, /pdftocairo: output format not specified/)
      done()
    }

    assert.isFalse( pdftocairo( pdfStream, outputStream, {}, errCallback ), 'returns false' )

  })

  it('returns false and callback has error if output format not valid',function(done) {

    function errCallback( err, result ) {
      assert.throw(function() { if(err) throw err }, Error, /pdftocairo: output format not valid/)
      done()
    }
    assert.isFalse( pdftocairo( pdfStream, outputStream, {format: 'ppm'}, errCallback) )
  })

  it('accepts an error stream',function(done) {
    pdftocairo( garbageStream, outputStream, {format: 'svg', stderr: errorStream}, function() {
      assert.match( errorBuffer, /Error opening PDF file/m, 'outputs a syntax error' )
      done()
    })
  })

  it('promisifies well with success',function(done) {
    promisify(pdftocairo)( pdfStream, outputStream, {format: 'svg'} ).then(function(result) {
      setTimeout(function() {
        assert.equal( result,outputStream )
        done()
      })
    },function() {
      setTimeout(function() {
        assert(false, 'rejected when it should have resolved')
        done()
      })
    })
  })

  it('promisifies well with error',function(done) {
    promisify(pdftocairo)( garbageStream, outputStream, {format: 'svg'} ).then(function(result) {
      // Yeesh, is this really the way to raise an exception to a level mocha is concerned about?
      setTimeout(function() {
        assert(false, 'resolved when it should have rejected')
        done()
      })
    },function(err) {
      setTimeout(function() {
        assert(true)
        done()
      })
    })
  })



})
