import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getLoginService } from "../../services/serviceFactory";
import { addCorsHeaders } from "../../utils/corsUtils";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log("Received event login API:", JSON.stringify(event));

  const httpMethod = event.httpMethod;

  if (httpMethod === "OPTIONS") {
    return addCorsHeaders({
      statusCode: 200,
      body: JSON.stringify({ message: "OK" }),
    });
  }

  try {
    const loginService = await getLoginService();
    console.log("loginService created");

    let response: APIGatewayProxyResult;
    if (httpMethod === "POST") {
      const loginRequest = JSON.parse(event.body || "{}");
      const success = await loginService.login(loginRequest);
      if (success) {
        response = {
          statusCode: 200,
          body: JSON.stringify({ success }),
        };
      } else {
        response = {
          statusCode: 401,
          body: JSON.stringify({ message: "Invalid credentials" }),
        };
      }
    } else {
      response = {
        statusCode: 405,
        body: JSON.stringify({
          message: "Method not allowed or invalid path",
        }),
      };
    }
    return addCorsHeaders(response);
  } catch (error) {
    console.error("Error in login API:", error);
    return addCorsHeaders({
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" }),
    });
  }
};
