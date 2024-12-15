import express from "express";
import ViteExpress from "vite-express";
import { SignJWT, importPKCS8 } from "jose";
import SECRETS from "./secrets.json" assert { type: "json" };

const app = express();

function initJwt(): Promise<string> {
  return new Promise((resolve) => {
    importPKCS8(SECRETS.qweather.private_key, "EdDSA")
      .then((privateKey) => {
        const customHeader = {
          alg: "EdDSA",
          kid: SECRETS.qweather.key_id,
        };
        const iat = Math.floor(Date.now() / 1000) - 30;
        const exp = iat + 900;
        const customPayload = {
          sub: SECRETS.qweather.project_id,
          iat: iat,
          exp: exp,
        };
        new SignJWT(customPayload)
          .setProtectedHeader(customHeader)
          .sign(privateKey)
          .then((token) => resolve(token));
      })
      .catch((error) => console.error(error));
  });
}

ViteExpress.listen(app, 3000, () =>
  console.log("Server is listening on port 3000...")
);
