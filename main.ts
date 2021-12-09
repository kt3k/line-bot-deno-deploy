import { serve } from "https://deno.land/std@0.117.0/http/server.ts";

const accessToken = Deno.env.get("ACCESS_TOKEN");
const channelSecret = Deno.env.get("CHANNEL_SECRET");

function indexPage() {
  return new Response(`This is an example LINE bot implementation
See https://github.com/kt3k/line-bot-deno-deploy for details`);
}

function notFoundPage() {
  return new Response("404 Not Found", { status: 404 });
}

const enc = new TextEncoder();
const algorithm = { name: "HMAC", hash: "SHA-256" };

async function hmac(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    algorithm,
    false,
    ["sign", "verify"],
  );
  const signature = await crypto.subtle.sign(
    algorithm.name,
    key,
    enc.encode(body),
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function webhook(request: Request) {
  if (!accessToken) {
    throw new Error("ACCESS_TOKEN is not set");
  }
  if (!channelSecret) {
    throw new Error("CHANNEL_SECRET is not set");
  }

  const json = await request.text();
  const digest = await hmac(channelSecret, json);
  const signature = request.headers.get("x-line-signature");

  if (digest !== signature) {
    return new Response("Bad Request", { status: 400 });
  }

  const event = JSON.parse(json);
  console.log(event);
  if (event.events.length === 0) {
    return new Response("OK");
  }
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
          text: event.events[0].message.text,
        },
        {
          type: "text",
          text: "Reply from Deno Deploy beta3",
        },
      ],
    }),
  });
  await res.arrayBuffer();
  return new Response("OK");
}

serve((request) => {
  const { pathname } = new URL(request.url);

  switch (pathname) {
    case "/":
      return indexPage();
    case "/webhook":
      return webhook(request);
    default:
      return notFoundPage();
  }
});
