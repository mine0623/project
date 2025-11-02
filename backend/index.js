const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());

async function resolveOnlink(url) {
  if (!url.includes("musinsa.onelink.me")) return url;
  const resp = await fetch(url);
  const text = await resp.text();
  const match = text.match(/https:\/\/www\.musinsa\.com\/products\/\d+/);
  if (match) return match[0];
  throw new Error("onlink에서 상품 URL을 찾지 못했습니다.");
}

async function parseMusinsa(url) {
  const finalUrl = await resolveOnlink(url);
  const response = await fetch(finalUrl);
  const html = await response.text();

  const startStr = "window.__MSS__.product.state = ";
  const startIndex = html.indexOf(startStr);
  if (startIndex === -1) throw new Error("상품 정보 파싱 실패");

  let i = startIndex + startStr.length;
  let braceCount = 0,
    inString = false,
    escape = false,
    jsonString = "";

  while (i < html.length) {
    const char = html[i];
    jsonString += char;
    if (escape) escape = false;
    else if (char === "\\") escape = true;
    else if (char === '"' || char === "'") inString = !inString;
    else if (!inString) {
      if (char === "{") braceCount++;
      else if (char === "}") {
        braceCount--;
        if (braceCount === 0) break;
      }
    }
    i++;
  }

  let productState;
  try {
    productState = JSON.parse(jsonString);
  } catch {
    productState = eval("(" + jsonString + ")");
  }

  return {
    source: "musinsa",
    brand: productState.brandInfo?.brandName || productState.brand || null,
    name: productState.goodsNm || "",
    price:
      productState.goodsPrice?.salePrice ||
      productState.goodsPrice?.normalPrice ||
      null,
    image: productState.thumbnailImageUrl
      ? `https://image.msscdn.net${productState.thumbnailImageUrl}`
      : productState.goodsImages?.[0]
      ? `https://image.msscdn.net${productState.goodsImages[0].imageUrl}`
      : null,
    productUrl: finalUrl,
  };
}

async function parseAbly(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const html = await response.text();

  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  );
  if (!match) throw new Error("에이블리 JSON 데이터 없음");

  const data = JSON.parse(match[1]);

  const queries = data.props.serverQueryClient?.queries || [];

  let goods = queries
    .map((q) => q.state?.data?.goods)
    .find((g) => g !== undefined);

  if (!goods) {
    goods = queries
      .map((q) => q.state?.data?.goods_info)
      .find((g) => g !== undefined);
  }

  if (!goods) throw new Error("에이블리 상품 데이터 없음");

  return {
    source: "ably",
    brand: goods.market?.name || null,
    name: goods.name || "",
    price: goods.price_info?.thumbnail_price || null,
    image: goods.cover_images?.[0] || null,
    productUrl: url,
  };
}

async function parseZigzag(url) {
  const response = await fetch(url);
  const html = await response.text();

  const divMatch = html.match(
    /<div class="css-1viudna e1233iv60">([\s\S]*?)<\/div>/
  );
  if (!divMatch) throw new Error("지그재그 div 없음");

  const divContent = divMatch[1];
  const scriptRegex =
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  const matches = [...divContent.matchAll(scriptRegex)];
  if (matches.length === 0) throw new Error("지그재그 JSON-LD 없음");

  const data = JSON.parse(matches[0][1].trim());

  let productName = data.name || "";
  const brandName = data.brand?.name || "";
  if (brandName && productName.startsWith(brandName + " ")) {
    productName = productName.slice(brandName.length + 1);
  }

  return {
    source: "zigzag",
    brand: brandName || null,
    name: productName,
    price: data.offers?.[0]?.price || null,
    image: data.image?.[0] || null,
    productUrl: url,
  };
}

app.post("/parse-link", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "url 필요" });

  try {
    let result;
    if (url.includes("musinsa")) {
      result = await parseMusinsa(url);
    } else if (url.includes("a-bly.com")) {
      result = await parseAbly(url);
    } else if (url.includes("zigzag.kr")) {
      result = await parseZigzag(url);
    } else {
      return res.status(400).json({ error: "지원하지 않는 쇼핑몰입니다." });
    }

    res.json(result);
  } catch (err) {
    console.error("서버 에러:", err);
    res.status(500).json({ error: "상품 정보 파싱 실패" });
  }
});

app.listen(3000, () => {
  console.log("크롤링 API 서버 실행 중 (포트 3000)");
});
