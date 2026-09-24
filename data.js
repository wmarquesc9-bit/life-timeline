// data.js
// Sample Data structure demonstrating hierarchy (People -> Categories -> Items)

const groups = new vis.DataSet([
    // Person 1: João
    { id: 1, content: 'João da Silva', treeLevel: 1, nestedGroups: [11, 12, 16, 13, 14, 15], showNested: true, order: 10 },
    { id: 11, content: 'Vida', treeLevel: 2, order: 11 },
    { id: 12, content: 'Estado', treeLevel: 2, order: 12 },
    { id: 16, content: 'Saúde', treeLevel: 2, order: 13 },
    { id: 13, content: 'Eventos', treeLevel: 2, order: 14 },
    { id: 14, content: 'Patrimônio', treeLevel: 2, order: 15 },
    { id: 15, content: 'Diversos', treeLevel: 2, order: 16 },

    // Person 2: Maria
    { id: 2, content: 'Maria Souza', treeLevel: 1, nestedGroups: [21, 22, 26, 23, 24, 25], showNested: true, order: 20 },
    { id: 21, content: 'Vida', treeLevel: 2, order: 21 },
    { id: 22, content: 'Estado', treeLevel: 2, order: 22 },
    { id: 26, content: 'Saúde', treeLevel: 2, order: 23 },
    { id: 23, content: 'Eventos', treeLevel: 2, order: 24 },
    { id: 24, content: 'Patrimônio', treeLevel: 2, order: 25 },
    { id: 25, content: 'Diversos', treeLevel: 2, order: 26 },
]);

const items = new vis.DataSet([
    // João's events
    { id: 1, group: 11, content: 'Nascimento', start: '1980-05-15', type: 'point', className: 'cat-vida' },
    { id: 2, group: 12, content: 'Solteiro', start: '1980-05-15', end: '2010-09-20', className: 'cat-estado' },
    { id: 3, group: 12, content: 'Casado', start: '2010-09-20', ongoing: true, className: 'cat-estado' },
    { id: 4, group: 13, content: 'Formatura', start: '2002-12-10', type: 'point', className: 'cat-eventos' },
    { id: 5, group: 14, content: 'Casa Praia', start: '2015-02-10', end: '2023-10-01', className: 'cat-patrimonio' },
    { id: 6, group: 15, content: 'Compra TV 4K', start: '2018-11-23', type: 'point', className: 'cat-diversos' },

    // Maria's events
    { id: 7, group: 21, content: 'Nascimento', start: '1985-08-22', type: 'point', className: 'cat-vida' },
    { id: 8, group: 22, content: 'Solteira', start: '1985-08-22', end: '2010-09-20', className: 'cat-estado' },
    { id: 9, group: 22, content: 'Casada', start: '2010-09-20', ongoing: true, className: 'cat-estado' },
    { id: 10, group: 23, content: 'Mestrado', start: '2012-03-01', end: '2014-03-01', className: 'cat-eventos' },
    { id: 11, group: 24, content: 'Carro SUV', start: '2019-05-10', end: '2024-01-01', className: 'cat-patrimonio' },
]);
