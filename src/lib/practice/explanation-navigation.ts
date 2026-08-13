export type ExplanationNavigationState = {
  open: boolean;
  view: "step" | "all";
  stepIndex: number;
};

export type ExplanationNavigationAction =
  | { type: "open" }
  | { type: "close" }
  | { type: "next"; stepCount: number }
  | { type: "previous" }
  | { type: "show_all" }
  | { type: "show_step"; stepIndex?: number; stepCount: number };

export function explanationNavigationReducer(
  state: ExplanationNavigationState,
  action: ExplanationNavigationAction,
): ExplanationNavigationState {
  switch (action.type) {
    case "open":
      return { ...state, open: true };
    case "close":
      return { ...state, open: false };
    case "next":
      return {
        ...state,
        stepIndex: Math.min(Math.max(0, action.stepCount - 1), state.stepIndex + 1),
      };
    case "previous":
      return { ...state, stepIndex: Math.max(0, state.stepIndex - 1) };
    case "show_all":
      return { ...state, view: "all" };
    case "show_step":
      return {
        ...state,
        view: "step",
        stepIndex: Math.min(
          Math.max(0, action.stepCount - 1),
          Math.max(0, action.stepIndex ?? state.stepIndex),
        ),
      };
  }
}
