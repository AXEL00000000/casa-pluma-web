<script setup>
import { ref } from "vue";
import { api, mensajeError, sesion } from "../services/api";
import { carrito, cambiar, quitar, vaciar, total, pesos } from "../services/carrito";

const cliente = ref("");
const enviando = ref(false);
const error = ref("");
const confirmado = ref(null);

async function confirmar() {
  enviando.value = true;
  error.value = "";
  try {
    const { data } = await api.post("/pedidos", {
      cliente: cliente.value,
      partidas: carrito.partidas.map(({ idProducto, cantidad }) => ({ idProducto, cantidad })),
    });
    confirmado.value = data;
    vaciar();
  } catch (e) {
    error.value = mensajeError(e);
  } finally {
    enviando.value = false;
  }
}
</script>

<template>
  <main class="envoltura carrito">
    <h1>Tu pedido</h1>

    <section v-if="confirmado" class="tarjeta hecho">
      <span class="etiqueta-simulado">Pedido simulado</span>
      <h2>Pedido #{{ confirmado.folio }} registrado</h2>
      <ul>
        <li v-for="p in confirmado.partidas" :key="p.idProducto">{{ p.cantidad }} × {{ p.nombre }} <span class="num">{{ pesos(p.importe) }}</span></li>
      </ul>
      <p class="total">Total <strong class="num">{{ pesos(confirmado.total) }}</strong></p>
      <p class="nota">{{ confirmado.nota }}</p>
      <div class="acciones">
        <RouterLink to="/" class="boton boton-borde">Seguir comprando</RouterLink>
        <RouterLink v-if="sesion()" to="/panel" class="boton boton-primario">Ver panel de reabastecimiento</RouterLink>
      </div>
    </section>

    <template v-else>
      <p v-if="!carrito.partidas.length" class="aviso">Tu carrito está vacío. <RouterLink to="/">Ir a la tienda</RouterLink></p>

      <div v-else class="contenido">
        <section class="tarjeta partidas">
          <article v-for="p in carrito.partidas" :key="p.idProducto" class="partida">
            <div>
              <strong>{{ p.nombre }}</strong>
              <small class="num">{{ pesos(p.precio) }} c/u · {{ p.idProducto }}</small>
            </div>
            <div class="cantidad">
              <button type="button" aria-label="Quitar una" @click="cambiar(p.idProducto, -1)">−</button>
              <span class="num">{{ p.cantidad }}</span>
              <button type="button" aria-label="Agregar una" :disabled="p.cantidad >= p.maximo" @click="cambiar(p.idProducto, 1)">+</button>
            </div>
            <strong class="num importe">{{ pesos(p.precio * p.cantidad) }}</strong>
            <button type="button" class="quitar" @click="quitar(p.idProducto)">Quitar</button>
          </article>
        </section>

        <aside class="tarjeta resumen">
          <p class="total">Total <strong class="num">{{ pesos(total) }}</strong></p>
          <label>
            Nombre (opcional)
            <input v-model="cliente" maxlength="80" placeholder="Para identificar el pedido" />
          </label>
          <p v-if="error" class="error">{{ error }}</p>
          <button type="button" class="boton boton-primario" :disabled="enviando" @click="confirmar">
            {{ enviando ? "Registrando…" : "Confirmar pedido" }}
          </button>
          <small>No se realiza ningún cobro. El pedido se registra como venta para el módulo de reabastecimiento.</small>
        </aside>
      </div>
    </template>
  </main>
</template>

<style scoped>
.carrito { padding: 32px 24px 64px; display: flex; flex-direction: column; gap: 20px; }
.carrito h1 { font-size: 2.2rem; font-weight: 800; }
.contenido { display: grid; grid-template-columns: 1fr 320px; gap: 20px; align-items: start; }
.partidas { padding: 4px 18px; }
.partida { display: grid; grid-template-columns: 1fr auto 90px auto; gap: 16px; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--suave); }
.partida:last-child { border-bottom: 0; }
.partida small { display: block; color: var(--tenue); font-size: .8rem; }
.cantidad { display: flex; align-items: center; gap: 10px; }
.cantidad button { width: 30px; height: 30px; border-radius: 50%; border: 1.5px solid var(--tinta); background: transparent; font-weight: 800; cursor: pointer; }
.cantidad button:disabled { opacity: .35; cursor: not-allowed; }
.importe { text-align: right; }
.quitar { background: none; border: 0; color: var(--cereza); font-weight: 600; cursor: pointer; }
.resumen { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
.resumen label { display: flex; flex-direction: column; gap: 6px; font-weight: 600; font-size: .9rem; }
.resumen input { padding: 9px 10px; border: 1.5px solid var(--linea); border-radius: 6px; font: inherit; }
.resumen small { color: var(--tenue); font-size: .8rem; }
.resumen .boton { justify-content: center; }
.total { display: flex; justify-content: space-between; font-size: 1.1rem; margin: 0; }
.total strong { font-family: var(--display); font-size: 1.5rem; }
.hecho { padding: 24px; display: flex; flex-direction: column; gap: 12px; max-width: 560px; }
.hecho h2 { font-size: 1.6rem; }
.hecho ul { margin: 0; padding-left: 18px; }
.hecho li span { color: var(--tenue); margin-left: 6px; }
.nota { color: var(--tenue); font-size: .9rem; margin: 0; }
.acciones { display: flex; gap: 10px; flex-wrap: wrap; }
@media (max-width: 760px) {
  .contenido { grid-template-columns: 1fr; }
  .partida { grid-template-columns: 1fr auto; }
}
</style>
