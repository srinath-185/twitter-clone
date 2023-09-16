const express = require("express");
const app = express();

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const dbPath = path.join(__dirname, "twitterClone.db");

app.use(express.json());

let db;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const authenticateToken = (request, response, next) => {
  const { tweet } = request.body;
  const { tweetId } = request.params;

  let jwtToken;
  const authHeader = request.headers["authorization"];

  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }

  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.payload = payload;
        request.tweetId = tweetId;
        request.tweet = tweet;
        next();
      }
    });
  }
};

app.post("/register/", async (request, response) => {
  const { userName, password, name, gender } = request.body;

  const selectUserQuery = `SELECT * FROM user WHERE username = '${userName}';`;
  const user = await db.get(selectUserQuery);

  if (user !== undefined) {
    response.status(400);
    response.send("User already exists");
  } else {
    const user = await db.run(selectUserQuery);

    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const createUserQuery = `INSERT INTO user ( name, username, password, gender )
      VALUES (
        '${name}',
        '${userName}',
        '${hashedPassword}',
        '${gender}'
      )
    ;`;
      response.status(200);
      response.send("User created successfully");
    }
  }
});

app.post("/login/", async (request, response) => {
  const { userName, password } = request.body;

  const selectUserQuery = `SELECT * FROM user WHERE username = '${userName}';`;
  const user = await db.get(selectUserQuery);

  if (user === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, user.password);

    if (!isPasswordMatched) {
      response.status(400);
      response.send("Invalid password");
    } else {
      const payload = { username: username };
      const jwtoken = jwt.sign(payload, "MY_SECRET_TOKEN");

      response.send({ jwtoken });
    }
  }
});

app.get("/user/tweets/feed/", async (request, response) => {
  const { userDetails } = request;
  const { userId, name, username, gender } = userDetails;

  const getTweetFeedQuery = `SELECT username, tweet, date_time 
     FROM follower INNER JOIN tweet ON follower.following_user_id = tweet.user_id
     INNER JOIN user ON user.user_id = follower.following_user_id
     WHERE username = ${userName}
     ORDER BY date_time DESC
     LIMIT 4;`;

  const tweetFeed = await db.all(getTweetFeedQuery);
  response.send(tweetFeedQ);
});
