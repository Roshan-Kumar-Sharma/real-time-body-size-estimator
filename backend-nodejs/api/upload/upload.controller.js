const multer = require("multer");
const { loadAndPredict } = require("../../utils/calculation");

// Returns extension of a file name
function getExtension(filename) {
    const splits = filename.split(".");
    if (splits.length <= 1) {
        return "";
    }
    return splits.slice(-1)[0];
}

// Returns file name without it's extension
function getBasename(filename) {
    return filename.split(".")[0] || "";
}

function filenameGenerator(req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const { originalname } = file;
    const basename = getBasename(originalname);
    const extension = getExtension(originalname);

    cb(null, basename + "-" + uniqueSuffix + "." + extension);
}

exports.Upload = async (req, res, next) => {
    // File storage configuration
    const fileStorage = multer.diskStorage({
        destination: `./static/images`,
        filename: filenameGenerator,
    });

    let notUploaded = [];

    // Multer instance
    const upload = multer({
        storage: fileStorage,
    });

    // Try to upload file
    upload.fields([
        { name: "front_image", maxCount: 1 },
        { name: "side_image", maxCount: 1 },
    ])(req, res, async (err, ...others) => {
        // If file upload was unsuccessful
        if (err) {
            console.log("Error while uploading file!", err);

            return res.json({
                error: true,
                message: "Could not upload file",
            });
        }

        if (!req.files) {
            console.log("No files were uploaded");

            return res.json({
                error: true,
                message: "No files were uploaded",
            });
        }

        console.log(req.files);

        return next();
    });
};

exports.CalculateSize = async (req, res, next) => {
    const frontImagePath = req.files.front_image[0].path;
    const sideImagePath = req.files.side_image[0].path;

    const height = parseFloat(req.query["height"]);

    const bodySizes = await loadAndPredict(
        frontImagePath,
        sideImagePath,
        height
    );

    return res.json({
        message: "Calculated body sizes",
        data: bodySizes,
    });
};
