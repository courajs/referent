export default [
{
  input: 'app.js',
  output: {
    file: 'public/app.js',
    format: 'iife',
  },
  // external: ['idb'],
},{
  input: 'sw.js',
  output: {
    file: 'public/sw.js',
    format: 'iife',
    globals: {
      idb: 'idb',
      'socket.io': 'io',
    },
    banner: `importScripts('/vendor/unpkg.com/socket.io-client@2.2.0/dist/socket.io.slim.dev.js');
importScripts('/vendor/unpkg.com/idb@4.0.3/build/iife/index-min.js');
`,
  },
}
];
