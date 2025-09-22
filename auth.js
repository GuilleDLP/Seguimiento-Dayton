// Sistema de Autenticación para Seguimiento de Clientes
// Compatible con el backend compartido de GitHub

class SistemaAutenticacion {
    constructor() {
        this.sessionKey = 'seguimiento_sesion';
        this.usuariosKey = 'usuarios_sistema';
        this.intentosFallidos = {};
        this.maxIntentos = 3;
        this.tiempoBloqueo = 5 * 60 * 1000; // 5 minutos
    }

    inicializarUsuariosPredeterminados() {
        const usuariosBase = this.obtenerUsuariosBase();

        // Solo inicializar si no hay usuarios en el sistema
        const usuariosExistentes = localStorage.getItem(this.usuariosKey);
        if (!usuariosExistentes) {
            localStorage.setItem(this.usuariosKey, JSON.stringify(usuariosBase));
            console.log('✅ Usuarios base inicializados');
        }

        const fechaBase = new Date().toISOString();
        return {
            mensaje: 'Sistema inicializado',
            fecha: fechaBase,
            usuariosCreados: Object.keys(usuariosBase).length
        };
    }

    obtenerUsuariosBase() {
        return {
            'admin': {
                password: this.hashPassword('admin123'),
                nombre: 'Administrador',
                rol: 'admin',
                email: 'admin@udp.mx',
                activo: true,
                fechaCreacion: new Date().toISOString(),
                ultimoAcceso: null,
                accesos: 0
            },
            'gdelaparra': {
                password: this.hashPassword('gdelaparra2024'),
                nombre: 'Guillermo de la Parra',
                rol: 'usuario',
                email: 'guillermo.delaparra@grupo-sm.com',
                activo: true,
                fechaCreacion: new Date().toISOString(),
                ultimoAcceso: null,
                accesos: 0
            },
            'hpineda': {
                password: this.hashPassword('hpineda2024'),
                nombre: 'Homero Pineda',
                rol: 'usuario',
                email: 'homero.pineda@grupo-sm.com',
                activo: true,
                fechaCreacion: new Date().toISOString(),
                ultimoAcceso: null,
                accesos: 0
            },
            'fvillarreal': {
                password: this.hashPassword('fvillarreal2024'),
                nombre: 'Fernanda Villarreal',
                rol: 'usuario',
                email: 'fernanda.villarreal@grupo-sm.com',
                activo: true,
                fechaCreacion: new Date().toISOString(),
                ultimoAcceso: null,
                accesos: 0
            },
            'aaguilar': {
                password: this.hashPassword('aaguilar2024'),
                nombre: 'Ana Aguilar',
                rol: 'usuario',
                email: 'ana.aguilar@grupo-sm.com',
                activo: true,
                fechaCreacion: new Date().toISOString(),
                ultimoAcceso: null,
                accesos: 0
            }
        };
    }

    hashPassword(password) {
        // Implementación simple de hash para demostración
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    sincronizarConUsuariosBase() {
        const usuariosBase = this.obtenerUsuariosBase();
        const usuariosActuales = this.obtenerUsuarios() || {};

        // Agregar usuarios base que no existen
        Object.keys(usuariosBase).forEach(username => {
            if (!usuariosActuales[username]) {
                usuariosActuales[username] = usuariosBase[username];
                console.log(`✅ Usuario base agregado: ${username}`);
            }
        });

        // Solo asegurar que admin mantenga su rol de administrador
        if (usuariosActuales['admin']) {
            usuariosActuales['admin'].rol = 'admin';
        }

        localStorage.setItem(this.usuariosKey, JSON.stringify(usuariosActuales));
        return usuariosActuales;
    }

    obtenerUsuarios() {
        const usuarios = localStorage.getItem(this.usuariosKey);
        try {
            return usuarios ? JSON.parse(usuarios) : null;
        } catch (error) {
            console.error('Error al parsear usuarios:', error);
            return null;
        }
    }

    async login(username, password) {
        const usuarios = this.obtenerUsuarios();
        const usuario = usuarios[username.toLowerCase()];

        if (!usuario) {
            throw new Error('Usuario o contraseña incorrectos');
        }

        if (!usuario.activo) {
            throw new Error('Usuario desactivado. Contacte al administrador.');
        }

        // Verificar bloqueo por intentos fallidos
        if (this.estaUsuarioBloqueado(username)) {
            const tiempoRestante = this.obtenerTiempoBloqueoRestante(username);
            throw new Error(`Usuario bloqueado. Intente en ${Math.ceil(tiempoRestante / 60000)} minutos.`);
        }

        if (usuario.password !== this.hashPassword(password)) {
            this.registrarIntentoFallido(username);
            throw new Error('Usuario o contraseña incorrectos');
        }

        // Login exitoso
        this.limpiarIntentosFallidos(username);

        const sesion = {
            username: username.toLowerCase(),
            nombre: usuario.nombre,
            rol: usuario.rol,
            email: usuario.email,
            inicioSesion: new Date().toISOString()
        };

        localStorage.setItem(this.sessionKey, JSON.stringify(sesion));

        // Actualizar último acceso y contador
        usuario.ultimoAcceso = new Date().toISOString();
        usuario.accesos = (usuario.accesos || 0) + 1;
        usuarios[username.toLowerCase()] = usuario;
        localStorage.setItem(this.usuariosKey, JSON.stringify(usuarios));

        // Actualizar la interfaz
        this.actualizarInterfazUsuario(usuario);

        return usuario;
    }

    actualizarInterfazUsuario(usuario) {
        const userInfo = document.getElementById('userInfo');
        if (userInfo) {
            userInfo.innerHTML = `
                <span>👤 ${usuario.nombre}</span>
                ${usuario.rol === 'admin' ? '<span class="badge-admin">Admin</span>' : ''}
                <button class="btn-logout" onclick="sistemaAuth.logout()">Cerrar Sesión</button>
            `;
            userInfo.style.display = 'flex';
        }

        // Mostrar contenido principal
        const mainContent = document.querySelector('.container');
        if (mainContent) {
            mainContent.style.display = 'block';
        }
    }

    logout() {
        localStorage.removeItem(this.sessionKey);
        window.location.reload();
    }

    obtenerSesionActual() {
        try {
            const sesion = localStorage.getItem(this.sessionKey);
            if (!sesion) return null;

            const sesionObj = JSON.parse(sesion);

            // Verificar si la sesión ha expirado (24 horas)
            const inicioSesion = new Date(sesionObj.inicioSesion);
            const ahora = new Date();
            const horasTranscurridas = (ahora - inicioSesion) / (1000 * 60 * 60);

            if (horasTranscurridas > 24) {
                this.logout();
                return null;
            }

            return sesionObj;
        } catch (error) {
            console.error('Error al obtener sesión:', error);
            return null;
        }
    }

    esAdmin() {
        const sesion = this.obtenerSesionActual();
        return sesion && sesion.rol === 'admin';
    }

    estaAutenticado() {
        return this.obtenerSesionActual() !== null;
    }

    // Sistema anti fuerza bruta
    registrarIntentoFallido(username) {
        const ahora = Date.now();
        if (!this.intentosFallidos[username]) {
            this.intentosFallidos[username] = [];
        }
        this.intentosFallidos[username].push(ahora);

        // Limpiar intentos antiguos
        this.intentosFallidos[username] = this.intentosFallidos[username].filter(
            tiempo => ahora - tiempo < this.tiempoBloqueo
        );
    }

    limpiarIntentosFallidos(username) {
        delete this.intentosFallidos[username];
    }

    estaUsuarioBloqueado(username) {
        if (!this.intentosFallidos[username]) return false;

        const intentosRecientes = this.intentosFallidos[username].filter(
            tiempo => Date.now() - tiempo < this.tiempoBloqueo
        );

        return intentosRecientes.length >= this.maxIntentos;
    }

    obtenerTiempoBloqueoRestante(username) {
        if (!this.intentosFallidos[username]) return 0;

        const ultimoIntento = Math.max(...this.intentosFallidos[username]);
        const tiempoTranscurrido = Date.now() - ultimoIntento;

        return Math.max(0, this.tiempoBloqueo - tiempoTranscurrido);
    }

    // Gestión de usuarios para administradores
    crearUsuario(datosUsuario) {
        if (!this.esAdmin()) {
            throw new Error('No tiene permisos para crear usuarios');
        }

        const usuarios = this.obtenerUsuarios();
        const username = datosUsuario.username.toLowerCase();

        if (usuarios[username]) {
            throw new Error('El usuario ya existe');
        }

        const nuevoUsuario = {
            password: this.hashPassword(datosUsuario.password),
            nombre: datosUsuario.nombre,
            rol: datosUsuario.rol || 'usuario',
            email: datosUsuario.email,
            activo: true,
            fechaCreacion: new Date().toISOString(),
            ultimoAcceso: null,
            accesos: 0
        };

        usuarios[username] = nuevoUsuario;
        localStorage.setItem(this.usuariosKey, JSON.stringify(usuarios));

        console.log(`✅ Usuario creado: ${username}`);
        return nuevoUsuario;
    }

    actualizarUsuario(username, datosActualizacion) {
        if (!this.esAdmin()) {
            throw new Error('No tiene permisos para actualizar usuarios');
        }

        const usuarios = this.obtenerUsuarios();
        const usuario = usuarios[username.toLowerCase()];

        if (!usuario) {
            throw new Error('Usuario no encontrado');
        }

        // Actualizar datos permitidos
        if (datosActualizacion.nombre) usuario.nombre = datosActualizacion.nombre;
        if (datosActualizacion.email) usuario.email = datosActualizacion.email;
        if (datosActualizacion.rol) usuario.rol = datosActualizacion.rol;
        if (datosActualizacion.activo !== undefined) usuario.activo = datosActualizacion.activo;
        if (datosActualizacion.password) {
            usuario.password = this.hashPassword(datosActualizacion.password);
        }

        usuarios[username.toLowerCase()] = usuario;
        localStorage.setItem(this.usuariosKey, JSON.stringify(usuarios));

        console.log(`✅ Usuario actualizado: ${username}`);
        return usuario;
    }

    eliminarUsuario(username) {
        if (!this.esAdmin()) {
            throw new Error('No tiene permisos para eliminar usuarios');
        }

        const usuarios = this.obtenerUsuarios();

        if (!usuarios[username.toLowerCase()]) {
            throw new Error('Usuario no encontrado');
        }

        // No permitir eliminar el usuario admin del sistema
        if (username.toLowerCase() === 'admin') {
            throw new Error('No se puede eliminar el usuario administrador del sistema');
        }

        delete usuarios[username.toLowerCase()];
        localStorage.setItem(this.usuariosKey, JSON.stringify(usuarios));

        console.log(`✅ Usuario eliminado: ${username}`);
        return true;
    }
}

// Clase para manejar la interfaz de login
class InterfazLogin {
    constructor(sistemaAuth) {
        this.auth = sistemaAuth;
        this.intentosLogin = 0;
    }

    mostrarLogin() {
        const loginHTML = `
            <div id="loginContainer" class="login-container">
                <div class="login-card">
                    <div class="login-header">
                        <h2>🔐 Iniciar Sesión</h2>
                        <p>Seguimiento de Clientes - UDP</p>
                    </div>

                    <form id="loginForm" class="login-form">
                        <div class="form-group">
                            <label for="loginUsername">Usuario</label>
                            <input type="text" id="loginUsername" required autocomplete="username"
                                placeholder="Ingrese su usuario">
                        </div>

                        <div class="form-group">
                            <label for="loginPassword">Contraseña</label>
                            <div class="password-field">
                                <input type="password" id="loginPassword" required autocomplete="current-password"
                                    placeholder="Ingrese su contraseña">
                                <button type="button" class="toggle-password" onclick="togglePasswordVisibility()">
                                    👁️
                                </button>
                            </div>
                        </div>

                        <div id="loginMessage" class="message" style="display: none;"></div>

                        <button type="submit" class="btn-login">
                            Iniciar Sesión
                        </button>
                    </form>

                    <div class="login-footer">
                        <p>Si olvidó su contraseña, contacte al administrador</p>
                    </div>
                </div>
            </div>
        `;

        // Agregar estilos para el login
        const estilosLogin = `
            <style id="loginStyles">
                .login-container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10000;
                }

                .login-card {
                    background: white;
                    padding: 40px;
                    border-radius: 15px;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                    width: 100%;
                    max-width: 400px;
                }

                .login-header {
                    text-align: center;
                    margin-bottom: 30px;
                }

                .login-header h2 {
                    color: #2c3e50;
                    margin-bottom: 10px;
                }

                .login-header p {
                    color: #7f8c8d;
                    font-size: 14px;
                }

                .login-form .form-group {
                    margin-bottom: 20px;
                }

                .login-form label {
                    display: block;
                    margin-bottom: 8px;
                    color: #2c3e50;
                    font-weight: 600;
                }

                .login-form input {
                    width: 100%;
                    padding: 12px;
                    border: 2px solid #e1e8ed;
                    border-radius: 8px;
                    font-size: 16px;
                    transition: all 0.3s;
                }

                .login-form input:focus {
                    outline: none;
                    border-color: #667eea;
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                .password-field {
                    position: relative;
                }

                .toggle-password {
                    position: absolute;
                    right: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 20px;
                    opacity: 0.7;
                    transition: opacity 0.3s;
                }

                .toggle-password:hover {
                    opacity: 1;
                }

                .btn-login {
                    width: 100%;
                    padding: 14px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s;
                }

                .btn-login:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
                }

                .message {
                    padding: 12px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    text-align: center;
                    font-size: 14px;
                }

                .message.error {
                    background: #ffe6e6;
                    color: #dc3545;
                    border: 1px solid #ffcccc;
                }

                .message.success {
                    background: #e6ffe6;
                    color: #28a745;
                    border: 1px solid #ccffcc;
                }

                .login-footer {
                    text-align: center;
                    margin-top: 20px;
                    padding-top: 20px;
                    border-top: 1px solid #e1e8ed;
                }

                .login-footer p {
                    color: #7f8c8d;
                    font-size: 14px;
                }

                .badge-admin {
                    background: #ff6b6b;
                    color: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    margin-left: 8px;
                }

                .user-info {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    color: white;
                }

                .btn-logout {
                    background: rgba(255,255,255,0.2);
                    color: white;
                    border: 1px solid rgba(255,255,255,0.3);
                    padding: 8px 15px;
                    border-radius: 20px;
                    cursor: pointer;
                    transition: all 0.3s;
                }

                .btn-logout:hover {
                    background: rgba(255,255,255,0.3);
                }
            </style>
        `;

        // Insertar estilos y HTML
        if (!document.getElementById('loginStyles')) {
            document.head.insertAdjacentHTML('beforeend', estilosLogin);
        }

        document.body.insertAdjacentHTML('afterbegin', loginHTML);

        // Configurar evento del formulario
        this.configurarEventos();
    }

    configurarEventos() {
        const form = document.getElementById('loginForm');
        if (form) {
            form.addEventListener('submit', (e) => this.manejarLogin(e));
        }

        // Enfocar el campo de usuario
        const usernameInput = document.getElementById('loginUsername');
        if (usernameInput) {
            usernameInput.focus();
        }
    }

    async manejarLogin(event) {
        event.preventDefault();

        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        const messageDiv = document.getElementById('loginMessage');

        if (!username || !password) {
            this.mostrarMensaje('Por favor complete todos los campos', 'error');
            return;
        }

        try {
            const usuario = await this.auth.login(username, password);
            this.mostrarMensaje(`¡Bienvenido ${usuario.nombre}!`, 'success');

            setTimeout(() => {
                this.ocultarLogin();
                // Recargar la página para aplicar los permisos
                window.location.reload();
            }, 1000);
        } catch (error) {
            this.intentosLogin++;
            this.mostrarMensaje(error.message, 'error');

            // Limpiar campos después de varios intentos
            if (this.intentosLogin >= 3) {
                document.getElementById('loginPassword').value = '';
            }
        }
    }

    mostrarMensaje(mensaje, tipo) {
        const messageDiv = document.getElementById('loginMessage');
        messageDiv.className = `message ${tipo}`;
        messageDiv.textContent = mensaje;
        messageDiv.style.display = 'block';
    }

    ocultarLogin() {
        const loginContainer = document.getElementById('loginContainer');
        if (loginContainer) {
            loginContainer.remove();
        }
    }

    mostrarBotonAdmin() {
        const sesion = this.auth.obtenerSesionActual();
        if (sesion && sesion.rol === 'admin') {
            const userInfo = document.querySelector('.user-info');
            if (userInfo && !document.querySelector('.btn-admin-header')) {
                const adminButton = document.createElement('button');
                adminButton.textContent = '⚙️ Admin';
                adminButton.onclick = () => window.abrirPanelAdmin();
                adminButton.className = 'btn-admin-header';
                adminButton.style.cssText = `
                    background: rgba(255, 193, 7, 0.2);
                    color: #ffc107;
                    border: 1px solid #ffc107;
                    padding: 8px 15px;
                    border-radius: 20px;
                    cursor: pointer;
                    transition: all 0.3s;
                    margin-right: 10px;
                `;

                adminButton.onmouseover = () => {
                    adminButton.style.background = 'rgba(255, 193, 7, 0.3)';
                    adminButton.style.transform = 'translateY(-1px)';
                };

                adminButton.onmouseout = () => {
                    adminButton.style.background = 'rgba(255, 193, 7, 0.2)';
                    adminButton.style.transform = 'translateY(0)';
                };

                const logoutButton = userInfo.querySelector('.btn-logout');
                userInfo.insertBefore(adminButton, logoutButton);
            }
        }
    }
}

// Función auxiliar para mostrar/ocultar contraseña
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('loginPassword');
    const toggleButton = document.querySelector('.toggle-password');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleButton.textContent = '🙈';
    } else {
        passwordInput.type = 'password';
        toggleButton.textContent = '👁️';
    }
}

// Inicialización del sistema
let sistemaAuth = null;
let interfazLogin = null;

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🔐 Inicializando sistema de autenticación...');

    // Crear instancias del sistema
    sistemaAuth = new SistemaAutenticacion();
    interfazLogin = new InterfazLogin(sistemaAuth);

    // Hacer disponible globalmente para el panel de admin
    window.sistemaAuth = sistemaAuth;

    // Inicializar usuarios base
    sistemaAuth.inicializarUsuariosPredeterminados();
    sistemaAuth.sincronizarConUsuariosBase();

    // Verificar si hay sesión activa
    const sesionActual = sistemaAuth.obtenerSesionActual();

    if (!sesionActual) {
        // Mostrar login y ocultar contenido
        interfazLogin.mostrarLogin();
        const mainContainer = document.querySelector('.container');
        if (mainContainer) {
            mainContainer.style.display = 'none';
        }
    } else {
        // Usuario autenticado
        console.log(`✅ Sesión activa: ${sesionActual.nombre}`);
        sistemaAuth.actualizarInterfazUsuario(sesionActual);

        // Mostrar botón de admin si corresponde
        setTimeout(() => interfazLogin.mostrarBotonAdmin(), 100);
    }
});

// Exportar para uso en otros módulos
window.SistemaAutenticacion = SistemaAutenticacion;
window.InterfazLogin = InterfazLogin;