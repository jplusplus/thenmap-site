'use strict'

var express = require('express')
var favicon = require('serve-favicon')
var request = require('request')
var textFunctions = require('./lib/text-functions')("en-GB")

var app = express()
app.set('view engine', 'jade')
app.set('views', __dirname + '/views')

app.use(express.static('static'))
app.use(favicon(__dirname + '/static/favicons/favicon.ico'))

var availableDatasets = ['world-2', 'se-4', 'se-7', 'no-7', 'fi-8', 'us-4', 'gl-7', 'ch-8', 'dk-7']
app.get('/demo', function(req, res) {

  if (req.query.dataset && (availableDatasets.indexOf(req.query.dataset) > -1)){
  	var dataset = req.query.dataset
  } else {
	var dataset = availableDatasets[0]
  }

  if (req.query.date){
  	var date = new Date(req.query.date).toISOString()
  } else {
	var date = new Date().toISOString()
  }
  date = date.split("T")[0]

  if (app.get('env') === 'development') {
    var apiUrl = "http://localhost:3000/v1/" + dataset + "/info"
  } else {
    var apiUrl = "http://api.thenmap.net/v1/" + dataset + "/info"
  }
  request(apiUrl, function (error, response, body) {
    if (!error && response.statusCode == 200) {

      var datasetInfo = JSON.parse(body).info

	  if (req.query.language && (datasetInfo.languages.indexOf(req.query.language) > -1)){
	  	var activeLanguage = req.query.language
	  } else {
		var activeLanguage = datasetInfo.defaultLanguage
	  }
    var projection = req.query.projection || datasetInfo.recommendedProjections[0]
    if (datasetInfo.recommendedProjections.indexOf(projection) === -1){
      if (req.query.allow_all){

      } else {
        projection = datasetInfo.recommendedProjections[0]
      }
    }
      res.render('demo',{
  	    availableDatasets: availableDatasets,
  	    activeDataset: dataset,
  	    datasetInfo: datasetInfo,
  	    date: date,
        width: req.query.width || "900",
        height: req.query.height || "900",
        activeDatakey: req.query.dataKey || "",
  	    activeLanguage: activeLanguage,
  	    requestedProjection: projection,
        env: app.get('env'),
        allow_all: req.query.allow_all || "",
        queryString: [
          "dataKey="+(req.query.dataKey || ""),
          "dataset="+dataset,
          "date="+date,
          "language="+activeLanguage,
          "projection="+projection,
          "width="+(req.query.width || "900"),
          "height="+(req.query.height || "900")].join("&"),
        t: textFunctions,
      })
    }
  })

})

app.get('/clean', function(req, res) {
    res.render('clean',{
    activeDataset: req.query.dataset,
    date: req.query.date,
    width: req.query.width || "900",
    height: req.query.height || "900",
    activeDatakey: req.query.dataKey || "",
    activeLanguage: req.query.language,
    requestedProjection: req.query.projection,
  })
})

app.get('/svg', function(req, res) {
  var queryString = [
    "language="+req.query.language,
    "projection="+req.query.projection,
    "width="+(req.query.width || "900"),
    "height="+(req.query.height || "900")].join("&")
  if (app.get('env') === 'development') {
    var apiUrl = "http://localhost:3000/v1/" + req.query.dataset + "/svg/" + req.query.date
  } else {
    var apiUrl = "http://api.thenmap.net/v1/" + req.query.dataset + "/svg/" + req.query.date
  }
  request(apiUrl, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      res.setHeader('Content-Type', 'aimage/svg+xml');
      res.end(JSON.parse(body).svg)
    }
  })

})

app.get('/', function(req, res) {
  res.render('index')
})

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
