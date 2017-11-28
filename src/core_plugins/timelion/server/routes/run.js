import Promise from 'bluebird';
import _ from 'lodash';
import chainRunnerFn from '../handlers/chain_runner.js';
const timelionDefaults = require('../lib/get_namespaced_settings')();

function replyWithError(e, reply) {
  reply({
    title: e.toString(),
    message: e.toString()
  }).code(500);
}


module.exports = (server) => {
  server.route({
    method: ['POST', 'GET'],
    path: '/api/timelion/run',
    handler: async (request, reply) => {
      try {
        // kibi: pass request to getAll method
        const uiSettings = await request.getUiSettingsService().getAll(request);

        const tlConfig = require('../handlers/lib/tl_config.js')({
          server,
          request,
          settings: _.defaults(uiSettings, timelionDefaults) // Just in case they delete some setting.
        });

        const chainRunner = chainRunnerFn(tlConfig);
        const sheet = await Promise.all(chainRunner.processRequest(request.payload || {
          sheet: [request.query.expression],
          time: {
            from: request.query.from,
            to: request.query.to,
            interval: request.query.interval,
            timezone: request.query.timezone
          }
        }));

        reply({
          sheet,
          stats: chainRunner.getStats()
        });

      } catch (err) {
        server.log(['timelion', 'error'], `${err.toString()}: ${err.stack}`);
        // TODO Maybe we should just replace everywhere we throw with Boom? Probably.
        if (err.isBoom) {
          reply(err);
        } else {
          replyWithError(err, reply);
        }
      }
    }
  });

};
