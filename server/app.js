import App from './ui/app.js';

if (!('serviceWorker' in navigator)) {
  document.body.innerText = "This app requires service workers, which your browser doesn't seem to support!";
  throw new Error("no service workers :(");
}

let app = new App(document.body);
