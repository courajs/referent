var fs = require('fs');
var path = require('path');
var canonicalize = require('canonicalize');

var sqlite3 = require('sqlite3').verbose();
var express = require('express');
var cors = require('cors');
var cookie = require('cookie');

var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http, {
  allowRequest(req, fn) {
    let err = checkAuth(req.headers.cookie);
    fn(err, !err);
  },
});

let PASSWORD;

if (fs.existsSync('/run/keys/referent-password')) {
  PASSWORD = fs.readFileSync('/run/keys/referent-password', 'utf8');
} else {
  PASSWORD = "change me";
}


const no_cookie = 'No auth cookie';
const no_id = 'No client id';
const no_password = 'No password';
const wrong_password = 'Incorrect password';
function checkAuth(cook) {
  if (!cook) {
    console.log(no_cookie);
    return no_cookie;
  }

  let {live_id, password} = cookie.parse(cook);

  if (!live_id) {
    console.log(no_id);
    return no_id;
  }
  if (!password) {
    console.log(no_password);
    return no_password;
  }
  password = decodeURIComponent(password);
  if (password !== PASSWORD) {
    console.log(wrong_password);
    return wrong_password;
  }
  return null;
}


var dbFile = process.argv[2] || '/var/referent/sqlite.db';
var exists = fs.existsSync(dbFile);
fs.mkdirSync(path.dirname(dbFile), {recursive: true});
var db = new sqlite3.Database(dbFile);


app.use(express.static('public'));

app.get('/', function(request, response) {
  response.sendFile(__dirname + '/public/index.html');
});
app.get('/doc/:doc_id', function(request, response) {
  response.sendFile(__dirname + '/public/index.html');
});


if (!exists) {
  db.serialize(function(){
      db.run('CREATE TABLE atoms (server_index integer primary key, collection text, client text, client_index integer, value text)');
      db.run('CREATE UNIQUE INDEX unique_atoms on atoms(collection, client, client_index)');
  });
}

var corsOptions = {
  credentials: true,
  origin(origin, cb) {
    if (origin === 'https://graph.recurse.com' || origin === 'https://recurse-graph-api.recurse.com') {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
};

app.use(require('cookie-parser')());
app.use(require('body-parser').text());
app.get('/check-auth', cors(corsOptions), function(req, res){
  console.log('checking auth');

  let err = checkAuth(req.headers.cookie);
  if (err) {
    res.status(403).send(err);
  } else {
    res.send('ok');
  }
});

function insertValuesForData(these, client_id) {
  let values = [];
  for (let {client_index, value} of these) {
    values.push(client_id, client_index, JSON.stringify(value));
  }
  return values;
}

function insert(records, client_id, cb) {
  let placeholders = new Array(records.length).fill('(?,?,?,?)').join(',');
  let each = records.map(d => [canonicalize(d.collection), client_id, d.client_index, JSON.stringify(d.value)]);
  let all = [].concat(...each);
  if (cb) {
    db.run('INSERT OR IGNORE into atoms (collection, client, client_index, value) VALUES ' + placeholders, all, cb);
  } else {
    db.run('INSERT OR IGNORE into atoms (collection, client, client_index, value) VALUES ' + placeholders, all);
  }
}

io.on('connection', function(socket){
  if (!socket.request.headers.cookie) {
    console.log('no auth cookie!!!');
  } else {
    socket.client_id = cookie.parse(socket.request.headers.cookie).live_id;
    console.log('authed', socket.client_id);
  }

  socket.on('disconnect', function() {
    console.log(socket.client_id, 'disconnected');
  });

  socket.on('ask', function(collections, next) {
    if (!Array.isArray(collections)) { return; }
    console.log(socket.client_id, 'askin bout', collections);
    let subscriptions = collections.map(clock => canonicalize(clock.collection));
    subscriptions.forEach(s => socket.join(s));

    let AFTER = new Array(subscriptions.length).fill('(collection = ? AND server_index > ?)').join(' OR ');
    let values = collections.map(c => [canonicalize(c.collection), c.from]).reduce((a, b) => a.concat(b), []);

    db.all('SELECT collection, server_index, client, client_index, value FROM atoms WHERE client != ? AND ('+AFTER+')', socket.client_id, ...values, function(err, data) {
      if (err) { throw err; }
      console.log(`Found ${data.length} since`, collections);
      if (data.length === 0) { return; }
      let results = {};
      data.forEach(d => {
        if (!results[d.collection]) {
          results[d.collection] = [];
        }
        results[d.collection].push(d);
        d.collection = JSON.parse(d.collection);
        d.value = JSON.parse(d.value);
      });
      let updates = [];
      for (let c in results) {
        updates.push({collection: JSON.parse(c), values: results[c]});
      }
      socket.emit('tell', updates);
    });
  });

  socket.on('tell', function(data, ack) {
    db.serialize(function() {
      if (data.length === 0) { return; }
      if (data.length < 20) {
        console.log('heard tell', data);
      } else {
        console.log('heard tell', data.slice(0,20), '.....');
      }
      let records = data.slice();
      while (records.length > 249) {
        insert(records.splice(0,249), socket.client_id);
      }
      insert(records, socket.client_id, function(err) {
        if (err) { throw err; }
        ack();
        let clock_base = {};
        for (let item of data) {
          let c = canonicalize(item.collection);
          if (clock_base[c]) {
            clock_base[c] = Math.min(item.client_index, clock_base[c]);
          } else {
            clock_base[c] = item.client_index;
          }
        }

        for (let collection in clock_base) {
          db.all('SELECT server_index, collection, client, client_index, value FROM atoms WHERE client = ? AND collection = ? AND client_index >= ?', socket.client_id, collection, clock_base[collection], function(err, results) {
            if (err) { throw err; }
            results.forEach(d => {
              d.collection = JSON.parse(d.collection);
              d.value = JSON.parse(d.value);
            });
            socket.in(collection).emit('tell', [{collection:JSON.parse(collection), values:results}]);
          });
        }
      });
    });
  });
});

/*
setInterval(function() {
  console.log('connected clients', Object.values(io.sockets.connected).map(s => s.client_id));
}, 5000);
*/

let listener = http.listen(process.env.PORT, function(){
  console.log('listening on', listener.address());
});
