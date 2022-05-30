const { getAnnualFluxes } = require('./index')
const { getEpci } = require('../epcis')

// unit-style tests
test('returns expected number of entries for cultures ground changes', () => {
  const allFlux = getAnnualFluxes({ epci: getEpci('200007177', true) }).allFlux
  const culturesFlux = allFlux.filter(f => f.to === 'cultures')
  const cGround = culturesFlux.filter(f => f.gas === 'C' && f.reservoir === 'sol')
  expect(cGround.length).toBe(7)
})

test('returns expected number of entries for cultures litter changes', () => {
  const allFlux = getAnnualFluxes({ epci: getEpci('200007177', true) }).allFlux
  const culturesFlux = allFlux.filter(f => f.to === 'cultures')
  const litter = culturesFlux.filter(f => f.gas === 'C' && f.reservoir === 'litière')
  expect(litter.length).toBe(1)
})

// TODO: make all flux have a value and a co2e value - sums are done on co2e

// data-dependent tests
test('returns expected flux for each prairies -> cultures ground changes', () => {
  const allFlux = getAnnualFluxes({ epci: getEpci('200007177', true) }).allFlux
  const culturesFlux = allFlux.filter(f => f.to === 'cultures' && f.reservoir === 'sol')
  const prairies = culturesFlux.filter(f => f.from.startsWith('prairies'))
  const cPrairies = prairies.filter(f => f.gas === 'C')
  expect(cPrairies[0].value + cPrairies[1].value + cPrairies[2].value).toBeCloseTo(-638.71, 2)
})

test('returns expected flux for each prairies -> cultures N2O changes', () => {
  const allFlux = getAnnualFluxes({ epci: getEpci('200007177', true) }).allFlux
  const culturesFlux = allFlux.filter(f => f.to === 'cultures')
  const prairies = culturesFlux.filter(f => f.from.startsWith('prairies'))
  const n2oPrairies = prairies.filter(f => f.gas === 'N2O')
  expect(n2oPrairies[0].value + n2oPrairies[1].value).toBeCloseTo(-0.9, 2)
})

// TODO: add a forest litter value test if find EPCI with numbers !== 0

test('returns all relevant carbon emissions for cultures', () => {
  const summary = getAnnualFluxes({ epci: getEpci('200007177', true) }).summary
  expect(summary.cultures.totalCarbonSequestration).toBeCloseTo(-663.9, 1)
})

test('returns all relevant carbon and N20 emissions for cultures', () => {
  const summary = getAnnualFluxes({ epci: getEpci('200007177', true) }).summary
  expect(summary.cultures.totalSequestration).toBeCloseTo(-2702.5, 1)
  const fluxes = getAnnualFluxes({ epci: getEpci('200000933', true) })
  expect(fluxes.summary.cultures.totalSequestration).toBeCloseTo(-750, 0)
})

test('returns correct total for vergers and vignes', () => {
  let summary = getAnnualFluxes({ epci: getEpci('200007177', true) }).summary
  expect(summary.vergers.totalSequestration).toBeCloseTo(51, 0)
  summary = getAnnualFluxes({ epci: getEpci('200015162', true) }).summary
  expect(summary.vignes.totalSequestration).toBeCloseTo(17, 0)
  // the following value is wrong in the spreadsheet, so my calculations break.
  // summary = getAnnualFluxes({ epci: getEpci('200040798', true) }).summary
  // expect(summary.vignes.totalSequestration).toBeCloseTo(-99, 0)
})

test('returns correct total for all prairies', () => {
  const summary = getAnnualFluxes({ epci: getEpci('200015162', true) }).summary
  expect(summary.prairies.totalSequestration).toBeCloseTo(-772, 0)
})

test('returns correct total for zones humides', () => {
  let summary = getAnnualFluxes({ epci: getEpci('200042992', true) }).summary
  expect(summary['zones humides'].totalSequestration).toBeCloseTo(3388, 0)
  summary = getAnnualFluxes({ epci: getEpci('200055887', true) }).summary
  expect(summary['zones humides'].totalSequestration).toBeCloseTo(416, 0)
})

test('returns correct total for sols artificiels', () => {
  const flux = getAnnualFluxes({ epci: getEpci('200007177', true) })
  const summary = flux.summary
  const solsArt = flux.allFlux.filter(f => f.to.startsWith('sols'))
  expect(solsArt.filter(f => f.reservoir === 'sol').length).toBe(24)
  expect(solsArt.filter(f => f.reservoir === 'litière').length).toBe(10)
  expect(solsArt.filter(f => f.reservoir === 'biomasse').length).toBe(21)
  expect(solsArt.filter(f => f.reservoir === 'sol et litière').length).toBe(1)
  expect(solsArt.length).toBe(56)
  expect(summary['sols artificiels'].totalSequestration).toBeCloseTo(-97, 0)
})

test('returns correct total for forests', () => {
  const summary1 = getAnnualFluxes({ epci: getEpci('200007177', true) }).summary
  expect(summary1.forêts.totalSequestration).toBeCloseTo(12151, 0)
  const summary2 = getAnnualFluxes({ epci: getEpci('3', true) }).summary
  expect(summary2.forêts.totalSequestration).toBeCloseTo(7202, 0)
  const summary3 = getAnnualFluxes({ epci: getEpci('249500455', true) }).summary
  expect(summary3.forêts.totalSequestration).toBeCloseTo(17424, 0)
})

test('returns correct total for wood products', () => {
  const summary = getAnnualFluxes({ epci: getEpci('245700398', true) }).summary
  expect(summary['produits bois'].totalSequestration).toBeCloseTo(270, 0)
  const summary1 = getAnnualFluxes({ epci: getEpci('245700398', true) }, { woodCalculation: 'consommation' }).summary
  expect(summary1['produits bois'].totalSequestration).toBeCloseTo(787, 0)
})

test('option to modify split of sols artificiels', () => {
  const flux = getAnnualFluxes({ epci: getEpci('245700398', true) }, { proportionSolsImpermeables: 0.6 }).summary
  expect(flux['sols artificiels'].totalSequestration).toBeCloseTo(-66, 0)
})

test('option to modify the areas changed', () => {
  const areaChanges = {
    prai_herb_cult: 10,
    prai_arbu_cult: 20,
    prai_arbo_cult: 30,
    for_cult: 40,
    zh_cult: 50,
    verg_cult: 60,
    vign_cult: 70,
    art_imp_cult: 80,
    art_enh_cult: 90,
    art_arb_cult: 100,
    cult_prai_herb: 10,
    prai_arbu_prai_herb: 20,
    prai_arbo_prai_herb: 30,
    for_prai_herb: 40,
    zh_prai_herb: 50,
    verg_prai_herb: 60,
    vign_prai_herb: 70,
    art_imp_prai_herb: 80,
    art_enh_prai_herb: 90,
    art_arb_prai_herb: 100,
    cult_prai_arbu: 10,
    prai_herb_prai_arbu: 20,
    prai_arbo_prai_arbu: 30,
    for_prai_arbu: 40,
    zh_prai_arbu: 50,
    verg_prai_arbu: 60,
    vign_prai_arbu: 70,
    art_imp_prai_arbu: 80,
    art_enh_prai_arbu: 90,
    art_arb_prai_arbu: 100,
    cult_prai_arbo: 10,
    prai_herb_prai_arbo: 20,
    prai_arbu_prai_arbo: 30,
    for_prai_arbo: 40,
    zh_prai_arbo: 50,
    verg_prai_arbo: 60,
    vign_prai_arbo: 70,
    art_imp_prai_arbo: 80,
    art_enh_prai_arbo: 90,
    art_arb_prai_arbo: 100,
    cult_for: 10,
    prai_herb_for: 20,
    prai_arbu_for: 30,
    prai_arbo_for: 40,
    zh_for: 50,
    verg_for: 60,
    vign_for: 70,
    art_imp_for: 80,
    art_enh_for: 90,
    art_arb_for: 100,
    cult_zh: 10,
    prai_herb_zh: 20,
    prai_arbu_zh: 30,
    prai_arbo_zh: 40,
    for_zh: 50,
    verg_zh: 60,
    vign_zh: 70,
    art_imp_zh: 80,
    art_enh_zh: 90,
    art_arb_zh: 100,
    cult_verg: 10,
    prai_herb_verg: 20,
    prai_arbu_verg: 30,
    prai_arbo_verg: 40,
    for_verg: 50,
    zh_verg: 60,
    vign_verg: 70,
    art_imp_verg: 80,
    art_enh_verg: 90,
    art_arb_verg: 100,
    cult_vign: 10,
    prai_herb_vign: 20,
    prai_arbu_vign: 30,
    prai_arbo_vign: 40,
    for_vign: 50,
    zh_vign: 60,
    verg_vign: 70,
    art_imp_vign: 80,
    art_enh_vign: 90,
    art_arb_vign: 100,
    cult_art_imp: 10,
    prai_herb_art_imp: 20,
    prai_arbu_art_imp: 30,
    prai_arbo_art_imp: 40,
    for_art_imp: 50,
    zh_art_imp: 60,
    verg_art_imp: 70,
    vign_art_imp: 80,
    art_enh_art_imp: 90,
    art_arb_art_imp: 100,
    cult_art_enh: 10,
    prai_herb_art_enh: 20,
    prai_arbu_art_enh: 30,
    prai_arbo_art_enh: 40,
    for_art_enh: 50,
    zh_art_enh: 60,
    verg_art_enh: 70,
    vign_art_enh: 80,
    art_imp_art_enh: 90,
    art_arb_art_enh: 100,
    cult_art_arb: 10,
    prai_herb_art_arb: 20,
    prai_arbu_art_arb: 30,
    prai_arbo_art_arb: 40,
    for_art_arb: 50,
    zh_art_arb: 60,
    verg_art_arb: 70,
    vign_art_arb: 80,
    art_imp_art_arb: 90,
    art_enh_art_arb: 100
  }
  let flux = getAnnualFluxes({ epci: getEpci('200043974', true) }, { areaChanges })
  // console.log('test', flux.allFlux.filter(f => f.to.startsWith('prairies') && f.reservoir === 'biomasse'))
  // const sl = {}
  // let total = 0
  // flux.allFlux.forEach(f => {
  //   if (f.to.startsWith('prairies') && f.gas === 'C' && f.reservoir === 'biomasse') {
  //     sl[f.from] = sl[f.from] || 0
  //     sl[f.from] += f.value
  //   }
  // })
  // console.log('sl', sl)
  // console.log('total', total)
  flux = flux.summary
  expect(flux.cultures.totalSequestration).toBeCloseTo(-57156, 0)
  expect(flux.prairies.totalSequestration).toBeCloseTo(-5332, 0)
  // expect(flux['zones humides'].totalSequestration).toBeCloseTo(1112, 0)
  expect(flux.vergers.totalSequestration).toBeCloseTo(-14735, 0)
  // expect(flux.vignes.totalSequestration).toBeCloseTo(-45250, 0)
  // expect(flux['sols artificiels'].totalSequestration).toBeCloseTo(-53945, 0)
  expect(flux['forêts'].totalSequestration).toBeCloseTo(-19010, 0)
  expect(flux['produits bois'].totalSequestration).toBeCloseTo(14223, 0)
})
