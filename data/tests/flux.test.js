const {
  getAnnualGroundCarbonFlux,
  getAllAnnualFluxes,
  getAnnualSurfaceChange,
  getForestLitterFlux
} = require('../flux')

test('returns carbon flux in tC/(ha.year) for ground for given area and from -> to combination', () => {
  expect(getAnnualGroundCarbonFlux({ epci: '200007177' }, 'prairies zones arborées', 'cultures')).toBeCloseTo(-14.8 / 20, 1)
})

test('returns all carbon flux in tc/(ha.year) for ground cultures', () => {
  const fluxes = getAllAnnualFluxes({ epci: '200007177' })
  const groundFluxes = fluxes.filter(f => f.reservoir === 'sol')
  // expect(fluxes.length).toBe(87) TODO
  const cultureFluxes = groundFluxes.filter(f => f.to === 'cultures')
  expect(cultureFluxes.length).toBe(7)
  expect(fluxes[0]).toHaveProperty('from')
  expect(fluxes[0]).toHaveProperty('to')
  expect(fluxes[0]).toHaveProperty('annualFlux')
})

// test('returns all carbon flux in tc/(ha.year) for biomass cultures', () => {
//   const fluxes = getAllAnnualFluxes({ epci: '200007177' })
//   const biomassFlux = fluxes.filter(f => f.reservoir === 'biomasse')
//   const cultureFluxes = biomassFlux.filter(f => f.to === 'cultures')
//   expect(cultureFluxes.length).toBe(9)
//   expect(fluxes[0]).toHaveProperty('from')
//   expect(fluxes[0]).toHaveProperty('to')
//   expect(fluxes[0]).toHaveProperty('annualFlux')
// })

test('returns annual? change in surface area', () => {
  expect(getAnnualSurfaceChange({ epci: '200007177' }, {}, 'prairies zones arborées', 'cultures')).toBeCloseTo(0, 2)
  expect(getAnnualSurfaceChange({ epci: '200007177' }, {}, 'prairies zones arbustives', 'cultures')).toBeCloseTo(3.60, 2)
  expect(getAnnualSurfaceChange({ epci: '200007177' }, {}, 'prairies zones herbacées', 'cultures')).toBeCloseTo(39.57, 2)
})

test('returns expected value for forest litter flux', () => {
  expect(getForestLitterFlux('cultures', 'forêts')).toBe(9)
  expect(getForestLitterFlux('forêts', 'cultures')).toBe(-9)
  expect(getForestLitterFlux('zones humides', 'cultures')).toBeUndefined()
  expect(getForestLitterFlux('cultures', 'sols artificiels arborés et buissonants')).toBe(9)
  // TODO: ask if the following should be the case - the spreadsheet is malformed w/ repeated impermeabilise row
  expect(getForestLitterFlux('sols artificiels arborés et buissonants', 'cultures')).toBeUndefined()
})

test('returns expected area change for sols artificiels', () => {
  expect(getAnnualSurfaceChange({ epci: '200007177' }, {}, 'cultures', 'sols artificiels imperméabilisés')).toBeCloseTo(1.69, 2)
  expect(getAnnualSurfaceChange({ epci: '200007177' }, {}, 'cultures', 'sols artificiels arbustifs')).toBeCloseTo(0.42, 2)
})

// test('returns expected biomass flux for forests', () => {
//   const fluxes = getAllAnnualFluxes({ epci: '200007177' })
//   const biomassFlux = fluxes.filter(f => f.reservoir === 'biomasse')
//   const forestFluxes = biomassFlux.filter(f => f.to.startsWith('forêt '))
//   expect(forestFluxes.length).toBe(4)
// })

// test('returns expected area change for forest types', () => {
//   expect(getAnnualSurfaceChange({ epci: '200007177' }, {}, undefined, 'forêt feuillu')).toBeCloseTo(2220, 0)
//   expect(getAnnualSurfaceChange({ epci: '200007177' }, {}, undefined, 'forêt conifere')).toBeCloseTo(18, 0)
//   expect(getAnnualSurfaceChange({ epci: '200007177' }, {}, undefined, 'forêt peupleraie')).toBeCloseTo(150, 0)
//   expect(getAnnualSurfaceChange({ epci: '200007177' }, {}, undefined, 'forêt mixte')).toBeCloseTo(14, 0)
// })

// ---------- TODO: NEW TESTS

// the flux data module

// returns an array of flux items

// a flux entry:
// has a from
// has a to
// has a area
// has a originalArea
// has a areaModified
// has a reservoir
// has a gas
// has a flux
// has a fluxEquivalent
// has a value
// has a co2e

// proportion impermeable is overrideable (to another number and to 0)

// How to mock data files:
// jest.mock('../dataByEpci/ground.csv.json', () => {
//   return [
//     {
//       siren: '243000643',
//       'f_for_vign_%zpc': 2
//     }
//   ]
// })
