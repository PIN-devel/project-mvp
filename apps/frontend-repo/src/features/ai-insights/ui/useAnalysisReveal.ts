import { useEffect, useReducer } from "react";

type Phase = "idle" | "processing" | "converging" | "settled" | "revealed";
type Action = "start" | "complete" | "settle" | "reveal" | "long-wait" | "reset";
type State = { phase: Phase; longWait: boolean };
const initial: State = { phase: "idle", longWait: false };

function reducer(state: State, action: Action): State {
  switch (action) {
    case "start": return { phase: "processing", longWait: false };
    case "complete": return state.phase === "processing" ? { ...state, phase: "converging" } : state;
    case "settle": return state.phase === "converging" ? { ...state, phase: "settled" } : state;
    case "reveal": return state.phase === "settled" ? { ...state, phase: "revealed" } : state;
    case "long-wait": return state.phase === "processing" ? { ...state, longWait: true } : state;
    case "reset": return initial;
  }
}

// Timers only finish the visual transition; only a real response can dispatch complete.
export function useAnalysisReveal() {
  const [state, dispatch] = useReducer(reducer, initial);
  useEffect(() => {
    const delay = state.phase === "processing" ? 5000
      : state.phase === "converging" ? 180 : state.phase === "settled" ? 400 : null;
    if (delay === null) return;
    const action = state.phase === "processing" ? "long-wait"
      : state.phase === "converging" ? "settle" : "reveal";
    const timer = window.setTimeout(() => dispatch(action), delay);
    return () => window.clearTimeout(timer);
  }, [state.phase]);
  return { ...state, busy: !["idle", "revealed"].includes(state.phase), dispatch };
}
