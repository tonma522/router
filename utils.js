// グローバルスコープで generatedUrl を宣言
window.generatedUrl = '';

function addAddressInput() {
    const inputCount = document.querySelectorAll('.address-input').length + 1;
    const newInput = document.createElement('div');
    newInput.className = 'address-input';
    newInput.innerHTML = `
        <label for="address${inputCount}">経由地 ${inputCount}:</label>
        <input type="text" id="address${inputCount}" class="address" placeholder="住所を入力">
        <button class="move-up" aria-label="上に移動"><i class="material-icons">arrow_upward</i></button>
        <button class="move-down" aria-label="下に移動"><i class="material-icons">arrow_downward</i></button>
        <button class="remove-address" aria-label="経由地${inputCount}を削除"><i class="material-icons">delete</i></button>
    `;
    addressInputs.appendChild(newInput);
    updateMoveButtons();
}

function handleAddressInputClick(event) {
    const target = event.target.closest('button');
    if (!target) return;

    if (target.classList.contains('remove-address')) {
        target.closest('.address-input').remove();
        updateAddressLabels();
        updateMoveButtons();
    } else if (target.classList.contains('move-up')) {
        moveAddressInput(target.closest('.address-input'), 'up');
    } else if (target.classList.contains('move-down')) {
        moveAddressInput(target.closest('.address-input'), 'down');
    }
}

function moveAddressInput(addressInput, direction) {
    const sibling = direction === 'up' ? addressInput.previousElementSibling : addressInput.nextElementSibling;
    if (sibling && sibling.classList.contains('address-input')) {
        if (direction === 'up') {
            addressInputs.insertBefore(addressInput, sibling);
        } else {
            addressInputs.insertBefore(sibling, addressInput);
        }
        updateAddressLabels();
        updateMoveButtons();
    }
}

function updateMoveButtons() {
    const inputs = document.querySelectorAll('.address-input');
    inputs.forEach((input, index) => {
        const upButton = input.querySelector('.move-up');
        const downButton = input.querySelector('.move-down');
        if (upButton && downButton) {
            upButton.disabled = index === 0;
            downButton.disabled = index === inputs.length - 1;
        }
    });
}

function updateAddressLabels() {
    document.querySelectorAll('.address-input').forEach((input, index) => {
        const label = input.querySelector('label[for^="address"]');
        const addressInput = input.querySelector('input[type="text"]');
        if (label && addressInput) {
            label.textContent = `経由地 ${index + 1}:`;
            label.setAttribute('for', `address${index + 1}`);
            addressInput.id = `address${index + 1}`;
        }
    });
}

function autoFillAddresses() {
    const sampleAddresses = [
        '愛知県名古屋市千種区今池5丁目1-5',
        '愛知県名古屋市東区葵3丁目15-31',
        '愛知県名古屋市北区大曽根3丁目15-58',
        '愛知県名古屋市西区則武新町3丁目1-17',
        '愛知県名古屋市中村区名駅1丁目1-4'
    ];

    const addressInputs = document.getElementById('addressInputs');
    const addAddressButton = document.getElementById('addAddress');

    // 既存の入力欄をすべて削除
    while (addressInputs.firstChild) {
        addressInputs.removeChild(addressInputs.firstChild);
    }

    // サンプル住所の数だけ入力欄を追加し、住所を入力
    sampleAddresses.forEach((address, index) => {
        addAddressButton.click(); // 新しい入力欄を追加
        const newInput = addressInputs.lastElementChild.querySelector('input[type="text"]');
        if (newInput) {
            newInput.value = address;
        }
    });

    // 入力欄のラベルとボタンを更新
    updateAddressLabels();
    updateMoveButtons();
}

function openGeneratedUrl() {
    if (window.generatedUrl) {
        window.open(window.generatedUrl, '_blank');
    } else {
        alert('URLが生成されていません。まず経路を計算してください。');
    }
}