# Finora — PWA de Finanzas Personales & Contador Público Personal

> Aplicación web progresiva (PWA) de gestión financiera integral, diseñada bajo principios contables rigurosos para personas, profesionales y familias que buscan control absoluto de su dinero, compras en cuotas, presupuestos, pasivos e inteligencia contable.

---

## 🚀 Resumen del Proyecto

**Finora** opera bajo una filosofía **offline-first** con persistencia local ultrarrápida (IndexedDB vía Dexie) y sincronización idempotente hacia backend con base de datos relacional PostgreSQL / Supabase, asegurando que tus datos estén disponibles incluso sin conexión a internet en el metro, avión o zonas sin cobertura.

### ✨ Pilares Funcionales y Contables

1. **Dashboard Financiero Integral**:
   * **Balance Consolidado**: Suma de saldos disponibles en efectivo, cajas de ahorro bancarias y billeteras virtuales.
   * **Flujo Operativo del Período**: Ingresos reales vs. Gastos operativos totales vs. Ahorro neto del mes.
   * **Clasificación Contable de Gastos**:
     * *Gastos Fijos*: Servicios, vivienda, compromisos ineludibles.
     * *Gastos Variables*: Supermercado, ocio, transporte.
     * *Gastos Hormiga*: Consumos diarios menores con análisis de impacto acumulado.
     * *Aportes de Ahorro e Inversión*: Fondos de reserva que **no** se descuentan como pérdidas en el balance contable.
   * **Modo Privacidad**: Oculta cifras y balances sensibles (`$ ••••••`, `US$ ••••••`, `€ ••••••`) con un solo toque desde el encabezado.

2. **Gestión de Compras en Cuotas (Amortización Exacta)**:
   * Algoritmo de centavos sin residuos: divide importes con precisión contable de dos decimales, absorbiendo cualquier residuo en la última cuota para evitar pérdida o ganancia artificial de centavos.
   * Calendario de vencimientos con cálculo de urgencia (`Vence hoy`, `Vencida`, `Vence en X días`).
   * Registro del pago de cuotas con débito directo sobre la cuenta financiera seleccionada.

3. **Control de Presupuestos & Alertas Preventivas Idempotentes**:
   * Definición de límites mensuales globales, por categoría o por grupo financiero.
   * Monitoreo con barras de progreso y umbrales visuales (`70%`, `90%`, `100%`, `>100%`).
   * Notificaciones preventivas automáticas en el Centro de Alertas que no se repiten innecesariamente si el gasto permanece en el mismo tramo.

4. **Metas de Ahorro y Gestión de Pasivos**:
   * Creación de objetivos con aportes acumulativos y celebración de confeti al alcanzar el 100%.
   * Registro y liquidación de préstamos o deudas con seguimiento de capital amortizado y saldo remanente.

5. **Contador Público Personal (Google Gemini API)**:
   * Asesor contable conversacional impulsado por `@google/genai` (`gemini-3.8-flash`).
   * Brinda auditorías de salud financiera, diagnósticos de flujo de caja, estrategias para mitigar gastos hormiga y asesoramiento tributario/financiero descriptivo y estructurado en viñetas.

6. **Exportación e Informes**:
   * Descarga de resúmenes mensuales y comprobantes en formato imprimible PDF y CSV estructurado compatible con Excel y Google Sheets.

7. **Arquitectura Offline-First con Cola Outbox**:
   * Si no hay conexión a internet, las operaciones se registran localmente con el estado `«Pendiente sync»` y se encolan con claves de idempotencia UUID v4.
   * Al recuperar la conexión (`window.addEventListener('online')`), el motor procesa la cola por lotes (`POST /api/sync/batch`), asegurando que ninguna transacción se pierda ni se duplique.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías |
|---|---|
| **Frontend** | React 19, TypeScript, Tailwind CSS v4, Motion, Lucide Icons |
| **PWA & Offline** | Vite PWA Plugin, Service Worker (Cache-first para assets), Dexie (IndexedDB) |
| **Visualización** | Recharts (Gráficos interactivos de líneas, barras y rosquillas) |
| **Backend / API** | Node.js, Express, TSX |
| **Inteligencia Artificial** | Google GenAI SDK (`@google/genai`) con modelo `gemini-3.8-flash` |
| **Base de Datos Remota** | PostgreSQL / Supabase con Row Level Security (RLS) y claves foráneas en cascada |
| **Testing** | Vitest (16 pruebas unitarias y de integración) |

---

## 📁 Estructura del Código

```text
├── server.ts                    # Servidor Express (API Gemini, Sync Batch, SPA proxy)
├── src/
│   ├── lib/
│   │   ├── db.ts               # Base de datos local Dexie (esquemas e inicialización)
│   │   ├── sync.ts             # Motor de sincronización outbox y background listeners
│   │   ├── currency.ts         # Formateo y validación de monedas (ARS, USD, EUR)
│   │   ├── dates.ts            # Cálculo de períodos contables, fechas y vencimientos
│   │   └── export.ts           # Generador de reportes imprimibles PDF y CSV
│   ├── types/
│   │   └── finance.ts          # Interfaces y contratos de tipos del dominio financiero
│   ├── components/
│   │   ├── navigation/         # Header y TabBar con accesibilidad ARIA completa
│   │   ├── ui/                 # Indicadores offline, modal PWA, skeleton loaders
│   │   └── feedback/           # Centro de notificaciones y alertas
│   ├── features/
│   │   ├── dashboard/          # Resumen ejecutivo, KPIs y movimientos recientes
│   │   ├── transactions/       # Listado filtrable, búsqueda y modal de alta rápida
│   │   ├── stats/              # Gráficos de tendencias, desglose y consulta con Gemini
│   │   ├── budgets/            # Presupuestos, control de cuotas y vencimientos
│   │   └── profile/            # Cuentas, categorías, metas, deudas y asistente IA
│   ├── App.tsx                 # Contenedor raíz con Code Splitting y Suspense
│   └── main.tsx                # Punto de entrada Vite React
├── supabase/
│   └── migrations/             # Esquema SQL completo con RLS y constraints
├── tests/
│   └── unit/                   # Pruebas automatizadas (matemáticas, cuotas, presupuestos)
└── package.json
```

---

## 🚀 Instalación y Ejecución Local

### Prerrequisitos
* Node.js v18 o superior.
* NPM o PNPM.
* Clave de API de Google Gemini (opcional para el asistente de IA, el resto de la app es 100% funcional offline).

### 1. Clonar e Instalar Dependencias
```bash
npm install
```

### 2. Configurar Variables de Entorno
Copia el archivo `.env.example` a `.env`:
```bash
cp .env.example .env
```
Configura tu clave de Gemini si deseas utilizar el Contador IA:
```env
GEMINI_API_KEY="AIzaSy..."
PORT=3000
```

### 3. Iniciar el Servidor de Desarrollo
```bash
npm run dev
```
La aplicación estará disponible de inmediato en `http://localhost:3000`.

---

## 🧪 Pruebas Automatizadas

Finora cuenta con una suite completa de pruebas unitarias que verifican las matemáticas contables críticas:
```bash
npm test
```

### Casos de Prueba Verificados (100% Passing):
* **Algoritmo de Cuotas**: División exacta de cuotas sin pérdida ni adición de centavos ($1.000 / 3, $100 / 6, $75.432,19 / 12).
* **Aislamiento de Transferencias**: Verificación de que los traspasos entre cuentas propias no alteran el resultado neto de pérdidas y ganancias del período.
* **Alertas Idempotentes**: Disparo de notificaciones preventivas a umbrales 70%, 90% y 100% sin emisiones duplicadas.
* **Períodos Contables**: Cálculo correcto de transiciones de meses y años calendario (`2026-01` a `2025-12`).
* **Soporte Multidivisa**: Formateo de `ARS`, `USD` y `EUR` con símbolos y máscaras de privacidad.

---

## 📦 Compilación y Despliegue para Producción

Para compilar la aplicación con generación de Service Worker y fragmentos optimizados:
```bash
npm run build
```

Para iniciar el servidor en modo producción:
```bash
npm start
```

---

## 🔒 Seguridad y Privacidad
* **Sin filtración de secretos**: Las llamadas a la API de Gemini se resuelven exclusivamente a través de proxy del backend en Express (`/api/assistant/chat`), sin exponer credenciales en el cliente web.
* **Row Level Security (RLS)**: En el esquema de PostgreSQL, todas las tablas tienen RLS habilitado, garantizando que los usuarios solo puedan acceder a sus propios registros (`auth.uid() = user_id`).
* **Protección de Datos Locales**: Todo el almacenamiento offline reside dentro del espacio aislado de IndexedDB del navegador del usuario.
