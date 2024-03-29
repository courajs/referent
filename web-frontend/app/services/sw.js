import Service from '@ember/service';
import {Subject, ReplaySubject, fromEvent} from 'rxjs';
import {filter, map, timestamp} from 'rxjs/operators';
import {tracked} from '@glimmer/tracking';
import {action} from '@ember/object';

if (!navigator.serviceWorker.controller) {
  console.log('no controlling worker!');
  // setTimeout(()=>location.reload(), 500);
}

export const ready = navigator.serviceWorker.ready.then(function(/*reg*/) {
  console.log('ready');
});

export default class extends Service {
  incoming = new Subject();
  outgoing = new Subject();

  incoming_log = new ReplaySubject();
  outgoing_log = new ReplaySubject();

  undelivered = [];

  @tracked
  change_log = [];

  constructor(...args) {
    super(...args);
    this.incoming.pipe(timestamp()).subscribe(this.incoming_log);
    this.outgoing.pipe(timestamp()).subscribe(this.outgoing_log);

    navigator.serviceWorker.addEventListener('controllerchange', (e) => {
      console.error('there was a controller change!');
      this.change_log.push({
        at: new Date(),
        ev: e,
        keys: Object.keys(e),
      });
      this.change_log = this.change_log;
      for (let msg of this.undelivered) {
        navigator.serviceWorker.controller.postMessage(msg);
      }
      this.undelivered = [];
    });

    fromEvent(navigator.serviceWorker, 'message', e => e.data)
      .subscribe(this.incoming);

    this.outgoing.subscribe((e) => {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage(e);
      } else {
        this.undelivered.push(e);
        console.error("No controlling service worker, to receive message:", e);
        // throw new Error('No controlling service worker!');
      }
    });

    // these events aren't available within the service worker, but
    // they're useful hints for websocket reconnection attempts,
    // so we forward them along
    window.addEventListener('online', () => this.send('online'));
    window.addEventListener('offline', () => this.send('offline'));

    // firefox shuts down service workers after 30 seconds of idle.
    // but, we want it to keep the socket open in case of server events
    setInterval(() => this.send('keepawake'), 25 * 1000);

    // We want to avoid opening websockets and such for not-yet-active
    // service workers. buuuut you can't actually tell from inside the
    // service worker whether you're active or not. you can listen to
    // the 'activate' event, but that only fires once, *ever*, per sw.
    // the sw can be shut down due to no open tabs, then run again later,
    // and have no way to tell that it's already been activated.
    // so, we just ping from every active tab when they first start up,
    // and that will trigger socket initialization in the sw if necessary.
    this.send('init');
  }

  // event data comes through as a simple string (the event name),
  // or a two-element array [eventName, payload].
  on(eventName) {
    return this.incoming.pipe(
        filter(d => d === eventName || Array.isArray(d) && d[0] === eventName),
        map(d => Array.isArray(d) ? d[1] : null)
    );
  }

  send(eventName, data) {
    if (data === undefined) {
      this.outgoing.next(eventName);
    } else {
      this.outgoing.next([eventName, data]);
    }
  }
}
