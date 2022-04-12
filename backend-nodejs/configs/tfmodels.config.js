const tf = require("@tensorflow/tfjs-node-gpu");
const bodyPix = require("@tensorflow-models/body-pix");

let models = null;

const getModels = (exports.getModels = async () => {
    if (models !== null) return models;

    const bodyPixProperties = {
        architecture: "MobileNetV1",
        outputStride: 16,
        quantBytes: 4,
        multiplier: 1,
    };

    const bodyPixModel = await bodyPix.load(bodyPixProperties);

    models = {
        bodyPix: bodyPixModel,
    };

    return models;
});
