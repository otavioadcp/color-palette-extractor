/**
 * kMeans.js
 * Implementa o algoritmo K-Means para quantização de cores.
 */

// Função principal K-Means
function calculateKMeans(pixelData, k, maxIterations = 20, samplingRate = 5) {
    console.time("KMeans Execution"); // Marca o tempo de início

    // 1. Preparar os dados (pixels) - Amostragem para performance
    const pixels = [];
    for (let i = 0; i < pixelData.length; i += 4 * samplingRate) { // Pula RGBA e aplica amostragem
        pixels.push({
            r: pixelData[i],
            g: pixelData[i + 1],
            b: pixelData[i + 2]
        });
    }
    console.log(`K-Means: Processando ${pixels.length} pixels amostrados de ${pixelData.length / 4} originais.`);

    if (pixels.length === 0) {
        console.warn("K-Means: Nenhum pixel válido encontrado após amostragem.");
        console.timeEnd("KMeans Execution");
        return [];
    }

    // Ajusta k se for maior que os pixels disponíveis
    if (k > pixels.length) {
        k = pixels.length;
        console.warn(`K-Means: K (${kValueInput?.value || k}) é maior que os pixels amostrados (${pixels.length}). Ajustando K para ${k}.`); // Usando kValueInput?.value para tentar pegar o valor original se disponível
        if (k === 0) {
            console.timeEnd("KMeans Execution");
            return [];
        }
    }
     // Caso especial k=1
     if (k === 1) {
        let totalR = 0, totalG = 0, totalB = 0;
        pixels.forEach(p => { totalR += p.r; totalG += p.g; totalB += p.b; });
        const avgColor = {
            r: Math.round(totalR / pixels.length),
            g: Math.round(totalG / pixels.length),
            b: Math.round(totalB / pixels.length)
        };
        console.timeEnd("KMeans Execution");
        return [avgColor];
     }


    // 2. Inicializar Centróides
    let centroids = initializeCentroids(pixels, k);

    let assignments = new Array(pixels.length);
    let changed = true;
    let iter = 0; // Definido fora para logar no final

    // 3. Iterar (Atribuição e Atualização)
    for (iter = 0; iter < maxIterations && changed; iter++) {
        changed = false;
        // console.log(`K-Means Iteração ${iter + 1}`); // Pode ser muito verboso

        // --- Passo de Atribuição ---
        for (let i = 0; i < pixels.length; i++) {
            let minDist = Infinity;
            let bestCentroid = -1;
            for (let j = 0; j < centroids.length; j++) {
                // Verifica se o centróide é válido antes de calcular a distância
                 if (!centroids[j]) continue; // Segurança extra

                const dist = colorDistance(pixels[i], centroids[j]);
                if (dist < minDist) {
                    minDist = dist;
                    bestCentroid = j;
                }
            }
            if (assignments[i] !== bestCentroid) {
                assignments[i] = bestCentroid;
                changed = true;
            }
        }

        if (!changed) {
            console.log(`K-Means: Convergência alcançada na iteração ${iter + 1}.`);
            break;
        }

        // --- Passo de Atualização ---
        const newCentroids = new Array(k).fill(null).map(() => ({ r: 0, g: 0, b: 0, count: 0 }));

        for (let i = 0; i < pixels.length; i++) {
            const centroidIndex = assignments[i];
            if (centroidIndex === undefined || centroidIndex < 0 || centroidIndex >= k) continue;

            // Garante que o objeto centróide existe antes de tentar acessá-lo
             if (!newCentroids[centroidIndex]) {
                 // Isso não deveria acontecer se a inicialização estiver correta, mas é uma salvaguarda
                 console.error(`K-Means: Tentativa de acesso a newCentroids[${centroidIndex}] que não existe.`);
                 continue;
             }

            newCentroids[centroidIndex].r += pixels[i].r;
            newCentroids[centroidIndex].g += pixels[i].g;
            newCentroids[centroidIndex].b += pixels[i].b;
            newCentroids[centroidIndex].count++;
        }

        // Calcula a média e lida com centróides vazios
        for (let j = 0; j < k; j++) {
             // Se newCentroids[j] não foi inicializado corretamente (improvável agora), pule
            if (!newCentroids[j]) continue;

            if (newCentroids[j].count > 0) {
                newCentroids[j].r /= newCentroids[j].count;
                newCentroids[j].g /= newCentroids[j].count;
                newCentroids[j].b /= newCentroids[j].count;
                delete newCentroids[j].count; // Remove count após cálculo
            } else {
                // Centróide ficou vazio - re-inicializa (estratégia simples)
                console.warn(`K-Means: Centróide ${j} ficou vazio. Re-inicializando.`);
                // Tenta pegar um pixel aleatório como substituto
                 const randomPixelIndex = Math.floor(Math.random() * pixels.length);
                 // Cria uma cópia para evitar modificar o array original de pixels
                 newCentroids[j] = { ...pixels[randomPixelIndex] };
                 // Remove a propriedade 'count' se ela existir por algum motivo
                 delete newCentroids[j].count;
            }
        }
        centroids = newCentroids.map(c => ({r: c.r, g: c.g, b: c.b})); // Garante que só temos r,g,b
    }
     if(iter === maxIterations) {
          console.log(`K-Means: Máximo de ${maxIterations} iterações atingido.`);
     }

    // Marca o tempo de fim
    console.timeEnd("KMeans Execution"); 
    
    // Filtra centróides inválidos (NaN ou undefined) que poderiam surgir de divisões por zero
    // ou problemas na re-inicialização, embora as salvaguardas devam prevenir isso.
    const validCentroids = centroids.filter(c =>
        c && typeof c.r === 'number' && !isNaN(c.r) &&
        typeof c.g === 'number' && !isNaN(c.g) &&
        typeof c.b === 'number' && !isNaN(c.b)
    );

     if(validCentroids.length !== centroids.length){
         console.warn(`K-Means: Alguns centróides foram removidos por serem inválidos. Resultado com ${validCentroids.length} cores.`);
     }


    return validCentroids;
}


// Função auxiliar para inicializar os centróides
function initializeCentroids(pixels, k) {
    const centroids = [];
    const usedIndices = new Set();

    if (k >= pixels.length) {
         // Retorna todos os pixels únicos como centróides se k for muito grande
          const uniquePixels = [];
          const seenColors = new Set();
          for(const p of pixels) {
              const colorString = `${p.r}-${p.g}-${p.b}`;
              if (!seenColors.has(colorString)) {
                  uniquePixels.push({...p});
                  seenColors.add(colorString);
              }
          }
          console.log(`K-Means Init: K >= pixels amostrados. Usando ${uniquePixels.length} pixels únicos.`);
          // Se ainda assim uniquePixels for menor que k (pixels duplicados), preenche o resto
          while (uniquePixels.length < k && uniquePixels.length > 0) {
              uniquePixels.push({...uniquePixels[Math.floor(Math.random() * uniquePixels.length)]}); 
              // Duplica um aleatório
          }
          return uniquePixels;
     }


    while (centroids.length < k) {
        const randomIndex = Math.floor(Math.random() * pixels.length);
        if (!usedIndices.has(randomIndex)) {
            usedIndices.add(randomIndex);
            centroids.push({ ...pixels[randomIndex] });
        }
         // Protege de loop infinito se k for grande e tiver poucos pixels únicos
         if(usedIndices.size >= pixels.length && centroids.length < k) {
             console.warn("K-Means Init: Não foi possível encontrar K centróides iniciais distintos. Duplicando os que já existem.");
             while(centroids.length < k) {
                 centroids.push({...centroids[Math.floor(Math.random() * centroids.length)]}); 
                 // Duplica um aleatório já existente
             }
             break;
         }
    }
    return centroids;
}

// Função auxiliar para calcular a distância euclidiana ao quadrado
function colorDistance(color1, color2) {
    // Verifica se as cores são válidas
    if (!color1 || !color2 || typeof color1.r !== 'number' || typeof color2.r !== 'number') {
        // console.warn("Distância calculada com cor inválida:", color1, color2);
        return Infinity; // Retorna infinito se uma das cores for inválida
    }
    const dr = color1.r - color2.r;
    const dg = color1.g - color2.g;
    const db = color1.b - color2.b;
    return dr * dr + dg * dg + db * db;
}