'use strict'

const express = require('express')
const db = require('./db')
const notifications = require('./notifications')

const router = express.Router()

router.get('/health', function onIndex (req, res) {
  res.send('Healthy')
})

router.get('/', function onIndex (req, res) {
  res.send("Ceci est l'API UNION'TECH: The Game.")
})

router.get('/teams', function (req, res) {
  const toReturn = { teams: {} }
  db.many(`
    SELECT q.name, SUM(q.points) AS points FROM (
      SELECT t.name, 0 as points FROM teams t
      UNION
      SELECT g.team_name, g.points FROM gifts g WHERE g.team_name IS NOT NULL
      UNION
      SELECT e.team_name, e.points FROM enigmas e WHERE e.team_name IS NOT NULL
      UNION
      SELECT a.team_name, a.points FROM activities_results a
    ) q GROUP BY q.name ORDER BY points DESC
  `).then((teams) => {
    for (let team of teams) {
      toReturn.teams[team.name] = {
        points: parseInt(team.points, 10),
        players: [],
        activities_results: [],
        gifts: [],
        enigmas: []
      }
    }

    return db.many(`
      SELECT * FROM players WHERE team_name IS NOT NULL ORDER BY semester ASC, last_name ASC
    `)
  }).then((players) => {
    for (let player of players) {
      toReturn.teams[player.team_name].players.push({
        name: {
          first: player.first_name,
          last: player.last_name
        },
        semester: player.semester
      })
    }

    return db.any(`
      SELECT g.team_name, g.code, g.description, g.points, g.redeem_date, p.first_name, p.last_name, p.semester from gifts g INNER JOIN players p ON p.email = g.player_email WHERE g.team_name IS NOT NULL ORDER BY g.redeem_date DESC
    `)
  }).then((gifts) => {
    for (let gift of gifts) {
      toReturn.teams[gift.team_name].gifts.push({
        code: gift.code,
        description: gift.description,
        points: gift.points,
        redeem_date: gift.redeem_date,
        player: {
          name: {
            first: gift.first_name,
            last: gift.last_name
          },
          semester: gift.semester
        }
      })
    }

    return db.any(`
      SELECT e.team_name, e.code, e.answer, e.description, e.points, e.redeem_date, p.first_name, p.last_name, p.semester FROM enigmas e INNER JOIN players p ON p.email = e.player_email WHERE e.team_name IS NOT NULL ORDER BY e.redeem_date DESC
    `)
  }).then((enigmas) => {
    for (let enigma of enigmas) {
      toReturn.teams[enigma.team_name].enigmas.push({
        code: enigma.code,
        answer: enigma.answer,
        description: enigma.description,
        points: enigma.points,
        redeem_date: enigma.redeem_date,
        player: {
          name: {
            first: enigma.first_name,
            last: enigma.last_name
          },
          semester: enigma.semester
        }
      })
    }

    return db.any(`
      SELECT a.team_name, a.title, a.description, a.points, a.date FROM activities_results a ORDER BY a.date DESC
    `)
  }).then((activities_results) => {
    for (let activity_result of activities_results) {
      toReturn.teams[activity_result.team_name].activities_results.push({
        title: activity_result.title,
        description: activity_result.description,
        points: activity_result.points,
        date: activity_result.date
      })
    }

    res.json(toReturn)
  }).catch((err) => {
    res.status(500).json({ error: `Error in database: ${err.message}` })
  })
})

const checkRedeem = (req, res, next) => {
  if (!req.body.recipientTeam) return res.status(400).json({ error: 'Missing or invalid recipientTeam parameter' })
  if (!req.body.email) return res.status(400).json({ error: 'Missing or invalid email parameter' })
  if (!req.body.code) return res.status(400).json({ error: 'Missing or invalid code parameter' })

  req.notification = {
    email: req.body.email,
    code: req.body.code
  }

  let aborted = false
  db.oneOrNone(`
    SELECT * FROM players WHERE team_name IS NOT NULL AND email = $1
  `, [req.body.email]).then((user) => {
    if (!user) {
      aborted = true
      return res.json({ status: 'PLAYER_NOT_EXISTING' })
    }

    req.notification.name = {
      first: user.first_name,
      last: user.last_name
    }

    return db.oneOrNone(`
      SELECT * FROM teams WHERE name = $1
    `, [req.body.recipientTeam])
  }).then((team) => {
    if (aborted) return
    if (!team) return res.json({ status: 'TEAM_NOT_EXISTING' })

    req.notification.team = team.name

    next()
  }).catch((err) => {
    res.status(500).json({ error: `Error in database: ${err.message}` })
  })
}

router.post('/redeem/enigma', checkRedeem, function (req, res) {
  if (!req.body.answer) return res.status(400).json({ error: 'Missing or invalid answer parameter' })

  req.notification.answer = req.body.answer

  let aborted = true
  db.oneOrNone(`
    SELECT * FROM enigmas WHERE code = $1
  `, [req.body.code]).then((enigma) => {
    if (!enigma) return res.json({ status: 'NOT_FOUND' })
    if (enigma.answer !== req.body.answer) return res.json({ status: 'BAD_ANSWER' })
    if (enigma.team_name) return res.json({ status: 'USED' })

    req.notification.description = enigma.description
    aborted = false

    return db.none(`
      UPDATE enigmas SET team_name = $1, player_email = $2, redeem_date = $3 WHERE code = $4
    `, [req.body.recipientTeam, req.body.email, new Date(), req.body.code])
  }).then(() => {
    if (aborted) return
    res.json({ status: 'OK' })
  }).then(() => {
    if (aborted) return
    return notifications.notifyEnigma(req.notification)
  }).catch((err) => {
    if (aborted) return
    res.status(500).json({ error: `Error in database: ${err.message}` })
  })
})

router.post('/redeem/gift', checkRedeem, function (req, res) {
  let aborted = true
  db.oneOrNone(`
    SELECT * FROM gifts WHERE code = $1
  `, [req.body.code]).then((gift) => {
    if (!gift) return res.json({ status: 'NOT_FOUND' })
    if (gift.team_name) return res.json({ status: 'USED' })

    req.notification.description = gift.description
    aborted = false

    return db.none(`
      UPDATE gifts SET team_name = $1, player_email = $2, redeem_date = $3 WHERE code = $4
    `, [req.body.recipientTeam, req.body.email, new Date(), req.body.code])
  }).then(() => {
    if (aborted) return
    res.json({ status: 'OK' })
  }).then(() => {
    if (aborted) return
    return notifications.notifyGift(req.notification)
  }).catch((err) => {
    res.status(500).json({ error: `Error in database: ${err.message}` })
  })
})

module.exports = router
