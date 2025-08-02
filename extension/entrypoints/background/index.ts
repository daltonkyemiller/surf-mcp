export default defineBackground(() => {
  console.log("Background script loaded");
  const ws = new WebSocket("ws://localhost:3000");
  ws.addEventListener("open", () => {
    console.log("Connected to server");
  });
  ws.addEventListener("message", (ev) => {
    const parsed = JSON.parse(ev.data);
    if (parsed.type !== "open-tab") {
      return;
    }
    browser.tabs.create({
      url: parsed.data.url,
    });
  });
});
