require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const requireAuth = require("./middleware/requireAuth");

const cors = require("cors");

/*****************S3 bucket *****************************/

const Album = require("./models/albumModel");
const Song = require("./models/songModel");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const util = require("util");
const unlinkFile = util.promisify(fs.unlink);
const multer = require("multer");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, `${uuidv4()}.${file.originalname.split(".").pop()}`);
  },
});
const upload = multer({ storage });
const { uploadFile, getFileStream } = require("./s3");
/*****************S3 bucket end*****************************/

// const albumTestRoutes = require("./routes/albumTestRoutes");

const workoutRoutes = require("./routes/songs");
const userRoutes = require("./routes/users");
const adminRoutes = require("./routes/admins");
const albumRoutes = require("./routes/albums");
const playlistRoutes = require("./routes/playlists");
const app = express();

//build version
// app.use(express.static(path.join(__dirname, "build")));

// app.get("/*", (req, res) => {
//   res.sendFile(path.join(__dirname, "build", "index.html"));
// });

//middle ware logging out requests coming in
app.use(express.json());
app.use(cors());
app.use((req, res, next) => {
  console.log(req.path, req.method);
  next();
});
/*****************S3 bucket *****************************/
app.use(express.urlencoded({ extended: true }));
// Add headers before the routes are defined
app.use(function (req, res, next) {
  // Website you wish to allow to connect
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");

  // Request methods you wish to allow
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );

  // Request headers you wish to allow
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader("Access-Control-Allow-Credentials", true);

  // Pass to next layer of middleware
  next();
});
/*****************S3 bucket end*****************************/

app.use("/api/songs", workoutRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/album", albumRoutes);
app.use("/api/playlist", playlistRoutes);

// app.use("/api/albumtest", albumTestRoutes);

/*****************S3 bucket *****************************/
app.use(
  "/api/albumtest",
  requireAuth,
  upload.single("image"),
  async (req, res) => {
    const file = req.file;

    const result = await uploadFile("images", file);
    await unlinkFile(file.path);

    const title = req.body.title;
    const artist = req.body.artist;
    const cover = result.Key;
    const user_id = req.user._id;



    let emptyFields = [];
    if (!title) {
      emptyFields.push("title");
    }
    if (!cover) {
      emptyFields.push("cover");
    }
    if (!artist) {
      emptyFields.push("artist");
    }
    if (emptyFields.length > 0) {
      return res
        .status(400)
        .json({ error: "Please fill in all fields", emptyFields });
    }

    //add album to DB
    //userid = findbyemail();

    if (!cover) {
      emptyFields.push("cover");
    }
    if (!artist) {
      emptyFields.push("artist");
    }
    if (emptyFields.length > 0) {
      return res
        .status(400)
        .json({ error: "Please fill in all fields", emptyFields });
    }

    //add album to DB

    try {
      const album = await Album.create({ title, artist, cover, user_id });
      res.status(201).json(album);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

// add new song
app.use(
  "/api/createsong",
  requireAuth,
  upload.single("image"),
  async (req, res) => {
    // let emptyFields = [];
    // if (!req.body.title) {
    //   emptyFields.push("title");
    // }
    // if (!req.body.album_id) {
    //   emptyFields.push("albumId");
    // }
    // if (!req.file) {
    //   emptyFields.push("image");
    // }
    // if (emptyFields.length > 0) {
    //   return res
    //     .status(400)
    //     .json({ error: "Please fill in all fields", emptyFields });
    // }
    const file = req.file;
    console.log(file);

    const result = await uploadFile("songs", file);
    await unlinkFile(file.path);
    //console.log(result);

    const title = req.body.title;
    const album_id = req.body.albumId;

    const file_url = result.Key;

    //console.log(name);
    //res.send({ imagePath: `${result.Key}` });

    //add song to DB

    try {
      const song = await Song.create({ title, album_id, file_url });
      res.status(201).json(song);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

/*****************S3 bucket end*****************************/

// try to get all albums here but not working
// app.use("/api/albumtest/all", requireAuth, async (req, res) => {

//   try {

//     const albums = await Album.find().sort({ createdAt: -1 });
//     console.log(albums);

//     res.status(200).json(albums);
//   } catch (err) {
//     res.status(400).json({ error: err.message });

//   }
// });

//connect to database
mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => {
    //listen for requests
    app.listen(process.env.PORT, (req, res) => {
      console.log("connected to DB and listening on port 4000!!");
    });
  })
  .catch((error) => {
    console.log(error);
  });
