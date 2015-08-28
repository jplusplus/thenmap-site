'use strict'

var express = require('express')

var app = express()

app.get('/', function(req, res) {
  var fs = require('fs')
  var marked = require('marked')

  fs.readFile("index.md", 'utf-8', function(err, content){
    if (err) {
      return console.log(err);
    }
    res.send(marked(content))

  })
})

// Errors
app.use(function(req, res, next) {
  res.status(404).send('Sorry, can\'t find that!')
})

//Start server
var server = app.listen(process.env.PORT || 3000, function() {

  var host = server.address().address
  var port = server.address().port

  console.log('Thenmap site listening at http://%s:%s', host, port)

})
