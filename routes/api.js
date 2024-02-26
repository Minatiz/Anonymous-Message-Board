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
  app
    .route("/api/threads/:board")
    // POST method. Post text and delete_password and add to db. Board is gathered by the board params.
    .post((req, res) => {
      // For the board name we are posting on.
      const board = req.params.board;
      const { text, delete_password } = req.body;

      // console.log("HER:", req.body);

      // Insert new thread into the database
      let insert_thread = `INSERT INTO thread (board, text, delete_password) VALUES (?, ?, ?)`;
      db.run(insert_thread, [board, text, delete_password], (err) => {
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

      let update = `UPDATE thread SET reported = true WHERE _id = ?`;
      let exist_thread = `SELECT _id FROM thread WHERE _id = ?`;
      let use_id;

      // We have two ways to report a thread one via API index page and the other via the board page.x
      thread_id != undefined ? (use_id = thread_id) : (use_id = report_id);

      // Check if thread exist in database.
      db.get(exist_thread, [use_id], (err, id_checkobj) => {
        if (err) {
          console.error(err.message);
          return res.status(500).send({ error: "Internal Server Error" });
        }
        // If id undefined means doesn't exist.
        else if (id_checkobj === undefined) {
          res.send("Thread does not exist");
          return;
        }
        id_check = id_checkobj._id;

        // Check if the id exist in db if so update to true the id.
        if (use_id == id_check) {
          db.run(update, [use_id], (err) => {
            if (err) {
              console.error(err.message);
              return res.status(500).send({ error: "Internal Server Error" });
            }

            res.send("reported");
          });
        }
      });
    })

    // Delete method. Deletes thread
    .delete((req, res) => {
      const { thread_id, delete_password } = req.body;
      // Delete record from db
      let delete_row = `DELETE FROM thread WHERE _id = ? `;
      // Retrieve the password for comparing.
      let get_password = `SELECT delete_password FROM thread WHERE _id = ?`;
      db.get(get_password, [thread_id], (err, passwordobj) => {
        if (err) {
          console.error(err.message);
          return res.status(500).send({ error: "Internal Server Error" });
        }
        // If password undefined means doesnt exist based of the _id which means that the thread doesn't exist.
        else if (passwordobj === undefined) {
          res.send("Thread does not exist");
          return;
        }
        // Interested in the password string only.
        password = passwordobj.delete_password;
        // console.log( delete_password, password);

        // If the password matches with the password stored in db proceed with deleting the thread.
        if (delete_password === password) {
          db.run(delete_row, [thread_id], (err) => {
            if (err) {
              console.error(err.message);
              return res.status(500).send({ error: "Internal Server Error" });
            }
            res.send("success");
          });
          // Output to user incorrect password.
        } else {
          res.send("incorrect password");
        }
      });
    });

  app.route("/api/replies/:board");
};
