import { startTransition, useEffect, useRef, useState } from "react";
import type { AdminExpectDetailResponse, ExpectDetailResponse } from "@statisticalsystem/shared";
import { buildExpectDetailComputed, createEmptyExpectDetailComputed, type ExpectDetailComputed } from "../lib/buildExpectDetailComputed";
import type { ExpectDetailWorkerRequest, ExpectDetailWorkerResponse } from "../lib/worker-protocol";

type ExpectDetailComputedSource = ExpectDetailResponse | AdminExpectDetailResponse;

export function useExpectDetailComputed(data: ExpectDetailComputedSource | null) {
  const [state, setState] = useState<{
    computed: ExpectDetailComputed;
    computing: boolean;
    ready: boolean;
  }>(() => ({
    computed: data?.computed ?? createEmptyExpectDetailComputed(),
    computing: Boolean(data) && !data?.computed,
    ready: !data || Boolean(data?.computed)
  }));
  const latestDataRef = useRef(data);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const useSyncFallbackRef = useRef(false);

  useEffect(() => {
    latestDataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (typeof Worker === "undefined") {
      useSyncFallbackRef.current = true;
      return;
    }

    try {
      const worker = new Worker(new URL("../workers/expect-detail.worker.ts", import.meta.url), { type: "module" });

      const handleMessage = (event: MessageEvent<ExpectDetailWorkerResponse>) => {
        const response = event.data;

        if (response.id !== requestIdRef.current) {
          return;
        }

        if (response.type === "error") {
          useSyncFallbackRef.current = true;
          worker.terminate();
          workerRef.current = null;

          startTransition(() => {
            setState({
              computed: buildExpectDetailComputed(latestDataRef.current),
              computing: false,
              ready: true
            });
          });

          return;
        }

        startTransition(() => {
          setState({
            computed: response.computed,
            computing: false,
            ready: true
          });
        });
      };

      const handleError = () => {
        useSyncFallbackRef.current = true;
        worker.terminate();
        workerRef.current = null;

        startTransition(() => {
          setState({
            computed: buildExpectDetailComputed(latestDataRef.current),
            computing: false,
            ready: true
          });
        });
      };

      worker.addEventListener("message", handleMessage as EventListener);
      worker.addEventListener("error", handleError);
      workerRef.current = worker;

      return () => {
        worker.removeEventListener("message", handleMessage as EventListener);
        worker.removeEventListener("error", handleError);
        worker.terminate();
        workerRef.current = null;
      };
    } catch {
      useSyncFallbackRef.current = true;
      setState({
        computed: buildExpectDetailComputed(latestDataRef.current),
        computing: false,
        ready: true
      });
    }
  }, []);

  useEffect(() => {
    latestDataRef.current = data;

    if (!data) {
      requestIdRef.current += 1;
      setState({
        computed: createEmptyExpectDetailComputed(),
        computing: false,
        ready: true
      });
      return;
    }

    if (data.computed) {
      setState({
        computed: data.computed,
        computing: false,
        ready: true
      });
      return;
    }

    if (useSyncFallbackRef.current || !workerRef.current) {
      setState({
        computed: buildExpectDetailComputed(data),
        computing: false,
        ready: true
      });
      return;
    }

    requestIdRef.current += 1;

    setState((current) => ({
      computed: current.computed,
      computing: true,
      ready: false
    }));

    const request: ExpectDetailWorkerRequest = {
      id: requestIdRef.current,
      data
    };

    workerRef.current.postMessage(request);
  }, [data]);

  return state;
}
