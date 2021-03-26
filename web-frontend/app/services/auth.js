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

  async init(...args) {
    super.init(...args);
    let resolve;
    this.awaitId = new Promise(r => resolve = r);
    this.sw.on('authed').subscribe(() => {
      this.authState = 'authed';
    });
    this.sw.on('bad_auth').subscribe(() => {
      this.authState = 'bad_auth';
    });

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

    let pw = await tx.store.get('password');
    if (pw) {
      this.authState = 'authed';
      this.cookie(id, pw);
      this.sw.send('authed');
    } else {
      this.authState = 'unauthed';
    }
  }

  submitPassword(pw) {
    this.authState = 'authing';
    this.cookie(this.clientId, pw);
    this.sw.send('check-auth', pw);
  }

  cookie(id, pw) {
    document.cookie = `password=${encodeURIComponent(pw)};path=/;max-age=${ONE_YEAR}`;
    document.cookie = `live_id=${id};path=/;max-age=${ONE_YEAR}`;
  }
}
