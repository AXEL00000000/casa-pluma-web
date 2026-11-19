# Casa Pluma · Web

Front en **Vue 3 + Vite** de Casa Pluma: tienda pública y **panel de apoyo a decisiones** para decidir qué cafés tostar o reabastecer primero.

Consume la API `casa-pluma-api` (repositorio del back). Proyecto integrador de *Desarrollo de Software para la Toma de Decisiones* (ITO).

> ⚠️ Los datos que muestra son **simulados** con fines académicos.

## Pantallas

| Ruta | Qué muestra |
| --- | --- |
| `/` | Tienda: catálogo con disponibilidad (público). |
| `/login` | Inicio de sesión (JWT). |
| `/panel` | **Módulo DSS**: indicadores, escenarios de demanda (−20 %, normal, +20 % o libre), margen de seguridad, filtros, tabla priorizada con cobertura frente a reposición, y detalle con la explicación y trazabilidad de cada recomendación. |
| `/panel/etl` | Ejecutar el ETL y ver extraídos/cargados, transformaciones (antes → después), validaciones, rechazados, en revisión y las fuentes originales. |

## Cómo correrlo

Requiere Node.js 20 o más reciente y la API corriendo.

```sh
cp .env.example .env   # VITE_API_URL=http://localhost:3000/api/v1
npm install
npm run dev            # http://localhost:5173
```

Si la API usa `CORS_ORIGIN=http://localhost:5173`, abre el front en `localhost` (no en `127.0.0.1`).
