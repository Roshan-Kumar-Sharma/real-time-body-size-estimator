const express = require("express");
const uploadRouter = require("./upload/upload.routes");

const router = express.Router();

router.use("/upload", uploadRouter);

module.exports = router;
