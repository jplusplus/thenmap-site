const express = require('express')
const favicon = require('serve-favicon')
const request = require('request')

let app = express()

app.set('view engine', 'pug')
app.set('views', __dirname + '/views')

app.use ((req, res, next) => {
  // redirect http->https
  if (req.secure || (app.get('env') === 'development')) {
    return next()
  } else {
    res.redirect('https://' + req.headers.host + req.url)
    return
  }
})

app.use(express.static('static'))
app.use(favicon(__dirname + '/static/favicons/favicon.ico'))

const availableDatasets = {
  'world-2' : "World (nations)",
  'se-4': "Sweden (counties)",
  'se-7': "Sweden (municipalities)",
  'no-4': "Norway (counties)",
  'no-7': "Norway (municipalities)",
  'fi-8': "Finland (municipalities)",
  'us-4': "United States (states)",
  'gl-7': "Greenland (municipalities)",
  'ch-8': "Switzerland (municipalities)",
  'dk-7': "Denmark (municipalities)",
}

app.get('/demo', function(req, res, next) {

  if ((req.query.dataset) && (req.query.dataset in availableDatasets)) {
    var dataset = req.query.dataset
  } else {
    var dataset = Object.keys(availableDatasets)[0]
  }

  if (req.query.date){
    var date = new Date(req.query.date).toISOString()
  } else {
    var date = new Date().toISOString()
  }
  date = date.split("T")[0]

  if (app.get('env') === 'development') {
    var apiUrl = `http://localhost:3000/v2/${dataset}/info/${date}`
  } else {
    var apiUrl = `http://api.thenmap.net/v2/${dataset}/info/${date}`
  }

  request(apiUrl, function (error, response, body) {
    if (error) {
      console.log(error)
      return next(error)
    }

    let datasetInfo = JSON.parse(body)

    if (req.query.language && (datasetInfo.languages.includes(req.query.language))) {
      var activeLanguage = req.query.language
    } else {
      var activeLanguage = datasetInfo.defaultLanguage
    }

    let projection = req.query.projection || datasetInfo.recommendedProjections[0]
    if (!datasetInfo.recommendedProjections.includes(projection)){
      if (!req.query.allow_all){
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
        "svg_proj="+projection,
        "svg_width="+(req.query.width || "900"),
        "svg_height="+(req.query.height || "900")].join("&"),
    })
  })

})

app.get('/clean', function(req, res) {
    res.render('clean',{
    activeDataset: req.query.dataset,
    date: req.query.date,
    width: req.query.svg_width || "900",
    height: req.query.svg_height || "900",
    activeDatakey: req.query.dataKey || "",
    activeLanguage: req.query.language,
    requestedProjection: req.query.svg_proj,
  })
})

app.get('/svg', function(req, res) {
  // DEPRACATED: The API now delivers SVG directly, so this can be removed
  let queryString = [
    "language="+req.query.language,
    "svg_proj="+req.query.svg_proj,
    "svg_width="+(req.query.width || "900"),
    "svg_height="+(req.query.height || "900")].join("&")
  if (app.get('env') === 'development') {
    var apiUrl = `http://localhost:3000/v2/${req.query.dataset}/svg/${req.query.date}?${queryString}`
  } else {
    var apiUrl = `http://api.thenmap.net/v2/${req.query.dataset}/svg/${req.query.date}?${queryString}`
  }
  request(apiUrl, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      res.setHeader('Content-Type', 'image/svg+xml')
      res.end(body)
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
let server = app.listen(process.env.PORT || 3001, function() {

  let host = server.address().address
  let port = server.address().port
  console.log('Thenmap site listening at http://%s:%s in %s mode', host, port, app.get('env'))

})
