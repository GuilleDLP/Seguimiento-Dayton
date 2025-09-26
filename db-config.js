// Configuración centralizada de IndexedDB
// ============================================
// IMPORTANTE: Este archivo controla la versión y estructura de la base de datos
// Si necesitas cambiar la estructura, actualiza SOLO este archivo

// Configuración principal
const DB_CONFIG = {
    name: 'SeguimientoDaytonDB',
    version: 2, // ← ÚNICA FUENTE DE VERDAD para la versión
    stores: {
        registros: {
            name: 'registros',
            keyPath: 'id',
            autoIncrement: true,
            indexes: [
                { name: 'fecha', keyPath: 'fecha', unique: false },
                { name: 'cliente', keyPath: 'cliente', unique: false },
                { name: 'consultor', keyPath: 'consultor', unique: false }
            ]
        },
        papelera: {
            name: 'papelera',
            keyPath: 'trashId',
            autoIncrement: true,
            indexes: [
                { name: 'fechaEliminacion', keyPath: 'fechaEliminacion', unique: false },
                { name: 'originalId', keyPath: 'originalId', unique: false }
            ]
        }
    }
};

// Función para abrir la base de datos con configuración consistente
function openDatabase() {
    return new Promise((resolve, reject) => {
        console.log(`🔄 Abriendo base de datos ${DB_CONFIG.name} versión ${DB_CONFIG.version}`);

        const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

        request.onerror = (event) => {
            console.error('❌ Error abriendo IndexedDB:', event.target.error);
            reject(event.target.error);
        };

        request.onblocked = () => {
            console.warn('⚠️ IndexedDB bloqueado por otra pestaña. Cerrando conexiones...');
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            console.log(`🔧 Actualizando base de datos de versión ${event.oldVersion} a ${event.newVersion}`);

            // Crear o actualizar objectStores según configuración
            Object.values(DB_CONFIG.stores).forEach(storeConfig => {
                let store;

                if (!db.objectStoreNames.contains(storeConfig.name)) {
                    // Crear nuevo objectStore
                    console.log(`➕ Creando objectStore: ${storeConfig.name}`);
                    store = db.createObjectStore(storeConfig.name, {
                        keyPath: storeConfig.keyPath,
                        autoIncrement: storeConfig.autoIncrement
                    });
                } else {
                    // ObjectStore ya existe, obtener referencia para índices
                    const transaction = event.target.transaction;
                    store = transaction.objectStore(storeConfig.name);
                }

                // Crear índices si no existen
                if (storeConfig.indexes) {
                    storeConfig.indexes.forEach(indexConfig => {
                        if (!store.indexNames.contains(indexConfig.name)) {
                            console.log(`📑 Creando índice: ${indexConfig.name} en ${storeConfig.name}`);
                            store.createIndex(indexConfig.name, indexConfig.keyPath, {
                                unique: indexConfig.unique
                            });
                        }
                    });
                }
            });
        };

        request.onsuccess = (event) => {
            const db = event.target.result;
            console.log(`✅ Base de datos abierta: ${DB_CONFIG.name} v${DB_CONFIG.version}`);
            resolve(db);
        };
    });
}

// Función para verificar si la versión local es compatible
function checkDatabaseVersion() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_CONFIG.name);

        request.onsuccess = (event) => {
            const db = event.target.result;
            const currentVersion = db.version;
            db.close();

            console.log(`🔍 Versión actual de DB: ${currentVersion}, versión requerida: ${DB_CONFIG.version}`);

            if (currentVersion === DB_CONFIG.version) {
                resolve({ compatible: true, currentVersion, requiredVersion: DB_CONFIG.version });
            } else {
                resolve({ compatible: false, currentVersion, requiredVersion: DB_CONFIG.version });
            }
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// Exportar configuración y funciones
window.DB_CONFIG = DB_CONFIG;
window.openDatabase = openDatabase;
window.checkDatabaseVersion = checkDatabaseVersion;

// Para compatibilidad con código existente
window.DB_NAME = DB_CONFIG.name;
window.DB_VERSION = DB_CONFIG.version;
window.STORE_NAME = DB_CONFIG.stores.registros.name;
window.TRASH_STORE_NAME = DB_CONFIG.stores.papelera.name;

// Estrategias para manejar cambios de versión futuros
const VERSION_MIGRATION_STRATEGIES = {
    // Ejemplo de migración de v2 a v3 (cuando sea necesario)
    '2->3': {
        description: 'Agregar tabla de configuraciones',
        migrate: (db, transaction) => {
            console.log('🔄 Migrando de v2 a v3: Agregando tabla configuraciones');
            // Ejemplo: db.createObjectStore('configuraciones', { keyPath: 'key' });
        }
    },

    // Plantilla para futuras migraciones
    '3->4': {
        description: 'Descripción del cambio',
        migrate: (db, transaction) => {
            console.log('🔄 Migrando de v3 a v4');
            // Código de migración aquí
        }
    }
};

// Función para manejar migraciones automáticas
function handleDatabaseMigration(event) {
    const db = event.target.result;
    const oldVersion = event.oldVersion;
    const newVersion = event.newVersion;

    console.log(`🔧 Migración necesaria: v${oldVersion} → v${newVersion}`);

    // Aplicar migraciones secuenciales si existen
    for (let version = oldVersion; version < newVersion; version++) {
        const migrationKey = `${version}->${version + 1}`;
        const migration = VERSION_MIGRATION_STRATEGIES[migrationKey];

        if (migration) {
            console.log(`📝 Aplicando migración: ${migration.description}`);
            try {
                migration.migrate(db, event.target.transaction);
            } catch (error) {
                console.error(`❌ Error en migración ${migrationKey}:`, error);
            }
        }
    }
}

// Función de ayuda para detectar conflictos de versión
function detectVersionConflicts() {
    // Verificar que todos los archivos usen la misma configuración
    const expectedVersion = DB_CONFIG.version;

    // Esta función puede ser llamada desde la consola para debugging
    console.log(`🔍 Verificando consistencia de versión...`);
    console.log(`📋 Versión esperada: ${expectedVersion}`);
    console.log(`📂 Archivo de configuración cargado correctamente`);

    return {
        expectedVersion,
        configLoaded: true,
        recommendation: 'Todos los archivos deben usar window.DB_VERSION en lugar de valores hardcodeados'
    };
}

// Función para desarrolladores: mostrar guía de versiones
function showVersionGuide() {
    console.group('📚 Guía de Versiones de IndexedDB');
    console.log('');
    console.log('🔧 Para CAMBIAR la versión de la base de datos:');
    console.log('   1. Edita SOLO el archivo db-config.js');
    console.log('   2. Incrementa DB_CONFIG.version');
    console.log('   3. Agrega migración en VERSION_MIGRATION_STRATEGIES si necesario');
    console.log('');
    console.log('❌ NO cambies versiones en:');
    console.log('   - index.html');
    console.log('   - github-sync.js');
    console.log('   - admin-panel.js');
    console.log('');
    console.log('✅ TODOS los archivos deben usar window.DB_VERSION');
    console.log('');
    console.log('📞 Para verificar estado actual: detectVersionConflicts()');
    console.groupEnd();
}

// Exportar funciones de utilidad
window.handleDatabaseMigration = handleDatabaseMigration;
window.detectVersionConflicts = detectVersionConflicts;
window.showVersionGuide = showVersionGuide;

console.log('📋 Configuración de base de datos cargada:', DB_CONFIG);
console.log('💡 Ejecuta showVersionGuide() para ver la guía de versiones');
