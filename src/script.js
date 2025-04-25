/**
 * script.js
 * Lógica principal da aplicação: manipulação de UI, eventos
 * e orquestração da chamada aos algoritmos de extração de paleta.
 */

// --- Elementos do DOM ---
const imageUpload = document.getElementById('imageUpload');
const kValueInput = document.getElementById('kValue');
const algorithmSelect = document.getElementById('algorithmSelect');
const extractButton = document.getElementById('extractButton');
const originalImage = document.getElementById('originalImage');
const imageCanvas = document.getElementById('imageCanvas');
const colorPaletteDiv = document.getElementById('colorPalette');
const statusDiv = document.getElementById('status');
const ctx = imageCanvas.getContext('2d');

let pixelData = null; // Armazena os dados dos pixels da imagem (Uint8ClampedArray)

// --- Event Listeners ---

// 1. Ouvinte para o carregamento da imagem
imageUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            originalImage.src = e.target.result;
            originalImage.onload = () => {
                // Desenha no canvas para extrair pixels
                imageCanvas.width = originalImage.naturalWidth;
                imageCanvas.height = originalImage.naturalHeight;
                ctx.drawImage(originalImage, 0, 0);
                try {
                    const imageData = ctx.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
                    pixelData = imageData.data;
                    statusDiv.textContent = `Imagem carregada (${imageCanvas.width}x${imageCanvas.height}). Pronto para extrair.`;
                    colorPaletteDiv.innerHTML = ''; // Limpa paleta
                    extractButton.disabled = false; // Habilita o botão
                } catch (error) {
                    console.error("Erro ao ler dados do Canvas:", error);
                    statusDiv.textContent = "Erro: Não foi possível ler os pixels da imagem. Verifique se a imagem é de uma origem permitida (CORS) ou se é válida.";
                    pixelData = null;
                    extractButton.disabled = true; // Desabilita o botão
                }
            }
            originalImage.onerror = () => {
                statusDiv.textContent = "Erro ao carregar a imagem.";
                pixelData = null;
                 extractButton.disabled = true;
            }
        }
        reader.readAsDataURL(file);
    } else {
        // Limpa tudo se nenhum arquivo for selecionado
        originalImage.src = "#";
        imageCanvas.width = 0;
        imageCanvas.height = 0;
        ctx.clearRect(0, 0, 0, 0); // Limpa o canvas
        pixelData = null;
        statusDiv.textContent = "Nenhuma imagem carregada.";
        colorPaletteDiv.innerHTML = '';
        extractButton.disabled = true; // Desabilita botão se não houver imagem
    }
});

// 2. Ouvinte para o botão de extração
extractButton.addEventListener('click', () => {
    if (!pixelData) {
        statusDiv.textContent = "Por favor, carregue uma imagem primeiro.";
        return;
    }

    const k = parseInt(kValueInput.value);
    if (isNaN(k) || k < 1) {
        statusDiv.textContent = "Por favor, insira um número válido de cores (K).";
        return;
    }

    const selectedAlgorithm = algorithmSelect.value;
    statusDiv.textContent = `Processando com ${selectedAlgorithm.toUpperCase()} (K=${k})...`;
    colorPaletteDiv.innerHTML = '<div class="loading-spinner"></div>'; // Mostra um spinner (CSS necessário)
    extractButton.disabled = true; // Desabilita botão durante processamento
    algorithmSelect.disabled = true; // Desabilita select durante processamento
    kValueInput.disabled = true; // Desabilita input K durante processamento


    // Usa setTimeout para permitir atualização da UI (mostrar status/spinner)
    setTimeout(() => {
        try {
            let palette;
            const startTime = performance.now(); // Medir tempo

            // Chama a função do algoritmo apropriado (definida nos outros arquivos)
            if (selectedAlgorithm === 'kmeans') {
                palette = calculateKMeans(pixelData, k); // Definida em kMeans.js
            } else if (selectedAlgorithm === 'mediancut') {
                palette = calculateMedianCut(pixelData, k); // Definida em medianCut.js
            } else {
                throw new Error("Algoritmo desconhecido selecionado.");
            }

            const endTime = performance.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2); // Tempo em segundos

            displayPalette(palette); // Exibe a paleta resultante
            statusDiv.textContent = `Paleta de ${palette.length} cores extraída com ${selectedAlgorithm.toUpperCase()} em ${duration}s!`;

        } catch (error) {
            console.error(`Erro durante ${selectedAlgorithm.toUpperCase()}:`, error);
            statusDiv.textContent = `Erro durante o processamento ${selectedAlgorithm.toUpperCase()}. Verifique o console.`;
            colorPaletteDiv.innerHTML = ''; // Limpa área da paleta em caso de erro
        } finally {
             // Reabilita os controles independentemente de sucesso ou falha
             extractButton.disabled = false;
             algorithmSelect.disabled = false;
             kValueInput.disabled = false;
        }
    }, 50); // Pequeno delay para renderizar UI antes de bloquear
});

// --- Função de UI: Exibir Paleta ---
// (Esta função manipula o DOM, então pertence a este arquivo)
function displayPalette(palette) {
    colorPaletteDiv.innerHTML = ''; // Limpa qualquer conteúdo anterior (como o spinner)
    if (!palette || palette.length === 0) {
        colorPaletteDiv.textContent = "Nenhuma cor encontrada ou erro no algoritmo.";
        return;
    }
    colorPaletteDiv.classList.add('palette-container');
    
    palette.forEach(color => {
        const swatch = document.createElement('div');
        swatch.classList.add('color-swatch');

        // Garante que temos valores numéricos válidos antes de usar
        const r = Math.round(color.r);
        const g = Math.round(color.g);
        const b = Math.round(color.b);

        if (isNaN(r) || isNaN(g) || isNaN(b)) {
            console.warn("Cor inválida na paleta final:", color);
            swatch.style.backgroundColor = `rgb(128, 128, 128)`; // Cinza para inválido
            swatch.textContent = `Inválido`;
        } else {
             swatch.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
            //  swatch.textContent = `RGB\n(${r},${g},${b})`;
             swatch.innerHTML = `RGB<br>(${r},${g},${b})`;


             // Decide cor do texto para contraste
             const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
             swatch.style.color = luminance > 0.5 ? 'black' : 'white';
             swatch.style.textShadow = luminance > 0.5 ? '1px 1px 1px rgba(255, 255, 255, 0.7)' : '1px 1px 1px rgba(0, 0, 0, 0.7)';
        }
        colorPaletteDiv.appendChild(swatch);
    });
}

// --- Inicialização ---
// Desabilita o botão inicialmente, já que nenhuma imagem foi carregada
extractButton.disabled = true;