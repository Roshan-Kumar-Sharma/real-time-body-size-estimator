const video = document.getElementById("webcam");
const liveView = document.getElementById("liveView");
const demosSection = document.getElementById("demos");
const enableWebcamButton = document.getElementById("webcamButton");
const image = document.getElementById("image");
const canvas = document.getElementById("canvas");

let model = true

// Check if webcam access is supported.
function getUserMediaSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// If webcam supported, add event listener to button for when user
// wants to activate it to call enableCam function which we will
// define in the next step.
if (getUserMediaSupported()) {
    enableWebcamButton.addEventListener("click", enableCam);
} else {
    console.warn("getUserMedia() is not supported by your browser");
}

// Enable the live webcam view and start classification.
function enableCam(event) {
    // Only continue if the COCO-SSD has finished loading.
    if (!model) {
        return;
    }

    // Hide the button once clicked.
    event.target.classList.add("removed");

    
    // getUsermedia parameters to force video but not audio.
    const constraints = {
        video: true,
    };

    buildCanvas()
    
    // Activate the webcam stream.
    navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
        // document.getElementsByTagName('img')[0].style.display = "block"
        video.srcObject = stream;
        // video.addEventListener("loadeddata", predictWebcam);
        document.getElementsByTagName('canvas')[0].style.display = "block"
    });
    
}

function buildCanvas(){
    // canvas.width = image.width
    // canvas.height = image.height

    const ctx = canvas.getContext("2d");

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imgData.data;


    for(let i=0, n=pixels.length; i<n; i+=4){
        if(pixels[i] != 255 && pixels[i+1] != 255 && pixels[i+2] != 255){
            pixels[i] = 255;
            pixels[i+1] = 255;
            pixels[i+2] = 0;
            pixels[i+3] = 255;
        }
        else{
            pixels[i] = 0;
            pixels[i + 1] = 0;
            pixels[i + 2] = 0;
            pixels[i + 3] = 0;
        }
    }

    ctx.putImageData(imgData, 0, 0);
}