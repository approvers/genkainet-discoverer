import { DefaultHandlerFactory, INode, Network, Node, OfferPacket } from "@approvers/libgenkainet/";
import { IAnswer, RTCPeerConnectionFactory } from "@approvers/libgenkainet/dist/webrtc";
import fastify from "fastify";
import fastifyWebsocket, { SocketStream } from "fastify-websocket";
import { IncomingMessage } from "http";
import { Data as WebSocketData } from "ws";
// @ts-ignore
import { RTCPeerConnection } from "wrtc";
import EventEmitter from "events";
import { AnswerResponse, DiscoverResponse, ErrorResponse, isOfferRequest, AnswerRequest, Response } from "./models";

const app = fastify({ logger: { prettyPrint: true } });
const answerChannel = new EventEmitter();
const network = new Network();
const discovererNode = new Node(
    "discoverer",
    {} as any,
    new DefaultHandlerFactory(
        {
            handle: (from, msg) => app.log.info(`Received message: from: ${from.id}, content: ${msg}`),
        },
        {
            handle: (answer) => {
                answerChannel.emit(answer.from.id, answer);
            },
        }
    ),

    {
        create() {
            const stunServers = [
                "stun.l.google.com:19302",
                "stun1.l.google.com:19302",
                "stun2.l.google.com:19302",
                "stun3.l.google.com:19302",
                "stun4.l.google.com:19302",
            ];

            return new RTCPeerConnection({
                iceServer: stunServers.map((server) => ({
                    url: server,
                })),
            });
        },
    }
);

app.register(fastifyWebsocket);
app.get("/discover", { websocket: true }, websocketHandler);

const port = process.env["PORT"] || 3000;
app.listen(port, (err) => {
    if (err != null) {
        app.log.error(`Failed to launch fastify: ${err}`);
        process.exit(1);
    }
});

function websocketHandler(connection: SocketStream, request: IncomingMessage) {
    app.log.info(`${request.socket.remoteAddress ?? "unknown"} is now connected!`);

    const socket = connection.socket;

    socket.on("message", async (data) => socket.send(JSON.stringify(await onData(data))));
    socket.on("close", () => app.log.info(`${request.socket.remoteAddress ?? "unknown"} has disconnected!`));
}

function dedup<T>(array: Array<T>): Array<T> {
    return array.sort().reduce<Array<T>>((result, element) => {
        if (result.length === 0 || result[result.length - 1] !== element) {
            result.push(element);
        }

        return result;
    }, []);
}

function getAllNodes(): Array<INode> {
    const nodes = network.connections.flatMap((con) => [con.from, con.to]);
    const dedupedNodeIDs = dedup(nodes.map((x) => x.id));

    return dedupedNodeIDs.map((id) => nodes.find((node) => node.id === id)!);
}

async function onData(data: WebSocketData): Promise<Response> {
    const error = (message: string): ErrorResponse => ({ type: "error", message });

    if (typeof data !== "string") {
        return error("Unknown data type");
    }

    let parsedData: Record<string, unknown>;

    try {
        parsedData = JSON.parse(data);
    } catch (e: unknown) {
        return error("Invalid JSON");
    }

    const type = parsedData["type"];
    if (type == null) {
        return error(`No "type" field in request`);
    }

    try {
        switch (type) {
            case "requestDiscover":
                return onDiscoverRequest();

            case "offer":
                if (!isOfferRequest(parsedData)) {
                    return error("Invalid OfferRequest");
                }
                return await onOffer(parsedData);

            default:
                return error("Unknown request type");
        }
    } catch (e: unknown) {
        app.log.error(`error occur: ${e}`);
        return { type: "internalServerError" };
    }
}

function onDiscoverRequest(): DiscoverResponse {
    const nodes = getAllNodes();
    const genRandomIndex = () => Math.round(Math.random() * (nodes.length - 1));

    const node = nodes.length === 0 ? discovererNode : nodes[genRandomIndex()];

    return {
        type: "responseDiscover",
        object: {
            id: node.id,
        },
    };
}

async function onOffer(request: AnswerRequest): Promise<AnswerResponse> {
    const createAnswer = (ans: IAnswer): AnswerResponse => ({
        type: "answer",
        object: { from: { id: ans.from.id }, to: { id: ans.to.id }, sdp: ans.sdp },
    });

    const offer = request.object;

    if (offer.to.id === discovererNode.id) {
        const [connection, answer] = await discovererNode.accept(offer);
        network.add(connection);

        return createAnswer(answer);
    }

    discovererNode.send(new OfferPacket(offer, discovererNode, offer.to));

    const answer = await new Promise<IAnswer>((resolve) => {
        answerChannel.once(offer.to.id, (answer) => resolve(answer));
    });

    return createAnswer(answer);
}
