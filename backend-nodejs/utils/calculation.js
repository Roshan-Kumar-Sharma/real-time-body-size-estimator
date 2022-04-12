const imageData = require("@andreekeberg/imagedata");

global.ImageData = imageData.ImageData;

const tfmodels = require("../configs/tfmodels.config");

function getImageData(path) {
    try {
        return imageData.getSync(path);
    } catch (err) {
        console.log(err);
        return null;
    }
}

let height;
let bodyRatio;
let hipSize;
let chestSize;
let innerLegSize;

/* different body parts and their corresponding numbers */
const bodyPartsName = [
    "blank",
    "left_face",
    "right_face",
    "left_upper_arm_front",
    "left_upper_arm_back",
    "right_upper_arm_front",
    "right_upper_arm_back",
    "left_lower_arm_front",
    "left_lower_arm_back",
    "right_lower_arm_front",
    "right_lower_arm_back",
    "left_hand",
    "right_hand",
    "torso_front",
    "torso_back",
    "left_upper_leg_front",
    "left_upper_leg_back",
    "right_upper_leg_front",
    "right_upper_leg_back",
    "left_lower_leg_front",
    "left_lower_leg_back",
    "right_lower_leg_front",
    "right_lower_leg_back",
    "left_foot",
    "right_foot",
];

/* It will hold the body parts of both front side and side wise image of person with their bounds and locations of each pixel */

exports.loadAndPredict = async function loadAndPredict(
    frontImagePath,
    sideImagePath,
    height
) {
    /*
    Things to predict:
    - Chest size: 97cm
    - Waist size: 101cm
    - Inside leg: 64cm
    */

    // const bodyPixProperties = {
    //     architecture: "MobileNetV1",
    //     outputStride: 16,
    //     multiplier: 1,
    //     quantBytes: 4,
    // };

    const parts = {};
    let frontBodySegmentation;
    let sideBodySegmentation;

    const frontImage = getImageData(frontImagePath);
    const sideImage = getImageData(sideImagePath);

    // const bodyPixProperties = {
    //     architecture: "MobileNetV1",
    //     outputStride: 16,
    //     quantBytes: 4,
    //     multiplier: 1,
    // };

    // const model = await bodyPix.load(bodyPixProperties);
    const { bodyPix: model } = await tfmodels.getModels();

    frontBodySegmentation = await model.segmentPersonParts(frontImage, {
        flipHorizontal: false,
        internalResolution: "high",
        segmentationThreshold: 0.7,
    });

    sideBodySegmentation = await model.segmentPersonParts(sideImage, {
        flipHorizontal: false,
        internalResolution: "high",
        segmentationThreshold: 0.7,
    });

    /* Parts related data */
    const FRONT = 0;
    const SIDE = 1;

    // Grid generation related variables
    let xMod, part;

    const generateGrid = (bodySegmentation) => (type) => (parts) => {
        const { width: w, height: h } = bodySegmentation;

        parts[type] = {};

        for (let i = -1; i <= 23; ++i) {
            parts[type][i] = {
                partName: bodyPartsName[i + 1],
                bounds: {
                    bottom: { x: 0, y: 0 },
                    left: { x: w, y: 0 },
                    top: { x: 0, y: h },
                    right: { x: 0, y: 0 },
                },
                points: {},
            };
        }

        // Generate grid for front body image
        line = -1;

        return bodySegmentation.data.reduce((acc, value, index) => {
            xMod = index % w;

            part = parts[type][value];

            if (xMod === 0) {
                ++line;
                acc.push([]);
            }

            acc[line].push(value);

            let location = { x: xMod, y: line };

            const { x, y } = location;

            if (part.points[y] === undefined) {
                part.points[y] = [];
            }

            part.points[y].push(x);

            const { left, right, top, bottom } = part.bounds;

            /* Re adjust the bounds */
            x < left.x
                ? ((left.x = x), (left.y = y))
                : x > right.x
                ? ((right.x = x), (right.y = y))
                : y < top.y
                ? ((top.x = x), (top.y = y))
                : y > bottom.y
                ? ((bottom.x = x), (bottom.y = y))
                : null;

            return acc;
        }, []);
    };

    const frontBodyGrid = generateGrid(frontBodySegmentation)(FRONT)(parts);

    const sideBodyGrid = generateGrid(sideBodySegmentation)(SIDE)(parts);

    console.log(parts);

    /* array generator utility */
    const range = (begin) =>
        function* (end) {
            for (; begin < end; ++begin) yield begin;
            return;
        };

    const rangeInclusive = (begin) =>
        function (end) {
            return range(begin)(end + 1);
        };

    const bodySizes = calculateSize({
        frontBodySegmentation,
        sideBodySegmentation,
        parts,
        height,
    });

    return bodySizes;
};

function calculateSize(data) {
    const { parts, height } = data;

    const topMostPixel =
        parts[0][0].bounds["top"]["y"] < parts[0][1].bounds["top"]["y"]
            ? parts[0][0].bounds["top"]["y"]
            : parts[0][1].bounds["top"]["y"];

    const bottomPixel =
        parts[0][22].bounds["bottom"]["y"] > parts[0][23].bounds["bottom"]["y"]
            ? parts[0][22].bounds["bottom"]["y"]
            : parts[0][23].bounds["bottom"]["y"];

    const totalLine = bottomPixel - topMostPixel;

    bodyRatio = height / totalLine;
    bodyRatio = parseFloat(bodyRatio.toFixed(2));

    console.log(totalLine, bodyRatio);

    data["bodyRatio"] = bodyRatio;

    let bodySizes = {};

    bodySizes["chest"] = calculateChest(data);
    bodySizes["hip"] = calculateHip(data);
    bodySizes["innerLeg"] = calculateInnerLeg(data);

    return bodySizes;
}

function calculateChest(data) {
    // width
    const { frontBodySegmentation, parts, bodyRatio } = data;

    let leftShoulder =
        frontBodySegmentation.allPoses[0].keypoints[5].position["x"];
    let rightShoulder =
        frontBodySegmentation.allPoses[0].keypoints[6].position["x"];

    console.log(leftShoulder, rightShoulder);

    let chestWidthPixel = Math.ceil(leftShoulder - rightShoulder);

    console.log("chestWidthPixel : ", chestWidthPixel);

    let chestWidthSize = chestWidthPixel * bodyRatio;

    console.log("chestWidthSize : ", chestWidthSize);

    // depth

    let torsoFrontLeftXCoord = parts[0][12].bounds["left"]["x"];
    let torsoFrontRightXCoord = parts[0][13].bounds["right"]["x"];

    let chestDepthPixel = torsoFrontRightXCoord - torsoFrontLeftXCoord;

    let chestDepthSize = chestDepthPixel * bodyRatio;

    chestSize = 2 * (chestWidthSize + chestDepthSize);

    console.log(chestSize);

    return chestSize;
}

function calculateInnerLeg(data) {
    const { parts, bodyRatio } = data;

    let torsoFrontBottomYCoord = parts[0][12].bounds["bottom"]["y"];

    console.log("torsoFrontBottomYCoord : ", torsoFrontBottomYCoord);

    let leftFootBottomYCoord = parts[0][22].bounds["bottom"]["y"];
    let rightFootBottomYCoord = parts[0][23].bounds["bottom"]["y"];

    console.log(leftFootBottomYCoord, rightFootBottomYCoord);

    let leftLegPixel = leftFootBottomYCoord - torsoFrontBottomYCoord;
    let rightLegPixel = rightFootBottomYCoord - torsoFrontBottomYCoord;

    console.log(leftLegPixel, rightLegPixel);

    let innerLegPixel =
        leftLegPixel > rightLegPixel ? leftLegPixel : rightLegPixel;

    console.log("inner leg pixel: ", innerLegPixel);

    innerLegSize = innerLegPixel * bodyRatio;

    console.log("Inner Leg Size: ", innerLegSize + " cm");

    return innerLegSize;
}

function calculateHip(data) {
    const { frontBodySegmentation, sideBodySegmentation, bodyRatio } = data;

    // width

    let leftHip = frontBodySegmentation.allPoses[0].keypoints[11];
    let rightHip = frontBodySegmentation.allPoses[0].keypoints[12];

    console.log(leftHip, rightHip);

    let leftXCoord = Math.ceil(leftHip.position["x"]);
    let rightXCoord = Math.ceil(rightHip.position["x"]);

    // let leftYCoordLength = parts[0][12].points[leftYCoord].length
    // let rightYCoordLength = parts[0][12].points[rightYCoord].length

    console.log(leftXCoord, rightXCoord);

    // let hipWidthPixel =
    //     leftYCoordLength > rightYCoordLength
    //         ? leftYCoordLength
    //         : rightYCoordLength;

    let hipWidthPixel = leftXCoord - rightXCoord;

    console.log(hipWidthPixel);

    let leftEar = frontBodySegmentation.allPoses[0].keypoints[3].position["x"];
    let rightEar = frontBodySegmentation.allPoses[0].keypoints[4].position["x"];

    console.log("Ear dist : ", Math.ceil(leftEar) - Math.ceil(rightEar));

    let hipWidth = hipWidthPixel * bodyRatio;

    console.log("Hip Width : ", hipWidth);

    // depth

    leftHip = sideBodySegmentation.allPoses[0].keypoints[11];
    rightHip = sideBodySegmentation.allPoses[0].keypoints[12];

    console.log(leftHip, rightHip);

    leftXCoord = Math.ceil(leftHip.position["x"]);
    rightXCoord = Math.ceil(rightHip.position["x"]);

    console.log(leftXCoord, rightXCoord);

    let hipDepthPixel = leftXCoord - rightXCoord;

    console.log(hipDepthPixel);

    let hipDepth = hipDepthPixel * bodyRatio;

    console.log("Hip Depth : ", hipDepth);

    hipSize = 2 * (hipWidth + hipDepth);

    console.log("Hip Size : ", hipSize + " cm");

    return hipSize;
}
