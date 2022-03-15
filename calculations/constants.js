module.exports = {
  GroundTypes: [
    {
      stocksId: 'cultures',
      name: 'Cultures'
    },
    {
      stocksId: 'prairies',
      name: 'Prairies'
    },
    {
      stocksId: 'prairies zones arborées',
      name: 'Prairies zones arborées',
      parentType: 'prairies',
    },
    {
      stocksId: 'prairies zones herbacées',
      name: 'Prairies zones herbacées',
      parentType: 'prairies',
    },
    {
      stocksId: 'prairies zones arbustives',
      name: 'Prairies zones arbustives',
      parentType: 'prairies',
    },
    {
      stocksId: 'zones humides',
      name: 'Zones humides'
    },
    {
      stocksId: 'vergers',
      name: 'Vergers'
    },
    {
      stocksId: 'vignes',
      name: 'Vignes'
    },
    {
      stocksId: 'sols artificiels',
      name: 'Sols artificiels'
    },
    {
      stocksId: 'sols artificiels imperméabilisés',
      name: 'Sols artificiels imperméabilisés',
      parentType: 'sols artificiels'
    },
    {
      stocksId: 'sols artificiels arbustifs',
      name: 'Sols artificiels arbustifs',
      parentType: 'sols artificiels'
    },
    {
      stocksId: 'sols artificiels arborés et buissonants',
      name: 'Sols artificiels arborés et buissonants',
      parentType: 'sols artificiels'
    },
    {
      stocksId: 'forêts',
      name: 'Forêts'
    },
    {
      stocksId: 'forêt mixte',
      name: 'Forêt mixte',
      parentType: 'forêts'
    },
    {
      stocksId: 'forêt feuillu',
      name: 'Forêt feuillu',
      parentType: 'forêts'
    },
    {
      stocksId: 'forêt conifere',
      name: 'Forêt conifere',
      parentType: 'forêts'
    },
    {
      stocksId: 'forêt peupleraie',
      name: 'Forêt peupleraie',
      parentType: 'forêts'
    },
    {
      stocksId: 'produits bois',
      name: 'Produits bois'
    },
    {
      stocksId: 'haies',
      name: 'Haies'
    }
  ],
  Colours: {
    bourgeon: { // green
      main: '#68A532',
      '950': '#C9FCAC',
    },
    ecume: { // blue
      main: '#465F9D',
      '950': '#E9EDFE',
    },
    glycine: { // purple
      main: '#A55A80',
      '950': '#FEE7FC',
    },
    caramel: { // brown
      main: '#C08C65',
      '950': '#F7EBE5',
    },
    verveine: { // green
      main: '#B7A73F',
      '950': '#fceeac',
    },
    terre: { // orange
      main: '#E4794A',
      '950': '#fee9e5',
    },
    emeraude: { // green
      main: '#00A95F',
      '950': '#c3fad5',
    },
    macaron: { // pink
      main: '#E18B76',
      '950': '#fee9e6',
    },
    menthe: { // green
      main: '#009081',
      '950': '#bafaee',
    },
    tournesol: { // yellow
      main: '#C8AA39',
      '950': '#feecc2',
    },
    archipel: { // green
      main: '#009099',
      '950': '#c7f6fc',
    },
    tuile: { // pink
      main: '#CE614A',
      '950': '#fee9e7',
    },
    opera: { // brown
      main: '#BD987A',
      '950': '#f7ece4',
    },
    cumulus: { // blue
      main: '#417DC4',
      '950': '#e6eefe',
    },
    moutard: { // yellow
      main: '#C3992A',
      '950': '#feebd0',
    }
  }
}
