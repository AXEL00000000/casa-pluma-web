// Carrito de la tienda: estado compartido que se guarda en el navegador.
import { computed, reactive, watch } from "vue";

const CLAVE = "casapluma_carrito";
function leer() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE)) || [];
  } catch {
    return [];
  }
}

export const carrito = reactive({ partidas: leer() });
watch(() => carrito.partidas, (v) => {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(v));
  } catch { /* sin almacenamiento: el carrito vive solo en memoria */ }
}, { deep: true });

export const piezas = computed(() => carrito.partidas.reduce((s, p) => s + p.cantidad, 0));
export const total = computed(() => carrito.partidas.reduce((s, p) => s + p.cantidad * p.precio, 0));

export function agregar(producto) {
  const p = carrito.partidas.find((x) => x.idProducto === producto.id_producto);
  if (p) {
    p.cantidad = Math.min(p.maximo, p.cantidad + 1);
  } else {
    carrito.partidas.push({ idProducto: producto.id_producto, nombre: producto.nombre, precio: producto.precio,
      maximo: producto.maximo_pedido, cantidad: 1 });
  }
}

export function cambiar(idProducto, delta) {
  const p = carrito.partidas.find((x) => x.idProducto === idProducto);
  if (!p) return;
  p.cantidad = Math.min(p.maximo, p.cantidad + delta);
  if (p.cantidad < 1) quitar(idProducto);
}

export function quitar(idProducto) {
  carrito.partidas = carrito.partidas.filter((x) => x.idProducto !== idProducto);
}

export function vaciar() {
  carrito.partidas = [];
}

export function enCarrito(idProducto) {
  return carrito.partidas.find((x) => x.idProducto === idProducto)?.cantidad ?? 0;
}

export const pesos = (n) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
