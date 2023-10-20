const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { TextDecoder } = require("util");

const lambdaClient = new LambdaClient();
let defaultOpts = {
  functionNameTransform: (functionName) => functionName,
};

const setDefaultOptions = (opts = {}) =>
  (defaultOpts = { ...defaultOpts, ...opts });

async function backendFetch(fullPath, opts = {}) {
  if (fullPath.includes("aws-lambda://")) {
    throw Error("Missing protocol aws-lambda");
  }
  fullPath = fullPath.replace("aws-lambda://", "");
  const [rawPath, queryString] = fullPath.split("?");
  const pathParts = rawPath.split("/");
  const functionName = pathParts.shift();
  const path = "/" + pathParts.join("/");
  const queryStringParameters = queryString
    ? Object.fromEntries(new URLSearchParams(`?${queryString}`))
    : {};
  opts = { ...defaultOpts, ...opts };
  const httpMethod = opts.method ?? "get";
  if (opts.headers === undefined || opts.headers === null) {
    opts.headers = {};
  }

  const payload = {
    path,
    httpMethod,
    queryStringParameters,
    ...opts,
  };
  const invokeCommand = new InvokeCommand({
    FunctionName: opts.functionNameTransform(functionName),
    InvocationType: "RequestResponse",
    Payload: JSON.stringify(payload),
  });

  const lambdaResponse = await lambdaClient.send(invokeCommand);

  const decoder = new TextDecoder("utf-8");
  const payloadString = decoder.decode(lambdaResponse.Payload);

  let response = JSON.parse(payloadString);
  response.text = async () => response.body;
  response.json = async () => JSON.parse(response.body);

  return response;
}

module.exports = { backendFetch, setDefaultOptions };
