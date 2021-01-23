import express from "express";

const expressApp = express();
expressApp.get("/discover", (req, res) => {
    res.send("Hello World!");
});

const port = process.env["PORT"] ?? "3000";
expressApp.listen(port, () => console.log(`Listening at port ${port}`));
