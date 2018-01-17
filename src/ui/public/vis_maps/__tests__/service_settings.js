import expect from 'expect.js';
import ngMock from 'ng_mock';
import url from 'url';
import sinon from 'sinon';

describe('service_settings (FKA tilemaptest)', function () {
  let serviceSettings;
  let mapsConfig;
  let tilemapsConfig; //kibi: returned tilemaps config as default

  const manifestUrl = 'https://geo.elastic.co/v1/manifest'; // kibi: added our manifest url
  const tmsManifestUrl = `https://tiles.siren.io/v1/manifest`; // kibi: added our manifest url
  const vectorManifestUrl = `https://layers.geo.elastic.co/v1/manifest`;
  const manifestUrl2 = 'https://foobar/v1/manifest';

  const manifest = {
    'services': [
      {
        'id': 'tiles_v2',
        'name': 'Elastic Tile Service',
        'manifest': tmsManifestUrl,
        'type': 'tms'
      },
      {
        'id': 'geo_layers',
        'name': 'Elastic Layer Service',
        'manifest': vectorManifestUrl,
        'type': 'file'
      }
    ]
  };

  const tmsManifest = {
    //kibi: edited manifest being returned to match that served by tile server manifest requests
    'services': [{
      'id': 'siren_map',
      'url': 'https://tiles.siren.io/hot/{z}/{x}/{y}.png',
      'minZoom': 0,
      'maxZoom': 14,
      'attribution': '© [OpenStreetMap](http://www.openstreetmap.org/copyright)'
    }]
    //kibi: end
  };

  const vectorManifest = {
    'layers': [{
      'attribution': '',
      'name': 'US States',
      'format': 'geojson',
      'url': 'https://storage.googleapis.com/elastic-layer.appspot.com/L2FwcGhvc3RpbmdfcHJvZC9ibG9icy9BRW5CMlVvNGJ0aVNidFNJR2dEQl9rbTBjeXhKMU01WjRBeW1kN3JMXzM2Ry1qc3F6QjF4WE5XdHY2ODlnQkRpZFdCY2g1T2dqUGRHSFhSRTU3amlxTVFwZjNBSFhycEFwV2lYR29vTENjZjh1QTZaZnRpaHBzby5VXzZoNk1paGJYSkNPalpI?elastic_tile_service_tos=agree',
      'fields': [{ 'name': 'postal', 'description': 'Two letter abbreviation' }, {
        'name': 'name',
        'description': 'State name'
      }],
      'created_at': '2017-04-26T19:45:22.377820',
      'id': 5086441721823232
    }, {
      'attribution': 'Â© [Elastic Tile Service](https://www.elastic.co/elastic-maps-service)',
      'name': 'World Countries',
      'format': 'geojson',
      'url': 'https://storage.googleapis.com/elastic-layer.appspot.com/L2FwcGhvc3RpbmdfcHJvZC9ibG9icy9BRW5CMlVwWTZTWnhRRzNmUk9HUE93TENjLXNVd2IwdVNpc09SRXRyRzBVWWdqOU5qY2hldGJLOFNZSFpUMmZmZWdNZGx0NWprT1R1ZkZ0U1JEdFBtRnkwUWo0S0JuLTVYY1I5RFdSMVZ5alBIZkZuME1qVS04TS5oQTRNTl9yRUJCWk9tMk03?elastic_tile_service_tos=agree',
      'fields': [{ 'name': 'iso2', 'description': 'Two letter abbreviation' }, {
        'name': 'name',
        'description': 'Country name'
      }, { 'name': 'iso3', 'description': 'Three letter abbreviation' }],
      'created_at': '2017-04-26T17:12:15.978370',
      'id': 5659313586569216
    }]
  };


  beforeEach(ngMock.module('kibana', ($provide) => {

    $provide.decorator('mapConfig', () => {
      return {
        manifestServiceUrl: manifestUrl
      };
    });
  }));

  beforeEach(ngMock.inject(function ($injector, $rootScope) {

    serviceSettings = $injector.get('serviceSettings');
    mapsConfig = $injector.get('mapConfig');
    tilemapsConfig = $injector.get('tilemapsConfig'); // kibi: mock out tilemapConfig

    sinon.stub(serviceSettings, '_getManifest', function (url) {
      let contents = null;
      if (url.startsWith(tmsManifestUrl)) {
        contents = tmsManifest;
      } else if (url.startsWith(vectorManifestUrl)) {
        contents = vectorManifest;
      } else if (url.startsWith(manifestUrl)) {
        contents = manifest;
      } else if (url.startsWith(manifestUrl2)) {
        contents = manifest;
      }
      return {
        data: contents
      };
    });
    //kibi: add url to tilemapsConfig
    tilemapsConfig.deprecated.config.url = 'https://tiles.siren.io/v1/manifest';
    $rootScope.$digest();
  }));

  afterEach(function () {
    serviceSettings._getManifest.restore();
  });

  describe('TMS', function () {

    it('should get url', async function () {
      const tmsService = await serviceSettings.getTMSService();
      const mapUrl = tmsService.getUrl();
      expect(mapUrl).to.contain('{x}');
      expect(mapUrl).to.contain('{y}');
      expect(mapUrl).to.contain('{z}');

      const urlObject = url.parse(mapUrl, true);
      expect(urlObject.hostname).to.be('tiles.siren.io');
    });

    it('should get options', async function () {
      const tmsService = await serviceSettings.getTMSService();
      const options = tmsService.getTMSOptions();
      expect(options).to.have.property('minZoom');
      // kibi: add check for options settings from manifest
      expect(options.minZoom).to.equal(0);
      expect(options).to.have.property('maxZoom');
      expect(options.maxZoom).to.equal(14);
      expect(options).to.have.property('attribution');
      expect(options.attribution).to.contain('&#169;');
      expect(options).to.have.property('id');
      expect(options.id).to.equal('siren_map');
      // kibi: end
    });

    describe('modify - url', function () {

      let tilemapSettings;

      function assertQuery(expected) {
        const mapUrl = tilemapSettings.getUrl();
        const urlObject = url.parse(mapUrl, true);
        Object.keys(expected).forEach(key => {
          expect(urlObject.query).to.have.property(key, expected[key]);
        });
      }

      it('accepts an object', async() => {
        serviceSettings.addQueryParams({ foo: 'bar' });
        tilemapSettings = await serviceSettings.getTMSService();
        assertQuery({ foo: 'bar' });
      });

      it('merged additions with previous values', async() => {
        // ensure that changes are always additive
        serviceSettings.addQueryParams({ foo: 'bar' });
        serviceSettings.addQueryParams({ bar: 'stool' });
        tilemapSettings = await serviceSettings.getTMSService();
        assertQuery({ foo: 'bar', bar: 'stool' });
      });

      it('overwrites conflicting previous values', async() => {
        // ensure that conflicts are overwritten
        serviceSettings.addQueryParams({ foo: 'bar' });
        serviceSettings.addQueryParams({ bar: 'stool' });
        serviceSettings.addQueryParams({ foo: 'tstool' });
        tilemapSettings = await serviceSettings.getTMSService();
        assertQuery({ foo: 'tstool', bar: 'stool' });
      });

      it('when overridden, should continue to work', async() => {
        mapsConfig.manifestServiceUrl = manifestUrl2;
        serviceSettings.addQueryParams({ foo: 'bar' });
        tilemapSettings = await serviceSettings.getTMSService();
        assertQuery({ foo: 'bar' });
      });

    });


  });

  describe('File layers', function () {


    it('should load manifest', async function () {
      serviceSettings.addQueryParams({ foo:'bar' });
      const fileLayers = await serviceSettings.getFileLayers();
      fileLayers.forEach(function (fileLayer, index) {
        const expected = vectorManifest.layers[index];
        expect(expected.attribution).to.eql(fileLayer.attribution);
        expect(expected.format).to.eql(fileLayer.format);
        expect(expected.fields).to.eql(fileLayer.fields);
        expect(expected.name).to.eql(fileLayer.name);
        expect(expected.created_at).to.eql(fileLayer.created_at);

        const urlObject = url.parse(fileLayer.url, true);
        Object.keys({ foo:'bar', elastic_tile_service_tos: 'agree' }).forEach(key => {
          expect(urlObject.query).to.have.property(key, expected[key]);
        });

      });
    });



  });
});
