// =====================
// Funciones auxiliares
// =====================
function crearMatriz(filas, columnas, valor = 0) {
  return Array.from({ length: filas }, () => Array(columnas).fill(valor));
}
function sumarFila(matriz, i) { return matriz[i].reduce((a, b) => a + b, 0); }
function sumarColumna(matriz, j) { return matriz.reduce((a, fila) => a + fila[j], 0); }

// ---- Visual: helpers para heatmap de tabla esperada ----
function normalizadorGlobal(M) {
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < M.length; i++) {
    for (let j = 0; j < M[0].length; j++) {
      const v = M[i][j];
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  const den = (max - min) || 1;
  return (i, j) => (M[i][j] - min) / den;
}
function colorHeat(t) {
  const l = 95 - Math.round(t * 60); // 95% -> 35%
  return `hsl(210, 60%, ${l}%)`;
}
function renderTablaEsperadaHeatmap(esperados, totalGeneral, contenedor) {
  const filas = esperados.length, columnas = esperados[0].length;
  const norm = normalizadorGlobal(esperados);

  let html = `<h3>Frecuencias esperadas (heatmap)</h3>`;
  html += `<table><tbody>`; // <-- Sin estilos en línea
  for (let i = 0; i < filas; i++) {
    html += `<tr>`;
    for (let j = 0; j < columnas; j++) {
      const val = esperados[i][j];
      const t = norm(i, j);
      const bg = colorHeat(t);
      const pct = totalGeneral > 0 ? ` <small>(${(val * 100 / totalGeneral).toFixed(1)}%)</small>` : "";
      // El estilo background es dinámico, por lo que debe permanecer en línea
      html += `<td style="background:${bg}">${val.toFixed(2)}${pct}</td>`;
    }
    html += `</tr>`;
  }
  html += `</tbody></table>`;
  contenedor.innerHTML = html;
}

// =====================
// Referencias HTML
// =====================
const nFilas = document.getElementById("nFilas");
const nCols = document.getElementById("nCols");
const btnGenerar = document.getElementById("generar");
const contenedor = document.getElementById("contenedor-tabla");
const btnCalcular = document.getElementById("calcular");
const salida = document.getElementById("salida");
const tablaEsperadaDiv = document.getElementById("tabla-esperada");
const errorBox = document.getElementById("error-box"); // <-- NUEVO

// =====================
// Crear tabla inicial
// =====================
btnGenerar.addEventListener("click", generarTabla);
let tablaInputs = [];

function generarTabla() {
  const filas = Math.max(2, parseInt(nFilas.value) || 2);
  const columnas = Math.max(2, parseInt(nCols.value) || 2);
  contenedor.innerHTML = "";

  const tabla = document.createElement("table");
  // Estilos en línea eliminados, se aplican desde styles.css
  
  tablaInputs = [];
  for (let i = 0; i < filas; i++) {
    const fila = document.createElement("tr");
    const inputsFila = [];

    for (let j = 0; j < columnas; j++) {
      const celda = document.createElement("td");
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.value = "0";
      // input.style.width = "70px"; (movido a styles.css)
      celda.appendChild(input);
      fila.appendChild(celda);
      inputsFila.push(input);
    }

    tabla.appendChild(fila);
    tablaInputs.push(inputsFila);
  }

  contenedor.appendChild(tabla);
  generarTabla(); // Genera la tabla 2x2 inicial al cargar
}

// =====================
// Calcular Chi-cuadrado
// =====================
btnCalcular.addEventListener("click", () => {
  errorBox.style.display = "none"; // <-- NUEVO

  if (tablaInputs.length === 0) {
    errorBox.textContent = "Primero genera la tabla de contingencia.";
    errorBox.style.display = "block";
    return;
  }

  const filas = tablaInputs.length;
  const columnas = tablaInputs[0].length;

  const observados = crearMatriz(filas, columnas);
  for (let i = 0; i < filas; i++) {
    for (let j = 0; j < columnas; j++) {
      observados[i][j] = Math.max(0, parseFloat(tablaInputs[i][j].value) || 0);
    }
  }

  const totalGeneral = observados.flat().reduce((a, b) => a + b, 0);
  if (totalGeneral === 0) {
    errorBox.textContent = "La tabla no puede estar vacía o contener solo ceros.";
    errorBox.style.display = "block";
    return;
  }

  const esperados = crearMatriz(filas, columnas);
  for (let i = 0; i < filas; i++) {
    for (let j = 0; j < columnas; j++) {
      esperados[i][j] = (sumarFila(observados, i) * sumarColumna(observados, j)) / totalGeneral;
    }
  }

  let chi2 = 0;
  for (let i = 0; i < filas; i++) {
    for (let j = 0; j < columnas; j++) {
      const O = observados[i][j];
      const E = esperados[i][j];
      if (E === 0) {
          // Advertencia si la frecuencia esperada es 0
          salida.textContent += `\nADVERTENCIA: Frecuencia esperada de 0 en la celda (${i+1},${j+1}). El cálculo puede ser inestable.\n`;
      }
      chi2 += Math.pow(O - E, 2) / (E || 1); // evita /0
    }
  }

  const df = (filas - 1) * (columnas - 1);

  salida.textContent =
`Tabla ${filas}x${columnas}
Total general: ${totalGeneral}
Grados de libertad (df): ${df}
Chi-cuadrado (χ²): ${chi2.toFixed(4)}`;

  renderTablaEsperadaHeatmap(esperados, totalGeneral, tablaEsperadaDiv);

  // =====================
  // Gráfico de comparación
  // =====================
  const canvas = document.getElementById("graficoChi");
  const etiquetas = [];
  const valoresObs = [];
  const valoresEsp = [];
  for (let i = 0; i < filas; i++) {
    for (let j = 0; j < columnas; j++) {
      etiquetas.push(`(${i + 1},${j + 1})`);
      valoresObs.push(observados[i][j]);
      valoresEsp.push(esperados[i][j]);
    }
  }

  if (window.__chiChart__) {
    window.__chiChart__.destroy();
    window.__chiChart__ = null;
  }

  if (typeof Chart === "undefined") {
    salida.textContent += "\n No se cargó Chart.js. Revisa el <script> del CDN.";
    return;
  }

  const totalObs = valoresObs.reduce((a, b) => a + b, 0) || 1;
  const totalEsp = valoresEsp.reduce((a, b) => a + b, 0) || 1;

  const ctx = canvas.getContext("2d");
  window.__chiChart__ = new Chart(ctx, {
    type: "bar",
    data: {
      labels: etiquetas,
      datasets: [
        {
          label: "Observados",
          data: valoresObs,
          backgroundColor: "rgba(54,162,235,0.7)",
          borderColor: "rgba(54,162,235,1)",
          borderWidth: 1
        },
        {
          label: "Esperados",
          data: valoresEsp,
          backgroundColor: "rgba(255,99,132,0.55)",
          borderColor: "rgba(255,99,132,1)",
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: { display: true, text: "Comparación de frecuencias observadas vs esperadas" },
        legend: { position: "top" },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed.y;
              const pct = ctx.dataset.label === "Observados"
                ? (v * 100 / totalObs)
                : (v * 100 / totalEsp);
              return `${ctx.dataset.label}: ${v.toFixed(2)} (${pct.toFixed(1)}%)`;
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: "Celda (fila,columna)" },
          ticks: { maxRotation: 0 }
        },
        y: { beginAtZero: true, title: { display: true, text: "Frecuencia" } }
      }
    }
  });
});

// Generar tabla 2x2 al cargar la página
generarTabla();