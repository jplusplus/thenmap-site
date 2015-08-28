'use strict'

var express = require('express')

var app = express()
app.set('view engine', 'jade')
app.set('views', __dirname + '/views')

app.get('/', function (req, res) {
  res.render('index',
  { title : 'Home' }
  )
})

app.get('/', function(req, res) {
  res.render('index')
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
