// =====================
// Utilidades numéricas (JS puro)
// =====================
function parseLista(txt) {
  return txt
    .split(",")
    .map(v => parseFloat(v.trim()))
    .filter(v => !isNaN(v));
}

function media(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function sumCuadrados(arr, m) {
  // sum (xi - m)^2
  let s = 0;
  for (let i = 0; i < arr.length; i++) {
    const d = arr[i] - m;
    s += d * d;
  }
  return s;
}

function sumProductoCentrado(x, y, mx, my) {
  // sum (xi - mx)(yi - my)
  let s = 0;
  for (let i = 0; i < x.length; i++) {
    s += (x[i] - mx) * (y[i] - my);
  }
  return s;
}

function correlacionPearson(x, y) {
  // r = sum((xi - mx)(yi - my)) / sqrt( sum(xi - mx)^2 * sum(yi - my)^2 )
  const n = x.length;
  const mx = media(x);
  const my = media(y);
  const Sxx = sumCuadrados(x, mx);
  const Syy = sumCuadrados(y, my);
  const Sxy = sumProductoCentrado(x, y, mx, my);

  const denom = Math.sqrt(Sxx * Syy) || 0;
  const r = denom === 0 ? NaN : (Sxy / denom);

  // Pendiente e intercepto de la recta de regresión Y~X (MCO)
  // slope = Sxy / Sxx ; intercept = my - slope*mx
  const slope = Sxx === 0 ? NaN : (Sxy / Sxx);
  const intercept = isNaN(slope) ? NaN : (my - slope * mx);

  // Desv. estándar muestral (con n-1 en denominador) para reporte
  const sx = Math.sqrt(Sxx / (n - 1));
  const sy = Math.sqrt(Syy / (n - 1));

  return { r, mx, my, Sxx, Syy, Sxy, sx, sy, slope, intercept };
}

// =====================
// Referencias DOM
// =====================
const xInput = document.getElementById("xInput");
const yInput = document.getElementById("yInput");
const btnCalcular = document.getElementById("calcular");
const salida = document.getElementById("salida");
const tablaResumenDiv = document.getElementById("tablaResumen");
const notaGrafico = document.getElementById("notaGrafico");
const errorBox = document.getElementById("error-box"); // <-- NUEVO
let scatterChart = null;

// =====================
// Lógica principal
// =====================
btnCalcular.addEventListener("click", () => {
  salida.textContent = "";
  tablaResumenDiv.innerHTML = "";
  notaGrafico.textContent = "";
  errorBox.style.display = "none"; // <-- NUEVO

  const X = parseLista(xInput.value);
  const Y = parseLista(yInput.value);

  if (X.length < 2 || Y.length < 2) {
    // Reemplaza alert()
    errorBox.textContent = "Debes ingresar al menos dos valores en X y Y.";
    errorBox.style.display = "block";
    return;
  }
  if (X.length !== Y.length) {
    // Reemplaza alert()
    errorBox.textContent = "Las listas X e Y deben tener la misma longitud.";
    errorBox.style.display = "block";
    return;
  }

  const n = X.length;
  const { r, mx, my, Sxx, Syy, Sxy, sx, sy, slope, intercept } = correlacionPearson(X, Y);

  // Reporte base
  const r2 = r * r;
  salida.textContent =
`n: ${n}
media(X): ${mx.toFixed(6)}   media(Y): ${my.toFixed(6)}
sx (muestral): ${sx.toFixed(6)}   sy (muestral): ${sy.toFixed(6)}

Sxx: ${Sxx.toFixed(6)}   Syy: ${Syy.toFixed(6)}   Sxy: ${Sxy.toFixed(6)}

r (Pearson): ${isNaN(r) ? "NaN" : r.toFixed(6)}
r^2: ${isNaN(r2) ? "NaN" : r2.toFixed(6)}

Recta Y ~ X (MCO):
  pendiente (slope): ${isNaN(slope) ? "NaN" : slope.toFixed(6)}
  intercepto:        ${isNaN(intercept) ? "NaN" : intercept.toFixed(6)}
`;

  // Tabla resumen sin estilos en línea
  let tabla = `<table>
  <thead><tr><th>#</th><th>X</th><th>Y</th><th>X-mean(X)</th><th>Y-mean(Y)</th><th>(X-μx)(Y-μy)</th></tr></thead><tbody>`;
  for (let i = 0; i < n; i++) {
    const dx = X[i] - mx;
    const dy = Y[i] - my;
    tabla += `<tr>
      <td>${i + 1}</td>
      <td>${X[i]}</td>
      <td>${Y[i]}</td>
      <td>${dx.toFixed(6)}</td>
      <td>${dy.toFixed(6)}</td>
      <td>${(dx * dy).toFixed(6)}</td>
    </tr>`;
  }
  tabla += `</tbody></table>`;
  tablaResumenDiv.innerHTML = tabla;

  // =====================
  // Gráfico (scatter + recta de regresión)
  // =====================
  const MAX_PUNTOS = 500;
  if (n > MAX_PUNTOS) {
    notaGrafico.textContent = `⚠️ No se muestra el gráfico porque hay más de ${MAX_PUNTOS} puntos (${n}).`;
    if (scatterChart) { scatterChart.destroy(); scatterChart = null; }
    return;
  }

  const canvas = document.getElementById("graficoScatter");
  if (!canvas.width) canvas.width = 900;
  if (!canvas.height) canvas.height = 420;

  // Datos de dispersión
  const puntos = X.map((x, i) => ({ x, y: Y[i] }));

  // Recta de regresión: tomamos dos puntos para dibujar la línea
  const xMin = Math.min(...X);
  const xMax = Math.max(...X);
  const linea = isNaN(slope) || isNaN(intercept)
    ? []
    : [{ x: xMin, y: slope * xMin + intercept }, { x: xMax, y: slope * xMax + intercept }];

  if (scatterChart) scatterChart.destroy();
  const ctx = canvas.getContext("2d");

  scatterChart = new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "Datos",
          data: puntos,
          pointRadius: 4,
          pointHoverRadius: 6,
          backgroundColor: "rgba(54,162,235,0.8)"
        },
        ...(linea.length ? [{
          label: "Recta Y~X",
          type: "line",
          data: linea,
          fill: false,
          borderWidth: 2,
          borderColor: "rgba(255,99,132,0.9)",
          pointRadius: 0,
          tension: 0
        }] : [])
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: { display: true, text: "Dispersión X vs Y y recta de regresión" },
        legend: { position: "top" },
        tooltip: {
          callbacks: {
            label: (ctx) => `(${ctx.parsed.x}, ${ctx.parsed.y})`
          }
        }
      },
      scales: {
        x: { title: { display: true, text: "X" } },
        y: { title: { display: true, text: "Y" } }
      }
    }
  });
});