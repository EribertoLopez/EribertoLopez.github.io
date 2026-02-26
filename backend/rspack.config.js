// rspack.config.js
const path = require("path");
const fs = require("fs");

/**
 * Scans the functions directory and automatically generates entry points
 * for each Lambda function that has an index.ts file.
 *
 * @param {string} functionsPath - Path to the functions directory
 * @returns {Object} Entry points object for rspack/webpack configuration
 */
function generateLambdaEntryPoints(functionsPath = "./src/functions") {
  // The "entry" field defines the starting point(s) for the bundler.
  // Each key becomes an output file (e.g., dist/login.js).
  // For AWS Lambda, each handler should be an entry.
  // If you call other files from index.ts (e.g., import or require), you only need to bundle index.ts.
  // Automatically generate entry points for each function directory in src/functions
  const functionsDir = path.resolve(__dirname, functionsPath);
  const entryPoints = {};

  try {
    // Check if functions directory exists
    if (!fs.existsSync(functionsDir)) {
      console.warn(`Functions directory not found: ${functionsDir}`);
      return entryPoints;
    }

    // Read directory contents
    const dirents = fs.readdirSync(functionsDir, { withFileTypes: true });

    dirents.forEach((dirent) => {
      if (dirent.isDirectory()) {
        const functionName = dirent.name;
        const indexTsPath = path.join(functionsDir, functionName, "index.ts");

        // Check if index.ts exists in the function directory
        if (fs.existsSync(indexTsPath)) {
          entryPoints[
            functionName
          ] = `${functionsPath}/${functionName}/index.ts`;
          console.log(`✓ Found Lambda function: ${functionName}`);
        } else {
          console.warn(`⚠ Skipping ${functionName}: no index.ts found`);
        }
      }
    });

    console.log(`Generated ${Object.keys(entryPoints).length} entry points`);
    return entryPoints;
  } catch (error) {
    console.error(`Error scanning functions directory: ${error.message}`);
    return entryPoints;
  }
}

/**
 * Generate entry points for all Lambda functions
 */
const entry = generateLambdaEntryPoints();

/**
 * Bundle all handlers under src/functions/../index.ts
 */
module.exports = {
  // mode: 'production', // TODO: Pipe this to the build script
  target: "node", // Node runtime (Node.js 20 compatible)

  // Automatically generated entry points for each function directory
  entry: entry,

  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    libraryTarget: "commonjs2",
    clean: true,
  },

  resolve: {
    extensions: [".ts", ".js", ".sql", ".csv"],
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: "swc-loader",
        exclude: /node_modules/,
        options: {
          jsc: {
            parser: {
              syntax: "typescript",
              decorators: true,
            },
            transform: {
              legacyDecorator: true,
              decoratorMetadata: true,
            },
          },
        },
      },
      {
        test: /\.sql$/,
        type: "asset/source",
        exclude: /node_modules/,
      },
      {
        test: /\.csv$/,
        type: "asset/resource", // copies csv file to dist
        generator: {
          filename: "data/[name][ext]", // dist/data/myfile.csv
        },
      },
    ],
  },

  externals: [
    // Exclude AWS SDK v2; it's in the Lambda runtime already
    { "aws-sdk": "commonjs2 aws-sdk" },
    // Exclude AWS SDK v3 — available in Lambda Node.js 22 runtime
    /^@aws-sdk\/.*/,
    /^@smithy\/.*/,
  ],

  devtool: "source-map",

  // Additional optimizations for Lambda
  optimization: {
    minimize: false, // Disable minification to preserve TypeORM migration class names
  },
};
