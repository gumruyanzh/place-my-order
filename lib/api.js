import path from 'path';
import feathers from 'feathers';
import bodyParser from 'body-parser';
import mongodb from 'feathers-mongodb';
import config from './config';
import url from 'url';

export const restaurants = mongodb({
  collection: 'restaurants',
  connectionString: config.mongodb
}).extend({
  get(id, params, callback) {
    let _super = this._super.bind(this);
    // Slug can be equivalent to ID when finding a restaurant
    this.find({ query: { slug: id } }, (error, data) => {
      if(data && data.length === 1) {
        return callback(null, data[0]);
      }

      return _super(id, params, callback);
    });
  }
});

export const orders = mongodb({
  collection: 'orders',
  connectionString: config.mongodb
}).extend({
  find(params, callback) {
    let status = params.query.status;
    if(Array.isArray(status)) {
      params.query.status = { $in: status };
    }
    this._super(params, callback);
  }
});

export default function() {
  let api = feathers()
    .configure(feathers.rest())
    .configure(feathers.socketio())
    .use(bodyParser.json())
    .use(bodyParser.urlencoded({ extended: true }))
    .use('/restaurants', restaurants)
    .use('/orders', orders);

  // Override listen because we need the server to set up the API
  let oldListen = this.listen;
  this.listen = function() {
    let server = oldListen.apply(this, arguments);
    api.setup(server);
    return server;
  };

  this.api = api;
  this.use('/api', api);
}