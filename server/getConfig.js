export function getConfigInternal() {
  const rpID = "localhost";
  const protocol = "http";
  const port = 5050;
  const expectedOrigin = `${protocol}://${rpID}:${port}`;

  return ({
    rpID,
    PORT: port,
    expectedOrigin,
  });
}

export function makeGetConfig() {
  let config;

  return () => {
    if (config) {
      return config;
    }

    config = getConfigInternal();
    return config;
  }
}

export const getConfig = makeGetConfig();
