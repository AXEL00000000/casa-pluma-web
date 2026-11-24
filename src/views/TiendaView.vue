<script setup>
import { computed, onMounted, ref } from "vue";
import { api, mensajeError } from "../services/api";
import { agregar, enCarrito, pesos } from "../services/carrito";

const productos = ref([]);
const error = ref("");
const cargando = ref(true);
const filtro = ref("Todos");

const COLORES = {
  "La Soledad": ["#9B1C2E", "#E9D9C4"],
  "El Mirador": ["#2F5A3C", "#D7E0D2"],
  "Cerro Verde": ["#D9A033", "#F1DDC8"],
  "Los Naranjos": ["#221A17", "#E2D3D5"],
};
const color = (p) => COLORES[p.lote] || ["#675C57", "#EBE6DF"];
const visibles = computed(() => productos.value.filter((p) => filtro.value === "Todos" || p.categoria === filtro.value));

onMounted(async () => {
  try {
    productos.value = (await api.get("/productos")).data;
  } catch (e) {
    error.value = mensajeError(e);
  } finally {
    cargando.value = false;
  }
});
</script>

<template>
  <section class="portada">
    <div class="envoltura">
      <h1>Café de Pluma Hidalgo, tostado cada semana.</h1>
      <p>Cuatro lotes de la Sierra Sur de Oaxaca en grano, molido y bolsa de kilo.</p>
    </div>
  </section>

  <main class="envoltura tienda">
    <div class="pestanas" role="tablist">
      <button v-for="c in ['Todos', 'Grano', 'Molido', 'Accesorio']" :key="c" class="pestana" role="tab"
        :aria-selected="filtro === c" @click="filtro = c">{{ c === "Accesorio" ? "Accesorios" : c }}</button>
    </div>

    <p v-if="cargando" class="cargando">Cargando catálogo…</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <p v-else-if="!productos.length" class="aviso">El catálogo está vacío. Inicia sesión y ejecuta el ETL para cargar los productos.</p>

    <div class="productos">
      <article v-for="p in visibles" :key="p.id_producto" class="producto">
        <div class="bolsa" :style="{ background: color(p)[1] }">
          <svg v-if="p.categoria !== 'Accesorio'" viewBox="0 0 120 150" aria-hidden="true">
            <path d="M22 18 H98 L104 140 H16 Z" :fill="color(p)[0]" />
            <path d="M22 18 H98 V30 H22 Z" fill="#000" opacity=".18" />
            <rect x="34" y="58" width="52" height="52" rx="3" fill="#F4F1EC" />
            <ellipse cx="60" cy="84" rx="11" ry="15" :fill="color(p)[0]" />
            <path d="M60 70 c-3 6 -3 22 0 28" stroke="#F4F1EC" stroke-width="2" fill="none" />
          </svg>
          <svg v-else viewBox="0 0 120 150" aria-hidden="true">
            <rect x="30" y="50" width="56" height="70" rx="8" fill="#221A17" />
            <path d="M86 64 h10 a10 10 0 0 1 0 28 h-10" stroke="#221A17" stroke-width="7" fill="none" />
            <rect x="30" y="50" width="56" height="12" rx="4" fill="#675C57" />
          </svg>
        </div>
        <div class="cuerpo">
          <span class="presentacion">{{ p.categoria }} · {{ p.presentacion }}</span>
          <h3>{{ p.nombre.split(" · ")[0] }}</h3>
          <span class="disp" :class="'d-' + p.disponibilidad.replace(/\s|ú/g, '')">{{ p.disponibilidad }}</span>
          <div class="pie">
            <strong class="num">{{ pesos(p.precio) }}</strong>
            <button class="agregar" type="button" :disabled="!p.maximo_pedido || enCarrito(p.id_producto) >= p.maximo_pedido"
              @click="agregar(p)">{{ !p.maximo_pedido ? "No disponible" : enCarrito(p.id_producto) ? `En carrito (${enCarrito(p.id_producto)})` : "Agregar" }}</button>
          </div>
        </div>
      </article>
    </div>
  </main>
</template>

<style scoped>
.portada { background: var(--cereza); color: var(--papel); padding: 54px 0 46px; }
.portada h1 { font-size: clamp(2.2rem, 5.6vw, 4.4rem); font-weight: 800; letter-spacing: -0.035em; max-width: 15ch; margin-bottom: 14px; }
.portada p { font-size: 1.1rem; opacity: .9; margin: 0; }
.tienda { padding: 32px 24px 64px; }
.pestanas { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; }
.pestana { background: transparent; border: 2px solid var(--tinta); border-radius: 999px; padding: 7px 18px; font-weight: 600; cursor: pointer; }
.pestana[aria-selected="true"] { background: var(--tinta); color: var(--papel); }
.productos { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 18px; }
.producto { background: var(--blanco); border: 1px solid var(--linea); border-radius: 6px; overflow: hidden; display: flex; flex-direction: column; }
.bolsa { aspect-ratio: 4 / 3; display: grid; place-items: center; }
.bolsa svg { height: 78%; }
.cuerpo { padding: 16px; display: flex; flex-direction: column; gap: 4px; flex: 1; }
.presentacion { font-size: .78rem; font-weight: 700; color: var(--tenue); text-transform: uppercase; letter-spacing: .05em; }
.cuerpo h3 { font-size: 1.25rem; }
.disp { font-size: .8rem; font-weight: 600; color: var(--hoja); }
.d-Agotado { color: var(--cereza); }
.d-Últimaspiezas, .d-ltimaspiezas { color: #9a6a10; }
.d-Consultar { color: var(--tenue); }
.pie { display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 10px; }
.pie strong { font-size: 1.1rem; }
.agregar { background: var(--tinta); color: var(--papel); border: 0; border-radius: 999px; padding: 7px 14px; font-weight: 700; cursor: pointer; }
.agregar:disabled { background: var(--linea); color: var(--tenue); cursor: not-allowed; }
</style>
