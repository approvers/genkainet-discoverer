import { INode } from "@approvers/libgenkainet";
import { IAnswer, IOffer } from "@approvers/libgenkainet/dist/webrtc";

export type DiscoverRequest = {
    type: "requestDiscover";
};

export type DiscoverResponse = {
    type: "responseDiscover";
    object: INode;
};

export type OfferRequest = {
    type: "offer";
    object: {
        offer: IOffer;
        to: INode;
    };
};

export type AnswerResponse = {
    type: "answer";
    object: IAnswer;
};

export type ErrorResponse = {
    type: "error";
    message: string;
};

export type Response = DiscoverResponse | AnswerResponse | ErrorResponse;

export function isObject(obj: unknown): obj is Record<string, unknown> {
    return obj != null && typeof obj === "object";
}

export function isINode(obj: unknown): obj is INode {
    return isObject(obj) && typeof obj["id"] === "string";
}

export function isIOffer(obj: unknown): obj is IOffer {
    // prettier-ignore
    return (
        isObject(obj) &&
        isINode(obj["from"]) &&
        isINode(obj["to"]) &&
        typeof obj["sdp"] === "string"
    );
}

export function isOfferRequest(obj: unknown): obj is OfferRequest {
    return (
        isObject(obj) &&
        obj["type"] === "offer" &&
        isObject(obj["object"]) &&
        isIOffer(obj["object"]["offer"]) &&
        isINode(obj["object"]["to"])
    );
}
