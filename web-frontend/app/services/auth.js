import Service, {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';
import {first} from 'rxjs/operators';

export default class Auth extends Service {
  @service idb;
  @service sw;

  awaitAuth; awaitAuthChecked;
  @tracked authState = 'pending';
  @tracked clientId;

  async init() {
    let db = await this.idb.db;
    let tx = db.transaction('meta', 'readwrite');
    let id = await tx.store.get('client_id');
    if (!id) {
      id = ''+Math.random();
      await tx.store.put(id, 'client_id');
    }
    this.clientId = id;

    let pw = await tx.store.get('password');

    if (pw) {
      this.doAuth(id, pw);
    } else {
      this.authState = 'unauthed';
    }

    this.sw.on('authed').subscribe(() => {
      this.authState = 'authed';
    });
    this.sw.on('bad_auth').subscribe(() => {
      this.authState = 'bad_auth';
    });
  }

  submitPassword(pw) {
    this.doAuth(this.clientId, pw);
  }

  async doAuth(id, pw) {
    this.authState = 'authing';

    const one_year = 60 * 60 * 24 * 365;
    document.cookie = `password=${encodeURIComponent(pw)};path=/;max-age=${year}`;
    document.cookie = `live_id=${id};path=/;max-age=${year}`;

    this.sw.send('auth');
  }
}
