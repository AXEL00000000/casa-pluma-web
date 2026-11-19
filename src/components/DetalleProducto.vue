<script setup>
import { onBeforeUnmount, onMounted } from "vue";

const props = defineProps({ producto: { type: Object, required: true } });
const emit = defineEmits(["cerrar"]);
const fmt = (n, s = "") => (n === null || n === undefined ? "—" : `${n}${s}`);
const tecla = (e) => e.key === "Escape" && emit("cerrar");
onMounted(() => window.addEventListener("keydown", tecla));
onBeforeUnmount(() => window.removeEventListener("keydown", tecla));
</script>

<template>
  <div class="fondo" @click.self="emit('cerrar')">
    <aside class="cajon" role="dialog" aria-modal="true" :aria-label="`Detalle de ${props.producto.nombre}`">
      <header>
        <div>
          <span class="prioridad" :class="'p-' + props.producto.prioridad.replace(' ', '-')">{{ props.producto.prioridad }}</span>
          <h2>{{ props.producto.nombre }}</h2>
          <p>{{ props.producto.idProducto }} · {{ props.producto.categoria }} · {{ props.producto.proveedor }} ({{ props.producto.disponibilidad }})</p>
        </div>
        <button type="button" class="cerrar" aria-label="Cerrar" @click="emit('cerrar')">×</button>
      </header>

      <section class="recomendacion">
        <span>Recomendación</span>
        <strong>{{ props.producto.accion }}<template v-if="props.producto.cantidadSugerida"> · {{ props.producto.cantidadSugerida }} u.</template></strong>
      </section>

      <section>
        <h3>Por qué</h3>
        <ol>
          <li v-for="(e, i) in props.producto.explicacion" :key="i">{{ e }}</li>
        </ol>
        <ul v-if="props.producto.alertas.length" class="alertas">
          <li v-for="(a, i) in props.producto.alertas" :key="i">⚠ {{ a }}</li>
        </ul>
      </section>

      <section>
        <h3>Indicadores</h3>
        <dl class="indicadores">
          <div><dt>Stock / mínimo</dt><dd class="num">{{ fmt(props.producto.stockActual) }} / {{ props.producto.stockMinimo }}</dd></div>
          <div><dt>Diferencia contra el mínimo</dt><dd class="num">{{ fmt(props.producto.indicadores.diferenciaMinimo, " u.") }}</dd></div>
          <div><dt>Demanda diaria</dt><dd class="num">{{ fmt(props.producto.indicadores.demandaDiaria, " u.") }}</dd></div>
          <div><dt>Cobertura</dt><dd class="num">{{ fmt(props.producto.indicadores.coberturaDias, " días") }}</dd></div>
          <div><dt>Tiempo de reposición</dt><dd class="num">{{ fmt(props.producto.tiempoReposicion, " días") }}</dd></div>
          <div><dt>Frescura restante</dt><dd class="num">{{ fmt(props.producto.indicadores.frescuraRestanteDias, " días") }}</dd></div>
          <div><dt>Rotación del periodo</dt><dd class="num">{{ fmt(props.producto.indicadores.rotacion) }}</dd></div>
        </dl>
      </section>

      <section>
        <h3>Trazabilidad</h3>
        <dl class="traza">
          <dt>Regla aplicada</dt><dd>{{ props.producto.trazabilidad.reglaAplicada }}</dd>
          <dt>Fecha de corte</dt><dd>{{ props.producto.trazabilidad.fechaCorte }}</dd>
          <dt>Ventas consideradas</dt><dd>{{ props.producto.trazabilidad.ventasConsideradas }} ventas, {{ props.producto.trazabilidad.unidadesVendidas }} u. ({{ props.producto.trazabilidad.ventanaVentas }})</dd>
          <dt>Inventario actualizado</dt><dd>{{ props.producto.trazabilidad.fechaActualizacionInventario }}</dd>
          <dt>Fecha de tostado</dt><dd>{{ fmt(props.producto.trazabilidad.fechaTostado) }}</dd>
          <dt>Parámetros</dt>
          <dd>demanda × {{ props.producto.trazabilidad.parametros.factorDemanda }}, margen {{ props.producto.trazabilidad.parametros.margenSeguridad }} días,
            ventana {{ props.producto.trazabilidad.parametros.diasVentana }} días</dd>
          <dt>Fuentes</dt><dd>Tablas {{ props.producto.trazabilidad.fuentes.join(", ") }} (cargadas por el ETL)</dd>
        </dl>
      </section>
    </aside>
  </div>
</template>

<style scoped>
.fondo { position: fixed; inset: 0; background: rgba(34, 26, 23, .35); z-index: 50; display: flex; justify-content: flex-end; }
.cajon { width: min(480px, 100%); height: 100%; overflow-y: auto; background: var(--papel); padding: 24px 26px 40px; display: flex; flex-direction: column; gap: 22px; box-shadow: -8px 0 30px rgba(0, 0, 0, .15); }
header { display: flex; justify-content: space-between; gap: 12px; }
h2 { font-size: 1.6rem; margin: 8px 0 4px; }
header p { margin: 0; color: var(--tenue); font-size: .88rem; }
.cerrar { background: none; border: 0; font-size: 2rem; line-height: 1; cursor: pointer; color: var(--tenue); }
.recomendacion { background: var(--tinta); color: var(--papel); border-radius: 8px; padding: 14px 18px; display: flex; flex-direction: column; }
.recomendacion span { font-size: .75rem; text-transform: uppercase; letter-spacing: .06em; opacity: .75; font-weight: 700; }
.recomendacion strong { font-family: var(--display); font-size: 1.5rem; }
h3 { font-size: 1rem; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 8px; color: var(--tenue); font-family: var(--texto); }
ol { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 6px; }
.alertas { list-style: none; padding: 0; margin: 12px 0 0; display: flex; flex-direction: column; gap: 6px; }
.alertas li { background: #fff7e6; border: 1px solid #ecd5a3; border-radius: 6px; padding: 8px 10px; font-size: .88rem; color: #6b4e12; }
.indicadores { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 0; }
.indicadores div { background: var(--blanco); border: 1px solid var(--linea); border-radius: 6px; padding: 8px 10px; }
dt { font-size: .75rem; color: var(--tenue); font-weight: 600; }
dd { margin: 0; font-weight: 700; }
.traza { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 6px 14px; font-size: .88rem; }
.traza dd { font-weight: 500; }
</style>
