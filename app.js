require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const LocalStrategy = require("passport-local").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const flash = require("connect-flash");
const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());

app.use(
  session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 3600000, //1 hour
    },
  })
);

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(
  "mongodb+srv://admin-shubham:suman@20@cluster0.lzrwf.mongodb.net/adminDB",
  { useNewUrlParser: true, useUnifiedTopology: true }
);
mongoose.set("useCreateIndex", true);
mongoose.set("useFindAndModify", false);

function SessionConstructor(userId, userGroup, details) {
  this.userId = userId;
  this.userGroup = userGroup;
  this.details = details;
}

const userSchema = new mongoose.Schema({
  name: String,
  lname: String,
  email: String,
  phone: String,
  associate: String,
  salesPerson: String,
  response: String,
  comments: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

const adminSchema = new mongoose.Schema({
  name: String,
  lname: String,
  email: String,
  password: String,
  phone: String,
});

adminSchema.plugin(passportLocalMongoose);
adminSchema.plugin(findOrCreate);
adminSchema.index({ unique: false });

const Admin = new mongoose.model("Admin", adminSchema);
passport.use("admin", Admin.createStrategy());

const associateSchema = new mongoose.Schema({
  name: String,
  lname: String,
  email: String,
  password: String,
  phone: String,
  assignedClient: [
    {
      userId: String,
      name: String,
      email: String,
      phone: String,
      response: String,
      comments: String,
    },
  ],
});

associateSchema.plugin(passportLocalMongoose);

const Associate = new mongoose.model("Associate", associateSchema);
passport.use("associate", Associate.createStrategy());

const salesPersonSchema = new mongoose.Schema({
  name: String,
  lname: String,
  email: String,
  password: String,
  phone: String,
  assignedClient: [
    {
      userId: String,
      name: String,
      email: String,
      phone: String,
      response: String,
      comments: String,
    },
  ],
});

salesPersonSchema.plugin(passportLocalMongoose);

const SalesPerson = new mongoose.model("SalesPerson", salesPersonSchema);
passport.use("salesPerson", SalesPerson.createStrategy());

passport.serializeUser(function (userObject, done) {
  let userGroup = "Admin";
  let userPrototype = Object.getPrototypeOf(userObject);
  if (userPrototype === Admin.prototype) {
    userGroup = "Admin";
  } else if (userPrototype === Associate.prototype) {
    userGroup = "Associate";
  } else if (userPrototype === SalesPerson.prototype) {
    userGroup = "SalesPerson";
  }
  let sessionConstructor = new SessionConstructor(userObject.id, userGroup, "");
  done(null, sessionConstructor);
});

passport.deserializeUser(function (sessionConstructor, done) {
  if (sessionConstructor.userGroup == "Admin") {
    Admin.findOne(
      {
        _id: sessionConstructor.userId,
      },
      "-localStrategy.password",
      function (err, user) {
        done(err, user);
      }
    );
  } else if (sessionConstructor.userGroup == "Associate") {
    Associate.findOne(
      {
        _id: sessionConstructor.userId,
      },
      "-localStrategy.password",
      function (err, user) {
        done(err, user);
      }
    );
  } else if (sessionConstructor.userGroup == "SalesPerson") {
    SalesPerson.findOne(
      {
        _id: sessionConstructor.userId,
      },
      "-localStrategy.password",
      function (err, user) {
        done(err, user);
      }
    );
  }
});

app.use(async (req, res, next) => {
  try {
    res.locals.login = req.isAuthenticated();
    res.locals.session = req.session;
    res.locals.currentUser = req.user;
    next();
  } catch (error) {
    console.log(error);
    res.redirect("/");
  }
});

app.get("/adminLogin", function (req, res) {
  var errorMsg = req.flash("error")[0];
  res.render("adminLogin", { errorMsg });
});

app.get("/adminDashboard", async function (req, res) {
  var errorMsg = req.flash("error")[0];

  if (req.isAuthenticated()) {
    const userCount = await User.countDocuments();
    const user = await User.find({});
    const pending = await User.find({ response: "" });
    const scheduled = await User.find({ response: "Scheduled Call" });
    const pendingCount = pending.length;
    const scheduledCount = scheduled.length;
    const associateCount = await Associate.countDocuments();
    if ((userCount, associateCount)) {
      res.render("adminDashboard", {
        user: user,
        pendingCount: pendingCount,
        scheduledCount: scheduledCount,
        pending: pending,
        scheduled: scheduled,
        userCount: userCount,
        associateCount: associateCount,
      });
    }
  } else {
    res.render("adminLogin", {
      errorMsg,
    });
  }
});

app.get("/associateDashboard", async function (req, res) {
  var errorMsg = req.flash("error")[0];

  if (req.isAuthenticated()) {
    let scheduledCall = [];
    let scheduledVisit = [];
    let pending = [];
    const associate = await Associate.findById(req.user.id, {});
    const assignedClient = associate.assignedClient;
    assignedClient.map((element) => {
      if (element.response === "Scheduled Call") {
        scheduledCall.push(element);
      } else if (element.response === "Scheduled Visit") {
        scheduledVisit.push(element);
      } else if (element.response === "") {
        pending.push(element);
      }
    });
    const assignedClientCount = assignedClient.length;
    res.render("associateDashboard", {
      scheduledCall: scheduledCall.length,
      scheduledVisit: scheduledVisit.length,
      pending: pending.length,
      assignedClientCount: assignedClientCount,
      associate: associate.assignedClient,
      errorMsg,
    });
  } else {
    res.render("associateLogin", {
      errorMsg,
    });
  }
});

app.get("/salesPersonDashboard", async function (req, res) {
  var errorMsg = req.flash("error")[0];

  if (req.isAuthenticated()) {
    let scheduledVisit = [];
    let reScheduledVisit = [];
    let converted = [];
    let pending = [];

    const associate = await SalesPerson.findById(req.user.id, {});
    const assignedClient = associate.assignedClient;
    assignedClient.map((element) => {
      if (element.response === "Scheduled Visit") {
        scheduledVisit.push(element);
      } else if (element.response === "Re-Scheduled Visit") {
        reScheduledVisit.push(element);
      } else if (element.response === "Converted") {
        converted.push(element);
      } else if (element.response === "") {
        pending.push(element);
      }
    });
    const assignedClientCount = assignedClient.length;
    res.render("salesPersonDashboard", {
      scheduledVisit: scheduledVisit.length,
      reScheduledVisit: reScheduledVisit.length,
      converted: converted.length,
      pending: pending.length,
      assignedClientCount: assignedClientCount,
      associate: associate.assignedClient,
      errorMsg,
    });
  } else {
    res.render("salesPersonLogin", {
      errorMsg,
    });
  }
});

app.get("/", function (req, res) {
  res.render("login");
});

app.get("/register", function (req, res) {
  res.render("register");
});

app.get("/addClient", function (req, res) {
  res.render("addClient");
});

app.get("/addAssociate", function (req, res) {
  res.render("addAssociate");
});

app.get("/addSalesPerson", function (req, res) {
  res.render("addSalesPerson");
});

app.get("/associateLogin", function (req, res) {
  var errorMsg = req.flash("error")[0];
  res.render("associateLogin", { errorMsg });
});

app.get("/salesPersonLogin", function (req, res) {
  var errorMsg = req.flash("error")[0];
  res.render("salesPersonLogin", { errorMsg });
});

app.get("/tables", async function (req, res) {
  const users = await User.find({});
  const associate = await Associate.find({});
  const salesPerson = await SalesPerson.find({});
  res.render("tables", {
    tableUserData: users,
    tableAssociateData: associate,
    salesPerson: salesPerson,
  });
});

app.get("/404", function (req, res) {
  res.render("404");
});

app.get("/profile", function (req, res) {
  User.findById(req.user.id, function (err, foundUsers) {
    if (err) {
      res.redirect("/404");
    } else {
      if (foundUsers) {
        res.render("profile", {
          userName: foundUsers,
        });
      }
    }
  });
});

app.get("/profile/:id", function (req, res) {
  User.findById(req.params.id, function (err, foundUsers) {
    if (err) {
      res.redirect("/404");
    } else {
      if (foundUsers) {
        res.render("profile", {
          userName: foundUsers,
        });
      }
    }
  });
});

app.get("/associateProfile/:id", function (req, res) {
  Associate.findById(req.params.id, function (err, foundUsers) {
    if (err) {
      res.redirect("/404");
    } else {
      if (foundUsers) {
        res.render("profile", {
          userName: foundUsers,
        });
      }
    }
  });
});

app.post("/assignAssociate", async function (req, res) {
  const associate = await Associate.findById(req.body.associateId, {});
  const users = await User.findById(req.body.userId, {});
  const associateName = associate.name;
  const associateLname = associate.lname;
  const associateFullName = associateName + " " + associateLname;
  const userId = users.id;
  const associateId = associate.id;
  const userName = users.name;
  const userLname = users.lname;
  const userFullName = userName + " " + userLname;
  const userEmail = users.username;
  const userPhone = users.phone;

  User.findByIdAndUpdate(
    userId,
    { associate: associateFullName },
    function (err, docs) {
      if (err) {
        console.log(err);
      } else {
        Associate.findById(associateId, function (err, docs) {
          if (err) {
            console.log(err);
          } else {
            docs.update(
              {
                $addToSet: {
                  assignedClient: {
                    _id: userId,
                    name: userFullName,
                    email: userEmail,
                    phone: userPhone,
                  },
                },
              },
              function (err, list) {
                if (err) {
                  res.json({ msg: "error" });
                } else {
                  res.json({ msg: "success" });
                }
              }
            );
          }
        });
      }
    }
  );
});

app.post("/assignSalesPerson", async function (req, res) {
  const salesPerson = await SalesPerson.findById(req.body.salesPersonId, {});
  console.log(salesPerson);
  const users = await User.findById(req.body.userId, {});
  const salesPersonName = salesPerson.name;
  const salesPersonLname = salesPerson.lname;
  const salesPersonFullName = salesPersonName + " " + salesPersonLname;
  const userId = users.id;
  const salesPersonId = salesPerson.id;
  const userName = users.name;
  const userLname = users.lname;
  const userFullName = userName + " " + userLname;
  const userEmail = users.username;
  const userPhone = users.phone;

  User.findByIdAndUpdate(
    userId,
    { salesPerson: salesPersonFullName },
    function (err, docs) {
      if (err) {
        console.log(err);
      } else {
        SalesPerson.findById(salesPersonId, function (err, docs) {
          if (err) {
            console.log(err);
          } else {
            docs.update(
              {
                $addToSet: {
                  assignedClient: {
                    _id: userId,
                    name: userFullName,
                    email: userEmail,
                    phone: userPhone,
                  },
                },
              },
              function (err, list) {
                if (err) {
                  res.json({ msg: "error" });
                } else {
                  res.json({ msg: "success" });
                }
              }
            );
          }
        });
      }
    }
  );
});

app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

app.post("/register", function (req, res) {
  const user = new User({
    name: req.body.name,
    lname: req.body.lname,
    username: req.body.username,
    phone: req.body.phone,
    associate: "",
  });
  small.save(function (err) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      res.redirect("/");
    }
    // saved!
  });
});

app.post("/addClient", function (req, res) {
  const user = new User({
    name: req.body.name,
    lname: req.body.lname,
    username: req.body.username,
    phone: req.body.phone,
    associate: "",
    response: "",
  });
  user.save(function (err) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      res.redirect(req.get("referer"));
    }
    // saved!
  });
});

app.post("/addAssociate", function (req, res) {
  Associate.register(
    {
      name: req.body.name,
      lname: req.body.lname,
      username: req.body.username,
      phone: req.body.phone,
    },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
      } else {
        res.redirect(req.get("referer"));
      }
    }
  );
});

app.post("/addSalesPerson", function (req, res) {
  SalesPerson.register(
    {
      name: req.body.name,
      lname: req.body.lname,
      username: req.body.username,
      phone: req.body.phone,
    },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
      } else {
        console.log("Sales Person Added Successfully");
        res.redirect(req.get("referer"));
      }
    }
  );
});

app.get("/associateTables", function (req, res) {
  Associate.find({}, function (err, foundAssociate) {
    if (err) {
      res.redirect("/404");
    } else {
      if (foundAssociate) {
        res.render("associateTables", {
          tableAssociateData: foundAssociate,
        });
      }
    }
  });
});

app.get("/salesPersonTables", function (req, res) {
  SalesPerson.find({}, function (err, foundAssociate) {
    if (err) {
      res.redirect("/404");
    } else {
      if (foundAssociate) {
        res.render("salesPersonTables", {
          tableAssociateData: foundAssociate,
        });
      }
    }
  });
});

app.post(
  "/adminLogin",
  [
    passport.authenticate("admin", {
      failureRedirect: "/adminLogin",
      failureFlash: true,
    }),
  ],
  function (req, res) {
    const user = new Admin({
      username: req.body.username,
      password: req.body.password,
    });

    req.login(user, function (err) {
      if (err) {
        console.log(err);
      } else {
        passport.authenticate("admin")(req, res, function () {
          console.log("Login Successfull");
          res.redirect("/adminDashboard");
        });
      }
    });
  }
);

app.post(
  "/associateLogin",
  [
    passport.authenticate("associate", {
      failureRedirect: "/associateLogin",
      failureFlash: true,
    }),
  ],
  function (req, res) {
    const user = new Associate({
      username: req.body.username,
      password: req.body.password,
    });

    req.login(user, function (err) {
      if (err) {
        console.log(err);
      } else {
        passport.authenticate("associate")(req, res, function () {
          res.redirect("/associateDashboard");
        });
      }
    });
  }
);

app.post(
  "/salesPersonLogin",
  [
    passport.authenticate("salesPerson", {
      failureRedirect: "/salesPersonLogin",
      failureFlash: true,
    }),
  ],
  function (req, res) {
    const user = new SalesPerson({
      username: req.body.username,
      password: req.body.password,
    });

    req.login(user, function (err) {
      if (err) {
        console.log(err);
      } else {
        passport.authenticate("salesPerson")(req, res, function () {
          res.redirect("/salesPersonDashboard");
        });
      }
    });
  }
);

app.post("/removeAssociate", async function (req, res) {
  const userId = await User.findById(req.body.userId, {});
  var str = req.body.associateName;
  var name = str.split(" ");
  User.findByIdAndUpdate(
    userId,
    { associate: "", response: "", comments: "" },
    function (err, docs) {
      if (err) {
        console.log(err);
      } else {
        Associate.findOneAndUpdate(
          { name: name },
          { $pull: { assignedClient: { _id: req.body.userId } } },
          { new: true },
          function (err) {
            if (err) {
              console.log(err);
            } else {
              if (err) {
                res.json({ msg: "error" });
              } else {
                res.json({ msg: "success" });
              }
            }
          }
        );
      }
    }
  );
});

app.post("/removeSalesPerson", async function (req, res) {
  const userId = await User.findById(req.body.userId, {});
  var str = req.body.salesPersonName;
  var name = str.split(" ");
  User.findByIdAndUpdate(userId, { salesPerson: "" }, function (err, docs) {
    if (err) {
      console.log(err);
    } else {
      SalesPerson.findOneAndUpdate(
        { name: name },
        { $pull: { assignedClient: { _id: req.body.userId } } },
        { new: true },
        function (err) {
          if (err) {
            console.log(err);
          } else {
            if (err) {
              res.json({ msg: "error" });
            } else {
              res.json({ msg: "success" });
            }
          }
        }
      );
    }
  });
});

app.post("/changeStatus/:id", async function (req, res) {
  User.findByIdAndUpdate(
    req.params.id,
    { response: req.body.response, comments: req.body.comments },
    function (err, docs) {
      if (err) {
        console.log(err);
      } else {
        Associate.findOneAndUpdate(
          { _id: req.user.id, "assignedClient._id": req.params.id },
          {
            $set: {
              "assignedClient.$.response": req.body.response,
              "assignedClient.$.comments": req.body.comments,
            },
          },
          function (err, docs) {
            if (err) {
              console.log(err);
            } else {
              res.redirect(req.get("referer"));
            }
          }
        );
      }
    }
  );
});

app.post("/changeStatusFromSales/:id", async function (req, res) {
  User.findByIdAndUpdate(
    req.params.id,
    { response: req.body.response, comments: req.body.comments },
    function (err, docs) {
      if (err) {
        console.log(err);
      } else {
        SalesPerson.findOneAndUpdate(
          { _id: req.user.id, "assignedClient._id": req.params.id },
          {
            $set: {
              "assignedClient.$.response": req.body.response,
              "assignedClient.$.comments": req.body.comments,
            },
          },
          function (err, docs) {
            if (err) {
              console.log(err);
            } else {
              res.redirect(req.get("referer"));
            }
          }
        );
      }
    }
  );
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
  console.log("Server started on port 3000");
}
app.listen(port);
