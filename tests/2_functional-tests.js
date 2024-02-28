const chaiHttp = require("chai-http");
const chai = require("chai");
const assert = chai.assert;
const server = require("../server");

chai.use(chaiHttp);

suite("Functional Tests", function () {
  // Creating a new thread: POST request to /api/threads/{board}
  suite("POST /api/threads/test ", function () {
    test("Creating and checking if the thread exist", function (done) {
      chai
        .request(server)
        .post("/api/threads/test")
        .send({
          board: "test",
          text: "Created via test",
          delete_password: "1234",
        })
        .end(function (err, res) {
          assert.equal(res.status, 200); // POST success, created thread.
          // Checking if the thread created on the board exist.
          chai
            .request(server)
            .get("/api/threads/test")
            .end(function (err, res) {
              const id = res.body[0]._id;
              // Check if the response status is 200
              assert.equal(res.status, 200);
              // console.log(id);
              assert.exists(id, "Should exist");
              done();
            });
        });
    });
  });
  // Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}
  suite("GET /api/threads/test", function () {
    test("Viewing the 10 most recent threads with 3 replies each:", function (done) {
      chai
        .request(server)
        .get("/api/threads/test")
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.isArray(res.body, "The response is array");
          assert.isAtMost(
            res.body.length,
            10,
            "Only show atmost 10 threads on the board"
          );
          res.body.forEach((thread) => {
            assert.property(thread, "_id", "Thread should have an ID");
            assert.property(thread, "text", "Thread should have text");
            assert.isArray(thread.replies, "Replies should be an array");
            assert.isAtMost(
              thread.replies.length,
              3,
              "Only show atmost 3 replies per thread"
            );
          });
          done();
        });
    });
  });
  // Deleting a thread with the incorrect password: DELETE request to /api/threads/{board} with an invalid delete_password
  suite("DELETE /api/threads/test", function () {
    test("Deleting a thread with incorrect password", function (done) {
      // Deleting thread with an incorrect password
      // First creating new thread
      chai
        .request(server)
        .post("/api/threads/test")
        .send({
          board: "test",
          text: "Created via test",
          delete_password: "1234",
        })
        .end(function (err, res) {
          assert.equal(res.status, 200); // Created thread.
          // Checking if the thread created on the board exist.
          chai
            .request(server)
            .get("/api/threads/test")
            .end(function (err, res) {
              const id = res.body[0]._id;
              chai
                .request(server)
                .delete("/api/threads/test")
                .send({
                  thread_id: id,
                  delete_password: "this_password_is_wrong", // incorrect password
                })
                .end(function (err, res) {
                  assert.equal(res.status, 200);
                  assert.equal(
                    res.text,
                    "incorrect password",
                    "Should get 'incorrect password'"
                  );
                  done();
                });
            });
        });
    });
  });
  // Deleting a thread with the correct password: DELETE request to /api/threads/{board} with a valid delete_password
  suite("DELETE /api/threads/test", function () {
    test("Deleting a thread with correct password", function (done) {
      // Deleting thread with correct password.
      // First make a new thread then delete it
      chai
        .request(server)
        .post("/api/threads/test")
        .send({
          board: "test",
          text: "Created via test",
          delete_password: "1234",
        })
        .end(function (err, res) {
          assert.equal(res.status, 200); // Created thread.
          // Checking if the thread created on the board exist.
          chai
            .request(server)
            .get("/api/threads/test")
            .end(function (err, res) {
              const id = res.body[0]._id;
              chai
                .request(server)
                .delete("/api/threads/test")
                .send({
                  thread_id: id,
                  delete_password: "1234", // correct password
                })
                .end(function (err, res) {
                  assert.equal(res.status, 200);
                  assert.equal(res.text, "success", "Should get 'success'");
                  done();
                });
            });
        });
    });
  });
  // Reporting a thread: PUT request to /api/threads/{board}
  suite("PUT /api/threads/test", function () {
    test("Updating a thread with reported = true", function (done) {
      // Reporting a thread
      // First make a new thread then delete it
      chai
        .request(server)
        .post("/api/threads/test")
        .send({
          board: "test",
          text: "Created via test",
          delete_password: "1234",
        })
        .end(function (err, res) {
          assert.equal(res.status, 200); // Created thread.
          chai
            .request(server)
            .get("/api/threads/test")
            .end(function (err, res) {
              const id = res.body[0]._id;
              chai
                .request(server)
                .put("/api/threads/test")
                .send({
                  thread_id: id,
                })
                .end(function (err, res) {
                  assert.equal(res.status, 200);
                  assert.equal(res.text, "reported", "Should get 'reported'");
                  done();
                });
            });
        });
    });
  });
  // Creating a new reply: POST request to /api/replies/{board}
  suite("POST /api/replies/:board", function () {
    test("Creating a new reply", function (done) {
      // Create a reply to a thread
      // First create thread and retrieve the id to reply to.
      chai
        .request(server)
        .post("/api/threads/test")
        .send({
          board: "test",
          text: "Thread to add reply to",
          delete_password: "1234",
        })
        .end(function (err, res) {
          assert.equal(res.status, 200); // Created thread
          // Get id
          chai
            .request(server)
            .get("/api/threads/test")
            .end(function (err, res) {
              const id = res.body[0]._id;
              // console.log(id);
              // Check if the response status is 200
              assert.equal(res.status, 200);
              // Creating an reply to the thread
              chai
                .request(server)
                .post("/api/replies/test")
                .send({
                  board: "test",
                  thread_id: id,
                  text: "This is the reply",
                  delete_password: "1234",
                })
                .end(function (err, res) {
                  assert.equal(res.status, 200); // Created reply
                  chai
                    .request(server)
                    .get("/api/threads/test")
                    .end(function (err, res) {
                      const reply_count = res.body[0].replycount;
                      assert.equal(reply_count, 1, "Reply count should be 1");
                      done();
                    });
                });
            });
        });
    });
  });
  //// Viewing a single thread with all replies: GET request to /api/replies/{board}
  suite("GET /api/replies/test", function () {
    test("Viewing a single thread with all replies", function (done) {
      // Get id to view the replies on that thread id
      chai
        .request(server)
        .get("/api/threads/test")
        .end(function (err, res) {
          const id = res.body[0]._id;
          // console.log(id);
          assert.equal(res.status, 200);
          // Get the replies for the thread.
          chai
            .request(server)
            .get("/api/replies/test")
            .query({ thread_id: id })
            .end(function (err, res) {
              // console.log(res.body.replies);
              assert.equal(res.status, 200);
              assert.isArray(res.body.replies);
              res.body.replies.forEach(function (reply) {
                assert.property(reply, "_id");
                assert.property(reply, "text");
                assert.equal(
                  res.body.replies[0].thread_id,
                  id,
                  "Thread id table (primary) should match with the replies (foreign key:thread id)"
                );
              });
              done();
            });
        });
    });
  });
  // Deleting a reply with the incorrect password: DELETE request to /api/replies/{board} with an invalid delete_password
  suite("DELETE /api/replies/test", function () {
    test("Deleting a reply with incorrect password", function (done) {
      // Deleting thread with an incorrect password
      // First get id to view the replies on that thread id and then delete
      chai
        .request(server)
        .get("/api/threads/test")
        .end(function (err, res) {
          const id = res.body[0]._id;
          // console.log(id);
          assert.equal(res.status, 200);
          // Get the replies for the thread.
          chai
            .request(server)
            .get("/api/replies/test")
            .query({ thread_id: id })
            .end(function (err, res) {
              assert.equal(res.status, 200);

              // console.log(res.body.replies[0]._id, res.body.replies[0].thread_id);
              // Need the reply id and the thread id for deleting.
              const replyid = res.body.replies[0]._id;
              const threadid = res.body.replies[0].thread_id;
              // console.log(res.body);
              // console.log("her", replyid, threadid);
              chai
                .request(server)
                .delete("/api/replies/test")
                .send({
                  thread_id: threadid,
                  reply_id: replyid,
                  delete_password: "this_password_is_wrong",
                })
                .end(function (err, res) {
                  assert.equal(res.status, 200);
                  // console.log(res.text);
                  assert.equal(
                    res.text,
                    "incorrect password",
                    "Should get 'incorrect password'"
                  );

                  done();
                });
            });
        });

      // Deleting a reply with the correct password: DELETE request to /api/replies/{board} with a valid delete_password
      suite("DELETE /api/replies/test", function () {
        test("Deleting a reply with correct password", function (done) {
          // Deleting thread with an correct password
          // First get id to view the replies on that thread id and then delete
          chai
            .request(server)
            .get("/api/threads/test")
            .end(function (err, res) {
              const id = res.body[0]._id;
              // console.log(id);
              assert.equal(res.status, 200);
              // Get the replies for the thread.
              chai
                .request(server)
                .get("/api/replies/test")
                .query({ thread_id: id })
                .end(function (err, res) {
                  assert.equal(res.status, 200);

                  // console.log(res.body.replies[0]._id, res.body.replies[0].thread_id);
                  // Need the reply id and the thread id for deleting.
                  const replyid = res.body.replies[0]._id;
                  const threadid = res.body.replies[0].thread_id;
                  // console.log(res.body);
                  // console.log("her", replyid, threadid);
                  // Deleting reply with correct password
                  chai
                    .request(server)
                    .delete("/api/replies/test")
                    .send({
                      thread_id: threadid,
                      reply_id: replyid,
                      delete_password: "1234",
                    })
                    .end(function (err, res) {
                      assert.equal(res.status, 200);
                      // console.log(res.text);
                      assert.equal(res.text, "success", "Should get 'success'");

                      done();
                    });
                });
            });
        });
      });
      //// Reporting a reply: PUT request to /api/replies/{board}
      suite("PUT /api/replies/test", function () {
        test("updating a reply with reported = true", function (done) {
          // First get id to view the replies on that thread id and then report
          chai
            .request(server)
            .get("/api/threads/test")
            .end(function (err, res) {
              const id = res.body[0]._id;
              // console.log(id);
              assert.equal(res.status, 200);
              // Get the replies for the thread.
              chai
                .request(server)
                .get("/api/replies/test")
                .query({ thread_id: id })
                .end(function (err, res) {
                  assert.equal(res.status, 200);

                  // console.log(res.body.replies[0]._id, res.body.replies[0].thread_id);
                  // Need the reply id and the thread id for deleting.
                  const replyid = res.body.replies[0]._id;
                  const threadid = res.body.replies[0].thread_id;
                  // console.log(res.body);
                  // console.log("her", replyid, threadid);
                  // Updating reply with reported = true
                  chai
                    .request(server)
                    .put("/api/replies/test")
                    .send({
                      thread_id: threadid,
                      reply_id: replyid,
                    })
                    .end(function (err, res) {
                      assert.equal(res.status, 200);
                      // console.log(res.text);
                      assert.equal(
                        res.text,
                        "reported",
                        "Should get 'reported'"
                      );
                      done();
                    });
                });
            });
        });
      });
    });
  });
});
