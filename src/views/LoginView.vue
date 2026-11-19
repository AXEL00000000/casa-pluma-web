<script setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { iniciarSesion, mensajeError } from "../services/api";

const route = useRoute();
const router = useRouter();
const usuario = ref("");
const password = ref("");
const error = ref("");
const enviando = ref(false);

async function entrar() {
  error.value = "";
  enviando.value = true;
  try {
    await iniciarSesion(usuario.value, password.value);
    router.push(typeof route.query.volver === "string" ? route.query.volver : "/panel");
  } catch (e) {
    error.value = mensajeError(e);
  } finally {
    enviando.value = false;
  }
}
</script>

<template>
  <main class="login">
    <form class="tarjeta" @submit.prevent="entrar">
      <h1>Panel de inventario</h1>
      <p>Acceso para el personal de Casa Pluma.</p>
      <label>Usuario<input v-model="usuario" autocomplete="username" required /></label>
      <label>Contraseña<input v-model="password" type="password" autocomplete="current-password" required /></label>
      <p v-if="error" class="error">{{ error }}</p>
      <button class="boton boton-primario" :disabled="enviando">{{ enviando ? "Entrando…" : "Iniciar sesión" }}</button>
    </form>
  </main>
</template>

<style scoped>
.login { min-height: calc(100vh - 62px); display: grid; place-items: center; padding: 24px; }
form { width: min(380px, 100%); padding: 32px; display: flex; flex-direction: column; gap: 14px; }
h1 { font-size: 1.8rem; }
p { margin: 0; color: var(--tenue); }
label { display: flex; flex-direction: column; gap: 6px; font-weight: 600; font-size: .9rem; }
input { padding: 11px 12px; border: 1.5px solid var(--linea); border-radius: 6px; background: var(--papel); }
input:focus { border-color: var(--tinta); outline: none; }
.boton { justify-content: center; margin-top: 6px; }
</style>
