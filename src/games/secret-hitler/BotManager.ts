import {
  WEBSOCKET_HEADER,
  SERVER_ADDRESS,
  WEBSOCKET,
  PARAM_PACKET_TYPE,
  PACKET_GAME_STATE,
  PACKET_LOBBY,
  PARAM_ICON,
  PING_INTERVAL,
} from "./constants";
import { GameState, LobbyState, WSCommandType } from "./types";
import { defaultPortrait, unlockedPortraits } from "./assets";

const BOT_NAMES = [
  "Bot_Alpha",
  "Bot_Beta",
  "Bot_Gamma",
  "Bot_Delta",
  "Bot_Epsilon",
  "Bot_Zeta",
  "Bot_Eta",
  "Bot_Theta",
  "Bot_Iota",
];

// Delay ranges for bot actions (ms)
const MIN_ACTION_DELAY = 1500;
const MAX_ACTION_DELAY = 4000;

function randomDelay(): number {
  return MIN_ACTION_DELAY + Math.random() * (MAX_ACTION_DELAY - MIN_ACTION_DELAY);
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface BotConnection {
  name: string;
  ws: WebSocket;
  pingInterval?: NodeJS.Timeout;
  lastStateKey?: string; // Tracks state + context to detect when action needed
  isVIP: boolean;
  reconnectAttempts: number;
  shouldReconnect: boolean;
}

const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 2000;

export class BotManager {
  private bots: BotConnection[] = [];
  private lobby: string = "";
  private usernames: string[] = [];
  private humanPlayer: string = "";

  constructor() {
    this.handleBotMessage = this.handleBotMessage.bind(this);
  }

  /**
   * Add bots to a lobby.
   * @param lobby The lobby code
   * @param humanPlayer The human player's name (to exclude from bot actions)
   * @param count Number of bots to add (default 4 for 5 player game)
   */
  async addBots(lobby: string, humanPlayer: string, count: number = 4): Promise<void> {
    this.lobby = lobby;
    this.humanPlayer = humanPlayer;
    this.usernames = [humanPlayer];

    console.log(`[BotManager] Adding ${count} bots to lobby ${lobby}`);

    for (let i = 0; i < count; i++) {
      const botName = BOT_NAMES[i] || `Bot_${i + 1}`;
      await this.connectBot(botName);
      // Small delay between bot connections to avoid overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  private async connectBot(name: string, existingBot?: BotConnection): Promise<void> {
    const url =
      WEBSOCKET_HEADER +
      SERVER_ADDRESS +
      WEBSOCKET +
      "?name=" +
      encodeURIComponent(name) +
      "&lobby=" +
      encodeURIComponent(this.lobby);

    console.log(`[BotManager] Connecting bot ${name} to ${url}`);

    const ws = new WebSocket(url);
    const bot: BotConnection = existingBot || {
      name,
      ws,
      isVIP: false,
      reconnectAttempts: 0,
      shouldReconnect: true,
    };

    // Update the WebSocket reference
    bot.ws = ws;

    ws.onopen = () => {
      console.log(`[BotManager] Bot ${name} connected`);
      bot.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
      // Start ping interval
      if (bot.pingInterval) {
        clearInterval(bot.pingInterval);
      }
      bot.pingInterval = setInterval(() => {
        this.sendCommand(bot, { command: WSCommandType.PING });
      }, PING_INTERVAL);
    };

    ws.onmessage = (msg) => this.handleBotMessage(bot, msg);

    ws.onclose = () => {
      console.log(`[BotManager] Bot ${name} disconnected`);
      if (bot.pingInterval) {
        clearInterval(bot.pingInterval);
        bot.pingInterval = undefined;
      }

      // Attempt to reconnect if allowed
      if (bot.shouldReconnect && bot.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        bot.reconnectAttempts++;
        console.log(`[BotManager] Bot ${name} attempting reconnect (${bot.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        setTimeout(() => {
          this.connectBot(name, bot);
        }, RECONNECT_DELAY * bot.reconnectAttempts);
      }
    };

    ws.onerror = (err) => {
      console.error(`[BotManager] Bot ${name} error:`, err);
    };

    // Only add to bots array if this is a new bot
    if (!existingBot) {
      this.bots.push(bot);
    }
  }

  private sendCommand(bot: BotConnection, payload: any): void {
    const data = {
      ...payload,
      name: bot.name,
      lobby: this.lobby,
    };

    if (bot.ws.readyState === WebSocket.OPEN) {
      console.log(`[BotManager] ${bot.name} sending:`, payload.command);
      bot.ws.send(JSON.stringify(data));
    }
  }

  private handleBotMessage(bot: BotConnection, msg: MessageEvent): void {
    const message = JSON.parse(msg.data);
    console.log(`[BotManager] ${bot.name} received:`, message[PARAM_PACKET_TYPE]);

    switch (message[PARAM_PACKET_TYPE]) {
      case PACKET_LOBBY:
        this.handleLobbyUpdate(bot, message);
        break;
      case PACKET_GAME_STATE:
        this.handleGameState(bot, message as GameState);
        break;
    }
  }

  private handleLobbyUpdate(bot: BotConnection, message: any): void {
    const usernames: string[] = message.usernames || [];
    const icons: Record<string, string> = message[PARAM_ICON] || {};
    this.usernames = usernames;

    // Check if this bot is VIP (first in list)
    bot.isVIP = usernames.length > 0 && usernames[0] === bot.name;

    // If bot doesn't have an icon selected, select one
    if (icons[bot.name] === defaultPortrait || !icons[bot.name]) {
      setTimeout(() => {
        // Pick a random portrait that's not being used
        const usedIcons = Object.values(icons);
        const availableIcons = unlockedPortraits.filter(
          (p) => !usedIcons.includes(p)
        );
        const icon = availableIcons.length > 0
          ? randomChoice(availableIcons)
          : randomChoice(unlockedPortraits);

        console.log(`[BotManager] ${bot.name} selecting icon: ${icon}`);
        this.sendCommand(bot, { command: WSCommandType.SELECT_ICON, icon });
      }, randomDelay());
    }
  }

  private handleGameState(bot: BotConnection, gameState: GameState): void {
    const state = gameState.state;
    const isPresident = gameState.president === bot.name;
    const isChancellor = gameState.chancellor === bot.name;
    const isAlive = gameState.players[bot.name]?.alive !== false;

    // Don't act if not alive
    if (!isAlive) return;

    // Special case: Always check if we need to vote during voting phase
    // This ensures bots vote even if they missed the state change
    if (state === LobbyState.CHANCELLOR_VOTING && !gameState.userVotes[bot.name]) {
      const delay = 500 + Math.random() * 1500;
      setTimeout(() => {
        // Double-check we still need to vote
        const vote = Math.random() > 0.3; // 70% chance to vote yes
        console.log(`[BotManager] ${bot.name} voting ${vote ? "Ja" : "Nein"}`);
        this.sendCommand(bot, { command: WSCommandType.REGISTER_VOTE, vote });
      }, delay);
      return;
    }

    // Create a unique key for this game state context
    // This detects not just state change but also new rounds (different president/chancellor)
    const stateKey = `${state}-${gameState.president}-${gameState.chancellor}-${gameState.liberalPolicies}-${gameState.fascistPolicies}-${gameState.electionTracker}`;

    // Only act if context changed to avoid duplicate actions
    if (stateKey === bot.lastStateKey) return;
    bot.lastStateKey = stateKey;

    console.log(`[BotManager] ${bot.name} processing state: ${state}, isPresident: ${isPresident}, isChancellor: ${isChancellor}`);

    // Use shorter delay for smoother gameplay
    const delay = 500 + Math.random() * 1500;
    setTimeout(() => {
      this.performAction(bot, gameState, isPresident, isChancellor);
    }, delay);
  }

  private performAction(
    bot: BotConnection,
    gameState: GameState,
    isPresident: boolean,
    isChancellor: boolean
  ): void {
    const state = gameState.state;
    const alivePlayers = gameState.playerOrder.filter(
      (p) => gameState.players[p]?.alive !== false
    );

    switch (state) {
      case LobbyState.CHANCELLOR_NOMINATION:
        if (isPresident) {
          // Select a random eligible player as chancellor
          const eligible = alivePlayers.filter(
            (p) =>
              p !== bot.name &&
              p !== gameState.lastChancellor &&
              (alivePlayers.length <= 5 || p !== gameState.lastPresident)
          );
          if (eligible.length > 0) {
            const target = randomChoice(eligible);
            console.log(`[BotManager] ${bot.name} nominating ${target}`);
            this.sendCommand(bot, {
              command: WSCommandType.NOMINATE_CHANCELLOR,
              target,
            });
          }
        }
        break;

      case LobbyState.CHANCELLOR_VOTING:
        // Vote randomly (slightly biased toward yes to keep game moving)
        if (!gameState.userVotes[bot.name]) {
          const vote = Math.random() > 0.3; // 70% chance to vote yes
          console.log(`[BotManager] ${bot.name} voting ${vote ? "Ja" : "Nein"}`);
          this.sendCommand(bot, { command: WSCommandType.REGISTER_VOTE, vote });
        }
        break;

      case LobbyState.LEGISLATIVE_PRESIDENT:
        if (isPresident && gameState.presidentChoices) {
          // Randomly discard one policy
          const choice = Math.floor(Math.random() * gameState.presidentChoices.length);
          console.log(`[BotManager] ${bot.name} (president) discarding policy ${choice}`);
          this.sendCommand(bot, {
            command: WSCommandType.REGISTER_PRESIDENT_CHOICE,
            choice,
          });
        }
        break;

      case LobbyState.LEGISLATIVE_CHANCELLOR:
        if (isChancellor && gameState.chancellorChoices) {
          // Randomly enact one policy
          const choice = Math.floor(Math.random() * gameState.chancellorChoices.length);
          console.log(`[BotManager] ${bot.name} (chancellor) enacting policy ${choice}`);
          this.sendCommand(bot, {
            command: WSCommandType.REGISTER_CHANCELLOR_CHOICE,
            choice,
          });
        }
        break;

      case LobbyState.LEGISLATIVE_PRESIDENT_VETO:
        if (isPresident) {
          // Randomly accept or reject veto (50/50)
          const veto = Math.random() > 0.5;
          console.log(`[BotManager] ${bot.name} ${veto ? "accepting" : "rejecting"} veto`);
          this.sendCommand(bot, {
            command: WSCommandType.REGISTER_PRESIDENT_VETO,
            veto,
          });
        }
        break;

      case LobbyState.PP_PEEK:
        if (isPresident) {
          console.log(`[BotManager] ${bot.name} acknowledging peek`);
          this.sendCommand(bot, { command: WSCommandType.REGISTER_PEEK });
        }
        break;

      case LobbyState.PP_INVESTIGATE:
        if (isPresident) {
          // Investigate a random non-investigated player
          const targets = alivePlayers.filter(
            (p) => p !== bot.name && !gameState.players[p]?.investigated
          );
          if (targets.length > 0) {
            const target = randomChoice(targets);
            console.log(`[BotManager] ${bot.name} investigating ${target}`);
            this.sendCommand(bot, {
              command: WSCommandType.GET_INVESTIGATION,
              target,
            });
          }
        }
        break;

      case LobbyState.PP_EXECUTION:
        if (isPresident) {
          // Execute a random other player
          const targets = alivePlayers.filter((p) => p !== bot.name);
          if (targets.length > 0) {
            const target = randomChoice(targets);
            console.log(`[BotManager] ${bot.name} executing ${target}`);
            this.sendCommand(bot, {
              command: WSCommandType.REGISTER_EXECUTION,
              target,
            });
          }
        }
        break;

      case LobbyState.PP_ELECTION:
        if (isPresident) {
          // Select next president
          const targets = alivePlayers.filter((p) => p !== bot.name);
          if (targets.length > 0) {
            const target = randomChoice(targets);
            console.log(`[BotManager] ${bot.name} special election: ${target}`);
            this.sendCommand(bot, {
              command: WSCommandType.REGISTER_SPECIAL_ELECTION,
              target,
            });
          }
        }
        break;

      case LobbyState.POST_LEGISLATIVE:
        if (isPresident) {
          // End term immediately - no delay for smoother flow
          console.log(`[BotManager] ${bot.name} ending term immediately`);
          this.sendCommand(bot, { command: WSCommandType.END_TERM });
        }
        break;

      case LobbyState.DISCUSSION:
        // Both VIP and president can try to end discussion
        if (bot.isVIP || isPresident) {
          // Quick delay then end discussion
          setTimeout(() => {
            console.log(`[BotManager] ${bot.name} ending discussion`);
            this.sendCommand(bot, { command: WSCommandType.END_DISCUSSION });
          }, 1000);
        }
        break;
    }
  }

  /**
   * Disconnect all bots.
   */
  disconnect(): void {
    console.log("[BotManager] Disconnecting all bots");
    for (const bot of this.bots) {
      // Prevent reconnection attempts
      bot.shouldReconnect = false;
      if (bot.pingInterval) {
        clearInterval(bot.pingInterval);
        bot.pingInterval = undefined;
      }
      if (bot.ws.readyState === WebSocket.OPEN || bot.ws.readyState === WebSocket.CONNECTING) {
        bot.ws.close();
      }
    }
    this.bots = [];
  }

  /**
   * Get the number of connected bots.
   */
  getBotCount(): number {
    return this.bots.filter((b) => b.ws.readyState === WebSocket.OPEN).length;
  }
}

// Singleton instance
let botManagerInstance: BotManager | null = null;

export function getBotManager(): BotManager {
  if (!botManagerInstance) {
    botManagerInstance = new BotManager();
  }
  return botManagerInstance;
}

export function disconnectBots(): void {
  if (botManagerInstance) {
    botManagerInstance.disconnect();
    botManagerInstance = null;
  }
}
