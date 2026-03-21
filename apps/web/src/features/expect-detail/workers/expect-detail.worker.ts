/// <reference lib="webworker" />

import { buildExpectDetailComputed } from "../lib/buildExpectDetailComputed";
import type { ExpectDetailWorkerRequest, ExpectDetailWorkerResponse } from "../lib/worker-protocol";

const workerScope = self as DedicatedWorkerGlobalScope;

workerScope.addEventListener("message", (event: MessageEvent<ExpectDetailWorkerRequest>) => {
  try {
    const response: ExpectDetailWorkerResponse = {
      id: event.data.id,
      type: "success",
      computed: buildExpectDetailComputed(event.data.data)
    };

    workerScope.postMessage(response);
  } catch (error) {
    const response: ExpectDetailWorkerResponse = {
      id: event.data.id,
      type: "error",
      error: error instanceof Error ? error.message : "Failed to compute expect detail"
    };

    workerScope.postMessage(response);
  }
});
