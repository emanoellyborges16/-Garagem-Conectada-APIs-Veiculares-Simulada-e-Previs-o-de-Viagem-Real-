// js/main.js
import * as storage from './storage.js';
import * as api from './apiService.js';
import * as ui from './ui.js';

// --- Seletores Globais ---
const formCadastro = document.getElementById('form-cadastro');
const modeloInput = document.getElementById('modelo');
const placaInput = document.getElementById('placa');
const horaEntradaInput = document.getElementById('hora-entrada');
const veiculosList = document.getElementById('veiculos-list');
const destinoInput = document.getElementById('destino-viagem');
const verificarClimaBtn = document.getElementById('verificar-clima-btn');
const themeToggleButton = document.getElementById('theme-toggle-btn');
const unitToggleButton = document.getElementById('unit-toggle-btn');
const clearDetailsButton = document.getElementById('clear-details-btn');
const clearWeatherButton = document.getElementById('clear-weather-btn');

// --- Classe Veiculo ---
class Veiculo {
    constructor(modelo, placa, horaEntrada) {
        if (!modelo || !placa || !horaEntrada) throw new Error("Dados inválidos.");
        this.modelo = modelo; this.placa = placa.toUpperCase().trim();
        this.horaEntrada = new Date(horaEntrada).toISOString();
    }
}

// --- Estado da Aplicação ---
let currentTheme = localStorage.getItem('theme') || 'light';
let currentUnit = localStorage.getItem('unit') || 'metric';

// --- Funções Principais ---
function adicionarNovoVeiculo() {
    const modelo = modeloInput.value.trim(), placa = placaInput.value.trim().toUpperCase(), horaEntrada = horaEntradaInput.value;
    if (!modelo || !placa || !horaEntrada) { ui.showFeedback("Preencha todos os campos.", 'error'); return; }
    if (!/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(placa)) { ui.showFeedback("Placa inválida.", 'error'); placaInput.focus(); return; }
    let novoVeiculo; try { novoVeiculo = new Veiculo(modelo, placa, horaEntrada); } catch (e) { ui.showFeedback("Erro dados.", 'error'); return; }

    ui.addVehicleToList(novoVeiculo); // UI Otimista
    formCadastro.reset(); modeloInput.focus();

    setTimeout(() => { // Trabalho "real" depois
        const veiculos = storage.getVeiculosSalvos();
        if (veiculos.some(v => v.placa === novoVeiculo.placa)) {
            ui.showFeedback(`Erro: Placa ${novoVeiculo.placa} já existe!`, 'error', 5000);
            const itemToRemove = veiculosList.querySelector(`li[data-placa="${novoVeiculo.placa}"]`); // Rollback Otimista
            if (itemToRemove) {
                itemToRemove.classList.add('fade-out');
                setTimeout(() => { itemToRemove.remove(); if (veiculosList.childElementCount === 0) ui.displayVehicles([]); }, 600); // Usa duração fadeOut
            } return;
        }
        veiculos.push(novoVeiculo); storage.salvarVeiculos(veiculos);
        ui.showFeedback(`Veículo ${novoVeiculo.modelo} adicionado!`, 'success', 2500);
    }, 0);
}
function removerVeiculoSelecionado(placa) {
    let veiculos = storage.getVeiculosSalvos(); let index = veiculos.findIndex(v => v.placa === placa); if (index === -1) return;
    const v = veiculos[index], agora = new Date(), entrada = new Date(v.horaEntrada); if (isNaN(entrada.getTime())) return;
    const horas = (agora - entrada) / 36e5, valor = Math.max(5, Math.ceil(horas) * 5);
    if (confirm(`Veículo: ${v.modelo} (${placa})\nTempo: ${horas.toFixed(2)}h\nValor: R$${valor.toFixed(2)}\n\nConfirmar saída?`)) {
        const li = ui.startRemoveVehicleAnimation(placa);
        if (li) {
            setTimeout(() => {
                veiculos.splice(index, 1); storage.salvarVeiculos(veiculos); li.remove();
                ui.showFeedback(`Veículo ${placa} removido. Valor: R$${valor.toFixed(2)}`, 'success', 4000);
                if (storage.getVeiculosSalvos().length === 0) ui.displayVehicles([]);
                const placaDetalhes = document.querySelector('#detalhes-extras-conteudo p > strong:first-child');
                if (placaDetalhes?.nextSibling.textContent.trim() === placa) ui.clearVehicleDetails();
            }, 600); // Duração fadeOut
        } else { /* Fallback sem animação */ }
    }
}
async function buscarExibirDetalhesVeiculo(placa, buttonElement) { // Recebe botão
    if (buttonElement) buttonElement.classList.add('loading-click'); // Feedback clique
    ui.prepareVehicleDetailsSearchUI();
    try { const d = await api.buscarDetalhesVeiculoAPI(placa); ui.displayVehicleDetails(d, placa); }
    catch (e) { ui.displayVehicleDetails(null, placa, e); }
    finally { if (buttonElement) buttonElement.classList.remove('loading-click'); } // Limpa feedback clique
}
async function buscarExibirPrevisaoTempo() {
    const cidade = destinoInput.value.trim(); if (!cidade) { ui.showFeedback('Digite a cidade.', 'error', 3000, previsaoTempoConteudo); return; }
    if (verificarClimaBtn) verificarClimaBtn.classList.add('loading-click'); // Feedback clique
    ui.prepareWeatherSearchUI(cidade);
    try { const p = await api.buscarPrevisaoTempo(cidade, currentUnit); ui.displayWeather(p, cidade, null, currentUnit); }
    catch (e) { ui.displayWeather(null, cidade, e, currentUnit); }
    finally { if (verificarClimaBtn) verificarClimaBtn.classList.remove('loading-click'); } // Limpa feedback clique
}
function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    ui.applyTheme(currentTheme); localStorage.setItem('theme', currentTheme);
}
function toggleUnit() {
    currentUnit = currentUnit === 'metric' ? 'imperial' : 'metric';
    ui.updateUnitButton(currentUnit); localStorage.setItem('unit', currentUnit);
    const displayedCity = document.querySelector('#previsao-tempo-conteudo p > strong')?.textContent.split(',')[0].trim();
    if (displayedCity && destinoInput.value.trim().toLowerCase() === displayedCity.toLowerCase()) {
        buscarExibirPrevisaoTempo(); // Rebusca com nova unidade
    }
}

// --- Inicialização e Event Listeners ---
function init() {
    ui.applyTheme(currentTheme); ui.updateUnitButton(currentUnit);
    const apiKeyOk = api.isApiKeyConfigured(); ui.setupWeatherUIState(apiKeyOk);
    ui.displayVehicles(storage.getVeiculosSalvos()); // Exibe lista inicial

    // Listeners
    formCadastro?.addEventListener('submit', (e) => { e.preventDefault(); adicionarNovoVeiculo(); });
    veiculosList?.addEventListener('click', (e) => {
        const removerBtn = e.target.closest('.remover-btn');
        const detalhesBtn = e.target.closest('.detalhes-extras-btn');
        if (removerBtn) removerVeiculoSelecionado(removerBtn.dataset.placa);
        else if (detalhesBtn) buscarExibirDetalhesVeiculo(detalhesBtn.dataset.placa, detalhesBtn); // Passa o botão
    });
    verificarClimaBtn?.addEventListener('click', buscarExibirPrevisaoTempo);
    destinoInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') buscarExibirPrevisaoTempo(); });
    themeToggleButton?.addEventListener('click', toggleTheme);
    unitToggleButton?.addEventListener('click', toggleUnit);
    clearDetailsButton?.addEventListener('click', ui.clearVehicleDetails);
    clearWeatherButton?.addEventListener('click', ui.clearWeatherDisplay);

    console.log(`Garagem Inicializada! Tema: ${currentTheme}, Unidade: ${currentUnit}, API Key Config: ${apiKeyOk}`);
}
document.addEventListener('DOMContentLoaded', init);