// Netlify serverless function — contact form bridge
// Receives form POST, forwards to OpenClaw hook, redirects to thank-you page.
// Form fields are treated as DATA only — never executed or interpreted as prompts.

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Parse form body (application/x-www-form-urlencoded)
  const params = new URLSearchParams(event.body || "");
  const name    = (params.get("name")    || "").slice(0, 200).trim();
  const email   = (params.get("email")   || "").slice(0, 200).trim();
  const phone   = (params.get("phone")   || "").slice(0, 50).trim();
  const message = (params.get("message") || "").slice(0, 1000).trim();

  // Basic required field check
  if (!name || !email || !message) {
    return {
      statusCode: 302,
      headers: { Location: "/contact.html?error=missing" },
      body: "",
    };
  }

  const hookUrl   = process.env.OPENCLAW_HOOK_URL;
  const hookToken = process.env.OPENCLAW_HOOK_TOKEN;

  if (!hookUrl || !hookToken) {
    console.error("Missing OPENCLAW_HOOK_URL or OPENCLAW_HOOK_TOKEN env vars");
    return {
      statusCode: 302,
      headers: { Location: "/contact.html?error=config" },
      body: "",
    };
  }

  // Forward to OpenClaw hook as structured JSON data — never as a prompt
  try {
    const response = await fetch(hookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${hookToken}`,
      },
      body: JSON.stringify({ name, email, phone, message }),
    });

    if (!response.ok) {
      console.error("Hook responded with status:", response.status);
    }
  } catch (err) {
    // Don't block the user if the hook is temporarily unreachable
    console.error("Hook delivery failed:", err.message);
  }

  // Always redirect to thank-you regardless of hook success
  return {
    statusCode: 302,
    headers: { Location: "/thank-you.html" },
    body: "",
  };
};
