const express = require("express");
const bcrypt = require("bcrypt-nodejs");
const cors = require("cors");
const knex = require("knex");

const db = knex({
  client: "pg",
  connection: {
    host: "127.0.0.1",
    user: "postgres",
    password: "postgres",
    database: "myform",
  },
});

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send(db.users);
});

app.post("/signin", (req, res) => {
  db.select("email", "hash")
    .from("login")
    .where("email", "=", req.body.email)
    .then((data) => {
      const isValid = bcrypt.compareSync(req.body.password, data[0].hash);
      if (isValid) {
        return db
          .select("*")
          .from("users")
          .where("email", "=", req.body.email)
          .then((user) => {
            res.json(user[0]);
          })
          .catch((err) => res.status(400).json("unable to get user"));
      } else {
        res.status(400).json("wrong credentials");
      }
    })
    .catch((err) => res.status(400).json("wrong credentials"));
});

app.post("/register", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json("incorrect from submission");
  }
  const hash = bcrypt.hashSync(password);
  db.transaction((trx) => {
    trx
      .insert({
        hash: hash,
        email: email,
      })
      .into("login")
      .returning("email")
      .then((loginEmail) => {
        return trx("users")
          .returning("*")
          .insert({
            email: loginEmail[0],
          })
          .then((user) => {
            res.json(user[0]);
          });
      })
      .then(trx.commit)
      .catch(trx.rollback);
  }).catch((err) => res.status(400).json("unable to register"));
});

app.put("/updateresponses/:id", (req, res) => {
  const { id } = req.params;
  const responses = Object.entries(req.body);
  const queries = responses.map((ele) => ({
    pid: id,
    qid: ele[0],
    resp: ele[1],
  }));
  // console.log(queries);
  db("responses")
    .insert(queries)
    .onConflict([`pid`, `qid`])
    .merge()
    .then((reponse) => {
      res.json({ success: true, message: "ok" });
    })
    .catch((err) => res.json(err.message));
});

app.get("/showresponses/:id", (req, res) => {
  const { id } = req.params;
  db.select("qid", "resp")
    .from("responses")
    .where("pid", "=", id)
    .orderBy("qid")
    .then((responses) => {
      res.json(responses);
    })
    .catch((err) => res.status(400).json("error getting responses"));
});

app.get("/form", (req, res) => {
  db.select("*")
    .from("questions")
    .then((questions) => {
      res.json(questions);
    })
    .catch((err) => res.status(400).json("unable to get entries"));
});

app.listen(3000, () => {
  console.log("app is running on port 3000");
});
