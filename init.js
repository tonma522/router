document.addEventListener('DOMContentLoaded', () => {
    const addressInputs = document.getElementById('addressInputs');
    const addAddressButton = document.getElementById('addAddress');
    const generateRouteButton = document.getElementById('generateRoute');
    const copyUrlButton = document.getElementById('copyUrl');
    const autoFillButton = document.getElementById('autoFill');
    const openUrlButton = document.getElementById('openUrl');
    const avoidHighwaysCheckbox = document.getElementById('avoidHighways');
    const startLocationSelect = document.getElementById('startLocation');
    const endLocationSelect = document.getElementById('endLocation');
    const useHighwaysCheckbox = document.getElementById('useHighways');
    const avoidTollsCheckbox = document.getElementById('avoidTolls');
    const avoidFerriesCheckbox = document.getElementById('avoidFerries');
    const optimizeRouteCheckbox = document.getElementById('optimizeRoute');

    // デフォルトで高速道路と有料道路を使用しない設定
    useHighwaysCheckbox.checked = false;
    avoidTollsCheckbox.checked = true;

    const options = {
        useHighwaysCheckbox,
        avoidTollsCheckbox,
        avoidFerriesCheckbox,
        optimizeRoute: optimizeRouteCheckbox
    };

    addAddressButton.addEventListener('click', addAddressInput);
    generateRouteButton.addEventListener('click', async () => {
        try {
            await generateRoute();
        } catch (error) {
            console.error('Error generating route:', error);
            alert('ルートの生成中にエラーが発生しました。');
        }
    });
    copyUrlButton.addEventListener('click', copyUrl);
    autoFillButton.addEventListener('click', autoFillAddresses);
    addressInputs.addEventListener('click', handleAddressInputClick);
    openUrlButton.addEventListener('click', openGeneratedUrl);

    // Google Maps APIの読み込み
    loadGoogleMapsAPI();

    // 初期状態を設定
    document.getElementById('result').style.display = 'none';

    const singleModeBtn = document.getElementById('singleModeBtn');
    const multiModeBtn = document.getElementById('multiModeBtn');
    const singleDeliveryResult = document.getElementById('singleDeliveryResult');
    const multiDeliveryResult = document.getElementById('multiDeliveryResult');

    let currentMode = 'single';

    function updateModeUI(mode) {
        if (mode === 'single') {
            singleModeBtn.classList.add('active');
            multiModeBtn.classList.remove('active');
            generateRouteButton.textContent = '配送ルートを生成';
            singleDeliveryResult.style.display = 'block';
            multiDeliveryResult.style.display = 'none';
        } else {
            singleModeBtn.classList.remove('active');
            multiModeBtn.classList.add('active');
            generateRouteButton.textContent = '複数配送ルートを生成';
            singleDeliveryResult.style.display = 'none';
            multiDeliveryResult.style.display = 'block';
        }
        // ルート情報をリセット
        resetRouteInfo();
    }

    function resetRouteInfo() {
        // マップをクリア
        if (directionsRenderer1) directionsRenderer1.setMap(null);
        if (directionsRenderer2) directionsRenderer2.setMap(null);
        if (map) map.setCenter({ lat: 35.1815, lng: 136.9066 }); // 名古屋市の中心付近

        // ルート情報表示をクリア
        document.getElementById('routeInfo').innerHTML = '';
        document.getElementById('routeInfo1').innerHTML = '';
        document.getElementById('routeInfo2').innerHTML = '';

        // 結果セクションを非表示
        document.getElementById('result').style.display = 'none';

        // 生成されたURLをリセット
        window.generatedUrl = '';
    }

    singleModeBtn.addEventListener('click', () => {
        if (currentMode !== 'single') {
            currentMode = 'single';
            updateModeUI(currentMode);
        }
    });

    multiModeBtn.addEventListener('click', () => {
        if (currentMode !== 'multi') {
            currentMode = 'multi';
            updateModeUI(currentMode);
        }
    });

    async function generateRoute() {
        if (currentMode === 'single') {
            generateSingleRoute();
        } else {
            await generateMultiRoute();
        }
    }

    function getRouteOptions() {
        return {
            useHighways: useHighwaysCheckbox.checked,
            avoidTolls: avoidTollsCheckbox.checked,
            avoidFerries: avoidFerriesCheckbox.checked,
            optimizeRoute: optimizeRouteCheckbox.checked
        };
    }

    async function generateSingleRoute() {
        const addresses = getAddresses();
        const startLocation = startLocationSelect.value;
        const endLocation = endLocationSelect.value;

        try {
            // 住所を緯度経度に変換
            const [startCoord, endCoord, waypoints] = await Promise.all([
                getCoordinatesForAddress(startLocation),
                getCoordinatesForAddress(endLocation),
                getCoordinatesForAddresses(addresses.map(a => a.address))
            ]);

            // addressプロパティとdeliveryTimeプロパティを追加
            startCoord.address = startLocation;
            startCoord.deliveryTime = 0;
            endCoord.address = endLocation;
            endCoord.deliveryTime = 0;
            waypoints.forEach((point, index) => {
                point.address = addresses[index].address;
                point.deliveryTime = addresses[index].deliveryTime;
            });

            const route = [startCoord, ...waypoints, endCoord];

            const routeOptions = getRouteOptions();
            
            // マップの更新
            updateMap(route, [], routeOptions);

            // 経路情報の取得と表示
            const routeInfo = await getRouteInfo(route);
            await displayRouteInfo(route, 'routeInfo', routeInfo);

            // Google Maps URLの生成
            const url = generateGoogleMapsUrl(route);
            window.generatedUrl = url;

            // 結果セクションを表示
            document.getElementById('result').style.display = 'block';

            // 一人配送モードの結果を表示
            singleDeliveryResult.style.display = 'block';
            multiDeliveryResult.style.display = 'none';

            // URLをコピーボタンとGoogle Mapsで開くボタンを設定
            const copyUrlButton = document.getElementById('copyUrl');
            const openUrlButton = document.getElementById('openUrl');
            copyUrlButton.onclick = () => copyToClipboard(url);
            openUrlButton.onclick = () => window.open(url, '_blank');
        } catch (error) {
            console.error('Error generating single delivery route:', error);
            alert('ルートの生成中にエラーが発生しました。');
        }
    }

    async function generateMultiRoute() {
        // 複数配送ルート生成ロジック
        const addresses = getAddresses();
        const startLocation = startLocationSelect.value;
        const endLocation = endLocationSelect.value;

        try {
            // 住所を緯度経度に変換
            const [startCoord, endCoord, waypoints] = await Promise.all([
                getCoordinatesForAddress(startLocation),
                getCoordinatesForAddress(endLocation),
                getCoordinatesForAddresses(addresses.map(a => a.address))
            ]);

            // addressプロパティとdeliveryTimeプロパティを追加
            startCoord.address = startLocation;
            startCoord.deliveryTime = 0;
            endCoord.address = endLocation;
            endCoord.deliveryTime = 0;
            waypoints.forEach((point, index) => {
                point.address = addresses[index].address;
                point.deliveryTime = addresses[index].deliveryTime;
            });

            const routeOptions = getRouteOptions();

            const routes = optimizeMultiDeliveryRoute(waypoints, startCoord, endCoord);
            const urls = generateMultiDeliveryUrls(routes);

            // 結果セクションを表示
            document.getElementById('result').style.display = 'block';

            // URLを表示し、ボタンにセット
            const copyUrl1 = document.getElementById('copyUrl1');
            const openUrl1 = document.getElementById('openUrl1');
            const copyUrl2 = document.getElementById('copyUrl2');
            const openUrl2 = document.getElementById('openUrl2');

            if (copyUrl1) copyUrl1.onclick = () => copyToClipboard(urls.url1);
            if (openUrl1) openUrl1.onclick = () => window.open(urls.url1, '_blank');
            if (copyUrl2) copyUrl2.onclick = () => copyToClipboard(urls.url2);
            if (openUrl2) openUrl2.onclick = () => window.open(urls.url2, '_blank');

            // マップの更新
            updateMap(routes.route1, routes.route2, routeOptions);

            // 経路情報の表示
            await displayRouteInfo(routes.route1, 'routeInfo1', await getRouteInfo(routes.route1));
            await displayRouteInfo(routes.route2, 'routeInfo2', await getRouteInfo(routes.route2));

            // 複数配送モードの結果を表示
            singleDeliveryResult.style.display = 'none';
            multiDeliveryResult.style.display = 'block';
        } catch (error) {
            console.error('Error generating multi-delivery route:', error);
            alert('ルートの生成中にエラーが発生しました。');
        }
    }

    function getAddresses() {
        const addressInputs = document.querySelectorAll('#addressInputs .address-input');
        return Array.from(addressInputs).map(input => {
            const addressInput = input.querySelector('input[type="text"]');
            const deliveryTimeInput = input.querySelector('input[type="number"]');
            return {
                address: addressInput ? addressInput.value : '',
                deliveryTime: deliveryTimeInput ? parseInt(deliveryTimeInput.value, 10) || 5 : 5
            };
        });
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            alert('URLをクリップボードにコピーしました。');
        }).catch(err => {
            console.error('クリップボードへのコピーに失敗しました:', err);
        });
    }

    function getCoordinatesForAddresses(addresses) {
        // Google Maps Geocoding APIを使用して住所を緯度経度に変換
        const geocoder = new google.maps.Geocoder();
        const promises = addresses.map(address => {
            return new Promise((resolve, reject) => {
                geocoder.geocode({ address: address }, (results, status) => {
                    if (status === 'OK') {
                        resolve({
                            lat: results[0].geometry.location.lat(),
                            lng: results[0].geometry.location.lng()
                        });
                    } else {
                        reject(new Error(`Geocoding failed for address ${address}`));
                    }
                });
            });
        });

        return Promise.all(promises);
    }

    function getCoordinatesForAddress(address) {
        return new Promise((resolve, reject) => {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ address: address }, (results, status) => {
                if (status === 'OK') {
                    resolve({
                        lat: results[0].geometry.location.lat(),
                        lng: results[0].geometry.location.lng()
                    });
                } else {
                    reject(new Error(`Geocoding failed for address ${address}`));
                }
            });
        });
    }

    async function displayRouteInfo(route, elementId, routeInfo) {
        const routeInfoElement = document.getElementById(elementId);
        if (!routeInfoElement) return;

        if (!routeInfo) {
            routeInfo = await getRouteInfo(route);
        }

        if (!routeInfo) {
            routeInfoElement.innerHTML = '<p>ルート情報の取得に失敗しました。</p>';
            return;
        }

        let routeHtml = '<h3>最適経路:</h3>';
        routeHtml += '<div class="route-cards">';

        for (let i = 0; i < route.length; i++) {
            const point = route[i];
            routeHtml += `
                <div class="route-card">
                    <div class="route-point">
                        <i class="material-icons">${i === 0 ? 'play_circle_filled' : (i === route.length - 1 ? 'flag' : 'location_on')}</i>
                        <span>${point.address}</span>
                    </div>
                `;

            if (i < route.length - 1) {
                const leg = routeInfo.legs[i];
                routeHtml += `
                    <div class="route-details">
                        <i class="material-icons">arrow_downward</i>
                        <span>${leg.distance} / ${leg.duration}（配達時間${point.deliveryTime || 5}分を含む）</span>
                    </div>
                `;
            }

            routeHtml += '</div>';
        }

        routeHtml += '</div>';
        routeHtml += `
            <div class="route-summary">
                <h4>ルート概要</h4>
                <p><i class="material-icons">straighten</i>総距離: ${routeInfo.totalDistance} km</p>
                <p><i class="material-icons">access_time</i>通常の総所要時間: ${formatDuration(routeInfo.totalDuration)}（各配達時間を含む）</p>
                <p><i class="material-icons">traffic</i>交通状況を考慮した総所要時間: ${formatDuration(routeInfo.totalDuration)}（各配達時間を含む）</p>
            </div>
        `;

        routeInfoElement.innerHTML = routeHtml;
    }

    function formatDuration(minutes) {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}時間${remainingMinutes}分`;
    }

    async function getRouteInfo(route) {
        const origins = route.slice(0, -1);
        const destinations = route.slice(1);
        try {
            const response = await getDistanceMatrix(origins, destinations);
            let totalDistance = 0;
            let totalDuration = 0;
            const legs = [];

            for (let i = 0; i < response.rows.length; i++) {
                const element = response.rows[i].elements[0];
                totalDistance += element.distance.value;
                const legDuration = element.duration.value / 60 + (route[i].deliveryTime || 5); // 走行時間（分）+ 配達時間
                totalDuration += legDuration;
                legs.push({
                    distance: element.distance.text,
                    duration: `${Math.round(legDuration)}分`, // 配達時間を含めた時間を表示
                    durationValue: legDuration
                });
            }

            return {
                totalDistance: (totalDistance / 1000).toFixed(2),
                totalDuration: Math.round(totalDuration),
                legs: legs
            };
        } catch (error) {
            console.error('Error getting route info:', error);
            return null;
        }
    }

    function getDistanceMatrix(origins, destinations) {
        return new Promise((resolve, reject) => {
            const service = new google.maps.DistanceMatrixService();
            service.getDistanceMatrix(
                {
                    origins: origins,
                    destinations: destinations,
                    travelMode: 'DRIVING',
                    unitSystem: google.maps.UnitSystem.METRIC,
                },
                (response, status) => {
                    if (status === 'OK') {
                        resolve(response);
                    } else {
                        reject(new Error('Distance Matrix request failed due to ' + status));
                    }
                }
            );
        });
    }

    function generateGoogleMapsUrl(route) {
        const origin = `${route[0].lat},${route[0].lng}`;
        const destination = `${route[route.length - 1].lat},${route[route.length - 1].lng}`;
        const waypoints = route.slice(1, -1).map(point => `${point.lat},${point.lng}`).join('|');
        return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
    }

    // その他の必要な関数をここに追加
});

function addAddressInput() {
    const addressInputs = document.getElementById('addressInputs');
    const index = addressInputs.children.length + 1;
    const addressInput = document.createElement('div');
    addressInput.className = 'address-input';
    addressInput.innerHTML = `
        <label for="address${index}">経由地${index}:</label>
        <input type="text" id="address${index}" placeholder="経由地を入力">
        <label for="deliveryTime${index}">配達時間（分）:</label>
        <input type="number" id="deliveryTime${index}" value="5" min="1" max="60">
        <button class="remove-address"><i class="material-icons">remove_circle_outline</i></button>
    `;
    addressInputs.appendChild(addressInput);
}