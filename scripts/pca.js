// =====================
// Funciones matemáticas
// =====================
function parseMatriz(texto) {
  const filas = texto.trim().split(/\n+/).map(l => l.split(",").map(v => parseFloat(v.trim())));
  if (filas.length === 0 || filas[0].length === 0) {
      throw new Error("La matriz está vacía.");
  }
  const columnas = filas[0].length;
  if (!filas.every(f => f.length === columnas && f.every(x => !isNaN(x)))) {
    throw new Error("Formato inválido. Todas las filas deben tener el mismo número de columnas numéricas.");
  }
  return filas;
}

function media(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function trasponer(M) { return M[0].map((_, j) => M.map(f => f[j])); }
function restarMedia(M) {
  const cols = M[0].length;
  const medias = Array.from({length: cols}, (_, j) => media(M.map(f => f[j])));
  return [M.map(f => f.map((v, j) => v - medias[j])), medias];
}
function multiplicarMatrices(A, B) {
  const res = Array.from({ length: A.length }, () => Array(B[0].length).fill(0));
  for (let i = 0; i < A.length; i++)
    for (let j = 0; j < B[0].length; j++)
      for (let k = 0; k < B.length; k++)
        res[i][j] += (A[i][k] || 0) * (B[k][j] || 0);
  return res;
}
function escalarMatriz(M, esc) { return M.map(f => f.map(v => v * esc)); }
function norma(v) { return Math.sqrt(v.reduce((a, b) => a + b*b, 0)); }
function normalizar(v) { const n = norma(v) || 1; return v.map(x => x / n); }
function multiplicarMatrizVector(M, v) { return M.map(f => f.reduce((a,b,j)=>a+b*v[j],0)); }
function productoPunto(a, b) { return a.reduce((s,_,i)=>s+a[i]*b[i],0); }

// =====================
// Power iteration para autovalores/autovectores
// =====================
function powerIteration(M, k = 2, maxIter = 1000, tol = 1e-6) {
  const n = M.length;
  let R = M.map(f => f.slice());
  let valores = [], vectores = [];

  for (let comp = 0; comp < k; comp++) {
    let v = Array.from({length: n}, ()=>Math.random() - 0.5);
    v = normalizar(v);
    let lambda = 0;
    
    for (let iter = 0; iter < maxIter; iter++) {
      const w = multiplicarMatrizVector(R, v);
      v = normalizar(w);
      const lambdaNew = productoPunto(v, multiplicarMatrizVector(R, v)); // v'.R.v
      
      if (Math.abs(lambdaNew - lambda) < tol) {
          lambda = lambdaNew;
          break;
      }
      lambda = lambdaNew;
    }
    valores.push(lambda);
    vectores.push(v);

    // Deflación de Hotelling
    const outer = v.map(x => v.map(y => x * y));
    R = R.map((fila, i) => fila.map((val, j) => val - lambda * outer[i][j]));
  }
  return { valores, vectores };
}

// =====================
// PCA principal
// =====================
const btnCalcular = document.getElementById("calcular");
const salida = document.getElementById("salida");
const tablaVar = document.getElementById("tablaVar");
const canvas = document.getElementById("graficoPCA");
const errorBox = document.getElementById("error-box"); // <-- NUEVO

btnCalcular.addEventListener("click", () => {
  salida.textContent = "";
  tablaVar.innerHTML = "";
  errorBox.style.display = "none"; // <-- NUEVO

  let X;
  try {
    X = parseMatriz(document.getElementById("matriz").value);
  } catch(e) {
    // Reemplaza alert()
    errorBox.textContent = e.message;
    errorBox.style.display = "block";
    return;
  }

  const n = X.length, p = X[0].length;
  if (n < 2) {
    // Reemplaza alert()
    errorBox.textContent = "Se requieren al menos 2 observaciones (filas).";
    errorBox.style.display = "block";
    return;
  }
  if (p < 2) {
    errorBox.textContent = "Se requieren al menos 2 variables (columnas) para un biplot.";
    errorBox.style.display = "block";
    // Podríamos continuar, pero el gráfico no tendría sentido
  }

  // Centrado
  const [Xc, medias] = restarMedia(X);
  const Xt = trasponer(Xc);
  const C = escalarMatriz(multiplicarMatrices(Xt, Xc), 1/(n-1));

  // Componentes
  const k = Math.min(2, p); // Solo calculamos 2 componentes para el biplot
  const { valores, vectores } = powerIteration(C, k);
  
  // Varianza total (calculada a partir de la traza de C)
  const totalVar = C.reduce((sum, fila, i) => sum + fila[i], 0); 
  const proporciones = valores.map(v => v / totalVar);

  salida.textContent = 
`Matriz de covarianza (${p}x${p})
Autovalores (PC1, PC2): ${valores.map(v=>v.toFixed(6)).join(", ")}
Varianza total (Traza): ${totalVar.toFixed(6)}
Proporción explicada (PC1, PC2): ${proporciones.map(v=>(v*100).toFixed(2)+"%").join(", ")}
`;

  // === Tabla de varianza explicada ===
  let html = `<h3>Varianza explicada</h3><table>
  <thead><tr><th>Componente</th><th>Autovalor</th><th>% Varianza explicada</th></tr></thead><tbody>`;
  for (let i = 0; i < valores.length; i++){
    html += `<tr><td>PC${i+1}</td><td>${valores[i].toFixed(6)}</td><td>${(proporciones[i]*100).toFixed(2)}%</td></tr>`;
  }
  html += `</tbody></table>`;
  tablaVar.innerHTML = html;

  // === Calcular loadings (vectores transpuestos) ===
  const loadings = trasponer(vectores);
  let htmlLoad = `<h3>Cargas de las variables (loadings)</h3>
  <table>
  <thead><tr><th>Variable</th><th>PC1</th>${p >= 2 ? '<th>PC2</th>' : ''}</tr></thead><tbody>`;
  
  for (let i = 0; i < p; i++){
    htmlLoad += `<tr><td>X${i+1}</td><td>${(loadings[i][0] || 0).toFixed(6)}</td>`;
    if(p >= 2) {
      htmlLoad += `<td>${(loadings[i][1] || 0).toFixed(6)}</td>`;
    }
    htmlLoad += `</tr>`;
  }
  htmlLoad += `</tbody></table>`;
  tablaVar.innerHTML += htmlLoad;

  // === Proyección de datos (Scores) ===
  // Multiplicamos X centrada por la matriz de autovectores (no la transpuesta)
  const Xproj = multiplicarMatrices(Xc, vectores); 

  // === Gráfico biplot ===
  if (window.__pcaChart__) window.__pcaChart__.destroy();
  const ctx = canvas.getContext("2d");
  const puntos = Xproj.map(p => ({x: p[0], y: p[1] || 0})); // (p[1] || 0) para el caso p=1

  // Escalamos las flechas (loadings) para visualización
  const maxScore = Math.max(...puntos.map(p => Math.abs(p.x)), ...puntos.map(p => Math.abs(p.y)));
  const maxLoading = Math.max(...loadings.flat().map(l => Math.abs(l)));
  const escala = maxScore / (maxLoading || 1) * 0.8; // Factor de escala

  const flechas = loadings.map((l,i)=>({
    x: (l[0] || 0) * escala,
    y: (l[1] || 0) * escala,
    label: "X"+(i+1)
  }));

  window.__pcaChart__ = new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "Observaciones (Scores)",
          data: puntos,
          backgroundColor: "rgba(54,162,235,0.8)",
          pointRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: { display: true, text: "Biplot: PCA (PC1 vs PC2)" },
        legend: { position: "top" },
        tooltip: { callbacks: { label: (ctx)=>`(${ctx.parsed.x.toFixed(2)}, ${ctx.parsed.y.toFixed(2)})` } }
      },
      scales: {
        x: { title: { display: true, text: `PC1 (${(proporciones[0]*100).toFixed(1)}%)` }, grid: { color: '#eee' }, ticks: {color: '#333'} },
        y: { title: { display: true, text: `PC2 (${(proporciones[1]*100).toFixed(1)}%)` }, grid: { color: '#eee' }, ticks: {color: '#333'} }
      }
    },
    // Plugin para dibujar las flechas de los loadings
    plugins: [{
      id: 'pcaLoadings',
      afterDatasetsDraw(chart, args, opts) {
        const {ctx, scales:{x,y}} = chart;
        ctx.save();
        const x0 = x.getPixelForValue(0);
        const y0 = y.getPixelForValue(0);

        flechas.forEach(f=>{
          const xPix = x.getPixelForValue(f.x);
          const yPix = y.getPixelForValue(f.y);
          
          // Línea
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(xPix, yPix);
          ctx.strokeStyle = "rgba(255,99,132,0.9)";
          ctx.lineWidth = 2;
          ctx.stroke();

          // Flecha
          const angle = Math.atan2(yPix - y0, xPix - x0);
          ctx.beginPath();
          ctx.moveTo(xPix, yPix);
          ctx.lineTo(xPix - 10 * Math.cos(angle - Math.PI / 6), yPix - 10 * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(xPix - 10 * Math.cos(angle + Math.PI / 6), yPix - 10 * Math.sin(angle + Math.PI / 6));
          ctx.closePath();
          ctx.fillStyle = "rgba(255,99,132,0.9)";
          ctx.fill();

          // Etiqueta
          ctx.font = "bold 12px sans-serif";
          ctx.fillStyle = "#d32f2f";
          ctx.textAlign = (f.x >= 0) ? "left" : "right";
          ctx.textBaseline = (f.y >= 0) ? "bottom" : "top";
          ctx.fillText(f.label, xPix + (f.x >= 0 ? 5 : -5), yPix);
        });
        ctx.restore();
      }
    }]
  });
});