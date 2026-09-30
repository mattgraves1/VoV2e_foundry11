/**
 * Suggested effects for Mystic Gifts - foundry-system-index.csv "Mystic Gift
 * Effect Modelling", BUILD PLAN RULED 2026-09-29 (Matt).
 *
 * NONE OF THIS IS THE BOOK'S. The book gives a Gift a name and nothing else;
 * the table agrees what it does. These are the creative pass Matt asked for:
 * starting points the item sheet's effect editor OFFERS. Nothing here is ever
 * set on a Gift automatically - every Gift, from every generator and in the
 * Items compendium, starts undefined (ruled).
 *
 * THREE LISTS:
 *  - SAMPLE_GIFT_SUGGESTIONS: the 20 sample Gifts, by name.
 *  - QUALITY_SUGGESTIONS: all 80 Qualities. A composed Gift's Quality is the
 *    word that says what it does ("Burning", "Blinding", "Healing").
 *  - FORM_DAMAGE_TYPES: the Forms that clearly imply one of the book's six
 *    Common Damage Types. A Form is mostly what the Gift looks like; one
 *    that names fire or lightning also offers damage of that type. Every
 *    Form not listed was left out ON PURPOSE - tools/test-gift-effects.mjs
 *    prints the skipped list, and the row records it.
 *
 * Shapes (see gift-effects.js): damage {kind, damageType, label},
 * healing {kind, label}, condition {kind, condition: "blind"|"entangled"} or
 * a named effect {kind, condition: "", effectName, text}, prose {kind, text}.
 */

const dmg = (damageType, label) => ({ kind: "damage", damageType, label });
const heal = label => ({ kind: "healing", label });
const cond = (condition, label = "") => ({ kind: "condition", condition, label });
const named = (effectName, text) => ({ kind: "condition", condition: "", effectName, text });
const prose = text => ({ kind: "prose", text });

export const SAMPLE_GIFT_SUGGESTIONS = {
  "Telekinesis":          [dmg("kinetic", "Hurl an object"), cond("entangled", "Pin in place"), prose("Move an object you can see without touching it.")],
  "Pyrokinesis":          [dmg("flame", "Burst of flame"), prose("Light, grow or snuff out a fire you can see.")],
  "Telepathy":            [prose("Read a creature's surface thoughts, or speak to it mind to mind."), named("Mind-Linked", "Shares thoughts with the caster.")],
  "Memory Extraction":    [prose("Draw out one memory from a creature and experience it."), named("Memory Taken", "Has lost a memory the caster extracted.")],
  "Mind Control":         [named("Controlled", "Obeys the caster's spoken commands."), prose("Plant a single command in a creature's mind.")],
  "Invisibility":         [named("Invisible", "Cannot be seen by ordinary sight."), prose("Turn yourself or an object unseen.")],
  "Astral Projection":    [prose("Leave your body and travel as an unseen spirit; your body lies helpless.")],
  "Healing Hands":        [heal("Healing touch")],
  "Paralysing Touch":     [named("Paralysed", "Cannot move or act.")],
  "Eye Lasers":           [dmg("beam", "Laser gaze")],
  "Augury":               [prose("Ask the Referee one question about the near future; the answer is true but may be cryptic.")],
  "Inhuman Speed":        [prose("Move and act at impossible speed for a moment."), named("Hastened", "Moves with inhuman speed.")],
  "Second Sight":         [prose("See the unseen: spirits, the invisible, hidden truths.")],
  "Force Wall":           [prose("Raise an invisible barrier that blocks passage and missiles."), cond("entangled", "Trap behind the wall")],
  "Generate Lightning":   [dmg("electrical", "Lightning bolt")],
  "Ultrasonic Scream":    [dmg("blast", "Shattering scream"), named("Deafened", "Cannot hear.")],
  "Create Paradox-Clone": [prose("Summon a paradoxical copy of yourself from a moment in time.")],
  "Summon Orbs":          [dmg("beam", "Orbs strike"), prose("Summon glowing orbs that light the way.")],
  "Cryokinesis":          [dmg("kinetic", "Ice shards"), cond("entangled", "Frozen in place"), prose("Freeze water or chill an object.")],
  "Induce Sleep":         [named("Asleep", "Sleeps until woken.")]
};

export const QUALITY_SUGGESTIONS = {
  // Column 1 - harmful
  "Bashing":        [dmg("kinetic", "Bashing blow")],
  "Binding":        [cond("entangled", "Bound")],
  "Blinding":       [cond("blind", "Blinded")],
  "Burning":        [dmg("flame", "Burns")],
  "Choking":        [named("Choking", "Cannot breathe or speak.")],
  "Consuming":      [dmg("tox", "Consumes flesh")],
  "Corroding":      [dmg("tox", "Corrodes")],
  "Crushing":       [dmg("kinetic", "Crushes")],
  "Deafening":      [named("Deafened", "Cannot hear.")],
  "Detonating":     [dmg("blast", "Detonates")],
  "Disintegrating": [dmg("beam", "Disintegrates")],
  "Draining":       [dmg("tox", "Drains life")],
  "Electrifying":   [dmg("electrical", "Electrifies")],
  "Excruciating":   [dmg("tox", "Excruciating pain"), named("In Agony", "Wracked with pain.")],
  "Freezing":       [cond("entangled", "Frozen in place"), dmg("kinetic", "Frostbite")],
  "Withering":      [dmg("tox", "Withers")],
  "Impaling":       [dmg("kinetic", "Impales")],
  "Imprisoning":    [cond("entangled", "Imprisoned"), named("Imprisoned", "Held in a prison of the Gift's making.")],
  "Infecting":      [dmg("tox", "Infects"), named("Infected", "Carries the Gift's sickness.")],
  "Liquefying":     [dmg("tox", "Liquefies")],
  // Column 2 - protective
  "Absorbing":      [prose("Absorb an attack or effect aimed at you.")],
  "Armouring":      [named("Armoured", "Protected by the Gift; the Referee sets the AV it grants.")],
  "Banishing":      [named("Banished", "Sent elsewhere until the Gift ends.")],
  "Concealing":     [named("Concealed", "Hidden from sight.")],
  "Countering":     [prose("Counter another Gift or effect as it happens.")],
  "Curing":         [heal("Cure"), prose("End a poison, disease or affliction.")],
  "Cushioning":     [prose("Soften a fall or a blow.")],
  "Deflecting":     [prose("Turn aside an attack or missile.")],
  "Disappearing":   [named("Vanished", "Cannot be seen or found.")],
  "Disarming":      [prose("Wrench a weapon or object from a creature's grip.")],
  "Disguising":     [prose("Change how you or another appears.")],
  "Entangling":     [cond("entangled", "Entangled")],
  "Warding":        [named("Warded", "Protected by a ward.")],
  "Guarding":       [named("Guarded", "Guarded by the Gift.")],
  "Shielding":      [named("Shielded", "Shielded by the Gift; the Referee sets what it stops.")],
  "Healing":        [heal("Heals")],
  "Hindering":      [cond("entangled", "Hindered"), named("Hindered", "Slowed and clumsy.")],
  "Invigorating":   [heal("Invigorates")],
  "Mending":        [heal("Mends"), prose("Repair a broken object.")],
  "Nullifying":     [prose("Negate a Gift, effect or device.")],
  // Column 3 - strange
  "Adhering":       [cond("entangled", "Stuck fast")],
  "Addicting":      [named("Addicted", "Craves more of the Gift.")],
  "Blackening":     [cond("blind", "Darkness")],
  "Blossoming":     [prose("Make plants grow and flower.")],
  "Cacophonous":    [named("Deafened", "Cannot hear."), dmg("blast", "Cacophony")],
  "Dazzling":       [cond("blind", "Dazzled")],
  "Dividing":       [prose("Split something in two.")],
  "Duplicating":    [prose("Make a copy of a thing.")],
  "Evolving":       [prose("Change a creature or thing into a new form.")],
  "Extinguishing":  [prose("Put out a fire, light or energy.")],
  "Fusing":         [cond("entangled", "Fused")],
  "Ghostly":        [named("Ghostly", "Can pass through solid matter.")],
  "Grasping":       [cond("entangled", "Grasped")],
  "Inflating":      [prose("Swell something to many times its size.")],
  "Inverting":      [prose("Turn something upside down or inside out.")],
  "Invulnerable":   [named("Invulnerable", "Unharmed by attacks while the Gift holds.")],
  "Prismatic":      [dmg("beam", "Prismatic ray"), cond("blind", "Dazzled")],
  "Transmuting":    [prose("Turn one material into another.")],
  "Teleporting":    [prose("Move instantly to a place you can see.")],
  "Whispering":     [prose("Carry a whisper to someone far away.")],
  // Column 4 - mind
  "Bewildering":    [named("Bewildered", "Confused and unsure what to do.")],
  "Calming":        [named("Calmed", "Will not fight unless attacked.")],
  "Charming":       [named("Charmed", "Regards the caster as a friend.")],
  "Commanding":     [named("Commanded", "Obeys one command from the caster.")],
  "Enticing":       [named("Enticed", "Drawn towards the caster.")],
  "Horrifying":     [named("Horrified", "Flees from the caster.")],
  "Hysterical":     [named("Hysterical", "Laughs or weeps uncontrollably.")],
  "Maddening":      [named("Maddened", "Acts at random.")],
  "Mesmerising":    [named("Mesmerised", "Stands transfixed.")],
  "Mocking":        [prose("Taunt a creature into attacking you.")],
  "Revealing":      [prose("Reveal hidden things, lies or secrets.")],
  "Whirling":       [dmg("kinetic", "Whirling blow"), named("Dizzy", "Spins and staggers.")],
  "Slithering":     [prose("Slip free of bonds or through narrow gaps.")],
  "Dreaming":       [named("Asleep", "Sleeps and dreams until woken.")],
  "Encoding":       [prose("Hide a message in a mind or an object.")],
  "Enraging":       [named("Enraged", "Attacks the nearest creature.")],
  "Pulsing":        [dmg("blast", "Pulse")],
  "Saddening":      [named("Despairing", "Overcome with sorrow.")],
  "Scrying":        [prose("See a distant place or person.")],
  "Subtle":         [prose("Use a Gift without anyone noticing.")]
};

export const FORM_DAMAGE_TYPES = {
  "Claw": "kinetic", "Crystal": "kinetic", "Glass": "kinetic", "Ice": "kinetic", "Iron": "kinetic",
  "Ivory": "kinetic", "Stone": "kinetic", "Thorn": "kinetic", "Hail": "kinetic", "Shard": "kinetic",
  "Gravity": "kinetic",
  "Beam": "beam", "Ray": "beam", "Light": "beam", "Prism": "beam",
  "Fire": "flame", "Ash": "flame",
  "Bolt": "electrical", "Arc": "electrical", "Lightning": "electrical",
  "Miasma": "tox", "Plague": "tox", "Parasite": "tox", "Mould": "tox", "Rust": "tox", "Wound": "tox",
  "Orb": "blast", "Sphere": "blast"
};
