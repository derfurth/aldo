const {
  getAnnualGroundCarbonFlux,
  getAllAnnualFluxes,
  getAnnualSurfaceChange,
  getForestLitterFlux
} = require('../flux')

test('returns carbon flux in tC/(ha.year) for ground for given area and from -> to combination', () => {
  expect(getAnnualGroundCarbonFlux({ epci: '200007177' }, 'prairies zones arborées', 'cultures')).toBeCloseTo(-0.7, 1)
})

test('returns all carbon flux in tc/(ha.year) for ground cultures', () => {
  const fluxes = getAllAnnualFluxes({ epci: '200007177' })
  const groundFluxes = fluxes.filter(f => f.reservoir === 'ground')
  // expect(fluxes.length).toBe(87) TODO
  const cultureFluxes = groundFluxes.filter(f => f.to === 'cultures')
  expect(cultureFluxes.length).toBe(7)
  expect(fluxes[0]).toHaveProperty('from')
  expect(fluxes[0]).toHaveProperty('to')
  expect(fluxes[0]).toHaveProperty('flux')
})

test('returns all carbon flux in tc/(ha.year) for biomass cultures', () => {
  const fluxes = getAllAnnualFluxes({ epci: '200007177' })
  const biomassFlux = fluxes.filter(f => f.reservoir === 'biomass')
  const cultureFluxes = biomassFlux.filter(f => f.to === 'cultures')
  expect(cultureFluxes.length).toBe(6)
  expect(fluxes[0]).toHaveProperty('from')
  expect(fluxes[0]).toHaveProperty('to')
  expect(fluxes[0]).toHaveProperty('flux')
})

test('returns annual? change in surface area', () => {
  expect(getAnnualSurfaceChange({ epci: '200007177' }, 'prairies zones arborées', 'cultures')).toBeCloseTo(0, 2)
  expect(getAnnualSurfaceChange({ epci: '200007177' }, 'prairies zones arbustives', 'cultures')).toBeCloseTo(3.60, 2)
  expect(getAnnualSurfaceChange({ epci: '200007177' }, 'prairies zones herbacées', 'cultures')).toBeCloseTo(39.57, 2)
})

test('returns expected value for forest litter flux', () => {
  expect(getForestLitterFlux('cultures', 'forêts')).toBe(9)
  expect(getForestLitterFlux('forêts', 'cultures')).toBe(-9)
  expect(getForestLitterFlux('zones humides', 'cultures')).toBeUndefined()
  expect(getForestLitterFlux('cultures', 'sols artificiels arborés et buissonants')).toBe(9)
  // TODO: ask if the following should be the case - the spreadsheet is malformed w/ repeated impermeabilise row
  expect(getForestLitterFlux('sols artificiels arborés et buissonants', 'cultures')).toBe(-9)
})