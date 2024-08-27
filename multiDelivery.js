// 複数配送モード（2人）のルート決定アルゴリズム

function optimizeMultiDeliveryRoute(addresses, startLocation, endLocation) {
    console.log('Optimizing multi-delivery route:', { addresses, startLocation, endLocation });
    // 初期解として単純に半分ずつに分割
    let [group1, group2] = divideAddresses(addresses);
    
    let bestSolution = { route1: [startLocation, ...group1, endLocation], route2: [startLocation, ...group2, endLocation] };
    let bestScore = evaluateSolution(bestSolution);

    const maxIterations = 1000;
    let temperature = 100;
    const coolingRate = 0.995;

    for (let i = 0; i < maxIterations; i++) {
        const newSolution = generateNeighbor(bestSolution);
        const newScore = evaluateSolution(newSolution);

        if (newScore < bestScore || Math.random() < Math.exp((bestScore - newScore) / temperature)) {
            bestSolution = newSolution;
            bestScore = newScore;
        }

        temperature *= coolingRate;
    }

    return bestSolution;
}

function divideAddresses(addresses) {
    const midpoint = Math.floor(addresses.length / 2);
    return [addresses.slice(0, midpoint), addresses.slice(midpoint)];
}

function generateNeighbor(solution) {
    const newSolution = JSON.parse(JSON.stringify(solution));
    const route1 = newSolution.route1.slice(1, -1);
    const route2 = newSolution.route2.slice(1, -1);

    if (Math.random() < 0.5 && route1.length > 1) {
        // Move a random point from route1 to route2
        const index = Math.floor(Math.random() * route1.length);
        route2.push(route1.splice(index, 1)[0]);
    } else if (route2.length > 1) {
        // Move a random point from route2 to route1
        const index = Math.floor(Math.random() * route2.length);
        route1.push(route2.splice(index, 1)[0]);
    }

    newSolution.route1 = [solution.route1[0], ...route1, solution.route1[solution.route1.length - 1]];
    newSolution.route2 = [solution.route2[0], ...route2, solution.route2[solution.route2.length - 1]];

    return newSolution;
}

function evaluateSolution(solution) {
    const time1 = estimateRouteTime(solution.route1);
    const time2 = estimateRouteTime(solution.route2);
    return Math.abs(time1 - time2); // 時間差を最小化
}

function estimateRouteTime(route) {
    let totalTime = 0;
    for (let i = 0; i < route.length - 1; i++) {
        const distance = calculateDistance(route[i], route[i + 1]);
        totalTime += estimateDrivingTime(distance);
        if (i > 0 && i < route.length - 1) {
            totalTime += route[i].deliveryTime || 5; // デフォルトの配達時間は5分
        }
    }
    return totalTime;
}

function calculateDistance(point1, point2) {
    const R = 6371; // 地球の半径（km）
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLon = (point2.lng - point1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function estimateDrivingTime(distance) {
    const averageSpeed = 40; // km/h
    return distance / averageSpeed * 60; // 分単位で返す
}

function generateMultiDeliveryUrls(routes) {
    const url1 = generateGoogleMapsUrl(routes.route1);
    const url2 = generateGoogleMapsUrl(routes.route2);
    return { url1, url2 };
}

function generateGoogleMapsUrl(route) {
    const origin = `${route[0].lat},${route[0].lng}`;
    const destination = `${route[route.length - 1].lat},${route[route.length - 1].lng}`;
    const waypoints = route.slice(1, -1).map(addr => `${addr.lat},${addr.lng}`).join('|');
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
}

// 他の必要な関数をここに追加