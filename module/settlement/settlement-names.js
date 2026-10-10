/**
 * Settlement Creation (foundry-system-index.csv row of that name) - the shared naming function. Every settlement
 * is named here, whether made on its own or by the Region Generator (RULED 2026-10-08, Matt).
 *
 * A name is always built from the settlement's details (RULED: 100%), in one of three styles, each as likely:
 *   a book name with a detail   "Jakara of the Golden Domes" (The Houses), "Glassblowers' Thill" (Industry) -
 *                               the book name from Place Names' Settlements column
 *   a founder                   "Bethod's Kilns" - a given name from Names of Vaarn and a place word from
 *                               Industry or The Houses
 *   descriptive                 "Crater Town" - from the Location of Settlement
 *
 * NO REPEATS, by what a name is built on (RULED): a book name used once is spent in every form, so "Kyzya" and
 * "Brewers' Kyzya" never share a world; a descriptive name likewise. A founder MAY found several settlements, so
 * only a founder's whole name is spent ("Yasuke's Stables" and "Yasuke's Roost" may both stand). `used` holds
 * those keys; the Region Generator's own used names are book names, so it can pass its set straight in.
 *
 * Pure given a random function, for the test.
 */

import { PLACE_NAMES, GIVEN_NAMES } from "../region/region-data.js";
import { HOUSE_NOUN, INDUSTRY_WORDS, LOCATION_NAME } from "./settlement-data.js";

/**
 * Name a settlement from its details: `values` maps a column ("The Houses", "Industry", "Location of Settlement")
 * to its result. Returns { name, style, key, founder } and adds the key to `used`; when every try repeats, the
 * name is "Unnamed settlement" for the GM to fill.
 */
export function nameSettlement(values, random, used = new Set())
{
  const pick = list => list[Math.floor(random() * list.length)];
  const houses = values["The Houses"], industry = values["Industry"];
  // a region location carries its terrain after a comma ("Ancient Bomb Crater, among the Mesas")
  const location = String(values["Location of Settlement"] ?? "").split(",")[0].trim();
  const styles = [];
  if(HOUSE_NOUN[houses] || INDUSTRY_WORDS[industry]) styles.push(() =>
  {
    const book = pick(PLACE_NAMES["Settlements"]);
    const byHouses = HOUSE_NOUN[houses] && (!INDUSTRY_WORDS[industry] || random() < 0.5);
    return byHouses ? { name: `${book} of the ${HOUSE_NOUN[houses]}`, style: "a book name with The Houses", key: book }
                    : { name: `${INDUSTRY_WORDS[industry][0]} ${book}`, style: "a book name with its Industry", key: book };
  });
  if(HOUSE_NOUN[houses] || INDUSTRY_WORDS[industry]) styles.push(() =>
  {
    const founder = pick(GIVEN_NAMES);
    const word = INDUSTRY_WORDS[industry] && (!HOUSE_NOUN[houses] || random() < 0.5) ? INDUSTRY_WORDS[industry][1] : HOUSE_NOUN[houses];
    const name = `${founder}'s ${word}`;
    return { name, style: "a founder's name", key: `founder:${founder}|${name}`, founder };
  });
  if(LOCATION_NAME[location]) styles.push(() => ({ name: LOCATION_NAME[location], style: "descriptive, from its Location", key: LOCATION_NAME[location] }));
  if(styles.length) for(let tries = 0; tries < 60; tries++)
  {
    const n = pick(styles)();
    if(!used.has(n.key)) { used.add(n.key); return { founder: null, ...n }; }
  }
  return { name: "Unnamed settlement", style: "no unused name left: name it yourself", key: null, founder: null };
}
