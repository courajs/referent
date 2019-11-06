import Service, {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';
import {first} from 'rxjs/operators';

const ONE_YEAR = 60 * 60 * 24 * 365;

export default class Auth extends Service {
  @service idb;
  @service sw;

  awaitId;
  @tracked authState = 'pending';
  @tracked clientId;

  async init() {
    let resolve;
    this.awaitId = new Promise(r => resolve = r);

    // STATE / MUTATION: it's important to write client_id to indexeddb
    // before sending either of the auth events to the sw.
    let db = await this.idb.db;
    let tx = db.transaction('meta', 'readwrite');
    let id = await tx.store.get('client_id');
    if (!id) {
      id = ''+Math.random();
      await tx.store.put(id, 'client_id');
    }
    this.clientId = id;
    resolve();

    this.authState = 'authed';
    this.cookie(id);
    this.sw.send('authed');
  }

  cookie(id) {
    document.cookie = `live_id=${id};path=/;max-age=${ONE_YEAR}`;
  }
}
