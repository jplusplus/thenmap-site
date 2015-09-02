'use strict'

var express = require('express')
var favicon = require('serve-favicon');

var app = express()
app.set('view engine', 'jade')
app.set('views', __dirname + '/views')

app.use(express.static('static'))
app.use(favicon(__dirname + '/static/favicons/favicon.ico'))

app.get('/', function(req, res) {
  res.render('index')
})

/*app.get('/demo', function(req, res) {
  res.render('demo')
})*/

// Errors
app.use(function(req, res, next) {
  res.status(404).send('Sorry, can\'t find that!')
})

//Start server
var server = app.listen(process.env.PORT || 3001, function() {

  var host = server.address().address
  var port = server.address().port

  console.log('Thenmap site listening at http://%s:%s', host, port)

})
