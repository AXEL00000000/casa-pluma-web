<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { api, mensajeError } from "../services/api";
import DetalleProducto from "../components/DetalleProducto.vue";

// Parámetros del escenario (se envían al modelo en el backend)
const factorDemanda = ref(1);
const margenSeguridad = ref(3);
const diasVentana = ref(30);
// Filtros de la tabla (no recalculan el modelo)
const categoria = ref("Todas");
const soloPrioridad = ref("Todas");
const busqueda = ref("");

const datos = ref(null);
const comparacion = ref(null);
const error = ref("");
const cargando = ref(false);
const seleccionado = ref(null);

const ESCENARIOS = [
  { etiqueta: "−20 %", valor: 0.8 },
  { etiqueta: "Normal", valor: 1 },
  { etiqueta: "+20 %", valor: 1.2 },
];

// Escenario contra el que se compara la demanda normal en la gráfica
const factorEscenario = computed(() => (factorDemanda.value === 1 ? 1.2 : factorDemanda.value));
const etiquetaEscenario = computed(() => {
  const d = Math.round((factorEscenario.value - 1) * 100);
  return `${d > 0 ? "+" : "−"}${Math.abs(d)} %`;
});

let temporizador;
async function cargar() {
  cargando.value = true;
  error.value = "";
  const params = { factorDemanda: factorDemanda.value, margenSeguridad: margenSeguridad.value, diasVentana: diasVentana.value };
  try {
    const [r, c] = await Promise.all([
      api.get("/dss/recomendaciones", { params }),
      api.get("/dss/comparar", { params: { factorBase: 1, factorEscenario: factorEscenario.value, margenSeguridad: margenSeguridad.value, diasVentana: diasVentana.value } }),
    ]);
    datos.value = r.data;
    comparacion.value = c.data;
    if (seleccionado.value) seleccionado.value = r.data.resultados.find((x) => x.idProducto === seleccionado.value.idProducto) ?? null;
  } catch (e) {
    error.value = mensajeError(e);
  } finally {
    cargando.value = false;
  }
}
watch([factorDemanda, margenSeguridad, diasVentana], () => {
  clearTimeout(temporizador);
  temporizador = setTimeout(cargar, 200);
});
onMounted(cargar);

const cambioPorId = computed(() => new Map((factorDemanda.value === 1 ? [] : comparacion.value?.cambios ?? []).map((c) => [c.idProducto, c])));
const cambios = computed(() => (comparacion.value?.cambios ?? []).filter((c) => c.cambia));

// Gráfica: productos por prioridad, demanda normal contra el escenario
const GRUPOS = [
  { clave: "alta", nombre: "Alta", clase: "p-ALTA" },
  { clave: "media", nombre: "Media", clase: "p-MEDIA" },
  { clave: "baja", nombre: "Baja", clase: "p-BAJA" },
  { clave: "sinDatos", nombre: "Sin datos", clase: "p-SIN-DATOS" },
];
const grafica = computed(() => {
  const c = comparacion.value;
  if (!c) return [];
  const max = Math.max(1, ...GRUPOS.flatMap((g) => [c.base.resumen[g.clave], c.escenario.resumen[g.clave]]));
  return GRUPOS.map((g) => ({ ...g, base: c.base.resumen[g.clave], escenario: c.escenario.resumen[g.clave],
    anchoBase: (c.base.resumen[g.clave] / max) * 100, anchoEscenario: (c.escenario.resumen[g.clave] / max) * 100 }));
});

const filas = computed(() => {
  const q = busqueda.value.trim().toLowerCase();
  return (datos.value?.resultados ?? []).filter((r) =>
    (categoria.value === "Todas" || r.categoria === categoria.value)
    && (soloPrioridad.value === "Todas" || r.prioridad === soloPrioridad.value)
    && (!q || r.nombre.toLowerCase().includes(q) || r.idProducto.toLowerCase().includes(q)));
});

const tarjetas = computed(() => {
  const s = datos.value?.resumen;
  if (!s) return [];
  return [
    { titulo: "Tostar o pedir hoy", valor: s.alta, nota: "se agotan antes de reponerse", clase: "t-alta", filtro: "ALTA" },
    { titulo: "Programar esta semana", valor: s.media, nota: "dentro del margen o bajo el mínimo", clase: "t-media", filtro: "MEDIA" },
    { titulo: "Faltan datos", valor: s.sinDatos, nota: "se completan antes de decidir", clase: "t-sin", filtro: "SIN DATOS" },
    { titulo: "Unidades sugeridas", valor: s.unidadesSugeridas, nota: `a tostar o pedir · cobertura mediana ${s.coberturaMediana ?? "—"} d` },
  ];
});

const anchoBarra = (r) => {
  const max = Math.max(15, (r.tiempoReposicion ?? 0) + margenSeguridad.value + 2);
  const cob = r.indicadores.coberturaDias;
  return { cobertura: cob === null ? 0 : Math.min(100, (cob / max) * 100), reposicion: Math.min(100, ((r.tiempoReposicion ?? 0) / max) * 100),
    margen: Math.min(100, (((r.tiempoReposicion ?? 0) + margenSeguridad.value) / max) * 100) };
};
const clase = (p) => "p-" + p.replace(" ", "-");
const fmt = (n, sufijo = "") => (n === null || n === undefined ? "—" : `${n}${sufijo}`);
</script>

<template>
  <main class="envoltura panel">
    <header class="encabezado">
      <div>
        <h1>¿Qué conviene tostar o reabastecer primero?</h1>
        <p v-if="datos">Fecha de corte {{ datos.fechaCorte }} · ventas de los últimos {{ datos.parametros.diasVentana }} días
          · <span class="etiqueta-simulado">Datos simulados</span></p>
      </div>
      <RouterLink to="/panel/etl" class="boton boton-borde">Ver datos y ETL</RouterLink>
    </header>

    <section class="tarjeta controles" aria-label="Parámetros del escenario">
      <div class="control">
        <span class="rotulo">Demanda</span>
        <div class="segmentos">
          <button v-for="e in ESCENARIOS" :key="e.valor" type="button" :aria-pressed="factorDemanda === e.valor" @click="factorDemanda = e.valor">{{ e.etiqueta }}</button>
        </div>
      </div>
      <label class="control">
        <span class="rotulo">Margen de seguridad</span>
        <select v-model.number="margenSeguridad">
          <option v-for="m in [0, 1, 2, 3, 5, 7]" :key="m" :value="m">{{ m }} {{ m === 1 ? "día" : "días" }}</option>
        </select>
      </label>
      <label class="control">
        <span class="rotulo">Ventas consideradas</span>
        <select v-model.number="diasVentana">
          <option :value="14">Últimos 14 días</option>
          <option :value="30">Últimos 30 días</option>
        </select>
      </label>
    </section>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="datos && !datos.resultados.length" class="aviso">No hay datos cargados. Ve a <RouterLink to="/panel/etl">Datos y ETL</RouterLink> y ejecuta el proceso.</p>


    <section class="indicadores" :class="{ atenuado: cargando }">
      <button v-for="t in tarjetas" :key="t.titulo" type="button" class="tarjeta indicador" :class="[t.clase, { activo: t.filtro && soloPrioridad === t.filtro }]"
        :disabled="!t.filtro" @click="soloPrioridad = soloPrioridad === t.filtro ? 'Todas' : t.filtro">
        <span class="titulo">{{ t.titulo }}</span>
        <strong class="num">{{ t.valor }}</strong>
        <small>{{ t.nota }}</small>
      </button>
    </section>

    <section v-if="comparacion" class="tarjeta comparacion" :class="{ atenuado: cargando }">
      <div class="grafica">
        <h2>Normal vs. demanda {{ etiquetaEscenario }}</h2>
        <p class="leyenda-graf"><span><i class="m-base"></i> Normal</span><span><i class="m-esc"></i> {{ etiquetaEscenario }}</span></p>
        <div v-for="g in grafica" :key="g.clave" class="fila-graf">
          <span class="prioridad" :class="g.clase">{{ g.nombre }}</span>
          <div class="barras">
            <div class="b-base" :style="{ width: g.anchoBase + '%' }"><span class="num">{{ g.base }}</span></div>
            <div class="b-esc" :style="{ width: g.anchoEscenario + '%' }"><span class="num">{{ g.escenario }}</span></div>
          </div>
        </div>
        <p class="unidades">Unidades sugeridas: <strong class="num">{{ comparacion.base.resumen.unidadesSugeridas }}</strong> →
          <strong class="num">{{ comparacion.escenario.resumen.unidadesSugeridas }}</strong></p>
      </div>
      <div class="cambios">
        <h3>{{ cambios.length }} {{ cambios.length === 1 ? "producto cambia" : "productos cambian" }} de prioridad</h3>
        <ul v-if="cambios.length">
          <li v-for="c in cambios" :key="c.idProducto">
            <strong>{{ c.nombre }}</strong>
            <span><span class="prioridad" :class="clase(c.prioridadBase)">{{ c.prioridadBase }}</span> →
              <span class="prioridad" :class="clase(c.prioridadEscenario)">{{ c.prioridadEscenario }}</span></span>
            <small class="num">cobertura {{ fmt(c.coberturaBase, " d") }} → {{ fmt(c.coberturaEscenario, " d") }}</small>
          </li>
        </ul>
        <p v-else class="sub">Las prioridades se mantienen en este escenario.</p>
      </div>
    </section>

    <section class="tarjeta lista" :class="{ atenuado: cargando }">
      <div class="filtros">
        <input v-model="busqueda" type="search" placeholder="Buscar producto o clave" />
        <select v-model="categoria">
          <option>Todas</option><option>Grano</option><option>Molido</option><option>Accesorio</option>
        </select>
        <select v-model="soloPrioridad">
          <option value="Todas">Todas las prioridades</option>
          <option>ALTA</option><option>MEDIA</option><option>BAJA</option><option>SIN DATOS</option>
        </select>
        <span class="conteo">{{ filas.length }} de {{ datos?.resultados.length ?? 0 }} productos</span>
      </div>

      <div class="contenedor-tabla">
        <table class="tabla">
          <thead>
            <tr>
              <th>Prioridad</th><th class="col-producto">Producto</th><th class="der">Stock / mín.</th>
              <th>Cobertura vs. reposición</th><th>Recomendación</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in filas" :key="r.idProducto" class="clic" @click="seleccionado = r">
              <td>
                <span class="prioridad" :class="clase(r.prioridad)">{{ r.prioridad }}</span>
                <small v-if="cambioPorId.get(r.idProducto)?.cambia" class="cambio" title="Prioridad con demanda normal">antes {{ cambioPorId.get(r.idProducto).prioridadBase }}</small>
              </td>
              <td>
                <strong>{{ r.nombre }}</strong>
                <small class="sub">{{ r.idProducto }} · vende {{ fmt(r.indicadores.demandaDiaria) }} al día</small>
              </td>
              <td class="der num">{{ fmt(r.stockActual) }} / {{ r.stockMinimo }}</td>
              <td class="celda-barra">
                <div class="barra-cob" :title="`Cobertura ${fmt(r.indicadores.coberturaDias, ' días')} · reposición ${fmt(r.tiempoReposicion, ' días')}`">
                  <div class="relleno" :class="clase(r.prioridad)" :style="{ width: anchoBarra(r).cobertura + '%' }"></div>
                  <i v-if="r.tiempoReposicion" class="marca-rep" :style="{ left: anchoBarra(r).reposicion + '%' }"></i>
                  <i v-if="r.tiempoReposicion" class="marca-margen" :style="{ left: anchoBarra(r).margen + '%' }"></i>
                </div>
                <small class="num">alcanza {{ fmt(r.indicadores.coberturaDias, " d") }} · repone en {{ fmt(r.tiempoReposicion, " d") }}</small>
              </td>
              <td>
                {{ r.accion }}<strong v-if="r.cantidadSugerida" class="num"> · {{ r.cantidadSugerida }} u.</strong>
                <span v-if="r.alertas.length" class="alerta" :title="r.alertas.join('\n')">⚠ {{ r.alertas.length }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="leyenda">
        <span><i class="marca-rep"></i> tiempo de reposición</span>
        <span><i class="marca-margen"></i> reposición + margen</span>
        <span>Haz clic en un producto para ver por qué se recomienda.</span>
      </p>
    </section>

    <DetalleProducto v-if="seleccionado" :producto="seleccionado" @cerrar="seleccionado = null" />
  </main>
</template>

<style scoped>
.panel { padding: 28px 24px 64px; display: flex; flex-direction: column; gap: 18px; }
.encabezado { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
.encabezado h1 { font-size: clamp(1.6rem, 3vw, 2.2rem); font-weight: 780; }
.encabezado p { margin: 8px 0 0; color: var(--tenue); }
.controles { display: flex; flex-wrap: wrap; gap: 28px; padding: 14px 20px; align-items: flex-end; }
.control { display: flex; flex-direction: column; gap: 8px; }
.rotulo { font-size: .76rem; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; color: var(--tenue); }
.control small { color: var(--tenue); font-size: .8rem; }
.segmentos { display: flex; gap: 6px; }
.segmentos button { min-width: 86px; border: 2px solid var(--tinta); background: transparent; border-radius: 999px; padding: 5px 10px; font-weight: 700; cursor: pointer; }
.segmentos button[aria-pressed="true"] { background: var(--tinta); color: var(--papel); }
select, input[type="search"] { padding: 8px 10px; border: 1.5px solid var(--linea); border-radius: 6px; background: var(--blanco); }

.indicadores { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.indicador { text-align: left; padding: 14px 16px; display: flex; flex-direction: column; gap: 2px; cursor: default; border-top: 4px solid var(--linea); }
.indicador:not(:disabled) { cursor: pointer; }
.indicador:not(:disabled):hover { border-color: var(--tinta); }
.indicador.activo { outline: 2px solid var(--tinta); }
.indicador .titulo { font-size: .78rem; font-weight: 700; color: var(--tenue); }
.indicador strong { font-family: var(--display); font-size: 2.1rem; font-weight: 800; line-height: 1.1; }
.indicador small { color: var(--tenue); font-size: .76rem; line-height: 1.3; }
.t-alta { border-top-color: var(--cereza); }
.t-alta strong { color: var(--cereza); }
.t-media { border-top-color: var(--oro); }
.t-sin { border-top-color: var(--tenue); border-top-style: dashed; }

.comparacion { display: grid; grid-template-columns: 1.2fr 1fr; gap: 28px; padding: 18px 20px; }
.comparacion h2 { font-size: 1.15rem; }
.comparacion h3 { font-size: 1rem; margin-bottom: 10px; }
.leyenda-graf { display: flex; gap: 16px; font-size: .8rem; color: var(--tenue); margin: 6px 0 10px; }
.leyenda-graf i { display: inline-block; width: 12px; height: 12px; border-radius: 2px; margin-right: 5px; vertical-align: -1px; }
.m-base, .b-base { background: #b9b0a8; }
.m-esc, .b-esc { background: var(--cereza); }
.fila-graf { display: grid; grid-template-columns: 92px 1fr; align-items: center; gap: 10px; margin-bottom: 8px; }
.fila-graf .prioridad { text-align: center; }
.barras { display: flex; flex-direction: column; gap: 3px; }
.barras div { height: 14px; min-width: 2px; border-radius: 3px; position: relative; }
.barras span { position: absolute; left: calc(100% + 6px); top: -2px; font-size: .78rem; font-weight: 700; }
.unidades { margin: 12px 0 0; font-size: .9rem; color: var(--tenue); }
.unidades strong { color: var(--tinta); }
.cambios ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.cambios li { display: grid; grid-template-columns: 1fr auto; gap: 2px 10px; padding-bottom: 10px; border-bottom: 1px solid var(--suave); }
.cambios li small { grid-column: 1 / -1; color: var(--tenue); font-size: .78rem; }
.lista { padding: 6px 4px 10px; }
.filtros { display: flex; gap: 10px; align-items: center; padding: 12px; flex-wrap: wrap; }
.filtros input { flex: 1; min-width: 200px; }
.conteo { color: var(--tenue); font-size: .85rem; margin-left: auto; }
.sub { display: block; color: var(--tenue); font-size: .78rem; }
.cambio { display: block; color: var(--tenue); font-size: .72rem; margin-top: 3px; }
.celda-barra { min-width: 210px; }
.celda-barra small { color: var(--tenue); font-size: .76rem; }
.barra-cob { position: relative; height: 10px; background: var(--suave); border-radius: 5px; margin-bottom: 4px; }
.relleno { height: 100%; border-radius: 5px; }
.relleno.p-SIN-DATOS { border: 0; }
.relleno.p-BAJA { background: var(--hoja); opacity: .55; }
.col-producto { min-width: 230px; }
.marca-rep, .marca-margen { position: absolute; top: -4px; width: 2px; height: 18px; background: var(--tinta); }
.marca-margen { background: transparent; border-left: 2px dotted var(--tinta); }
.alerta { display: inline-block; margin-left: 6px; font-size: .75rem; font-weight: 700; color: #9a6a10; }
.leyenda { display: flex; gap: 22px; flex-wrap: wrap; font-size: .8rem; color: var(--tenue); padding: 8px 12px 0; margin: 0; }
.leyenda i { position: relative; display: inline-block; top: 3px; height: 14px; margin-right: 4px; }
.atenuado { opacity: .6; transition: opacity .15s; }

@media (max-width: 980px) {
  .comparacion { grid-template-columns: 1fr; }
}
@media (max-width: 560px) {
  .indicadores { grid-template-columns: repeat(2, 1fr); }
}
</style>
