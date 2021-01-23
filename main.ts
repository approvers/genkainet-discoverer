import fastify from "fastify";

const app = fastify({ logger: { prettyPrint: true } });

app.get("/discover", (req, res) => {
    res.send("Hello World!");
});

const port = process.env["PORT"] || 3000;
app.listen(3000, (err) => {
    if (err != null) {
        app.log.error(`Failed to launch fastify: ${err}`);
        process.exit(1);
    }
});
