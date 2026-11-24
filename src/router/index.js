import { createRouter, createWebHistory } from "vue-router";
import { sesion } from "../services/api";
import TiendaView from "../views/TiendaView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "tienda", component: TiendaView },
    { path: "/carrito", name: "carrito", component: () => import("../views/CarritoView.vue") },
    { path: "/login", name: "login", component: () => import("../views/LoginView.vue") },
    { path: "/panel", name: "panel", component: () => import("../views/PanelView.vue"), meta: { privada: true } },
    { path: "/panel/etl", name: "etl", component: () => import("../views/EtlView.vue"), meta: { privada: true } },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});

router.beforeEach((to) => {
  if (to.meta.privada && !sesion()) return { name: "login", query: { volver: to.fullPath } };
  if (to.name === "login" && sesion()) return { name: "panel" };
  return true;
});

export default router;
