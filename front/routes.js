
const express = require('express')
const router = express.Router()
const path = require('path')
const rootFolder = path.join(__dirname, '../')
const { epciList, getEpci } = require(path.join(rootFolder, './calculations/epcis'))
const { getStocks } = require(path.join(rootFolder, './calculations/stocks'))
const { GroundTypes } = require(path.join(rootFolder, './calculations/constants'))

router.get('/', async (req, res) => {
  res.render('landing', { epcis: await epciList() })
})

router.get('/territoire', async (req,res)=>{
  const epci = await getEpci(req.query.epci) || {}
  let stocks = {};
  if (epci.code) {
    stocks = await getStocks({epci: epci.code})
  } else {
    res.status(404)
  }
  const stocksTotal = Object.values(stocks).reduce((a, b) => a + b, 0)
  res.render('territoire', {
    pageTitle: `${epci.nom || "EPCI pas trouvé"}`,
    epcis: await epciList(),
    epci,
    groundTypes: GroundTypes,
    stocks,
    formatNumber(number) {
      return Math.round(number).toLocaleString()
    },
    // TODO: use once have all stocks calculations in place
    // percent(number) {
    //   return (Math.round(number/stocksTotal*1000)/10).toLocaleString()
    // },
  })
})

router.get('/ressources', (req, res) => {
  res.render('ressources', {
    pageTitle: 'Ressources'
  })
})

router.get('/formulaire', (req, res) => {
  res.render('form', {
    pageTitle: 'Formulaire'
  })
})

router.get('/contact', (req, res) => {
  res.render('contact', {
    pageTitle: 'Contact'
  })
})

router.get('/accessibilite', (req, res) => {
  res.render('accessibilite', {
    pageTitle: 'Accessibilité'
  })
})

router.get('/components', (req, res) => {
  res.render('components', {
    pageTitle: 'Composants'
  })
})

router.get('/colors', (req, res) => {
  res.render('colors', {
    pageTitle: 'Couleurs'
  })
})

router.get('/typography', (req, res) => {
  res.render('typography', {
    pageTitle: 'Typographie'
  })
})

router.get('/mentions-legales', (req, res) => {
  res.render('legalNotice', {
    pageTitle: "Mentions légales",
    contactEmail: 'mon-produit@beta.gouv.fr',
  })
})

module.exports = router
