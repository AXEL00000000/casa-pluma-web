<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { sesion, cerrarSesion } from "./services/api";

const route = useRoute();
const router = useRouter();
const usuario = computed(() => (route.fullPath, sesion()?.usuario));

function salir() {
  cerrarSesion();
  router.push("/");
}
</script>

<template>
  <header class="barra">
    <div class="envoltura">
      <RouterLink to="/" class="marca">
        <svg viewBox="0 0 32 32" aria-hidden="true"><ellipse cx="16" cy="16" rx="10" ry="13" fill="#F4F1EC" /><path d="M16 4c-3 6-3 18 0 24" stroke="#9B1C2E" stroke-width="2" fill="none" /></svg>
        Casa Pluma
      </RouterLink>
      <nav class="menu">
        <RouterLink to="/">Tienda</RouterLink>
        <template v-if="usuario">
          <RouterLink to="/panel">Reabastecimiento</RouterLink>
          <RouterLink to="/panel/etl">Datos y ETL</RouterLink>
          <span class="usuario">{{ usuario.nombre }}</span>
          <button type="button" @click="salir">Salir</button>
        </template>
        <RouterLink v-else to="/login">Iniciar sesión</RouterLink>
      </nav>
    </div>
  </header>
  <RouterView />
</template>
