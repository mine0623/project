fetch('https://www.musinsa.com/products/4741561')
  .then(async (response) => {
    const html = await response.text();

    const startStr = 'window.__MSS__.product.state = ';
    const startIndex = html.indexOf(startStr);
    if (startIndex === -1) {
      console.error('window.__MSS__.product.state 시작 부분을 찾을 수 없습니다.');
      return;
    }

    let i = startIndex + startStr.length;
    let braceCount = 0;
    let inString = false;
    let escape = false;
    let jsonString = '';

    while (i < html.length) {
      const char = html[i];
      jsonString += char;

      if (escape) {
        escape = false;
      } else if (char === '\\') {
        escape = true;
      } else if (char === '"' || char === "'") {
        inString = !inString;
      } else if (!inString) {
        if (char === '{') braceCount++;
        else if (char === '}') {
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
      productState = eval('(' + jsonString + ')');
    }

    const brand = productState.brandInfo?.brandName || productState.brand || null;
    const name = productState.goodsNm || null;
    const price = productState.goodsPrice?.salePrice || productState.goodsPrice?.normalPrice || null;
    const image = productState.thumbnailImageUrl
      ? `https://image.msscdn.net${productState.thumbnailImageUrl}`
      : (productState.goodsImages && productState.goodsImages.length > 0
         ? `https://image.msscdn.net${productState.goodsImages[0].imageUrl}`
         : null);

    console.log({ store: 'musinsa', brand, name, price, image });
  })
  .catch((error) => {
    console.error('fetch 에러:', error);
  });