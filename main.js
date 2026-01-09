/**
 * MeshCentral AutoTag Geo Plugin
 * Automatiza aplicação de tags de geolocalização
 */

const http = require('http');
const https = require('https');

class AutoTagGeoPlugin {
    constructor(parent) {
        this.parent = parent;
        this.config = {
            updateInterval: parent.settings.updateInterval || 3600000,
            geoApiUrl: parent.settings.geoApiUrl || 'http://ip-api.com/json/',
            tagPrefix: parent.settings.tagPrefix || {
                city: 'Cidade:',
                state: 'Estado:',
                country: 'Pais:',
                provider: 'Provedor:'
            }
        };
        
        this.intervalId = null;
        this.init();
    }

    init() {
        console.log('[AutoTagGeo] Plugin inicializado');
        
        // Executar scan inicial após 30 segundos
        setTimeout(() => this.scanAllMeshes(), 30000);
        
        // Configurar intervalo periódico
        this.intervalId = setInterval(() => {
            this.scanAllMeshes();
        }, this.config.updateInterval);
    }

    /**
     * Escaneia todas as meshes do sistema
     */
    async scanAllMeshes() {
        try {
            const meshes = await this.parent.db.getMeshes();
            
            console.log(`[AutoTagGeo] Iniciando scan de ${meshes.length} meshes`);
            
            for (const mesh of meshes) {
                await this.scanMesh(mesh);
            }
            
            console.log('[AutoTagGeo] Scan completo');
        } catch (error) {
            console.error('[AutoTagGeo] Erro no scan:', error);
        }
    }

    /**
     * Escaneia uma mesh específica
     */
    async scanMesh(mesh) {
        try {
            const nodes = await this.parent.db.getNodes(mesh.meshid);
            
            console.log(`[AutoTagGeo] Mesh ${mesh.name}: ${nodes.length} nós`);
            
            for (const node of nodes) {
                await this.processNode(mesh, node);
            }
        } catch (error) {
            console.error(`[AutoTagGeo] Erro ao escanear mesh ${mesh.meshid}:`, error);
        }
    }

    /**
     * Processa um nó individual
     */
    async processNode(mesh, node) {
        try {
            // Verificar se o nó está online
            if (!node.conn || !node.conn.remoteIP) {
                console.log(`[AutoTagGeo] Nó ${node.name} offline ou sem IP`);
                return;
            }

            const ipAddress = node.conn.remoteIP;
            console.log(`[AutoTagGeo] Processando nó ${node.name} (${ipAddress})`);
            
            // Obter informações de geolocalização
            const geoInfo = await this.getGeoInfo(ipAddress);
            
            if (geoInfo) {
                // Aplicar tags
                await this.applyTags(mesh, node, geoInfo);
            }
        } catch (error) {
            console.error(`[AutoTagGeo] Erro ao processar nó ${node.nodeid}:`, error);
        }
    }

    /**
     * Obtém informações de geolocalização do IP
     */
    getGeoInfo(ipAddress) {
        return new Promise((resolve, reject) => {
            const url = `${this.config.geoApiUrl}${ipAddress}`;
            
            http.get(url, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const geoData = JSON.parse(data);
                        
                        if (geoData.status === 'success') {
                            resolve({
                                city: geoData.city || null,
                                region: geoData.regionName || null,
                                country: geoData.country || null,
                                country_code: geoData.countryCode || null,
                                isp: geoData.isp || null,
                                org: geoData.org || null,
                                as: geoData.as || null,
                                timezone: geoData.timezone || null,
                                lat: geoData.lat || null,
                                lon: geoData.lon || null
                            });
                        } else {
                            console.warn(`[AutoTagGeo] API retornou erro para IP ${ipAddress}: ${geoData.message}`);
                            resolve(null);
                        }
                    } catch (error) {
                        reject(error);
                    }
                });
            }).on('error', (error) => {
                reject(error);
            });
        });
    }

    /**
     * Aplica tags ao nó
     */
    async applyTags(mesh, node, geoInfo) {
        try {
            const tags = [];
            
            // Criar tags baseadas nas informações
            if (geoInfo.city) {
                tags.push(this.config.tagPrefix.city + geoInfo.city);
            }
            
            if (geoInfo.region) {
                tags.push(this.config.tagPrefix.state + geoInfo.region);
            }
            
            if (geoInfo.country) {
                tags.push(this.config.tagPrefix.country + geoInfo.country);
            }
            
            if (geoInfo.isp) {
                tags.push(this.config.tagPrefix.provider + geoInfo.isp);
            }
            
            // Adicionar código do país como tag
            if (geoInfo.country_code) {
                tags.push('ISO:' + geoInfo.country_code);
            }
            
            // Obter tags existentes
            const existingTags = node.tags || [];
            
            // Filtrar tags prefixadas para evitar duplicatas
            const filteredExistingTags = existingTags.filter(tag => {
                return !Object.values(this.config.tagPrefix).some(prefix => 
                    tag.startsWith(prefix)
                ) && !tag.startsWith('ISO:');
            });
            
            // Mesclar tags
            const mergedTags = [...new Set([...filteredExistingTags, ...tags])];
            
            // Atualizar nó
            await this.parent.db.setNodeTags(mesh.meshid, node.nodeid, mergedTags);
            
            console.log(`[AutoTagGeo] Tags aplicadas ao nó ${node.name}:`, tags);
            
            // Log de auditoria
            await this.parent.auditLog.add({
                type: 'autotag_geo',
                meshid: mesh.meshid,
                nodeid: node.nodeid,
                tags: tags,
                geoInfo: geoInfo,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error(`[AutoTagGeo] Erro ao aplicar tags ao nó ${node.nodeid}:`, error);
        }
    }

    /**
     * Atualiza configurações do plugin
     */
    async updateSettings(newSettings) {
        this.config = {
            ...this.config,
            ...newSettings,
            tagPrefix: {
                ...this.config.tagPrefix,
                ...newSettings.tagPrefix
            }
        };
        
        // Reiniciar intervalo se necessário
        if (newSettings.updateInterval && this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = setInterval(() => {
                this.scanAllMeshes();
            }, this.config.updateInterval);
        }
        
        console.log('[AutoTagGeo] Configurações atualizadas:', this.config);
    }

    /**
     * Força scan imediato de uma mesh específica
     */
    async forceScan(meshId) {
        try {
            const mesh = await this.parent.db.getMesh(meshId);
            if (mesh) {
                await this.scanMesh(mesh);
                console.log(`[AutoTagGeo] Scan forçado da mesh ${meshId} concluído`);
                return true;
            }
            return false;
        } catch (error) {
            console.error(`[AutoTagGeo] Erro no scan forçado:`, error);
            return false;
        }
    }

    /**
     * Obtém estatísticas do plugin
     */
    getStats() {
        return {
            enabled: true,
            updateInterval: this.config.updateInterval,
            geoApiUrl: this.config.geoApiUrl,
            tagPrefix: this.config.tagPrefix
        };
    }

    /**
     * Limpeza ao desligar plugin
     */
    shutdown() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        console.log('[AutoTagGeo] Plugin desligado');
    }
}

// Exportar plugin
module.exports = AutoTagGeoPlugin;
