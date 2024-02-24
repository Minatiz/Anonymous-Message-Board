'use strict';
require('dotenv').config();
const express     = require('express');
const bodyParser  = require('body-parser');
const cors        = require('cors');
const helmet = require("helmet"); 

const sqlite3 = require("sqlite3").verbose(); 

// Opening database. 
const db = new sqlite3.Database("./messageboard.db", sqlite3.OPEN_READWRITE, (err)=>{
  if (err)
    return console.error(err.message); 

  console.log("Connected to DB"); 
});

// Insertion to db test
// const sql = `INSERT INTO threads (_id, text, delete_password, replies) VALUES (?, ?, ?, ?)`;
// db.run(sql, ["1","hello world", "1234", "hdajsdhsajda" ], (err)=>{
//   if (err)
//   return console.error(err.message); 
//   console.log("Success insertion to DB"); 
// }); 




const apiRoutes         = require('./routes/api.js');
const fccTestingRoutes  = require('./routes/fcctesting.js');
const runner            = require('./test-runner');

const app = express();

app.use('/public', express.static(process.cwd() + '/public'));

// Middlewares 
app.use(helmet.frameguard());
app.use(helmet.dnsPrefetchControl()); // Disable DNS fetching
app.use(helmet.referrerPolicy({policy: "same-origin"}));  // Only referrer on own pages



app.use(cors({origin: '*'})); //For FCC testing purposes only

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//Sample front-end
app.route('/b/:board/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/board.html');
  });
app.route('/b/:board/:threadid')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/thread.html');
  });

//Index page (static HTML)
app.route('/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  });

//For FCC testing purposes
fccTestingRoutes(app);

//Routing for API 
apiRoutes(app);

//404 Not Found Middleware
app.use(function(req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});

//Start our server and tests!
const listener = app.listen(process.env.PORT || 3000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
  if(process.env.NODE_ENV==='test') {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch(e) {
        console.log('Tests are not valid:');
        console.error(e);
      }
    }, 1500);
  }
});


// Closing database connection when the server is closed. 
process.on("SIGINT", function () {
  db.close((err) => {
    if (err)
      return console.error(err.message);
    console.log("Closed DB");
    process.exit(0); // Exit the process after closing the database
  });
});

module.exports = app; //for testing
