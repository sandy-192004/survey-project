const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");


const familyRoutes = require("./routes/familyRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();



app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(session({
  secret: "secret",
  resave: false,
  saveUninitialized: true
}));

app.use("/", familyRoutes);
app.use("/admin",adminRoutes)


app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

