const express = require("express");
const uploadController = require("./upload.controller");

const router = express.Router();

router.post("/", uploadController.Upload, uploadController.CalculateSize);

module.exports = router;
