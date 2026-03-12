async function test() {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer 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",
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Test"
    },
    body: JSON.stringify({
      model: "openrouter/free",
      messages: [{ role: "user", content: "hello, reply in json with a 'msg' field" }],
      response_format: { type: "json_object" }
    })
  });
  console.log(res.status);
  console.log(await res.text());
}
test();
