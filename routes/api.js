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
      let insert_thread = `
      INSERT INTO thread (board, text, delete_password) 
      VALUES (?, ?, ?)`;
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

      let update = `
      UPDATE thread 
      SET reported = true 
      WHERE _id = ?`;

      let exist_thread = `
      SELECT _id FROM thread 
      WHERE _id = ?`;
      let use_id;

      // We have two ways to report a thread one via API index page and the other via the board page.x
      thread_id != undefined ? (use_id = thread_id) : (use_id = report_id);

      // Check if thread exist in database.
      db.get(exist_thread, [use_id], (err, id_checkobj) => {
        if (err) {
          console.error(err.message);
          return res.status(500).send({ error: "Internal Server Error" });
        }
        // If id undefined means it doesn't exist.
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

      // Delete record from thread table
      let delete_row = `
      DELETE FROM thread 
      WHERE _id = ? `;

      // Retrieve the password for comparing.
      let get_password = `
      SELECT delete_password FROM thread 
      WHERE _id = ?`;
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

  app
    .route("/api/replies/:board")

    // GET method. See the thread with all replies that exist for that thread.
    .get((req, res) => {
      const { thread_id } = req.query;

      // Select the thread.
      let selectthread = `
      SELECT * FROM thread 
      WHERE _id = ?`;

      db.get(selectthread, [thread_id], (err, one_thread) => {
        if (err) {
          console.error(err.message);
          return res.status(500).send({ error: "Internal Server Error" });
        }

        // Deleting delete_password and reported field from the thread.
        delete one_thread.delete_password;
        delete one_thread.reported;

        // Get the replies in the thread
        let get_replies = `
        SELECT * FROM replies 
        WHERE thread_id = ?
        ORDER BY created_on DESC`;

        db.all(get_replies, [one_thread._id], (err, all_replies) => {
          if (err) {
            console.error(err.message);
            return res.status(500).send({ error: "Internal Server Error" });
          }

          // Iterating through replies for that thread found.
          all_replies.forEach((reply_in_thread) => {
            // Deleting delete_password and reported field from the replies.
            delete reply_in_thread.delete_password;
            delete reply_in_thread.reported;
          });

          // Adding all replies to the thread. Due to 2 tables in database one for thread and replies connecting them.
          one_thread.replies = all_replies;

          // Send the thread with all replies as the response
          res.send(one_thread);
        });
      });
    })

    // POST method. Post reply to a thread and bumps the thread timestamp.
    .post((req, res) => {
      const { text, delete_password, thread_id } = req.body;
      const board = req.params.board;

      // Insert the reply
      let insert_reply = `
      INSERT INTO replies (board, text, delete_password, thread_id) 
      VALUES (?,?,?,?)`;

      // Update bumped_on date in the thread table
      let update_bumped_on = `
      UPDATE thread 
      SET bumped_on = CURRENT_TIMESTAMP 
      WHERE _id = ?`;

      db.run(insert_reply, [board, text, delete_password, thread_id], (err) => {
        if (err) {
          console.error(err.message);
          return res.status(500).send({ error: "Internal Server Error" });
        }

        // After successfully inserting the reply, update bumped_on date
        db.run(update_bumped_on, [thread_id], (err) => {
          if (err) {
            console.error(err.message);
            return res.status(500).send({ error: "Internal Server Error" });
          }

          // Send confirmation
          res.status(200).redirect("back");
        });
      });
    })
    .put((req, res) => {
      const { thread_id, reply_id } = req.body;
      // console.log(thread_id, reply_id, req.params.board);

      // Update reportede for the reply to true
      let update = `
      UPDATE replies
      SET reported = true
      WHERE _id = ? AND thread_id = ?`;

      // Checking if the reply exist
      let exist_reply = `
      SELECT _id, thread_id FROM replies
      WHERE _id = ? AND thread_id = ?`;

      db.get(exist_reply, [reply_id, thread_id], (err, reply_obj) => {
        if (err) {
          console.error(err.message);
          return res.status(500).send({ error: "Internal Server Error" });
        }
        // If reply_obj is undefined means it doesn't exist.
        else if (reply_obj === undefined) {
          res.send("Reply does not exist");
          return;
        }
        // Adding _id to the reply object.
        reply_obj_id = reply_obj._id;
        // console.log(reply_obj, reply_obj_id);

        // If the reply_id matches with the reply id from database we update.
        if (reply_id === reply_obj_id) {
          db.run(update, [reply_obj_id, thread_id], (err) => {
            if (err) {
              console.error(err.message);
              return res.status(500).send({ error: "Internal Server Error" });
            }

            res.send("reported");
          });
        }
      });
    })

    // DELETE method. "Deletes" the reply text, replaces the text with [deleted]
    .delete((req, res) => {
      const { thread_id, reply_id, delete_password } = req.body;
      // console.log(thread_id, reply_id, delete_password, req.params.board);

      // Delete record from replies table
      let delete_row_r = `
      UPDATE replies
      SET text = "[deleted]" 
      WHERE _id = ? AND thread_id = ?`;

      // Get password for that specific reply
      let get_password_r = `
      SELECT delete_password FROM replies
      WHERE _id = ? AND thread_id = ?`;

      db.get(get_password_r, [reply_id, thread_id], (err, passwordobj) => {
        if (err) {
          console.error(err.message);
          return res.status(500).send({ error: "Internal Server Error" });
        }

        // Adding delete_password to the password object
        password = passwordobj.delete_password;

        // console.log("this in api:", password);

        // If the password matches with the password stored in db proceed with deleting the reply.
        if (delete_password === password) {
          db.run(delete_row_r, [reply_id, thread_id], (err) => {
            if (err) {
              console.error(err.message);
              return res.status(500).send({ error: "Internal Server Error" });
            }
            res.send("success");
          });
        } else {
          res.send("incorrect password");
        }
      });
    });
};
