// 複数配送モード（2人）のルート決定アルゴリズム

function optimizeMultiDeliveryRoute(addresses, startLocation, endLocation) {
    // 配送先を2つのグループに分割し、それぞれの最適ルートを計算
    const [group1, group2] = divideAddresses(addresses);

    // 各グループの最適ルートを計算
    const route1 = optimizeSingleRoute([startLocation, ...group1, endLocation]);
    const route2 = optimizeSingleRoute([startLocation, ...group2, endLocation]);

    return {
        route1: route1,
        route2: route2
    };
}

function divideAddresses(addresses) {
    // 配送先を2つのグループに分割するロジック
    // ここでは、単純に距離に基づいて分割する例を示します
    const centerLat = addresses.reduce((sum, addr) => sum + addr.lat, 0) / addresses.length;
    const centerLng = addresses.reduce((sum, addr) => sum + addr.lng, 0) / addresses.length;

    const group1 = [];
    const group2 = [];

    addresses.forEach(addr => {
        const distToCenter = Math.sqrt(Math.pow(addr.lat - centerLat, 2) + Math.pow(addr.lng - centerLng, 2));
        if (group1.length <= group2.length) {
            group1.push(addr);
        } else {
            group2.push(addr);
        }
    });

    return [group1, group2];
}

function optimizeSingleRoute(addresses) {
    // 単一ルートの最適化ロジック
    // この関数は routing.js の既存の関数を利用することを想定
    // ここでは簡略化のため、入力をそのまま返します
    return addresses;
}

function generateMultiDeliveryUrls(routes) {
    // 2人分のGoogle MapsのURLを生成
    const url1 = generateGoogleMapsUrl(routes.route1);
    const url2 = generateGoogleMapsUrl(routes.route2);

    return {
        url1: url1,
        url2: url2
    };
}

function generateGoogleMapsUrl(route) {
    const origin = `${route[0].lat},${route[0].lng}`;
    const destination = `${route[route.length - 1].lat},${route[route.length - 1].lng}`;
    const waypoints = route.slice(1, -1).map(addr => `${addr.lat},${addr.lng}`).join('|');
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
}

// 他の必要な関数をここに追加