/**
 * Defines the following objects:
 *
 * - a kibi relational filter visualization with version 1
 */
module.exports = [
  {
    index: {
      _index: '.siren',
      _type: 'config',
      _id: 'kibi'
    }
  },
  {
    buildNum: '123',
    'dateFormat:tz': 'UTC',
    'kibi:relations': JSON.stringify({
      relationsIndices: [
        {
          id: 'art*//companies/comp*//id',
          indices: [
            {
              indexPatternId: 'art*',
              indexPatternType: '',
              path: 'companies'
            },
            {
              indexPatternId: 'comp*',
              indexPatternType: '',
              path: 'id'
            }
          ],
          label: 'mentions'
        }
      ],
      relationsDashboards: [],
      relationsDashboardsSerialized: {},
      relationsIndicesSerialized: {},
      version: 2
    })
  },
  {
    index: {
      _index: '.siren',
      _type: 'visualization',
      _id: 'buttons'
    }
  },
  {
    title: 'buttons',
    visState: JSON.stringify({
      title: 'buttons',
      type: 'kibi_sequential_join_vis',
      params: {
        buttons: [
          {
            filterLabel: '',
            label: 'Companies',
            redirectToDashboard: 'Companies',
            sourceField: 'companies',
            sourceIndexPatternId: 'art*',
            sourceIndexPatternType: '',
            targetField: 'id',
            targetIndexPatternId: 'comp*',
            targetIndexPatternType: ''
          }
        ]
      },
      aggs: [],
      listeners: {}
    }),
    uiStateJSON: '{}',
    description: '',
    version: 1,
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{\"filter\":[],\"query\":{\"query_string\":{\"analyze_wildcard\":true,\"query\":\"*\"}}}'
    }
  }
];
