// Configuración de GitHub para Seguimiento de Clientes
// Compatible con el backend compartido con Reporte de Visitas

const GITHUB_CONFIG_KEY = 'github_config_udp';

function mostrarConfiguracionGitHub() {
    const configHTML = `
        <div id="githubConfigModal" class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>⚙️ Configuración de GitHub</h2>
                    <button class="modal-close" onclick="cerrarConfigGitHub()">✕</button>
                </div>

                <form id="githubConfigForm" class="github-config-form">
                    <div class="form-group">
                        <label for="githubUser">Usuario de GitHub</label>
                        <input type="text" id="githubUser" required
                               placeholder="ej: tu-usuario">
                    </div>

                    <div class="form-group">
                        <label for="githubRepo">Nombre del Repositorio</label>
                        <input type="text" id="githubRepo" required
                               placeholder="ej: reportes-udp-data">
                    </div>

                    <div class="form-group">
                        <label for="githubToken">Personal Access Token</label>
                        <input type="password" id="githubToken" required
                               placeholder="ghp_...">
                        <small>Necesitas permisos de 'repo' en el token</small>
                    </div>

                    <div id="configMessage" class="message" style="display: none;"></div>

                    <div class="modal-buttons">
                        <button type="button" class="btn-secondary" onclick="probarConexionGitHub()">
                            🔌 Probar Conexión
                        </button>
                        <button type="submit" class="btn-primary">
                            💾 Guardar Configuración
                        </button>
                    </div>
                </form>

                <div class="config-info">
                    <h3>ℹ️ Información</h3>
                    <p>Esta aplicación usa GitHub como backend para sincronizar datos entre aplicaciones.</p>
                    <p>Los datos se guardarán en: <code>/data/</code></p>
                    <ul>
                        <li><code>usuarios.json</code> - Base de datos de usuarios compartida</li>
                        <li><code>seguimiento.json</code> - Datos de seguimiento de clientes</li>
                        <li><code>reportes.json</code> - Datos de reportes de visitas</li>
                    </ul>
                </div>
            </div>
        </div>
    `;

    // Estilos para el modal
    const estilos = `
        <style id="githubConfigStyles">
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10001;
            }

            .modal-content {
                background: white;
                border-radius: 15px;
                padding: 30px;
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
            }

            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 25px;
                padding-bottom: 15px;
                border-bottom: 2px solid #e1e8ed;
            }

            .modal-header h2 {
                color: #2c3e50;
                margin: 0;
            }

            .modal-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #7f8c8d;
                transition: color 0.3s;
            }

            .modal-close:hover {
                color: #2c3e50;
            }

            .github-config-form .form-group {
                margin-bottom: 20px;
            }

            .github-config-form label {
                display: block;
                margin-bottom: 8px;
                color: #2c3e50;
                font-weight: 600;
            }

            .github-config-form input {
                width: 100%;
                padding: 12px;
                border: 2px solid #e1e8ed;
                border-radius: 8px;
                font-size: 16px;
                transition: all 0.3s;
            }

            .github-config-form input:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }

            .github-config-form small {
                display: block;
                margin-top: 5px;
                color: #7f8c8d;
                font-size: 14px;
            }

            .modal-buttons {
                display: flex;
                gap: 15px;
                margin-top: 25px;
            }

            .modal-buttons button {
                flex: 1;
                padding: 12px 20px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
                border: none;
            }

            .btn-primary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }

            .btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
            }

            .btn-secondary {
                background: #e1e8ed;
                color: #2c3e50;
            }

            .btn-secondary:hover {
                background: #d1d8dd;
            }

            .config-info {
                margin-top: 30px;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 8px;
            }

            .config-info h3 {
                color: #2c3e50;
                margin-bottom: 10px;
                font-size: 18px;
            }

            .config-info p {
                color: #7f8c8d;
                line-height: 1.6;
                margin-bottom: 10px;
            }

            .config-info code {
                background: #e1e8ed;
                padding: 2px 6px;
                border-radius: 4px;
                font-family: 'Courier New', monospace;
                font-size: 14px;
            }

            .config-info ul {
                margin-top: 10px;
                margin-left: 20px;
                color: #7f8c8d;
            }

            .config-info li {
                margin-bottom: 5px;
            }

            .message {
                padding: 12px;
                border-radius: 8px;
                margin-top: 15px;
                text-align: center;
            }

            .message.success {
                background: #e6ffe6;
                color: #28a745;
                border: 1px solid #ccffcc;
            }

            .message.error {
                background: #ffe6e6;
                color: #dc3545;
                border: 1px solid #ffcccc;
            }

            .message.info {
                background: #e6f3ff;
                color: #0066cc;
                border: 1px solid #cce0ff;
            }
        </style>
    `;

    // Insertar estilos y HTML
    if (!document.getElementById('githubConfigStyles')) {
        document.head.insertAdjacentHTML('beforeend', estilos);
    }

    document.body.insertAdjacentHTML('beforeend', configHTML);

    // Cargar configuración existente si hay
    cargarConfiguracionExistente();

    // Configurar eventos
    document.getElementById('githubConfigForm').addEventListener('submit', guardarConfiguracionGitHub);
}

function cargarConfiguracionExistente() {
    const config = obtenerConfiguracionGitHub();
    if (config) {
        document.getElementById('githubUser').value = config.user || '';
        document.getElementById('githubRepo').value = config.repo || '';
        document.getElementById('githubToken').value = config.token || '';
    }
}

function obtenerConfiguracionGitHub() {
    const configStr = localStorage.getItem(GITHUB_CONFIG_KEY);
    if (!configStr) return null;

    try {
        return JSON.parse(configStr);
    } catch (error) {
        console.error('Error al parsear configuración de GitHub:', error);
        return null;
    }
}

async function probarConexionGitHub() {
    const user = document.getElementById('githubUser').value.trim();
    const repo = document.getElementById('githubRepo').value.trim();
    const token = document.getElementById('githubToken').value.trim();

    if (!user || !repo || !token) {
        mostrarMensajeConfig('Por favor complete todos los campos', 'error');
        return;
    }

    mostrarMensajeConfig('Probando conexión...', 'info');

    try {
        // Intentar obtener información del repositorio
        const response = await fetch(`https://api.github.com/repos/${user}/${repo}`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (response.ok) {
            const repoData = await response.json();
            mostrarMensajeConfig(`✅ Conexión exitosa! Repositorio: ${repoData.name}`, 'success');
        } else if (response.status === 404) {
            mostrarMensajeConfig('❌ Repositorio no encontrado', 'error');
        } else if (response.status === 401) {
            mostrarMensajeConfig('❌ Token inválido o sin permisos', 'error');
        } else {
            mostrarMensajeConfig(`❌ Error: ${response.statusText}`, 'error');
        }
    } catch (error) {
        mostrarMensajeConfig(`❌ Error de conexión: ${error.message}`, 'error');
    }
}

async function guardarConfiguracionGitHub(event) {
    event.preventDefault();

    const user = document.getElementById('githubUser').value.trim();
    const repo = document.getElementById('githubRepo').value.trim();
    const token = document.getElementById('githubToken').value.trim();

    if (!user || !repo || !token) {
        mostrarMensajeConfig('Por favor complete todos los campos', 'error');
        return;
    }

    // Guardar configuración
    const config = { user, repo, token };
    localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(config));

    mostrarMensajeConfig('✅ Configuración guardada correctamente', 'success');

    // Cerrar modal después de 2 segundos
    setTimeout(() => {
        cerrarConfigGitHub();
        // Recargar la página para aplicar la nueva configuración
        window.location.reload();
    }, 2000);
}

function mostrarMensajeConfig(mensaje, tipo) {
    const messageDiv = document.getElementById('configMessage');
    messageDiv.className = `message ${tipo}`;
    messageDiv.textContent = mensaje;
    messageDiv.style.display = 'block';
}

function cerrarConfigGitHub() {
    const modal = document.getElementById('githubConfigModal');
    if (modal) {
        modal.remove();
    }
}

// Función para agregar botón de configuración en el header
function agregarBotonConfigGitHub() {
    // Solo mostrar si es admin
    if (!window.sistemaAuth || !window.sistemaAuth.esAdmin()) {
        return;
    }

    const userInfo = document.querySelector('.user-info');
    if (userInfo && !document.getElementById('btnConfigGitHub')) {
        const configButton = document.createElement('button');
        configButton.id = 'btnConfigGitHub';
        configButton.textContent = '⚙️ Config GitHub';
        configButton.onclick = mostrarConfiguracionGitHub;
        configButton.style.cssText = `
            background: rgba(0, 123, 255, 0.2);
            color: #007bff;
            border: 1px solid #007bff;
            padding: 8px 15px;
            border-radius: 20px;
            cursor: pointer;
            transition: all 0.3s;
            margin-right: 10px;
        `;

        configButton.onmouseover = () => {
            configButton.style.background = 'rgba(0, 123, 255, 0.3)';
            configButton.style.transform = 'translateY(-1px)';
        };

        configButton.onmouseout = () => {
            configButton.style.background = 'rgba(0, 123, 255, 0.2)';
            configButton.style.transform = 'translateY(0)';
        };

        const adminButton = document.querySelector('.btn-admin-header');
        if (adminButton) {
            userInfo.insertBefore(configButton, adminButton);
        } else {
            const logoutButton = userInfo.querySelector('.btn-logout');
            userInfo.insertBefore(configButton, logoutButton);
        }
    }
}

// Exportar funciones
window.mostrarConfiguracionGitHub = mostrarConfiguracionGitHub;
window.obtenerConfiguracionGitHub = obtenerConfiguracionGitHub;
window.cerrarConfigGitHub = cerrarConfigGitHub;
window.agregarBotonConfigGitHub = agregarBotonConfigGitHub;

// Agregar botón cuando el documento esté listo
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => agregarBotonConfigGitHub(), 500);
});