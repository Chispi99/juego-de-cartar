# Juego de Cartas

Un juego de cartas tipo "pack opening" donde puedes abrir sobres y coleccionar cartas de diferentes rarezas.

## Estructura del Proyecto

```
app/
├── classes/
│   ├── cards.js          # Lógica de baraja y apertura de sobres
│   ├── main.js          # Lógica de UI y control de secciones
│   └── cardsData.json   # Definición de todas las cartas
├── views/
│   ├── index.html       # Archivo HTML principal
│   └── styles.css       # Estilos CSS
├── imagenes/            # Carpeta para guardar imágenes de cartas
README.md
```

## Características

- Abrir sobres con un número personalizado de cartas
- Sistema de rareza (Common, Rare, Epic, Legendary)
- Colección persistente durante la sesión
- Filtrado por calidad en la colección
- Interfaz responsive
- Navegación entre secciones (Abrir sobres / Ver colección)

## Instrucciones para ejecutar

### Opción 1: Abrir directamente
1. Navega a `app/views/index.html` en tu navegador (doble clic).

### Opción 2: Servidor local (recomendado)

Desde la carpeta raíz:

```bash
python -m http.server 8000
# Abre http://localhost:8000/app/views/
```

O usa la extensión **Live Server** de VS Code.

## Próximas mejoras

- Añadir imágenes a las cartas
- Guardar colección en localStorage
- Efectos y animaciones mejoradas
- Sistema de trading / intercambio
