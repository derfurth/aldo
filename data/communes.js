const communes = require('./dataByCommune/communes_17122018.csv.json')
const zpcByCommune = require('./dataByCommune/zpc.csv.json')

function getCommunes (location) {
  let epcis = location.epcis || []
  if (location.epci) epcis.push(location.epci)
  epcis = epcis.map((epci) => epci.code)

  let allCommunes = communes.filter((c) => epcis.includes(c.epci))
  const remainingCommunes = location.communes || []
  if (location.commune) remainingCommunes.push(location.commune)
  remainingCommunes.forEach((commune) => {
    const alreadyIncluded = allCommunes.find((c) => c.insee === commune.insee)
    if (!alreadyIncluded) allCommunes.push(commune)
  })
  // some communes have arrondissements which are administratively communes but will be referred to as arrondissements in this code.
  // We want the user to be able to select communes, not arrondissements. In general, the UI should only show communes.
  // The data, however, is at mixed levels.
  // CLC 18 and forest area data is at arrondissement level.
  // ZPC is at commune level.
  const communeArrondissements = {
    // Lyon
    69123: [
      '69381', '69382', '69383', '69384', '69385', '69386',
      '69387', '69388', '69389'
    ],
    // Marseille
    13055: [
      '13201', '13202', '13203', '13204', '13205', '13206',
      '13207', '13208', '13209', '13210',
      '13211', '13212', '13213', '13214', '13215', '13216'
    ],
    // Paris
    75056: [
      '75101', '75102', '75103', '75104', '75105', '75106',
      '75107', '75108', '75109', '75110',
      '75111', '75112', '75113', '75114', '75115', '75116',
      '75117', '75118', '75119', '75120'
    ]
  }
  let arrondissementsToAdd = []
  allCommunes.forEach((commune) => {
    commune.zpc = zpcByCommune.find((zpcData) => zpcData.insee === commune.insee)?.zpc
    let arrondissements = communeArrondissements[commune.insee]
    if (arrondissements) {
      // TODO: reassess if EPCI is requried if move biomass region to here too
      arrondissements = arrondissements.map((aInsee) => { return { insee: aInsee, zpc: commune.zpc, epci: commune.epci } })
      arrondissementsToAdd = arrondissementsToAdd.concat(arrondissements)
    }
  })
  allCommunes = allCommunes.concat(arrondissementsToAdd)
  return allCommunes
}

module.exports = {
  getCommunes
}
