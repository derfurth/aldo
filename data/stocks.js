const { getIgnLocalisation } = require('./shared')
const { GroundTypes } = require('../calculations/constants')

// Gets the carbon area density of a given ground type using the zone pédo-climatique majoritaire for the commune
function getCarbonDensity (commune, groundType) {
  const zpcForCommune = commune.zpc
  if (!zpcForCommune) {
    // Not expecting this to happen but in case it does, fail silently
    console.log('No ZPC for commune : ', commune)
    return 0
  }
  const zpcStocksPath = './dataByCommune/stocks-zpc.csv'
  const stocksForZpcs = require(zpcStocksPath + '.json')
  const stocksForZpc = stocksForZpcs.find((data) => data.zpc === zpcForCommune)
  if (!stocksForZpc) {
    // Not expecting this to happen but in case it does, fail silently
    console.log('No stocks for ZPC : ', zpcForCommune)
    return 0
  }
  const carbonDensity = stocksForZpc[groundType]
  if (!carbonDensity) {
    // Not expecting this to happen but in case it does, fail silently
    console.log('No stocks for ground type and ZPC : ', groundType, stocksForZpc)
    return 0
  }
  return +carbonDensity
}

// Gets the area in hectares (ha) of a given ground type in a location.
// The ground types Corine Land Cover uses are different from the types used by ALDO,
// so a mapping is used and the sum of ha of all matching CLC types is returned.
// NB: in the lookup the type names for ground data and the more specific biomass data
// are placed on the same level, so some CLC codes are used in two types.
function getArea (location, groundType) {
  if (!location.commune) { console.log('getArea in data/stocks called wrong', location); return }
  if (groundType === 'haies') {
    return
  } else if (groundType.startsWith('forêt ')) {
    return getAreaForests(location, groundType)
  }
  // consider using clcCodes in constants file
  // TODO: make more standardised keys?
  const aldoTypeToClcCodes = {
    cultures: ['211', '212', '213', '241', '242', '243', '244'],
    prairies: ['231', '321', '322', '323'],
    'prairies zones herbacées': ['231', '321'],
    'prairies zones arbustives': ['322'],
    'prairies zones arborées': ['323'],
    vignes: ['221'],
    vergers: ['222', '223'],
    'sols arborés': ['141'], // aka "sols artificiels arborés et buissonants" in stocks_c tab
    'sols artificiels non-arborés': ['111', '112', '121', '122', '123', '124', '131', '132', '133', '142'],
    'sols artificiels imperméabilisés': ['111', '121', '122', '123', '124', '131', '132', '133', '142'],
    'sols artificialisés': ['112'],
    // TODO: ask about logic F39: area sols arbustifs stocks_c tab.
    'zones humides': ['411', '412', '421', '422', '423', '511', '512', '521', '522', '523']
  }
  const clcCodes = aldoTypeToClcCodes[groundType]
  if (!clcCodes) {
    return 0
    // throw new Error(`No CLC code mapping found for ground type '${groundType}'`)
  }
  const csvFilePath = './dataByCommune/clc18.csv'
  const areasByCommuneAndClcType = require(csvFilePath + '.json')
  let totalArea = 0
  areasByCommuneAndClcType
    .filter((areaData) => location.commune.insee === areaData.insee && clcCodes.includes(areaData.code18))
    .forEach((areaData) => { totalArea += +areaData.area })
  return totalArea
}

// using IGN, not CLC, data for forests because it is more accurate
// side effect being that the sum of the areas could be different to the
// recorded size of the EPCI.
function getAreaForests (location, forestType) {
  const csvFilePath = './dataByCommune/surface-foret.csv'
  const areaData = require(csvFilePath + '.json')
  let areaDataByCommune = []
  if (location.epci) {
    areaDataByCommune = areaData.filter(data => data.CODE_EPCI === location.epci.code)
  } else if (location.commune) {
    let code = location.commune.insee
    if (code.startsWith('0')) code = code.slice(1)
    areaDataByCommune = areaData.filter(data => data.INSEE_COM === code)
  }
  let sum = 0
  const areaCompositionColumnName = {
    'forêt feuillu': 'SUR_FEUILLUS',
    'forêt conifere': 'SUR_RESINEUX',
    'forêt mixte': 'SUR_MIXTES',
    'forêt peupleraie': 'SUR_PEUPLERAIES'
  }[forestType]
  areaDataByCommune.forEach((communeData) => {
    sum += +communeData[areaCompositionColumnName]
  })
  return sum
}

function getSignificantCarbonData () {
  const csvFilePath = './dataByEpci/bilan-carbone-foret-par-localisation.csv'
  const carbonData = require(csvFilePath + '.json')
  // there is data will null values because it isn't statistically significant at that
  // level. Remove these lines because they are not used.
  return carbonData.filter((data) => data.surface_ic === 's')
}

function getForestAreaData (location) {
  const csvFilePath = './dataByCommune/surface-foret.csv'
  const areaData = require(csvFilePath + '.json')
  if (location.epci) {
    return areaData.filter(data => data.CODE_EPCI === location.epci.code)
  } else if (location.commune) {
    // TODO: fix file to append 0 to all the codes that are just 4 characters long
    let code = location.commune.insee
    if (code.startsWith('0')) code = code.slice(1)
    return areaData.filter(data => data.INSEE_COM === code)
  }
  return areaData.filter(data => location.communes?.includes(data.INSEE_COM) || location.epcis?.includes(data.CODE_EPCI))
}

// communeData is one entry from the array returned by getForestAreaData
// carbon data is the array returned by getSignificantCarbonData
// composition is a forest subtype
function getCarbonDataForCommuneAndComposition (communeData, carbonData, forestSubtype) {
  const composition = {
    'forêt feuillu': 'Feuillu',
    'forêt conifere': 'Conifere',
    'forêt mixte': 'Mixte',
    'forêt peupleraie': 'Peupleraie'
  }[forestSubtype]
  const compositionCarbonData =
    carbonData.filter((data) => data.composition === composition)

  // there are 4 levels of carbonData precision. carbonData may or may not have data for one of
  // these levels for the commune and composition requested. Start at most precise, trying larger
  // levels if not found.
  const localisationLevels = ['groupeser', 'greco', 'rad13', 'bassin_populicole']
  let carbonDataForCommuneAndComposition
  for (const i in localisationLevels) {
    const { localisationCode } = getIgnLocalisation(communeData, localisationLevels[i], composition)
    carbonDataForCommuneAndComposition =
      compositionCarbonData.find((data) => data.code_localisation === localisationCode)
    if (carbonDataForCommuneAndComposition) {
      break
    }
  }
  if (carbonDataForCommuneAndComposition) return carbonDataForCommuneAndComposition
  // no precise data found, fall back to using data for France.
  const franceCompositionCarbonData =
    compositionCarbonData.find((data) => data.code_localisation === 'France')
  if (franceCompositionCarbonData) {
    return franceCompositionCarbonData
  } else {
    // this is unexpected, fail loudly
    const message =
      `Carbon data could not be retrieved for commune ${communeData.INSEE_COM} and subtype ${forestSubtype}`
    throw new Error(message)
  }
}

function getForestBiomassCarbonDensities (location, forestSubtype) {
  const areaDataByCommune = getForestAreaData(location)
  if (!areaDataByCommune.length) {
    return { live: 0, dead: 0 }
  }
  const significantCarbonData = getSignificantCarbonData()

  let weightedLiveSum = 0
  let weightedDeadSum = 0
  let meanLiveSum = 0
  let meanDeadSum = 0
  let totalArea = 0
  const areaCompositionColumnName = {
    'forêt feuillu': 'SUR_FEUILLUS',
    'forêt conifere': 'SUR_RESINEUX',
    'forêt mixte': 'SUR_MIXTES',
    'forêt peupleraie': 'SUR_PEUPLERAIES'
  }[forestSubtype]
  areaDataByCommune.forEach((communeData) => {
    const area = +communeData[areaCompositionColumnName]
    const carbonData = getCarbonDataForCommuneAndComposition(communeData, significantCarbonData, forestSubtype)
    weightedLiveSum += +carbonData['carbone_(tC∙ha-1)'] * area
    weightedDeadSum += +carbonData['bois_mort_carbone_(tC∙ha-1)'] * area
    meanLiveSum += +carbonData['carbone_(tC∙ha-1)']
    meanDeadSum += +carbonData['bois_mort_carbone_(tC∙ha-1)']
    totalArea += area
  })
  // if there is some area, take weighted sum, otherwise take mean to allow for user customisations of areas
  const live = totalArea ? weightedLiveSum / totalArea : meanLiveSum / areaDataByCommune.length
  const dead = totalArea ? weightedDeadSum / totalArea : meanDeadSum / areaDataByCommune.length
  return { live, dead }
}

function getBiomassCarbonDensity (location, groundType) {
  if (groundType.startsWith('forêt')) {
    return
  }
  if (groundType === 'haies') {
    return getForestBiomassCarbonDensities(location, 'forêt mixte').live
  }
  const csvFilePath = './dataByEpci/biomass-hors-forets.csv'
  const dataByEpci = require(csvFilePath + '.json')
  const epciSiren = location.epci?.code || location.commune?.epci
  const data = dataByEpci.find(data => data.siren === epciSiren)
  // NB: all stocks are integers, but flux has decimals
  return parseInt(data[groundType], 10) || 0
}

// source: CITEPA 2016-2019 in tC
function getFranceStocksWoodProducts () {
  return {
    bo: 33741446.79,
    bi: 58436577.05
  }
}

// source: CITEPA 2016-2020 in m3
function getAnnualFranceWoodProductsHarvest () {
  return {
    bo: 19253833.33,
    bi: 10472666.67
  }
}

// for each category (BO, BI), return m3/an harvested
function getAnnualWoodProductsHarvest (location) {
  const harvestByCategory = {
    bo: 0,
    bi: 0,
    all: 0
  }
  const typeToColumn = {
    'forêt feuillu': 'SUR_FEUILLUS',
    'forêt conifere': 'SUR_RESINEUX',
    'forêt mixte': 'SUR_MIXTES',
    'forêt peupleraie': 'SUR_PEUPLERAIES'
  }
  const conversionBFTToVAT = {
    'forêt conifere': 1.3,
    'forêt feuillu': 1.44,
    'forêt mixte': 1.37,
    'forêt peupleraie': 1.3
  }
  const areaDataByCommune = getForestAreaData(location)
  const significantCarbonData = getSignificantCarbonData()
  const regionProportionData = getRegionProportionData()
  areaDataByCommune.forEach((communeData) => {
    ['forêt conifere', 'forêt feuillu', 'forêt mixte', 'forêt peupleraie'].forEach((forestSubtype) => {
      const areaCompositionColumnName = typeToColumn[forestSubtype]
      const area = +communeData[areaCompositionColumnName]
      const carbonData = getCarbonDataForCommuneAndComposition(communeData, significantCarbonData, forestSubtype)
      const bftPerHa = carbonData['prelevement_volume_(m3∙ha-1∙an-1)']
      const bft = bftPerHa * area
      const vat = bft * conversionBFTToVAT[forestSubtype]
      const total = bft * 0.9 + (vat - bft) * 0.5
      harvestByCategory.bo += total * harvestProportion(regionProportionData, 'bo', communeData)
      harvestByCategory.bi += total * harvestProportion(regionProportionData, 'bi', communeData)
      harvestByCategory.all += total
    })
  })
  return harvestByCategory
}

function getRegionProportionData () {
  const csvFilePath = './dataByEpci/proportion-usage-bois-par-region.csv'
  const data = require(csvFilePath + '.json')
  return data
}

function harvestProportion (regionProportionData, category, communeData) {
  const region = communeData.code_rad13
  const dataForRegion = regionProportionData.find((data) => data.code_localisation === region)
  return +dataForRegion[`% ${category.toUpperCase()}`] / 100
}

function getForestLitterCarbonDensity (subtype) {
  const subtypes = ['feuillu', 'mixte', 'conifere', 'peupleraie']
  if (subtypes.indexOf(subtype) === -1) {
    throw new Error(`No forest litter carbon density found for forest subtype '${subtype}'`)
  }
  return 9 // TODO: ask follow up on source of this data
}

function getHedgerowsDataByCommune (location) {
  if (!location.commune) { console.log('getHedgerowsDataByCommune called wrong', location); return }
  const carbonCsvFilePath = './dataByCommune/carbone-haies.csv'
  const carbonData = require(carbonCsvFilePath + '.json')
  const csvFilePath = './dataByCommune/haie-clc18.csv'
  let lengthData = require(csvFilePath + '.json')

  lengthData = lengthData.filter((data) => location.commune === data.INSEE_COM && data.TOTKM_HAIE)

  const excludeIds = ['produits bois', 'haies']
  // ignore child types as well
  const groundTypes = GroundTypes.filter((gt) => !gt.parentType && !excludeIds.includes(gt.stocksId))
  return lengthData.map((data) => {
    // source de 78 tC/km -> rapport ADEME/IGN "STOCKS DE BOIS ET DE CARBONE DANS LES HAIES BOCAGÈRES FRANÇAISES"
    // page 41 : « En moyenne, le stock de carbone par km pour le linéaire possédant un volume (MNHC > 3 m)
    // sur l’ensemble de la zone d’étude est de 100 tC/km, dont 78 pour la partie aérienne ».
    const carbonDensity = carbonData.find((cd) => cd.dep === data.INSEE_DEP)?.C_aerien_km || 78

    const byGroundType = {}
    groundTypes.forEach((gt) => { byGroundType[gt.stocksId] = 0 })
    groundTypes.forEach((gt) => {
      gt.clcCodes.forEach((clcCode) => {
        byGroundType[gt.stocksId] += +data[`CLC_${clcCode}`] || 0
      })
    })
    return {
      length: +data.TOTKM_HAIE,
      carbonDensity: +carbonDensity,
      byGroundType
    }
  })
}

module.exports = {
  getCarbonDensity,
  getArea,
  getForestAreaData,
  getSignificantCarbonData,
  getCarbonDataForCommuneAndComposition,
  getBiomassCarbonDensity,
  getForestBiomassCarbonDensities,
  getFranceStocksWoodProducts,
  getForestLitterCarbonDensity,
  getAnnualWoodProductsHarvest,
  getAnnualFranceWoodProductsHarvest,
  getHedgerowsDataByCommune
}
