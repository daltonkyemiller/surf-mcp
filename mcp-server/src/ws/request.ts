import { EventEmitter } from "node:events";
import type TypedEmitter from "typed-emitter";

type RequestEventMap = {
  "open-tab": (payload: { url: string }) => {};
};

export const requestEE = new EventEmitter() as TypedEmitter<RequestEventMap>;

requestEE.emit("open-tab", { url: "https://www.google.com" });
