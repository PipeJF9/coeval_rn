# CoEval RN

Migración del flujo del estudiante de Flutter a Expo + React Native + TypeScript con Clean Architecture.

## Estructura

```text
src/
  core/              Configuración compartida, tema y utilidades
  di/                Contenedor de dependencias
  domain/            Entidades, repositorios y casos de uso
  data/              Datasources y repositorios concretos
  presentation/      Contextos, navegación, pantallas y componentes
```

## Alcance implementado

- Auth con `Stack.Navigator` para login, registro y recuperación.
- Vista principal del estudiante con `Tab.Navigator`.
- Flujo de cursos, pendientes y detalle de evaluaciones.
- Evaluaciones a nivel de categoría, no por grupo.
- Caché local manejada solo por los repositorios.

## Variables de entorno

Opcionalmente puedes definir estas variables para apuntar al backend real de Roble:

- `EXPO_PUBLIC_ROBLE_DB_NAME`
- `EXPO_PUBLIC_ROBLE_AUTH_URL`
- `EXPO_PUBLIC_ROBLE_DATABASE_URL`

## Instalación

```bash
cd /home/pipe/Universidad/movil/coeval_rn
npm install
```

Si estás en Expo y quieres ajustar dependencias nativas al SDK instalado, usa `expo install` para los paquetes de navegación, `AsyncStorage`, `Slider`, `safe-area-context` y `screens`.

## Ejecución

```bash
npm run start
```

Luego abre la app en Android, iOS o web desde Expo.

## Notas de arquitectura

- La UI no accede directamente a storage ni al backend.
- El repositorio decide si responde con datos remotos o cacheados.
- El nuevo requisito de evaluación se modela por `categoryId`.

## Recursos

- Video relevante: https://www.youtube.com/watch?v=yxrP6QyMbAA