
// js/ui.js
import * as api from './apiService.js';

// --- Seletores ---
const veiculosList = document.getElementById('veiculos-list');
const detalhesExtrasConteudo = document.getElementById('detalhes-extras-conteudo');
const previsaoTempoConteudo = document.getElementById('previsao-tempo-conteudo');
const formFeedback = document.getElementById('form-feedback');
const destinoInput = document.getElementById('destino-viagem');
const verificarClimaBtn = document.getElementById('verificar-clima-btn');
const themeToggleButton = document.getElementById('theme-toggle-btn');
const unitToggleButton = document.getElementById('unit-toggle-btn');
const clearDetailsButton = document.getElementById('clear-details-btn');
const clearWeatherButton = document.getElementById('clear-weather-btn');
const bodyElement = document.body;

// --- Funções Auxiliares ---
function formatarDataHora(data) {
    const dateObj = typeof data === 'string' ? new Date(data) : data;
    if (isNaN(dateObj.getTime())) return 'Data inválida';
    return dateObj.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function applyTemporaryClass(element, className, duration) {
    if (!element) return; element.classList.add(className);
    setTimeout(() => { element.classList.remove(className); }, duration);
}
function createVehicleListItemHTML(veiculo) {
    return `<span><strong>Modelo:</strong> ${veiculo.modelo} - <strong>Placa:</strong> ${veiculo.placa} - <strong>Entrada:</strong> ${formatarDataHora(veiculo.horaEntrada)}</span>
            <div class="actions"><button class="detalhes-extras-btn" data-placa="${veiculo.placa}" title="Ver detalhes">Detalhes Extras</button><button class="remover-btn" data-placa="${veiculo.placa}" title="Remover">Remover</button></div>`;
}

// --- Funções de Manipulação da UI ---
export function showFeedback(message, type = 'info', duration = 3000, element = formFeedback) {
    if (!element) return; element.textContent = message; element.className = `feedback-message ${type}`;
    requestAnimationFrame(() => { // Garante que a classe seja aplicada antes de 'show'
        element.classList.add('show');
        if (duration > 0) {
            setTimeout(() => {
                element.classList.remove('show');
                setTimeout(() => {
                    if (element.classList.contains(type) && element.textContent === message) {
                        element.textContent = ''; element.className = 'feedback-message';
                    }
                }, 500); // Tempo da transição CSS
            }, duration);
        }
    });
}
export function addVehicleToList(veiculo) { // Adiciona um item com animação
    if (!veiculosList) return;
    const emptyMsg = veiculosList.querySelector('.empty-message'); if (emptyMsg) emptyMsg.remove();
    const li = document.createElement('li'); li.dataset.placa = veiculo.placa; li.innerHTML = createVehicleListItemHTML(veiculo);
    veiculosList.appendChild(li);
    applyTemporaryClass(li, 'fade-in', 700); // Duração do fadeIn CSS
    applyTemporaryClass(li, 'newly-added', 1800); // Duração do highlightNew CSS
}
export function displayVehicles(veiculos) { // Exibe todos (inicialização)
    if (!veiculosList) return; veiculosList.innerHTML = '';
    if (veiculos.length === 0) { veiculosList.innerHTML = '<li class="empty-message">Nenhum veículo na garagem.</li>'; return; }
    veiculos.forEach(veiculo => {
        const li = document.createElement('li'); li.dataset.placa = veiculo.placa; li.innerHTML = createVehicleListItemHTML(veiculo);
        veiculosList.appendChild(li);
    });
}
export function startRemoveVehicleAnimation(placa) { // Inicia animação de remoção
    const li = veiculosList.querySelector(`li[data-placa="${placa}"]`);
    if (li) { li.classList.add('fade-out'); return li; } return null;
}
function setLoadingState(type, isLoading, message = null) { // Controla estado de loading visual
    const container = type === 'details' ? detalhesExtrasConteudo : previsaoTempoConteudo;
    const containerParent = container?.parentElement; if (!container || !containerParent) return;
    const weatherControls = [destinoInput, verificarClimaBtn, unitToggleButton];
    const detailControls = []; // Nenhum por enquanto
    const clearButton = type === 'details' ? clearDetailsButton : clearWeatherButton;
    const controls = type === 'details' ? detailControls : weatherControls;
    const enableCondition = type === 'weather' ? api.isApiKeyConfigured() : true;

    if (isLoading) {
        const loadingMsg = message || (type === 'details' ? 'Carregando...' : 'Buscando...');
        container.innerHTML = `<p class="loading-text">${loadingMsg}</p>`;
        containerParent.classList.add('loading'); if (clearButton) clearButton.style.display = 'none';
        controls.forEach(el => el && (el.disabled = true));
    } else {
        containerParent.classList.remove('loading');
        controls.forEach(el => el && (el.disabled = !enableCondition));
        const hasContent = container.textContent.trim() !== '' && !container.querySelector('.loading-text') &&
                           !container.textContent.includes('Selecione') && !container.textContent.includes('Digite uma cidade');
        if (clearButton) clearButton.style.display = hasContent ? 'block' : 'none';
    }
}
export function displayVehicleDetails(detalhes, placa, error = null) { // Exibe detalhes do veículo
    if (!detalhesExtrasConteudo) return; let html = '';
    if (error) { html = `<p class="error-text">Erro: ${error.message}</p>`; }
    else if (detalhes) {
        const recall = detalhes.temRecall ? `<span class="recall-warning"><strong>Recall!</strong> ${detalhes.ultimoRecall||''}</span>` : 'Não';
        html = `<p><strong>Placa:</strong> ${detalhes.placa}</p><p><strong>FIPE:</strong> ${detalhes.valorFipe||'N/D'}</p>
                <p><strong>Recall:</strong> ${recall}</p><p><strong>Dica:</strong> ${detalhes.dicaManutencao||'N/D'}</p>
                ${detalhes.linkDocumentacao ? `<p><a href="${detalhes.linkDocumentacao}" target="_blank">Doc</a></p>`:''}`;
    } else { html = `<p class="error-text">Detalhes não encontrados para ${placa}.</p>`; }
    detalhesExtrasConteudo.innerHTML = html; setLoadingState('details', false);
}
export function displayWeather(previsao, cidade, error = null, unit = 'metric') { // Exibe previsão
    if (!previsaoTempoConteudo) return; let html = '';
    const tempUnit = unit === 'metric' ? '°C' : '°F'; const speedUnit = unit === 'metric' ? 'km/h' : 'mph';
    const wind = unit === 'metric' ? (previsao?.velocidadeVento ?? 0)*3.6 : (previsao?.velocidadeVento ?? 0);

    if (error) { html = `<p class="error-text">${error.message}</p>`; }
    else if (previsao) {
        html = `<p><strong>${previsao.cidade}, ${previsao.pais}</strong></p>
                <p style="text-transform: capitalize;">${previsao.descricao} <img src="https://openweathermap.org/img/wn/${previsao.icone}@2x.png" alt="" style="v-align: middle; width:50px; height:50px;"></p>
                <p>Temp: <span class="temp-value">${previsao.temperatura.toFixed(1)}</span>${tempUnit}</p>
                <p>Sensação: <span class="feels-like-value">${previsao.sensacaoTermica.toFixed(1)}</span>${tempUnit}</p>
                <p>Umidade: ${previsao.umidade}% | Vento: ${wind.toFixed(1)} ${speedUnit}</p>`;
    } else { html = `<p class="error-text">Sem dados para ${cidade}.</p>`; }
    previsaoTempoConteudo.innerHTML = html; setLoadingState('weather', false);
}
export function clearVehicleDetails() { // Limpa detalhes
    if (detalhesExtrasConteudo) { detalhesExtrasConteudo.innerHTML = 'Selecione "Detalhes Extras"...'; setLoadingState('details', false); }
}
export function clearWeatherDisplay() { // Limpa previsão
    if (previsaoTempoConteudo) { previsaoTempoConteudo.innerHTML = 'Digite uma cidade...'; setLoadingState('weather', false); }
}
export function prepareWeatherSearchUI(cidade) { setLoadingState('weather', true, `Buscando ${cidade}...`); }
export function prepareVehicleDetailsSearchUI() { setLoadingState('details', true); }
export function setupWeatherUIState(isConfigured) { // Configura UI inicial do clima
    const controls = [destinoInput, verificarClimaBtn, unitToggleButton];
    controls.forEach(el => el && (el.disabled = !isConfigured));
    if (!isConfigured && previsaoTempoConteudo && !previsaoTempoConteudo.querySelector('.error-text')) {
        previsaoTempoConteudo.innerHTML = '<p class="error-text">Configure a chave API.</p>';
    }
    if(clearWeatherButton) clearWeatherButton.style.display = 'none';
    if(clearDetailsButton) clearDetailsButton.style.display = 'none';
}
export function applyTheme(theme) { // Aplica tema
    bodyElement.classList.toggle('dark-mode', theme === 'dark');
    if (themeToggleButton) themeToggleButton.textContent = theme === 'dark' ? '☀️' : '🌙';
    if (themeToggleButton) themeToggleButton.title = `Alternar tema ${theme === 'dark' ? 'claro' : 'escuro'}`;
}
export function updateUnitButton(unit) { // Atualiza botão C/F
    if (unitToggleButton) {
        unitToggleButton.textContent = unit === 'metric' ? '°C' : '°F';
        unitToggleButton.title = `Alternar para ${unit === 'metric' ? 'Fahrenheit' : 'Celsius'}`;
    }
}