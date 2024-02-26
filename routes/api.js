const sqlite3 = require("sqlite3").verbose();

// Check out:
// https://www.sqlitetutorial.net/sqlite-nodejs/
// https://expressjs.com/en/guide/routing.html

// Opening database with read and write permission.
let db = new sqlite3.Database(
  "./messageboard.db",
  sqlite3.OPEN_READWRITE,
  (err) => {
    if (err) {
      console.error(err.message);
      return res
        .status(500)
        .send({ error: "Error connecting to the database" });
    }
    console.log("Connected to DB");
  }
);

// Closing database connection when the server is closed
process.on("SIGINT", function () {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log("Closed DB");
    process.exit(0); // Exit the process after closing the database
  });
});

module.exports = function (app) {
  // POST method. Post text and delete_password and add to db. Board is gathered by the board params.
  app
    .route("/api/threads/:board")
    .post((req, res) => {
      // For the board name we are posting on.
      const board = req.params.board;
      const { text, delete_password } = req.body;

      // console.log("HER:", req.body);

      // Insert new thread into the database
      let sql = `INSERT INTO thread (board, text, delete_password) VALUES (?, ?, ?)`;
      db.run(sql, [board, text, delete_password], (err) => {
        if (err) {
          console.error(err.message);
          return res.status(500).send({ error: "Internal Server Error" });
        }

        res.status(200).redirect("back");
      });
    })

    // GET method. Get the recent 10 threads on the board and with only 3 replies for each thread.
    .get((req, res) => {
      const board = req.params.board;

      // Want only to retrieve the 10 recent bumped threads on the board.
      // For board we check with "WHERE board = ?" And input this as sql search.
      let selectThreadsSql = `
      SELECT * FROM thread
      WHERE board = ?
      ORDER BY bumped_on DESC
      LIMIT 10`;

      db.all(selectThreadsSql, [board], (err, threads) => {
        if (err) {
          console.error(err.message);
          return res.status(500).send({ error: "Internal Server Error" });
        }

        var number_of_threads = 0;

        // Iterating through threads
        threads.forEach((thread) => {
          // Select query we want to see the 3 most recent replies for each thread.
          let selectRepliesSql = `
          SELECT * FROM replies
          WHERE thread_id = ?
          ORDER BY created_on DESC
          LIMIT 3`;

          db.all(selectRepliesSql, [thread._id], (err, replies) => {
            if (err) {
              console.error(err.message);
              return res.status(500).send({ error: "Internal Server Error" });
            }

            // Deleting delete_password and reported fields from all the threads
            delete thread.delete_password;
            delete thread.reported;

            // Deleting delete_password and reported fields from the 3 recent replies
            replies.forEach((reply) => {
              delete reply.delete_password;
              delete reply.reported;
            });

            // Adding the replies to the thread object and incrementing the thread count
            thread.replies = replies;

            // Increment the number of threads
            number_of_threads++;
            // console.log(number_of_threads, threads.length);
            // Return response when we reached the actual count of threads in the board. Max:10
            if (number_of_threads === threads.length) {
              res.send(threads);
            }
          });
        });
      });
    })

    // PUT METHOD. Updates reported to true on a thread.
    .put((req, res) => {
      const { thread_id, report_id } = req.body;

      let sql = `UPDATE thread SET reported = true WHERE _id = ?`;
      // We have two ways to report a thread one via API index page and the other via the board page.
      if (thread_id != undefined) {
        db.run(sql, [thread_id], (err) => {
          if (err) {
            console.error(err.message);
            return res.status(500).send({ error: "Internal Server Error" });
          }
          res.send("reported");
        });
      } else {
        db.run(sql, [report_id], (err) => {
          if (err) {
            console.error(err.message);
            return res.status(500).send({ error: "Internal Server Error" });
          }
          res.send("reported");
        });
      }
    })

    .delete((req, res) => {
      console.log(req.body);
    });

  app.route("/api/replies/:board");
};
