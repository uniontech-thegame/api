'use strict'

const pgp = require('pg-promise')()

module.exports = pgp({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT, 10),
  database: process.env.DATABASE_DATABASE,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  ssl: (process.env.DATABASE_SSL === 'true'),
  poolSize: parseInt(process.env.DATABASE_MAX_CONNECTIONS, 10)
})
