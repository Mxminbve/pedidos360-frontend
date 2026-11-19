# Diseño del frontend Pedidos360

## Dirección

Pedidos360 es una app de pedidos, no una landing. La interfaz se trata como un conjunto de documentos de pedido: hojas planas sobre fondo papel, reglas finas en lugar de sombras y una tipografía de documento.

- **Mis pedidos:** cada pedido se lee como un comprobante impreso, con ID corto en monoespaciada, líneas con producto, cantidad, precio y subtotal, y un total separado por una regla de tinta.
- **Catálogo y nuevo pedido:** son tablas del mismo libro.
- **Ventas en vivo:** es un tablero de operación con estado de la conexión, total del día en grande, tabla por producto y alertas con hora y motivo.

La identidad se conserva (verde bosque, tinta, lima puntual, papel cálido). Lo que cambia es el tratamiento: menos decoración y más orden, alineación y cifras legibles.

## Paleta

Todas las combinaciones de texto cumplen WCAG AA. Mínimo medido: 5,2:1 (texto secundario sobre papel).

| Token | Valor | Uso |
|---|---|---|
| `--paper` | `#f5f3ec` | Fondo cálido de la página |
| `--sheet` | `#fffdf8` | Hojas: tablas, comprobantes, formularios |
| `--ink` / `--ink-2` / `--ink-3` | `#18241f` / `#44514a` / `#5d6862` | Texto principal, secundario y metadatos (14,4 · 7,5 · 5,2:1) |
| `--accent` / `--accent-ink` | `#176652` / `#0f4a3c` | Verde bosque: acción primaria, navegación activa, total del día |
| `--lime` | `#d5ea8c` | Acento puntual: anillo del indicador «en vivo» y línea de total en la marca |
| `--rule` / `--rule-strong` | `#e2ded3` / `#c9c4b6` | Reglas finas; la línea punteada del comprobante |
| `--warn`, `--danger`, `--alert` (+ fondos) | `#76500a`, `#9b3b20`, `#7a3c12` | Reconectando, error, motivo de alerta |

## Tipografía y medidas

- **IBM Plex Sans** (400/500/600) para títulos y texto e **IBM Plex Mono** (400/500/600) para IDs de pedido, montos, horas y metadatos. Ambas vienen de una sola solicitud a Google Fonts. Reemplazan a DM Sans y Manrope: eran dos sans distintas sin un papel definido entre ellas y ninguna tenía una monoespaciada hermana. Plex es una superfamilia (mismas métricas en Sans y Mono), con cifras tabulares y un carácter de documento técnico que calza con el comprobante.
- **Escala corta:** 12 · 13 · 14 · 16 · 20 · 28 · 40 px.
- **Espaciado:** 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 px.
- **Ancho de contenido:** 1120 px, con márgenes laterales de 24 px (16 px en móvil).
- **Radios:** 4 px en controles y 6 px en hojas.
- **Montos:** siempre con `money()` de `src/format.ts` (`Intl.NumberFormat('es-CL')`), en monoespaciada con `tabular-nums` y alineados a la derecha. Los comprobantes usan columnas de ancho fijo para que las cifras queden alineadas entre pedidos.
- **Estados:**
  - carga: una línea discreta con una barra de 2 px;
  - vacío: hoja punteada con un texto útil y una acción;
  - error: aviso con «Reintentar», que repite la misma consulta;
  - «Reconectando»: cuando el servicio en vivo no responde (502 o timeout), con los últimos datos visibles.
- **Accesibilidad y responsive:** foco visible de 2 px en verde, `prefers-reduced-motion` desactiva animaciones y transiciones. Responsive verificado en 1440, 1024 y 390 px, sin desborde horizontal. En móvil, las tablas se apilan con etiquetas por valor y la navegación queda en una sola línea desplazable.

## Recursos eliminados

- Glassmorphism y desenfoque: 3 `backdrop-filter` y 4 `blur()` → 0.
- Gradientes decorativos: 36 → 0, incluidos el fondo, el texto con gradiente y los acentos laterales de las tarjetas.
- Sombras grandes y glows: 29 `box-shadow` → 1 (el anillo del indicador «en vivo»).
- Radios exagerados (18, 28 y 38 px) y botones píldora con flecha en círculo.
- La ventana decorativa del inicio con anillos y órbitas, las tarjetas flotantes, la «órbita» y los emojis de las ilustraciones de producto y el sello «P360».
- Eyebrows numerados («01 ELIGE A TU RITMO»), etiquetas «PEDIDOS360 / …» sin información, «UNA INTERFAZ MÍNIMA», el estado «Sistema disponible» y el «01 / 01» del formulario.
- El aviso repetido en cada tarjeta de pedido. Ahora está una vez en la página y en el pie.
- `style.css` bajó de 2.369 a ~1.100 líneas sin reglas muertas.

## Microcopy

Concreto y sin relleno. Cada página tiene un título y una frase que dice qué muestra o qué condición aplica; por ejemplo, «Precios de referencia. El stock es informativo: registrar un pedido no lo reserva.». Las alertas dicen el motivo en palabras: «Alto valor: el total alcanza el umbral de alto valor».

## Capturas (modo local con fixture JWT y Kafka)

| | Antes | Después |
|---|---|---|
| Ventas en vivo, 1440 | [antes](diseno/antes-1440-ventas-en-vivo.png) | [después](diseno/despues-1440-ventas-en-vivo.png) · [reconectando](diseno/despues-1440-ventas-reconectando.png) |
| Ventas en vivo, 390 | [antes](diseno/antes-390-ventas-en-vivo.png) | [después](diseno/despues-390-ventas-en-vivo.png) |
| Mis pedidos, 1440 | [antes](diseno/antes-1440-pedidos.png) | [después](diseno/despues-1440-pedidos.png) |
| Mis pedidos, 390 | [antes](diseno/antes-390-pedidos.png) | [después](diseno/despues-390-pedidos.png) |

Restricciones respetadas: las mismas rutas, llamadas a la API, MSAL, scopes y comportamiento, y ninguna dependencia nueva de runtime. Se agregó «Reintentar», que repite la misma consulta, y el estado «Reconectando», que usa la misma regla 401/403 del sondeo. El favicon sigue embebido y ahora dibuja la misma marca que la cabecera.
