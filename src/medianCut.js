/**
 * medianCut.js
 * Implementa o algoritmo Median Cut para quantização de cores.
 */

// Função principal exportada (ou global, dependendo de como você estrutura)
// Recebe os dados de pixel brutos (Uint8ClampedArray), o número desejado de cores (k)
// e uma taxa de amostragem opcional para performance.
function calculateMedianCut(pixelData, k, samplingRate = 5) {
    console.time("MedianCut Execution"); // Marca o tempo de início

    // 1. Preparar os dados (pixels) - Amostragem para performance
    const pixels = [];
    for (let i = 0; i < pixelData.length; i += 4 * samplingRate) { // Pula RGBA e aplica amostragem
        // Opcional: Filtrar pixels transparentes ou muito brancos/pretos
        // const alpha = pixelData[i + 3];
        // if (alpha < 128) continue;

        pixels.push({
            r: pixelData[i],
            g: pixelData[i + 1],
            b: pixelData[i + 2]
        });
    }
    console.log(`Median Cut: Processando ${pixels.length} pixels amostrados de ${pixelData.length / 4} originais.`);

    if (pixels.length === 0) {
        console.warn("Median Cut: Nenhum pixel válido encontrado após amostragem.");
        console.timeEnd("MedianCut Execution");
        return [];
    }

    // Ajusta k se for maior que os pixels disponíveis
     if (k > pixels.length) {
         k = pixels.length;
         console.warn(`Median Cut: K (${k}) é maior que os pixels amostrados (${pixels.length}). Ajustando K para ${k}.`);
         if (k === 0) {
             console.timeEnd("MedianCut Execution");
             return [];
         }
     }
      // Caso especial: Se k=1, a média de todos os pixels é a única cor da paleta
     if (k === 1) {
         const avgColor = calculateAverageColor({ pixels: pixels });
         console.timeEnd("MedianCut Execution");
         return [avgColor];
     }


    // 2. Criar a caixa inicial contendo todos os pixels
    let initialBox = { pixels: pixels };

    // 3. Lista de caixas a serem processadas (começa com a inicial)
    let boxes = [initialBox];

    // 4. Loop de divisão: continua enquanto houver menos caixas que 'k'
    //    e houver caixas com mais de 1 pixel para dividir.
    while (boxes.length < k) {
        // Encontra a próxima caixa a ser dividida. Estratégia: escolher a maior caixa (com mais pixels).
        // Poderia ser também a com maior volume ou maior dimensão, mas a contagem de pixels é simples e eficaz.
        let boxToSplitIndex = -1;
        let maxPixels = -1;
        for(let i = 0; i < boxes.length; i++) {
            if (boxes[i].pixels.length > 1 && boxes[i].pixels.length > maxPixels) {
                 maxPixels = boxes[i].pixels.length;
                 boxToSplitIndex = i;
            }
        }

        // Se não encontrarmos nenhuma caixa para dividir (todas têm 1 pixel ou menos), paramos.
        if (boxToSplitIndex === -1) {
            break;
        }

        let boxToSplit = boxes[boxToSplitIndex];

        // Remove a caixa que será dividida da lista principal
        boxes.splice(boxToSplitIndex, 1);

        // Calcula a dimensão (R, G ou B) com a maior amplitude (range) dentro da caixa
        let longestDim = findLongestDimension(boxToSplit.pixels);

        // Ordena os pixels da caixa ao longo dessa dimensão
        // Usamos `sort` diretamente no array da caixa.
        boxToSplit.pixels.sort((a, b) => a[longestDim] - b[longestDim]);

        // Encontra o ponto mediano para dividir
        let medianIndex = Math.floor(boxToSplit.pixels.length / 2);

        // Cria as duas novas caixas
        let box1 = { pixels: boxToSplit.pixels.slice(0, medianIndex) };
        let box2 = { pixels: boxToSplit.pixels.slice(medianIndex) };

        // Adiciona as novas caixas à lista (se não estiverem vazias)
        if (box1.pixels.length > 0) {
            boxes.push(box1);
        }
        if (box2.pixels.length > 0) {
            boxes.push(box2);
        }
         // Console log para acompanhar o processo (opcional)
         // console.log(`Split box ${boxToSplitIndex} along ${longestDim}. New boxes: ${boxes.length}`);
    }

     // Se acabamos com mais caixas que k (raro, mas possível se a última divisão criou duas caixas
     // e ultrapassou k), podemos opcionalmente mesclar as menores/mais próximas,
     // mas para simplificar, vamos apenas usar as 'k' primeiras ou as 'k' maiores.
     // Ou simplesmente retornar as que temos, que pode ser ligeiramente > k.
     // Para este exemplo, vamos retornar todas as caixas geradas (pode ser ligeiramente > k).
     console.log(`Median Cut: Finalizou com ${boxes.length} caixas (target era ${k}).`);


    // 5. Calcular a cor média de cada caixa final para formar a paleta
    const palette = [];
    for (let i = 0; i < boxes.length; i++) {
        // Verifica se a caixa não está vazia antes de calcular a média
        if (boxes[i].pixels.length > 0) {
             const averageColor = calculateAverageColor(boxes[i]);
             palette.push(averageColor);
        }
    }

    console.timeEnd("MedianCut Execution"); // Marca o tempo de fim
    return palette;
}

// --- Funções Auxiliares para Median Cut ---

/**
 * Calcula a dimensão (canal de cor 'r', 'g' ou 'b') com a maior
 * amplitude (diferença entre valor máximo e mínimo) em uma lista de pixels.
 */
function findLongestDimension(pixels) {
    if (!pixels || pixels.length === 0) {
        return 'r'; // Retorna um padrão se a lista estiver vazia
    }

    let minR = 255, maxR = 0;
    let minG = 255, maxG = 0;
    let minB = 255, maxB = 0;

    for (const pixel of pixels) {
        minR = Math.min(minR, pixel.r);
        maxR = Math.max(maxR, pixel.r);
        minG = Math.min(minG, pixel.g);
        maxG = Math.max(maxG, pixel.g);
        minB = Math.min(minB, pixel.b);
        maxB = Math.max(maxB, pixel.b);
    }

    const rangeR = maxR - minR;
    const rangeG = maxG - minG;
    const rangeB = maxB - minB;

    if (rangeR >= rangeG && rangeR >= rangeB) {
        return 'r';
    } else if (rangeG >= rangeR && rangeG >= rangeB) {
        return 'g';
    } else {
        return 'b';
    }
}

/**
 * Calcula a cor média (RGB) dos pixels dentro de uma caixa.
 */
function calculateAverageColor(box) {
    if (!box || !box.pixels || box.pixels.length === 0) {
        return { r: 0, g: 0, b: 0 }; // Retorna preto se a caixa estiver vazia
    }

    let totalR = 0;
    let totalG = 0;
    let totalB = 0;

    for (const pixel of box.pixels) {
        totalR += pixel.r;
        totalG += pixel.g;
        totalB += pixel.b;
    }

    const numPixels = box.pixels.length;
    return {
        r: Math.round(totalR / numPixels),
        g: Math.round(totalG / numPixels),
        b: Math.round(totalB / numPixels)
    };
}