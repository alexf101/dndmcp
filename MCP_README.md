# D&D Battle Manager MCP Server

Transform Claude into your personal **D&D Dungeon Master Assistant** with this Model Context Protocol server! Manage battles, track initiative, create creatures, and run entire D&D 5e sessions directly through conversation.

## What This Gives You

🎲 **Complete Battle Management**: Create grid-based tactical battles or theatre-of-mind encounters
🐉 **Creature Library**: Build reusable creature templates and campaign resources
⚔️ **Initiative Tracking**: Automatic turn order, HP tracking, and status effects
🗺️ **Map Support**: Grid-based maps with terrain, doors, and positioning
📚 **Campaign Persistence**: All your battles and creatures automatically saved

## Quick Setup for Claude Desktop

1. **Install the server** (one-time setup):
    ```bash
    git clone <this-repo>
    cd dndmcp
    deno install
    ```

2. **Add to your Claude Desktop config** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
    ```json
    {
      "mcpServers": {
        "dnd-battle-manager": {
          "command": "deno",
          "args": ["run", "--allow-all", "/path/to/dndmcp/mcp-server.ts"]
        }
      }
    }
    ```

3. **Restart Claude Desktop** and you're ready to run D&D!

## How to Use

Once configured, just talk to Claude naturally about D&D! Here are some examples:

### 🏁 **Starting a Session**
```
"I want to run a D&D encounter with goblins in a forest clearing. Create a battle for 4 players."
```

### ⚔️ **Combat Management**
```
"Add a goblin warrior with 7 HP and AC 15 to the battle at position (5,3)"
"The rogue attacks the goblin for 6 damage"
"Start initiative and move to the next turn"
```

### 🗺️ **Map Building**
```
"Set up some walls around the edges and put a door at (10,5)"
"Add difficult terrain in the center of the map"
"Toggle that door to open"
```

### 📚 **Campaign Management**
```
"Save this goblin as a creature template for future use"
"Search my campaign for any orc creatures"
"List all my battles"
```

Claude will automatically use the appropriate tools behind the scenes and keep track of everything for you!

## What You Get

- **Natural conversation**: No need to learn commands - just describe what you want
- **Persistent memory**: All battles and creatures saved between sessions
- **Rich combat**: Full D&D 5e rules support with HP, AC, initiative, status effects
- **Flexible modes**: Both grid-based tactical and theatre-of-mind combat
- **Campaign tools**: Build libraries of creatures and maps for reuse

Perfect for solo play, session prep, or as a co-DM assistant!
