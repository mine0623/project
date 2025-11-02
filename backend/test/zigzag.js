const puppeteer = require("puppeteer");

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto("https://zigzag.kr/catalog/products/132089534", {
    waitUntil: "networkidle2",
  });

  // HTML 가져오기
  const html = await page.content();

  // cheerio로 파싱 (puppeteer + cheerio 혼합)
  const cheerio = require("cheerio");
  const $ = cheerio.load(html);

  const div = $("div.css-1viudna.e1233iv60");

  if (!div.length) {
    console.log("해당 div 없음");
    await browser.close();
    return;
  }

  div.find('script[type="application/ld+json"]').each((i, el) => {
    const jsonText = $(el).html().trim();

    try {
      const data = JSON.parse(jsonText);

      let productName = data.name || "";
      const brandName = data.brand?.name || "";
      if (brandName && productName.startsWith(brandName + " ")) {
        productName = productName.slice(brandName.length + 1);
      }

      console.log("상품명:", productName);
      console.log("브랜드:", brandName);
      console.log("가격:", data.offers?.[0]?.price || "없음");
      console.log("이미지:", data.image?.[0] || "없음");
    } catch (e) {
      console.error("JSON 파싱 실패:", e.message);
    }
  });

  await browser.close();
})();
