const {
  getFranceStocksWoodProducts,
  getAnnualWoodProductsHarvest,
  getAnnualFranceWoodProductsHarvest
} = require('../../data/stocks')
const { epciList, getPopulationTotal } = require('../../data')

function co2ToCarbon (co2) {
  return co2 * 12 / 44
}

function getStocksByConsumption (location) {
  const popTotal = getPopulationTotal(epciList())
  const epciPop = location.epci.populationTotale
  const proportion = epciPop / popTotal
  const franceStocks = getFranceStocksWoodProducts()
  franceStocks.bi = co2ToCarbon(franceStocks.bi)
  franceStocks.bo = co2ToCarbon(franceStocks.bo)
  const biStock = proportion * franceStocks.bi
  const boStock = proportion * franceStocks.bo
  const stock = biStock + boStock
  return {
    totalReservoirStock: stock,
    totalStock: stock,
    localPopulation: epciPop,
    francePopulation: popTotal,
    portionPopulation: proportion,
    biFranceStocksTotal: franceStocks.bi,
    boFranceStocksTotal: franceStocks.bo,
    biStock,
    boStock
  }
}

function getStocksByHarvest (location) {
  location = { epci: location.epci.code } // see getStocks
  const localAnnualWoodProductsHarvest = getAnnualWoodProductsHarvest(location)
  const franceAnnualWoodProductsHarvest = getAnnualFranceWoodProductsHarvest()
  const franceStocksByCategory = getFranceStocksWoodProducts()
  franceStocksByCategory.bi = co2ToCarbon(franceStocksByCategory.bi)
  franceStocksByCategory.bo = co2ToCarbon(franceStocksByCategory.bo)

  function harvestTotal (data, category) {
    return data.feuillus[category] + data.coniferes[category]
  }
  function portion (category) {
    return harvestTotal(localAnnualWoodProductsHarvest, category) / harvestTotal(franceAnnualWoodProductsHarvest, category)
  }
  function stockByProportionHarvest (composition, category) {
    const franceHarvestCategoryTotal = harvestTotal(franceAnnualWoodProductsHarvest, category)
    const proportionHarvest = localAnnualWoodProductsHarvest[composition][category] / franceHarvestCategoryTotal
    const franceStocksForCategory = franceStocksByCategory[category]
    return proportionHarvest * franceStocksForCategory
  }
  const feuillus = {
    bo: stockByProportionHarvest('feuillus', 'bo'),
    bi: stockByProportionHarvest('feuillus', 'bi')
  }
  // NB: in table sometimes referred to as résineux
  const coniferes = {
    bo: stockByProportionHarvest('coniferes', 'bo'),
    bi: stockByProportionHarvest('coniferes', 'bi')
  }
  function stock (category) {
    return feuillus[category] + coniferes[category]
  }
  const totalStock = stock('bo') + stock('bi')
  return {
    totalReservoirStock: totalStock,
    totalStock,
    boLocalHarvestTotal: harvestTotal(localAnnualWoodProductsHarvest, 'bo'),
    biLocalHarvestTotal: harvestTotal(localAnnualWoodProductsHarvest, 'bi'),
    boFranceHarvestTotal: harvestTotal(franceAnnualWoodProductsHarvest, 'bo'),
    biFranceHarvestTotal: harvestTotal(franceAnnualWoodProductsHarvest, 'bi'),
    boPortion: portion('bo'),
    biPortion: portion('bi'),
    boFranceStocksTotal: franceStocksByCategory.bo,
    biFranceStocksTotal: franceStocksByCategory.bi,
    boStock: stock('bo'),
    biStock: stock('bi')
  }
}

function getStocksWoodProducts (location, calculationMethod) {
  if (calculationMethod === 'consommation') {
    return getStocksByConsumption(location)
  } else { // default is to use harvest calculations
    return getStocksByHarvest(location)
  }
}

module.exports = {
  getStocksWoodProducts
}
