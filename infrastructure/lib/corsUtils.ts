// === CORS config you want everywhere ===
export const CORS_ORIGINS = (() => {
  // In production, allow all origins
  if (process.env.ENVIRONMENT !== "local") {
    return ["*"];
  }

  // In development, use specific origins
  return (
    process.env.FRONTEND_ORIGINS ??
    "http://localhost:3000,http://localhost:3001"
  )
    .split(",")
    .map((s) => s.trim());
})();

const CORS_HEADERS = [
  "Content-Type",
  "Authorization",
  "X-Requested-With",
  "X-Amz-Date",
  "X-Api-Key",
  "X-Session-Id",
];

const CORS_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
// In production with "*" origins, we can't use credentials
const CORS_CREDENTIALS = process.env.ENVIRONMENT !== "local" ? false : true;

export function addCorsOptionsEverywhere(
  spec: any,
  isLocalDeployment: boolean = false
) {
  // (Optional) keep the extension too; the mocks are what actually matter.
  spec["x-amazon-apigateway-cors"] = {
    allowOrigins: CORS_ORIGINS,
    allowHeaders: CORS_HEADERS,
    allowMethods: CORS_METHODS,
    allowCredentials: CORS_CREDENTIALS,
    maxAge: 86400,
  };

  const allowOrigin = CORS_CREDENTIALS
    ? CORS_ORIGINS[0] // must be a concrete origin if credentials=true
    : "*";

  Object.keys(spec.paths).forEach((pathKey) => {
    const p = spec.paths[pathKey] ?? (spec.paths[pathKey] = {});
    if (p.options) return;

    // For LocalStack, route OPTIONS to Lambda instead of using mock
    // because LocalStack doesn't properly support mock integrations
    if (isLocalDeployment) {
      // Find an existing integration to use as the handler
      const existingMethod = Object.keys(p).find(
        (m) => m !== "options" && p[m]?.["x-amazon-apigateway-integration"]
      );
      const existingIntegration = existingMethod
        ? p[existingMethod]["x-amazon-apigateway-integration"]
        : null;

      if (existingIntegration) {
        p.options = {
          summary: "CORS preflight",
          responses: {
            "200": {
              description: "CORS OK",
            },
          },
          "x-amazon-apigateway-integration": {
            type: "aws_proxy",
            httpMethod: "POST",
            uri: existingIntegration.uri,
            passthroughBehavior: "when_no_match",
          },
        };
        return;
      }
    }

    // For AWS (non-local), use mock integration
    p.options = {
      summary: "CORS preflight",
      responses: {
        "200": {
          description: "CORS OK",
          headers: {
            "Access-Control-Allow-Origin": { schema: { type: "string" } },
            "Access-Control-Allow-Methods": { schema: { type: "string" } },
            "Access-Control-Allow-Headers": { schema: { type: "string" } },
            "Access-Control-Allow-Credentials": { schema: { type: "string" } },
            "Access-Control-Max-Age": { schema: { type: "string" } },
          },
        },
      },
      "x-amazon-apigateway-integration": {
        type: "mock",
        requestTemplates: { "application/json": '{"statusCode": 200}' },
        responses: {
          default: {
            statusCode: "200",
            responseParameters: {
              // strings must be single-quoted
              "method.response.header.Access-Control-Allow-Origin": `'${allowOrigin}'`,
              "method.response.header.Access-Control-Allow-Methods": `'${CORS_METHODS.join(
                ","
              )}'`,
              "method.response.header.Access-Control-Allow-Headers": `'${CORS_HEADERS.join(
                ","
              )}'`,
              "method.response.header.Access-Control-Allow-Credentials": `'${
                CORS_CREDENTIALS ? "true" : "false"
              }'`,
              "method.response.header.Access-Control-Max-Age": "'86400'",
            },
          },
        },
      },
    };
  });

  return spec;
}
