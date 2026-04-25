const fetch = require("node-fetch"); // or use built-in global fetch if node > 18

(async () => {
  try {
    const res = await fetch("https://repodeploy.vercel.app/api/trpc/auth.login?batch=1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "0": {
          "json": {
            "username": "admin",
            "password": "fake_password"
          }
        }
      })
    });
    console.log("Status:", res.status);
    console.log("Set-Cookie:", res.headers.get("set-cookie"));
    const text = await res.text();
    console.log("Body:", text);
  } catch(e) {
    console.error(e);
  }
})();
