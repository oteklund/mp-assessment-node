const express = require("express")
const cors = require("cors")
const morgan = require("morgan")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const sharp = require("sharp")
const util = require('util');
const serverless = require("serverless-http")
const app = express()
const upload = multer({ dest: "/tmp" })
const readdir = util.promisify(fs.readdir);
const unlink = util.promisify(fs.unlink);
const directory = 'tmp';
app.use(express.json())
app.use(cors())
app.use(morgan("tiny"))

app.get("/", (req, res) => {
  res.send("hello!")
})

app.post("/",
  upload.single("file"),
  (req, res) => {
    const tempPath = req.file.path
    const targetPath = path.join("/tmp/" + req.file.originalname)
    if (path.extname(req.file.originalname).toLowerCase() === ".png" || ".jpeg" || "jpg") {
      fs.rename(tempPath, targetPath, err => {
        if (err) handleError(err, res)
        //resize image
        else {
          const resizeTargetPath = path.join("/tmp/resized_" + req.file.originalname)
          console.log(resizeTargetPath)
          sharp(targetPath).resize({width:500}).toFile(resizeTargetPath)
          .then((newFileInfo) => {
            console.log("image resized!")
            fs.readFile(resizeTargetPath, (err, data) => {
              if (err) handleError(err, res)
              else res.status(200).set("Content-Type", "image/" + newFileInfo.format).send(data.toString("base64"))
            })
            //empty folder
            emptyFolder();
          })
          .catch(err => { 
            console.error(err)
            handleError(err, res)
          })          
        }
      })
    } else {
      fs.unlink(tempPath, err => {
        if (err) handleError(err, res)

        else res.status(400).send("Wrong image extension. Upload .png, .jpg or .jpeg to continue.")

      })
    }
  })

const handleError = (err, res) => {
  res
    .status(500)
    .contentType("text/plain")
    .send("Oops! Something went wrong!");
};

async function emptyFolder() {
  try {
    const files = await readdir(directory);
    const unlinkPromises = files.map(filename => unlink(`${directory}/${filename}`));
    return Promise.all(unlinkPromises);
  } catch(err) {
    console.log(err);
  }
}

app.listen(3000, () => console.log("up and running"))

module.exports.handler = serverless(app)