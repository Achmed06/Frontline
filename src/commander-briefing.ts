import { COMMANDERS, type CommanderId } from "./commanders";

export type CommanderBriefing = {
  id: CommanderId;
  name: string;
  ability: string;
  role: string;
  cooldown: string;
  stats: readonly string[];
  emphasis: "defense" | "recovery" | "tempo";
};

export function commanderBriefing(id: CommanderId): CommanderBriefing {
  const commander = COMMANDERS[id];

  if (id === "atlas")
    return {
      id,
      name: commander.name,
      ability: commander.ability,
      role: commander.role,
      cooldown: `${commander.cooldown}s CD`,
      stats: [
        `+${commander.shield} SCHILD`,
        `${commander.duration}s DAUER`,
        "ALLE TRUPPEN",
      ],
      emphasis: "defense",
    };

  if (id === "lyra")
    return {
      id,
      name: commander.name,
      ability: commander.ability,
      role: commander.role,
      cooldown: `${commander.cooldown}s CD`,
      stats: [
        `+${commander.healing} HP`,
        "SLOW CLEANSE",
        "ALLE TRUPPEN",
      ],
      emphasis: "recovery",
    };

  return {
    id,
    name: commander.name,
    ability: commander.ability,
    role: commander.role,
    cooldown: `${commander.cooldown}s CD`,
    stats: [
      `+${Math.round((commander.moveSpeedMultiplier - 1) * 100)}% TEMPO`,
      `+${Math.round((commander.attackSpeedMultiplier - 1) * 100)}% ANGRIFF`,
      `${commander.duration}s DAUER`,
    ],
    emphasis: "tempo",
  };
}
