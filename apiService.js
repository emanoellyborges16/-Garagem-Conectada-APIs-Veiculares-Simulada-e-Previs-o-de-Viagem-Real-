// js/apiService.js

// ==========================================================================
// ==                          ATENÇÃO MÁXIMA!                             ==
// ==========================================================================
// ==  A CHAVE DE API ABAIXO ESTÁ NO FRONTEND POR MOTIVOS DIDÁTICOS.       ==
// ==  NUNCA FAÇA ISSO EM PRODUÇÃO! USE UM BACKEND PARA PROTEGER A CHAVE!  ==
// ==========================================================================

const API_CONFIG = {
    // SUBSTITUA PELA SUA CHAVE REAL DA OPENWEATHERMAP AQUI vvvvvv
    OPENWEATHER_API_KEY: "SUA_CHAVE_COPIADA_DA_OPENWEATHERMAP_AQUI"
    // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
};

export function isApiKeyConfigured() {
    const key = API_CONFIG.OPENWEATHER_API_KEY;
    const isConfigured = key && key !== "SUA_CHAVE_COPIADA_DA_OPENWEATHERMAP_AQUI";
    if (!isConfigured) { console.error("### ALERTA: Chave OpenWeatherMap NÃO configurada em js/apiService.js ###"); }
    return isConfigured;
}

export async function buscarDetalhesVeiculoAPI(placaVeiculo) {
    const urlAPI = './dados_veiculos_api.json';
    console.debug(`Buscando detalhes ${placaVeiculo} em ${urlAPI}`);
    try {
        const response = await fetch(urlAPI);
        if (!response.ok) throw new Error(`Falha dados locais: ${response.statusText}`);
        const data = await response.json();
        const veiculoEncontrado = data.find(v => v.placa?.toUpperCase() === placaVeiculo.toUpperCase());
        return veiculoEncontrado || null;
    } catch (error) {
        console.error(`Erro detalhes (${placaVeiculo}):`, error);
        throw new Error(`Busca detalhes falhou. ${error.message}`);
    }
}

export async function buscarPrevisaoTempo(nomeCidade, unit = 'metric') {
    if (!isApiKeyConfigured()) throw new Error("Chave API não configurada.");
    const apiKey = API_CONFIG.OPENWEATHER_API_KEY;
    const urlAPI = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(nomeCidade)}&appid=${apiKey}&units=${unit}&lang=pt_br`;
    console.debug(`Buscando previsão ${nomeCidade} (unit: ${unit})`);
    try {
        const response = await fetch(urlAPI);
        if (!response.ok) {
            let errorMessage = `Erro ${response.status}: ${response.statusText}`;
            try {
                const errorData = await response.json();
                if (response.status === 401) errorMessage = "Chave API inválida.";
                else if (response.status === 404) errorMessage = `Cidade "${nomeCidade}" não encontrada.`;
                else if (errorData?.message) errorMessage = errorData.message;
            } catch (e) { /* Ignora erro no parse do erro */ }
            const error = new Error(errorMessage); error.status = response.status; throw error;
        }
        const data = await response.json();
        if (!data?.main?.temp || !data?.weather?.[0]?.description || !data?.sys?.country) throw new Error("Resposta API previsão inválida.");
        return { // Retorna objeto formatado
            cidade: data.name, pais: data.sys.country, temperatura: data.main.temp,
            sensacaoTermica: data.main.feels_like, descricao: data.weather[0].description,
            icone: data.weather[0].icon, umidade: data.main.humidity, velocidadeVento: data.wind.speed
        };
    } catch (error) {
        console.error(`Erro previsão "${nomeCidade}":`, error);
        if (error instanceof TypeError && error.message.includes('fetch')) throw new Error("Erro de rede ao buscar previsão.");
        throw error;
    }
}