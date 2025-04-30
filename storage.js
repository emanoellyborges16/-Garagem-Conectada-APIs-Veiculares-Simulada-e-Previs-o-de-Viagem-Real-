// js/storage.js
export function getVeiculosSalvos() {
    try { return JSON.parse(localStorage.getItem('veiculos') || '[]'); }
    catch (error) { console.error("Erro leitura Storage:", error); return []; }
}
export function salvarVeiculos(veiculos) {
    try { localStorage.setItem('veiculos', JSON.stringify(veiculos)); }
    catch (error) { console.error("Erro salvar Storage:", error); }
}