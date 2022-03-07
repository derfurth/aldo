const { epciList } = require("../data/index")
const epcis = require('@etalab/decoupage-administratif/data/epci.json')

async function getEpci(name) {
  const aldoList = await epciList()
  let epci = aldoList.find(epci => epci.nom === name)
  const officialEpci = epcis.find(e => e.code === epci.code)
  if (officialEpci && epci.nombreCommunes == officialEpci.membres.length) {
    epci.membres = officialEpci.membres
  }
  return epci
}

module.exports = {
  getEpci,
  epciList,
}