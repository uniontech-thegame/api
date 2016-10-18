const rp = require('request-promise')

const notify = (body) => {
  const options = {
    method: 'POST',
    uri: process.env.SLACK_HOOK,
    body,
    json: true
  }

  return rp(options)
}

const getColor = (object) => {
  let team
  switch (object.team) {
    case 'Jaune':
      team = ':yellow_heart: Jaune'
      break
    case 'Bleu':
      team = ':blue_heart: Bleu'
      break
    case 'Vert':
      team = ':green_heart: Vert'
      break
    case 'Rouge':
      team = ':heart: Rouge'
      break
  }

  return team
}

const notifyGift = (gift) => {
  const body = {
    'icon_url': 'https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678132-gift-64.png',
    'text': "Un cadeau vient d'être ouvert.",
    'attachments': [{
      'fallback': "Voir sur PC pour plus d'informations",
      'text': 'Informations sur le cadeau',
      'color': '#f1c40f',
      'fields': [
        {
          'title': 'Prénom',
          'value': gift.name.first,
          'short': true
        },
        {
          'title': 'Nom',
          'value': gift.name.last,
          'short': true
        },
        {
          'title': 'E-mail',
          'value': gift.email,
          'short': true
        },
        {
          'title': 'Équipe',
          'value': getColor(gift),
          'short': true
        },
        {
          'title': 'Code',
          'value': gift.code,
          'short': true
        },
        {
          'title': 'Description',
          'value': gift.description,
          'short': false
        }
      ]
    }]
  }

  return notify(body)
}

const notifyEnigma = (enigma) => {
  const body = {
    'icon_url': 'https://cdn2.iconfinder.com/data/icons/mixed-rounded-flat-icon/512/magnifier_glass-64.png',
    'text': "Une énigme vient d'être résolue.",
    'attachments': [{
      'fallback': "Voir sur PC pour plus d'informations",
      'text': "Informations sur l'énigme",
      'color': '#334d5c',
      'fields': [
        {
          'title': 'Prénom',
          'value': enigma.name.first,
          'short': true
        },
        {
          'title': 'Nom',
          'value': enigma.name.last,
          'short': true
        },
        {
          'title': 'E-mail',
          'value': enigma.email,
          'short': true
        },
        {
          'title': 'Équipe',
          'value': getColor(enigma),
          'short': true
        },
        {
          'title': 'Code',
          'value': enigma.code,
          'short': true
        },
        {
          'title': 'Réponse',
          'value': enigma.answer,
          'short': true
        },
        {
          'title': 'Description',
          'value': enigma.description,
          'short': false
        }
      ]
    }]
  }

  return notify(body)
}

module.exports = {
  notifyGift,
  notifyEnigma
}
