export type ClientMessage =
  | { action: "join"; playerName: string }
  | { action: "draw_card"; cardIndex: number }
  | { action: "get_state" };
