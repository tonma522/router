let map;
let directionsService;
let directionsRenderer1;
let directionsRenderer2;

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 35.1815, lng: 136.9066 },  // 名古屋市の中心付近
        zoom: 12
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer1 = new google.maps.DirectionsRenderer({
        map: map,
        polylineOptions: {
            strokeColor: "blue"
        }
    });
    directionsRenderer2 = new google.maps.DirectionsRenderer({
        map: map,
        polylineOptions: {
            strokeColor: "red"
        }
    });
}

function updateMap(route1, route2, options) {
    if (!map || !directionsService || !directionsRenderer1 || !directionsRenderer2) {
        console.error('Map or directions not initialized');
        return;
    }

    // 既存のルートをクリア
    directionsRenderer1.setMap(null);
    directionsRenderer2.setMap(null);

    directionsRenderer1.setMap(map);
    if (route2 && route2.length > 0) {
        directionsRenderer2.setMap(map);
    }

    const routeOptions = {
        avoidHighways: !options.useHighways,
        avoidTolls: options.avoidTolls,
        avoidFerries: options.avoidFerries,
        optimizeWaypoints: options.optimizeRoute
    };

    // ルート1の表示
    if (route1 && route1.length > 1) {
        const request1 = {
            origin: new google.maps.LatLng(route1[0].lat, route1[0].lng),
            destination: new google.maps.LatLng(route1[route1.length - 1].lat, route1[route1.length - 1].lng),
            waypoints: route1.slice(1, -1).map(point => ({location: new google.maps.LatLng(point.lat, point.lng), stopover: true})),
            travelMode: 'DRIVING',
            ...routeOptions
        };

        directionsService.route(request1, (result, status) => {
            if (status === 'OK') {
                directionsRenderer1.setDirections(result);
            } else {
                console.error('Directions request failed due to ' + status);
            }
        });
    }

    // ルート2の表示（複数配送モードの場合のみ）
    if (route2 && route2.length > 1) {
        const request2 = {
            origin: new google.maps.LatLng(route2[0].lat, route2[0].lng),
            destination: new google.maps.LatLng(route2[route2.length - 1].lat, route2[route2.length - 1].lng),
            waypoints: route2.slice(1, -1).map(point => ({location: new google.maps.LatLng(point.lat, point.lng), stopover: true})),
            travelMode: 'DRIVING',
            ...routeOptions
        };

        directionsService.route(request2, (result, status) => {
            if (status === 'OK') {
                directionsRenderer2.setDirections(result);
            } else {
                console.error('Directions request failed due to ' + status);
            }
        });
    }

    // マップの表示範囲を調整
    const bounds = new google.maps.LatLngBounds();
    route1.concat(route2 || []).forEach(point => bounds.extend(new google.maps.LatLng(point.lat, point.lng)));
    map.fitBounds(bounds);
}

function loadGoogleMapsAPI() {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${config.googleMapsApiKey}&callback=initMap`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
}