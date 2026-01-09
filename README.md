# MeshCentral AutoTag Geo Plugin

Plugin para automatização de tags de geolocalização no MeshCentral.

## Funcionalidades

- ✅ Obtém automaticamente cidade, estado, país e provedor de cada nó
- ✅ Aplica tags baseadas na geolocalização
- ✅ Atualização periódica configurável
- ✅ Scan manual disponível via API
- ✅ Suporte a múltiplas meshes
- ✅ Log de auditoria

## Configuração

Edite o arquivo `manifest.json` para personalizar:
json
{
  "settings": {
    "updateInterval": 3600000,  // Intervalo em ms (1 hora)
    "geoApiUrl": "http://ip-api.com/json/",
    "tagPrefix": {
      "city": "Cidade:",
      "state": "Estado:",
      "country": "Pais:",
      "provider": "Provedor:"
    }
  }
}

## Uso

O plugin inicia automaticamente quando o MeshCentral carrega.

Para forçar um scan:

javascript
const plugin = parent.plugins.get('autotag-geo');
await plugin.forceScan('mesh-id-here');

## Tags Aplicadas

- `Cidade:<nome>` - Cidade local
- `Estado:<nome>` - Estado/Região
- `Pais:<nome>` - País
- `Provedor:<nome>` - ISP/Provedor
- `ISO:<code>` - Código ISO do país

## API de Geolocalização

Por padrão usa ip-api.com (grátis, limite 45 requisições/minuto).

Para usar outra API, altere `geoApiUrl` no manifesto.

## Logs

Logs são gravados no console do MeshCentral e no sistema de auditoria.


🛠️ Instalação

# 1. Criar diretório do plugin
mkdir -p meshcentral/plugins/autotag-geo

# 2. Copiar arquivos para o diretório
cp manifest.json meshcentral/plugins/autotag-geo/
cp main.js meshcentral/plugins/autotag-geo/
cp README.md meshcentral/plugins/autotag-geo/

# 3. Reiniciar MeshCentral
systemctl restart meshcentral
# ou
npm restart

📊 Comandos Adicionais (via Console MeshCentral)

// Verificar status do plugin
const plugin = parent.plugins.get('autotag-geo');
console.log(plugin.getStats());

// Forçar scan de todas as meshes
await plugin.scanAllMeshes();

// Forçar scan de mesh específica
await plugin.forceScan('MESH_ID_HERE');

// Atualizar configurações em runtime
await plugin.updateSettings({
    updateInterval: 1800000,  // 30 minutos
    geoApiUrl: 'https://ipinfo.io/json/'
});

Notas Importantes

1. Limitação da API Gratuita: ip-api.com tem limite de 45 req/min
2. Privacidade: Considere políticas de privacidade ao coletar dados de geolocalização
3. Performance: Para grandes redes, ajuste o intervalo para evitar sobrecarga
4. Logs de Auditoria: Todas as operações são registradas

🔄 Variáveis de Configuração

| Parâmetro | Descrição | Padrão |
|-----------|-----------|--------|
| updateInterval | Intervalo entre scans (ms) | 3600000 (1h) |
| geoApiUrl | URL da API de geolocalização | http://ip-api.com/json/ |
| tagPrefix.city | Prefixo da tag de cidade | Cidade: |
| tagPrefix.state | Prefixo da tag de estado | Estado: |
| tagPrefix.country | Prefixo da tag de país | Pais: |
| tagPrefix.provider | Prefixo da tag de provedor | Provedor: |

O plugin está pronto para uso! 🚀
