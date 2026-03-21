import type { AdminExpectDetailResponse, ExpectDetailResponse } from "@statisticalsystem/shared";
import type { ExpectDetailComputed } from "./buildExpectDetailComputed";

export type ExpectDetailWorkerRequest = {
  id: number;
  data: ExpectDetailResponse | AdminExpectDetailResponse | null;
};

export type ExpectDetailWorkerResponse =
  | {
      id: number;
      type: "success";
      computed: ExpectDetailComputed;
    }
  | {
      id: number;
      type: "error";
      error: string;
    };
