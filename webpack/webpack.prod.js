const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");
const dotenv = require("dotenv");
const webpack = require("webpack");

dotenv.config();

module.exports = merge(common, {
  mode: "production",
  plugins: [
    new webpack.DefinePlugin({
      "process.env": {
        API_KEY: JSON.stringify(process.env.API_KEY),
        AUTH_DOMAIN: JSON.stringify(process.env.AUTH_DOMAIN),
        PROJECT_ID: JSON.stringify(process.env.PROJECT_ID),
        STORAGE_BUCKET: JSON.stringify(process.env.STORAGE_BUCKET),
        MESSAGING_SENDER_ID: JSON.stringify(process.env.MESSAGING_SENDER_ID),
        APP_ID: JSON.stringify(process.env.APP_ID),
      },
    }),
  ],
});
