const express = require("express");
const apiRoutes = require("./api/api.routes");
const tfmodels = require("./configs/tfmodels.config");

const app = express();

app.use(express.json());

app.get("/", (req, res, next) => {
    console.log("/");
    res.send("/");
});

app.use("/api", apiRoutes);

const PORT = 3000;

async function startApp() {
    console.log("Loading models...");
    const models = await tfmodels.getModels();
    console.log("Tensorflow models loaded!");

    app.listen(PORT, () => {
        console.log(`Server is listening at port ${PORT}`);
    });
}

startApp();
