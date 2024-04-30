const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const bodyParser = require("body-parser");
const passport = require("passport");
const LocalStrategy = require("passport-local");
// const crypto = require("crypto");
const bcrypt = require("bcrypt");
const mysql = require("mysql");
const cors = require("cors");
const session = require("express-session");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// MySQL database configuration
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "userdb",
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error("MySQL connection error:", err);
    process.exit(1);
  }
  console.log("Connected to MySQL database");
});

// Express middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json()); // Parse JSON bodies
app.use(
  session({
    secret: "abc123",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(cors());

// Passport configuration
passport.use(
  new LocalStrategy(function verify(username, password, done) {
    db.query(
      "SELECT * FROM users WHERE username = ?",
      [username],
      function (err, rows) {
        if (err) {
          return done(err);
        }
        if (!rows || !rows.length) {
          return done(null, false, { message: "Incorrect username." });
        }
        const user = rows[0];
        bcrypt.compare(password, user.password, function (err, isMatch) {
          if (err) {
            return done(err);
          }
          if (isMatch) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Incorrect password." });
          }
        });
      }
    );
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  db.query("SELECT * FROM users WHERE id = ?", [id], (err, rows) => {
    if (err) {
      console.error("Error in deserializeUser:", err);
      return done(err);
    }
    done(null, rows[0]);
  });
});

// login
app.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      console.error("Error in passport.authenticate:", err);
      return next(err);
    }
    if (!user) {
      return res.status(401).json({ message: info.message });
    }
    req.logIn(user, (err) => {
      if (err) {
        console.error("Error in req.logIn:", err);
        return next(err);
      }
      console.log("user: ", user);
      return res.status(200).json({ message: "Login successful", user });
    });
  })(req, res, next);
});

// Implement logout functionality
app.post("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ message: "Error logging out" });
    }
    return res.status(200).json({ message: "Logout successful" });
  });
});

app.post("/register", async (req, res) => {
  const { username, password, mobile } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    db.query(
      "INSERT INTO users (username, password, mobile) VALUES (?, ?, ?)",
      [username, hash, mobile],
      (err, result) => {
        if (err) {
          console.error("Error registering user:", err);
          return res.status(500).json({ message: "Error registering user" });
        }
        return res.status(201).json({ message: "Registration successful" });
      }
    );
  } catch (error) {
    console.error("Error hashing password:", error);
    return res.status(500).json({ message: "Error hashing password" });
  }
});

// Socket.io logic
io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("join group", ({ username, groupName }) => {
    console.log(`${username} joined group: ${groupName}`);
    socket.groupName = groupName;
    socket.join(groupName);
  });

  socket.on("leave group", ({ username, groupName }) => {
    console.log(`${username} left group: ${groupName}`);
    socket.leave(groupName);
  });

  socket.on("chat message", ({ sender, message }) => {
    const groupName = socket.groupName;
    io.to(groupName).emit("chat message", { sender, message });
    console.log(`${sender} sent message: ${message}`);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// const express = require("express");
// const http = require("http");
// const socketIo = require("socket.io");
// const bodyParser = require("body-parser");
// const passport = require("passport");
// const LocalStrategy = require("passport-local");
// const crypto = require("crypto");
// const bcrypt = require("bcrypt");
// const mysql = require("mysql");
// const cors = require("cors");
// const session = require("express-session");

// const app = express();
// const server = http.createServer(app);
// const io = socketIo(server);

// // MySQL database configuration
// const db = mysql.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "pass123",
//   database: "userdb",
// });

// // Connect to MySQL
// db.connect((err) => {
//   if (err) {
//     console.error("MySQL connection error:", err);
//     process.exit(1);
//   }
//   console.log("Connected to MySQL database");
// });

// // Express middleware
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.json()); // Parse JSON bodies
// app.use(
//   session({
//     secret: "abc123",
//     resave: false,
//     saveUninitialized: false,
//   })
// );
// app.use(passport.initialize());
// app.use(passport.session());
// app.use(cors());

// // Passport configuration
// passport.use(
//   new LocalStrategy(function verify(username, password, done) {
//     db.query(
//       "SELECT * FROM users WHERE username = ?",
//       [username],
//       function (err, rows) {
//         if (err) {
//           return done(err);
//         }
//         if (!rows || !rows.length) {
//           return done(null, false, { message: "Incorrect username." });
//         }
//         const user = rows[0];
//         bcrypt.compare(password, user.password, function (err, isMatch) {
//           if (err) {
//             return done(err);
//           }
//           if (isMatch) {
//             return done(null, user);
//           } else {
//             return done(null, false, { message: "Incorrect password." });
//           }
//         });
//       }
//     );
//   })
// );

// passport.serializeUser((user, done) => {
//   done(null, user.id);
// });

// passport.deserializeUser((id, done) => {
//   db.query("SELECT * FROM users WHERE id = ?", [id], (err, rows) => {
//     if (err) {
//       console.error("Error in deserializeUser:", err);
//       return done(err);
//     }
//     done(null, rows[0]);
//   });
// });

// // Routes
// app.post("/login", (req, res, next) => {
//   passport.authenticate("local", (err, user, info) => {
//     if (err) {
//       console.error("Error in passport.authenticate:", err);
//       return next(err);
//     }
//     if (!user) {
//       return res.status(401).json({ message: info.message });
//     }
//     req.logIn(user, (err) => {
//       if (err) {
//         console.error("Error in req.logIn:", err);
//         return next(err);
//       }
//       return res.status(200).json({ message: "Login successful", user });
//     });
//   })(req, res, next);
// });

// app.post("/register", async (req, res) => {
//   const { username, password, mobile } = req.body;
//   try {
//     const salt = await bcrypt.genSalt(10);
//     const hash = await bcrypt.hash(password, salt);
//     db.query(
//       "INSERT INTO users (username, password, mobile) VALUES (?, ?, ?)",
//       [username, hash, mobile],
//       (err, result) => {
//         if (err) {
//           console.error("Error registering user:", err);
//           return res.status(500).json({ message: "Error registering user" });
//         }
//         return res.status(201).json({ message: "Registration successful" });
//       }
//     );
//   } catch (error) {
//     console.error("Error hashing password:", error);
//     return res.status(500).json({ message: "Error hashing password" });
//   }
// });

// // Socket.io logic
// io.on("connection", (socket) => {
//   console.log("a user connected");

//   // Your socket.io logic here...

//   socket.on("disconnect", () => {
//     console.log("user disconnected");
//   });
// });

// const PORT = process.env.PORT || 3000;
// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });
//--------------------------------
// const express = require("express");
// const http = require("http");
// const socketIo = require("socket.io");
// const bodyParser = require("body-parser");
// const passport = require("passport");
// const LocalStrategy = require("passport-local").Strategy;
// const bcrypt = require("bcrypt");
// const mysql = require("mysql");
// const cors = require("cors");
// const session = require("express-session");

// const app = express();
// const server = http.createServer(app);
// const io = socketIo(server);

// // MySQL database configuration
// const db = mysql.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "pass123",
//   database: "userdb",
// });

// // Connect to MySQL
// db.connect((err) => {
//   if (err) {
//     console.error("MySQL connection error:", err);
//     process.exit(1);
//   }
//   console.log("Connected to MySQL database");
// });

// // Express middleware
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.json()); // Parse JSON bodies
// app.use(
//   session({
//     secret: "abc123",
//     resave: false,
//     saveUninitialized: false,
//   })
// );
// app.use(passport.initialize());
// app.use(passport.session());
// app.use(cors());

// // Passport configuration
// passport.use(
//   new LocalStrategy(
//     {
//       usernameField: "username",
//       passwordField: "password",
//     },
//     async (username, password, done) => {
//       try {
//         const [rows] = await db.query(
//           "SELECT * FROM users WHERE username = ?",
//           [username]
//         );
//         if (!rows.length) {
//           return done(null, false, { message: "Incorrect username." });
//         }
//         const user = rows[0];
//         console.log(user);
//         const isMatch = await bcrypt.compare(password, user.password);
//         if (isMatch) {
//           return done(null, user);
//         } else {
//           return done(null, false, { message: "Incorrect password." });
//         }
//       } catch (error) {
//         return done(error);
//       }
//     }
//   )
// );

// passport.serializeUser((user, done) => {
//   done(null, user.id);
// });

// passport.deserializeUser((id, done) => {
//   db.query("SELECT * FROM users WHERE id = ?", [id], (err, rows) => {
//     done(err, rows[0]);
//   });
// });

// // Routes
// app.post("/login", (req, res, next) => {
//   passport.authenticate("local", (err, user, info) => {
//     if (err) return next(err);
//     if (!user) {
//       return res.status(401).json({ message: info.message });
//     }
//     req.logIn(user, (err) => {
//       if (err) return next(err);
//       return res.status(200).json({ message: "Login successful", user });
//     });
//   })(req, res, next);
// });

// app.post("/register", async (req, res) => {
//   const { username, password, mobile } = req.body;
//   console.log(username, password, mobile);
//   try {
//     const salt = await bcrypt.genSalt(10);
//     const hash = await bcrypt.hash(password, salt);
//     db.query(
//       "INSERT INTO users (username, password, mobile) VALUES (?, ?, ?)",
//       [username, hash, mobile],
//       (err, result) => {
//         if (err) {
//           console.error("Error registering user:", err);
//           return res.status(500).json({ message: "Error registering user" });
//         } else {
//           return res.status(201).json({ message: "Registration successful" });
//         }
//       }
//     );
//   } catch (error) {
//     console.error("Error hashing password:", error);
//     return res.status(500).json({ message: "Error hashing password" });
//   }
// });

// // Socket.io logic
// io.on("connection", (socket) => {
//   console.log("a user connected");

//   // Your socket.io logic here...

//   socket.on("disconnect", () => {
//     console.log("user disconnected");
//   });
// });

// const PORT = process.env.PORT || 3000;
// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

// const express = require("express");
// const http = require("http");
// const socketIo = require("socket.io");
// const bodyParser = require("body-parser");
// const passport = require("passport");
// const LocalStrategy = require("passport-local").Strategy;
// const bcrypt = require("bcrypt");
// const mysql = require("mysql");
// const cors = require("cors");
// const session = require("express-session");

// const app = express();
// const server = http.createServer(app);
// const io = socketIo(server);

// // MySQL database configuration
// const db = mysql.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "pass123",
//   database: "userdb",
// });

// // Connect to MySQL
// db.connect((err) => {
//   if (err) {
//     console.error("MySQL connection error:", err);
//     process.exit(1);
//   }
//   console.log("Connected to MySQL database");
// });

// // Express middleware
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.json()); // Parse JSON bodies
// app.use(
//   session({
//     secret: "abc123",
//     resave: false,
//     saveUninitialized: false,
//   })
// );
// app.use(passport.initialize());
// app.use(passport.session());
// app.use(cors());

// // Passport configuration
// passport.use(
//   new LocalStrategy(
//     {
//       usernameField: "username",
//       passwordField: "password",
//     },
//     async (username, password, done) => {
//       try {
//         const [rows] = await db.query(
//           "SELECT * FROM users WHERE username = ?",
//           [username]
//         );
//         if (!rows.length) {
//           return done(null, false, { message: "Incorrect username." });
//         }
//         const user = rows[0];
//         const isMatch = await bcrypt.compare(password, user.password);
//         if (isMatch) {
//           return done(null, user);
//         } else {
//           return done(null, false, { message: "Incorrect password." });
//         }
//       } catch (error) {
//         return done(error);
//       }
//     }
//   )
// );

// passport.serializeUser((user, done) => {
//   done(null, user.id);
// });

// passport.deserializeUser((id, done) => {
//   db.query("SELECT * FROM users WHERE id = ?", [id], (err, rows) => {
//     done(err, rows[0]);
//   });
// });

// // Routes
// app.post("/login", (req, res, next) => {
//   passport.authenticate("local", (err, user, info) => {
//     if (err) return next(err);
//     if (!user) {
//       return res.status(401).json({ message: info.message });
//     }
//     req.logIn(user, (err) => {
//       if (err) return next(err);
//       return res.status(200).json({ message: "Login successful", user });
//     });
//   })(req, res, next);
// });

// app.post("/register", async (req, res) => {
//   console.log("in register");
//   const { username, password, mobile } = req.body;
//   console.log(username, password, mobile);

//   try {
//     const salt = await bcrypt.genSalt(10);
//     const hash = await bcrypt.hash(password, salt);
//     db.query(
//       "INSERT INTO users (username, password, mobile) VALUES (?, ?, ?)",
//       [username, hash, mobile],
//       (err, result) => {
//         if (err) {
//           console.error("Error registering user:", err);
//           return res.status(500).json({ message: "Error registering user" });
//         } else {
//           return res.status(201).json({ message: "Registration successful" });
//         }
//       }
//     );
//   } catch (error) {
//     console.error("Error hashing password:", error);
//     return res.status(500).json({ message: "Error hashing password" });
//   }
// });

// // Socket.io logic
// io.on("connection", (socket) => {
//   console.log("a user connected");

//   // Your socket.io logic here...

//   socket.on("disconnect", () => {
//     console.log("user disconnected");
//   });
// });

// const PORT = process.env.PORT || 3000;
// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

// ===================================

//========================================================================
/**
 * updated with  authentication, session, db.
 */

// server.js
// const express = require("express");
// const http = require("http");
// const socketIo = require("socket.io");
// const bodyParser = require("body-parser");
// const passport = require("passport");
// const LocalStrategy = require("passport-local").Strategy;
// const bcrypt = require("bcrypt");
// const mysql = require("mysql");
// const cors = require("cors");
// const session = require("express-session"); // Import express-session middleware

// const app = express();
// const server = http.createServer(app);
// const io = socketIo(server);

// // MySQL database configuration
// const db = mysql.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "pass123",
//   database: "userdb",
// });

// // Connect to MySQL
// db.connect((err) => {
//   if (err) {
//     console.error("MySQL connection error:", err);
//     process.exit(1);
//   }
//   console.log("Connected to MySQL database");
// });

// // Express middleware
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(
//   session({
//     secret: "abc123",
//     resave: false,
//     saveUninitialized: false,
//   })
// ); // Initialize session middleware
// app.use(passport.initialize());
// app.use(passport.session());
// app.use(cors());

// // Passport configuration
// passport.use(
//   new LocalStrategy((username, password, done) => {
//     db.query(
//       "SELECT * FROM users WHERE username = ?",
//       [username],
//       async (err, rows) => {
//         if (err) {
//           return done(err);
//         }
//         if (!rows.length) {
//           return done(null, false, { message: "Incorrect username." });
//         }

//         const user = rows[0];
//         try {
//           const result = await bcrypt.compare(password, user.password);
//           if (result) {
//             return done(null, user);
//           } else {
//             return done(null, false, { message: "Incorrect password." });
//           }
//         } catch (error) {
//           return done(error);
//         }
//       }
//     );
//   })
// );

// passport.serializeUser((user, done) => {
//   done(null, user.id);
// });

// passport.deserializeUser((id, done) => {
//   db.query("SELECT * FROM users WHERE id = ?", [id], (err, rows) => {
//     done(err, rows[0]);
//   });
// });

// // Routes
// app.post("/login", passport.authenticate("local"), (req, res) => {
//   // Successful authentication, send response as required
//   res.status(200).json({ message: "Login successful", user: req.user });
// });

// app.post("/register", async (req, res) => {
//   const { username, password, mobile } = req.body;
//   try {
//     const hash = await bcrypt.hash(password, 10);
//     db.query(
//       "INSERT INTO users (username, password, mobile) VALUES (?, ?, ?)",
//       [username, hash, mobile],
//       (err, result) => {
//         if (err) {
//           console.error("Error registering user:", err);
//           res.status(500).json({ message: "Error registering user" });
//         } else {
//           res.status(201).json({ message: "Registration successful" });
//         }
//       }
//     );
//   } catch (error) {
//     console.error("Error hashing password:", error);
//     res.status(500).json({ message: "Error hashing password" });
//   }
// });

// // Socket.io logic
// io.on("connection", (socket) => {
//   console.log("a user connected");

//   // Your socket.io logic here...

//   socket.on("disconnect", () => {
//     console.log("user disconnected");
//   });
// });

// const PORT = process.env.PORT || 3000;
// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

//------------------ v1.0 --------------------

/* * one to one + group chat functionality

*/
// const express = require('express'); //here express.js file is being acess
// const http = require('http'); //can't use app.listen() directly need to use http module bcoz work with socketio
// const socketIo = require('socket.io');

// const app = express();
// const server = http.createServer(app);
// const io = socketIo(server); // creating instance of socketio handle socket input output

// //connection
// io.on('connection', (socket) => { //socket is basically a client or user we r referring socket here
//     console.log('a user connected');

//     socket.on('join group', ({ username, groupName }) => {
//         console.log(`${username} joined group: ${groupName}`);
//         socket.groupName = groupName;
//         socket.join(groupName);
//     });

//     socket.on('leave group', ({ username, groupName }) => {
//         console.log(`${username} left group: ${groupName}`);
//         socket.leave(groupName);
//     });

//     socket.on('chat message', ({ sender, message }) => {
//         const groupName = socket.groupName;
//         io.to(groupName).emit('chat message', { sender, message }); //here just on recive a message client(i.e socket) server is brodcasting to group i.e to all sockets/users in group
//         console.log(`${sender} sent message: ${message}`);
//     });

//     socket.on('disconnect', () => {
//         console.log('user disconnected');
//     });
// });

// const PORT = process.env.PORT || 3000;
// server.listen(PORT, () => {
//     console.log(`Server running on port ${PORT} ......`);
// });

// * 1 to 1 chat functionality

// const express = require('express');
// const http = require('http');
// const socketIo = require('socket.io');

// const app = express();
// const server = http.createServer(app);
// const io = socketIo(server);

// io.on('connection', (socket) => {
//     console.log('a user connected');

//     socket.on('disconnect', () => {
//         console.log('user disconnected');
//     });

//     socket.on('chat message', (msg) => {
//         io.emit('chat message', msg);
//         console.log('msg: ', msg)
//     });
// });

// const PORT = process.env.PORT || 3000;
// server.listen(PORT, () => {
//     console.log(`Server running on port ${PORT} ......`);
// });