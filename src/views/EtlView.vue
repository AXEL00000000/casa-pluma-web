<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { api, mensajeError } from "../services/api";

const ejecucion = ref(null);
const error = ref("");
const ejecutando = ref(false);
const fuenteActiva = ref("inventario");
const fuente = ref(null);
const soloProblemas = ref(true);
const detalleRegla = ref(null);

async function cargarUltima() {
  try {
    ejecucion.value = (await api.get("/etl/ultima")).data;
  } catch (e) {
    if (e.response?.status !== 404) error.value = mensajeError(e);
  }
}
async function cargarFuente() {
  try {
    fuente.value = (await api.get(`/etl/fuentes/${fuenteActiva.value}`)).data;
  } catch (e) {
    error.value = mensajeError(e);
  }
}
async function ejecutar() {
  ejecutando.value = true;
  error.value = "";
  try {
    ejecucion.value = (await api.post("/etl/ejecutar")).data;
  } catch (e) {
    error.value = mensajeError(e);
  } finally {
    ejecutando.value = false;
  }
}
onMounted(() => { cargarUltima(); cargarFuente(); });
watch(fuenteActiva, cargarFuente);

const cuentaFuentes = computed(() => {
  const e = ejecucion.value;
  if (!e) return [];
  const rech = (f) => e.rechazados.filter((r) => r.fuente === f).length;
  return ["inventario", "ventas", "reposicion"].map((f) => ({ fuente: f, extraidos: e.extraidos[f], cargados: e.cargados[f], rechazados: rech(f) }));
});

// Filas de la fuente original que el ETL modificó, rechazó o dejó en revisión
const marcadas = computed(() => {
  const e = ejecucion.value;
  const m = new Map();
  if (!e) return m;
  const clave = fuenteActiva.value === "ventas" ? "IdVenta" : "IdProducto";
  const add = (id, texto) => m.set(id, [...(m.get(id) || []), texto]);
  for (const c of e.transformaciones.detalle.filter((d) => d.fuente === fuenteActiva.value)) add(c.registro, `${c.regla}: ${c.campo} "${c.antes}" → ${c.despues}`);
  for (const i of [...e.rechazados, ...e.enRevision].filter((d) => d.fuente === fuenteActiva.value)) add(i.identificador.split(" ")[0], `${i.regla}: ${i.motivo}`);
  return { m, clave };
});
const filasFuente = computed(() => {
  if (!fuente.value) return [];
  const { m, clave } = marcadas.value;
  const norm = (v) => String(v).trim().toUpperCase();
  const filas = fuente.value.filas.map((f) => ({ ...f, _notas: m?.get?.(norm(f[clave])) ?? m?.get?.(f[clave]) ?? null }));
  // En inventario un mismo id puede aparecer dos veces: las notas aplican a ambas filas
  return soloProblemas.value ? filas.filter((f) => f._notas) : filas.slice(0, 60);
});
const columnas = computed(() => (fuente.value?.filas[0] ? Object.keys(fuente.value.filas[0]) : []));
const fecha = (iso) => new Date(iso).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
</script>

<template>
  <main class="envoltura etl">
    <header class="encabezado">
      <div>
        <h1>Datos y proceso ETL</h1>
        <p>Extrae las fuentes CSV, las limpia con reglas documentadas, valida el resultado y lo carga en PostgreSQL.
          <span class="etiqueta-simulado">Datos simulados</span></p>
      </div>
      <button class="boton boton-primario" :disabled="ejecutando" @click="ejecutar">{{ ejecutando ? "Ejecutando…" : "Ejecutar ETL" }}</button>
    </header>

    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="!ejecucion && !error" class="aviso">Todavía no hay una ejecución. Presiona <strong>Ejecutar ETL</strong> para cargar los datos.</p>

    <template v-if="ejecucion">
      <p class="meta">Ejecución #{{ ejecucion.id }} · {{ fecha(ejecucion.ejecutadoEn) }} · por {{ ejecucion.ejecutadoPor }}
        · fecha de corte {{ String(ejecucion.fechaCorte).slice(0, 10) }}</p>

      <section class="flujo">
        <div v-for="c in cuentaFuentes" :key="c.fuente" class="tarjeta paso">
          <span class="rotulo">{{ c.fuente }}</span>
          <div class="cifras num">
            <div><strong>{{ c.extraidos }}</strong><small>extraídos</small></div>
            <span>→</span>
            <div><strong>{{ c.cargados }}</strong><small>cargados</small></div>
            <div class="rech"><strong>{{ c.rechazados }}</strong><small>rechazados</small></div>
          </div>
        </div>
        <div class="tarjeta paso">
          <span class="rotulo">Validaciones</span>
          <div class="cifras num">
            <div><strong>{{ ejecucion.validaciones.filter((v) => v.cumple).length }}/{{ ejecucion.validaciones.length }}</strong><small>se cumplen</small></div>
            <div><strong>{{ ejecucion.enRevision.length }}</strong><small>en revisión</small></div>
          </div>
        </div>
      </section>

      <div class="dos">
        <section class="tarjeta bloque">
          <h2>Transformaciones aplicadas</h2>
          <table class="tabla">
            <thead><tr><th>Regla</th><th>Descripción</th><th class="der">Valores</th></tr></thead>
            <tbody>
              <tr v-for="t in ejecucion.transformaciones.resumen" :key="t.regla" class="clic" @click="detalleRegla = detalleRegla === t.regla ? null : t.regla">
                <td><strong>{{ t.regla }}</strong></td><td>{{ t.descripcion }}</td><td class="der num">{{ t.valores }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="detalleRegla" class="antes-despues">
            <h3>{{ detalleRegla }}: antes → después</h3>
            <ul>
              <li v-for="(c, i) in ejecucion.transformaciones.detalle.filter((d) => d.regla === detalleRegla)" :key="i">
                {{ c.fuente }} · {{ c.registro }} · {{ c.campo }}: <code>{{ c.antes }}</code> → <code>{{ c.despues }}</code>
              </li>
            </ul>
          </div>
        </section>

        <section class="tarjeta bloque">
          <h2>Validaciones</h2>
          <ul class="validaciones">
            <li v-for="v in ejecucion.validaciones" :key="v.comprobacion" :class="{ falla: !v.cumple }">
              <span>{{ v.cumple ? "✓" : "✗" }}</span>{{ v.comprobacion }}
            </li>
          </ul>
        </section>
      </div>

      <section class="tarjeta bloque">
        <h2>Registros rechazados y en revisión</h2>
        <div class="contenedor-tabla">
          <table class="tabla">
            <thead><tr><th>Tipo</th><th>Fuente</th><th>Registro</th><th>Campo</th><th>Valor original</th><th>Regla</th><th>Motivo</th><th>Acción</th></tr></thead>
            <tbody>
              <tr v-for="(r, i) in [...ejecucion.rechazados, ...ejecucion.enRevision]" :key="i">
                <td><span class="tipo" :class="r.tipo">{{ r.tipo }}</span></td>
                <td>{{ r.fuente }}</td><td>{{ r.identificador }}</td><td>{{ r.campo }}</td>
                <td><code>{{ r.valor_original || "(vacío)" }}</code></td><td>{{ r.regla }}</td><td>{{ r.motivo }}</td><td>{{ r.accion }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <section class="tarjeta bloque">
      <div class="titulo-fuente">
        <h2>Fuentes originales (sin transformar)</h2>
        <div class="pestanas">
          <button v-for="f in ['inventario', 'ventas', 'reposicion']" :key="f" type="button" :aria-pressed="fuenteActiva === f" @click="fuenteActiva = f">{{ f }}.csv</button>
        </div>
        <label v-if="ejecucion" class="check"><input v-model="soloProblemas" type="checkbox" /> Solo filas que el ETL cambió o separó</label>
      </div>
      <p v-if="fuente" class="meta">{{ fuente.total }} filas en el archivo<template v-if="!soloProblemas"> · se muestran las primeras 60</template></p>
      <div class="contenedor-tabla">
        <table class="tabla fuente">
          <thead><tr><th v-for="c in columnas" :key="c">{{ c }}</th><th v-if="ejecucion">Qué hizo el ETL</th></tr></thead>
          <tbody>
            <tr v-for="f in filasFuente" :key="f.fila" :class="{ marcada: f._notas }">
              <td v-for="c in columnas" :key="c" class="num">{{ f[c] === "" ? "(vacío)" : f[c] }}</td>
              <td v-if="ejecucion" class="notas">{{ f._notas?.join(" · ") }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>

<style scoped>
.etl { padding: 28px 24px 64px; display: flex; flex-direction: column; gap: 18px; }
.encabezado { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
.encabezado h1 { font-size: clamp(1.7rem, 3.4vw, 2.5rem); font-weight: 780; }
.encabezado p { margin: 8px 0 0; color: var(--tenue); max-width: 70ch; }
.meta { color: var(--tenue); font-size: .88rem; margin: 0; }
.flujo { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.paso { padding: 14px 16px; }
.rotulo { font-size: .76rem; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; color: var(--tenue); }
.cifras { display: flex; align-items: center; gap: 14px; margin-top: 6px; }
.cifras div { display: flex; flex-direction: column; }
.cifras strong { font-family: var(--display); font-size: 1.8rem; line-height: 1.1; }
.cifras small { color: var(--tenue); font-size: .75rem; }
.cifras > span { color: var(--tenue); font-size: 1.3rem; }
.rech strong { color: var(--cereza); }
.dos { display: grid; grid-template-columns: 1.5fr 1fr; gap: 18px; }
.bloque { padding: 18px 18px 14px; }
.bloque h2 { font-size: 1.25rem; margin-bottom: 10px; }
.antes-despues { margin-top: 12px; background: var(--papel); border-radius: 6px; padding: 10px 14px; }
.antes-despues h3 { font-size: .95rem; margin-bottom: 6px; }
.antes-despues ul { margin: 0; padding-left: 18px; font-size: .85rem; max-height: 220px; overflow-y: auto; }
code { background: var(--suave); padding: 1px 5px; border-radius: 3px; font-size: .82rem; }
.validaciones { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; font-size: .9rem; }
.validaciones span { display: inline-grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; background: var(--hoja); color: var(--papel); font-size: .75rem; font-weight: 800; margin-right: 9px; }
.validaciones .falla span { background: var(--cereza); }
.tipo { font-size: .72rem; font-weight: 800; padding: 2px 7px; border-radius: 4px; }
.RECHAZADO { background: var(--cereza); color: var(--papel); }
.REVISION { background: var(--oro); color: var(--tinta); }
.titulo-fuente { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 6px; }
.titulo-fuente h2 { margin: 0; }
.pestanas { display: flex; gap: 6px; }
.pestanas button { border: 2px solid var(--tinta); background: transparent; border-radius: 999px; padding: 4px 12px; font-weight: 700; cursor: pointer; font-size: .85rem; }
.pestanas button[aria-pressed="true"] { background: var(--tinta); color: var(--papel); }
.check { font-size: .88rem; display: flex; gap: 6px; align-items: center; margin-left: auto; }
.fuente td { white-space: nowrap; font-size: .84rem; }
.fuente tr.marcada td { background: #fff7e6; }
.fuente td.notas { white-space: normal; min-width: 260px; color: #6b4e12; font-size: .8rem; }
@media (max-width: 980px) { .flujo { grid-template-columns: 1fr 1fr; } .dos { grid-template-columns: 1fr; } }
</style>
