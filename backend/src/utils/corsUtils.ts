/**
 * Utility functions for adding CORS headers to Lambda responses
 */

import { APIGatewayProxyResult } from "aws-lambda";

const overrideRoles = process.env.ROLE_MAPPING
  ? JSON.parse(process.env.ROLE_MAPPING)
  : undefined;

const getMappedRole = (role: string) => {
  const roleMapping: any = overrideRoles;

  // if roleMapping is not defined, return the role
  if (!roleMapping) {
    return role;
  }

  return roleMapping[role];
};
/**
 * Adds CORS headers to an API Gateway response
 * @param response The response object to add headers to
 * @returns The response with CORS headers added
 */
export const addCorsHeaders = (
  response: APIGatewayProxyResult
): APIGatewayProxyResult => {
  // In production, allow all origins. In development, use specific origins
  const allowOrigin =
    process.env.ENVIRONMENT !== "local"
      ? "*"
      : process.env.FRONTEND_ORIGINS?.split(",")[0]?.trim() ||
        "http://localhost:3000";

  const headers = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Session-Id",
    ...response.headers, // Preserve any existing headers
  };

  return {
    ...response,
    headers,
  };
};

type RoleGuardOptions = {
  allowedRoles: string[];
  headerKey?: string; // default is 'user'
};

export function roleGuard(event: any, options: RoleGuardOptions): void {
  // if (["local", "test"].includes(process.env.ENVIRONMENT || "")) {
  //   return;
  // }

  const headers = event.headers || {};
  const headerKey = options.headerKey?.toLowerCase() || "User";

  const user = headers[headerKey] || headers[headerKey.toLowerCase()];

  let userRole: string[];
  if (!user) {
    throw {
      statusCode: 401,
      body: JSON.stringify({
        message: "Unauthorized due to missing user role",
      }),
    };
  }

  try {
    const userObj = JSON.parse(user);
    userRole = userObj?.groups?.split(",") || [];
  } catch (error) {
    throw {
      statusCode: 401,
      body: JSON.stringify({
        message: "Unauthorized due to invalid user role",
      }),
    };
  }

  if (
    !userRole ||
    !options.allowedRoles.some((role) => userRole.includes(getMappedRole(role)))
  ) {
    const message = userRole
      ? `Forbidden: role '${userRole}' is not allowed`
      : `Forbidden: missing required role header '${headerKey}'`;

    throw {
      statusCode: 403,
      body: JSON.stringify({ message }),
    };
  }
}
