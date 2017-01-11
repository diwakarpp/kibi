import packageJson from 'utils/package_json';

/**
 * An empty .kibi index.
 */
export default [
  {
    'index': {
      '_index': '.kibi',
      '_type': 'config',
      '_id': packageJson.kibi_version
    }
  },
  {
    'buildNum': packageJson.build.number,
    'dateFormat:tz': 'UTC'
  }
];
