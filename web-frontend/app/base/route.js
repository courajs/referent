import Route from '@ember/routing/route';
import {inject as service} from '@ember/service';

export default class BaseRoute extends Route {
  @service auth;

  beforeModel() {
    return this.auth.awaitId;
  }
}
