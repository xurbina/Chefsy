const API_BASE = "https://www.themealdb.com/api/json/v1/1/";

// Referencias del DOM
const inicio = document.getElementById("inicio");
const botonInicio = document.getElementById("botonInicio");
const vistaPrincipal = document.getElementById("vistaPrincipal");
const campoBusqueda = document.getElementById("campoBusqueda");
const botonBuscar = document.getElementById("botonBuscar");
const botonAleatoria = document.getElementById("botonAleatoria");
const contenedorRecetas = document.getElementById("contenedorRecetas");
const detalleReceta = document.getElementById("detalleReceta");

// Diccionario de traducciones (mantener/ajustar según necesites)
const traducciones = {
  "Beef and Mustard Pie": "Pastel de carne con mostaza",
  "Chicken Handi": "Pollo al curry estilo Handi",
  "Tuna and Egg Salad": "Ensalada de atún y huevo",
  "Lasagne": "Lasaña italiana",
  "Apple Frangipan Tart": "Tarta de manzana y almendra",
  "Chilli con Carne": "Chili con carne",
  "Pad Thai": "Pad Thai (Tallarines tailandeses)",
  "Spaghetti Bolognese": "Espagueti a la boloñesa",
  "Pancakes": "Hotcakes clásicos",
  "Beef Wellington": "Solomillo Wellington"
};

// -------------------- Inicio y eventos --------------------
botonInicio.addEventListener("click", () => {
  inicio.classList.add("d-none");
  vistaPrincipal.classList.remove("d-none");
  cargarRecetasAleatorias();
});

botonBuscar.addEventListener("click", () => buscarReceta(campoBusqueda.value));
campoBusqueda.addEventListener("keypress", (e) => {
  if (e.key === "Enter") buscarReceta(campoBusqueda.value);
});
botonAleatoria.addEventListener("click", cargarRecetaAleatoria);

// -------------------- Helpers para peticiones --------------------
async function obtenerJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    // Devuelve el array 'meals' o null si no hay resultados
    return json.meals || null;
  } catch (error) {
    console.error("Error en fetch:", error);
    mostrarMensajeError("Error al comunicarse con el servicio. Inténtalo de nuevo más tarde.");
    return null;
  }
}

function mostrarMensajeError(texto) {
  contenedorRecetas.innerHTML = `<p class="text-center text-danger">${texto}</p>`;
}

// -------------------- Cargar inicial --------------------
async function cargarRecetasAleatorias() {
  contenedorRecetas.innerHTML = "<p class='text-center'>Cargando recetas...</p>";
  // Pedimos 6 recetas aleatorias (cada llamada devuelve un array con 1 elemento)
  const promesas = Array.from({ length: 6 }).map(() => obtenerJSON(`${API_BASE}random.php`));
  const resultados = await Promise.all(promesas);
  // resultados es array de arrays (o null), aplanamos filtrando nulls
  const meals = resultados.flat().filter(Boolean);
  if (meals.length === 0) {
    contenedorRecetas.innerHTML = "<p class='text-center'>No se pudieron cargar recetas.</p>";
    return;
  }
  mostrarRecetas(meals);
}

// -------------------- Búsqueda (nombre o ingrediente) --------------------
async function buscarReceta(termino) {
  const q = (termino || "").trim();
  if (!q) {
    // Si el campo está vacío, volvemos a cargar recetas aleatorias
    cargarRecetasAleatorias();
    return;
  }

  contenedorRecetas.innerHTML = "<p class='text-center'>Buscando recetas...</p>";

  // 1) Intentar búsqueda por nombre
  const byName = await obtenerJSON(`${API_BASE}search.php?s=${encodeURIComponent(q)}`);
  if (byName && byName.length > 0) {
    mostrarRecetas(byName);
    return;
  }

  // 2) Si no hay por nombre, intentar filtrar por ingrediente
  const byIngredient = await obtenerJSON(`${API_BASE}filter.php?i=${encodeURIComponent(q)}`);
  if (byIngredient && byIngredient.length > 0) {
    // filter.php retorna objetos con idMeal, strMeal y strMealThumb
    mostrarRecetasFiltradas(byIngredient);
    return;
  }

  // 3) Si tampoco, mostrar mensaje
  contenedorRecetas.innerHTML = `<p class='text-center'>No se encontraron recetas para "${q}".</p>`;
}

// -------------------- Renderizado de resultados --------------------
// Para respuestas completas (search.php o random.php)
function mostrarRecetas(recetas) {
  contenedorRecetas.innerHTML = "";
  recetas.forEach(receta => {
    const nombreTraducido = traducciones[receta.strMeal] || receta.strMeal;
    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-lg-4";
    col.innerHTML = `
      <div class="tarjeta-receta">
        <img src="${receta.strMealThumb}" class="imagen-receta" alt="${nombreTraducido}">
        <div class="info-receta">
          <h5>${nombreTraducido}</h5>
          <p class="mb-2 text-muted">${receta.strArea || "Internacional"}</p>
          <button class="btn btn-buscar btn-sm ver-detalle" data-id="${receta.idMeal}">Ver receta</button>
        </div>
      </div>
    `;
    // evento para abrir detalle (usa lookup.php por id)
    col.querySelector(".ver-detalle").addEventListener("click", async (e) => {
      const id = e.currentTarget.dataset.id;
      mostrarDetallePorId(id);
    });
    contenedorRecetas.appendChild(col);
  });
}

// Para respuestas de filter.php (que sólo traen idMeal, strMeal, strMealThumb)
function mostrarRecetasFiltradas(recetasFiltradas) {
  contenedorRecetas.innerHTML = "";
  recetasFiltradas.forEach(item => {
    const nombreTraducido = traducciones[item.strMeal] || item.strMeal;
    const col = document.createElement("div");
    col.className = "col-12 col-md-6 col-lg-4";
    col.innerHTML = `
      <div class="tarjeta-receta">
        <img src="${item.strMealThumb}" class="imagen-receta" alt="${nombreTraducido}">
        <div class="info-receta">
          <h5>${nombreTraducido}</h5>
          <p class="mb-2 text-muted">Resultado por ingrediente</p>
          <button class="btn btn-buscar btn-sm ver-detalle" data-id="${item.idMeal}">Ver receta</button>
        </div>
      </div>
    `;
    col.querySelector(".ver-detalle").addEventListener("click", () => mostrarDetallePorId(item.idMeal));
    contenedorRecetas.appendChild(col);
  });
}

// -------------------- Detalle de receta --------------------
async function mostrarDetallePorId(id) {
  if (!id) return;
  contenedorRecetas.innerHTML = ""; // opcional: limpiar lista para ahorrar espacio
  detalleReceta.classList.remove("d-none");
  vistaPrincipal.classList.add("d-none");

  // Obtener detalle completo con lookup.php
  const result = await obtenerJSON(`${API_BASE}lookup.php?i=${encodeURIComponent(id)}`);
  const receta = result ? result[0] : null;
  if (!receta) {
    detalleReceta.innerHTML = `<p class="text-center">No se pudo cargar la receta. Intenta de nuevo.</p><button class="boton-volver" id="btnVolver">← Volver</button>`;
    document.getElementById("btnVolver").addEventListener("click", () => {
      detalleReceta.classList.add("d-none");
      vistaPrincipal.classList.remove("d-none");
    });
    return;
  }

  const nombreTraducido = traducciones[receta.strMeal] || receta.strMeal;

  // Extraer ingredientes y medidas (1..20)
  const ingredientes = [];
  for (let i = 1; i <= 20; i++) {
    const ing = receta[`strIngredient${i}`];
    const med = receta[`strMeasure${i}`];
    if (ing && ing.trim()) ingredientes.push(`${med ? med.trim() : ""} ${ing.trim()}`.trim());
  }

  detalleReceta.innerHTML = `
    <button class="boton-volver" id="btnVolver">← Volver</button>
    <img src="${receta.strMealThumb}" class="imagen-plato" alt="${nombreTraducido}">
    <h3 class="fw-bold mb-3">${nombreTraducido}</h3>
    <h5>Ingredientes</h5>
    <ul>${ingredientes.map(i => `<li>${i}</li>`).join("")}</ul>
    <h5 class="mt-4">Preparación</h5>
    <p>${receta.strInstructions ? receta.strInstructions.replace(/\r\n/g, "<br>") : "No hay instrucciones disponibles."}</p>
  `;

  document.getElementById("btnVolver").addEventListener("click", () => {
    detalleReceta.classList.add("d-none");
    vistaPrincipal.classList.remove("d-none");
  });
}

// -------------------- Receta aleatoria --------------------
async function cargarRecetaAleatoria() {
  contenedorRecetas.innerHTML = "<p class='text-center'>Cargando receta aleatoria...</p>";
  const receta = (await obtenerJSON(`${API_BASE}random.php`))?.[0] || null;
  if (receta) {
    mostrarDetallePorId(receta.idMeal);
  } else {
    mostrarMensajeError("No fue posible obtener una receta aleatoria.");
  }
}