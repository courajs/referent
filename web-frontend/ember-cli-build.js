'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');

const Plugin = require('broccoli-plugin');
const fse = require('fs-extra');
const path = require('path');

class Toucher extends Plugin {
  async build(...args) {
    await fse.copy(this.inputPaths[0], this.outputPath);
    let file_manifest = await crawl_filenames(this.outputPath);
    console.dir(file_manifest);
    fse.writeFileSync(this.outputPath + '/thing.txt', JSON.stringify(file_manifest));
  }
}

async function crawl_filenames(root, ...stack) {
  let entries = await fse.readdir(path.join(root, ...stack), {withFileTypes: true});
  let sub_entries = await Promise.all(entries.map(
      entry => entry.isDirectory() ? crawl_filenames(root, ...stack, entry.name) : path.join(...stack, entry.name)
  ));
  return sub_entries.flat();
}

module.exports = function (defaults) {
  let app = new EmberApp(defaults, {
    postcssOptions: {
      compile: {
        plugins: [
          require('tailwindcss')('app/styles/tailwind.js'),
        ],
      },
    },
    // Add options here
  });

  // Use `app.import` to add additional libraries to the generated
  // output files.
  //
  // If you need to use different assets in different
  // environments, specify an object as the first parameter. That
  // object's keys should be the environment name and the values
  // should be the asset to use in that environment.
  //
  // If the library that you are including contains AMD or ES6
  // modules that you would like to import into your application
  // please specify an object with the list of modules as keys
  // along with the exports of each module as its value.

  let tree = app.toTree();
  return new Toucher([tree]);
};
