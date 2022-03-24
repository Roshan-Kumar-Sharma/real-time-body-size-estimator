const video = document.getElementById("webcam");
const liveView = document.getElementById("liveView");
const demosSection = document.getElementById("demos");
const enableWebcamButton = document.getElementById("webcamButton");
const image = document.getElementById("image");
const canvas = document.getElementById("canvas");
const frontSide = document.getElementById("frontSide");
const sidewise = document.getElementById("sidewise");
const getHeight = document.getElementById("getHeight");
const captureImage = document.getElementById("captureImage");

let model = true;
let height
let clearTimer = 0
let prevClearTimer = 0
let videoStream

// Check if webcam access is supported.
function getUserMediaSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// If webcam supported, add event listener to button for when user
// wants to activate it to call enableCam function which we will
// define in the next step.
if (getUserMediaSupported()) {
    enableWebcamButton.addEventListener("click", askHeight);
} else {
    console.warn("getUserMedia() is not supported by your browser");
}

function askHeight(){
    demosSection.style.display = "block"
    document.getElementById("getHeight").style.display = "flex"
    hideAll()
    clearTimeout(clearTimer)
}

// Enable the live webcam view and start classification.
function enableCam(event) {

    event.preventDefault()

    height = parseFloat(event.target[0].value);
    
    console.log(event.target[0].value)

    getHeight.style.display = "none"
    frontSide.style.display = "flex"
    event.target[0].value = ""

    clearTimer = setTimeout(async () => {
        hideAll();

        captureImage.style.display = "block"
        
        if (!model) {
            return;
        }

        await startVideo()

        prevClearTimer = clearTimer

        clearTimer = setTimeout(() => {
            videoStream.getTracks().forEach(track => track.stop())

            clearTimeout(prevClearTimer)
            
            captureImage.style.display = "none"
            sidewise.style.display = "flex"

            prevClearTimer = clearTimer
            clearTimer = setTimeout(async () => {
                clearTimeout(prevClearTimer)

                hideAll();

                captureImage.style.display = "block";

                await startVideo();

                prevClearTimer = clearTimer;

                clearTimer = setTimeout(() => {

                    videoStream.getTracks().forEach((track) => track.stop());

                    clearTimeout(prevClearTimer);
                    captureImage.style.display = "none";
                    hideAll()

                    document.getElementById("webcam-section").style.display = "block";
                    document.getElementById("webcam-section").innerHTML = `
                        <h1>Output will be shown here...</h1><br/><br/>
                        <h1>Height : ${height}cm</h1>
                    `
                }, 8000)

            }, 3000)
        }, 8000)
        
    }, 3000)

    
}

function startVideo(){
    // getUsermedia parameters to force video but not audio.
    const constraints = {
        video: false,
        audio: true
        
    };

    // Activate the webcam stream.
    navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
        video.srcObject = stream;
        videoStream = stream;
        // video.addEventListener("loadeddata", predictWebcam);

        buildCanvas();
    
        document.getElementsByTagName("canvas")[0].style.display = "block";
    });

    // buildCanvas();
    // document.getElementsByTagName("canvas")[0].style.display = "block";
}

function buildCanvas() {
    // canvas.width = image.width
    // canvas.height = image.height

    const ctx = canvas.getContext("2d");

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imgData.data;

    for (let i = 0, n = pixels.length; i < n; i += 4) {
        if (pixels[i] != 255 && pixels[i + 1] != 255 && pixels[i + 2] != 255) {
            pixels[i] = 255;
            pixels[i + 1] = 255;
            pixels[i + 2] = 0;
            pixels[i + 3] = 255;
        } else {
            pixels[i] = 0;
            pixels[i + 1] = 0;
            pixels[i + 2] = 0;
            pixels[i + 3] = 0;
        }
    }

    ctx.putImageData(imgData, 0, 0);
}

window.onload = () => {
    frontSide.style.display = "none"
    getHeight.style.display = "none"
    demosSection.style.display = "none"
    captureImage.style.display = "none"
    sidewise.style.display = "none"
}

function hideAll(){
    frontSide.style.display = "none";
    sidewise.style.display = "none"
}