(function(){
    'use strict';
    
    let currentApiToken = '';
    let selectedDomains = [];
    
    // Создаем основную модалку
    function createRemoteModal() {
        if (document.getElementById('remoteModal')) {
            document.getElementById('remoteModal').classList.remove('hidden');
            return;
        }
        
        const modal = document.createElement('div');
        modal.id = 'remoteModal';
        modal.className = 'rc-modal-backdrop';
        modal.innerHTML = `
            <div class="rc-modal">
                <div class="rc-modal-header">
                    <h3>🌐 Управление удаленными сайтами</h3>
                    <button class="rc-close">&times;</button>
                </div>
                <div class="rc-modal-body">
                    <!-- Вкладки -->
                    <div class="rc-tabs">
                        <button class="rc-tab active" data-tab="sites">Сайты</button>
                        <button class="rc-tab" data-tab="files">Замена файлов</button>
                        <button class="rc-tab" data-tab="links">Замена ссылок</button>
                        <button class="rc-tab" data-tab="history">История</button>
                    </div>
                    
                    <!-- Контент вкладок -->
                    <div class="rc-tab-content" id="tab-sites">
                        <div class="rc-section">
                            <h4>API токен для удаленного управления:</h4>
                            <div class="rc-token-group">
                                <input type="text" id="rcApiToken" readonly>
                                <button class="rc-btn" id="copyTokenBtn">📋 Копировать</button>
                                <button class="rc-btn danger" id="regenerateTokenBtn">🔄 Новый токен</button>
                            </div>
                            <small style="color: #6b7280;">Этот токен нужно указать при экспорте сайта</small>
                        </div>
                        
                        <div class="rc-section">
                            <h4>Добавить сайт:</h4>
                            <div class="rc-add-site">
                                <input type="text" id="rcNewDomain" placeholder="example.com">
                                <input type="text" id="rcNewSiteName" placeholder="Название сайта">
                                <button class="rc-btn primary" id="addSiteBtn">➕ Добавить</button>
                            </div>
                        </div>
                        
                        <div class="rc-section">
                            <h4>Зарегистрированные сайты:</h4>
                            <div id="rcSitesList" class="rc-sites-list">
                                <p style="color: #6b7280;">Загрузка...</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="rc-tab-content hidden" id="tab-files">
    <div class="rc-section">
        <h4>Выберите сайты для работы с файлами:</h4>
        <div id="rcFileSitesList" class="rc-sites-checkboxes">
            <p style="color: #6b7280;">Нет доступных сайтов</p>
        </div>
    </div>
    
    <div class="rc-section">
        <button class="rc-btn primary" id="showAllFilesBtn" style="width: 100%;">📂 Показать все файлы на выбранных сайтах</button>
    </div>
    
    <div class="rc-section">
        <h4>Или найти конкретный файл:</h4>
        <div style="display: flex; gap: 8px;">
            <input type="text" id="rcFindFile" placeholder="/assets/uploads/document.pdf" style="flex: 1;">
            <button class="rc-btn" id="searchFilesBtn">🔍 Найти</button>
        </div>
    </div>
    
    <div id="rcAllFilesList" class="rc-results" style="display: none;"></div>
                        
                        <div id="rcFileResults" class="rc-results"></div>
                        
                        <div class="rc-section hidden" id="rcReplaceFileSection">
                            <h4>Заменить на новый файл:</h4>
                            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                                <input type="file" id="rcNewFile" style="flex: 1;">
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <input type="text" id="rcNewFileUrl" placeholder="Или укажите URL файла" style="flex: 1;">
                                <button class="rc-btn primary" id="replaceFileBtn">🔄 Заменить файл</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="rc-tab-content hidden" id="tab-links">
    <div class="rc-section">
        <h4>Выберите сайты для работы со ссылками:</h4>
        <div id="rcLinkSitesList" class="rc-sites-checkboxes">
            <p style="color: #6b7280;">Нет доступных сайтов</p>
        </div>
    </div>
    
    <div class="rc-section">
        <button class="rc-btn primary" id="showAllLinksBtn" style="width: 100%;">🔗 Показать все ссылки на выбранных сайтах</button>
    </div>
    
    <div id="rcAllLinksList" class="rc-results" style="display: none;"></div>
    
    <div class="rc-section">
        <h4>Или введите ссылки вручную:</h4>
                            <div style="margin-bottom: 12px;">
                                <label style="color: #9ca3af;">Старая ссылка:</label>
                                <input type="text" id="rcOldLink" placeholder="https://old-site.com" style="width: 100%;">
                            </div>
                            <div style="margin-bottom: 12px;">
                                <label style="color: #9ca3af;">Новая ссылка:</label>
                                <input type="text" id="rcNewLink" placeholder="https://new-site.com" style="width: 100%;">
                            </div>
                            <button class="rc-btn primary" id="replaceLinkBtn">🔄 Заменить ссылки</button>
                        </div>
                        
                        <div id="rcLinkResults" class="rc-results"></div>
                    </div>
                    
                    <div class="rc-tab-content hidden" id="tab-history">
                        <div class="rc-section">
                            <div class="rc-history-controls">
                                <button class="rc-btn" id="refreshHistoryBtn">🔄 Обновить</button>
                                <button class="rc-btn danger" id="clearHistoryBtn">🗑️ Очистить старые (>30 дней)</button>
                            </div>
                            <div id="rcHistoryList" class="rc-history">
                                <p style="color: #6b7280;">Загрузка истории...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Привязываем обработчики событий
        bindEventHandlers();
        
        // Загружаем данные
        loadApiToken();
        loadSites();
    }
    
    // Привязка обработчиков событий
    function bindEventHandlers() {
        // Закрытие модалки
        document.querySelector('#remoteModal .rc-close').addEventListener('click', closeRemoteModal);
        document.getElementById('remoteModal').addEventListener('click', function(e) {
            if (e.target === this) closeRemoteModal();
        });
        
        // Переключение вкладок
        document.querySelectorAll('#remoteModal .rc-tab').forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.tab));
        });
        
        // Кнопки на вкладке "Сайты"
        document.getElementById('copyTokenBtn').addEventListener('click', copyApiToken);
        document.getElementById('regenerateTokenBtn').addEventListener('click', regenerateToken);
        document.getElementById('addSiteBtn').addEventListener('click', addRemoteSite);
        
        // Кнопки на вкладке "Файлы"
        document.getElementById('searchFilesBtn').addEventListener('click', searchRemoteFiles);
        document.getElementById('replaceFileBtn').addEventListener('click', replaceRemoteFile);
        
        // Кнопки на вкладке "Ссылки"
        document.getElementById('replaceLinkBtn').addEventListener('click', replaceRemoteLinks);
        
        // Кнопки на вкладке "История"
        document.getElementById('refreshHistoryBtn').addEventListener('click', loadHistory);
        document.getElementById('clearHistoryBtn').addEventListener('click', clearOldHistory);
        
        // Стилизация input file
        document.getElementById('rcNewFile').addEventListener('change', function(e) {
            if (e.target.files.length > 0) {
                document.getElementById('rcNewFileUrl').value = '';
                document.getElementById('rcNewFileUrl').disabled = true;
            } else {
                document.getElementById('rcNewFileUrl').disabled = false;
            }
        });
    }
    
    // Переключение вкладок
    function switchTab(tabName) {
        // Переключаем активную вкладку
        document.querySelectorAll('#remoteModal .rc-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        // Показываем нужный контент
        document.querySelectorAll('#remoteModal .rc-tab-content').forEach(content => {
            const contentId = 'tab-' + tabName;
            content.classList.toggle('hidden', content.id !== contentId);
        });
        
        // Загружаем данные для вкладки при необходимости
        if (tabName === 'history') {
            loadHistory();
        }
    }
    
    // Закрытие модалки
    function closeRemoteModal() {
        const modal = document.getElementById('remoteModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    // Загрузка API токена
    async function loadApiToken() {
        try {
            const response = await fetch('/editor/modules/remote-control/api.php?action=getApiToken');
            const data = await response.json();
            if (data.ok) {
                currentApiToken = data.token;
                document.getElementById('rcApiToken').value = data.token;
            }
        } catch (e) {
            console.error('Error loading API token:', e);
        }
    }
    
    // Копирование токена
    async function copyApiToken() {
        const tokenInput = document.getElementById('rcApiToken');
        const btn = document.getElementById('copyTokenBtn');
        
        try {
            await navigator.clipboard.writeText(tokenInput.value);
            btn.textContent = '✓ Скопировано';
            btn.style.background = '#10b981';
            setTimeout(() => {
                btn.textContent = '📋 Копировать';
                btn.style.background = '';
            }, 2000);
        } catch (err) {
            // Fallback для старых браузеров
            tokenInput.select();
            document.execCommand('copy');
            btn.textContent = '✓ Скопировано';
            setTimeout(() => {
                btn.textContent = '📋 Копировать';
            }, 2000);
        }
    }
    
    // Генерация нового токена
    async function regenerateToken() {
        if (!confirm('Вы уверены? Старый токен перестанет работать!')) return;
        
        try {
            const fd = new FormData();
            fd.append('action', 'regenerateToken');
            
            const response = await fetch('/editor/modules/remote-control/api.php', {
                method: 'POST',
                body: fd
            });
            
            const data = await response.json();
            if (data.ok) {
                currentApiToken = data.token;
                document.getElementById('rcApiToken').value = data.token;
                alert('Новый токен сгенерирован! Не забудьте обновить его на всех сайтах.');
            }
        } catch (e) {
            alert('Ошибка генерации токена');
        }
    }
    
    // Загрузка списка сайтов
    async function loadSites() {
        try {
            const response = await fetch('/editor/modules/remote-control/api.php?action=getSites');
            const data = await response.json();
            
            if (data.ok) {
                renderSitesList(data.sites);
                renderSitesCheckboxes(data.sites);
            }
        } catch (e) {
            console.error('Error loading sites:', e);
        }
    }
    
    // Отображение списка сайтов
    function renderSitesList(sites) {
        const container = document.getElementById('rcSitesList');
        
        if (!sites || sites.length === 0) {
            container.innerHTML = '<p style="color: #6b7280;">Нет добавленных сайтов</p>';
            return;
        }
        
        container.innerHTML = sites.map(site => `
            <div class="rc-site-item" data-id="${site.id}" data-domain="${site.domain}">
                <div class="rc-site-info">
                    <strong>${site.site_name || site.domain}</strong>
                    <span>${site.domain}</span>
                    <small>Последняя проверка: ${site.last_check || 'никогда'}</small>
                </div>
                <div class="rc-site-actions">
                    <button class="rc-btn small" onclick="window.rcCheckSite('${site.domain}')">🔌 Проверить</button>
                    <button class="rc-btn small danger" onclick="window.rcDeleteSite(${site.id})">❌ Удалить</button>
                </div>
            </div>
        `).join('');
    }
    
    // Отображение чекбоксов для выбора сайтов
    function renderSitesCheckboxes(sites) {
        const filesList = document.getElementById('rcFileSitesList');
        const linksList = document.getElementById('rcLinkSitesList');
        
        if (!sites || sites.length === 0) {
            const msg = '<p style="color: #6b7280;">Нет доступных сайтов</p>';
            filesList.innerHTML = msg;
            linksList.innerHTML = msg;
            return;
        }
        
        const checkboxesHtml = sites.map(site => `
            <label class="rc-checkbox-item">
                <input type="checkbox" value="${site.domain}" onchange="window.rcUpdateSelectedDomains(this)">
                <span>${site.site_name || site.domain} (${site.domain})</span>
            </label>
        `).join('');
        
        filesList.innerHTML = checkboxesHtml;
        linksList.innerHTML = checkboxesHtml.replace(/rcUpdateSelectedDomains/g, 'rcUpdateSelectedDomainsLinks');
    }
    
    // Добавление нового сайта
    async function addRemoteSite() {
        const domain = document.getElementById('rcNewDomain').value.trim();
        const name = document.getElementById('rcNewSiteName').value.trim() || domain;
        
        if (!domain) {
            alert('Укажите домен сайта');
            return;
        }
        
        try {
            const fd = new FormData();
            fd.append('action', 'addSite');
            fd.append('domain', domain);
            fd.append('name', name);
            
            const response = await fetch('/editor/modules/remote-control/api.php', {
                method: 'POST',
                body: fd
            });
            
            const data = await response.json();
            if (data.ok) {
                document.getElementById('rcNewDomain').value = '';
                document.getElementById('rcNewSiteName').value = '';
                await loadSites();
                alert('Сайт добавлен! При экспорте используйте токен:\n' + currentApiToken);
            } else {
                alert(data.error || 'Ошибка добавления сайта');
            }
        } catch (e) {
            alert('Ошибка добавления сайта');
        }
    }
    
    // Проверка соединения с сайтом
    window.rcCheckSite = async function(domain) {
        const btn = event.target;
        btn.disabled = true;
        btn.textContent = '⏳ Проверка...';
        
        try {
            const fd = new FormData();
            fd.append('action', 'checkConnection');
            fd.append('domain', domain);
            
            const response = await fetch('/editor/modules/remote-control/api.php', {
                method: 'POST',
                body: fd
            });
            
            const data = await response.json();
            if (data.ok) {
                btn.textContent = '✅ Доступен';
                setTimeout(() => {
                    btn.textContent = '🔌 Проверить';
                    btn.disabled = false;
                }, 2000);
            } else {
                alert('❌ ' + data.error);
                btn.textContent = '🔌 Проверить';
                btn.disabled = false;
            }
        } catch (e) {
            alert('Ошибка проверки');
            btn.textContent = '🔌 Проверить';
            btn.disabled = false;
        }
    };
    
    // Удаление сайта
    window.rcDeleteSite = async function(id) {
        if (!confirm('Удалить сайт из списка?')) return;
        
        try {
            const fd = new FormData();
            fd.append('action', 'deleteSite');
            fd.append('id', id);
            
            const response = await fetch('/editor/modules/remote-control/api.php', {
                method: 'POST',
                body: fd
            });
            
            const data = await response.json();
            if (data.ok) {
                await loadSites();
            }
        } catch (e) {
            alert('Ошибка удаления');
        }
    };
    
    // Обновление выбранных доменов для файлов
    window.rcUpdateSelectedDomains = function(checkbox) {
        selectedDomains = [];
        document.querySelectorAll('#rcFileSitesList input:checked').forEach(cb => {
            selectedDomains.push(cb.value);
        });
    };
    
    // Обновление выбранных доменов для ссылок
    window.rcUpdateSelectedDomainsLinks = function(checkbox) {
        selectedDomains = [];
        document.querySelectorAll('#rcLinkSitesList input:checked').forEach(cb => {
            selectedDomains.push(cb.value);
        });
    };
    
    // Поиск файлов
    async function searchRemoteFiles() {
        const fileUrl = document.getElementById('rcFindFile').value.trim();
        if (!fileUrl) {
            alert('Укажите URL файла для поиска');
            return;
        }
        
        if (selectedDomains.length === 0) {
            alert('Выберите хотя бы один сайт');
            return;
        }
        
        const btn = document.getElementById('searchFilesBtn');
        btn.disabled = true;
        btn.textContent = '⏳ Поиск...';
        
        try {
            const fd = new FormData();
            fd.append('action', 'searchFiles');
            fd.append('domains', JSON.stringify(selectedDomains));
            fd.append('fileUrl', fileUrl);
            
            const response = await fetch('/editor/modules/remote-control/api.php', {
                method: 'POST',
                body: fd
            });
            
            const data = await response.json();
            if (data.ok) {
                displayFileResults(data.results);
            }
        } catch (e) {
            alert('Ошибка поиска');
        } finally {
            btn.disabled = false;
            btn.textContent = '🔍 Найти';
        }
    }
    
    // Отображение результатов поиска файлов
    function displayFileResults(results) {
        const container = document.getElementById('rcFileResults');
        let html = '<h4>Результаты поиска:</h4>';
        let foundCount = 0;
        
        for (const [domain, result] of Object.entries(results)) {
            if (result.error) {
                html += `<div class="rc-result-item error">❌ ${domain}: ${result.error}</div>`;
            } else if (Array.isArray(result) && result.length > 0) {
                foundCount += result.length;
                html += `<div class="rc-result-item success">✅ ${domain}: найдено ${result.length} страниц</div>`;
                result.forEach(page => {
                    html += `<div class="rc-result-detail">• ${page}</div>`;
                });
            } else {
                html += `<div class="rc-result-item">⚠️ ${domain}: файл не найден</div>`;
            }
        }
        
        container.innerHTML = html;
        
        if (foundCount > 0) {
            document.getElementById('rcReplaceFileSection').classList.remove('hidden');
        } else {
            document.getElementById('rcReplaceFileSection').classList.add('hidden');
        }
    }
    
    // Замена файла
    async function replaceRemoteFile() {
        const oldUrl = document.getElementById('rcFindFile').value.trim();
        const fileInput = document.getElementById('rcNewFile');
        const urlInput = document.getElementById('rcNewFileUrl').value.trim();
        
        if (!oldUrl) {
            alert('Сначала найдите файл для замены');
            return;
        }
        
        let newUrl = urlInput;
        let fileName = '';
        
        // Если выбран локальный файл, загружаем его
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            fileName = file.name;
            
            // Загружаем файл на сервер
            const uploadFd = new FormData();
            uploadFd.append('file', file);
            uploadFd.append('type', 'file');
            
            try {
                const uploadResponse = await fetch('/editor/api.php?action=uploadAsset&type=file', {
                    method: 'POST',
                    body: uploadFd
                });
                
                const uploadData = await uploadResponse.json();
                if (uploadData.ok) {
                    newUrl = uploadData.url;
                } else {
                    alert('Ошибка загрузки файла');
                    return;
                }
            } catch (e) {
                alert('Ошибка загрузки файла');
                return;
            }
        }
        
        if (!newUrl) {
            alert('Выберите файл или укажите URL');
            return;
        }
        
        if (!confirm(`Заменить файл\n${oldUrl}\nна\n${newUrl}\nна ${selectedDomains.length} сайтах?`)) {
            return;
        }
        
        const btn = document.getElementById('replaceFileBtn');
        btn.disabled = true;
        btn.textContent = '⏳ Замена...';
        
        try {
            const fd = new FormData();
            fd.append('action', 'replaceFile');
            fd.append('domains', JSON.stringify(selectedDomains));
            fd.append('oldUrl', oldUrl);
            fd.append('newUrl', newUrl);
            fd.append('fileName', fileName);
            
            const response = await fetch('/editor/modules/remote-control/api.php', {
                method: 'POST',
                body: fd
            });
            
            const data = await response.json();
            if (data.ok) {
                displayReplaceResults(data.results);
                // Очищаем форму
                document.getElementById('rcFindFile').value = '';
                document.getElementById('rcNewFile').value = '';
                document.getElementById('rcNewFileUrl').value = '';
                document.getElementById('rcReplaceFileSection').classList.add('hidden');
            }
        } catch (e) {
            alert('Ошибка замены');
        } finally {
            btn.disabled = false;
            btn.textContent = '🔄 Заменить файл';
        }
    }
    
    // Замена ссылок
    async function replaceRemoteLinks() {
        const oldUrl = document.getElementById('rcOldLink').value.trim();
        const newUrl = document.getElementById('rcNewLink').value.trim();
        
        if (!oldUrl || !newUrl) {
            alert('Укажите старую и новую ссылки');
            return;
        }
        
        if (selectedDomains.length === 0) {
            alert('Выберите хотя бы один сайт');
            return;
        }
        
        if (!confirm(`Заменить ссылку\n${oldUrl}\nна\n${newUrl}\nна ${selectedDomains.length} сайтах?`)) {
            return;
        }
        
        const btn = document.getElementById('replaceLinkBtn');
        btn.disabled = true;
        btn.textContent = '⏳ Замена...';
        
        try {
            const fd = new FormData();
            fd.append('action', 'replaceLink');
            fd.append('domains', JSON.stringify(selectedDomains));
            fd.append('oldUrl', oldUrl);
            fd.append('newUrl', newUrl);
            
            const response = await fetch('/editor/modules/remote-control/api.php', {
                method: 'POST',
                body: fd
            });
            
            const data = await response.json();
            if (data.ok) {
                displayReplaceResults(data.results, 'rcLinkResults');
                // Очищаем форму
                document.getElementById('rcOldLink').value = '';
                document.getElementById('rcNewLink').value = '';
            }
        } catch (e) {
            alert('Ошибка замены');
        } finally {
            btn.disabled = false;
            btn.textContent = '🔄 Заменить ссылки';
        }
    }
    
    // Отображение результатов замены
    function displayReplaceResults(results, containerId = 'rcFileResults') {
        const container = document.getElementById(containerId);
        let html = '<h4>Результаты замены:</h4>';
        
        for (const [domain, result] of Object.entries(results)) {
            if (result.success) {
                html += `<div class="rc-result-item success">✅ ${domain}: ${result.message || 'Успешно'} (заменено: ${result.replaced || 0})</div>`;
            } else {
                html += `<div class="rc-result-item error">❌ ${domain}: ${result.message || 'Ошибка'}</div>`;
            }
        }
        
        container.innerHTML = html;
    }
    
    // Загрузка истории
    async function loadHistory() {
        try {
            const response = await fetch('/editor/modules/remote-control/api.php?action=getHistory&limit=100');
            const data = await response.json();
            
            if (data.ok) {
                renderHistory(data.history);
            }
        } catch (e) {
            console.error('Error loading history:', e);
        }
    }
    
    // Отображение истории
    function renderHistory(history) {
        const container = document.getElementById('rcHistoryList');
        
        if (!history || history.length === 0) {
            container.innerHTML = '<p style="color: #6b7280;">История пуста</p>';
            return;
        }
        
        container.innerHTML = history.map(item => {
            const statusIcon = item.status === 'success' ? '✅' : '❌';
            const typeIcon = item.change_type === 'file' ? '📄' : '🔗';
            
            return `
                <div class="rc-history-item ${item.status}">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <strong>${statusIcon} ${typeIcon} ${item.domain}</strong>
                        <small>${new Date(item.created_at).toLocaleString()}</small>
                    </div>
                    <div style="color: #9ca3af; font-size: 13px;">
                        ${item.old_value} → ${item.new_value}
                        ${item.error_message ? '<br>Ошибка: ' + item.error_message : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Очистка старой истории
    async function clearOldHistory() {
        if (!confirm('Удалить записи старше 30 дней?')) return;
        
        try {
            const fd = new FormData();
            fd.append('action', 'clearHistory');
            fd.append('days', '30');
            
            const response = await fetch('/editor/modules/remote-control/api.php', {
                method: 'POST',
                body: fd
            });
            
            const data = await response.json();
            if (data.ok) {
                await loadHistory();
                alert('История очищена');
            }
        } catch (e) {
            alert('Ошибка очистки истории');
        }
    }
    
    // Открытие модалки (экспортируемая функция)
    window.openRemoteModal = function() {
        createRemoteModal();
    };
    
    // Автоматическое открытие если есть кнопка
    const btn = document.getElementById('btnRemoteSites');
    if (btn) {
        btn.addEventListener('click', function() {
            window.openRemoteModal();
        });
    }
})();