const addressKeywords = ["千種区", "東区", "北区", "西区", "中村区", "中区", "昭和区", "瑞穂区", "熱田区", "中川区", "港区", "南区", "守山区", "緑区", "名東区", "天白区", "豊橋市", "岡崎市", "一宮市", "瀬戸市", "半田市", "春日井市", "豊川市", "津島市", "碧南市", "刈谷市", "豊田市", "安城市", "西尾市", "蒲郡市", "犬山市", "常滑市", "江南市", "小牧市", "稲沢市", "新城市", "東海市", "大府市", "知多市", "知立市", "尾張旭市", "高浜市", "岩倉市", "豊明市", "日進市", "田原市", "愛西市", "清須市", "北名古屋市", "弥富市", "みよし市", "あま市", "長久手市", "東郷町", "豊山町", "大口町", "扶桑町", "大治町", "蟹江町", "飛島村", "阿久比町", "東浦町", "南知多町", "美浜町", "武豊町", "幸田町", "設楽町", "東栄町", "豊根村"];

let map;
let geocoder;
let directionsService;
let directionsRenderers = [];

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 35.1814464, lng: 136.906398},
        zoom: 12
    });
    geocoder = new google.maps.Geocoder();
    directionsService = new google.maps.DirectionsService();

    initAutocomplete();
}

function initAutocomplete() {
    const startLocationText = document.getElementById('startLocationText');
    const endLocationText = document.getElementById('endLocationText');
    
    const options = {
        types: ['address'],
        componentRestrictions: {country: 'jp'}
    };

    new google.maps.places.Autocomplete(startLocationText, options);
    new google.maps.places.Autocomplete(endLocationText, options);
}

function extractAddresses() {
    const inputText = document.getElementById('inputText').value;
    const resultsDiv = document.getElementById('results');
    const lines = inputText.split('\n');
    const addresses = [];

    const phoneRegex = /\d{2,4}-\d{2,4}-\d{4}/g;

    for (let i = 0; i < lines.length; i++) {
        addressKeywords.forEach(keyword => {
            if (lines[i].includes(keyword)) {
                const addressBlock = lines.slice(i, i + 3).join(' ');
                let cleanedAddress = addressBlock.replace(phoneRegex, '').trim();
                cleanedAddress = cleanedAddress.replace(/\s{2,}/g, ' '); // 連続��るスペースを1つにする
                addresses.push(cleanedAddress);
            }
        });
    }

    resultsDiv.innerHTML = addresses.length > 0 ? `<p>抽出された住所:</p>${addresses.map((addr, index) => `<div class="address"><input type="text" class="autocomplete" id="address${index}" value="${addr}" placeholder="住所を入力" style="width: 100%;"></div>`).join('')}` : '<p>住所が見つかりませんでした。</p>';

    initAddressAutocomplete();
}

function initAddressAutocomplete() {
    const autocompleteInputs = Array.from(document.querySelectorAll('.autocomplete'));
    const options = {
        types: ['address'],
        componentRestrictions: {country: 'jp'}
    };

    autocompleteInputs.forEach(input => {
        new google.maps.places.Autocomplete(input, options);
    });
}

async function reflectOnMap() {
    const startLocationSelect = document.getElementById('startLocation');
    const endLocationSelect = document.getElementById('endLocation');

    let startLocation = startLocationSelect.value;
    if (startLocation === '自由記述') {
        startLocation = document.getElementById('startLocationText').value;
    }

    let endLocation = endLocationSelect.value;
    if (endLocation === '自由記述') {
        endLocation = document.getElementById('endLocationText').value;
    }

    const numClusters = parseInt(document.getElementById('numClusters').value, 10);
    const addresses = Array.from(document.querySelectorAll('.address input.autocomplete')).map(input => input.value);

    if (!startLocation || !endLocation || addresses.length < 2) {
        alert("出発地、最終到着地、そして少なくとも2つの住所が必要です。");
        return;
    }

    // 住所をジオコーディングして緯度経度を取得
    const locations = await geocodeAddresses(addresses);

    // 住所をクラスタリング
    const clusters = await clusterLocations(locations, numClusters, startLocation, endLocation);

    // 各クラスターのルートをプロット
    await plotClusteredRoutes(clusters, startLocation, endLocation);

    // 配送情報を表示
    displayDeliveryInfo(clusters);
}

function geocodeAddresses(addresses) {
    const promises = addresses.map(address => new Promise((resolve, reject) => {
        geocoder.geocode({'address': address}, (results, status) => {
            if (status === 'OK') {
                resolve({
                    address: address,
                    location: results[0].geometry.location
                });
            } else {
                reject('Geocode was not successful for the following reason: ' + status);
            }
        });
    }));
    return Promise.all(promises);
}

async function clusterLocations(locations, numClusters, startLocation, endLocation) {
    const allAddresses = [startLocation, ...locations.map(loc => loc.address), endLocation];
    const allLocations = await geocodeAddresses(allAddresses);

    const clusters = Array.from({ length: numClusters }, () => []);
    let distances = Array(numClusters).fill(0);

    for (let i = 0; i < locations.length; i++) {
        let minDistance = Number.MAX_SAFE_INTEGER;
        let clusterIndex = 0;

        for (let j = 0; j < numClusters; j++) {
            const distance = await calculateDistance(locations[i].location, clusters[j].length > 0 ? clusters[j][clusters[j].length - 1].location : allLocations[0].location);
            if (distances[j] + distance < minDistance) {
                minDistance = distances[j] + distance;
                clusterIndex = j;
            }
        }

        clusters[clusterIndex].push(locations[i]);
        distances[clusterIndex] += minDistance;
    }

    return clusters;
}

function calculateDistance(location1, location2) {
    return new Promise((resolve, reject) => {
        directionsService.route({
            origin: location1,
            destination: location2,
            travelMode: google.maps.TravelMode.DRIVING
        }, (response, status) => {
            if (status === 'OK') {
                resolve(response.routes[0].legs[0].distance.value);
            } else {
                reject('Directions request failed due to ' + status);
            }
        });
    });
}

async function plotClusteredRoutes(clusters, startLocation, endLocation) {
    // 既存のルートをクリア
    directionsRenderers.forEach(renderer => renderer.setMap(null));
    directionsRenderers = [];

    const promises = clusters.map((cluster, index) => {
        const renderer = new google.maps.DirectionsRenderer({
            map: map,
            polylineOptions: {strokeColor: getColor(index)}
        });
        directionsRenderers.push(renderer);

        const addresses = [startLocation, ...cluster.map(loc => loc.address), endLocation];
        return plotAddressesOnMap(addresses, renderer);
    });

    return Promise.all(promises);
}

function plotAddressesOnMap(addresses, renderer) {
    return new Promise((resolve, reject) => {
        const waypoints = addresses.slice(1, addresses.length - 1).map(address => ({location: address, stopover: true}));
        const avoidTolls = document.getElementById('avoidTolls').checked;
        const avoidHighways = document.getElementById('avoidHighways').checked;
        const avoidFerries = document.getElementById('avoidFerries').checked;
        directionsService.route({
            origin: addresses[0],
            destination: addresses[addresses.length - 1],
            waypoints: waypoints,
            optimizeWaypoints: true,
            avoidTolls: avoidTolls,
            avoidHighways: avoidHighways,
            avoidFerries: avoidFerries,
            travelMode: google.maps.TravelMode.DRIVING,
            drivingOptions: {
                departureTime: new Date(), // 現在の日時
                trafficModel: 'bestguess' // 'bestguess' を使用
            }
        }, (response, status) => {
            if (status === 'OK') {
                renderer.setDirections(response);
                resolve(response);
            } else {
                console.log('Directions request failed due to ' + status);
                reject(status);
            }
        });
    });
}
function getColor(index) {
    const colors = ['blue', 'red', 'green', 'purple'];
    return colors[index % colors.length];
}

function displayDeliveryInfo(clusters) {
    const deliveryInfoDiv = document.getElementById('deliveryInfo');
    deliveryInfoDiv.innerHTML = '';

    clusters.forEach((cluster, index) => {
        const renderer = directionsRenderers[index];
        const route = renderer.getDirections().routes[0];

        let totalDistance = 0;
        let totalTime = 0;

        const routeInfo = route.legs.map(leg => leg.start_address + ' -> ' + leg.end_address).join('<br>');

        route.legs.forEach(leg => {
            totalDistance += leg.distance.value;
            totalTime += leg.duration_in_traffic ? leg.duration_in_traffic.value : leg.duration.value; // 渋滞を考慮した時間がない場合は通常の時間を使用
        });

        totalDistance = (totalDistance / 1000).toFixed(2); // キロメートルに変換
        totalTime = (totalTime / 60).toFixed(2); // 分に変換

        const infoHtml = `
            <h3>配送員 ${index + 1}</h3>
            <div id="deliveryInfo" class="delivery-info">
                <ol id="routeList${index}"></ol>
            </div>
            <p>配送距離: ${totalDistance} km</p>
            <p>配送時間: ${totalTime} 分</p>
        `;

        deliveryInfoDiv.innerHTML += infoHtml;
        displayRoute(route.legs, `routeList${index}`);
    });
}

function displayRoute(legs, listId) {
    const routeList = document.getElementById(listId);
    routeList.innerHTML = ''; // 既存のリストをクリア

    legs.forEach((leg, index) => {
        const listItem = document.createElement('li');
        listItem.classList.add('destination');
        listItem.textContent = `${leg.start_address} -> ${leg.end_address}`;
        routeList.appendChild(listItem);
    });
}
