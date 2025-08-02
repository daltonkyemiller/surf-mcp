Bun.serve({
  port: 3000,
  routes: {
    "/test": async () => {
      return new Response("Hello via Bun!");
    },
  },
});

