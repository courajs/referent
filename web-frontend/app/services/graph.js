import Service, {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';
import {map,concatMap,publishBehavior} from 'rxjs/operators';
import LiveGraph from 'nomicon/lib/live/graph';
import {TrackedBehavior} from 'nomicon/lib/observables';

import {EquivMap} from '@thi.ng/associative';

window.EquivMap = EquivMap;

export default class GraphService extends Service {
  @service sync;
  @service auth;

  @tracked pages;

  init() {
    window.graphservice = this;
    this.pages = this._pages();
  }


  // Queries
  
  async attributesForPage(uuid) {
    let titleId = ['page',uuid,'title'];
    let bodyId = ['page',uuid,'body'];

    return {
      title: {
        id: titleId,
        seq: this.sync.sequence(titleId),
      },
      body: {
        id: bodyId,
        seq: this.sync.sequence(bodyId),
      },
    };
  }

  async titleForPage(uuid) {
    let id = ['page',uuid,'title'];
    return {
      id: ['page',uuid,'title'],
      seq: await this.trackedSequence(id),
    }
  }

  async trackedSequence(id) {
    return await new TrackedBehavior(await this.sync.sequence(id)).initial;
  }

  async trackedReadOnlySequence(id) {
    let seq = await this.sync.sequence(id);
    let mapper = map(seq => seq.evaluate());
    return await new TrackedBehavior(mapper(seq)).initial;
  }

  async linksForPage(uuid) {
    let links = this.sync.graph.pipe(
        map(g => {
          let {incoming, outgoing} = g.evaluate();
          incoming = incoming[uuid] || [];
          outgoing = outgoing[uuid] || [];
          return {
            incoming: incoming.map(l => {
              return {
                link_uuid: l.uuid,
                page_uuid: l.from,
                title: this.sync.sequence(['page',l.from,'title']),
              };
            }),
            outgoing: outgoing.map(l => {
              return {
                link_uuid: l.uuid,
                page_uuid: l.to,
                title: this.sync.sequence(['page',l.to,'title']),
              };
            }),
          };
        }),
        publishBehavior(),
    );
    links.connect();
    return links;
  }

  _pages() {
    let p = this.sync.graph.pipe(
        map(g => {
          return g.value.nodes.map(n => {
            return {
              uuid: n,
              title: this.sync.sequence(['page',n,'title']),
            };
          });
        }),
        publishBehavior([]),
    );
    p.connect();
    return p;
  }

  // Mutations

  async newPage() {
    let g = this.sync.graph.getSubject().value;
    let atom = g.addNode();
    await this.sync.write('graph', [atom]);
    return atom;
  }

  async link(fromuuid, touuid) {
    let g = this.sync.graph.getSubject().value;
    let atom = g.addEdge(fromuuid, touuid);
    await this.sync.write('graph', [atom]);
    return atom;
  }

  async delete(uuid) {
    let g = this.sync.graph.getSubject().value;
    let atom = g.delete(uuid);
    return this.sync.write('graph', [atom]);
  }
}
