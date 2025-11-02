fetch('https://m.a-bly.com/goods/24190834')
  .then(async (response) => {
    const html = await response.text();

    // 1. __NEXT_DATA__ 스크립트 내용 추출
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!match) return;

    const jsonData = match[1];
    const data = JSON.parse(jsonData);

    // 2. serverQueryClient 안 queries 배열
    const queries = data.props.serverQueryClient?.queries || [];

    // 3. goods 데이터만 추출
    const goodsData = queries
      .map(q => q.state?.data?.goods)
      .filter(g => g !== undefined);

    // 4. 필요한 정보만 추출
    const simplifiedData = goodsData.map(g => ({
      name: g.name,
      cover_images: g.cover_images?.[0],
      price: g.price_info?.thumbnail_price,
      market_name: g.market?.name
    }));

    console.log(simplifiedData);
  });
