export class WSClient {
  private socket: WebSocket;

  constructor(url: string) {
    this.socket = new WebSocket(url);
  }

  on(){}

  emit(){}
}
