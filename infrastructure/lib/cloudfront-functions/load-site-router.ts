import * as fs from "fs";
import * as path from "path";
import { SITE_APEX_DOMAIN } from "../config/cloudfront-config";

const APEX_PATTERN = /^[a-z0-9.-]+$/;

/**
 * CloudFront Function source with the apex domain baked in.
 * The runtime is cloudfront-js-1.0, so the source stays ES5.
 */
export function loadSiteRouterCode(apexDomain: string = SITE_APEX_DOMAIN): string {
  if (!APEX_PATTERN.test(apexDomain)) {
    throw new Error(`Invalid apex domain for the CloudFront function: ${apexDomain}`);
  }

  const source = fs.readFileSync(path.join(__dirname, "site-router.js"), "utf8");
  if (!source.includes("__APEX_DOMAIN__")) {
    throw new Error("site-router.js is missing the __APEX_DOMAIN__ placeholder");
  }

  return source.split("__APEX_DOMAIN__").join(apexDomain);
}
