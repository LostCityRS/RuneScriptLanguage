let client;

function setClient(nextClient) {
  client = nextClient;
}

function getClient() {
  return client;
}

module.exports = { setClient, getClient };
