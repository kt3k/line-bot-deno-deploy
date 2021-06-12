/// <reference path="https://deno.land/x/deploy@0.3.0/types/deploy.fetchevent.d.ts" />
/// <reference path="https://deno.land/x/deploy@0.3.0/types/deploy.ns.d.ts" />
/// <reference path="https://deno.land/x/deploy@0.3.0/types/deploy.window.d.ts" />

import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts";

const accessToken = Deno.env.get("ACCESS_TOKEN");
const channelSecret = Deno.env.get("CHANNEL_SECRET")!;

if (!accessToken) {
  throw new Error("ACCESS_TOKEN is not set");
}
if (!channelSecret) {
  throw new Error("CHANNEL_SECRET is not set");
}
addEventListener("fetch", (e) => {
  const { request } = e;
  e.respondWith((async () => {
    const json = await request.text();
    const digest = hmac("sha256", channelSecret, json, "utf8", "base64")
    console.log("body digest", digest);
    const signature = request.headers.get("x-line-signature");
    console.log("x-line-signature", signature);

    if (digest !== signature) {
      return new Response("400 Bad Request", { status: 400 });
    }

    const event = JSON.parse(json);
    console.log(event);
    const res = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
	replyToken: event.events[0].replyToken,
        messages: [
          {
            type: "text",
            text: `Hello!`,
          },
          {
            type: "text",
            text: "Reply from Deno Deploy",
          },
        ],
      }),
    });
    console.log(await res.json());
    return new Response("200 OK");
  })());
});
