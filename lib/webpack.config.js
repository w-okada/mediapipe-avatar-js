const path = require("path");

const manager = {
    mode: "development",
    // mode: "production",
    entry: "./src/index.ts",
    resolve: {
        extensions: [".ts", ".js"],
        fallback: {
            crypto: false,
            path: false,
            fs: false,
        },
    },
    module: {
        rules: [{ test: /\.ts$/, loader: "ts-loader" }],
    },
    output: {
        filename: "index.js",
        path: path.resolve(__dirname, "dist"),
        libraryTarget: "umd",
        globalObject: "typeof self !== 'undefined' ? self : this",
    },
    stats: {
        children: true,
    },
};

module.exports = [manager];
