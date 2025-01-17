const { getAnnualFluxes } = require('./index')
const { getEpci } = require('../locations')
const { getCommunes } = require('../../data/communes')

jest.mock('../../data/flux', () => {
  const originalModule = jest.requireActual('../../data/flux')

  return {
    __esModule: true,
    ...originalModule,
    getAnnualSurfaceChange: jest.fn((location, options, from, to) => {
      const areaChanges = {
        cultures: {
          vignes: 3,
          vergers: 4,
          'forêt mixte': 5,
          'forêt conifere': 5
        },
        'forêt mixte': {
          vignes: 10
        },
        'forêt feuillu': {
          'forêt conifere': 3
        }
      }[from]
      return areaChanges ? areaChanges[to] : 0
    }),
    // this is called once per commune
    getFluxReferenceValues: jest.fn(() => {
      return [
        {
          from: 'cultures',
          to: 'vignes',
          annualFlux: -2,
          annualFluxEquivalent: -10,
          yearsForFlux: 20,
          reservoir: 'sol',
          gas: 'C'
        },
        {
          from: 'cultures',
          to: 'vignes',
          annualFlux: -3,
          annualFluxEquivalent: -15,
          yearsForFlux: 20,
          reservoir: 'biomasse',
          gas: 'C'
        },
        {
          from: 'cultures',
          to: 'vergers',
          annualFlux: 30,
          annualFluxEquivalent: 100,
          yearsForFlux: 1,
          reservoir: 'biomasse',
          gas: 'C'
        },
        {
          from: 'cultures',
          to: 'forêt mixte',
          annualFlux: 3,
          annualFluxEquivalent: 15,
          yearsForFlux: 20,
          reservoir: 'sol',
          gas: 'C'
        },
        {
          from: 'vignes',
          to: 'cultures',
          annualFlux: 2,
          annualFluxEquivalent: 10,
          yearsForFlux: 1,
          reservoir: 'sol',
          gas: 'C'
        },
        // per-commune forest biomass entries: not associated with area changes (hence no from)
        // instead, in real usage the entries correspond to today's area for that type
        {
          to: 'forêt mixte',
          reservoir: 'biomasse',
          area: 1,
          annualFlux: 4,
          annualFluxEquivalent: 12,
          growth: 1,
          mortality: 1,
          timberExtraction: 1,
          fluxMeterCubed: 1,
          conversionFactor: 1
        },
        {
          to: 'forêt mixte',
          reservoir: 'biomasse',
          area: 2,
          annualFlux: 1,
          annualFluxEquivalent: 3,
          growth: 0.1,
          mortality: 0.1,
          timberExtraction: 0.1,
          fluxMeterCubed: 0.1,
          conversionFactor: 0.1
        },
        // add this entry (per-commune today's area) to check filtering on biomass summary
        {
          to: 'forêt feuillu',
          reservoir: 'biomasse',
          area: 20,
          annualFlux: 100,
          annualFluxEquivalent: 300,
          growth: 20,
          mortality: 20,
          timberExtraction: 20,
          fluxMeterCubed: 20,
          conversionFactor: 20
        },
        // change between forest types (eventually this will be handled, for now at least elegantly ignored)
        {
          from: 'forêt feuillu',
          to: 'forêt conifere',
          annualFlux: 2,
          annualFluxEquivalent: 6,
          yearsForFlux: 20,
          reservoir: 'sol',
          gas: 'C'
        }
      ]
    }),
    getFranceFluxWoodProducts: jest.fn(() => ({
      bo: 1000,
      bi: 2000
    }))
  }
})

jest.mock('../../data/stocks', () => {
  const originalModule = jest.requireActual('../../data/stocks')

  return {
    __esModule: true,
    ...originalModule,
    getAnnualWoodProductsHarvest: jest.fn(() => ({
      bo: 10,
      bi: 200
    })),
    getAnnualFranceWoodProductsHarvest: jest.fn(() => ({
      bo: 100,
      bi: 1000
    })),
    getBiomassCarbonDensity: jest.fn((location, keyword) => {
      if (!keyword.startsWith('forêt ')) {
        return 4
      }
    }),
    getForestBiomassCarbonDensities: jest.fn((location, type) => {
      return {
        live: type === 'forêt conifere' ? 13 : 3,
        dead: 7
      }
    })
  }
})

describe('The flux calculation module', () => {
  const epci = getEpci('CC Faucigny-Glières')
  const communes = getCommunes({ epci })

  describe('flux entry', () => {
    it('has area, value, and co2e added', () => {
      const fluxes = getAnnualFluxes(communes)
      const flux = fluxes.allFlux[0]
      expect(flux.area).toEqual(3)
      expect(flux.areaModified).toBeUndefined()
      expect(flux.originalArea).toEqual(3)
      expect(flux.flux).toEqual(-40)
      expect(flux.value).toEqual(-120)
      expect(flux.co2e).toEqual(-440)
    })
  })

  it('adds N2O entries for emissions', () => {
    // not strictly testing functionality, this is a sanity check for later use of variable
    const communeCount = 7
    expect(epci.communes.length).toBe(communeCount)

    // the actual test
    const fluxes = getAnnualFluxes(communes)
    const n2oFluxes = fluxes.allFlux.filter((f) => f.reservoir === 'sol et litière')
    expect(n2oFluxes.length).toBe(communeCount) // only emission is from cultures -> vignes
    const flux = n2oFluxes[0]
    expect(flux.gas).toEqual('N2O')
    expect(flux.reservoir).toEqual('sol et litière')
    // value calculated from original spreadsheet
    expect(flux.value).toBeCloseTo(-0.17, 2)
  })

  it('does not add N2O entries for sequestrations', () => {
    const fluxes = getAnnualFluxes(communes)
    const n2oVergersFluxes = fluxes.allFlux.filter((f) => f.from === 'cultures' && f.to === 'vergers' && f.reservoir === 'sol et litière')
    expect(n2oVergersFluxes.length).toBe(0)
  })

  it('adds sequestrations from wood products by harvest', () => {
    const fluxes = getAnnualFluxes(communes)
    const woodFlux = fluxes.allFlux.filter((f) => f.to === 'produits bois')
    const communeCount = 7
    expect(epci.communes.length).toBe(communeCount)
    expect(woodFlux.length).toBe(2 * communeCount)
    const boFlux = woodFlux[0]
    expect(boFlux.to).toEqual('produits bois')
    expect(boFlux.from).toEqual(undefined)
    expect(boFlux.category).toEqual('bo')
    expect(boFlux).toHaveProperty('localHarvest')
    expect(boFlux).toHaveProperty('franceHarvest')
    expect(boFlux).toHaveProperty('localPortion')
    expect(boFlux).toHaveProperty('franceSequestration')
    expect(boFlux.value).toEqual(100)
    expect(boFlux.co2e).toEqual(100)
    const biFlux = woodFlux[1]
    expect(biFlux.to).toEqual('produits bois')
    expect(biFlux.from).toEqual(undefined)
    expect(biFlux.category).toEqual('bi')
    expect(biFlux.value).toEqual(400)
    expect(biFlux.co2e).toEqual(400)
  })

  it('adds sequestrations from wood products by consumption', () => {
    const fluxes = getAnnualFluxes(communes, { woodCalculation: 'consommation' })
    const woodFlux = fluxes.allFlux.filter((f) => f.to === 'produits bois')
    const communeCount = 7
    expect(epci.communes.length).toBe(communeCount)
    expect(woodFlux.length).toBe(2 * communeCount)
    const boFlux = woodFlux[0]
    expect(boFlux.to).toEqual('produits bois')
    expect(boFlux.from).toEqual(undefined)
    expect(boFlux.category).toEqual('bo')
    expect(boFlux).toHaveProperty('localPopulation')
    expect(boFlux).toHaveProperty('francePopulation')
    expect(boFlux).toHaveProperty('localPortion')
    expect(boFlux).toHaveProperty('franceSequestration')
    const biFlux = woodFlux[1]
    expect(biFlux.to).toEqual('produits bois')
    expect(biFlux.from).toEqual(undefined)
    expect(biFlux.category).toEqual('bi')
  })

  it('has a total of co2e', () => {
    const fluxes = getAnnualFluxes(communes)
    expect(fluxes).toHaveProperty('total')
    expect(fluxes.total).toBeGreaterThan(60)
  })

  // TODO: test totalSequestration in the summary for prairies, sols art, forêts
  it('has a summary with totals by ground type, including parent types', () => {
    const fluxes = getAnnualFluxes(communes)
    expect(fluxes.summary.vignes).toBeDefined()
    expect(fluxes.summary.forêts).toBeDefined()
  })

  it('contains flux entries per forest subtype', () => {
    const fluxes = getAnnualFluxes(communes)
    const conifer = fluxes.allFlux.find((f) => f.to === 'forêt conifere')
    expect(conifer.value).toBe(120)
  })

  describe('the forest biomass summary', () => {
    it('contains an entry for each forest subtype', () => {
      const fluxes = getAnnualFluxes(communes)
      expect(fluxes.biomassSummary.length).toBe(4)
      expect(fluxes.biomassSummary[0].to).toBe('forêt mixte')
    })

    it('provides the area as a sum of the areas of the same type', () => {
      const fluxes = getAnnualFluxes(communes)
      const mixed = fluxes.biomassSummary[0]
      // there are 7 communes, each with area of 3
      expect(mixed.area).toBe(21)
      expect(mixed.co2e).toBeDefined()
    })

    it('returns the average weighted against the area for annualFlux per type', () => {
      const fluxes = getAnnualFluxes(communes)
      const mixed = fluxes.biomassSummary[0]
      // (4 * 1 + 1 * 2)/3 = 6/3
      expect(mixed.annualFlux).toBe(2)
      // the following should also be weighted averages, smoke test to check they exist
      expect(mixed.growth).toBeDefined()
      expect(mixed.mortality).toBeDefined()
      expect(mixed.timberExtraction).toBeDefined()
      expect(mixed.fluxMeterCubed).toBeDefined()
      expect(mixed.conversionFactor).toBeDefined()
      expect(mixed.annualFluxEquivalent).toBeDefined()
    })

    // TODO: if area is overridden for subtype, add areaModified and co2e of area * original weighted flux equiv.
  })

  // TODO: test that forest total includes this biomass growth in summary total

  // TODO: can provide areas for agricultural practices
  // test per practice?

  describe('the biomass fluxes linked to deforestation', () => {
    const communes = [{ insee: '01234' }, { insee: '01235' }, { insee: '01236' }]
    it('adds for changes to non-forest types, using the stock biomass densities for both ground types', () => {
      const fluxes = getAnnualFluxes(communes)
      const flux = fluxes.allFlux.find((f) => f.from === 'forêt mixte' && f.to === 'vignes' && f.reservoir === 'biomasse')
      expect(flux.annualFlux).toEqual(-6)
      expect(flux.annualFluxEquivalent).toBeDefined()
      expect(flux.area).toEqual(10)
      expect(flux.value).toEqual(-60)
      expect(flux.co2e).toBeDefined()
    })

    it('ignore biomass changes where final ground type is a forest type since these are accounted for by the biomass growth calculations', () => {
      const fluxes = getAnnualFluxes(communes)
      const toConifer = fluxes.allFlux.find((f) => f.from === 'cultures' && f.to === 'forêt conifere' && f.reservoir === 'biomasse')
      expect(toConifer).not.toBeDefined()
      const betweenForests = fluxes.allFlux.find((f) => f.from === 'forêt feuillu' && f.to === 'forêt conifere' && f.reservoir === 'biomasse')
      expect(betweenForests).not.toBeDefined()
    })

    it('allows change from forest type to be overridden', () => {
      const originalFluxes = getAnnualFluxes(communes)
      const forVignFluxes = originalFluxes.allFlux.filter((f) => f.from === 'forêt mixte' && f.to === 'vignes' && f.reservoir === 'biomasse')
      expect(forVignFluxes.length).toBe(3)
      const fluxes = getAnnualFluxes(communes, { areaChanges: { for_mix_vign: 20 } })
      const toVineyard = fluxes.allFlux.find((f) => f.from === 'forêt mixte' && f.to === 'vignes' && f.reservoir === 'biomasse')
      expect(toVineyard.area).toBe(20)
      expect(toVineyard.originalArea).toBe(30) // this is 30 whereas previous test is 10 because this is the sum of all commune changes
      expect(toVineyard.areaModified).toBe(true)
    })
  })
  // TODO: should be able to override area from a prairie subtype to another

  it('aggregates the area changes per-commune into a hash table to provide a total area change per ground type pair for the grouping', () => {
    const communes = [{ insee: '01234' }, { insee: '01235' }]
    const fluxes = getAnnualFluxes(communes, { areaChanges: { cult_verg: 10 } })
    const fluxAreaSummary = fluxes.areas
    expect(fluxAreaSummary).toBeDefined()
    expect(fluxAreaSummary.cultures.vignes.area).toBe(6)
    expect(fluxAreaSummary.cultures.vignes.originalArea).toBe(6)
    expect(fluxAreaSummary.cultures.vignes.areaModified).toBe(undefined)
    expect(fluxAreaSummary.cultures.vergers.area).toBe(10)
    expect(fluxAreaSummary.cultures.vergers.originalArea).toBe(8)
    expect(fluxAreaSummary.cultures.vergers.areaModified).toBe(true)
  })

  it('allows area overrides, updating the sequestration with the original weighted average for flux multiplied by new area', () => {
    const communes = [{ insee: '01234' }, { insee: '01235' }]

    const fluxes = getAnnualFluxes(communes, {})
    const cultVignGroundFluxes = fluxes.allFlux.filter((f) => f.from === 'cultures' && f.to === 'vignes' && f.reservoir === 'sol')
    const cultVignBiomassFluxes = fluxes.allFlux.filter((f) => f.from === 'cultures' && f.to === 'vignes' && f.reservoir === 'biomasse')
    const cultVignN2OFluxes = fluxes.allFlux.filter((f) => f.from === 'cultures' && f.to === 'vignes' && f.reservoir === 'sol et litière')
    expect(cultVignGroundFluxes.length).toBe(2)
    expect(cultVignBiomassFluxes.length).toBe(2)
    expect(cultVignN2OFluxes.length).toBe(2)

    const modifiedFluxes = getAnnualFluxes(communes, { areaChanges: { cult_vign: 10 } })
    const modifiedCultVignGroundFluxes = modifiedFluxes.allFlux.filter((f) => f.from === 'cultures' && f.to === 'vignes' && f.reservoir === 'sol')
    const modifiedCultVignBiomassFluxes = modifiedFluxes.allFlux.filter((f) => f.from === 'cultures' && f.to === 'vignes' && f.reservoir === 'biomasse')
    const mmodifiedCultVignN2OFluxes = modifiedFluxes.allFlux.filter((f) => f.from === 'cultures' && f.to === 'vignes' && f.reservoir === 'sol et litière')
    expect(modifiedCultVignGroundFluxes.length).toBe(1)
    const flux = modifiedCultVignGroundFluxes[0]
    expect(flux.area).toBe(10)
    expect(flux.originalArea).toBe(6)
    expect(flux.areaModified).toBe(true)
    expect(flux.value).toBe(-400)
    // TODO: test the weighted averaging for flux.flux

    expect(modifiedCultVignBiomassFluxes.length).toBe(1)
    expect(modifiedCultVignBiomassFluxes[0].area).toBe(10)
    expect(modifiedCultVignBiomassFluxes[0].originalArea).toBe(6)
    expect(mmodifiedCultVignN2OFluxes.length).toBe(1)
    expect(mmodifiedCultVignN2OFluxes[0].area).toBe(undefined) // this is undefined whether or not area modified
    // TODO: test impact on related flux:
    // - forest litter
  })

  it('uses a simple average, not weighted, for the flux reference value when there are no original areas for that change pair', () => {
    const communes = [{ insee: '01234' }, { insee: '01235' }]

    const modifiedFluxes = getAnnualFluxes(communes, { areaChanges: { vign_cult: 10 } })
    const vignCultGroundFlux = modifiedFluxes.allFlux.filter((f) => f.from === 'vignes' && f.to === 'cultures' && f.reservoir === 'sol')
    expect(vignCultGroundFlux.length).toBe(1)
    const flux = vignCultGroundFlux[0]
    expect(flux.area).toBe(10)
    expect(flux.originalArea).toBe(0)
    expect(flux.annualFlux).toBe(2)
    expect(flux.value).toBe(20)
  })
})
