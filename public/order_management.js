document.addEventListener('DOMContentLoaded', function() {
    const orderManagementList = document.getElementById('orderManagementList');
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const sideMenu = document.getElementById('sideMenu');
    const overlay = document.getElementById('overlay');
    const filterButtons = document.querySelectorAll('.filter-btn');

    // !!! ここをあなたのデプロイURLに置き換えてください !!!
    const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzywAJqYxhOoaRRaukUUQI9Ti2Lkz67sBsgfiD-H0Jzks6Fdvgrsii2AtzoF_jP9buY/exec';

    let allOrders = [];
    let currentFilter = 'all';

    // GASから注文データを取得
    async function getOrdersFromGAS() {
        orderManagementList.innerHTML = '<p>注文データを読み込み中...</p>';
        try {
            const response = await fetch(`${GAS_WEB_APP_URL}?action=getOrders`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            if (result.success) {
                allOrders = result.data;
            } else {
                console.error('GASからの注文データ取得に失敗:', result.error);
                allOrders = [];
            }
        } catch (error) {
            console.error('GASへのリクエスト中にエラー:', error);
            orderManagementList.innerHTML = '<p>注文データの読み込みに失敗しました。再読み込みしてください。</p>';
            allOrders = [];
        }
    }

    // GASにステータス更新をリクエスト
    async function updateOrderStatusInGAS(uniqueId, newStatus) {
        try {
            const response = await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'updateStatus', uniqueId, newStatus }),
                mode: 'no-cors' // no-corsモードで送信
            });
            // no-corsではレスポンスの中身を確認できないため、成功したと仮定して画面を更新
            console.log('ステータス更新をリクエストしました。');
            return true;
        } catch (error) {
            console.error('ステータス更新リクエスト中にエラー:', error);
            alert('ステータスの更新に失敗しました。');
            return false;
        }
    }

    // ステータスを切り替える関数
    async function toggleStatus(uniqueId) {
        const item = allOrders.find(o => o.ID == uniqueId);
        if (!item) return;

        let newStatus;
        switch (item.ステータス) {
            case 'pending': newStatus = 'delivered'; break;
            case 'delivered': newStatus = 'cancelled'; break;
            case 'cancelled': newStatus = 'pending'; break;
            default: newStatus = 'pending';
        }

        const success = await updateOrderStatusInGAS(uniqueId, newStatus);
        if (success) {
            // 画面を即時反映
            item.ステータス = newStatus;
            displayOrders();
        }
    }

    // 注文を表示する関数
    function displayOrders() {
        orderManagementList.innerHTML = '';

        // フィルターを適用
        const filteredItems = allOrders.filter(item => {
            if (currentFilter === 'all') return true;
            // 数量が0より大きいアイテムのみ表示
            return item.ステータス === currentFilter && item.数量 > 0;
        });
        
        // 日時が新しい順にソート
        filteredItems.sort((a, b) => new Date(b.日時) - new Date(a.日時));


        if (filteredItems.length === 0) {
            orderManagementList.innerHTML = '<p>表示する注文がありません。</p>';
            return;
        }

        filteredItems.forEach(item => {
            // 数量分だけ個別の表示アイテムを作成
            for (let i = 0; i < item.数量; i++) {
                const itemElement = document.createElement('div');
                itemElement.className = `order-management-item status-${item.ステータス}`;
                itemElement.setAttribute('data-unique-id', item.ID);

                const orderDate = new Date(item.日時).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
                const tableInfo = item.テーブル番号 === 'Takeout' ? 'テイクアウト' : `テーブル: ${item.テーブル番号}`;

                itemElement.innerHTML = `
                    <div class="item-header">
                        <span class="item-time">${orderDate}</span>
                        <span class="item-table">${tableInfo}</span>
                    </div>
                    <div class="item-details">
                        <span class="item-name">${item.商品名}</span>
                        <span class="item-status-text">${getStatusText(item.ステータス)}</span>
                    </div>
                `;
                orderManagementList.appendChild(itemElement);
            }
        });

        // クリックイベントを各アイテムに設定
        document.querySelectorAll('.order-management-item').forEach(item => {
            item.addEventListener('click', function() {
                const uniqueId = this.getAttribute('data-unique-id');
                toggleStatus(uniqueId);
            });
        });
    }

    // ステータスの日本語テキストを取得
    function getStatusText(status) {
        switch (status) {
            case 'pending': return '未提供';
            case 'delivered': return '提供済み';
            case 'cancelled': return 'キャンセル';
            default: return '不明';
        }
    }

    // フィルターボタンのイベントリスナー
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            displayOrders();
        });
    });

    // ハンバーガーメニューのイベント
    hamburgerMenu.addEventListener('click', () => {
        sideMenu.classList.toggle('open');
        overlay.classList.toggle('active');
    });

    overlay.addEventListener('click', () => {
        sideMenu.classList.remove('open');
        overlay.classList.remove('active');
    });

    // 初期表示
    async function init() {
        await getOrdersFromGAS();
        displayOrders();
    }

    init();
});
