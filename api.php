<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Token, X-Action, X-File-Url, X-Old-Url, X-New-Url, X-File-Name');

// Обработка preflight запросов
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$db = dirname(dirname(dirname(__DIR__))) . '/data/zerro_blog.db';

try {
    $pdo = new PDO('sqlite:' . $db);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die(json_encode(['ok' => false, 'error' => 'Database connection failed']));
}

$action = $_REQUEST['action'] ?? '';

switch($action) {
    case 'getApiToken':
        $token = $pdo->query("SELECT value FROM remote_api_settings WHERE key='api_token'")->fetchColumn();
        
        if (!$token) {
            // Генерируем новый токен если его нет
            $token = bin2hex(random_bytes(32));
            $pdo->prepare("INSERT OR REPLACE INTO remote_api_settings (key, value) VALUES ('api_token', ?)")
                ->execute([$token]);
        }
        
        echo json_encode(['ok' => true, 'token' => $token]);
        break;
        
    case 'saveToken':
        $token = $_POST['token'] ?? '';
        if ($token) {
            $pdo->prepare("INSERT OR REPLACE INTO remote_api_settings (key, value) VALUES ('api_token', ?)")
                ->execute([$token]);
            echo json_encode(['ok' => true]);
        } else {
            echo json_encode(['ok' => false, 'error' => 'Token required']);
        }
        break;
        
    case 'regenerateToken':
        $token = bin2hex(random_bytes(32));
        $pdo->prepare("INSERT OR REPLACE INTO remote_api_settings (key, value) VALUES ('api_token', ?)")
            ->execute([$token]);
        echo json_encode(['ok' => true, 'token' => $token]);
        break;
        
    case 'register':
        // Автоматическая регистрация сайта при первом подключении
        $domain = $_POST['domain'] ?? '';
        $token = $_POST['token'] ?? '';
        
        if (!$domain || !$token) {
            echo json_encode(['ok' => false, 'error' => 'Domain and token required']);
            break;
        }
        
        // Проверяем токен
        $storedToken = $pdo->query("SELECT value FROM remote_api_settings WHERE key='api_token'")->fetchColumn();
        if ($token !== $storedToken) {
            echo json_encode(['ok' => false, 'error' => 'Invalid token']);
            break;
        }
        
        // Регистрируем или обновляем сайт
        try {
            $pdo->prepare("INSERT OR REPLACE INTO remote_sites (domain, api_token, site_name, last_check) 
                          VALUES (?, ?, ?, CURRENT_TIMESTAMP)")
                ->execute([$domain, $token, $domain]);
            echo json_encode(['ok' => true, 'message' => 'Site registered']);
        } catch (Exception $e) {
            echo json_encode(['ok' => true, 'message' => 'Site already registered']);
        }
        break;
        
    case 'addSite':
    $domain = trim($_POST['domain'] ?? '');
    $name = trim($_POST['name'] ?? $domain);
    
    if (!$domain) {
        echo json_encode(['ok' => false, 'error' => 'Укажите домен']);
        break;
    }
    
    // Нормализуем домен
    $domain = str_replace(['http://', 'https://', '/'], '', $domain);
    
    try {
        $token = $pdo->query("SELECT value FROM remote_api_settings WHERE key='api_token'")->fetchColumn();
        if (!$token) {
            $token = bin2hex(random_bytes(32));
            $pdo->prepare("INSERT INTO remote_api_settings (key, value) VALUES ('api_token', ?)")
                ->execute([$token]);
        }
        
        // Проверяем, есть ли удаленный домен с таким именем
        $existing = $pdo->prepare("SELECT id FROM remote_sites WHERE domain = ? AND status = 'deleted'");
        $existing->execute([$domain]);
        $deletedSite = $existing->fetch();
        
        if ($deletedSite) {
            // Восстанавливаем удаленный домен
            $pdo->prepare("UPDATE remote_sites SET status = 'active', site_name = ?, api_token = ?, last_check = NULL WHERE id = ?")
                ->execute([$name, $token, $deletedSite['id']]);
            echo json_encode(['ok' => true, 'id' => $deletedSite['id'], 'token' => $token]);
        } else {
            // Добавляем новый домен
            $pdo->prepare("INSERT INTO remote_sites (domain, api_token, site_name) VALUES (?, ?, ?)")
                ->execute([$domain, $token, $name]);
            echo json_encode(['ok' => true, 'id' => $pdo->lastInsertId(), 'token' => $token]);
        }
    } catch(Exception $e) {
        echo json_encode(['ok' => false, 'error' => 'Домен уже добавлен']);
    }
    break;
        
    case 'getSites':
        $sites = $pdo->query("SELECT * FROM remote_sites WHERE status='active' ORDER BY site_name")->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['ok' => true, 'sites' => $sites]);
        break;
        
    case 'deleteSite':
        $id = (int)($_POST['id'] ?? 0);
        $pdo->prepare("UPDATE remote_sites SET status='deleted' WHERE id=?")->execute([$id]);
        echo json_encode(['ok' => true]);
        break;
        
    case 'checkConnection':
        $domain = $_POST['domain'] ?? '';
        $token = $pdo->query("SELECT value FROM remote_api_settings WHERE key='api_token'")->fetchColumn();
        
        // Проверяем доступность сайта
        $testUrl = "https://{$domain}/api/remote-check.php";
        
        // Сначала пробуем HTTPS
        $ch = curl_init($testUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'X-API-Token: ' . $token,
            'X-Action: ping'
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        // Если HTTPS не работает, пробуем HTTP
        if ($httpCode !== 200) {
            $testUrl = "http://{$domain}/api/remote-check.php";
            
            $ch = curl_init($testUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'X-API-Token: ' . $token,
                'X-Action: ping'
            ]);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
        }
        
        if ($httpCode === 200) {
            $pdo->prepare("UPDATE remote_sites SET last_check=CURRENT_TIMESTAMP WHERE domain=?")
                ->execute([$domain]);
            echo json_encode(['ok' => true, 'message' => 'Соединение установлено']);
        } else {
            echo json_encode(['ok' => false, 'error' => "Сайт недоступен (HTTP {$httpCode})"]);
        }
        break;
        
    case 'searchFiles':
        $domains = json_decode($_POST['domains'] ?? '[]', true);
        $fileUrl = $_POST['fileUrl'] ?? '';
        
        if (empty($domains) || !$fileUrl) {
            echo json_encode(['ok' => false, 'error' => 'Domains and file URL required']);
            break;
        }
        
        $results = [];
        $token = $pdo->query("SELECT value FROM remote_api_settings WHERE key='api_token'")->fetchColumn();
        
        foreach($domains as $domain) {
            // Определяем протокол
            $protocols = ['https://', 'http://'];
            $searchUrl = null;
            
            foreach ($protocols as $protocol) {
                $testUrl = $protocol . $domain . '/api/remote-check.php';
                
                $ch = curl_init($testUrl);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_TIMEOUT, 3);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
                curl_setopt($ch, CURLOPT_NOBODY, true);
                curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);
                
                if ($httpCode === 200) {
                    $searchUrl = $testUrl;
                    break;
                }
            }
            
            if (!$searchUrl) {
                $results[$domain] = ['error' => 'Site unreachable'];
                continue;
            }
            
            // Отправляем запрос на поиск
            $ch = curl_init($searchUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'X-API-Token: ' . $token,
                'X-Action: search-file',
                'X-File-Url: ' . $fileUrl
            ]);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($httpCode === 200) {
                $data = json_decode($response, true);
                $results[$domain] = $data['found'] ?? [];
            } else {
                $results[$domain] = ['error' => "HTTP {$httpCode}"];
            }
        }
        
        echo json_encode(['ok' => true, 'results' => $results]);
        break;
        
    case 'replaceFile':
        $domains = json_decode($_POST['domains'] ?? '[]', true);
        $oldUrl = $_POST['oldUrl'] ?? '';
        $newUrl = $_POST['newUrl'] ?? '';
        $fileName = $_POST['fileName'] ?? '';
        
        if (empty($domains) || !$oldUrl || !$newUrl) {
            echo json_encode(['ok' => false, 'error' => 'Missing required parameters']);
            break;
        }
        
        $results = [];
        $token = $pdo->query("SELECT value FROM remote_api_settings WHERE key='api_token'")->fetchColumn();
        
        foreach($domains as $domain) {
            // Определяем протокол
            $protocols = ['https://', 'http://'];
            $replaceUrl = null;
            
            foreach ($protocols as $protocol) {
                $testUrl = $protocol . $domain . '/api/remote-check.php';
                
                $ch = curl_init($testUrl);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_TIMEOUT, 3);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
                curl_setopt($ch, CURLOPT_NOBODY, true);
                curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);
                
                if ($httpCode === 200) {
                    $replaceUrl = $testUrl;
                    break;
                }
            }
            
            if (!$replaceUrl) {
                $results[$domain] = ['success' => false, 'message' => 'Site unreachable'];
                continue;
            }
            
            // Отправляем запрос на замену
            $ch = curl_init($replaceUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'X-API-Token: ' . $token,
                'X-Action: replace-file',
                'X-Old-Url: ' . $oldUrl,
                'X-New-Url: ' . $newUrl,
                'X-File-Name: ' . $fileName
            ]);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            $status = ($httpCode === 200) ? 'success' : 'failed';
            $error = ($httpCode !== 200) ? "HTTP {$httpCode}" : null;
            
            // Логируем изменение
            $pdo->prepare("INSERT INTO remote_changes_log (domain, change_type, old_value, new_value, status, error_message) 
                          VALUES (?, 'file', ?, ?, ?, ?)")
                ->execute([$domain, $oldUrl, $newUrl, $status, $error]);
            
            if ($httpCode === 200) {
                $data = json_decode($response, true);
                $results[$domain] = [
                    'success' => true,
                    'replaced' => $data['replaced'] ?? 0,
                    'message' => 'Файл обновлен'
                ];
            } else {
                $results[$domain] = [
                    'success' => false,
                    'message' => $error
                ];
            }
        }
        
        echo json_encode(['ok' => true, 'results' => $results]);
        break;
        
    case 'searchLinks':
        $domains = json_decode($_POST['domains'] ?? '[]', true);
        $linkUrl = $_POST['linkUrl'] ?? '';
        
        if (empty($domains) || !$linkUrl) {
            echo json_encode(['ok' => false, 'error' => 'Domains and link URL required']);
            break;
        }
        
        $results = [];
        $token = $pdo->query("SELECT value FROM remote_api_settings WHERE key='api_token'")->fetchColumn();
        
        foreach($domains as $domain) {
            $searchUrl = "https://{$domain}/api/remote-check.php";
            
            $ch = curl_init($searchUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'X-API-Token: ' . $token,
                'X-Action: search-link',
                'X-Link-Url: ' . $linkUrl
            ]);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($httpCode === 200) {
                $data = json_decode($response, true);
                $results[$domain] = $data['found'] ?? [];
            } else {
                $results[$domain] = ['error' => "HTTP {$httpCode}"];
            }
        }
        
        echo json_encode(['ok' => true, 'results' => $results]);
        break;
        
    case 'replaceLink':
        $domains = json_decode($_POST['domains'] ?? '[]', true);
        $oldUrl = $_POST['oldUrl'] ?? '';
        $newUrl = $_POST['newUrl'] ?? '';
        
        if (empty($domains) || !$oldUrl || !$newUrl) {
            echo json_encode(['ok' => false, 'error' => 'Missing required parameters']);
            break;
        }
        
        $results = [];
        $token = $pdo->query("SELECT value FROM remote_api_settings WHERE key='api_token'")->fetchColumn();
        
        foreach($domains as $domain) {
            $replaceUrl = "https://{$domain}/api/remote-check.php";
            
            $ch = curl_init($replaceUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'X-API-Token: ' . $token,
                'X-Action: replace-link',
                'X-Old-Url: ' . $oldUrl,
                'X-New-Url: ' . $newUrl
            ]);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            $status = ($httpCode === 200) ? 'success' : 'failed';
            $error = ($httpCode !== 200) ? "HTTP {$httpCode}" : null;
            
            // Логируем изменение
            $pdo->prepare("INSERT INTO remote_changes_log (domain, change_type, old_value, new_value, status, error_message) 
                          VALUES (?, 'link', ?, ?, ?, ?)")
                ->execute([$domain, $oldUrl, $newUrl, $status, $error]);
            
            if ($httpCode === 200) {
                $data = json_decode($response, true);
                $results[$domain] = [
                    'success' => true,
                    'replaced' => $data['replaced'] ?? 0,
                    'message' => 'Ссылка обновлена'
                ];
            } else {
                $results[$domain] = [
                    'success' => false,
                    'message' => $error
                ];
            }
        }
        
        echo json_encode(['ok' => true, 'results' => $results]);
        break;
        
    case 'getHistory':
        $limit = (int)($_GET['limit'] ?? 100);
        $offset = (int)($_GET['offset'] ?? 0);
        
        $history = $pdo->prepare("SELECT * FROM remote_changes_log ORDER BY id DESC LIMIT ? OFFSET ?");
        $history->execute([$limit, $offset]);
        
        echo json_encode([
            'ok' => true, 
            'history' => $history->fetchAll(PDO::FETCH_ASSOC)
        ]);
        break;
        
    case 'clearHistory':
        $days = (int)($_POST['days'] ?? 30);
        $pdo->prepare("DELETE FROM remote_changes_log WHERE created_at < datetime('now', '-' || ? || ' days')")
            ->execute([$days]);
        echo json_encode(['ok' => true, 'deleted' => $pdo->exec("SELECT changes()")]);
        break;
        
    default:
        echo json_encode(['ok' => false, 'error' => 'Unknown action: ' . $action]);
}
?>