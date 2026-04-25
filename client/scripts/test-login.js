fetch("https://repodeploy.vercel.app/api/trpc/auth.login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ "0": { username: "admin", password: "fake_password" } }) // Superjson might require this format
}).then(async res => {
  console.log("Status:", res.status);
  console.log("Set-Cookie:", res.headers.get("set-cookie"));
  console.log(await res.text());
});
