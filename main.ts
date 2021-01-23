import fastify from "fastify";
import fastifyWebsocket, { SocketStream } from "fastify-websocket";
import { IncomingMessage } from "http";

const app = fastify({ logger: { prettyPrint: true } });

app.register(fastifyWebsocket);

app.get("/discover", { websocket: true }, websocketHandler);

const port = process.env["PORT"] || 3000;
app.listen(3000, (err) => {
    if (err != null) {
        app.log.error(`Failed to launch fastify: ${err}`);
        process.exit(1);
    }
});

function websocketHandler(connection: SocketStream, request: IncomingMessage) {
    const socket = connection.socket;
    socket.on("message", (data) => console.log(data));
}
