
/* Dom elements */

const imageContainer = document.getElementById("imageContainer");
const canvasContainer = document.getElementById("canvasContainer");
const img1 = document.getElementById("image1");
const img2 = document.getElementById("image2");
const canvas1 = document.getElementById("canvas1");
const canvas2 = document.getElementById("canvas2");
const image = document.getElementById('image');
const data = document.getElementById('data');

let height
let bodyRatio
let hipSize
let chestSize
let innerLegSize

image.addEventListener('blur', (e) => {
    if(!e.target.value) return

    imageContainer.style.display = "flex"
    data.style.display = "none"
    canvasContainer.style.display = "none"

    canvas1.getContext("2d").clearRect(0, 0, canvas1.width, canvas1.height)
    canvas2.getContext("2d").clearRect(0, 0, canvas2.width, canvas2.height);

    const frontImg = e.target.value + "_front.jpg"
    const sideImg = e.target.value + "_side.jpg"

    img1.src = `images/${frontImg}`
    img2.src = `images/${sideImg}`;

    img1.onerror = () => {
        imageContainer.style.display = "none";
        alert('Invalid Image...')
        e.target.value = "";
    }
})

function formSubmitted(e){
    e.preventDefault()

    if(!img1.src || !img2.src){
        return;
    } 

    height = parseFloat(e.target["height"].value);

    if(!isNaN(height)){
        data.style.display = "block"
        data.innerHTML = `
            <h1>The size of <span>Chest</span>, <span>Waist</span> and <span>Inner Leg</span> will be shown here...</h1>
        `;
        loadAndPredict()
    }
    else{
        alert("Invalid Height...")
        e.target["height"].value = "";
    }
}

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
    "right_foot"
]

/* It will hold the body parts of both front side and side wise image of person with their bounds and locations of each pixel */
const parts = {};
let frontBodySegmentation
let sideBodySegmentation

const drawLine = a => b => ctx => {
    ctx.beginPath();
    ctx.moveTo(...a);
    ctx.lineTo(...b);
    ctx.stroke();
};

/* It will draw circles at the keypoints */
const drawCircle = coords => r => ctx => {
    ctx.beginPath();
    ctx.arc(...coords, r, 0, 2 * Math.PI);
    ctx.fill();
};

/* It will draw rectangular boundary around the body parts */
const drawRect = pointA => pointB => ctx => {
    ctx.beginPath();
    ctx.rect(...pointA, ...pointB);
    ctx.stroke();
}


const withContext = canvas => fn =>
    fn(canvas.getContext("2d"))

async function loadAndPredict() {
    console.log("dimension of image: " + img1.naturalWidth, img1.naturalHeight);
    console.log("dimension of side image: " + img2.naturalWidth, img2.naturalHeight);

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

    const bodyPixProperties = {
        architecture: "MobileNetV1",
        outputStride: 16,
        quantBytes: 4,
        multiplier: 1
    };

    const model = await bodyPix.load(bodyPixProperties);

    frontBodySegmentation = await model.segmentPersonParts(img1, {            
        flipHorizontal: false,
        internalResolution: 'high',
        segmentationThreshold: 0.7
    });

    sideBodySegmentation = await model.segmentPersonParts(img2, {            
        flipHorizontal: false,
        internalResolution: 'high',
        segmentationThreshold: 0.7
    });

    /* Parts related data */
    const FRONT = 0;
    const SIDE = 1;

    // Grid generation related variables
    let xMod, part;

    const generateGrid = bodySegmentation => type => parts => {
        const { width: w, height: h } = bodySegmentation;

        parts[type] = {};

        for(let i = -1; i <= 23; ++i) {
            parts[type][i] = {
                partName: bodyPartsName[i+1],
                bounds: {
                    bottom: { x: 0, y: 0 },
                    left: { x: w, y: 0 },
                    top: { x: 0, y: h },
                    right: { x: 0, y: 0 }
                },
                points: {}
            }
        }

        // Generate grid for front body image
        line = -1;
        
        return bodySegmentation.data.reduce((acc, value, index) => {
            xMod = index % w;

            part = parts[type][value]

            if(xMod === 0) {
                ++line;
                acc.push([]);
            }

            acc[line].push(value);

            let location = { x: xMod, y: line }


            const { x, y } = location;

            if(part.points[y] === undefined){
                part.points[y] = []
            }
            
            part.points[y].push(x)

            const { left, right, top, bottom } = part.bounds;

            /* Re adjust the bounds */
                x < left.x    ? (left.x = x   , left.y = y)
                : x > right.x   ? (right.x = x  , right.y = y)
                : y < top.y     ? (top.x = x    , top.y = y)
                : y > bottom.y  ? (bottom.x = x , bottom.y = y)
                : null

            return acc;
        }, []);
    }
    
    const frontBodyGrid = generateGrid
        (frontBodySegmentation)
        (FRONT)
        (parts)

    
    const sideBodyGrid = generateGrid
        (sideBodySegmentation)
        (SIDE)
        (parts)

    console.log(parts);

    
    const frontColoredPartImage = bodyPix.toColoredPartMask(frontBodySegmentation);
    const sideColoredPartImage = bodyPix.toColoredPartMask(sideBodySegmentation);

    const opacity = 0.7;
    const flipHorizontal = false;
    const maskBlurAmount = 0;

    bodyPix.drawMask(
        canvas1, img1, frontColoredPartImage,
        opacity, maskBlurAmount, flipHorizontal);

    bodyPix.drawMask(
        canvas2, img2, sideColoredPartImage,
        opacity, maskBlurAmount, flipHorizontal);

    canvasContainer.style.display = "flex"
    
    /* array generator utility */
    const range = begin => function *(end) {
        for( ; begin < end; ++begin)
            yield begin
        return;
    }

    const rangeInclusive = begin => function (end) {
        return range(begin) (end + 1);
    };

    /* Draws circle as a keypoint, on canvas */
    const drawKeypoint = ctx => location =>
        drawCircle (location) (2) (ctx)
    
    /* Draws rectangle on canvas */
    const drawRectOnCanvas = ctx => pointA => pointB => {
        const oldStrokeStyle = ctx["strokeStyle"]

        ctx.strokeStyle = "#000000";

        drawRect(pointA) (pointB) (ctx)

        ctx.strokeStyle = oldStrokeStyle
    }

    const getPointsFromBounds = ({ left, right, top, bottom }) =>
    ([
        [ left.x, top.y ],
        [(right.x - left.x), (bottom.y - top.y)]
    ])

    /* FRONT POSE INFO */

    /* Draw circles at key points of front view */
    const drawKeypointFront =
        withContext (canvas1) (drawKeypoint)

    const drawRectFront =
        withContext (canvas1) (drawRectOnCanvas)
    
    const frontPose = frontBodySegmentation.allPoses[0].keypoints;
    for(const prop of frontPose) {
        const { position: { x, y } } = prop;
        drawKeypointFront([ x , y]);
    }

    const renderPart = part => renderer => {
        if(part && Object.keys(part.points).length) {
            const { bounds } = part;
            const [ pointA, pointB ] = getPointsFromBounds(bounds)
            
            // withResettingStrokeStyle
            renderer  (pointA) (pointB);
        }
    }

    // Draw rectangle bounds
    [0, 1, 12, 13, 14, 16, 18, 20].forEach((i) => {
        renderPart(parts[FRONT][i])(drawRectFront);
    });

    // drawRectFront([0, 0]) ([100, 100]);

    /* SIDE POSE INFO */

    /* Draw circles at key points of side view */
    const drawKeypointSide =
        withContext (canvas2) (drawKeypoint)

    const drawRectSide =
        withContext (canvas2) (drawRectOnCanvas)

    const sidePose = sideBodySegmentation.allPoses[0].keypoints;
    for(const prop of sidePose) {
        const { position: { x, y } } = prop;
        drawKeypointSide([x, y])
    }
    // Draw rectangle bounds
    [ 0, 1, 2, 3, 6, 7, 12, 13, 14, 15, 18, 19].forEach(i => {
        renderPart (parts[SIDE][i]) (drawRectSide);
    })

    clearForm()

    calculateSize()

    displayResult()
}

function calculateSize(){
    const topMostPixel =
        parts[0][0].bounds["top"]["y"] < parts[0][1].bounds["top"]["y"]
            ? parts[0][0].bounds["top"]["y"]
            : parts[0][1].bounds["top"]["y"];

    const bottomPixel =
        parts[0][22].bounds["bottom"]["y"] > parts[0][23].bounds["bottom"]["y"]
            ? parts[0][22].bounds["bottom"]["y"]
            : parts[0][23].bounds["bottom"]["y"];

    const totalLine = bottomPixel - topMostPixel;

    bodyRatio = (height / totalLine)
    bodyRatio = parseFloat(bodyRatio.toFixed(2))

    console.log(totalLine, bodyRatio)

    calculateChest()
    calculateHip()
    calculateInnerLeg()
}

function calculateChest(){

    // width

    let leftShoulder = frontBodySegmentation.allPoses[0].keypoints[5].position["x"]
    let rightShoulder = frontBodySegmentation.allPoses[0].keypoints[6].position["x"]

    console.log(leftShoulder, rightShoulder);

    let chestWidthPixel = Math.ceil(leftShoulder - rightShoulder)

    console.log("chestWidthPixel : ", chestWidthPixel);

    let chestWidthSize = chestWidthPixel * bodyRatio

    console.log("chestWidthSize : ", chestWidthSize)

    // depth

    let torsoFrontLeftXCoord = parts[0][12].bounds["left"]["x"]
    let torsoFrontRightXCoord = parts[0][13].bounds["right"]["x"]

    let chestDepthPixel = torsoFrontRightXCoord - torsoFrontLeftXCoord

    let chestDepthSize = chestDepthPixel * bodyRatio

    chestSize = 2 * (chestWidthSize + chestDepthSize)

    console.log(chestSize)
}

function calculateInnerLeg(){
    let torsoFrontBottomYCoord = parts[0][12].bounds["bottom"]["y"]

    console.log("torsoFrontBottomYCoord : ", torsoFrontBottomYCoord);

    let leftFootBottomYCoord = parts[0][22].bounds["bottom"]["y"]
    let rightFootBottomYCoord = parts[0][23].bounds["bottom"]["y"]

    console.log(leftFootBottomYCoord, rightFootBottomYCoord);

    let leftLegPixel = leftFootBottomYCoord - torsoFrontBottomYCoord;
    let rightLegPixel = rightFootBottomYCoord - torsoFrontBottomYCoord;

    console.log(leftLegPixel, rightLegPixel);

    let innerLegPixel = leftLegPixel > rightLegPixel ? leftLegPixel : rightLegPixel

    console.log("inner leg pixel: ", innerLegPixel);

    innerLegSize = innerLegPixel * bodyRatio

    console.log("Inner Leg Size: ", innerLegSize + " cm")
}

function calculateHip(){
    // width

    let leftHip = frontBodySegmentation.allPoses[0].keypoints[11]
    let rightHip = frontBodySegmentation.allPoses[0].keypoints[12]

    console.log(leftHip, rightHip)

    let leftXCoord = Math.ceil(leftHip.position["x"])
    let rightXCoord = Math.ceil(rightHip.position["x"])

    // let leftYCoordLength = parts[0][12].points[leftYCoord].length
    // let rightYCoordLength = parts[0][12].points[rightYCoord].length

    console.log(leftXCoord, rightXCoord);

    // let hipWidthPixel =
    //     leftYCoordLength > rightYCoordLength
    //         ? leftYCoordLength
    //         : rightYCoordLength;

    let hipWidthPixel = leftXCoord - rightXCoord;

    console.log(hipWidthPixel)

    let leftEar = frontBodySegmentation.allPoses[0].keypoints[3].position["x"]
    let rightEar = frontBodySegmentation.allPoses[0].keypoints[4].position["x"]

    console.log("Ear dist : ", Math.ceil(leftEar) - Math.ceil(rightEar))

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

    hipSize = 2 * (hipWidth + hipDepth)

    console.log("Hip Size : ", hipSize + " cm");
}

function displayResult(){
    data.style.display = "block"
    data.innerHTML = `
        <h1>Chest Size : <span>${chestSize.toFixed(2)} cm</span></h1> 
        <h1>Waist Size : <span>${hipSize.toFixed(2)} cm</span></h1> 
        <h1>Inner Leg Size : <span>${innerLegSize.toFixed(2)} cm</span></h1> 
    `;
}

function clearForm(){
    form["image"].value = "";
    form["height"].value = "";
}

window.onload = () => {
    imageContainer.style.display = "none"
    canvasContainer.style.display = "none"
    data.style.display = "none"
}