// TODO: move this file to a folder that both layers can rely on to not completely break
// dependency tree
const { GroundTypes } = require('../calculations/constants')

function getGroundCarbonFluxKey (from, to) {
  const fromDetails = GroundTypes.find(groundType => groundType.stocksId === from)
  const toDetails = GroundTypes.find(groundType => groundType.stocksId === to)
  return `f_${fromDetails.fluxId}_${toDetails.fluxId}_%zpc`
}

function getAnnualGroundCarbonFlux (location, from, to) {
  // to start, deal with some exceptions in flux lookups
  if (from === 'sols artificiels arbustifs') {
    if (to === 'zones humides') return
    // could've chosen any prairie type, they have the same flux
    return getAnnualGroundCarbonFlux(location, 'prairies zones arborées', to)
  } else if (from === 'sols artificiels arborés et buissonants') {
    return getAnnualGroundCarbonFlux(location, 'forêts', to)
  }
  // all vergers/vignes -> sols artificiels X use the flux for vergers/vignes -> cultures instead
  if (to.startsWith('sols')) {
    if (from === 'vergers' || from === 'vignes') {
      return getAnnualGroundCarbonFlux(location, 'cultures', to)
    }
  }
  if (to === 'sols artificiels imperméabilisés') {
    if (from === 'zones humides') {
      return getAnnualGroundCarbonFlux(location, from, 'cultures') + getAnnualGroundCarbonFlux(location, 'cultures', to)
    }
  } else if (to === 'sols artificiels arbustifs') {
    if (from.startsWith('prairies')) {
      return
    } else if (from === 'zones humides') {
      // could've chosen any prairie type, they have the same flux
      return getAnnualGroundCarbonFlux(location, from, 'prairies zones arborées')
    }
  } else if (to === 'sols artificiels arborés et buissonants') {
    if (from.startsWith('forêts')) {
      return
    } else if (from === 'zones humides') {
      return getAnnualGroundCarbonFlux(location, from, 'forêts')
    }
  }
  // normal flux value lookup
  const csvFilePath = './dataByEpci/ground.csv'
  const dataByEpci = require(csvFilePath + '.json')
  const data = dataByEpci.find(data => data.siren === location.epci)
  const dataValue = data[getGroundCarbonFluxKey(from, to)]
  if (dataValue) {
    return parseFloat(dataValue)
  }
}

function getForestLitterFlux (from, to) {
  const relevantTypes = ['forêts', 'sols artificiels arborés et buissonants']
  if (relevantTypes.includes(from) && !relevantTypes.includes(to)) {
    return -9
  } else if (!relevantTypes.includes(from) && relevantTypes.includes(to)) {
    return 9
  }
}

function getBiomassFlux (location, from, to) {
  const csvFilePath = './dataByEpci/biomass-hors-forets.csv'
  const dataByEpci = require(csvFilePath + '.json')
  const data = dataByEpci.find(data => data.siren === location.epci)
  const key = `${from} vers ${to}`
  const dataValue = data[key]
  if (dataValue) {
    return parseFloat(dataValue)
  }
}

function getForestBiomassFlux (location, to) {
  let data
  if (to === 'forêt peupleraie') {
    const csvFilePath = './dataByEpci/biomasse-forets-peupleraies.csv'
    const dataByEpci = require(csvFilePath + '.json')
    data = dataByEpci.find(data => data.siren === location.epci)
  } else {
    const csvFilePath = './dataByEpci/biomass-forets.csv'
    const dataByEpci = require(csvFilePath + '.json')
    const forestType = to.split(' ')[1]
    data = dataByEpci.find(data => data.siren === location.epci && data.type.toLowerCase() === forestType)
  }
  if (!data) {
    console.log(`No biomass data found for forest type '${to}' and epci '${location.epci}'`)
    return
  }
  const dataValue = data['BILAN_CARB (tC∙ha-1∙an-1)']
  if (dataValue) {
    return parseFloat(dataValue)
  }
}

// returns all known fluxes for from - to combinations
// TODO: could make more efficient by opening all the files and finding the location data once
function getAllAnnualFluxes (location, options) {
  const fluxes = []
  for (const fromGt of GroundTypes) {
    const from = fromGt.stocksId
    for (const toGt of GroundTypes) {
      const to = toGt.stocksId
      if (from === to) {
        continue
      }
      if (fromGt.fluxId && toGt.fluxId) {
        const groundFlux = getAnnualGroundCarbonFlux(location, from, to)
        if (groundFlux !== undefined) {
          fluxes.push({
            from,
            to,
            flux: groundFlux,
            fluxEquivalent: cToCo2e(groundFlux),
            reservoir: 'sol',
            gas: 'C'
          })
        }
        const litterFlux = getForestLitterFlux(from, to)
        if (litterFlux !== undefined) {
          fluxes.push({
            from,
            to,
            flux: litterFlux,
            fluxEquivalent: cToCo2e(litterFlux),
            reservoir: 'litière',
            gas: 'C'
          })
        }
      }
      const ignoreBiomass = ['prairies', 'haies', 'forêts']
      if (!ignoreBiomass.includes(from) && !ignoreBiomass.includes(to)) {
        const biomassFlux = getBiomassFlux(location, from, to)
        if (biomassFlux !== undefined) {
          fluxes.push({
            from,
            to,
            flux: biomassFlux,
            fluxEquivalent: cToCo2e(biomassFlux),
            reservoir: 'biomasse',
            gas: 'C'
          })
        }
      }
    }
  }
  const forestTypes = GroundTypes.filter(gt => gt.stocksId.startsWith('forêt '))
  for (const fType of forestTypes) {
    const biomassFlux = getForestBiomassFlux(location, fType.stocksId)
    if (biomassFlux !== undefined) {
      fluxes.push({
        to: fType.stocksId,
        flux: biomassFlux,
        fluxEquivalent: cToCo2e(biomassFlux),
        reservoir: 'biomasse',
        gas: 'C'
      })
    }
  }
  return fluxes
}

function cToCo2e (valueC) {
  return valueC * 44 / 12
}

function getAnnualSurfaceChange (location, options, from, to) {
  if (to.startsWith('forêt ')) {
    return getAnnualForestSurfaceChange(location, to)
  }
  const csvFilePath = './dataByEpci/clc18-change.csv'
  const dataByEpci = require(csvFilePath + '.json')
  const data = dataByEpci.find(data => data.siren === location.epci)
  const fromClcCodes = GroundTypes.find(groundType => groundType.stocksId === from).clcCodes
  const toClcCodes = GroundTypes.find(groundType => groundType.stocksId === to).clcCodes
  let totalAreaChange = 0
  if (!fromClcCodes || !toClcCodes) {
    return 0
  }
  for (const fromCode of fromClcCodes) {
    for (const toCode of toClcCodes) {
      const key = `${fromCode}-${toCode}`
      if (data[key]) {
        totalAreaChange += parseFloat(data[key])
      }
    }
  }
  const yearsBetweenStudies = 6
  const yearlyAreaChange = totalAreaChange / yearsBetweenStudies
  const solsArtificielsExceptions = getSolsArtificielsExceptions(location, options, from, to, yearlyAreaChange)
  if (solsArtificielsExceptions !== undefined) {
    return solsArtificielsExceptions
  }
  return yearlyAreaChange
}

function getAnnualForestSurfaceChange (location, to) {
  const csvFilePath = './dataByEpci/ign19.csv'
  const dataByEpci = require(csvFilePath + '.json')
  const data = dataByEpci.find(data => data.siren === location.epci)
  return parseFloat(data[to.split(' ')[1] + 's'])
}

function getSolsArtificielsExceptions (location, options, from, to, clcAnnualChange) {
  const estimatedPortionImpermeable = options.proportionSolsImpermeables || 0.8
  const estimatedPortionGreen = 1 - estimatedPortionImpermeable
  if (to === 'sols artificiels imperméabilisés') {
    if (from === 'sols artificiels arbustifs') {
      return 0
    }
    const changeSolsArbores = getAnnualSurfaceChange(location, options, from, 'sols artificiels arborés et buissonants')
    const changeArboresAndImpermeables = clcAnnualChange + changeSolsArbores
    if (changeSolsArbores < 0.2 * (changeSolsArbores + changeArboresAndImpermeables * estimatedPortionImpermeable)) {
      return changeArboresAndImpermeables * estimatedPortionImpermeable
    } else {
      return clcAnnualChange
    }
  } else if (to === 'sols artificiels arbustifs') {
    const changeSolsArbores = getAnnualSurfaceChange(location, options, from, 'sols artificiels arborés et buissonants')
    const changeSolsImpermeables = getAnnualSurfaceChange(location, options, from, 'sols artificiels imperméabilisés')
    if (changeSolsArbores < 0.2 * (changeSolsImpermeables + changeSolsArbores)) {
      return (clcAnnualChange + changeSolsArbores) * estimatedPortionGreen - changeSolsArbores
    } else {
      return 0
    }
  }
  // arborés follows logic of other ground types
}

// source: TODO. In tCO2/an
function getFranceFluxWoodProducts () {
  return {
    bo: 812000,
    bi: 751000
  }
}

module.exports = {
  getAnnualGroundCarbonFlux,
  getAllAnnualFluxes,
  getForestLitterFlux,
  getAnnualSurfaceChange,
  getFranceFluxWoodProducts
}
