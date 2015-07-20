'use strict'

var pdftocairo = require('../lib'),
    path = require('path'),
    fs = require('fs')

var formats = ['svg','jpeg','eps','ps','png']

for(var i=0; i<formats.length; i++) {

  var format = formats[i]

  var input = fs.createReadStream(path.join(__dirname,'..','test','fixtures','x-plus-y.pdf'))
  var output = fs.createWriteStream(path.join(__dirname,'output.' + format))

  pdftocairo(input, output, {format: format})
}
