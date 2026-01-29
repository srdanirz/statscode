# StatsCode

Rastrea tus horas de programación con IA, patrones y logros.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

🌐 [English](../README.md) • [Español](README.es.md) • [Português](README.pt.md) • [中文](README.zh.md)

## ¿Qué es StatsCode?

StatsCode rastrea cómo usas los asistentes de programación con IA. Piénsalo como **GitHub stats para programación asistida por IA**.

- **Rastrea horas** de programación con IA
- **Ve insights** sobre tus patrones de código
- **Sincroniza a la nube** y aparece en el leaderboard
- **Agrega un badge** a tu perfil de GitHub

## Herramientas Soportadas

| Herramienta | Estado |
|-------------|--------|
| Claude Code | Disponible |
| OpenCode | Disponible |
| Codex | Pronto |
| Antigravity | Pronto |
| Cursor | Pronto |

## Inicio Rápido

### Claude Code

```bash
# Instalar via marketplace
claude plugins install statscode

# O manualmente
cd ~/.claude/plugins
git clone https://github.com/srdanirz/statscode
```

#### Comandos

| Comando | Descripción |
|---------|-------------|
| `/statscode:stats` | Ver tus estadísticas |
| `/statscode:insights` | Ver patrones de sesión |
| `/statscode:login` | Iniciar sesión con GitHub |
| `/statscode:badge` | Ver tus badges ganados |

### OpenCode

Agrega a tu `opencode.json` ([docs](https://opencode.ai/docs/plugins/)):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@statscode/plugin-opencode"]
}
```

El plugin se instala automáticamente via Bun al iniciar.

## ¿Qué se Rastrea?

- **Horas Activas** - Tiempo de programación (basado en actividad)
- **Sesiones** - Número de sesiones
- **Prompts** - Total de prompts enviados
- **Líneas Generadas** - Código escrito/editado
- **Lenguajes** - Lenguajes de programación usados

## Agrega Badge a tu Perfil de GitHub

Después de iniciar sesión con `/statscode:login`:

```markdown
[![StatsCode](https://api.statscode.dev/badge/TU_USUARIO.svg)](https://statscode.dev/profile/TU_USUARIO)
```

## Privacidad

- Todos los datos se guardan **localmente** por defecto (`~/.statscode/`)
- La sincronización a la nube es **opcional**
- No se suben prompts ni código
- Solo se sincronizan estadísticas agregadas

## Desarrollo

```bash
git clone https://github.com/srdanirz/statscode
cd statscode
npm install
npm run build
```

## Licencia

MIT
