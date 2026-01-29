# StatsCode

Rastreie suas horas de programação com IA, padrões e conquistas.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

🌐 [English](../README.md) • [Español](README.es.md) • [Português](README.pt.md) • [中文](README.zh.md)

## O que é StatsCode?

StatsCode rastreia como você usa assistentes de programação com IA. Pense nisso como **GitHub stats para programação assistida por IA**.

- **Rastreie horas** de programação com IA
- **Veja insights** sobre seus padrões de código
- **Sincronize na nuvem** e apareça no leaderboard
- **Adicione um badge** ao seu perfil do GitHub

## Ferramentas Suportadas

| Ferramenta | Status |
|------------|--------|
| Claude Code | Disponível |
| OpenCode | Disponível |
| Codex | Em breve |
| Antigravity | Em breve |
| Cursor | Em breve |

## Início Rápido

### Claude Code

```bash
# Instalar via marketplace
claude plugins install statscode

# Ou manualmente
cd ~/.claude/plugins
git clone https://github.com/srdanirz/statscode
```

#### Comandos

| Comando | Descrição |
|---------|-----------|
| `/statscode:stats` | Ver suas estatísticas |
| `/statscode:insights` | Ver padrões de sessão |
| `/statscode:login` | Fazer login com GitHub |
| `/statscode:badge` | Ver seus badges conquistados |

### OpenCode

Adicione ao seu `opencode.json` ([docs](https://opencode.ai/docs/plugins/)):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@statscode/plugin-opencode"]
}
```

O plugin instala automaticamente via Bun ao iniciar.

## O que é Rastreado?

- **Horas Ativas** - Tempo de programação (baseado em atividade)
- **Sessões** - Número de sessões
- **Prompts** - Total de prompts enviados
- **Linhas Geradas** - Código escrito/editado
- **Linguagens** - Linguagens de programação usadas

## Adicione Badge ao seu Perfil do GitHub

Após fazer login com `/statscode:login`:

```markdown
[![StatsCode](https://api.statscode.dev/badge/SEU_USUARIO.svg)](https://statscode.dev/profile/SEU_USUARIO)
```

## Privacidade

- Todos os dados são armazenados **localmente** por padrão (`~/.statscode/`)
- A sincronização na nuvem é **opcional**
- Nenhum prompt ou código é enviado
- Apenas estatísticas agregadas são sincronizadas

## Desenvolvimento

```bash
git clone https://github.com/srdanirz/statscode
cd statscode
npm install
npm run build
```

## Licença

MIT
