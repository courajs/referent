import Route from '@ember/routing/route';
import {inject as service} from '@ember/service';

export default class extends Route {
  @service graph;

  async redirect() {
    let atom = await this.graph.newPage();
    return this.replaceWith('page', atom.uuid);
  }
}
