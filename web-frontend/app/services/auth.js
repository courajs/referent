import Service, {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';
import {first} from 'rxjs/operators';

export default class Auth extends Service {
  @service idb;
  @service sw;

  awaitAuth; awaitAuthChecked;
  @tracked authState = 'pending';
  @tracked clientId;

  init() {
    this.awaitAuth = new Promise((resolve) => {
      this._authed = resolve;
    });
    this.awaitAuthChecked = new Promise((resolve) => {
      this._authChecked = resolve;
    });
    
    this.sw.on('authed').pipe(first()).toPromise().then((as) => {
      this.authState = 'authed';
      this.clientId = as;
      this._authed();
    });

    this._checkForId();
  }

  async _checkForId() {
    let db = await this.idb.db;
    let id = await db.get('meta', 'client_id');
    if (id) {
      this.authState = 'authed';
      this.clientId = id;
      this._authed();
    } else {
      this.authState = 'unauthed';
      this.authenticateAs(''+Math.random());
    }
    this._authChecked();
  }

  authenticateAs(id) {
    this.sw.send('auth', id);
  }
}
