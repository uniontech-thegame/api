'use strict'

const pkg = require('./package')
const bodyParser = require('body-parser')
const cors = require('cors')
const express = require('express')
const routes = require('./lib/routes')

const app = express()

if (app.get('env') === 'development') {
  app.set('listening port', 3000)
  app.set('listening ip', '0.0.0.0')
} else if (app.get('env') === 'production') {
  if (!process.env.PORT || !process.env.IP) {
    console.error('Missing PORT or IP')
    process.exit(1)
  }
  app.set('listening port', process.env.PORT)
  app.set('listening ip', process.env.IP)
} else {
  console.error('Wrong NODE_ENV')
  process.exit(1)
}

app.use(cors())
app.use(bodyParser.json())

app.use('/', routes)

app.listen(app.get('listening port'), app.get('listening ip'), function onListen () {
  console.log(`${pkg.name} listening on ${app.get('listening ip')}:${app.get('listening port')}`)
}).on('error', function onError (err) {
  console.error(err)
  process.exit(1)
})
