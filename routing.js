async function calculateOptimalRoute(addresses, options) {
    const { useHighwaysCheckbox, avoidTollsCheckbox, avoidFerriesCheckbox, optimizeRoute } = options;

    let optimizedAddresses = addresses;
    if (optimizeRoute.checked) {
        const matrix = await calculateDistanceMatrix(addresses, options);
        const optimalOrder = findOptimalOrder(matrix);
        optimizedAddresses = optimalOrder.map(index => addresses[index]);

        // 住所の順番を更新（出発地と到着地は固定）
        updateAddressOrder(optimizedAddresses.slice(1, -1));
    }

    const origin = optimizedAddresses[0]; // 出発地は固定
    const destination = optimizedAddresses[optimizedAddresses.length - 1]; // 到着地は固定
    const waypoints = optimizedAddresses.slice(1, -1).map(address => ({
        location: address,
        stopover: true
    }));

    const request = {
        origin: origin,
        destination: destination,
        waypoints: waypoints,
        optimizeWaypoints: true,
        travelMode: 'DRIVING',
        drivingOptions: {
            departureTime: new Date(),
            trafficModel: 'bestguess'
        },
        avoidHighways: !useHighwaysCheckbox.checked,
        avoidTolls: avoidTollsCheckbox.checked,
        avoidFerries: avoidFerriesCheckbox.checked,
        provideRouteAlternatives: true
    };

    try {
        const result = await new Promise((resolve, reject) => {
            const directionsService = new google.maps.DirectionsService();
            directionsService.route(request, (result, status) => {
                if (status === 'OK') {
                    resolve(result);
                } else {
                    reject(new Error('経路の計算に失敗しました: ' + status));
                }
            });
        });

        displayOptimalRoute(result);
        return result;
    } catch (error) {
        alert(error.message);
        return null;
    }
}

async function calculateDistanceMatrix(addresses, options) {
    const { useHighwaysCheckbox, avoidTollsCheckbox, avoidFerriesCheckbox } = options;
    const service = new google.maps.DistanceMatrixService();
    const matrix = [];

    for (let i = 0; i < addresses.length; i++) {
        const row = await new Promise((resolve, reject) => {
            service.getDistanceMatrix({
                origins: [addresses[i]],
                destinations: addresses,
                travelMode: 'DRIVING',
                drivingOptions: {
                    departureTime: new Date(),
                    trafficModel: 'bestguess'
                },
                avoidHighways: !useHighwaysCheckbox.checked,
                avoidTolls: avoidTollsCheckbox.checked,
                avoidFerries: avoidFerriesCheckbox.checked
            }, (response, status) => {
                if (status === 'OK') {
                    resolve(response.rows[0].elements.map(el => el.duration_in_traffic ? el.duration_in_traffic.value : el.duration.value));
                } else {
                    reject(new Error('距離行列の計算に失敗しました'));
                }
            });
        });
        matrix.push(row);
    }

    return matrix;
}

function findOptimalOrder(matrix) {
    const n = matrix.length;
    const visited = new Array(n).fill(false);
    const order = [0];
    visited[0] = true;
    visited[n-1] = true; // 到着地も訪問済みとしてマーク

    for (let i = 1; i < n - 1; i++) {
        let bestNext = -1;
        let bestTime = Infinity;

        for (let j = 1; j < n - 1; j++) {
            if (!visited[j]) {
                const time = matrix[order[i-1]][j];
                if (time < bestTime) {
                    bestTime = time;
                    bestNext = j;
                }
            }
        }

        order.push(bestNext);
        visited[bestNext] = true;
    }

    order.push(n-1); // 最後に到着地を追加
    return order;
}

function updateAddressOrder(optimizedAddresses) {
    const addressInputs = document.querySelectorAll('.address-input');
    const addressInputsContainer = document.getElementById('addressInputs');

    // 既存の入力欄をすべて一時的に削除
    const inputsArray = Array.from(addressInputs);
    inputsArray.forEach(input => input.remove());

    // 最適化された順序に基づいて住所入力欄を再配置
    optimizedAddresses.forEach((address, index) => {
        const addressInput = inputsArray.find(input => input.querySelector('.address').value === address);
        if (addressInput) {
            addressInputsContainer.appendChild(addressInput);
            const label = addressInput.querySelector('label');
            const addressElement = addressInput.querySelector('.address');
            label.textContent = `経由地 ${index + 1}:`;
            label.setAttribute('for', `address${index + 1}`);
            addressElement.id = `address${index + 1}`;
        }
    });

    // 上下ボタンの状態を更新
    updateMoveButtons();
}

function displayOptimalRoute(result) {
    const map = new google.maps.Map(document.getElementById('map'), {
        zoom: 7,
        center: { lat: 35.6762, lng: 139.6503 }  // 東京の座標
    });

    const directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);
    directionsRenderer.setDirections(result);

    const route = result.routes[0];
    let totalDistance = 0;
    let totalDuration = 0;
    let totalDurationInTraffic = 0;

    const routeInfo = document.getElementById('routeInfo');
    routeInfo.innerHTML = '<h3>最適経路:</h3><div class="route-cards"></div>';
    const routeCards = routeInfo.querySelector('.route-cards');

    route.legs.forEach((leg, index) => {
        totalDistance += leg.distance.value;
        totalDuration += leg.duration.value;
        totalDurationInTraffic += leg.duration_in_traffic ? leg.duration_in_traffic.value : leg.duration.value;

        const card = document.createElement('div');
        card.className = 'route-card';
        card.innerHTML = `
            <div class="route-point">
                <i class="material-icons">${index === 0 ? 'play_circle_filled' : 'location_on'}</i>
                <span>${leg.start_address}</span>
            </div>
            <div class="route-details">
                <i class="material-icons">arrow_downward</i>
                <span>${leg.distance.text} / ${leg.duration_in_traffic ? leg.duration_in_traffic.text : leg.duration.text}</span>
            </div>
        `;
        routeCards.appendChild(card);
    });

    // 最後の目的地を追加
    const lastCard = document.createElement('div');
    lastCard.className = 'route-card';
    lastCard.innerHTML = `
        <div class="route-point">
            <i class="material-icons">flag</i>
            <span>${route.legs[route.legs.length - 1].end_address}</span>
        </div>
    `;
    routeCards.appendChild(lastCard);

    const summaryCard = document.createElement('div');
    summaryCard.className = 'route-summary';
    summaryCard.innerHTML = `
        <h4>ルート概要</h4>
        <p><i class="material-icons">straighten</i> 総距離: ${(totalDistance / 1000).toFixed(2)} km</p>
        <p><i class="material-icons">access_time</i> 通常の総所要時間: ${Math.floor(totalDuration / 3600)}時間${Math.floor((totalDuration % 3600) / 60)}分</p>
        <p><i class="material-icons">traffic</i> 交通状況を考慮した総所要時間: ${Math.floor(totalDurationInTraffic / 3600)}時間${Math.floor((totalDurationInTraffic % 3600) / 60)}分</p>
    `;
    routeInfo.appendChild(summaryCard);
}

function generateOptimalUrl(result, options) {
    const { useHighwaysCheckbox, avoidTollsCheckbox, avoidFerriesCheckbox } = options;
    const route = result.routes[0];
    const origin = encodeURIComponent(route.legs[0].start_address);
    const destination = encodeURIComponent(route.legs[route.legs.length - 1].end_address);
    // すべての経由地を含める（最初と最後の地点を除く）
    const waypoints = route.legs.slice(0, -1).map(leg => encodeURIComponent(leg.end_address)).join('|');

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
    
    let avoidParams = [];
    if (!useHighwaysCheckbox.checked) avoidParams.push('highways');
    if (avoidTollsCheckbox.checked) avoidParams.push('tolls');
    if (avoidFerriesCheckbox.checked) avoidParams.push('ferries');

    if (avoidParams.length > 0) {
        url += '&avoid=' + avoidParams.join('|');
    }

    return url;
}

function generateUserOrderUrl(addresses, options) {
    const { useHighwaysCheckbox, avoidTollsCheckbox, avoidFerriesCheckbox } = options;
    const origin = encodeURIComponent(addresses[0]);
    const destination = encodeURIComponent(addresses[addresses.length - 1]);
    const waypoints = addresses.slice(1, -1).map(address => encodeURIComponent(address)).join('|');

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
    
    let avoidParams = [];
    if (!useHighwaysCheckbox.checked) avoidParams.push('highways');
    if (avoidTollsCheckbox.checked) avoidParams.push('tolls');
    if (avoidFerriesCheckbox.checked) avoidParams.push('ferries');

    if (avoidParams.length > 0) {
        url += '&avoid=' + avoidParams.join('|');
    }

    return url;
}

// グローバルスコープで定義
window.generateUrl = async function(startLocationSelect, endLocationSelect, options) {
    const startLocation = startLocationSelect.value;
    const endLocation = endLocationSelect.value;
    const addresses = Array.from(document.querySelectorAll('.address'))
        .map(input => input.value.trim())
        .filter(address => address !== '');

    if (!startLocation || !endLocation || addresses.length < 1) {
        alert('出発地、到着地、そして少なくとも1つの経由地を入力してください。');
        return;
    }

    const allAddresses = [startLocation, ...addresses, endLocation];

    let result;
    let url;

    if (options.optimizeRoute.checked) {
        // 最適化されたルートの計算と URL 生成
        result = await calculateOptimalRoute(allAddresses, options);
        url = result ? generateOptimalUrl(result, options) : null;
    } else {
        // ユーザーの入力順序に沿ったURL生成
        url = generateUserOrderUrl(allAddresses, options);
    }

    // 結果の表示
    displayResults(url, options.optimizeRoute.checked);

    // 以下の行を追加
    document.getElementById('result').style.display = 'block';
}

function displayResults(url, isOptimized) {
    const resultSection = document.getElementById('result');
    resultSection.innerHTML = `
        <h2>生成されたルート</h2>
        <div class="url-group">
            <button class="btn copy-btn" data-url="${url}"><i class="material-icons">content_copy</i> URLをコピー</button>
            <button class="btn open-btn" data-url="${url}"><i class="material-icons">open_in_new</i> Google Mapsで開く</button>
        </div>
    `;

    // コピーと開くボタンのイベントリスナーを追加
    resultSection.querySelector('.copy-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(url)
            .then(() => alert('URLをクリップボードにコピーしました。'))
            .catch(err => console.error('URLのコピーに失敗しました:', err));
    });

    resultSection.querySelector('.open-btn').addEventListener('click', () => {
        window.open(url, '_blank');
    });
}