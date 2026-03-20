const { Agent, setGlobalDispatcher, fetch: undiciFetch } = require("undici");

const dispatcher = new Agent({
  connect: {
    family: 4,
    timeout: 30000,
  },
});

setGlobalDispatcher(dispatcher);

globalThis.fetch = (input, init = {}) =>
  undiciFetch(input, {
    ...init,
    dispatcher: init.dispatcher ?? dispatcher,
  });
