// Sistema de Sincronización con GitHub para Seguimiento de Clientes
// Compatible con el backend compartido con Reporte de Visitas

class GitHubSync {
    constructor() {
        this.config = null;
        this.baseUrl = 'https://api.github.com';
        this.dataPath = 'data';
        this.ultimaSincronizacion = null;
        this.sincronizandoActualmente = false;
    }

    // Inicializar configuración
    inicializar() {
        this.config = window.obtenerConfiguracionGitHub();
        if (!this.config) {
            console.warn('⚠️ No hay configuración de GitHub');
            return false;
        }
        return true;
    }

    // Obtener headers para las peticiones
    obtenerHeaders() {
        return {
            'Authorization': `token ${this.config.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };
    }

    // Obtener URL del archivo
    obtenerUrlArchivo(nombreArchivo) {
        return `${this.baseUrl}/repos/${this.config.user}/${this.config.repo}/contents/${this.dataPath}/${nombreArchivo}`;
    }

    // Leer archivo de GitHub
    async leerArchivo(nombreArchivo) {
        if (!this.inicializar()) return null;

        try {
            const response = await fetch(this.obtenerUrlArchivo(nombreArchivo), {
                headers: this.obtenerHeaders()
            });

            if (response.status === 404) {
                console.log(`📄 Archivo ${nombreArchivo} no existe en GitHub`);
                return null;
            }

            if (!response.ok) {
                throw new Error(`Error al leer ${nombreArchivo}: ${response.statusText}`);
            }

            const data = await response.json();
            const contenido = atob(data.content);
            return {
                contenido: JSON.parse(contenido),
                sha: data.sha
            };
        } catch (error) {
            console.error(`❌ Error leyendo ${nombreArchivo} de GitHub:`, error);
            return null;
        }
    }

    // Escribir archivo en GitHub
    async escribirArchivo(nombreArchivo, contenido, mensaje = 'Actualización automática') {
        if (!this.inicializar()) return false;

        try {
            console.log(`🔄 Intentando escribir ${nombreArchivo} en GitHub...`);

            // Obtener SHA actual si existe
            const archivoActual = await this.leerArchivo(nombreArchivo);
            const sha = archivoActual ? archivoActual.sha : null;
            console.log(`📄 SHA actual: ${sha ? 'Existe' : 'Nuevo archivo'}`);

            // Preparar contenido
            const contenidoBase64 = btoa(JSON.stringify(contenido, null, 2));
            console.log(`📝 Contenido preparado (${contenidoBase64.length} chars)`);

            const body = {
                message: `${mensaje} - ${new Date().toLocaleString('es-MX')}`,
                content: contenidoBase64
            };

            if (sha) {
                body.sha = sha;
            }

            console.log(`📡 Enviando a: ${this.obtenerUrlArchivo(nombreArchivo)}`);
            const response = await fetch(this.obtenerUrlArchivo(nombreArchivo), {
                method: 'PUT',
                headers: this.obtenerHeaders(),
                body: JSON.stringify(body)
            });

            console.log(`📊 Respuesta HTTP: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ Error detallado:`, errorText);
                throw new Error(`Error al escribir ${nombreArchivo}: ${response.status} ${response.statusText}`);
            }

            const responseData = await response.json();
            console.log(`✅ ${nombreArchivo} guardado en GitHub`, responseData);
            return true;
        } catch (error) {
            console.error(`❌ Error escribiendo ${nombreArchivo} en GitHub:`, error);
            console.error(`Stack trace:`, error.stack);
            return false;
        }
    }

    // Sincronizar usuarios con GitHub (compartido con Reporte de Visitas)
    async sincronizarUsuarios() {
        if (!this.inicializar()) return false;

        try {
            console.log('🔄 Sincronizando usuarios con GitHub...');

            // Leer usuarios de GitHub
            const usuariosGitHub = await this.leerArchivo('usuarios.json');

            if (usuariosGitHub && usuariosGitHub.contenido) {
                // GitHub es la fuente de verdad - reemplazar usuarios locales
                localStorage.setItem('usuarios_sistema', JSON.stringify(usuariosGitHub.contenido));
                console.log('✅ Usuarios sincronizados desde GitHub');
                return true;
            } else {
                // Si no existe el archivo, crear con usuarios locales
                const usuariosLocales = window.sistemaAuth.obtenerUsuarios() || {};
                await this.escribirArchivo('usuarios.json', usuariosLocales, 'Creación inicial de usuarios');
                console.log('✅ Archivo de usuarios creado en GitHub');
                return true;
            }
        } catch (error) {
            console.error('❌ Error sincronizando usuarios:', error);
            return false;
        }
    }

    // Guardar cambios de usuarios en GitHub
    async guardarUsuariosEnGitHub() {
        if (!this.inicializar()) return false;

        try {
            const usuariosLocales = window.sistemaAuth.obtenerUsuarios() || {};
            await this.escribirArchivo('usuarios.json', usuariosLocales, 'Actualización de usuarios');
            console.log('✅ Usuarios guardados en GitHub');
            return true;
        } catch (error) {
            console.error('❌ Error guardando usuarios en GitHub:', error);
            return false;
        }
    }

    // Sincronizar datos de seguimiento
    async sincronizarSeguimiento() {
        if (!this.inicializar()) return false;

        try {
            console.log('🔄 Sincronizando datos de seguimiento con GitHub...');

            // Obtener registros locales de IndexedDB
            const registrosLocales = await this.obtenerRegistrosLocales();
            console.log(`📊 Registros locales encontrados: ${registrosLocales.length}`);

            // Leer datos de GitHub
            const seguimientoGitHub = await this.leerArchivo('seguimiento.json');

            let registrosMezclados = [...registrosLocales]; // Copia de los registros locales

            if (seguimientoGitHub && seguimientoGitHub.contenido) {
                console.log('✅ Archivo seguimiento.json encontrado en GitHub, mezclando datos...');
                // Mezclar registros con lógica de concurrencia mejorada
                const registrosGitHub = seguimientoGitHub.contenido.registros || [];
                console.log(`📊 Registros en GitHub: ${registrosGitHub.length}`);

                // Crear maps para facilitar la comparación
                const localesMap = new Map(registrosLocales.map(r => [r.id, r]));
                const githubMap = new Map(registrosGitHub.map(r => [r.id, r]));

                // Agregar todos los registros locales primero
                registrosMezclados = [...registrosLocales];

                // Inicializar contadores de conflictos
                let conflictosDetectados = 0;
                this.conflictosResueltos = this.conflictosResueltos || 0;

                // Procesar registros de GitHub
                registrosGitHub.forEach(registroGitHub => {
                    const registroLocal = localesMap.get(registroGitHub.id);

                    if (!registroLocal) {
                        // Registro solo existe en GitHub, agregarlo
                        registrosMezclados.push(registroGitHub);
                        console.log(`➕ Agregando registro solo de GitHub: ${registroGitHub.id}`);
                    } else {
                        // Registro existe en ambos lados, verificar si hay conflicto
                        const fechaLocal = new Date(registroLocal.fechaRegistro || registroLocal.ultimaModificacion || '1970-01-01');
                        const fechaGitHub = new Date(registroGitHub.fechaRegistro || registroGitHub.ultimaModificacion || '1970-01-01');

                        // Verificar si hay diferencias en el contenido
                        const hayDiferencias = JSON.stringify(registroLocal) !== JSON.stringify(registroGitHub);

                        if (hayDiferencias && Math.abs(fechaLocal - fechaGitHub) < 60000) {
                            // Conflicto detectado: cambios concurrentes en menos de 1 minuto
                            conflictosDetectados++;
                            this.conflictosResueltos++;
                            this.ultimoConflicto = {
                                registroId: registroGitHub.id,
                                fechaDeteccion: new Date().toISOString(),
                                usuarioLocal: registroLocal.creadoPor,
                                usuarioGitHub: registroGitHub.creadoPor
                            };
                            console.warn(`⚠️ Conflicto detectado en registro ${registroGitHub.id}: cambios concurrentes`);
                        }

                        if (fechaGitHub > fechaLocal) {
                            // Versión de GitHub es más reciente, reemplazar
                            const index = registrosMezclados.findIndex(r => r.id === registroGitHub.id);
                            if (index !== -1) {
                                registrosMezclados[index] = registroGitHub;
                                console.log(`🔄 Actualizando registro con versión de GitHub (más reciente): ${registroGitHub.id}`);
                            }
                        } else {
                            console.log(`📝 Manteniendo versión local de registro: ${registroLocal.id}`);
                        }
                    }
                });

                if (conflictosDetectados > 0) {
                    console.warn(`⚠️ Se detectaron y resolvieron ${conflictosDetectados} conflictos de concurrencia`);
                }
            } else {
                console.log('📝 Archivo seguimiento.json no existe en GitHub, será creado...');
            }

            // Ordenar por fecha
            registrosMezclados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

            // Preparar datos para guardar
            const datosGuardar = {
                registros: registrosMezclados,
                ultimaActualizacion: new Date().toISOString(),
                totalRegistros: registrosMezclados.length,
                metadata: {
                    aplicacion: 'Seguimiento de Clientes',
                    version: '2.0',
                    ultimaSincronizacion: new Date().toISOString()
                }
            };

            // SIEMPRE guardar en GitHub (crear o actualizar)
            console.log(`💾 Guardando ${registrosMezclados.length} registros en GitHub...`);

            // Agregar información de sincronización
            datosGuardar.metadata.conflictosResueltos = this.conflictosResueltos || 0;
            datosGuardar.metadata.ultimoConflicto = this.ultimoConflicto || null;

            const exitoEscritura = await this.escribirArchivo('seguimiento.json', datosGuardar, 'Sincronización de seguimiento');

            if (!exitoEscritura) {
                throw new Error('No se pudo escribir el archivo en GitHub');
            }

            // Actualizar IndexedDB local con los datos mezclados solo si hay nuevos datos
            if (registrosMezclados.length !== registrosLocales.length) {
                console.log('🔄 Actualizando IndexedDB local con datos mezclados...');
                await this.actualizarRegistrosLocales(registrosMezclados);
            }

            this.ultimaSincronizacion = new Date().toISOString();
            console.log(`✅ Seguimiento sincronizado exitosamente: ${registrosMezclados.length} registros`);

            return true;
        } catch (error) {
            console.error('❌ Error sincronizando seguimiento:', error);
            console.error('Stack trace:', error.stack);
            return false;
        }
    }

    // Obtener registros de IndexedDB
    async obtenerRegistrosLocales() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('SeguimientoDaytonDB', 1);

            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['registros'], 'readonly');
                const store = transaction.objectStore('registros');
                const getAllRequest = store.getAll();

                getAllRequest.onsuccess = () => {
                    resolve(getAllRequest.result || []);
                };

                getAllRequest.onerror = () => {
                    reject(getAllRequest.error);
                };
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Actualizar registros en IndexedDB
    async actualizarRegistrosLocales(registros) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('SeguimientoDaytonDB', 1);

            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['registros'], 'readwrite');
                const store = transaction.objectStore('registros');

                // Limpiar store actual
                const clearRequest = store.clear();

                clearRequest.onsuccess = () => {
                    // Agregar todos los registros
                    registros.forEach(registro => {
                        store.add(registro);
                    });

                    transaction.oncomplete = () => {
                        resolve(true);
                    };

                    transaction.onerror = () => {
                        reject(transaction.error);
                    };
                };

                clearRequest.onerror = () => {
                    reject(clearRequest.error);
                };
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Sincronización completa
    async sincronizacionCompleta() {
        if (this.sincronizandoActualmente) {
            console.log('⚠️ Sincronización ya en progreso');
            return false;
        }

        this.sincronizandoActualmente = true;
        mostrarIndicadorSincronizacion(true);

        try {
            // Sincronizar usuarios primero (compartido con Reporte de Visitas)
            await this.sincronizarUsuarios();

            // Sincronizar datos de seguimiento
            await this.sincronizarSeguimiento();

            // Sincronizar papelera
            await this.sincronizarPapelera();

            this.mostrarMensajeSincronizacion('✅ Sincronización completada', 'success');

            // Actualizar UI
            if (typeof cargarDatosYActualizarUI === 'function') {
                await cargarDatosYActualizarUI();
            }

            return true;
        } catch (error) {
            console.error('❌ Error en sincronización completa:', error);
            this.mostrarMensajeSincronizacion('❌ Error en sincronización', 'error');
            return false;
        } finally {
            this.sincronizandoActualmente = false;
            mostrarIndicadorSincronizacion(false);
        }
    }

    // Sincronizar papelera
    async sincronizarPapelera() {
        if (!this.inicializar()) return false;

        try {
            console.log('🗑️ Sincronizando papelera con GitHub...');

            // Obtener papelera local
            const papeleraLocal = await this.obtenerPapeleraLocal();
            console.log(`📊 Registros en papelera local: ${papeleraLocal.length}`);

            // Leer papelera de GitHub
            const papeleraGitHub = await this.leerArchivo('papelera_seguimiento.json');

            let papeleraMezclada = [...papeleraLocal]; // Copia de la papelera local

            if (papeleraGitHub && papeleraGitHub.contenido) {
                console.log('✅ Archivo papelera_seguimiento.json encontrado en GitHub, mezclando datos...');
                // Mezclar registros de papelera
                const registrosGitHub = papeleraGitHub.contenido.registros || [];
                console.log(`📊 Registros en papelera GitHub: ${registrosGitHub.length}`);

                const idsLocales = new Set(papeleraLocal.map(r => r.trashId || r.id));

                registrosGitHub.forEach(registro => {
                    const registroId = registro.trashId || registro.id;
                    if (!idsLocales.has(registroId)) {
                        papeleraMezclada.push(registro);
                        console.log(`➕ Agregando de papelera GitHub: ${registroId}`);
                    }
                });
            } else {
                console.log('📝 Archivo papelera_seguimiento.json no existe en GitHub, será creado...');
            }

            // Preparar datos para guardar
            const datosGuardar = {
                registros: papeleraMezclada,
                ultimaActualizacion: new Date().toISOString(),
                totalRegistros: papeleraMezclada.length,
                metadata: {
                    aplicacion: 'Seguimiento de Clientes',
                    version: '2.0',
                    ultimaSincronizacion: new Date().toISOString()
                }
            };

            // SIEMPRE guardar en GitHub (crear o actualizar)
            console.log(`💾 Guardando ${papeleraMezclada.length} registros de papelera en GitHub...`);
            const exitoEscritura = await this.escribirArchivo('papelera_seguimiento.json', datosGuardar, 'Sincronización de papelera');

            if (!exitoEscritura) {
                throw new Error('No se pudo escribir papelera en GitHub');
            }

            // Actualizar papelera local solo si hay nuevos datos
            if (papeleraMezclada.length !== papeleraLocal.length) {
                console.log('🔄 Actualizando papelera local con datos mezclados...');
                await this.actualizarPapeleraLocal(papeleraMezclada);
            }

            console.log(`✅ Papelera sincronizada exitosamente: ${papeleraMezclada.length} registros`);
            return true;
        } catch (error) {
            console.error('❌ Error sincronizando papelera:', error);
            console.error('Stack trace:', error.stack);
            return false;
        }
    }

    // Obtener papelera local
    async obtenerPapeleraLocal() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('SeguimientoDaytonDB', 1);

            request.onsuccess = (event) => {
                const db = event.target.result;

                // Verificar si el objectStore existe
                if (!db.objectStoreNames.contains('papelera')) {
                    resolve([]);
                    return;
                }

                const transaction = db.transaction(['papelera'], 'readonly');
                const store = transaction.objectStore('papelera');
                const getAllRequest = store.getAll();

                getAllRequest.onsuccess = () => {
                    resolve(getAllRequest.result || []);
                };

                getAllRequest.onerror = () => {
                    reject(getAllRequest.error);
                };
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Actualizar papelera local
    async actualizarPapeleraLocal(registros) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('SeguimientoDaytonDB', 1);

            request.onsuccess = (event) => {
                const db = event.target.result;

                // Verificar si el objectStore existe
                if (!db.objectStoreNames.contains('papelera')) {
                    resolve(true);
                    return;
                }

                const transaction = db.transaction(['papelera'], 'readwrite');
                const store = transaction.objectStore('papelera');

                // Limpiar store actual
                const clearRequest = store.clear();

                clearRequest.onsuccess = () => {
                    // Agregar todos los registros
                    registros.forEach(registro => {
                        store.add(registro);
                    });

                    transaction.oncomplete = () => {
                        resolve(true);
                    };

                    transaction.onerror = () => {
                        reject(transaction.error);
                    };
                };

                clearRequest.onerror = () => {
                    reject(clearRequest.error);
                };
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Mostrar mensaje de sincronización
    mostrarMensajeSincronizacion(mensaje, tipo) {
        // Crear o actualizar elemento de mensaje
        let mensajeDiv = document.getElementById('mensajeSincronizacion');

        if (!mensajeDiv) {
            mensajeDiv = document.createElement('div');
            mensajeDiv.id = 'mensajeSincronizacion';
            mensajeDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                z-index: 10000;
                transition: all 0.3s;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            `;
            document.body.appendChild(mensajeDiv);
        }

        // Aplicar estilos según el tipo
        if (tipo === 'success') {
            mensajeDiv.style.background = '#28a745';
            mensajeDiv.style.color = 'white';
        } else if (tipo === 'error') {
            mensajeDiv.style.background = '#dc3545';
            mensajeDiv.style.color = 'white';
        } else {
            mensajeDiv.style.background = '#007bff';
            mensajeDiv.style.color = 'white';
        }

        mensajeDiv.textContent = mensaje;
        mensajeDiv.style.display = 'block';

        // Ocultar después de 3 segundos
        setTimeout(() => {
            if (mensajeDiv) {
                mensajeDiv.style.display = 'none';
            }
        }, 3000);
    }

    // Verificar estado de sincronización
    async verificarEstado() {
        if (!this.inicializar()) {
            return {
                conectado: false,
                mensaje: 'No hay configuración de GitHub'
            };
        }

        try {
            const response = await fetch(`${this.baseUrl}/repos/${this.config.user}/${this.config.repo}`, {
                headers: this.obtenerHeaders()
            });

            if (response.ok) {
                return {
                    conectado: true,
                    mensaje: 'Conectado a GitHub',
                    ultimaSincronizacion: this.ultimaSincronizacion
                };
            } else {
                return {
                    conectado: false,
                    mensaje: 'Error de conexión con GitHub'
                };
            }
        } catch (error) {
            return {
                conectado: false,
                mensaje: 'Sin conexión a internet'
            };
        }
    }
}

// Función para mostrar indicador de sincronización
function mostrarIndicadorSincronizacion(mostrar) {
    let indicador = document.getElementById('indicadorSincronizacion');

    if (mostrar) {
        if (!indicador) {
            indicador = document.createElement('div');
            indicador.id = 'indicadorSincronizacion';
            indicador.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="spinner"></div>
                    <span>Sincronizando con GitHub...</span>
                </div>
            `;
            indicador.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                z-index: 10000;
                display: flex;
                align-items: center;
                gap: 10px;
            `;

            // Agregar estilos del spinner
            const spinnerStyle = document.createElement('style');
            spinnerStyle.textContent = `
                .spinner {
                    width: 20px;
                    height: 20px;
                    border: 3px solid #e1e8ed;
                    border-top: 3px solid #667eea;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(spinnerStyle);
            document.body.appendChild(indicador);
        }
    } else {
        if (indicador) {
            indicador.remove();
        }
    }
}

// Función para agregar botón de sincronización - DESACTIVADA
// Se removió porque causaba confusión - ahora solo están los botones en Dashboard/Timeline
function agregarBotonSincronizacion() {
    // Función desactivada - los botones de sincronización ahora están en Dashboard y Timeline
    console.log('ℹ️ Botón de sincronización del header desactivado - usar botones de Dashboard/Timeline');
}

// Inicializar sincronización automática
let syncInstance = null;
let intervaloSync = null;

function inicializarSincronizacionAutomatica() {
    syncInstance = new GitHubSync();

    // Sincronización inicial al cargar
    if (syncInstance.inicializar()) {
        console.log('🚀 Sincronización automática habilitada');

        // Sincronización inicial
        setTimeout(() => {
            syncInstance.sincronizacionCompleta();
        }, 2000);

        // Sincronización cada 5 minutos
        intervaloSync = setInterval(() => {
            syncInstance.sincronizacionCompleta();
        }, 5 * 60 * 1000);
    }
}

// Detener sincronización automática
function detenerSincronizacionAutomatica() {
    if (intervaloSync) {
        clearInterval(intervaloSync);
        intervaloSync = null;
        console.log('⏹️ Sincronización automática detenida');
    }
}

// Exportar clase y funciones
window.GitHubSync = GitHubSync;
window.inicializarSincronizacionAutomatica = inicializarSincronizacionAutomatica;
window.detenerSincronizacionAutomatica = detenerSincronizacionAutomatica;
window.agregarBotonSincronizacion = agregarBotonSincronizacion;

// Inicializar cuando el documento esté listo
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        agregarBotonSincronizacion();
        if (window.sistemaAuth && window.sistemaAuth.estaAutenticado()) {
            inicializarSincronizacionAutomatica();
        }
    }, 1000);
});
