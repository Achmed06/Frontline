import type { CommanderId } from "./commanders";
/** Original FRONTLINE insignia, units and commander, drawn as compact vector art. */
export function unitSvg(
  id: string,
  team: "player" | "enemy" = "player",
): string {
  const friendly = team === "player";
  const accent = friendly ? "#53ffd2" : "#ff7149";
  const glow = friendly ? "#158dcc" : "#c44229";
  const pale = friendly ? "#def9e6" : "#ffdebd";
  const k = `${id}-${team}`;
  const forms: Record<string, string> = {
    pioneer: `
      <path d="m30 61-8 23h15l10-20 9 20h15l-7-23" fill="#2d4b52" stroke="#132f39" stroke-width="3"/>
      <path d="M22 36h50l-7 31H31z" fill="url(#${k}-steel)" stroke="#132f39" stroke-width="3"/>
      <path d="M32 19h31l-5 20H37z" fill="#6f9586" stroke="#132f39" stroke-width="3"/>
      <path d="M37 26h22" stroke="${accent}" stroke-width="5"/>
      <path d="M76 78V9l17 8-17 9" fill="${accent}" stroke="${pale}" stroke-width="3"/>
      <path d="m20 41-7 22 12 5 11-20M64 47l10 13 7-9" fill="none" stroke="#83a798" stroke-width="9"/>
      <path d="M40 47h15v12H40z" fill="${accent}"/><path d="M47 44v18M37 53h21" stroke="#16343e" stroke-width="3"/>
    `,
    breaker: `
      <path d="m28 58-8 27h18l10-22 10 22h18l-8-27" fill="#284652" stroke="#102b35" stroke-width="3"/>
      <path d="m24 32 24-13 24 13-7 34H31z" fill="url(#${k}-steel)" stroke="#102b35" stroke-width="3"/>
      <path d="M34 15h28l-4 20H38z" fill="#294852" stroke="${pale}" stroke-width="3"/>
      <path d="M39 23h18" stroke="${accent}" stroke-width="5"/>
      <path d="m15 41-8 24 14 11 16-27M81 41l8 24-14 11-16-27" fill="#365665" stroke="${pale}" stroke-width="3"/>
      <path d="m12 57 14 7m44 0 14-7" stroke="${accent}" stroke-width="6"/>
      <path d="m51 39-12 13h9l-3 10 14-15h-9z" fill="${accent}"/>
    `,
    mortar: `
      <path d="M12 61h72v23H12z" fill="#17343e" stroke="#081f29" stroke-width="3"/>
      <path d="M18 66h13v12H18m17-12h13v12H35m17-12h13v12H52m17-12h9v12h-9" fill="${glow}"/>
      <path d="m19 58 8-25 39-4 13 29-12 12H30z" fill="url(#${k}-steel)" stroke="#142c36" stroke-width="3"/>
      <path d="m29 44-9-29 14-5 13 30m8-1 5-30 15 3-2 34" fill="#294650" stroke="${pale}" stroke-width="4"/>
      <path d="m20 15 14-5m26-1 15 3" stroke="#0b232e" stroke-width="7"/>
      <path d="M33 47h30v12H33z" fill="#15313d"/><path d="M38 50h20v5H38z" fill="${accent}"/>
    `,
    disruptor: `
      <path d="m28 60-9 23 16 4 13-21 12 21 17-5-10-23" fill="#274550" stroke="#112b35" stroke-width="3"/>
      <path d="m23 35 25-15 24 15-7 32-17 9-18-10z" fill="url(#${k}-steel)" stroke="#112b35" stroke-width="3"/>
      <path d="M15 15v43m66-43v43M8 24h14M8 34h14M74 24h14M74 34h14" stroke="${accent}" stroke-width="4"/>
      <path d="m22 53 12-9m40 9-12-9" stroke="${pale}" stroke-width="7"/>
      <circle cx="48" cy="47" r="15" fill="#183540" stroke="${glow}" stroke-width="4"/>
      <path d="m50 34-11 15h9l-3 12 13-18h-10z" fill="${accent}"/>
      <path d="M36 18h24l-4 12H40z" fill="#17333c" stroke="${pale}" stroke-width="3"/>
    `,
    raider: `
      <path d="m15 79 9-26 17-12 22 4 19 33-20 7-17-10-14 11z" fill="#16333b" stroke="#09212b" stroke-width="3"/>
      <path d="m29 51-9 25 10 7 15-24m11-6 6 27 17 1-11-34" fill="#698f80" stroke="#132f38" stroke-width="3"/>
      <path d="m26 27 18-12 20 8 12 20-19 21-26-8-12-15z" fill="url(#${k}-steel)" stroke="#102830" stroke-width="3"/>
      <path d="m36 17 12-9 17 14-5 19-20 3-12-12z" fill="#a9b7a0" stroke="#12303b" stroke-width="3"/>
      <path d="m33 26 28-3-4 10-18 4z" fill="${accent}" stroke="#162e36" stroke-width="3"/>
      <path d="m28 42 19 9 16-7-4 12-13 5-15-6z" fill="${accent}"/>
      <path d="m21 33-12-21-4 4 9 37 9 10 8-8zM71 35 85 9l5 5-8 39-10 11-9-9z" fill="${pale}" stroke="#163640" stroke-width="3"/>
      <path d="m12 23 7 23m64-24-8 26" stroke="${accent}" stroke-width="4"/>
      <path d="m25 76 8 2-3 13-9-2m43-11 9-1 7 12-11 1" fill="${glow}"/>
    `,
    sentinel: `
      <path d="M13 57h20l4 29H9zm49 0h20l5 29H58z" fill="#203944" stroke="#0c242e" stroke-width="3"/>
      <path d="M16 63h12v17H14zm51 0h11l4 17H64z" fill="#79998a"/>
      <path d="m20 28 21-13 28 5 14 22-8 28-25 10-29-11-10-24z" fill="url(#${k}-steel)" stroke="#102936" stroke-width="3"/>
      <path d="M19 39h18l-4 27H14zm43-1h20l4 27H62z" fill="#aebda0" stroke="#26474a" stroke-width="3"/>
      <path d="m34 28 10-14 15 4 9 14-7 18-24-2z" fill="#274951" stroke="#a3b6a0" stroke-width="2"/>
      <path d="m39 31 22-1-3 9-17 1z" fill="${accent}"/>
      <path d="M8 30h13v30H8zm68-7h13v39H76z" fill="#142e3b" stroke="#64897d" stroke-width="3"/>
      <path d="M11 23h7v18h-7zm68-9h7v29h-7z" fill="${pale}"/>
      <path d="m36 56 11 5 13-5v10l-12 6-12-6z" fill="${accent}"/>
      <path d="M16 48h12v5H16zm51 0h11v5H67z" fill="${glow}"/>
    `,
    vanguard: `
      <path d="M33 55 28 74 35 82 42 78 44 60M52 59 55 78 64 81 68 73 62 55" fill="#172b32" stroke="#09191f" stroke-width="3"/>
      <path d="m29 75 11-2 2 6-6 4-8-3m27-5 11 1 3 6-10 1-5-5" fill="#5d7879"/>
      <path d="m25 33-8 9 3 23 9 2 5-22m30-13 11 9-1 24-9 2-4-23" fill="#324d53" stroke="#102229" stroke-width="3"/>
      <path d="m24 32 12-6 24 1 12 9-8 26-18 6-18-8z" fill="url(#${k}-steel)" stroke="#102229" stroke-width="3"/>
      <path d="m30 34 15 5 20-6-2 10-18 6-16-7" fill="#71968d"/>
      <path d="m32 45 12 5 15-5-2 12-12 4-11-5" fill="#1a333b"/>
      <path d="m37 47 9 3 11-4-2 5-9 3-8-3" fill="${accent}"/>
      <path d="m35 18 9-7 12 3 7 10-4 14-14 5-13-9z" fill="#566e70" stroke="#142a31" stroke-width="3"/>
      <path d="m33 24 28-1-3 8-22 2z" fill="#14292f"/>
      <path d="m35 25 24-1-3 5-19 2z" fill="${accent}"/>
      <path d="m42 13 2 10 6-1 1-9" fill="#aebbb0"/>
      <path d="m63 36 7 2 1 12 8 1 1 6-9 3-5 17-7-2 3-17-6-5 2-8 4 1z" fill="#0d222b" stroke="#647d78" stroke-width="2"/>
      <path d="m69 42 5 1-2 25-4 3z" fill="${accent}"/>
      <path d="m20 43 6-3 2 7-8 2" fill="${pale}"/><path d="m36 64 7 2-2 7-7-1m14-6 8-3 2 8-8 3" fill="#9aa89b"/>
    `,
    bulwark: `
      <path d="m27 59-8 19 2 9h20l4-25m9 0 2 25h20l2-9-9-19" fill="#223c43" stroke="#0b1e25" stroke-width="3"/>
      <path d="m20 80 20-1-1 8H19m39-7 20 1 1 6H59" fill="#7c9389"/>
      <path d="m17 28 15-5 31 1 15 8-8 33-18 7-26-8z" fill="url(#${k}-steel)" stroke="#0a222a" stroke-width="3"/>
      <path d="m29 31 18 6 20-6-3 20-17 8-17-8z" fill="#25464d"/>
      <path d="m33 39 14 4 15-5-2 8-13 5-12-5" fill="${accent}"/>
      <path d="m30 52 17 7 19-8-2 9-17 7-15-7" fill="#a8b4a1"/>
      <path d="m13 27 16-1 1 24-10 11-13-7 1-21m61-5 16 1 7 10-1 19-13 6-10-12" fill="#5a7672" stroke="#142d34" stroke-width="3"/>
      <path d="m10 34 14-3v9l-15 6m64-14 13 4 2 12-16-7" fill="${pale}"/>
      <path d="m8 49 15-5 5 10-7 17L7 68 4 59z" fill="#263f48" stroke="#0d222a" stroke-width="3"/>
      <path d="m72 48 15 3 4 12-5 9-16-3-4-11z" fill="#253c43" stroke="#0d222a" stroke-width="3"/>
      <path d="m72 55 14 2-2 9-13-2z" fill="${glow}"/><path d="m10 54 9-3 3 6-5 8-7-2z" fill="${glow}"/>
      <path d="m34 16 10-7 15 5 5 11-6 10-19-2-8-9z" fill="#89998c" stroke="#172f35" stroke-width="3"/>
      <path d="m33 22 29 1-5 8-19-2z" fill="#172b32"/><path d="m38 23 19 1-2 4-14-1z" fill="${accent}"/>
      <path d="m27 19-3-9 5-2 6 16m28-3 3-10 5 2-3 15" fill="#233d45"/>
      <path d="m28 67 9 1-3 10-9-1m34-9 10-1 4 11-10 1" fill="#526d69"/>
    `,
    ranger: `
      <path d="m31 38-9 31 20 5 11-18 16 16 9-8-16-37z" fill="#1b3940" stroke="#0e252d" stroke-width="2"/>
      <path d="m34 32-10 36 9 3 11-29m12-7 18 32 6-7-18-32" fill="#547b70"/>
      <path d="m34 57-8 20 5 8 11-4 6-20m5-4 4 22 10 3 7-7-10-21" fill="#253d43" stroke="#10262d" stroke-width="3"/>
      <path d="m25 77 13-2 4 7-13 4zm32 0 14-2 3 7-16 1z" fill="#91a69a"/>
      <path d="m31 31 17-5 17 9-7 25-14 5-15-11z" fill="url(#${k}-steel)" stroke="#0c242c" stroke-width="3"/>
      <path d="m34 38 11 3 14-3-3 13-12 5-9-6" fill="#17353d"/>
      <path d="m33 40 23 15-3 6-22-15z" fill="#9da58a"/>
      <path d="m33 23 6-11 17-1 11 13-4 14-15 6-14-8z" fill="#6e9586" stroke="#102a31" stroke-width="3"/>
      <path d="m38 24 23-1-3 9-14 4-8-4z" fill="#152b31"/><path d="m42 25 17 1-3 4-13 2z" fill="${accent}"/>
      <path d="m59 44 7-23 4 1-2 24 9 6-2 8-6-3-9 22-8-4 9-23-6-2z" fill="#152931" stroke="#708981" stroke-width="2"/>
      <path d="m67 20 6-15 4 1-4 16z" fill="#b4bdae"/><path d="m61 39 11 3-2 5-11-4z" fill="${accent}"/>
      <path d="m26 41 7-3 8 13-7 8-10-9z" fill="#5a7b73"/>
      <path d="m27 44 4-1 5 8-3 3-6-6z" fill="${pale}"/>
    `,
    swarm: `
      <path d="m13 41 13 4 3 20-5 9-10-5-9-18zm40-4 14 3 6 17-6 14-13-8-6-16zm-13-27 14 1 12 10-3 13-14 4-17-11z" fill="#112f36" opacity=".7"/>
      <g transform="translate(1 30)"><path d="m14 9 10 4 12-4 1 20-13 9L11 27z" fill="url(#${k}-steel)" stroke="#102a32" stroke-width="2"/><path d="m13 11-10-6-1 19 11 6zm23-1 10-7 1 19-11 8z" fill="#5b7a72" stroke="#18323a" stroke-width="2"/><path d="m6 9 4 3-1 10-4-2m35-7 4-4 1 11-5 4" fill="${accent}"/><path d="m17 17 13 1 2 9-9 5-8-6z" fill="#102b34"/><path d="m18 21 11 1-1 5-9-1z" fill="${accent}"/><path d="m20 35 6-1-1 9-4 3z" fill="${pale}"/></g>
      <g transform="translate(44 28)"><path d="m14 9 10 4 12-4 1 20-13 9L11 27z" fill="url(#${k}-steel)" stroke="#102a32" stroke-width="2"/><path d="m13 11-10-6-1 19 11 6zm23-1 10-7 1 19-11 8z" fill="#5b7a72" stroke="#18323a" stroke-width="2"/><path d="m6 9 4 3-1 10-4-2m35-7 4-4 1 11-5 4" fill="${accent}"/><path d="m17 17 13 1 2 9-9 5-8-6z" fill="#102b34"/><path d="m18 21 11 1-1 5-9-1z" fill="${accent}"/><path d="m20 35 6-1-1 9-4 3z" fill="${pale}"/></g>
      <g transform="translate(22 0)"><path d="m14 9 10 4 12-4 1 20-13 9L11 27z" fill="url(#${k}-steel)" stroke="#102a32" stroke-width="2"/><path d="m13 11-10-6-1 19 11 6zm23-1 10-7 1 19-11 8z" fill="#8d9c85" stroke="#18323a" stroke-width="2"/><path d="m6 9 4 3-1 10-4-2m35-7 4-4 1 11-5 4" fill="${accent}"/><path d="m17 17 13 1 2 9-9 5-8-6z" fill="#102b34"/><path d="m18 21 11 1-1 5-9-1z" fill="${accent}"/><path d="m20 35 6-1-1 9-4 3z" fill="${pale}"/></g>
    `,
    lancer: `
      <path d="m10 70 27-36 21-4 22 30-8 18-41 4z" fill="#14313a" opacity=".7"/>
      <path d="m22 57-8 16 10 9 14-12m28-17 17 19-6 11-19-16" fill="#172d36" stroke="#071f28" stroke-width="3"/>
      <path d="m24 66-5 7 5 5 9-10m35-5 11 11-3 6-13-13" fill="${accent}"/>
      <path d="m24 41 22-27 21 23 5 31-21 14-26-15z" fill="url(#${k}-steel)" stroke="#102830" stroke-width="3"/>
      <path d="m45 18 3 38-18 15-3-28z" fill="#8fa794"/><path d="m51 19 16 23 1 24-15-10z" fill="#3c615b"/>
      <path d="m40 42 7-15 10 17-3 15-7 8-10-10z" fill="#112c34"/><path d="m43 40 4-8 6 10-1 10-6 5-5-7z" fill="${accent}"/>
      <path d="m18 49 14-13-2 19-13 15-5-4zm49-13 17 12 5 20-7 4-15-17z" fill="#c1c3a5" stroke="#1d363c" stroke-width="2"/>
      <path d="m76 37 4-30 8-3-2 42-8 14-8-4z" fill="${pale}" stroke="#24494a" stroke-width="2"/><path d="m81 12 3-3-2 34-5 9 2-14z" fill="${accent}"/>
      <path d="m35 71 9 5-5 10-6-1zm17 6 8-6 3 14-7 2z" fill="${glow}"/>
      <path d="m38 82 1 11-7-6m25-5 2 11 5-6" fill="${accent}" opacity=".85"/>
    `,
    medic: `
      <path d="m18 63 30-14 30 14v10L48 88 18 75z" fill="${glow}" opacity=".24"/>
      <path d="m10 23 22 7 16-11 17 11 21-7-6 29-15 8-17 16-17-16-15-8z" fill="url(#${k}-steel)" stroke="#102a31" stroke-width="3"/>
      <path d="m11 25 16 9-2 15-8-5zm74 0-17 9 3 15 8-5z" fill="#a9b8a3"/><path d="m16 31 7 4-1 8-5-3zm64 0-8 4 1 8 5-3z" fill="${accent}"/>
      <path d="m30 36 18-12 18 12-3 24-15 12-15-12z" fill="#73998a" stroke="#1e4248" stroke-width="2"/>
      <path d="m37 38 11-6 11 6 1 17-12 9-12-9z" fill="#17353d"/>
      <path d="M44 37h8v8h8v8h-8v8h-8v-8h-8v-8h8z" fill="${accent}"/>
      <path d="m29 15 5-9 4 3-3 16m24 0-2-16 5-3 4 11" fill="#7a9685" stroke="#18373b" stroke-width="2"/>
      <path d="m29 62 9 4-5 15-8-2zm29 4 9-5 5 18-9 2z" fill="#163740"/><path d="m28 73 6 2-2 4-6-2zm34 2 6-3 1 5-6 2z" fill="${accent}"/>
      <path d="m42 79 6 3 7-4-2 12-5 4-5-3z" fill="${accent}" opacity=".5"/>
    `,
    stasis: `
      <circle cx="48" cy="48" r="34" fill="${glow}" opacity=".3"/>
      <path d="M48 8v80M13 28l70 40M13 68l70-40" stroke="${accent}" stroke-width="4"/>
      <path d="m37 17 11 10 11-10M37 79l11-10 11 10M17 39l15-5-3-15M79 57l-15 5 3 15M17 57l15 5-3 15M79 39l-15-5 3-15" stroke="${pale}" stroke-width="3"/>
      <circle cx="48" cy="48" r="13" fill="#193640" stroke="${accent}" stroke-width="3"/>
      <path d="M43 42v12m10-12v12" stroke="${pale}" stroke-width="4"/>
    `,
    repulsor: `
      <circle cx="48" cy="48" r="17" fill="${glow}" stroke="${pale}" stroke-width="4"/>
      <path d="M48 5v22m0 42v22M5 48h22m42 0h22" stroke="${accent}" stroke-width="5"/>
      <path d="m37 16 11-11 11 11M37 80l11 11 11-11M16 37 5 48l11 11M80 37l11 11-11 11" stroke="${pale}" stroke-width="4"/>
      <path d="m20 28 8-8m40 0 8 8m0 40-8 8m-40 0-8-8" stroke="${accent}" stroke-width="4"/>
    `,
    pulse: `
      <path d="M48 7 75 19 89 44 80 72 52 88 22 79 7 55 14 27z" fill="${glow}" opacity=".16"/>
      <path d="m28 10-13 8-9 20m61-28 16 12 8 19M9 67l14 17 17 6m50-29-9 17-18 11" fill="none" stroke="${accent}" stroke-width="3"/>
      <path d="M48 17 70 28 78 48 66 69 46 79 25 66 18 45 30 27z" fill="none" stroke="${accent}" stroke-opacity=".45" stroke-width="2"/>
      <path d="m48 23-5 14-15-4 9 14-13 9 17 2 3 18 8-15 17 6-6-15 12-11-17-1-1-19-8 13z" fill="#18383e" stroke="${accent}" stroke-width="2"/>
      <path d="m50 29-15 22h13l-6 17 22-28H50z" fill="${pale}"/>
      <path d="M45 1h6v10h-6zM83 43h12v5H83zM45 84h6v12h-6zM0 46h12v5H0z" fill="${accent}"/>
    `,
    rally: `
      <path d="m48 9 34 18 7 38-40 23-40-22 6-36z" fill="${glow}" opacity=".15"/>
      <path d="m16 32 32-18 32 18v35L48 85 16 67z" fill="none" stroke="${accent}" stroke-width="2" stroke-dasharray="18 7"/>
      <path d="m25 38 23-13 23 13v26L48 77 25 64z" fill="${glow}" opacity=".4"/>
      <path d="m25 38 23-13 23 13v26L48 77 25 64z" fill="none" stroke="${accent}" stroke-opacity=".65" stroke-width="2"/>
      <path d="m39 38 9-5 9 5v9l9 5v10l-9 5-9-5-9 5-9-5V52l9-5z" fill="#15353b"/>
      <path d="M43 32h10v15h14v10H53v14H43V57H29V47h14z" fill="${pale}"/>
      <path d="m44 32 4-2 7 3-2 14-5 3-5-3zm9 15 14-1 3 6-3 5-14-1z" fill="${accent}"/>
      <path d="m10 19 6-3v10l-6 3zm68-3 7 4v10l-7-4zm-33 69 6 1v10h-6zM9 66l5 3v9l-5-3zm72 2 5-3v10l-5 3z" fill="${accent}" opacity=".8"/>
    `,
  };
  const art = forms[id] || forms.vanguard;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none"><defs><linearGradient id="${k}-steel" x1="20" y1="14" x2="70" y2="86" gradientUnits="userSpaceOnUse"><stop stop-color="${friendly ? "#abe8ff" : "#ffd092"}"/><stop offset=".46" stop-color="${friendly ? "#328fc6" : "#e67c43"}"/><stop offset="1" stop-color="${friendly ? "#244c86" : "#8f3740"}"/></linearGradient></defs><path d="m14 78 32-8 37 8-8 9-29 5-28-6z" fill="#071820" opacity=".35"/>${art}</svg>`;
}

export function commanderSvg(id: CommanderId = "atlas"): string {
  if (id === "nova")
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" role="img" aria-label="NOVA – Sturmkommando">
    <defs><linearGradient id="nova-bg" x2="1" y2="1"><stop stop-color="#624d69"/><stop offset="1" stop-color="#1e3044"/></linearGradient></defs>
    <rect width="320" height="320" rx="16" fill="url(#nova-bg)"/>
    <path d="m18 225 68-75-30 91 39-16M268 36l-43 99 46-37-26 84" fill="none" stroke="#f8bb72" stroke-width="5" opacity=".5"/>
    <circle cx="161" cy="145" r="107" fill="none" stroke="#d4a281" stroke-width="2" opacity=".4"/>
    <path d="m73 222 57-40 32 26 31-26 61 40 18 98H49z" fill="#a18c99" stroke="#202e43" stroke-width="6"/>
    <path d="m103 88 59-42 50 26 14 70-37 52-45-4-38-43z" fill="#d6c8bd" stroke="#263047" stroke-width="6"/>
    <path d="m104 110 110-17-8 31-41 13-57-8z" fill="#28384c"/><path d="m115 112 86-9-7 13-73 6z" fill="#ffc988"/>
    <path d="m139 49 15-27 35 32-15 16zM79 223l-21 28 38 29 30-29m102-27 35 25-29 36-38-33" fill="#66758a" stroke="#263047" stroke-width="5"/>
    <path d="m174 222-35 42h24l-12 38 45-55h-27z" fill="#ffd296"/>
    <path d="M115 154l29 21h38l22-28M108 293H80m158 0h-28" fill="none" stroke="#ffd296" stroke-width="6"/>
  </svg>`;
  if (id === "lyra")
    return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320" fill="none">
    <defs><linearGradient id="lyra-bg" x2="320" y2="320" gradientUnits="userSpaceOnUse"><stop stop-color="#326174"/><stop offset="1" stop-color="#17273f"/></linearGradient><linearGradient id="lyra-armor" x1="90" y1="80" x2="235" y2="300" gradientUnits="userSpaceOnUse"><stop stop-color="#e3eced"/><stop offset=".5" stop-color="#90adb7"/><stop offset="1" stop-color="#375967"/></linearGradient></defs>
    <rect width="320" height="320" rx="16" fill="url(#lyra-bg)"/>
    <circle cx="167" cy="126" r="96" stroke="#9de7f0" stroke-opacity=".16" stroke-width="2"/>
    <path d="M35 57h47M35 65h21M235 40h50M258 48h27" stroke="#b3dce8" stroke-opacity=".3" stroke-width="2"/>
    <path d="m52 320 10-89 61-49h74l62 49 19 89z" fill="#172d44" stroke="#0e2332" stroke-width="5"/>
    <path d="m73 214 52-25 37 27 38-28 49 32-11 93H84z" fill="url(#lyra-armor)" stroke="#203e50" stroke-width="5"/>
    <path d="m132 200 29 28 27-28 14 70-42 34-42-34z" fill="#28495e"/>
    <path d="M151 236h18v17h17v17h-17v17h-18v-17h-17v-17h17z" fill="#9ff2ed"/>
    <path d="m113 83 48-41 49 35 12 66-31 56-52 1-36-50z" fill="url(#lyra-armor)" stroke="#203f51" stroke-width="5"/>
    <path d="m121 85 40-24 37 21 7 31-40 13-44-15z" fill="#344e65"/>
    <path d="m111 117 49 14 51-19-5 27-43 22-44-16z" fill="#142a43"/>
    <path d="m119 120 42 15 43-16-6 16-35 15-37-13z" fill="#a7f2f3"/>
    <path d="m133 158 28 13 27-13-8 25h-40z" fill="#607f8d"/>
    <path d="m103 98-18 12v62l25 16m107-94 21 13v63l-24 19" fill="#34546b" stroke="#a1c5cd" stroke-width="5"/>
    <path d="M91 104V54m139 51V67" stroke="#9deaf0" stroke-width="5"/>
    <path d="m63 236-27 63 35 17 35-64m144-16 29 66-35 14-32-64" fill="#4b7283" stroke="#173448" stroke-width="5"/>
    <path d="m50 267 29 12m156 1 30-12" stroke="#9aeeeb" stroke-width="7"/>
    <circle cx="265" cy="173" r="17" fill="#3c6175" stroke="#a8eced" stroke-width="3"/><path d="M265 164v18m-9-9h18" stroke="#bff9ee" stroke-width="4"/>
  </svg>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320" fill="none">
    <defs>
      <linearGradient id="atlas-bg" x1="33" y1="0" x2="309" y2="320" gradientUnits="userSpaceOnUse"><stop stop-color="#2079b7"/><stop offset="1" stop-color="#143768"/></linearGradient>
      <linearGradient id="atlas-armor" x1="110" y1="118" x2="246" y2="314" gradientUnits="userSpaceOnUse"><stop stop-color="#c3f2ff"/><stop offset=".5" stop-color="#489ed4"/><stop offset="1" stop-color="#255b9a"/></linearGradient>
      <linearGradient id="atlas-helm" x1="110" y1="39" x2="229" y2="193" gradientUnits="userSpaceOnUse"><stop stop-color="#e0f5ff"/><stop offset=".45" stop-color="#6cbade"/><stop offset="1" stop-color="#3576af"/></linearGradient>
      <linearGradient id="atlas-visor" x1="116" y1="105" x2="221" y2="125" gradientUnits="userSpaceOnUse"><stop stop-color="#fff193"/><stop offset="1" stop-color="#ffc343"/></linearGradient>
      <clipPath id="atlas-clip"><rect width="320" height="320" rx="16"/></clipPath>
    </defs>
    <g clip-path="url(#atlas-clip)">
      <path fill="url(#atlas-bg)" d="M0 0h320v320H0z"/>
      <path d="M0 73 112 0h105L0 147zm320-45-98 63 98 30zM0 262l107-63 143 121H0z" fill="#a7c696" opacity=".08"/>
      <path d="m244-10-23 77 58 48 62-33m-362 98 79-36 29-77" stroke="#cbdeab" stroke-opacity=".16" stroke-width="1.5"/>
      <path d="M20 27h40M20 27v38m280 162v60h-31" stroke="#bacda0" stroke-opacity=".45" stroke-width="2"/>
      <path d="M248 30h24v3h-24zm0 8h15v3h-15zm0 8h24v3h-24zM28 247h3v18h-3zm7 0h3v18h-3zm7 0h3v18h-3z" fill="#d6dcba" opacity=".4"/>
      <path d="m36 321 10-103 33-35 57-22 66 2 65 31 32 45 23 83" fill="#122a2d"/>
      <path d="m101 180 9-39 92-3 21 47-24 45-67 1z" fill="#1a3434" stroke="#0e282d" stroke-width="5"/>
      <path d="m114 156 12 45 32 17 37-19 15-45" fill="#617c67"/>
      <path d="m118 169 20 15 48 2 21-17-8 30-40 21-30-16z" fill="#233e3a"/>
      <path d="m111 44 39-15 51 12 31 35 2 60-26 48-48 20-43-27-24-48 4-54z" fill="url(#atlas-helm)" stroke="#173632" stroke-width="5"/>
      <path d="m147 32 10 58 19 5 9-58-25-7z" fill="#e3dfbe"/>
      <path d="m111 50-11 47 10 23 20-9 2-44 15-35z" fill="#aab994"/>
      <path d="m192 42 30 37 8 27-18 15-23-14 9-35z" fill="#6f8b6b"/>
      <path d="m102 94 29-10 37 11 41-7 25 14-8 40-33 10-31-12-42 6-20-22z" fill="#172f2d" stroke="#365548" stroke-width="4"/>
      <path d="m111 103 22-8 32 11 44-8 16 10-6 17-30 9-27-7-40 7-13-13z" fill="url(#atlas-visor)"/>
      <path d="m115 105 18-4 31 10 45-9 10 7-53 8-29-9-21 3z" fill="#f9f4ce" opacity=".8"/>
      <path d="m98 119 14 7 12 27 31-6 8-13 21 6 11 19 24-6 11-27 6-5-5 37-23 30-46 20-45-28-21-37z" fill="#59775e"/>
      <path d="m132 146 24-5 7-8 19 7 17 25-6 25-30 14-29-19-8-22z" fill="#a0b18b" stroke="#355548" stroke-width="3"/>
      <path d="m142 159 20-10 22 12-4 25-18 10-20-14z" fill="#1e3a35"/>
      <path d="m147 162 29 4-1 5-28-3zm0 11 28 3-1 5-25-4z" fill="#6e8971"/>
      <path d="m108 135 6 3 10 21-4 7-8-9zm102 10 12-9-3 18-8 11-5-5z" fill="#d1d0aa"/>
      <path d="m98 84-7 8 1 36 9 10m133-46 10 9-3 33-10 7" fill="#213d36" stroke="#8a9c7b" stroke-width="3"/>
      <path d="m238 84 3-42 6-5 3 49z" fill="#223c37"/><path d="m242 42 1-14 4-1 1 12z" fill="#c2d49c"/>
      <path d="m74 185 48 15 40 36 40-36 52-13 26 34-18 103H59L42 226z" fill="url(#atlas-armor)" stroke="#173631" stroke-width="5"/>
      <path d="m75 184 32 10-10 55-26 21-36-21 6-34z" fill="#9eae89" stroke="#294b40" stroke-width="5"/>
      <path d="m249 186 31 23 26 52-34 19-27-30-15-57z" fill="#78936f" stroke="#294b40" stroke-width="5"/>
      <path d="m51 211 23-12 25 8-4 15-23-5-27 16z" fill="#dedab4"/>
      <path d="m245 206 12-5 22 19 13 25-13 8-14-24z" fill="#c9cba7"/>
      <path d="m108 211 54 33 52-33 20 22-23 50-48 20-50-22-24-50z" fill="#355b4f" stroke="#1e4038" stroke-width="3"/>
      <path d="m111 222 51 29 49-28-6 24-43 25-43-25z" fill="#c5cba3"/>
      <path d="m139 242 23 14 26-16-3 11-23 14-20-12z" fill="#bded92"/>
      <path d="m116 267 45 22 44-24-5 37-40 20-38-21z" fill="#1d4038"/>
      <path d="m143 279 20 10 20-11-4 24-17 10-16-10z" fill="#668c69"/>
      <path d="m70 266 34-16 16 66-52 15zm156-16 40 22 4 53-51-5z" fill="#839971" stroke="#264b40" stroke-width="3"/>
      <path d="m78 277 17-9 4 13-19 10zm2 24 21-10 3 12-22 10zm152-32 23 11-1 13-23-13zm-3 22 25 12v12l-26-12z" fill="#304f42"/>
      <path d="m45 243 16 12-6 55-27 17-13-35z" fill="#34574a"/>
      <path d="m278 261 23-8 28 46-5 29-35-6z" fill="#3f6050"/>
      <path d="m67 224 12 5-6 16-13-7z" fill="#214336"/><path d="m68 228 6 3-3 8-6-3z" fill="#b9eb8d"/>
      <path d="m251 234 12 6 3 11-12-5z" fill="#eff0c9"/><path d="m252 250 12 6 3 11-12-5z" fill="#eff0c9"/>
      <path d="M0 307h320v13H0z" fill="#112c2d" opacity=".28"/>
    </g>
  </svg>`;
}

export function logoSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none"><path d="M24 3 43 14v21L24 46 5 35V14z" fill="#92f0cb"/><path d="m15 14 24 1-4 7H23l-3 5h12l-4 7H16l-5 8V21z" fill="#102b31"/><path d="m9 15 14-8 8 5-19 10z" fill="#ecf1d3"/></svg>`;
}
