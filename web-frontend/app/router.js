import EmberRouter from '@ember/routing/router';
import config from './config/environment';

const Router = EmberRouter.extend({
  location: config.locationType,
  rootURL: config.rootURL
});

Router.map(function() {
  this.route('home');
  this.route('new');
  this.route('page', { path: '/page/:page_id' });
  this.route('inject');
});

export default Router;
