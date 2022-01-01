import EmberRouter from '@ember/routing/router';
import config from 'nomicon/config/environment';

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(function() {
  this.route('home');
  this.route('debug');
  this.route('new');
  this.route('page', { path: '/page/:page_id' });
  this.route('inject');
});
