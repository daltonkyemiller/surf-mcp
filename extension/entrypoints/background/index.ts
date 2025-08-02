export default defineBackground(() => {
  console.log("Background script loaded");
  const ws = new WebSocket("ws://localhost:3000");
});
