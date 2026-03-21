import { useEffect, useState } from "react";

export function useExpectDetailQuery<T>(queryKey: string, loadDetail: () => Promise<T>) {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: string | null;
  }>({
    data: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    let mounted = true;
    setState({ data: null, loading: true, error: null });

    loadDetail()
      .then((data) => {
        if (mounted) {
          setState({ data, loading: false, error: null });
        }
      })
      .catch((error: Error) => {
        if (mounted) {
          setState({ data: null, loading: false, error: error.message });
        }
      });

    return () => {
      mounted = false;
    };
  }, [queryKey]);

  return state;
}
