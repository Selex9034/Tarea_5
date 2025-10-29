// =====================
// Funciones auxiliares
// =====================
function promedio(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// =====================
// Variables principales
// =====================
const contenedor = document.getElementById("grupos");
const btnAgregar = document.getElementById("agregar");
const btnEliminar = document.getElementById("eliminar");
const btnCalcular = document.getElementById("calcular");
const salida = document.getElementById("salida");
const tablaAnovaDiv = document.getElementById("tabla-anova");
const errorBox = document.getElementById("error-box"); // <-- NUEVO
let contador = 0;

// Estado inicial
for (let i = 0; i < 3; i++) agregarGrupo();

// =====================
// Gestión dinámica
// =====================
btnAgregar.addEventListener("click", () => agregarGrupo());
btnEliminar.addEventListener("click", () => eliminarGrupo());

function agregarGrupo() {
  contador++;
  const div = document.createElement("div");
  div.className = "grupo form-group"; // <-- Clase añadida
  div.dataset.id = contador;
  div.innerHTML = `
    <label>Grupo ${contador}:</label>
    <input type="text" placeholder="Ejemplo: 12, 15, 14, 10" />
  `;
  contenedor.appendChild(div);
}

function eliminarGrupo() {
  const grupos = contenedor.querySelectorAll(".grupo");
  if (grupos.length > 1) {
    contenedor.removeChild(grupos[grupos.length - 1]);
    contador--;
  } else {
    // Reemplaza alert()
    errorBox.textContent = "Debe haber al menos un grupo.";
    errorBox.style.display = "block";
  }
}

// =====================
// Cálculo del ANOVA
// =====================
btnCalcular.addEventListener("click", () => {
  salida.textContent = "";
  tablaAnovaDiv.innerHTML = "";
  errorBox.style.display = "none"; // <-- NUEVO

  const grupos = Array.from(document.querySelectorAll("#grupos input"))
                      .map(input => input.value
                        .split(",")
                        .map(v => parseFloat(v.trim()))
                        .filter(v => !isNaN(v)));

  const gruposValidos = grupos.filter(g => g.length > 0);
  if (gruposValidos.length < 2) {
    // Reemplaza alert()
    errorBox.textContent = "Debes ingresar al menos dos grupos con datos válidos.";
    errorBox.style.display = "block";
    return;
  }

  const todos = gruposValidos.flat();
  const mediaGlobal = promedio(todos);

  // Cálculo SSB y SSW
  const SSB = gruposValidos.reduce((sum, g) =>
    sum + g.length * Math.pow(promedio(g) - mediaGlobal, 2), 0);

  const SSW = gruposValidos.reduce((sum, g) =>
    sum + g.reduce((s, x) => s + Math.pow(x - promedio(g), 2), 0), 0);

  const df_between = gruposValidos.length - 1;
  const df_within = todos.length - gruposValidos.length;
  const df_total = todos.length - 1;

  const MSB = SSB / df_between;
  const MSW = SSW / df_within;
  const F = MSB / MSW;

  // Mostrar resultados numéricos
  salida.textContent = `
Número de grupos: ${gruposValidos.length}
Media global: ${mediaGlobal.toFixed(3)}

SSB (Entre grupos): ${SSB.toFixed(3)}
SSW (Dentro de grupos): ${SSW.toFixed(3)}

MSB: ${MSB.toFixed(3)}
MSW: ${MSW.toFixed(3)}

F: ${F.toFixed(3)}
df_between: ${df_between}
df_within: ${df_within}
df_total: ${df_total}
`;

  // =====================
  // Tabla ANOVA (sin estilos en línea)
  // =====================
  const tablaHTML = `
    <table>
      <thead>
        <tr>
          <th>Fuente</th><th>SS</th><th>df</th><th>MS</th><th>F</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Entre grupos</td>
          <td>${SSB.toFixed(3)}</td>
          <td>${df_between}</td>
          <td>${MSB.toFixed(3)}</td>
          <td>${F.toFixed(3)}</td>
        </tr>
        <tr>
          <td>Dentro de grupos</td>
          <td>${SSW.toFixed(3)}</td>
          <td>${df_within}</td>
          <td>${MSW.toFixed(3)}</td>
          <td>-</td>
        </tr>
        <tr>
          <td><b>Total</b></td>
          <td><b>${(SSB + SSW).toFixed(3)}</b></td>
          <td><b>${df_total}</b></td>
          <td>-</td>
          <td>-</td>
        </tr>
      </tbody>
    </table>
  `;
  tablaAnovaDiv.innerHTML = tablaHTML;

  // =====================
  // Gráficos (Chart.js)
  // =====================
  const maxDatos = 300;
  limpiarGraficos(); // limpiar antes de redibujar

  if (todos.length > maxDatos) {
    salida.textContent += `\n⚠️ Los gráficos no se muestran porque hay más de ${maxDatos} valores totales (${todos.length}).`;
    return;
  }

  const labels = gruposValidos.map((_, i) => `Grupo ${i + 1}`);
  const medias = gruposValidos.map(g => promedio(g));

  const colores = [
    "#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f",
    "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac"
  ];

  // -------- Gráfico de medias --------
  const ctxMedias = document.getElementById("graficoMedias");
  if (window.__chartMedias__) window.__chartMedias__.destroy();
  window.__chartMedias__ = new Chart(ctxMedias, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Media por grupo",
        data: medias,
        backgroundColor: colores.slice(0, gruposValidos.length),
        borderColor: "#333",
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: { display: true, text: "Medias por grupo" },
        tooltip: { enabled: true },
        datalabels: {
          anchor: 'end',
          align: 'top',
          formatter: v => v.toFixed(2),
          color: '#333'
        }
      },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: "Valor medio" } }
      }
    },
    plugins: [ChartDataLabels]
  });

  // -------- Gráfico de dispersión --------
  const ctxDisp = document.getElementById("graficoDispersion");

  const datasetsDisp = gruposValidos.map((g, i) => ({
    label: `Grupo ${i + 1}`,
    data: g.map(v => ({ x: i + 1 + (Math.random() - 0.5) * 0.4, y: v })), // Añadido Jitter
    backgroundColor: colores[i % colores.length] + "CC",
    pointRadius: 5,
    pointHoverRadius: 7
  }));

  if (window.__chartDisp__) window.__chartDisp__.destroy();
  window.__chartDisp__ = new Chart(ctxDisp, {
    type: "scatter",
    data: { datasets: datasetsDisp },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: { display: true, text: "Dispersión de valores por grupo" },
        legend: { position: "right" }
      },
      scales: {
        x: {
          type: "linear",
          position: "bottom",
          title: { display: true, text: "Grupo" },
          ticks: { stepSize: 1, callback: (v) => (v % 1 === 0 && v > 0) ? `Grupo ${v}` : "" },
          min: 0.5,
          max: gruposValidos.length + 0.5
        },
        y: { title: { display: true, text: "Valor" } }
      }
    }
  });
});

// =====================
// Limpiar gráficos previos
// =====================
function limpiarGraficos() {
  if (window.__chartMedias__) window.__chartMedias__.destroy();
  if (window.__chartDisp__) window.__chartDisp__.destroy();
}