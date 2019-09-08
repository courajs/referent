import Route from '@ember/routing/route';
import {inject as service} from '@ember/service';

export default class extends Route {
  @service graph;

  async model({page_id}) {
    // we have the page uuid
    // we need the title sequence
    // we need the body sequence
    // we need the links in/out of the page
    // we need the title of all linked pages

    let links = this.graph.linksForPage(page_id);
    let attrs = this.graph.attributesForPage(page_id);
    
    links = await links;
    attrs = await attrs;

    return {
      uuid: page_id,
      links,
      ...attrs,
    };
  }
}
