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
        concatMap(async g => {
          let {incoming, outgoing} = g.evaluate();
          incoming = incoming[uuid] || [];
          outgoing = outgoing[uuid] || [];
          incoming = incoming.map(async l => {
            return {
              link_uuid: l.uuid,
              page_uuid: l.from,
              title: this.sync.sequence(['page',l.from,'title']),
            };
          });
          outgoing = outgoing.map(async l => {
            return {
              link_uuid: l.uuid,
              page_uuid: l.to,
              title: this.sync.sequence(['page',l.to,'title']),
            };
          });
          return {
            incoming: await Promise.all(incoming),
            outgoing: await Promise.all(outgoing),
          };
        })
    );
    return links;
  }

  _pages() {
    let p = this.sync.graph.pipe(
        map(g => {
          window.garph = g;
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
    await this.auth.awaitAuth;
    await this._graph.initial;
    let atom = this._graph.value.addNode();
    await this.sync.write('graph', [atom]);
    return atom;
  }

  async link(fromuuid, touuid) {
    await this.auth.awaitAuth;
    await this._graph.initial;
    let atom = this._graph.value.addEdge(fromuuid, touuid);
    await this.sync.write('graph', [atom]);
    return atom;
  }

  async delete(uuid) {
    await this.auth.awaitAuth;
    await this._graph.initial;
    let atom = this._graph.value.delete(uuid);
    await this.sync.write('graph', [atom]);
    return;
  }
}
