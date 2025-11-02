const fetch = require("node-fetch");

fetch("https://www.29cm.co.kr/products/2676254")
  .then(async (response) => {
    const html = await response.text();
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    const matches = [...html.matchAll(scriptRegex)];

    if (matches.length === 0) {
      console.log("스크립트 없음");
      return;
    }

    matches.forEach((m, i) => {
      console.log(`🔹 Script #${i + 1} ----------------`);
      console.log(m[1].trim());
    });
  })
  .catch((err) => console.error(err));
