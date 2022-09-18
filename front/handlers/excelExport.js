const xl = require('excel4node')
const path = require('path')
const rootFolder = path.join(__dirname, '../../')
const { getEpci } = require(path.join(rootFolder, './calculations/epcis'))
const { getStocks } = require(path.join(rootFolder, './calculations/stocks'))
const { getAnnualFluxes } = require(path.join(rootFolder, './calculations/flux'))
const { GroundTypes } = require(path.join(rootFolder, './calculations/constants'))
const { parseOptionsFromQuery } = require('./options')

async function excelExportHandler (req, res) {
  // prepare data
  const epci = await getEpci(req.query.epci) || {}
  if (!epci.code) {
    res.status(404)
    return
  }
  const options = parseOptionsFromQuery(req.query)
  const stocks = await getStocks({ epci }, options)
  const flux = getAnnualFluxes({ epci }, options)

  // prepare export
  const wb = new xl.Workbook()
  const ws = wb.addWorksheet('Tableau de bord')
  const borderStyle = {
    style: 'thin',
    color: 'black'
  }
  const outlinedCell = {
    left: borderStyle,
    right: borderStyle,
    top: borderStyle,
    bottom: borderStyle
  }
  const headerTextStyle = wb.createStyle({
    font: {
      bold: true
    },
    border: outlinedCell,
    alignment: {
      shrinkToFit: true
    }
  })
  const rowHeaderTextStyle = wb.createStyle({
    font: {
      bold: true
    },
    border: {
      left: borderStyle,
      right: borderStyle
    }
  })
  const number2dpStyle = wb.createStyle({
    numberFormat: '##0.00',
    border: outlinedCell
  })
  const integerStyle = wb.createStyle({
    numberFormat: '###,##0'
  })

  // easier to move around if everything is relative
  let row = 1
  const startColumn = 1
  const secondColumn = startColumn + 1
  const thirdColumn = startColumn + 2
  ws.cell(row, startColumn)
    .string('Description')
  row++
  ws.cell(row, secondColumn)
    .string('Nom')
  ws.cell(row, thirdColumn)
    .string(epci.nom)
  row++
  ws.cell(row, secondColumn)
    .string('SIREN')
  ws.cell(row, thirdColumn)
    .string(epci.code)
  row++
  ws.cell(row, secondColumn)
    .string('Lien')
  ws.cell(row, thirdColumn)
    .link(`${process.env.PROTOCOL.toLowerCase()}://${process.env.HOSTNAME}/territoire${req._parsedUrl.search}`, 'Outil Aldo en ligne')
  row++
  ws.cell(row, secondColumn)
    .string('Date d\'export')
  ws.cell(row, thirdColumn)
    .date(new Date())
  row++
  ws.cell(row, secondColumn)
    .string('Communes')
  if (epci.membres?.length) {
    epci.membres.forEach(commune => {
      ws.cell(row, thirdColumn)
        .string(commune.nom)
      row++
    })
  }

  // user configuration TODO
  row++
  ws.cell(row, startColumn).string('Configuration utilisateur')
  row++
  row++

  // stocks
  ws.cell(row, startColumn).string('Résultats stocks de carbone')
  row++
  ws.cell(row, secondColumn).string('Occupation du sol')
  ws.cell(row, thirdColumn).string('Surface (ha)')
  ws.cell(row, thirdColumn + 1).string('Stocks carbone (tC)')
  ws.cell(row, thirdColumn + 2).string('Stocks (%)')
  ws.cell(row, thirdColumn + 3).string('Modifié par l\'utilisateur ?')
  row++

  const parentGroundTypes = GroundTypes.filter((gt) => !gt.parentType)
  parentGroundTypes.forEach((gt, idx) => {
    ws.cell(row, secondColumn).string(gt.name)
    const stock = stocks[gt.stocksId]
    if (stock.area) {
      ws.cell(row, thirdColumn).number(stock.area)
    }
    if (stock.totalStock) {
      ws.cell(row, thirdColumn + 1).number(stock.totalStock)
    }
    if (stock.stockPercentage) {
      ws.cell(row, thirdColumn + 2).number(stock.stockPercentage)
    }
    ws.cell(row, thirdColumn + 3).bool(!!stock.hasModifications)
    row++
  })
  row++

  // flux
  ws.cell(row, startColumn).string('Résultats flux de carbone')
  row++
  ws.cell(row, secondColumn).string('Occupation du sol finale')
  ws.cell(row, thirdColumn).string('Séquestration (tCO2e / an)')
  ws.cell(row, thirdColumn + 2).string('Modifié par l\'utilisateur ?')
  row++

  parentGroundTypes.forEach((gt, idx) => {
    if (gt.stocksId === 'haies') return
    ws.cell(row, secondColumn).string(gt.name)
    const fluxSummary = flux?.summary[gt.stocksId]
    if (fluxSummary) {
      const sequestration = fluxSummary.totalSequestration
      ws.cell(row, thirdColumn).number(sequestration || 0)
      // comparing to 0.5 because number is rounded to integer
      const isSequestration = sequestration > 0.5
      const isEmission = sequestration < -0.5
      const directionCell = ws.cell(row, thirdColumn + 1)
        .style({
          font: {
            color: isSequestration ? '#1f8d49' : '#e1000f'
          },
          border: {
            right: borderStyle
          }
        })
      if (isSequestration || isEmission) {
        directionCell
          .string(isSequestration ? 'séquestration' : 'émission')
      }
      ws.cell(row, thirdColumn + 2).bool(!!fluxSummary.hasModifications)
    }
    row++
  })

  // Resultats_format_Cadre_de_depot_PCAET
  row++
  ws.cell(row, startColumn).string('Resultats_format_Cadre_de_depot_PCAET')
  row++
  ws.cell(row, secondColumn).string('Partie 2 - Données sur la séquestration de dioxyde de carbone')
  row++
  ws.cell(row, secondColumn).string('Diagnostic en tenant compte des changements d’affectation des terres (Facultatif pour le cadre de dépôt)')
  row++
  ws.cell(row, secondColumn).string('Estimation de la séquestration nette de dioxyde de carbone en TeqCO2')
  ws.cell(row, thirdColumn).string('Séquestration nette de dioxyde de carbone en TeqCO2')
  ws.cell(row, thirdColumn + 1).string('Année de référence')
  row++
  ws.cell(row, secondColumn).string('Forêt')
  ws.cell(row, thirdColumn).number(0) // TODO: formula
  ws.cell(row, thirdColumn + 1).number(2018)
  row++
  ws.cell(row, secondColumn).string('Sols agricoles (terres cultivées et prairies)')
  ws.cell(row, thirdColumn).number(0) // TODO: formula
  ws.cell(row, thirdColumn + 1).number(2018)
  row++
  ws.cell(row, secondColumn).string('Autres sols')
  ws.cell(row, thirdColumn).number(0) // TODO: formula
  ws.cell(row, thirdColumn + 1).number(2018)
  row++
  // TODO: italicise
  ws.cell(row, secondColumn).string('Produits bois (hors cadre de dépôt)')
  ws.cell(row, thirdColumn).number(0) // TODO: formula
  ws.cell(row, thirdColumn + 1).number(2018)
  row++

  // Occupation du sol (ha) du territoire en 2018 :
  row++
  ws.cell(row, startColumn).string('Occupation du sol (ha) du territoire en 2018 :')
  row++
  const childGroundTypes = GroundTypes.filter((gt) => !gt.chilren)
  childGroundTypes.forEach((gt, idx) => {
    ws.cell(row, secondColumn).string(gt.name)
    const stock = stocks[gt.stocksId]
    if (stock.area) {
      ws.cell(row, thirdColumn).number(stock.area)
    }
    row++
  })
  row++

  // Changements d'occupation du sol annuel moyen (ha/an) du territoire entre 2012 et 2018 :
  row++
  ws.cell(row, startColumn).string('Changements d\'occupation du sol annuel moyen (ha/an) du territoire entre 2012 et 2018 :')
  row++
  ws.cell(row, thirdColumn).string('Occupation de sol finale')
  row++
  ws.cell(row, secondColumn).string('Occupation de sol initiale')
  const fluxGroundTypes = []
  GroundTypes.forEach(gt => {
    if (gt.altFluxId || gt.fluxId) {
      fluxGroundTypes.push(gt)
    }
  })
  fluxGroundTypes.forEach((gt, idx) => {
    ws.cell(row, thirdColumn + idx).string(gt.name)
  })
  row++
  fluxGroundTypes.forEach((gtInitial, idx) => {
    ws.cell(row, secondColumn).string(gtInitial.name)
    fluxGroundTypes.forEach((gtFinal, idxFinal) => {
      const thisFlux = flux.allFlux.filter(f => f.from === gtInitial.stocksId && f.to === gtFinal.stocksId && f.gas === 'C')
      if (thisFlux.length && thisFlux[0].area) {
        ws.cell(row, thirdColumn + idxFinal).number(thisFlux[0].area)
      }
    })
    row++
  })
  // Flux unitaire de référence (tCO2e/ha/an) du territoire :
  row++
  ws.cell(row, startColumn).string('Flux unitaire de référence (tCO2e/ha/an) du territoire :')
  row++
  ws.cell(row, thirdColumn).string('Occupation de sol finale')
  row++
  ws.cell(row, secondColumn).string('Occupation de sol initiale')
  fluxGroundTypes.forEach((gt, idx) => {
    ws.cell(row, thirdColumn + idx).string(gt.name)
  })
  row++
  fluxGroundTypes.forEach((gtInitial, idx) => {
    ws.cell(row, secondColumn).string(gtInitial.name)
    fluxGroundTypes.forEach((gtFinal, idxFinal) => {
      const thisFlux = flux.allFlux.filter(f => f.from === gtInitial.stocksId && f.to === gtFinal.stocksId && f.gas === 'C')
      if (thisFlux.length && thisFlux[0].flux) {
        ws.cell(row, thirdColumn + idxFinal).number(thisFlux[0].flux)
      }
    })
    row++
  })

  // Flux de carbone annuel moyen (tCO2e/an) du territoire entre 2012 et 2018 :
  row++
  ws.cell(row, startColumn).string('Flux unitaire de référence (tCO2e/ha/an) du territoire :')
  row++
  ws.cell(row, thirdColumn).string('Occupation de sol finale')
  row++
  ws.cell(row, secondColumn).string('Occupation de sol initiale')
  fluxGroundTypes.forEach((gt, idx) => {
    ws.cell(row, thirdColumn + idx).string(gt.name)
  })
  row++
  fluxGroundTypes.forEach((gtInitial, idx) => {
    ws.cell(row, secondColumn).string(gtInitial.name)
    fluxGroundTypes.forEach((gtFinal, idxFinal) => {
      const thisFlux = flux.allFlux.filter(f => f.from === gtInitial.stocksId && f.to === gtFinal.stocksId && f.gas === 'C')
      if (thisFlux.length && thisFlux[0].co2e) {
        ws.cell(row, thirdColumn + idxFinal).number(thisFlux[0].co2e)
      }
    })
    row++
  })

  wb.write(`${epci.nom}.xlsx`, res)
}

module.exports = {
  excelExportHandler
}
