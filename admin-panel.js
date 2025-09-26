// Panel de Administración para Seguimiento de Clientes
// Compatible con el backend compartido de GitHub

class PanelAdministrador {
    constructor() {
        this.auth = window.sistemaAuth;
        this.sync = null;
        this.usuariosCache = {};
    }

    async mostrar() {
        if (!this.auth || !this.auth.esAdmin()) {
            alert('No tiene permisos de administrador');
            return;
        }

        this.sync = new GitHubSync();
        await this.cargarDatos();
        this.renderizarPanel();
    }

    async cargarDatos() {
        // Cargar usuarios del sistema
        this.usuariosCache = this.auth.obtenerUsuarios() || {};

        // Sincronizar con GitHub si está configurado
        if (this.sync && this.sync.inicializar()) {
            await this.sync.sincronizarUsuarios();
            this.usuariosCache = this.auth.obtenerUsuarios() || {};
        }
    }

    renderizarPanel() {
        const panelHTML = `
            <div id="adminPanel" class="modal-overlay">
                <div class="admin-panel-container">
                    <div class="admin-header">
                        <h2>🔧 Panel de Administración</h2>
                        <button class="close-btn" onclick="cerrarPanelAdmin()">✕</button>
                    </div>

                    <div class="admin-tabs">
                        <button class="admin-tab active" onclick="cambiarTabAdmin(event, 'usuarios')">
                            👥 Usuarios
                        </button>
                        <button class="admin-tab" onclick="cambiarTabAdmin(event, 'estadisticas')">
                            📊 Estadísticas
                        </button>
                        <button class="admin-tab" onclick="cambiarTabAdmin(event, 'sincronizacion')">
                            ☁️ Sincronización
                        </button>
                        <button class="admin-tab" onclick="cambiarTabAdmin(event, 'exportar')">
                            📥 Exportar Datos
                        </button>
                        <button class="admin-tab" onclick="cambiarTabAdmin(event, 'reportes')">
                            📊 Reportes
                        </button>
                    </div>

                    <div class="admin-content">
                        <div id="usuarios" class="admin-tab-content active">
                            ${this.renderizarSeccionUsuarios()}
                        </div>

                        <div id="estadisticas" class="admin-tab-content">
                            ${this.renderizarSeccionEstadisticas()}
                        </div>

                        <div id="sincronizacion" class="admin-tab-content">
                            ${this.renderizarSeccionSincronizacion()}
                        </div>

                        <div id="exportar" class="admin-tab-content">
                            ${this.renderizarSeccionExportar()}
                        </div>

                        <div id="reportes" class="admin-tab-content">
                            ${this.renderizarSeccionReportes()}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Estilos del panel
        const estilos = `
            <style id="adminPanelStyles">
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
                    z-index: 10000;
                    overflow-y: auto;
                    padding: 20px;
                }

                .admin-panel-container {
                    background: white;
                    border-radius: 15px;
                    width: 100%;
                    max-width: 1200px;
                    max-height: 90vh;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
                }

                .admin-header {
                    background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
                    color: white;
                    padding: 25px 30px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .admin-header h2 {
                    margin: 0;
                    font-size: 24px;
                }

                .close-btn {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 28px;
                    cursor: pointer;
                    transition: transform 0.3s;
                }

                .close-btn:hover {
                    transform: scale(1.1);
                }

                .admin-tabs {
                    display: flex;
                    background: #f8f9fa;
                    border-bottom: 2px solid #e1e8ed;
                }

                .admin-tab {
                    flex: 1;
                    padding: 15px 20px;
                    background: none;
                    border: none;
                    font-size: 15px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                    color: #666;
                }

                .admin-tab.active {
                    background: white;
                    color: #2c3e50;
                    border-bottom: 3px solid #667eea;
                }

                .admin-tab:hover:not(.active) {
                    background: #e9ecef;
                }

                .admin-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 30px;
                    background: white;
                }

                .admin-tab-content {
                    display: none;
                }

                .admin-tab-content.active {
                    display: block;
                }

                .users-grid {
                    display: grid;
                    gap: 20px;
                    margin-top: 20px;
                }

                .user-card {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 10px;
                    border: 2px solid #e1e8ed;
                    transition: all 0.3s;
                }

                .user-card:hover {
                    border-color: #667eea;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                }

                .user-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                }

                .user-name {
                    font-size: 18px;
                    font-weight: 600;
                    color: #2c3e50;
                }

                .user-role {
                    padding: 4px 10px;
                    border-radius: 15px;
                    font-size: 12px;
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .role-admin {
                    background: #ffe6e6;
                    color: #dc3545;
                }

                .role-usuario {
                    background: #e6f3ff;
                    color: #007bff;
                }

                .user-details {
                    color: #7f8c8d;
                    font-size: 14px;
                    line-height: 1.6;
                }

                .user-details p {
                    margin: 5px 0;
                }

                .user-actions {
                    display: flex;
                    gap: 10px;
                    margin-top: 15px;
                }

                .btn-small {
                    padding: 8px 15px;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.3s;
                    font-weight: 600;
                }

                .btn-edit {
                    background: #667eea;
                    color: white;
                }

                .btn-edit:hover {
                    background: #5a67d8;
                }

                .btn-delete {
                    background: #dc3545;
                    color: white;
                }

                .btn-delete:hover {
                    background: #c82333;
                }

                .btn-toggle {
                    background: #ffc107;
                    color: #212529;
                }

                .btn-toggle:hover {
                    background: #e0a800;
                }

                .add-user-btn {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 12px 24px;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                    margin-bottom: 20px;
                }

                .add-user-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
                }

                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 20px;
                    margin-top: 20px;
                }

                .stat-card {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 25px;
                    border-radius: 10px;
                    text-align: center;
                }

                .stat-value {
                    font-size: 36px;
                    font-weight: 700;
                    margin-bottom: 10px;
                }

                .stat-label {
                    font-size: 16px;
                    opacity: 0.9;
                }

                .sync-status {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 10px;
                    margin-bottom: 20px;
                }

                .sync-status h3 {
                    color: #2c3e50;
                    margin-bottom: 15px;
                }

                .status-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 10px 0;
                    border-bottom: 1px solid #e1e8ed;
                }

                .status-label {
                    font-weight: 600;
                    color: #2c3e50;
                }

                .status-value {
                    color: #7f8c8d;
                }

                .status-connected {
                    color: #28a745;
                    font-weight: 600;
                }

                .status-disconnected {
                    color: #dc3545;
                    font-weight: 600;
                }

                .sync-actions {
                    display: flex;
                    gap: 15px;
                    margin-top: 20px;
                }

                .btn-sync {
                    flex: 1;
                    padding: 12px 20px;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
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

                .export-section {
                    background: #f8f9fa;
                    padding: 25px;
                    border-radius: 10px;
                    margin-bottom: 20px;
                }

                .export-section h3 {
                    color: #2c3e50;
                    margin-bottom: 15px;
                }

                .export-buttons {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                }

                @media (max-width: 768px) {
                    .admin-tabs {
                        flex-direction: column;
                    }

                    .stats-grid {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
        `;

        // Insertar estilos y HTML
        if (!document.getElementById('adminPanelStyles')) {
            document.head.insertAdjacentHTML('beforeend', estilos);
        }

        document.body.insertAdjacentHTML('beforeend', panelHTML);

        // Configurar eventos
        this.configurarEventos();
    }

    renderizarSeccionUsuarios() {
        const usuarios = Object.entries(this.usuariosCache);

        let html = `
            <div class="section-header">
                <button class="add-user-btn" onclick="mostrarFormularioNuevoUsuario()">
                    ➕ Agregar Nuevo Usuario
                </button>
            </div>
            <div class="users-grid">
        `;

        usuarios.forEach(([username, usuario]) => {
            const esActivo = usuario.activo !== false;
            const ultimoAcceso = usuario.ultimoAcceso
                ? new Date(usuario.ultimoAcceso).toLocaleString('es-MX')
                : 'Nunca';

            html += `
                <div class="user-card">
                    <div class="user-card-header">
                        <span class="user-name">${usuario.nombre}</span>
                        <span class="user-role ${usuario.rol === 'admin' ? 'role-admin' : 'role-usuario'}">
                            ${usuario.rol}
                        </span>
                    </div>
                    <div class="user-details">
                        <p>👤 Usuario: ${username}</p>
                        <p>📧 Email: ${usuario.email || 'No especificado'}</p>
                        <p>📅 Último acceso: ${ultimoAcceso}</p>
                        <p>🔢 Accesos totales: ${usuario.accesos || 0}</p>
                        <p>🔒 Estado: ${esActivo ? '✅ Activo' : '❌ Inactivo'}</p>
                    </div>
                    <div class="user-actions">
                        <button class="btn-small btn-edit" onclick="editarUsuario('${username}')">
                            ✏️ Editar
                        </button>
                        <button class="btn-small btn-toggle" onclick="toggleUsuarioEstado('${username}')">
                            ${esActivo ? '🔒 Desactivar' : '🔓 Activar'}
                        </button>
                        ${username !== 'admin' ? `
                            <button class="btn-small btn-delete" onclick="eliminarUsuario('${username}')">
                                🗑️ Eliminar
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    renderizarSeccionEstadisticas() {
        // Obtener estadísticas
        const totalUsuarios = Object.keys(this.usuariosCache).length;
        const usuariosActivos = Object.values(this.usuariosCache).filter(u => u.activo !== false).length;
        const administradores = Object.values(this.usuariosCache).filter(u => u.rol === 'admin').length;

        // Calcular estadísticas de seguimiento
        const totalRegistros = registrosOriginales ? registrosOriginales.length : 0;
        const registrosHoy = registrosOriginales ? registrosOriginales.filter(r => {
            const fecha = new Date(r.fecha);
            const hoy = new Date();
            return fecha.toDateString() === hoy.toDateString();
        }).length : 0;

        return `
            <h3>📊 Estadísticas del Sistema</h3>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${totalUsuarios}</div>
                    <div class="stat-label">Usuarios Totales</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${usuariosActivos}</div>
                    <div class="stat-label">Usuarios Activos</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${administradores}</div>
                    <div class="stat-label">Administradores</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${totalRegistros}</div>
                    <div class="stat-label">Total de Registros</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${registrosHoy}</div>
                    <div class="stat-label">Registros Hoy</div>
                </div>
            </div>
        `;
    }

    renderizarSeccionSincronizacion() {
        const config = window.obtenerConfiguracionGitHub();
        const hayConfig = config && config.user && config.repo && config.token;

        return `
            <div class="sync-status">
                <h3>Estado de Sincronización</h3>
                <div class="status-item">
                    <span class="status-label">Estado de GitHub:</span>
                    <span class="${hayConfig ? 'status-connected' : 'status-disconnected'}">
                        ${hayConfig ? '✅ Configurado' : '❌ No configurado'}
                    </span>
                </div>
                ${hayConfig ? `
                    <div class="status-item">
                        <span class="status-label">Usuario:</span>
                        <span class="status-value">${config.user}</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">Repositorio:</span>
                        <span class="status-value">${config.repo}</span>
                    </div>
                ` : ''}
                <div class="status-item">
                    <span class="status-label">Última sincronización:</span>
                    <span class="status-value" id="ultimaSincronizacion">No disponible</span>
                </div>
            </div>

            <div class="sync-actions">
                <button class="btn-sync btn-primary" onclick="sincronizarAhora()">
                    🔄 Sincronizar Ahora
                </button>
                <button class="btn-sync btn-secondary" onclick="mostrarConfiguracionGitHub()">
                    ⚙️ Configurar GitHub
                </button>
            </div>

            <div style="margin-top: 30px;">
                <h3>🧹 Mantenimiento de Usuarios</h3>
                <button class="btn-sync btn-secondary" onclick="limpiarUsuariosDuplicados()" style="background: #ff9800; color: white;">
                    🧹 Limpiar Usuarios Duplicados
                </button>
                <button class="btn-sync btn-secondary" onclick="forzarSincronizacionDesdeGitHub()" style="background: #2196F3; color: white; margin-left: 10px;">
                    ⬇️ Forzar Sincronización desde GitHub
                </button>
            </div>

            <div style="margin-top: 30px;">
                <h3>ℹ️ Información</h3>
                <p style="color: #7f8c8d; line-height: 1.6;">
                    Esta aplicación comparte la base de datos de usuarios con "Reporte de Visitas" a través de GitHub.
                    Los cambios en usuarios se sincronizan automáticamente entre ambas aplicaciones.
                </p>
            </div>
        `;
    }

    renderizarSeccionExportar() {
        return `
            <div class="export-section">
                <h3>📥 Exportar Datos de Seguimiento</h3>
                <div class="export-buttons">
                    <button class="btn-sync btn-primary" onclick="exportarDatosJSON()">
                        📄 Exportar JSON
                    </button>
                    <button class="btn-sync btn-primary" onclick="exportarDatosCSV()">
                        📊 Exportar CSV
                    </button>
                    <button class="btn-sync btn-primary" onclick="exportarDatosExcel()">
                        📈 Exportar Excel
                    </button>
                </div>
            </div>

            <div class="export-section">
                <h3>👥 Exportar Usuarios</h3>
                <div class="export-buttons">
                    <button class="btn-sync btn-secondary" onclick="exportarUsuariosJSON()">
                        📄 Exportar Usuarios (JSON)
                    </button>
                    <button class="btn-sync btn-secondary" onclick="exportarUsuariosCSV()">
                        📊 Exportar Usuarios (CSV)
                    </button>
                </div>
            </div>
        `;
    }

    renderizarSeccionReportes() {
        return `
            <div class="reports-section">
                <h3>📊 Reportes Administrativos</h3>
                <p class="section-description">
                    Genere reportes comprehensivos de actividad para análisis administrativo y toma de decisiones.
                </p>

                <div class="report-controls">
                    <div class="control-group">
                        <label for="reportPeriod">📅 Período de Reporte:</label>
                        <select id="reportPeriod" onchange="actualizarFechasReporte()">
                            <option value="mes">Último Mes</option>
                            <option value="trimestre">Último Trimestre</option>
                            <option value="semestre">Último Semestre</option>
                            <option value="ano">Último Año</option>
                            <option value="custom">Período Personalizado</option>
                        </select>
                    </div>

                    <div class="control-group" id="customDateRange" style="display: none;">
                        <label for="reportFechaInicio">Fecha Inicio:</label>
                        <input type="date" id="reportFechaInicio">
                        <label for="reportFechaFin">Fecha Fin:</label>
                        <input type="date" id="reportFechaFin">
                    </div>

                    <div class="control-group">
                        <label for="reportConsultor">👥 Consultor:</label>
                        <select id="reportConsultor">
                            <option value="todos">Todos los Consultores</option>
                        </select>
                    </div>

                    <div class="control-group">
                        <label for="reportGerencia">🏢 Gerencia:</label>
                        <select id="reportGerencia">
                            <option value="todas">Todas las Gerencias</option>
                            <option value="Bajío">Bajío</option>
                            <option value="Centro-Norte">Centro-Norte</option>
                            <option value="Centro-Sur">Centro-Sur</option>
                            <option value="Norte">Norte</option>
                            <option value="Occidente">Occidente</option>
                            <option value="Oriente">Oriente</option>
                            <option value="Pacífico">Pacífico</option>
                            <option value="Sur">Sur</option>
                        </select>
                    </div>
                </div>

                <div class="report-actions">
                    <button class="btn-sync btn-primary" onclick="generarReporteEjecutivo()">
                        📈 Reporte Ejecutivo
                    </button>
                    <button class="btn-sync btn-secondary" onclick="generarReporteDetallado()">
                        📋 Reporte Detallado
                    </button>
                    <button class="btn-sync btn-info" onclick="previsualizarReporte()">
                        👁️ Vista Previa
                    </button>
                </div>

                <div id="reportPreview" class="report-preview" style="display: none;">
                    <h4>📊 Vista Previa del Reporte</h4>
                    <div id="reportPreviewContent"></div>
                </div>

                <div class="export-formats">
                    <h4>💾 Exportar Reporte</h4>
                    <div class="export-buttons">
                        <button class="btn-sync btn-success" onclick="exportarReportePDF()">
                            📑 PDF Ejecutivo
                        </button>
                        <button class="btn-sync btn-success" onclick="exportarReporteExcel()">
                            📊 Excel Detallado
                        </button>
                        <button class="btn-sync btn-success" onclick="exportarReporteCSV()">
                            📄 CSV Analítico
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    configurarEventos() {
        // Los eventos se manejan con funciones globales definidas abajo
    }
}

// Funciones globales para manejar eventos
window.abrirPanelAdmin = async function() {
    const panel = new PanelAdministrador();
    await panel.mostrar();
};

window.cerrarPanelAdmin = function() {
    const panel = document.getElementById('adminPanel');
    if (panel) {
        panel.remove();
    }
};

window.cambiarTabAdmin = function(event, tabName) {
    // Cambiar tabs activos
    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');

    // Cambiar contenido activo
    const contents = document.querySelectorAll('.admin-tab-content');
    contents.forEach(content => content.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
};

window.mostrarFormularioNuevoUsuario = async function() {
    const username = prompt('Ingrese el nombre de usuario:');
    if (!username) return;

    const nombre = prompt('Ingrese el nombre completo:');
    if (!nombre) return;

    const email = prompt('Ingrese el email:');
    if (!email) return;

    const password = prompt('Ingrese la contraseña:');
    if (!password) return;

    const rol = confirm('¿Es administrador?') ? 'admin' : 'usuario';

    try {
        window.sistemaAuth.crearUsuario({
            username,
            nombre,
            email,
            password,
            rol
        });

        // Sincronizar con GitHub
        const sync = new GitHubSync();
        await sync.guardarUsuariosEnGitHub();

        alert('✅ Usuario creado exitosamente');
        // Actualizar dropdowns de consultores
        if (typeof window.cargarConsultores === 'function') {
            window.cargarConsultores();
        }
        cerrarPanelAdmin();
        abrirPanelAdmin();
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
    }
};

window.editarUsuario = async function(username) {
    const usuarios = window.sistemaAuth.obtenerUsuarios();
    const usuario = usuarios[username];

    const nombre = prompt('Nombre completo:', usuario.nombre);
    if (!nombre) return;

    const email = prompt('Email:', usuario.email);
    if (!email) return;

    const cambiarPassword = confirm('¿Desea cambiar la contraseña?');
    let password = null;
    if (cambiarPassword) {
        password = prompt('Nueva contraseña:');
        if (!password) return;
    }

    const rol = confirm(`¿Es administrador? (Actualmente: ${usuario.rol})`) ? 'admin' : 'usuario';

    try {
        const actualizacion = { nombre, email, rol };
        if (password) actualizacion.password = password;

        window.sistemaAuth.actualizarUsuario(username, actualizacion);

        // Sincronizar con GitHub
        const sync = new GitHubSync();
        await sync.guardarUsuariosEnGitHub();

        alert('✅ Usuario actualizado exitosamente');
        // Actualizar dropdowns de consultores
        if (typeof window.cargarConsultores === 'function') {
            window.cargarConsultores();
        }
        cerrarPanelAdmin();
        abrirPanelAdmin();
    } catch (error) {
        alert(`❌ Error: ${error.message}`);
    }
};

window.toggleUsuarioEstado = async function(username) {
    const usuarios = window.sistemaAuth.obtenerUsuarios();
    const usuario = usuarios[username];
    const nuevoEstado = !usuario.activo;

    if (confirm(`¿Está seguro de ${nuevoEstado ? 'activar' : 'desactivar'} al usuario ${usuario.nombre}?`)) {
        try {
            window.sistemaAuth.actualizarUsuario(username, { activo: nuevoEstado });

            // Sincronizar con GitHub
            const sync = new GitHubSync();
            await sync.guardarUsuariosEnGitHub();

            alert(`✅ Usuario ${nuevoEstado ? 'activado' : 'desactivado'}`);
            // Actualizar dropdowns de consultores
            if (typeof window.cargarConsultores === 'function') {
                window.cargarConsultores();
            }
            cerrarPanelAdmin();
            abrirPanelAdmin();
        } catch (error) {
            alert(`❌ Error: ${error.message}`);
        }
    }
};

window.eliminarUsuario = async function(username) {
    const usuarios = window.sistemaAuth.obtenerUsuarios();
    const usuario = usuarios[username];

    if (confirm(`⚠️ ¿Está seguro de eliminar al usuario ${usuario.nombre}?\nEsta acción no se puede deshacer.`)) {
        try {
            window.sistemaAuth.eliminarUsuario(username);

            // Sincronizar con GitHub inmediatamente
            const sync = new GitHubSync();
            await sync.guardarUsuariosEnGitHub();

            alert('✅ Usuario eliminado exitosamente');
            // Actualizar dropdowns de consultores
            if (typeof window.cargarConsultores === 'function') {
                window.cargarConsultores();
            }
            cerrarPanelAdmin();
            abrirPanelAdmin();
        } catch (error) {
            alert(`❌ Error: ${error.message}`);
        }
    }
};

window.sincronizarAhora = async function() {
    const sync = new GitHubSync();
    await sync.sincronizacionCompleta();
};

// Funciones de exportación
window.exportarDatosJSON = async function() {
    try {
        const registros = await new GitHubSync().obtenerRegistrosLocales();
        const dataStr = JSON.stringify(registros, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `seguimiento_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        alert('Error al exportar datos: ' + error.message);
    }
};

window.exportarUsuariosJSON = function() {
    const usuarios = window.sistemaAuth.obtenerUsuarios();
    const dataStr = JSON.stringify(usuarios, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `usuarios_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
};

window.exportarDatosCSV = async function() {
    // Implementar exportación CSV si es necesario
    alert('Función de exportación CSV en desarrollo');
};

window.exportarDatosExcel = async function() {
    // Implementar exportación Excel si es necesario
    alert('Función de exportación Excel en desarrollo');
};

window.exportarUsuariosCSV = function() {
    // Implementar exportación CSV de usuarios si es necesario
    alert('Función de exportación CSV en desarrollo');
};

// ====================================================================
// FUNCIONES DE REPORTES ADMINISTRATIVOS
// ====================================================================

// Variables globales para reportes
let reporteData = {
    registros: [],
    papelera: [],
    usuarios: {},
    fechaInicio: null,
    fechaFin: null,
    filtros: {}
};

// Actualizar fechas según período seleccionado
window.actualizarFechasReporte = function() {
    const periodo = document.getElementById('reportPeriod').value;
    const customRange = document.getElementById('customDateRange');
    const fechaInicio = document.getElementById('reportFechaInicio');
    const fechaFin = document.getElementById('reportFechaFin');

    if (periodo === 'custom') {
        customRange.style.display = 'block';
        return;
    }

    customRange.style.display = 'none';

    const hoy = new Date();
    let inicio = new Date();

    switch (periodo) {
        case 'mes':
            inicio.setMonth(hoy.getMonth() - 1);
            break;
        case 'trimestre':
            inicio.setMonth(hoy.getMonth() - 3);
            break;
        case 'semestre':
            inicio.setMonth(hoy.getMonth() - 6);
            break;
        case 'ano':
            inicio.setFullYear(hoy.getFullYear() - 1);
            break;
    }

    fechaInicio.value = inicio.toISOString().split('T')[0];
    fechaFin.value = hoy.toISOString().split('T')[0];
};

// Cargar datos para reportes
window.cargarDatosReporte = async function() {
    try {
        console.log('📊 Cargando datos para reporte...');
        console.log('GitHubSync disponible:', typeof GitHubSync);

        const sync = new GitHubSync();
        console.log('Sync creado:', sync);

        if (sync.inicializar()) {
            console.log('✅ GitHub configurado, intentando cargar desde GitHub...');
            // Cargar desde GitHub
            const seguimientoData = await sync.leerArchivo('seguimiento.json');
            const papeleraData = await sync.leerArchivo('papelera_seguimiento.json');

            // Cargar datos locales primero
            console.log('📦 Cargando datos locales...');
            reporteData.registros = await sync.obtenerRegistrosLocales() || [];
            reporteData.papelera = await sync.obtenerPapeleraLocal() || [];
            console.log(`📊 Datos locales: ${reporteData.registros.length} registros, ${reporteData.papelera.length} en papelera`);

            if (seguimientoData && seguimientoData.contenido) {
                // Si existe en GitHub, mezclar datos
                console.log('✅ Encontrado seguimiento en GitHub, mezclando datos...');
                const registrosGitHub = seguimientoData.contenido.registros || [];
                // Aquí podrías implementar lógica de merge si necesitas
                reporteData.registros = registrosGitHub;
            } else {
                // Crear archivo en GitHub
                console.log('📝 Creando archivo seguimiento.json en GitHub...');
                const datosGuardar = {
                    registros: reporteData.registros,
                    ultimaActualizacion: new Date().toISOString(),
                    totalRegistros: reporteData.registros.length,
                    metadata: {
                        aplicacion: 'Seguimiento de Clientes',
                        version: '2.0'
                    }
                };
                const exitoSeguimiento = await sync.escribirArchivo('seguimiento.json', datosGuardar, 'Creación inicial de seguimiento');
                console.log(`📄 Resultado seguimiento.json: ${exitoSeguimiento ? 'Éxito' : 'Error'}`);
            }

            if (papeleraData && papeleraData.contenido) {
                // Si existe en GitHub, usar esos datos
                console.log('✅ Encontrada papelera en GitHub...');
                reporteData.papelera = papeleraData.contenido.registros || [];
            } else {
                // Crear archivo en GitHub
                console.log('📝 Creando archivo papelera_seguimiento.json en GitHub...');
                const papeleraGuardar = {
                    registros: reporteData.papelera,
                    ultimaActualizacion: new Date().toISOString(),
                    totalRegistros: reporteData.papelera.length
                };
                const exitoPapelera = await sync.escribirArchivo('papelera_seguimiento.json', papeleraGuardar, 'Creación inicial de papelera');
                console.log(`📄 Resultado papelera_seguimiento.json: ${exitoPapelera ? 'Éxito' : 'Error'}`);
            }

            console.log(`✅ Proceso completado: ${reporteData.registros.length} registros, ${reporteData.papelera.length} en papelera`);
        } else {
            console.log('⚠️ GitHub no configurado, cargando desde IndexedDB local...');
            // Cargar desde IndexedDB local
            reporteData.registros = await sync.obtenerRegistrosLocales() || [];
            reporteData.papelera = await sync.obtenerPapeleraLocal() || [];
            console.log('Datos locales cargados:', reporteData.registros.length, 'registros');
        }

        reporteData.usuarios = window.sistemaAuth.obtenerUsuarios() || {};

        // Cargar consultores en dropdown
        const consultorSelect = document.getElementById('reportConsultor');
        if (consultorSelect) {
            consultorSelect.innerHTML = '<option value="todos">Todos los Consultores</option>';
            Object.entries(reporteData.usuarios).forEach(([username, usuario]) => {
                if (username !== 'admin') {
                    consultorSelect.innerHTML += `<option value="${username}">${usuario.nombre}</option>`;
                }
            });
        }

        console.log(`✅ Datos cargados: ${reporteData.registros.length} registros, ${reporteData.papelera.length} en papelera`);

    } catch (error) {
        console.error('❌ Error cargando datos para reporte:', error);
        console.error('Stack trace:', error.stack);
        console.error('Mensaje del error:', error.message);
        alert(`Error cargando datos: ${error.message}`);
    }
};

// Filtrar datos según criterios seleccionados
window.filtrarDatosReporte = function() {
    const periodo = document.getElementById('reportPeriod').value;
    const consultor = document.getElementById('reportConsultor').value;
    const gerencia = document.getElementById('reportGerencia').value;

    let fechaInicio, fechaFin;

    if (periodo === 'custom') {
        fechaInicio = document.getElementById('reportFechaInicio').value;
        fechaFin = document.getElementById('reportFechaFin').value;
    } else {
        actualizarFechasReporte();
        fechaInicio = document.getElementById('reportFechaInicio').value;
        fechaFin = document.getElementById('reportFechaFin').value;
    }

    if (!fechaInicio || !fechaFin) {
        alert('Por favor seleccione un período válido');
        return [];
    }

    return reporteData.registros.filter(registro => {
        // Filtro por fecha
        const fechaRegistro = safeGet(registro, 'fecha');
        if (fechaRegistro < fechaInicio || fechaRegistro > fechaFin) {
            return false;
        }

        // Filtro por consultor
        if (consultor !== 'todos') {
            const creadoPor = safeGet(registro, 'creadoPor') || safeGet(registro, 'consultor');
            if (creadoPor !== consultor) {
                return false;
            }
        }

        // Filtro por gerencia
        if (gerencia !== 'todas') {
            const gerenciaRegistro = safeGet(registro, 'gerencia');
            if (gerenciaRegistro !== gerencia) {
                return false;
            }
        }

        return true;
    });
};

// Generar estadísticas del reporte
window.generarEstadisticasReporte = function(registrosFiltrados) {
    const stats = {
        totalRegistros: registrosFiltrados.length,
        clientesUnicos: new Set(registrosFiltrados.map(r => safeGet(r, 'cliente'))).size,
        consultoresActivos: new Set(registrosFiltrados.map(r => safeGet(r, 'creadoPor') || safeGet(r, 'consultor'))).size,
        gerenciasActivas: new Set(registrosFiltrados.map(r => safeGet(r, 'gerencia'))).size,
        tiposInteraccion: {},
        actividadPorConsultor: {},
        actividadPorGerencia: {},
        timelineActividad: {}
    };

    // Analizar tipos de interacción
    registrosFiltrados.forEach(registro => {
        const tipo = safeGet(registro, 'tipoInteraccion') || 'Sin especificar';
        stats.tiposInteraccion[tipo] = (stats.tiposInteraccion[tipo] || 0) + 1;

        const consultor = safeGet(registro, 'creadoPor') || safeGet(registro, 'consultor') || 'Sin especificar';
        stats.actividadPorConsultor[consultor] = (stats.actividadPorConsultor[consultor] || 0) + 1;

        const gerencia = safeGet(registro, 'gerencia') || 'Sin especificar';
        stats.actividadPorGerencia[gerencia] = (stats.actividadPorGerencia[gerencia] || 0) + 1;

        const fecha = safeGet(registro, 'fecha');
        if (fecha) {
            const mes = fecha.substring(0, 7); // YYYY-MM
            stats.timelineActividad[mes] = (stats.timelineActividad[mes] || 0) + 1;
        }
    });

    return stats;
};

// Vista previa del reporte
window.previsualizarReporte = async function() {
    await cargarDatosReporte();
    const registrosFiltrados = filtrarDatosReporte();
    const stats = generarEstadisticasReporte(registrosFiltrados);

    const preview = document.getElementById('reportPreview');
    const content = document.getElementById('reportPreviewContent');

    content.innerHTML = `
        <div class="stats-summary">
            <div class="stat-item">
                <strong>📊 Total Registros:</strong> ${stats.totalRegistros}
            </div>
            <div class="stat-item">
                <strong>🏢 Clientes Únicos:</strong> ${stats.clientesUnicos}
            </div>
            <div class="stat-item">
                <strong>👥 Consultores Activos:</strong> ${stats.consultoresActivos}
            </div>
            <div class="stat-item">
                <strong>🌍 Gerencias Activas:</strong> ${stats.gerenciasActivas}
            </div>
        </div>

        <div class="stats-detail">
            <h5>📈 Top Tipos de Interacción:</h5>
            ${Object.entries(stats.tiposInteraccion)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([tipo, count]) => `<div>${tipo}: ${count} registros</div>`)
                .join('')}
        </div>

        <div class="stats-detail">
            <h5>👥 Actividad por Consultor:</h5>
            ${Object.entries(stats.actividadPorConsultor)
                .sort((a, b) => b[1] - a[1])
                .map(([consultor, count]) => {
                    const usuario = reporteData.usuarios[consultor];
                    const nombre = usuario ? usuario.nombre : consultor;
                    return `<div>${nombre}: ${count} registros</div>`;
                })
                .join('')}
        </div>
    `;

    preview.style.display = 'block';
};

// Generar reporte ejecutivo
window.generarReporteEjecutivo = async function() {
    await cargarDatosReporte();
    const registrosFiltrados = filtrarDatosReporte();
    const stats = generarEstadisticasReporte(registrosFiltrados);

    if (registrosFiltrados.length === 0) {
        alert('⚠️ No hay datos para el período y filtros seleccionados');
        return;
    }

    alert(`📊 Reporte Ejecutivo generado: ${stats.totalRegistros} registros encontrados. Use los botones de exportación para descargar.`);
};

// Generar reporte detallado
window.generarReporteDetallado = async function() {
    await cargarDatosReporte();
    const registrosFiltrados = filtrarDatosReporte();

    if (registrosFiltrados.length === 0) {
        alert('⚠️ No hay datos para el período y filtros seleccionados');
        return;
    }

    alert(`📋 Reporte Detallado generado: ${registrosFiltrados.length} registros. Use los botones de exportación para descargar.`);
};

// Exportar reporte a PDF
window.exportarReportePDF = async function() {
    await cargarDatosReporte();
    const registrosFiltrados = filtrarDatosReporte();
    const stats = generarEstadisticasReporte(registrosFiltrados);

    if (registrosFiltrados.length === 0) {
        alert('⚠️ No hay datos para exportar');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;

        // Configurar jsPDF con soporte mejorado para UTF-8
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            putOnlyUsedFonts: true,
            floatPrecision: 16
        });

        // Configurar jsPDF para UTF-8
        try {
            doc.setFont("helvetica");
            doc.setCharSpace(0);
        } catch (error) {
            console.warn('No se pudo configurar fuente UTF-8');
        }

        // Función mejorada para caracteres especiales en PDF
        function processTextForPDF(text) {
            if (!text) return '';

            let processedText = String(text);

            // Mapeo de caracteres especiales para jsPDF
            const charMap = {
                'á': '\u00E1', 'é': '\u00E9', 'í': '\u00ED', 'ó': '\u00F3', 'ú': '\u00FA',
                'Á': '\u00C1', 'É': '\u00C9', 'Í': '\u00CD', 'Ó': '\u00D3', 'Ú': '\u00DA',
                'ñ': '\u00F1', 'Ñ': '\u00D1', 'ü': '\u00FC', 'Ü': '\u00DC',
                '¿': '\u00BF', '¡': '\u00A1'
            };

            // Usar códigos Unicode explícitos
            for (const [char, code] of Object.entries(charMap)) {
                processedText = processedText.replace(new RegExp(char, 'g'), code);
            }

            // Limpiar caracteres problemáticos
            processedText = processedText
                .replace(/[""]/g, '"')
                .replace(/['']/g, "'")
                .replace(/–/g, '-')
                .replace(/—/g, '-')
                .replace(/…/g, '...')
                .replace(/\u00A0/g, ' ');

            return processedText;
        }

        // Alias para compatibilidad
        const prepareTextForPDF = processTextForPDF;

        // Encabezado
        doc.setFontSize(18);
        doc.text(prepareTextForPDF('REPORTE EJECUTIVO - UNIVERSITY OF DAYTON PUBLISHING'), 14, 20);
        doc.setFontSize(12);
        doc.text(prepareTextForPDF(`Período: ${document.getElementById('reportFechaInicio').value} - ${document.getElementById('reportFechaFin').value}`), 14, 30);
        doc.text(prepareTextForPDF(`Generado: ${new Date().toLocaleDateString('es-MX')}`), 14, 38);

        let yPos = 50;

        // Resumen ejecutivo
        doc.setFontSize(14);
        doc.text(prepareTextForPDF('RESUMEN EJECUTIVO'), 14, yPos);
        yPos += 10;

        doc.setFontSize(10);
        doc.text(prepareTextForPDF(`Total de Interacciones: ${stats.totalRegistros}`), 14, yPos);
        yPos += 6;
        doc.text(prepareTextForPDF(`Clientes Únicos: ${stats.clientesUnicos}`), 14, yPos);
        yPos += 6;
        doc.text(prepareTextForPDF(`Consultores Activos: ${stats.consultoresActivos}`), 14, yPos);
        yPos += 6;
        doc.text(prepareTextForPDF(`Gerencias Cubiertas: ${stats.gerenciasActivas}`), 14, yPos);
        yPos += 15;

        // Actividad por consultor
        doc.setFontSize(12);
        doc.text(prepareTextForPDF('ACTIVIDAD POR CONSULTOR'), 14, yPos);
        yPos += 8;

        doc.setFontSize(10);
        Object.entries(stats.actividadPorConsultor)
            .sort((a, b) => b[1] - a[1])
            .forEach(([consultor, count]) => {
                const usuario = reporteData.usuarios[consultor];
                const nombre = usuario ? usuario.nombre : consultor;
                const porcentaje = ((count / stats.totalRegistros) * 100).toFixed(1);
                doc.text(prepareTextForPDF(`${nombre}: ${count} registros (${porcentaje}%)`), 14, yPos);
                yPos += 6;
            });

        const fileName = `reporte_ejecutivo_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);

        alert(`✅ Reporte PDF exportado: ${fileName}`);

    } catch (error) {
        console.error('❌ Error exportando PDF:', error);
        alert('Error al generar PDF. Verifique que jsPDF esté cargado.');
    }
};

// Exportar reporte a Excel
window.exportarReporteExcel = async function() {
    await cargarDatosReporte();
    const registrosFiltrados = filtrarDatosReporte();
    const stats = generarEstadisticasReporte(registrosFiltrados);

    if (registrosFiltrados.length === 0) {
        alert('⚠️ No hay datos para exportar');
        return;
    }

    try {
        const wb = XLSX.utils.book_new();

        // Configurar propiedades del workbook para UTF-8
        wb.Props = {
            Title: "Reporte University of Dayton Publishing",
            Subject: "Reporte de Seguimiento de Clientes",
            Author: "Sistema de Seguimiento UDP",
            CreatedDate: new Date()
        };

        // Hoja 1: Resumen Ejecutivo
        const resumenData = [
            ['REPORTE UNIVERSITY OF DAYTON PUBLISHING', ''],
            ['Período', `${document.getElementById('reportFechaInicio').value} - ${document.getElementById('reportFechaFin').value}`],
            ['Generado', new Date().toLocaleDateString('es-MX')],
            ['', ''],
            ['MÉTRICAS PRINCIPALES', ''],
            ['Total Interacciones', stats.totalRegistros],
            ['Clientes Únicos', stats.clientesUnicos],
            ['Consultores Activos', stats.consultoresActivos],
            ['Gerencias Cubiertas', stats.gerenciasActivas],
            ['', ''],
            ['ACTIVIDAD POR CONSULTOR', 'REGISTROS']
        ];

        Object.entries(stats.actividadPorConsultor)
            .sort((a, b) => b[1] - a[1])
            .forEach(([consultor, count]) => {
                const usuario = reporteData.usuarios[consultor];
                const nombre = usuario ? usuario.nombre : consultor;
                resumenData.push([nombre, count]);
            });

        const ws1 = XLSX.utils.aoa_to_sheet(resumenData);
        XLSX.utils.book_append_sheet(wb, ws1, 'Resumen Ejecutivo');

        // Hoja 2: Datos Detallados
        const headers = ['Fecha', 'Tipo', 'Cliente', 'Gerencia', 'Zona', 'Consultor', 'Descripción', 'Creado Por'];
        const detailedData = registrosFiltrados.map(r => [
            safeGet(r, 'fecha'),
            safeGet(r, 'tipoInteraccion'),
            safeGet(r, 'cliente'),
            safeGet(r, 'gerencia'),
            safeGet(r, 'zona'),
            safeGet(r, 'consultor'),
            safeGet(r, 'descripcion'),
            safeGet(r, 'creadoPor')
        ]);

        const ws2 = XLSX.utils.aoa_to_sheet([headers, ...detailedData]);
        XLSX.utils.book_append_sheet(wb, ws2, 'Registros Detallados');

        const fileName = `reporte_detallado_${new Date().toISOString().split('T')[0]}.xlsx`;

        // Método alternativo: generar como buffer con BOM UTF-8
        try {
            // Intentar usar el método con BOM UTF-8
            const wbout = XLSX.write(wb, {
                bookType: 'xlsx',
                type: 'array',
                compression: true
            });

            // Crear blob con BOM UTF-8
            const blob = new Blob([wbout], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
            });

            // Descargar usando blob
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.warn('Método con BOM falló, usando método tradicional:', error);
            // Fallback al método original
            XLSX.writeFile(wb, fileName);
        }

        alert(`✅ Reporte Excel exportado: ${fileName}`);

    } catch (error) {
        console.error('❌ Error exportando Excel:', error);
        alert('Error al generar Excel. Verifique que XLSX esté cargado.');
    }
};

// Exportar reporte a CSV
window.exportarReporteCSV = async function() {
    await cargarDatosReporte();
    const registrosFiltrados = filtrarDatosReporte();

    if (registrosFiltrados.length === 0) {
        alert('⚠️ No hay datos para exportar');
        return;
    }

    try {
        const headers = ['Fecha', 'Tipo', 'Cliente', 'Gerencia', 'Zona', 'Consultor', 'Descripción', 'Creado Por'];
        const rows = registrosFiltrados.map(r => [
            safeGet(r, 'fecha'),
            safeGet(r, 'tipoInteraccion'),
            safeGet(r, 'cliente'),
            safeGet(r, 'gerencia'),
            safeGet(r, 'zona'),
            safeGet(r, 'consultor'),
            safeGet(r, 'descripcion'),
            safeGet(r, 'creadoPor')
        ]);

        const csvContent = "\\uFEFF" + [
            headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
            ...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
        ].join('\\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const fileName = `reporte_analitico_${new Date().toISOString().split('T')[0]}.csv`;

        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.click();
        URL.revokeObjectURL(url);

        alert(`✅ Reporte CSV exportado: ${fileName}`);

    } catch (error) {
        console.error('❌ Error exportando CSV:', error);
        alert('Error al generar CSV.');
    }
};

// Función auxiliar para obtener valores seguros
function safeGet(obj, key) {
    return obj && typeof obj === 'object' ? obj[key] || '' : '';
}

// ====================================================================
// FUNCIONES DE MANTENIMIENTO DE USUARIOS
// ====================================================================

// Limpiar usuarios duplicados
window.limpiarUsuariosDuplicados = async function() {
    if (!confirm('⚠️ Esto limpiará usuarios duplicados basándose en los nombres de usuario únicos.\n¿Continuar?')) {
        return;
    }

    try {
        const usuarios = window.sistemaAuth.obtenerUsuarios();
        const usuariosLimpios = {};
        let eliminados = 0;

        // Mantener solo una versión de cada usuario (por nombre de usuario)
        Object.entries(usuarios).forEach(([username, usuario]) => {
            if (!usuariosLimpios[username.toLowerCase()]) {
                usuariosLimpios[username.toLowerCase()] = usuario;
            } else {
                eliminados++;
                console.log(`Eliminando duplicado: ${username}`);
            }
        });

        // Guardar usuarios limpios
        localStorage.setItem('usuarios_sistema', JSON.stringify(usuariosLimpios));

        // Sincronizar con GitHub
        const sync = new GitHubSync();
        await sync.guardarUsuariosEnGitHub();

        alert(`✅ Limpieza completada.\n${eliminados} usuarios duplicados eliminados.`);

        // Recargar panel
        cerrarPanelAdmin();
        abrirPanelAdmin();

    } catch (error) {
        console.error('Error limpiando usuarios:', error);
        alert(`❌ Error: ${error.message}`);
    }
};

// Forzar sincronización desde GitHub (GitHub como fuente de verdad)
window.forzarSincronizacionDesdeGitHub = async function() {
    if (!confirm('⚠️ Esto sobrescribirá todos los usuarios locales con los datos de GitHub.\n¿Continuar?')) {
        return;
    }

    try {
        const sync = new GitHubSync();
        await sync.sincronizarUsuarios();

        alert('✅ Sincronización forzada completada.\nUsuarios actualizados desde GitHub.');

        // Recargar panel
        cerrarPanelAdmin();
        abrirPanelAdmin();

    } catch (error) {
        console.error('Error en sincronización forzada:', error);
        alert(`❌ Error: ${error.message}`);
    }
};
