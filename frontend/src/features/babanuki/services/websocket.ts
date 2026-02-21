export const WEBSOCKET_ORIGIN =
  process.env.NEXT_PUBLIC_WEBSOCKET_ORIGIN ?? "ws://localhost:3001";

export function join(ws: WebSocket, playerName: string) {
  ws.send(JSON.stringify({ action: "join", playerName }));
}

export function draw_card(ws: WebSocket, cardIndex: number) {
  ws.send(JSON.stringify({ action: "draw_card", cardIndex }));
}

export function get_state(ws: WebSocket) {
  ws.send(JSON.stringify({ action: "get_state" }));
}
